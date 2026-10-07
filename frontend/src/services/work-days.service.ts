import { api } from './api';
import type {
  CreateWorkDayInput,
  DailySummary,
  MonthlySummary,
  WeeklySummary,
  WorkDay,
  WorkDayListParams,
  WorkDayPage,
  WorkDayTimes,
} from '../types/work-day';

const buildQuery = (params: object): string => {
  const entries = Object.entries(params).filter(
    (entry): entry is [string, string | number] =>
      entry[1] !== undefined && (typeof entry[1] === 'string' || typeof entry[1] === 'number'),
  );
  if (entries.length === 0) {
    return '';
  }
  return `?${entries
    .map(([key, value]) => `${encodeURIComponent(key)}=${encodeURIComponent(String(value))}`)
    .join('&')}`;
};

export const workDaysService = {
  list(params?: WorkDayListParams): Promise<WorkDayPage> {
    return api<WorkDayPage>(`/work-days${buildQuery(params ?? {})}`);
  },

  dailySummary(date?: string): Promise<DailySummary> {
    return api<DailySummary>(`/work-days/summary/daily${buildQuery({ date })}`);
  },

  weeklySummary(weekStart?: string): Promise<WeeklySummary> {
    return api<WeeklySummary>(`/work-days/summary/weekly${buildQuery({ weekStart })}`);
  },

  monthlySummary(year?: number, month?: number): Promise<MonthlySummary> {
    return api<MonthlySummary>(`/work-days/summary/monthly${buildQuery({ year, month })}`);
  },

  create(input: CreateWorkDayInput): Promise<WorkDay> {
    return api<WorkDay>('/work-days', {
      method: 'POST',
      body: JSON.stringify(input),
    });
  },

  update(id: string, input: WorkDayTimes): Promise<WorkDay> {
    return api<WorkDay>(`/work-days/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(input),
    });
  },

  remove(id: string): Promise<void> {
    return api<void>(`/work-days/${id}`, { method: 'DELETE' });
  },
};
