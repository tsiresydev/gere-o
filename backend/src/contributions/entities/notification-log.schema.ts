import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';
import { NotificationEvent } from '../../common/enums/notification-event.enum';
import { NotificationStatus } from '../../common/enums/notification-status.enum';

export interface NotificationRecipients {
  to: string[];
  cc: string[];
}

export type NotificationLogDocument = HydratedDocument<NotificationLog>;

@Schema({ timestamps: true, collection: 'notification_logs' })
export class NotificationLog {
  @Prop({ required: true, enum: NotificationEvent })
  eventType: NotificationEvent;

  @Prop({ required: true })
  referenceId: string;

  @Prop({ type: Object, required: true })
  recipients: NotificationRecipients;

  @Prop({ required: true })
  subject: string;

  @Prop({ required: true })
  html: string;

  @Prop({
    required: true,
    enum: NotificationStatus,
    default: NotificationStatus.PENDING,
  })
  status: NotificationStatus;

  @Prop({ default: 0 })
  attempts: number;

  @Prop()
  sentAt?: Date;

  @Prop()
  lastAttemptAt?: Date;

  @Prop()
  errorMessage?: string;

  @Prop()
  messageId?: string;

  @Prop({ type: Types.ObjectId, ref: 'User' })
  createdBy?: Types.ObjectId;

  createdAt?: Date;

  updatedAt?: Date;
}

export const NotificationLogSchema =
  SchemaFactory.createForClass(NotificationLog);

NotificationLogSchema.index({ status: 1, createdAt: 1 });
NotificationLogSchema.index({ referenceId: 1 });
NotificationLogSchema.index({ eventType: 1, createdAt: -1 });
