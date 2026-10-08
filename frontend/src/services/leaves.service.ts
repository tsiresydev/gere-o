import { api } from './api';
import type {
  CreateLeaveInput,
  LeaveBalance,
  LeaveRequest,
  InitializeBalanceInput,
} from '../types/leave';

export const leavesService = {
  list(): Promise<LeaveRequest[]> {
    return api<LeaveRequest[]>('/leaves');
  },

  history(): Promise<LeaveRequest[]> {
    return api<LeaveRequest[]>('/leaves/history');
  },

  balance(): Promise<LeaveBalance> {
    return api<LeaveBalance>('/leaves/balance');
  },

  create(input: CreateLeaveInput): Promise<LeaveRequest> {
    return api<LeaveRequest>('/leaves', {
      method: 'POST',
      body: JSON.stringify(input),
    });
  },

  remove(id: string): Promise<void> {
    return api<void>(`/leaves/${id}`, { method: 'DELETE' });
  },

  initialize(input: InitializeBalanceInput): Promise<LeaveBalance> {
    return api<LeaveBalance>('/leaves/balance/init', {
      method: 'POST',
      body: JSON.stringify(input),
    });
  },
};