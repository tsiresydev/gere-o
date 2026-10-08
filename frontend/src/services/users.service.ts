import { api } from './api';
import type { User } from '../types/user';

export const usersService = {
  list(): Promise<User[]> {
    return api<User[]>('/users');
  },
};