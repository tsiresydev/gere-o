export type LeaveStatus = 'PENDING' | 'APPROVED' | 'REJECTED' | 'CANCELLED';
export type LeaveType = 'PAID' | 'UNPAID';
export type LeaveDurationType = 'FULL_DAY' | 'HALF_DAY_MORNING' | 'HALF_DAY_AFTERNOON';
export type LeaveDecision = Extract<LeaveStatus, 'APPROVED' | 'REJECTED'>;

export interface LeaveRequest {
  id: string;
  userId: string;
  leaveType: LeaveType;
  reason: string;
  startDate: string;
  endDate: string;
  durationType: LeaveDurationType;
  durationDays: number;
  status: LeaveStatus;
  comment?: string;
  decidedBy?: string;
  decidedAt?: string;
  applicantName?: string;
}

export interface LeaveBalance {
  userId: string;
  initialBalance: number;
  accruedDays: number;
  consumedDays: number;
  pendingDays: number;
  availableDays: number;
  lastAccrualMonth: string;
  updatedAt?: string;
}

export interface CreateLeaveInput {
  leaveType: LeaveType;
  reason: string;
  startDate: string;
  endDate: string;
  durationType: LeaveDurationType;
}

export interface DecideLeaveInput {
  status: LeaveDecision;
  comment?: string;
}

export interface InitializeBalanceInput {
  userId: string;
  initialDays: number;
}

export const LEAVE_TYPE_LABELS: Record<LeaveType, string> = {
  PAID: 'Payé',
  UNPAID: 'Non payé',
};

export const LEAVE_DURATION_LABELS: Record<LeaveDurationType, string> = {
  FULL_DAY: 'Journée complète',
  HALF_DAY_MORNING: 'Demi-journée matin',
  HALF_DAY_AFTERNOON: 'Demi-journée après-midi',
};

export const LEAVE_STATUS_LABELS: Record<LeaveStatus, string> = {
  PENDING: 'En attente',
  APPROVED: 'Approuvé',
  REJECTED: 'Refusé',
  CANCELLED: 'Annulé',
};

export const LEAVE_DURATION_OPTIONS: { value: LeaveDurationType; label: string }[] = [
  { value: 'FULL_DAY', label: LEAVE_DURATION_LABELS.FULL_DAY },
  { value: 'HALF_DAY_MORNING', label: LEAVE_DURATION_LABELS.HALF_DAY_MORNING },
  { value: 'HALF_DAY_AFTERNOON', label: LEAVE_DURATION_LABELS.HALF_DAY_AFTERNOON },
];