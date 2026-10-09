import { LeaveDurationType } from '../../common/enums/leave-duration-type.enum';
import { LeaveStatus } from '../../common/enums/leave-status.enum';
import { LeaveType } from '../../common/enums/leave-type.enum';
import { LeaveBalanceDocument } from '../entities/leave-balance.schema';
import { LeaveRequestDocument } from '../entities/leave-request.schema';

const stringField = (value: unknown): string | undefined =>
  value === undefined || value === null ? undefined : String(value);

export class LeaveRequestResponseDto {
  id!: string;
  userId!: string;
  leaveType!: LeaveType;
  reason!: string;
  startDate!: string;
  endDate!: string;
  durationType!: LeaveDurationType;
  durationDays!: number;
  status!: LeaveStatus;
  comment?: string;
  decidedBy?: string;
  decidedAt?: string;
  applicantName?: string;
  validated!: boolean;
  validatedAt?: string;
  startDurationType?: LeaveDurationType;
  endDurationType?: LeaveDurationType;

  static from(doc: LeaveRequestDocument): LeaveRequestResponseDto {
    const dto = new LeaveRequestResponseDto();
    dto.id = String(doc._id);
    dto.userId = String(doc.userId);
    dto.leaveType = doc.leaveType;
    dto.reason = doc.reason;
    dto.startDate = doc.startDate;
    dto.endDate = doc.endDate;
    dto.durationType = doc.durationType;
    dto.durationDays = doc.durationDays;
    dto.status = doc.status;
    dto.comment = stringField(doc.comment);
    dto.decidedBy = stringField(doc.decidedBy);
    dto.decidedAt = doc.decidedAt
      ? new Date(doc.decidedAt).toISOString()
      : undefined;
    dto.validated = doc.validated ?? false;
    dto.validatedAt = doc.validatedAt
      ? new Date(doc.validatedAt).toISOString()
      : undefined;
    dto.startDurationType = doc.startDurationType ?? LeaveDurationType.FULL_DAY;
    dto.endDurationType = doc.endDurationType ?? LeaveDurationType.FULL_DAY;
    return dto;
  }
}

export class LeaveBalanceResponseDto {
  userId!: string;
  initialBalance!: number;
  accruedDays!: number;
  consumedDays!: number;
  pendingDays!: number;
  availableDays!: number;
  lastAccrualMonth!: string;
  updatedAt?: string;

  static from(doc: LeaveBalanceDocument): LeaveBalanceResponseDto {
    const dto = new LeaveBalanceResponseDto();
    dto.userId = String(doc.userId);
    dto.initialBalance = doc.initialBalance;
    dto.accruedDays = doc.accruedDays;
    dto.consumedDays = doc.consumedDays;
    dto.pendingDays = doc.pendingDays;
    dto.availableDays = doc.availableDays;
    dto.lastAccrualMonth = doc.lastAccrualMonth;
    dto.updatedAt = doc.updatedAt ? doc.updatedAt.toISOString() : undefined;
    return dto;
  }
}