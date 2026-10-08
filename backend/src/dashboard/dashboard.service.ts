import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { WorkDayStatus } from '../common/enums/work-day-status.enum';
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

const WEEKLY_TREND_WEEKS = 8;
const STATS_WINDOW_DAYS = 30;

@Injectable()
export class DashboardService {
  constructor(
    @InjectModel(WorkDay.name)
    private readonly workDayModel: Model<WorkDayDocument>,
    private readonly leavesService: LeavesService,
  ) {}

  async getForUser(userId: string): Promise<DashboardResponse> {
    const today = this.todayISO();
    const monday = this.mondayOf(this.parseISODate(today));
    const weekStart = this.toISODate(monday);
    const weekEnd = this.toISODate(this.addDays(monday, 6));

    const trendStart = this.toISODate(this.addDays(monday, -(WEEKLY_TREND_WEEKS - 1) * 7));
    const statsStart = this.toISODate(this.addDays(this.parseISODate(today), -(STATS_WINDOW_DAYS - 1)));
    const rangeStart = trendStart < statsStart ? trendStart : statsStart;

    const [days, balance] = await Promise.all([
      this.workDayModel.find({ userId, date: { $gte: rangeStart, $lte: today } }),
      this.leavesService.balance(userId),
    ]);

    const weekDays = days.filter((day) => day.date >= weekStart && day.date <= weekEnd);
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
        weekStart,
        weekEnd,
        workedMinutes: weekWorkedMinutes,
        expectedMinutes: DEFAULT_WEEKLY_EXPECTED_MINUTES,
        balanceMinutes: weekWorkedMinutes - DEFAULT_WEEKLY_EXPECTED_MINUTES,
        recordedDays: weekDays.filter((day) => day.status === WorkDayStatus.COMPLETED)
          .length,
      },
      leaves: this.leaveIndicators(balance),
      trends: {
        daily: this.dailyTrend(days, weekStart, weekEnd),
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
  ): DashboardLeaveIndicators {
    return {
      initialBalance: balance.initialBalance,
      accruedDays: balance.accruedDays,
      consumedDays: balance.consumedDays,
      pendingDays: balance.pendingDays,
      availableDays: balance.availableDays,
    };
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
