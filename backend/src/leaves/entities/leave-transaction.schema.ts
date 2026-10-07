import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';
import { LeaveTransactionType } from '../../common/enums/leave-transaction-type.enum';
import { DATE_PATTERN } from '../../config/constants';

export type LeaveTransactionDocument = HydratedDocument<LeaveTransaction>;

@Schema({ timestamps: true, collection: 'leave_transactions' })
export class LeaveTransaction {
  @Prop({ type: Types.ObjectId, ref: 'User', required: true, index: true })
  userId: Types.ObjectId;

  @Prop({ required: true, enum: LeaveTransactionType })
  type: LeaveTransactionType;

  @Prop({ required: true, type: Number })
  amount: number;

  @Prop({ trim: true, maxlength: 500 })
  reason?: string;

  @Prop({ type: Types.ObjectId, ref: 'LeaveRequest' })
  referenceId?: Types.ObjectId;

  @Prop({ required: true, match: [DATE_PATTERN, 'date doit être au format YYYY-MM-DD'] })
  date: string;

  createdAt?: Date;
}

export const LeaveTransactionSchema = SchemaFactory.createForClass(LeaveTransaction);

LeaveTransactionSchema.index({ userId: 1, date: 1 });