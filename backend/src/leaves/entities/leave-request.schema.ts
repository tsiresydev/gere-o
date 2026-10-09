import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';
import { LeaveDurationType } from '../../common/enums/leave-duration-type.enum';
import { LeaveStatus } from '../../common/enums/leave-status.enum';
import { LeaveType } from '../../common/enums/leave-type.enum';
import { DATE_PATTERN } from '../../config/constants';

export type LeaveRequestDocument = HydratedDocument<LeaveRequest>;

@Schema({ timestamps: true, collection: 'leave_requests' })
export class LeaveRequest {
  @Prop({ type: Types.ObjectId, ref: 'User', required: true, index: true })
  userId: Types.ObjectId;

  @Prop({ required: true, enum: LeaveType })
  leaveType: LeaveType;

  @Prop({ required: true, trim: true, maxlength: 500 })
  reason: string;

  @Prop({ required: true, match: [DATE_PATTERN, 'startDate doit être au format YYYY-MM-DD'] })
  startDate: string;

  @Prop({ required: true, match: [DATE_PATTERN, 'endDate doit être au format YYYY-MM-DD'] })
  endDate: string;

  @Prop({ required: true, enum: LeaveDurationType })
  durationType: LeaveDurationType;

  @Prop({ required: true, type: Number, min: 0.5 })
  durationDays: number;

  @Prop({ required: true, enum: LeaveStatus, default: LeaveStatus.APPROVED })
  status: LeaveStatus;

  @Prop({ default: false })
  validated: boolean;

  @Prop({ trim: true, maxlength: 500 })
  comment?: string;

  @Prop({ type: Types.ObjectId, ref: 'User' })
  decidedBy?: Types.ObjectId;

  @Prop()
  decidedAt?: Date;

  @Prop()
  validatedAt?: Date;

  createdAt?: Date;

  updatedAt?: Date;
}

export const LeaveRequestSchema = SchemaFactory.createForClass(LeaveRequest);