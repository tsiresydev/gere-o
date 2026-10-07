import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';
import { WorkDayStatus } from '../../common/enums/work-day-status.enum';
import { DATE_PATTERN, DEFAULT_EXPECTED_MINUTES, TIME_PATTERN } from '../../config/constants';

export type WorkDayDocument = HydratedDocument<WorkDay>;

@Schema({ timestamps: true, collection: 'work_days' })
export class WorkDay {
  @Prop({ type: Types.ObjectId, ref: 'User', required: true, index: true })
  userId: Types.ObjectId;

  @Prop({ required: true, match: [DATE_PATTERN, 'La date doit être au format YYYY-MM-DD'] })
  date: string;

  @Prop({ match: [TIME_PATTERN, "L'heure doit être au format HH:mm"] })
  entryTime?: string;

  @Prop({ match: [TIME_PATTERN, "L'heure doit être au format HH:mm"] })
  breakStart?: string;

  @Prop({ match: [TIME_PATTERN, "L'heure doit être au format HH:mm"] })
  breakEnd?: string;

  @Prop({ match: [TIME_PATTERN, "L'heure doit être au format HH:mm"] })
  exitTime?: string;

  @Prop({ required: true, default: DEFAULT_EXPECTED_MINUTES })
  expectedMinutes: number;

  @Prop({ required: true, default: 0 })
  workedMinutes: number;

  @Prop({ required: true, default: 0 })
  balanceMinutes: number;

  @Prop({ required: true, enum: WorkDayStatus, default: WorkDayStatus.INCOMPLETE })
  status: WorkDayStatus;

  createdAt?: Date;

  updatedAt?: Date;
}

export const WorkDaySchema = SchemaFactory.createForClass(WorkDay);

WorkDaySchema.index({ userId: 1, date: 1 }, { unique: true });
