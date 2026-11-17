import {
  Injectable,
  Logger,
  NotFoundException,
  OnModuleInit,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectModel } from '@nestjs/mongoose';
import { ClientSession, Model, Types } from 'mongoose';
import { NotificationEvent } from '../common/enums/notification-event.enum';
import { NotificationStatus } from '../common/enums/notification-status.enum';
import { EmailService } from '../email/email.service';
import {
  FRENCH_MONTHS,
  NOTIFICATION_MAX_ATTEMPTS,
} from '../config/constants';
import {
  NotificationLog,
  NotificationLogDocument,
  NotificationRecipients,
} from './entities/notification-log.schema';
import { PageResult } from './cash-ledger.service';

const escapeHtml = (value: string): string =>
  value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');

const formatAr = (amount: number): string =>
  `${new Intl.NumberFormat('fr-FR').format(amount)} Ar`;

const formatMonthList = (months: number[], year: number): string => {
  const labels = [...months]
    .sort((a, b) => a - b)
    .map((month) => FRENCH_MONTHS[month - 1]);
  if (labels.length === 1) return `${labels[0]} ${year}`;
  const last = labels.pop() as string;
  return `${labels.join(', ')} et ${last} ${year}`;
};

export interface EnqueueInput {
  eventType: NotificationEvent;
  referenceId: string;
  primaryTo: string;
  subject: string;
  html: string;
  createdBy?: Types.ObjectId | string;
}

@Injectable()
export class NotificationsService implements OnModuleInit {
  private readonly logger = new Logger(NotificationsService.name);

  constructor(
    @InjectModel(NotificationLog.name)
    private readonly model: Model<NotificationLogDocument>,
    private readonly emailService: EmailService,
    @InjectModel('ContributionMember')
    private readonly memberModel: Model<{ email: string; status: string }>,
    private readonly configService: ConfigService,
  ) {}

  onModuleInit(): void {
    // Un envoi interrompu par un redémarrage est marqué FAILED puis relancé.
    void this.model
      .updateMany(
        { status: NotificationStatus.PROCESSING },
        { $set: { status: NotificationStatus.FAILED } },
      )
      .exec()
      .catch((error: unknown) => {
        this.logger.error(
          `Remise à zéro des notifications bloquées impossible : ${String(error)}`,
        );
      });
  }

  async listLogs(page: number, limit: number): Promise<PageResult<NotificationLogDocument>> {
    const total = await this.model.countDocuments().exec();
    const items = await this.model
      .find()
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .exec();
    return {
      items,
      total,
      page,
      limit,
      totalPages: Math.max(1, Math.ceil(total / limit)),
    };
  }

