export interface DashboardDayIndicators {
  date: string;
  workedMinutes: number;
  expectedMinutes: number;
  balanceMinutes: number;
  recorded: boolean;
}

export interface DashboardWeekIndicators {
  weekStart: string;
  weekEnd: string;
  workedMinutes: number;
  expectedMinutes: number;
  balanceMinutes: number;
  recordedDays: number;
}

export interface DashboardLeaveIndicators {
  initialBalance: number;
  accruedDays: number;
  consumedDays: number;
  pendingDays: number;
  availableDays: number;
  pendingRequests: number;
}

export interface DailyTrendPoint {
  date: string;
  workedMinutes: number;
}

export interface WeeklyTrendPoint {
  weekStart: string;
  workedMinutes: number;
  expectedMinutes: number;
}

export interface DashboardTrends {
  daily: DailyTrendPoint[];
  weekly: WeeklyTrendPoint[];
}

export interface DashboardStats {
  windowDays: number;
  recordedDays: number;
  totalWorkedMinutes: number;
  averageMinutesPerDay: number;
  daysAboveObjective: number;
  daysBelowObjective: number;
}

export interface DashboardResponse {
  generatedAt: string;
  today: DashboardDayIndicators;
  week: DashboardWeekIndicators;
  leaves: DashboardLeaveIndicators;
  trends: DashboardTrends;
  stats: DashboardStats;
}
