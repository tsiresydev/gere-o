import { Injectable, ServiceUnavailableException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectModel } from '@nestjs/mongoose';
import Holidays from 'date-holidays';
import { Model } from 'mongoose';
import { ContributionMemberStatus } from '../common/enums/contribution-member-status.enum';
import { ContributionStatus } from '../common/enums/contribution-status.enum';
import { NotificationEvent } from '../common/enums/notification-event.enum';
import { NotificationStatus } from '../common/enums/notification-status.enum';
import { CONTRIBUTION_MONTHLY_AMOUNT, CONTRIBUTION_START_YEAR, FRENCH_MONTHS } from '../config/constants';
import { Contribution, ContributionDocument } from './entities/contribution.schema';
import { ContributionMember, ContributionMemberDocument } from './entities/contribution-member.schema';
import { NotificationLog, NotificationLogDocument } from './entities/notification-log.schema';
import { NotificationsService } from './notifications.service';

const escapeHtml = (value: string): string => value.replace(/[&<>"']/g, (char) => ({
  '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
})[char] as string);

/** Date locale de Madagascar (UTC+3), représentée en UTC pour les calculs calendaires. */
export function madagascarDate(now: Date): Date {
  return new Date(now.getTime() + 3 * 60 * 60 * 1000);
}

export function firstWorkingDay(year: number, month: number, extraHolidays: string[] = []): number {
  const calendar = new Holidays('MG');
  const holidays = new Set([
    ...calendar.getHolidays(year).filter((holiday) => holiday.type === 'public').map((holiday) => holiday.date.slice(0, 10)),
    ...extraHolidays,
  ]);
  for (let day = 1; day <= 31; day += 1) {
    const date = new Date(Date.UTC(year, month - 1, day));
    if (date.getUTCMonth() !== month - 1) break;
    if (date.getUTCDay() !== 0 && date.getUTCDay() !== 6 && !holidays.has(date.toISOString().slice(0, 10))) return day;
  }
  throw new Error('Aucun jour ouvrable trouvé');
}

@Injectable()
export class ContributionReminderService {
  constructor(
    @InjectModel(ContributionMember.name) private readonly members: Model<ContributionMemberDocument>,
    @InjectModel(Contribution.name) private readonly contributions: Model<ContributionDocument>,
    @InjectModel(NotificationLog.name) private readonly logs: Model<NotificationLogDocument>,
    private readonly notifications: NotificationsService,
    private readonly config: ConfigService,
  ) {}

  async run(now = new Date()): Promise<{ eligible: number; sent: number; skipped: string | null }> {
    const local = madagascarDate(now);
    const year = local.getUTCFullYear();
    const month = local.getUTCMonth() + 1;
    const extra = (this.config.get<string>('reminderExtraHolidays') ?? '').split(',').map((item) => item.trim()).filter(Boolean);
    for (const day of extra) {
      const date = new Date(`${day}T00:00:00.000Z`);
      if (!/^\d{4}-\d{2}-\d{2}$/.test(day) || Number.isNaN(date.getTime()) || date.toISOString().slice(0, 10) !== day) {
        throw new ServiceUnavailableException('Date invalide dans REMINDER_EXTRA_HOLIDAYS');
      }
    }
    if (local.getUTCDate() !== firstWorkingDay(year, month, extra) || local.getUTCHours() < 8) {
      return { eligible: 0, sent: 0, skipped: 'Hors du premier jour ouvrable après 8 h à Madagascar' };
    }

    const end = new Date(Date.UTC(year, month - 1, 0));
    const endYear = end.getUTCFullYear();
    const endMonth = end.getUTCMonth() + 1;
    if (endYear < CONTRIBUTION_START_YEAR) return { eligible: 0, sent: 0, skipped: null };
    const members = await this.members.find({ status: ContributionMemberStatus.ACTIVE }).exec();
    const paid = await this.contributions.find({
      memberId: { $in: members.map((member) => member._id) },
      status: ContributionStatus.VALIDE,
      periodYear: { $gte: CONTRIBUTION_START_YEAR, $lte: endYear },
    }).exec();
    const paidKeys = new Set(paid.map((item) => `${item.memberId}:${item.periodYear}-${item.periodMonth}`));
    await this.logs.collection.createIndex({ idempotencyKey: 1 }, { unique: true, sparse: true });

    let eligible = 0;
    let sent = 0;
    let failed = 0;
    for (const member of members) {
      const periods: string[] = [];
      for (let periodYear = CONTRIBUTION_START_YEAR; periodYear <= endYear; periodYear += 1) {
        const lastMonth = periodYear === endYear ? endMonth : 12;
        for (let periodMonth = 1; periodMonth <= lastMonth; periodMonth += 1) {
          if (!paidKeys.has(`${member._id}:${periodYear}-${periodMonth}`)) periods.push(`${FRENCH_MONTHS[periodMonth - 1]} ${periodYear}`);
        }
      }
      if (!periods.length) continue;
      eligible += 1;
      const key = `rappel:${endYear}-${String(endMonth).padStart(2, '0')}:${member._id}`;
      const amount = new Intl.NumberFormat('fr-FR').format(periods.length * CONTRIBUTION_MONTHLY_AMOUNT);
      const subject = `Rappel de cotisations - ${member.name}`;
      const html = `<div style="font-family:Arial,sans-serif;line-height:1.6"><p>Bonjour ${escapeHtml(member.name)},</p><p>Voici les cotisations non réglées jusqu’à ${escapeHtml(FRENCH_MONTHS[endMonth - 1])} ${endYear} inclus :</p><ul>${periods.map((period) => `<li>${escapeHtml(period)}</li>`).join('')}</ul><p><strong>Total restant : ${amount} Ar</strong> (${periods.length} mois à ${new Intl.NumberFormat('fr-FR').format(CONTRIBUTION_MONTHLY_AMOUNT)} Ar).</p><p>Si vous avez déjà effectué un paiement, merci de notifier Tsiresy ou Mahefa.</p><p>Cordialement,<br>Équipe de gestion de la caisse commune.</p></div>`;
      try {
        await this.logs.updateOne({ idempotencyKey: key }, { $setOnInsert: {
          idempotencyKey: key,
          eventType: NotificationEvent.RAPPEL_COTISATION,
          referenceId: key,
          recipients: { to: [member.email], cc: [] },
          subject,
          html,
          status: NotificationStatus.PENDING, attempts: 0,
        } }, { upsert: true }).exec();
      } catch (error) {
        if (!(typeof error === 'object' && error !== null && (error as { code?: number }).code === 11000)) throw error;
      }
      // Un paiement intervenu entre deux tentatives ne doit pas figurer dans le rappel réessayé.
      await this.logs.updateOne(
        { idempotencyKey: key, status: { $in: [NotificationStatus.PENDING, NotificationStatus.FAILED] } },
        { $set: { subject, html, recipients: { to: [member.email], cc: [] } } },
      ).exec();
      const log = await this.logs.findOne({ idempotencyKey: key }).exec();
      if (!log) throw new Error('Notification de rappel introuvable');
      const result = await this.notifications.dispatch(log._id.toString());
      if (result.sent) sent += 1;
      else if (!result.skipped || result.skipped === 'Nombre maximum de tentatives atteint') failed += 1;
    }
    if (failed) throw new ServiceUnavailableException(`${failed} rappel(s) non envoyé(s) ; consulter le journal des notifications`);
    return { eligible, sent, skipped: null };
  }
}
