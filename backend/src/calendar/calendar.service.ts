import { BadRequestException, Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { LeaveStatus } from '../common/enums/leave-status.enum';
import { WorkDayStatus } from '../common/enums/work-day-status.enum';
import { CalendarQueryDto } from './dto/calendar-query.dto';
import {
  CalendarDay,
  CalendarDayKind,
  CalendarLeaveInfo,
  CalendarResponse,
} from './dto/calendar-response.dto';
import { WorkDay, WorkDayDocument } from '../work-days/entities/work-day.schema';
import {
  LeaveRequest,
  LeaveRequestDocument,
} from '../leaves/entities/leave-request.schema';

const MAX_RANGE_DAYS = 92;
const VISIBLE_LEAVE_STATUSES: LeaveStatus[] = [
  LeaveStatus.APPROVED,
  LeaveStatus.PENDING,
];

@Injectable()
export class CalendarService {
  constructor(
    @InjectModel(WorkDay.name)
    private readonly workDayModel: Model<WorkDayDocument>,
    @InjectModel(LeaveRequest.name)
    private readonly requestModel: Model<LeaveRequestDocument>,
  ) {}

  async getCalendar(userId: string, query: CalendarQueryDto): Promise<CalendarResponse> {
    const { start, end } = this.resolveRange(query);

    const [workDays, requests] = await Promise.all([
      this.workDayModel.find({ userId, date: { $gte: start, $lte: end } }),
      this.requestModel.find({ userId }),
    ]);

    const visibleLeaves = requests.filter(
      (request) =>
        VISIBLE_LEAVE_STATUSES.includes(request.status) &&
        request.startDate <= end &&
        request.endDate >= start,
    );

    const days: CalendarDay[] = [];
    let cursor = this.parseISODate(start);
    const last = this.parseISODate(end);

    while (cursor <= last) {
      const date = this.toISODate(cursor);
      const workDay = workDays.find((day) => day.date === date);
      const leaves = this.leavesForDate(visibleLeaves, date);

      days.push({
        date,
        isWeekend: this.isWeekend(cursor),
        kind: this.classify(cursor, date, workDay, leaves),
        workDay: workDay
          ? {
              entryTime: workDay.entryTime,
              breakStart: workDay.breakStart,
              breakEnd: workDay.breakEnd,
              exitTime: workDay.exitTime,
              workedMinutes: workDay.workedMinutes,
              balanceMinutes: workDay.balanceMinutes,
              status: workDay.status,
            }
          : null,
        leaves,
      });

      cursor = this.addDays(cursor, 1);
    }

    return { start, end, days };
  }

  private resolveRange(query: CalendarQueryDto): { start: string; end: string } {
    if (query.start && query.end) {
      if (query.end < query.start) {
        throw new BadRequestException(
          'La date de fin doit être postérieure ou égale à la date de début',
        );
      }
      const days = this.dayCount(query.start, query.end);
      if (days > MAX_RANGE_DAYS) {
        throw new BadRequestException(
          `La période ne peut pas dépasser ${MAX_RANGE_DAYS} jours`,
        );
      }
      return { start: query.start, end: query.end };
    }

    if (query.start || query.end) {
      throw new BadRequestException(
        'Les paramètres start et end doivent être fournis ensemble',
      );
    }

    const month = query.month ?? this.currentMonth();
    const [year, monthNumber] = month.split('-').map(Number);
    const daysInMonth = new Date(Date.UTC(year, monthNumber, 0)).getUTCDate();
    const mm = String(monthNumber).padStart(2, '0');

    return { start: `${year}-${mm}-01`, end: `${year}-${mm}-${String(daysInMonth).padStart(2, '0')}` };
  }

  private leavesForDate(
    requests: LeaveRequestDocument[],
    date: string,
  ): CalendarLeaveInfo[] {
    return requests
      .filter((request) => request.startDate <= date && request.endDate >= date)
      .map((request) => ({
        id: String(request._id),
        leaveType: request.leaveType,
        durationType: request.durationType,
        status: request.status,
      }));
  }

  private classify(
    date: Date,
    iso: string,
    workDay: WorkDayDocument | undefined,
    leaves: CalendarLeaveInfo[],
  ): CalendarDayKind {
    if (this.isWeekend(date)) {
      return CalendarDayKind.WEEKEND;
    }

    if (leaves.some((leave) => leave.status === LeaveStatus.APPROVED)) {
      return CalendarDayKind.LEAVE;
    }

    if (workDay && workDay.status === WorkDayStatus.COMPLETED) {
      return CalendarDayKind.WORKED;
    }

    if (iso > this.todayISO()) {
      return CalendarDayKind.FUTURE;
    }

    return CalendarDayKind.ABSENCE;
  }

  private isWeekend(date: Date): boolean {
    const day = date.getUTCDay();
    return day === 0 || day === 6;
  }

  private dayCount(start: string, end: string): number {
    const from = this.parseISODate(start).getTime();
    const to = this.parseISODate(end).getTime();
    return Math.floor((to - from) / 86_400_000) + 1;
  }

  private parseISODate(iso: string): Date {
    return new Date(`${iso}T00:00:00.000Z`);
  }

  private toISODate(date: Date): string {
    return date.toISOString().slice(0, 10);
  }

  private addDays(date: Date, days: number): Date {
    return new Date(date.getTime() + days * 86_400_000);
  }

  private currentMonth(): string {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  }

  private todayISO(): string {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }
}
