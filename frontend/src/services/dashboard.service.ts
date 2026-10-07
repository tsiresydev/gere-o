import { api } from './api';
import type { Dashboard } from '../types/dashboard';

export const dashboardService = {
  get(): Promise<Dashboard> {
    return api<Dashboard>('/dashboard');
  },
};