  private uniqueEmails(emails: string[]): string[] {
    const seen = new Set<string>();
    return emails.filter((email) => {
      const key = email.toLowerCase();
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  }

  async enqueue(
    input: EnqueueInput,
    session?: ClientSession,
  ): Promise<NotificationLogDocument> {
    const activeMembers = await this.memberModel
      .find({ status: 'ACTIVE' })
      .select('email')
      .session(session ?? null)
      .exec();
    const recipients: NotificationRecipients = {
      to: [input.primaryTo],
      cc: this.uniqueEmails(
        activeMembers
          .map((member) => member.email)
          .filter((email) => email.toLowerCase() !== input.primaryTo.toLowerCase()),
      ),
    };

    const [log] = await this.model.create(
      [
        {
          eventType: input.eventType,
          referenceId: input.referenceId,
          recipients,
          subject: input.subject,
          html: input.html,
          status: NotificationStatus.PENDING,
          attempts: 0,
          createdBy: input.createdBy,
        } as NotificationLog,
      ],
      { session },
    );
    return log;
  }

  async dispatch(id: string): Promise<{ sent: boolean; skipped?: string }> {
    const log = await this.model.findById(id).exec();
    if (!log) {
      throw new NotFoundException('Notification introuvable');
    }
    if (log.status === NotificationStatus.SENT) {
      return { sent: false, skipped: 'Déjà envoyée' };
    }
    if (
      log.status === NotificationStatus.FAILED &&
      log.attempts >= NOTIFICATION_MAX_ATTEMPTS
    ) {
      return { sent: false, skipped: 'Nombre maximum de tentatives atteint' };
    }

    await this.model
      .findByIdAndUpdate(log._id, {
        $set: {
          status: NotificationStatus.PROCESSING,
          lastAttemptAt: new Date(),
        },
      })
      .exec();

    try {
      const from = this.emailService.getFrom();
      const result = await this.emailService.sendMail({
        from: { email: from.email, name: 'Caisse commune Gere-o' },
        to: log.recipients.to.map((email) => ({ email })),
        cc:
          log.recipients.cc.length > 0
            ? log.recipients.cc.map((email) => ({ email }))
            : undefined,
        subject: log.subject,
        html: log.html,
      });

      if (!result.success) {
        throw new Error(result.error ?? 'Erreur SMTP inconnue');
      }

      await this.model
        .findByIdAndUpdate(log._id, {
          $set: {
            status: NotificationStatus.SENT,
            sentAt: new Date(),
            messageId: result.messageId,
            errorMessage: undefined,
          },
          $inc: { attempts: 1 },
        })
        .exec();
      return { sent: true };
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      this.logger.error(`Échec notification ${log.referenceId} : ${message}`);
      await this.model
        .findByIdAndUpdate(log._id, {
          $set: {
            status: NotificationStatus.FAILED,
            errorMessage: message,
            lastAttemptAt: new Date(),
          },
          $inc: { attempts: 1 },
        })
        .exec();
      return { sent: false };
    }
  }

  async retry(id: string): Promise<{ sent: boolean; skipped?: string }> {
    return this.dispatch(id);
  }

  async processPending(): Promise<void> {
    const pending = await this.model
      .find({
        $or: [
          { status: NotificationStatus.PENDING },
          {
            status: NotificationStatus.FAILED,
            attempts: { $lt: NOTIFICATION_MAX_ATTEMPTS },
          },
        ],
      })
      .limit(20)
      .exec();
    for (const log of pending) {
      await this.dispatch(log._id.toString());
    }
  }

  buildContributionEmail(
    memberName: string,
    months: number[],
    year: number,
    amount: number,
    balance: number,
  ): { subject: string; html: string } {
    const period = formatMonthList(months, year);
    return {
      subject: `Déclaration de cotisation - ${memberName}`,
      html: `
        <div style="font-family:Arial,sans-serif;line-height:1.6;color:#0f172a">
          <p>Bonjour,</p>
          <p>Nous vous informons qu'une déclaration de cotisation vient d'être enregistrée.</p>
          <p><strong>Membre :</strong> ${escapeHtml(memberName)}<br>
          <strong>Périodes concernées :</strong> ${escapeHtml(period)}<br>
          <strong>Montant déclaré :</strong> ${formatAr(amount)}<br>
          <strong>Statut :</strong> Validée automatiquement<br>
          <strong>Solde de la caisse après cette déclaration :</strong> ${formatAr(balance)}</p>
          <p>Cordialement,<br>Équipe de gestion de la caisse commune.</p>
        </div>`,
    };
  }

  buildExpenseEmail(
    description: string,
    category: string,
    amount: number,
    balanceAfter: number,
    expenseDate: string,
    managerName: string,
    authorName: string,
  ): { subject: string; html: string } {
    return {
      subject: `Notification de dépense – ${escapeHtml(description)} / ${expenseDate}`,
      html: `
        <div style="font-family:Arial,sans-serif;line-height:1.6;color:#0f172a">
          <p>Bonjour à toutes et à tous,</p>
          <p>Nous vous informons qu'une nouvelle dépense a été enregistrée dans la caisse commune.</p>
          <p><strong>Motif de la dépense :</strong> ${escapeHtml(description)}<br>
          <strong>Catégorie :</strong> ${escapeHtml(category)}<br>
          <strong>Montant total :</strong> ${formatAr(amount)}<br>
          <strong>Solde restant dans la caisse :</strong> ${formatAr(balanceAfter)}<br>
          <strong>Date :</strong> ${escapeHtml(expenseDate)}</p>
          <p>N'hésitez pas à revenir vers moi si vous avez des questions ou souhaitez consulter les détails de cette dépense.</p>
          <p>Cordialement,<br>${escapeHtml(managerName)}<br>Responsable de la caisse.</p>
          <p><em>Dépense enregistrée par ${escapeHtml(authorName)}.</em></p>
        </div>`,
    };
  }
}

@Injectable()
export class NotificationProcessorService {
  private timer?: ReturnType<typeof setInterval>;

  constructor(
    private readonly notifications: NotificationsService,
    private readonly configService: ConfigService,
  ) {}

  onModuleInit(): void {
    if (this.configService.get<string>('nodeEnv') === 'test') return;
    this.timer = setInterval(() => {
      void this.notifications.processPending().catch(() => undefined);
    }, 60_000);
    this.timer.unref?.();
  }

  onModuleDestroy(): void {
    if (this.timer) clearInterval(this.timer);
  }
}
