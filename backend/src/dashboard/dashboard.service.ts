import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { WorkDayStatus } from '../common/enums/work-day-status.enum';
import { LeaveType } from '../common/enums/leave-type.enum';
import {
  DEFAULT_EXPECTED_MINUTES,
  DEFAULT_WEEKLY_EXPECTED_MINUTES,
} from '../config/constants';
import { LeavesService } from '../leaves/leaves.service';
import {
  DailyTrendPoint,
  DashboardLeaveIndicators,
  DashboardResponse,
  DashboardStats,
  WeeklyTrendPoint,
} from './dto/dashboard-response.dto';
import { WorkDay, WorkDayDocument } from '../work-days/entities/work-day.schema';
import { LeaveRequest, LeaveRequestDocument } from '../leaves/entities/leave-request.schema';

const WEEKLY_TREND_WEEKS = 8;
const STATS_WINDOW_DAYS = 30;

@Injectable()
export class DashboardService {
  constructor(
    @InjectModel(WorkDay.name)
    private readonly workDayModel: Model<WorkDayDocument>,
    @InjectModel(LeaveRequest.name)
    private readonly requestModel: Model<LeaveRequestDocument>,
    private readonly leavesService: LeavesService,
  ) {}

  async getForUser(userId: string, weekStart?: string): Promise<DashboardResponse> {
    const today = this.todayISO();
    const monday = this.mondayOf(this.parseISODate(today));
    const weekStartDate = weekStart ? this.parseISODate(weekStart) : monday;
    const weekStartStr = this.toISODate(weekStartDate);
    const weekEnd = this.toISODate(this.addDays(weekStartDate, 6));

    const trendStart = this.toISODate(this.addDays(monday, -(WEEKLY_TREND_WEEKS - 1) * 7));
    const statsStart = this.toISODate(this.addDays(this.parseISODate(today), -(STATS_WINDOW_DAYS - 1)));
    const rangeStart = trendStart < statsStart ? trendStart : statsStart;

    const [days, balance, leaveRequests] = await Promise.all([
      this.workDayModel.find({ userId, date: { $gte: rangeStart, $lte: today } }),
      this.leavesService.balance(userId),
      this.requestModel.find({ userId }),
    ]);

    // Calculate monthly leave stats (current month)
    const currentMonth = this.currentMonth();
    const { consumedThisMonth, holidaysThisMonth } = this.calculateMonthlyLeaveStats(leaveRequests, currentMonth);

    const weekDays = days.filter((day) => day.date >= weekStartStr && day.date <= weekEnd);
    const weekWorkedMinutes = weekDays
      .filter((day) => day.status === WorkDayStatus.COMPLETED)
      .reduce((total, day) => total + day.workedMinutes, 0);

    const todayDay = days.find((day) => day.date === today);

    const statsDays = days.filter((day) => day.date >= statsStart);
    const completedInWindow = statsDays.filter(
      (day) => day.status === WorkDayStatus.COMPLETED,
    );

    return {
      generatedAt: new Date().toISOString(),
      today: {
        date: today,
        workedMinutes: todayDay?.workedMinutes ?? 0,
        expectedMinutes: todayDay?.expectedMinutes ?? DEFAULT_EXPECTED_MINUTES,
        balanceMinutes: todayDay?.balanceMinutes ?? 0,
        recorded: Boolean(todayDay),
      },
      week: {
        weekStart: weekStartStr,
        weekEnd,
        workedMinutes: weekWorkedMinutes,
        expectedMinutes: DEFAULT_WEEKLY_EXPECTED_MINUTES,
        balanceMinutes: weekWorkedMinutes - DEFAULT_WEEKLY_EXPECTED_MINUTES,
        recordedDays: weekDays.filter((day) => day.status === WorkDayStatus.COMPLETED)
          .length,
      },
      leaves: this.leaveIndicators(balance, consumedThisMonth, holidaysThisMonth),
      trends: {
        daily: this.dailyTrend(days, weekStartStr, weekEnd),
        weekly: this.weeklyTrend(days, monday),
      },
      stats: this.buildStats(completedInWindow),
    };
  }

  private leaveIndicators(
    balance: {
      initialBalance: number;
      accruedDays: number;
      consumedDays: number;
      pendingDays: number;
      availableDays: number;
    },
    consumedThisMonth: number,
    holidaysThisMonth: number,
  ): DashboardLeaveIndicators {
    return {
      initialBalance: balance.initialBalance,
      accruedDays: balance.accruedDays,
      consumedDays: balance.consumedDays,
      consumedThisMonth,
      holidaysThisMonth,
      pendingDays: balance.pendingDays,
      availableDays: balance.availableDays,
    };
  }

  private calculateMonthlyLeaveStats(
    requests: LeaveRequestDocument[],
    month: string, // YYYY-MM format
  ): { consumedThisMonth: number; holidaysThisMonth: number } {
    const monthStart = `${month}-01`;
    const [year, monthNum] = month.split('-').map(Number);
    const daysInMonth = new Date(Date.UTC(year, monthNum, 0)).getUTCDate();
    const monthEnd = `${month}-${String(daysInMonth).padStart(2, '0')}`;

    let consumedThisMonth = 0;
    let holidaysThisMonth = 0;

    for (const request of requests) {
      // Skip cancelled requests
      if (request.status === 'CANCELLED') continue;

      // Check if the request overlaps with the current month
      const requestStart = request.startDate;
      const requestEnd = request.endDate;

      if (requestEnd < monthStart || requestStart > monthEnd) {
        continue; // No overlap
      }

      // Calculate overlap days
      const overlapStart = requestStart > monthStart ? requestStart : monthStart;
      const overlapEnd = requestEnd < monthEnd ? requestEnd : monthEnd;

      // Use the request's durationDays as a proportion, or compute based on overlap
      // For simplicity, we'll compute the duration for the overlapping period
      const overlapDuration = this.computeDurationDays(
        overlapStart,
        overlapEnd,
        request.startDurationType ?? request.durationType,
        request.endDurationType ?? request.durationType,
      );

      if (request.leaveType === LeaveType.HOLIDAY) {
        holidaysThisMonth += overlapDuration;
      } else {
        consumedThisMonth += overlapDuration;
      }
    }

    return { consumedThisMonth, holidaysThisMonth };
  }

