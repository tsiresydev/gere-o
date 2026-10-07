import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';
import { MONTH_PATTERN } from '../../config/constants';

export type LeaveBalanceDocument = HydratedDocument<LeaveBalance>;

@Schema({ timestamps: true, collection: 'leave_balances' })
export class LeaveBalance {
  @Prop({ type: Types.ObjectId, ref: 'User', required: true, unique: true })
  userId: Types.ObjectId;

  @Prop({ required: true, type: Number, default: 0 })
  initialBalance: number;

  @Prop({ required: true, type: Number, default: 0 })
  accruedDays: number;

  @Prop({ required: true, type: Number, default: 0 })
  consumedDays: number;

  @Prop({ required: true, type: Number, default: 0 })
  pendingDays: number;

  @Prop({ required: true, type: Number, default: 0 })
  availableDays: number;

  @Prop({ required: true, match: [MONTH_PATTERN, 'lastAccrualMonth doit être au format YYYY-MM'] })
  lastAccrualMonth: string;

  createdAt?: Date;

  updatedAt?: Date;
}

export const LeaveBalanceSchema = SchemaFactory.createForClass(LeaveBalance);