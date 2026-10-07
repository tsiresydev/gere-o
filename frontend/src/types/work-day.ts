export type WorkDayStatus = 'INCOMPLETE' | 'COMPLETED';

export interface WorkDay {
  id: string;
  userId: string;
  date: string;
  entryTime?: string;
  breakStart?: string;
  breakEnd?: string;
  exitTime?: string;
  expectedMinutes: number;
  workedMinutes: number;
  balanceMinutes: number;
  status: WorkDayStatus;
  createdAt?: string;
  updatedAt?: string;
}

export interface WorkDayTimes {
  entryTime?: string;
  breakStart?: string;
  breakEnd?: string;
  exitTime?: string;
}

export interface CreateWorkDayInput extends WorkDayTimes {
  date: string;
}

export interface DailySummary {
  date: string;
  workedMinutes: number;
  expectedMinutes: number;
  balanceMinutes: number;
}

export interface WorkDayListParams {
  startDate?: string;
  endDate?: string;
  page?: number;
  limit?: number;
}

export interface WorkDayPage {
  items: WorkDay[];
  total: number;
  page: number;
  limit: number;
}

export interface WeeklySummary {
  weekStart: string;
  expectedMinutes: number;
  workedMinutes: number;
  balanceMinutes: number;
}

export interface MonthlySummary {
  year: number;
  month: number;
  expectedMinutes: number;
  workedMinutes: number;
  balanceMinutes: number;
}

export const DEFAULT_SCHEDULE: WorkDayTimes = {
  entryTime: '08:45',
  breakStart: '13:00',
  breakEnd: '14:00',
  exitTime: '17:45',
};
