import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';

export type SentReportDocument = HydratedDocument<SentReport>;

/** Snapshot immuable d'un rapport mensuel envoyé par e-mail. */
@Schema({ timestamps: true, collection: 'sent_reports' })
export class SentReport {
  @Prop({ type: Types.ObjectId, ref: 'User', required: true, index: true })
  userId: Types.ObjectId;

  @Prop({ required: true })
  year: number;

  @Prop({ required: true, min: 1, max: 12 })
  month: number;

  @Prop({ required: true })
  monthLabel: string;

  @Prop({ required: true })
  from: string;

  @Prop({ required: true })
  to: string;

  @Prop()
  cc?: string;

  @Prop()
  bcc?: string;

  @Prop({ required: true })
  subject: string;

  @Prop({ required: true })
  message: string;

  @Prop({ required: true, default: 0 })
  workedDays: number;

  @Prop({ required: true, default: 0 })
  totalLeaveDays: number;

  @Prop({ required: true })
  senderName: string;

  @Prop()
  messageId?: string;

  createdAt?: Date;

  updatedAt?: Date;
}

export const SentReportSchema = SchemaFactory.createForClass(SentReport);

SentReportSchema.index({ userId: 1, createdAt: -1 });
