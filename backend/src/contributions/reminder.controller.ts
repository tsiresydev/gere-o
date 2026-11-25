import { Controller, Headers, Logger, Post, ServiceUnavailableException, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { timingSafeEqual } from 'crypto';
import { Public } from '../common/decorators/public.decorator';
import { ContributionReminderService } from './reminder.service';
import { NotificationsService } from './notifications.service';

@Controller('scheduled')
export class ReminderController {
  private readonly logger = new Logger(ReminderController.name);
  constructor(private readonly reminders: ContributionReminderService, private readonly config: ConfigService, private readonly notifications: NotificationsService) {}

  @Public()
  @Post('contribution-reminders')
  run(@Headers('authorization') authorization?: string) {
    this.authenticate(authorization);
    return this.reminders.run();
  }

  @Public()
  @Post('notifications')
  processNotifications(@Headers('authorization') authorization?: string) {
    this.authenticate(authorization);
    void this.notifications.processPending().catch((error: unknown) => {
      this.logger.error(`Traitement des notifications impossible : ${String(error)}`);
    });
    return { accepted: true };
  }

  private authenticate(authorization?: string): void {
    const secret = this.config.get<string>('reminderTriggerSecret');
    if (!secret || secret.length < 32) throw new ServiceUnavailableException('Déclencheur de rappel non configuré');
    const provided = authorization?.startsWith('Bearer ') ? authorization.slice(7) : '';
    const expectedBytes = Buffer.from(secret);
    const providedBytes = Buffer.from(provided);
    if (expectedBytes.length !== providedBytes.length || !timingSafeEqual(expectedBytes, providedBytes)) {
      throw new UnauthorizedException('Accès non autorisé');
    }
  }
}
