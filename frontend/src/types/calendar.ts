export interface CalendarDayLeave {
  id: string;
  leaveType: 'PAID' | 'UNPAID' | 'RTT' | 'SICK' | 'OTHER';
  durationType: 'FULL_DAY' | 'MORNING' | 'AFTERNOON' | 'HOURLY';
  status: 'PENDING' | 'APPROVED' | 'REJECTED' | 'CANCELLED';
}

export interface CalendarDayWorkDay {
  entryTime: string;
  breakStart?: string | null;
  breakEnd?: string | null;
  exitTime: string;
  workedMinutes: number;
  balanceMinutes: number;
  status: 'COMPLETED' | 'IN_PROGRESS' | 'PENDING_VALIDATION';
}

export interface CalendarDay {
  date: string;
  isWeekend: boolean;
  kind: 'WORKED' | 'LEAVE' | 'ABSENCE' | 'FUTURE' | 'WEEKEND';
  workDay: CalendarDayWorkDay | null;
  leaves: CalendarDayLeave[];
}

export interface CalendarResponse {
  start: string;
  end: string;
  days: CalendarDay[];
}

export type CalendarView = 'month' | 'week';
