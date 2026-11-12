import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { WorkDayStatus } from '../common/enums/work-day-status.enum';
import { UsersService } from '../users/users.service';
import { WorkDay, WorkDayDocument } from '../work-days/entities/work-day.schema';
import { LeaveRequest, LeaveRequestDocument } from '../leaves/entities/leave-request.schema';
import { EmailService } from './email.service';
import {
  EmailReportData,
  EmailReportPreview,
  EmailSendResult,
  LeaveDayDetail,
} from './dto/email-dto';

const MONTH_NAMES: Record<number, string> = {
  1: 'janvier', 2: 'février', 3: 'mars', 4: 'avril', 5: 'mai', 6: 'juin',
  7: 'juillet', 8: 'août', 9: 'septembre', 10: 'octobre', 11: 'novembre', 12: 'décembre',
};

const EMAIL_TEMPLATE = `Bonjour,

Veuillez trouver ci-dessous le récapitulatif de mes jours travaillés et des congés pris pour le mois de {{MOIS}} {{ANNEE}}.

**Récapitulatif :**
- **Jours travaillés :** {{JOURS_TRAVAILLES}}
- **Congés pris :** {{TOTAL_CONGES}}

**Détail des congés :**
{{DETAIL_CONGES}}

Je reste à votre disposition pour toute information complémentaire.

Cordialement,

{{NOM}}`;

@Injectable()
export class ReportService {
  private readonly logger = new Logger(ReportService.name);

  constructor(
    @InjectModel(WorkDay.name) private readonly workDayModel: Model<WorkDayDocument>,
    @InjectModel(LeaveRequest.name) private readonly requestModel: Model<LeaveRequestDocument>,
    private readonly usersService: UsersService,
    private readonly emailService: EmailService,
  ) {}

  async generatePreview(userId: string, year: number, month: number): Promise<EmailReportPreview> {
    const user = await this.usersService.findById(userId);
    if (!user) {
      throw new NotFoundException('Utilisateur introuvable');
    }

    const data = await this.buildReportData(user, year, month);
    const { subject, message } = this.buildEmailContent(data);

    return {
      from: this.emailService.getFrom().email,
      to: 'kevin.doste@madasoftware.com',
      cc: 'voarizara@gmail.com',
      subject,
      message,
      monthLabel: data.monthLabel,
      workedDays: data.workedDays,
      totalLeaveDays: data.totalLeaveDays,
      leaveDetails: data.leaveDetails,
      senderName: data.senderName,
    };
  }

  async sendReport(userId: string, dto: { year: number; month: number; to: string; cc?: string; subject: string; message: string }): Promise<EmailSendResult> {
    const user = await this.usersService.findById(userId);
    if (!user) {
      throw new NotFoundException('Utilisateur introuvable');
    }

    // Validation des destinataires
    if (!this.isValidEmail(dto.to)) {
      throw new Error('Adresse email du destinataire invalide');
    }
    if (dto.cc && !this.isValidEmail(dto.cc)) {
      throw new Error('Adresse email en copie invalide');
    }

    // Construction du HTML
    const html = this.buildHtmlContent(dto.message);

    // Envoi avec BCC systématique
    const bcc = this.emailService.getBcc();
    const result = await this.emailService.sendMail({
      from: this.emailService.getFrom(),
      to: [{ email: dto.to }],
      cc: dto.cc ? [{ email: dto.cc }] : undefined,
      bcc: bcc ? [bcc] : undefined,
      subject: dto.subject,
      html,
    });

    if (!result.success) {
      this.logger.error(`Échec envoi rapport: ${result.error}`);
    }

    return result;
  }