  private computeDurationDays(
    startDate: string,
    endDate: string,
    startDurationType: 'FULL_DAY' | 'HALF_DAY_MORNING' | 'HALF_DAY_AFTERNOON' = 'FULL_DAY',
    endDurationType: 'FULL_DAY' | 'HALF_DAY_MORNING' | 'HALF_DAY_AFTERNOON' = 'FULL_DAY',
  ): number {
    if (startDate === endDate) {
      if (
        startDurationType === 'HALF_DAY_MORNING' ||
        startDurationType === 'HALF_DAY_AFTERNOON' ||
        endDurationType === 'HALF_DAY_MORNING' ||
        endDurationType === 'HALF_DAY_AFTERNOON'
      ) {
        return 0.5;
      }
      return 1;
    }

    let total = 0;
    const startDay = this.getDayOfWeek(startDate);
    if (startDay !== 0 && startDay !== 6) {
      if (startDurationType === 'HALF_DAY_MORNING' || startDurationType === 'HALF_DAY_AFTERNOON') {
        total += 0.5;
      } else {
        total += 1;
      }
    }

    const endDay = this.getDayOfWeek(endDate);
    if (endDay !== 0 && endDay !== 6) {
      if (endDurationType === 'HALF_DAY_MORNING' || endDurationType === 'HALF_DAY_AFTERNOON') {
        total += 0.5;
      } else {
        total += 1;
      }
    }

    if (this.isDateAfter(startDate, endDate)) {
      total += this.countBusinessDaysExclusive(startDate, endDate);
    }

    return total;
  }

  private isDateAfter(date1: string, date2: string): boolean {
    return new Date(date1) < new Date(date2);
  }

  private getDayOfWeek(dateStr: string): number {
    const date = new Date(`${dateStr}T00:00:00.000Z`);
    return date.getUTCDay();
  }

  private countBusinessDaysExclusive(start: string, end: string): number {
    let count = 0;
    const current = new Date(`${start}T00:00:00.000Z`);
    current.setUTCDate(current.getUTCDate() + 1);
    const last = new Date(`${end}T00:00:00.000Z`);
    last.setUTCDate(last.getUTCDate() - 1);

    while (current <= last) {
      const day = current.getUTCDay();
      if (day !== 0 && day !== 6) count++;
      current.setUTCDate(current.getUTCDate() + 1);
    }

    return count;
  }

  private currentMonth(): string {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  }

  private dailyTrend(days: WorkDayDocument[], weekStart: string, weekEnd: string): DailyTrendPoint[] {
    const points: DailyTrendPoint[] = [];
    const start = this.parseISODate(weekStart);
    const end = this.parseISODate(weekEnd);

    let cursor = start;
    while (cursor <= end) {
      const date = this.toISODate(cursor);
      const day = days.find((item) => item.date === date);
      const isWeekend = cursor.getUTCDay() === 0 || cursor.getUTCDay() === 6;
      points.push({ date, workedMinutes: day?.workedMinutes ?? 0, isWeekend });
      cursor = this.addDays(cursor, 1);
    }

    return points;
  }

  private weeklyTrend(
    days: WorkDayDocument[],
    currentMonday: Date,
  ): WeeklyTrendPoint[] {
    const points: WeeklyTrendPoint[] = [];

    for (let week = WEEKLY_TREND_WEEKS - 1; week >= 0; week--) {
      const start = this.toISODate(this.addDays(currentMonday, -week * 7));
      const end = this.toISODate(this.addDays(currentMonday, -week * 7 + 6));
      const workedMinutes = days
        .filter(
          (day) =>
            day.date >= start &&
            day.date <= end &&
            day.status === WorkDayStatus.COMPLETED,
        )
        .reduce((total, day) => total + day.workedMinutes, 0);

      points.push({ weekStart: start, workedMinutes, expectedMinutes: DEFAULT_WEEKLY_EXPECTED_MINUTES });
    }

    return points;
  }

  private buildStats(completedDays: WorkDayDocument[]): DashboardStats {
    const totalWorkedMinutes = completedDays.reduce(
      (total, day) => total + day.workedMinutes,
      0,
    );

    return {
      windowDays: STATS_WINDOW_DAYS,
      recordedDays: completedDays.length,
      totalWorkedMinutes,
      averageMinutesPerDay: completedDays.length
        ? Math.round(totalWorkedMinutes / completedDays.length)
        : 0,
      daysAboveObjective: completedDays.filter(
        (day) => day.workedMinutes > (day.expectedMinutes || DEFAULT_EXPECTED_MINUTES),
      ).length,
      daysBelowObjective: completedDays.filter(
        (day) => day.workedMinutes < (day.expectedMinutes || DEFAULT_EXPECTED_MINUTES),
      ).length,
    };
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

  private mondayOf(date: Date): Date {
    const day = date.getUTCDay();
    const diff = day === 0 ? -6 : 1 - day;
    return this.addDays(date, diff);
  }

  private todayISO(): string {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }
}
