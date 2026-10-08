export interface DashboardDay {
  date: string;
  workedMinutes: number;
  expectedMinutes: number;
  balanceMinutes: number;
  recorded: boolean;
}

export interface DashboardWeek {
  weekStart: string;
  weekEnd: string;
  workedMinutes: number;
  expectedMinutes: number;
  balanceMinutes: number;
  recordedDays: number;
}

export interface DashboardLeaves {
  initialBalance: number;
  accruedDays: number;
  consumedDays: number;
  pendingDays: number;
  availableDays: number;
}

export interface DailyTrendPoint {
  date: string;
  workedMinutes: number;
  isWeekend: boolean;
}

export interface WeeklyTrendPoint {
  weekStart: string;
  workedMinutes: number;
  expectedMinutes: number;
}

export interface DashboardStats {
  windowDays: number;
  recordedDays: number;
  totalWorkedMinutes: number;
  averageMinutesPerDay: number;
  daysAboveObjective: number;
  daysBelowObjective: number;
}

export interface Dashboard {
  generatedAt: string;
  today: DashboardDay;
  week: DashboardWeek;
  leaves: DashboardLeaves;
  trends: {
    daily: DailyTrendPoint[];
    weekly: WeeklyTrendPoint[];
  };
  stats: DashboardStats;
}