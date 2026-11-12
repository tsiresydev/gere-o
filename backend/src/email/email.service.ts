import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as nodemailer from 'nodemailer';
import type { Transporter } from 'nodemailer';
import { EmailSendResult } from './dto/email-dto';

interface EmailRecipient {
  email: string;
  name?: string;
}

interface SendMailOptions {
  from: EmailRecipient;
  to: EmailRecipient[];
  cc?: EmailRecipient[];
  bcc?: EmailRecipient[];
  subject: string;
  html: string;
}

const formatRecipient = ({ email, name }: EmailRecipient): string =>
  name ? `${name} <${email}>` : email;

@Injectable()
export class EmailService {
  private readonly logger = new Logger(EmailService.name);
  private readonly transporter: Transporter;
  private readonly from: EmailRecipient;
  private readonly bcc: EmailRecipient | null;

  constructor(private readonly configService: ConfigService) {
    const smtpHost = configService.getOrThrow<string>('smtpHost');
    const smtpPort = configService.get<number>('smtpPort') ?? 587;
    const smtpUser = configService.getOrThrow<string>('smtpUser');
    const smtpPassword = configService.getOrThrow<string>('smtpPassword');
    const smtpFrom = configService.getOrThrow<string>('smtpFrom');
    const bccEmail = configService.get<string | null>('emailReportBcc');

    // Le nom affiché est fourni par l'appelant (utilisateur connecté) ;
    // cette adresse ne sert que de repli.
    this.from = { email: smtpFrom };
    this.bcc = bccEmail ? { email: bccEmail } : null;

    this.transporter = nodemailer.createTransport({
      host: smtpHost,
      port: smtpPort,
      secure: smtpPort === 465,
      auth: {
        user: smtpUser,
        pass: smtpPassword,
      },
    });
  }

  getFrom(): EmailRecipient {
    return this.from;
  }

  getBcc(): EmailRecipient | null {
    return this.bcc;
  }

  isConfigured(): boolean {
    return !!this.transporter;
  }

  async sendMail(options: SendMailOptions): Promise<EmailSendResult> {
    try {
      const recipients = [...options.to];
      if (options.cc && options.cc.length > 0) {
        recipients.push(...options.cc);
      }

      const info = await this.transporter.sendMail({
        from: formatRecipient(options.from),
        to: recipients.map(formatRecipient).join(', '),
        cc: options.cc && options.cc.length > 0
          ? options.cc.map(formatRecipient).join(', ')
          : undefined,
        bcc: options.bcc && options.bcc.length > 0
          ? options.bcc.map(formatRecipient).join(', ')
          : undefined,
        subject: options.subject,
        html: options.html,
      });

      this.logger.log(`Email envoyé: ${info.messageId}`);
      return { success: true, messageId: info.messageId };
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      this.logger.error(`Échec envoi email: ${message}`);
      return { success: false, error: message };
    }
  }
}