  async buildReportData(user: { _id: unknown; firstName: string; lastName: string; email: string }, year: number, month: number): Promise<EmailReportData> {
    const monthStart = `${year}-${String(month).padStart(2, '0')}-01`;
    const daysInMonth = new Date(Date.UTC(year, month, 0)).getUTCDate();
    const monthEnd = `${year}-${String(month).padStart(2, '0')}-${String(daysInMonth).padStart(2, '0')}`;
    const today = this.todayISO();

    // Jours travaillés : pointages COMPLETED dans le mois, pas de week-end, pas de futur
    const workDays = await this.workDayModel.find({
      userId: String(user._id),
      date: { $gte: monthStart, $lte: monthEnd },
    });

    let workedDays = 0;
    for (const day of workDays) {
      if (day.status === WorkDayStatus.COMPLETED) {
        const d = new Date(`${day.date}T00:00:00.000Z`);
        const dow = d.getUTCDay();
        if (dow !== 0 && dow !== 6 && day.date <= today) {
          workedDays++;
        }
      }
    }

    // Congés pris : demandes APPROVED, non annulées, dans le mois, non futurs
    const leaveRequests = await this.requestModel.find({
      userId: String(user._id),
    });

    const leaveDetails: LeaveDayDetail[] = [];
    let totalLeaveDays = 0;

    for (const request of leaveRequests) {
      if (request.status !== 'APPROVED') continue;
      if (request.validated === false) continue;

      const start = request.startDate;
      const end = request.endDate;
      if (end < monthStart || start > monthEnd) continue;

      // Calculer les jours de congé dans le mois
      const overlapStart = start > monthStart ? start : monthStart;
      const overlapEnd = end < monthEnd ? end : monthEnd;

      // Si c'est un congé d'une seule journée
      if (start === end) {
        if (start >= monthStart && start <= monthEnd && start <= today) {
          const duration = request.durationDays;
          const period = this.getPeriod(request);
          leaveDetails.push({ date: start, duration, period });
          totalLeaveDays += duration;
        }
        continue;
      }

      // Période multi-jours : parcourir jour par jour
      const current = new Date(`${overlapStart}T00:00:00.000Z`);
      const last = new Date(`${overlapEnd}T00:00:00.000Z`);
      while (current <= last) {
        const dateStr = current.toISOString().slice(0, 10);
        if (dateStr <= today) {
          const dow = current.getUTCDay();
          if (dow !== 0 && dow !== 6) {
            // Vérifier si c'est le premier ou dernier jour (demi-journée)
            let duration = 1;
            let period: 'morning' | 'afternoon' | 'full' = 'full';

            if (dateStr === start) {
              if (request.startDurationType === 'HALF_DAY_MORNING' || request.startDurationType === 'HALF_DAY_AFTERNOON') {
                duration = 0.5;
                period = request.startDurationType === 'HALF_DAY_MORNING' ? 'morning' : 'afternoon';
              }
            } else if (dateStr === end) {
              if (request.endDurationType === 'HALF_DAY_MORNING' || request.endDurationType === 'HALF_DAY_AFTERNOON') {
                duration = 0.5;
                period = request.endDurationType === 'HALF_DAY_MORNING' ? 'morning' : 'afternoon';
              }
            }

            leaveDetails.push({ date: dateStr, duration, period });
            totalLeaveDays += duration;
          }
        }
        current.setUTCDate(current.getUTCDate() + 1);
      }
    }

    // Trier par date
    leaveDetails.sort((a, b) => a.date.localeCompare(b.date));

    const senderName = `${user.firstName} ${user.lastName.toUpperCase()}`;

    return {
      month,
      year,
      monthLabel: `${MONTH_NAMES[month]} ${year}`,
      workedDays,
      totalLeaveDays: Math.round(totalLeaveDays * 100) / 100,
      leaveDetails,
      senderName,
    };
  }

  buildEmailContent(data: EmailReportData): { subject: string; message: string } {
    const subject = `Récapitulatif mensuel — ${data.monthLabel}`;
    const detailLines = data.leaveDetails
      .map((d) => {
        const dur = d.duration === 0.5 ? '0,5' : d.duration;
        const periodStr = d.period === 'morning' ? ' (matin)' : d.period === 'afternoon' ? ' (après-midi)' : '';
        return `- ${this.formatDateFr(d.date)} : ${dur} jour${d.duration > 1 ? 's' : ''}${periodStr}`;
      })
      .join('\n');

    const message = EMAIL_TEMPLATE
      .replace(/\{\{MOIS\}\}/g, data.monthLabel.split(' ')[0])
      .replace(/\{\{ANNEE\}\}/g, String(data.year))
      .replace(/\{\{JOURS_TRAVAILLES\}\}/g, this.formatDayCount(data.workedDays))
      .replace(/\{\{TOTAL_CONGES\}\}/g, this.formatDayCount(data.totalLeaveDays))
      .replace(/\{\{DETAIL_CONGES\}\}/g, detailLines || 'Aucun congé pris ce mois.')
      .replace(/\{\{NOM\}\}/g, data.senderName);

    return { subject, message };
  }

  private buildHtmlContent(text: string): string {
    return text
      .replace(/\n/g, '<br>')
      .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
  }

  private formatDateFr(isoDate: string): string {
    const [year, month, day] = isoDate.split('-');
    return `${day}/${month}/${year}`;
  }

  /** Formate un nombre de jours avec la bonne terminaison : « 0 jour », « 1 jour », « 2 jours ». */
  private formatDayCount(value: number): string {
    const rounded = Math.round(value * 100) / 100;
    const formatted = String(rounded).replace('.', ',');
    return `${formatted} ${rounded > 1 ? 'jours' : 'jour'}`;
  }

  private getPeriod(request: LeaveRequestDocument): 'morning' | 'afternoon' | 'full' {
    if (request.startDurationType === 'HALF_DAY_MORNING') return 'morning';
    if (request.startDurationType === 'HALF_DAY_AFTERNOON') return 'afternoon';
    return 'full';
  }

  private isValidEmail(email: string): boolean {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  }

  private todayISO(): string {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
  }
}