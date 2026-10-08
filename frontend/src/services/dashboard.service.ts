import { api } from './api';
import type { Dashboard } from '../types/dashboard';

export const dashboardService = {
  get(weekStart?: string): Promise<Dashboard> {
    const params = weekStart ? `?weekStart=${weekStart}` : '';
    return api<Dashboard>(`/dashboard${params}`);
  },
};
