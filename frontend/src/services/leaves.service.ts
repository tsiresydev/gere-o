import { api } from './api';
import type {
  CreateLeaveInput,
  DecideLeaveInput,
  LeaveBalance,
  LeaveRequest,
} from '../types/leave';

export const leavesService = {
  list(): Promise<LeaveRequest[]> {
    return api<LeaveRequest[]>('/leaves');
  },

  pending(): Promise<LeaveRequest[]> {
    return api<LeaveRequest[]>('/leaves/pending');
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

  decide(id: string, input: DecideLeaveInput): Promise<LeaveRequest> {
    return api<LeaveRequest>(`/leaves/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(input),
    });
  },

  remove(id: string): Promise<void> {
    return api<void>(`/leaves/${id}`, { method: 'DELETE' });
  },
};