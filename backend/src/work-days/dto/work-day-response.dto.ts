import { WorkDayStatus } from '../../common/enums/work-day-status.enum';
import { WorkDayDocument } from '../entities/work-day.schema';

export class WorkDayResponseDto {
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

  createdAt?: Date;

  updatedAt?: Date;

  static from(day: WorkDayDocument): WorkDayResponseDto {
    const dto = new WorkDayResponseDto();
    dto.id = String(day._id);
    dto.userId = String(day.userId);
    dto.date = day.date;
    dto.entryTime = day.entryTime;
    dto.breakStart = day.breakStart;
    dto.breakEnd = day.breakEnd;
    dto.exitTime = day.exitTime;
    dto.expectedMinutes = day.expectedMinutes;
    dto.workedMinutes = day.workedMinutes;
    dto.balanceMinutes = day.balanceMinutes;
    dto.status = day.status;
    dto.createdAt = day.createdAt;
    dto.updatedAt = day.updatedAt;
    return dto;
  }
}

export interface DailySummaryResponse {
  date: string;
  workedMinutes: number;
  expectedMinutes: number;
  balanceMinutes: number;
}

export interface WorkDayPageResponse<T = WorkDayResponseDto> {
  items: T[];
  total: number;
  page: number;
  limit: number;
}

export interface WeeklySummaryResponse {
  weekStart: string;
  expectedMinutes: number;
  workedMinutes: number;
  balanceMinutes: number;
}

export interface MonthlySummaryResponse {
  year: number;
  month: number;
  expectedMinutes: number;
  workedMinutes: number;
  balanceMinutes: number;
}
