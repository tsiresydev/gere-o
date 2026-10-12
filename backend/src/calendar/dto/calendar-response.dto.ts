export enum CalendarDayKind {
  WORKED = 'WORKED',
  LEAVE = 'LEAVE',
  HOLIDAY = 'HOLIDAY',
  ABSENCE = 'ABSENCE',
  FUTURE = 'FUTURE',
  WEEKEND = 'WEEKEND',
}

export interface CalendarWorkDayInfo {
  entryTime?: string;
  breakStart?: string;
  breakEnd?: string;
  exitTime?: string;
  workedMinutes: number;
  balanceMinutes: number;
  status: string;
}

export interface CalendarLeaveInfo {
  id: string;
  leaveType: string;
  durationType: string;
  status: string;
  reason: string;
}

export interface CalendarDay {
  date: string;
  isWeekend: boolean;
  kind: CalendarDayKind;
  workDay: CalendarWorkDayInfo | null;
  leaves: CalendarLeaveInfo[];
}

export interface CalendarResponse {
  start: string;
  end: string;
  days: CalendarDay[];
}
