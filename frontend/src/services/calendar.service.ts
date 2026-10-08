import { api } from './api';
import type { CalendarResponse } from '../types/calendar';

export async function getCalendar(params: { month?: string } | { start: string; end: string }): Promise<CalendarResponse> {
  const search = new URLSearchParams();
  if ('month' in params && params.month) {
    search.set('month', params.month);
  } else if ('start' in params && 'end' in params) {
    search.set('start', params.start);
    search.set('end', params.end);
  }
  const qs = search.toString();
  const url = qs ? `/calendar?${qs}` : '/calendar';
  const res = await api<CalendarResponse>(url);
  return res;
}
