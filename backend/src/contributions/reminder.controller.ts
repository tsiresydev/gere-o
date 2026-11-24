import { Controller, Headers, Post, ServiceUnavailableException, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { timingSafeEqual } from 'crypto';
import { Public } from '../common/decorators/public.decorator';
import { ContributionReminderService } from './reminder.service';

@Controller('scheduled')
export class ReminderController {
  constructor(private readonly reminders: ContributionReminderService, private readonly config: ConfigService) {}

  @Public()
  @Post('contribution-reminders')
  run(@Headers('authorization') authorization?: string) {
    const secret = this.config.get<string>('reminderTriggerSecret');
    if (!secret || secret.length < 32) throw new ServiceUnavailableException('Déclencheur de rappel non configuré');
    const provided = authorization?.startsWith('Bearer ') ? authorization.slice(7) : '';
    const expectedBytes = Buffer.from(secret);
    const providedBytes = Buffer.from(provided);
    if (expectedBytes.length !== providedBytes.length || !timingSafeEqual(expectedBytes, providedBytes)) {
      throw new UnauthorizedException('Accès non autorisé');
    }
    return this.reminders.run();
  }
}
