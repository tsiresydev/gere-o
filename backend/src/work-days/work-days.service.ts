import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { FilterQuery, isValidObjectId, Model } from 'mongoose';
import { WorkDayStatus } from '../common/enums/work-day-status.enum';
import {
  DEFAULT_EXPECTED_MINUTES,
  DEFAULT_WEEKLY_EXPECTED_MINUTES,
} from '../config/constants';
import { CreateWorkDayDto } from './dto/create-work-day.dto';
import { ListWorkDaysQueryDto } from './dto/list-work-days-query.dto';
import { UpdateWorkDayDto } from './dto/update-work-day.dto';
import {
  DailySummaryResponse,
  MonthlySummaryResponse,
  WeeklySummaryResponse,
  WorkDayPageResponse,
} from './dto/work-day-response.dto';
import { WorkDay, WorkDayDocument } from './entities/work-day.schema';

interface WorkDayTimes {
  entryTime?: string;
  breakStart?: string;
  breakEnd?: string;
  exitTime?: string;
}

@Injectable()
export class WorkDaysService {
  constructor(
    @InjectModel(WorkDay.name) private readonly workDayModel: Model<WorkDayDocument>,
  ) {}

  async create(userId: string, dto: CreateWorkDayDto): Promise<WorkDayDocument> {
    const existing = await this.workDayModel.findOne({ userId, date: dto.date });
    if (existing) {
      throw new ConflictException('Une journée existe déjà pour cette date');
    }

    const times: WorkDayTimes = {
      entryTime: dto.entryTime,
      breakStart: dto.breakStart,
      breakEnd: dto.breakEnd,
      exitTime: dto.exitTime,
    };
    this.assertCoherent(times);

    try {
      return await this.workDayModel.create({
        userId,
        date: dto.date,
        ...times,
        expectedMinutes: DEFAULT_EXPECTED_MINUTES,
        ...this.calculate(times),
      });
    } catch (error) {
      if (this.isDuplicateKeyError(error)) {
        throw new ConflictException('Une journée existe déjà pour cette date');
      }
      throw error;
    }
  }

  async findOne(userId: string, id: string): Promise<WorkDayDocument> {
    const day = await this.findByIdForUser(userId, id);
    return day;
  }

  async update(
    userId: string,
    id: string,
    dto: UpdateWorkDayDto,
  ): Promise<WorkDayDocument> {
    const day = await this.findByIdForUser(userId, id);

    const times: WorkDayTimes = {
      entryTime: dto.entryTime ?? day.entryTime,
      breakStart: dto.breakStart ?? day.breakStart,
      breakEnd: dto.breakEnd ?? day.breakEnd,
      exitTime: dto.exitTime ?? day.exitTime,
    };
    this.assertCoherent(times);

    const updated = await this.workDayModel.findByIdAndUpdate(
      String(day._id),
      { ...times, ...this.calculate(times) },
      { new: true },
    );
    if (!updated) {
      throw new NotFoundException('Journée introuvable');
    }

    return updated;
  }

  async remove(userId: string, id: string): Promise<void> {
    const day = await this.findByIdForUser(userId, id);
    await this.workDayModel.findByIdAndDelete(String(day._id));
  }

  async findAll(
    userId: string,
    query: ListWorkDaysQueryDto,
  ): Promise<WorkDayPageResponse<WorkDayDocument>> {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;

    const filter: FilterQuery<WorkDay> = { userId };
    if (query.startDate || query.endDate) {
      const dateFilter: { $gte?: string; $lte?: string } = {};
      if (query.startDate) {
        dateFilter.$gte = query.startDate;
      }
      if (query.endDate) {
        dateFilter.$lte = query.endDate;
      }
      filter.date = dateFilter;
    }

    const total = await this.workDayModel.countDocuments(filter);
    const items = await this.workDayModel
      .find(filter)
      .sort({ date: -1 })
      .skip((page - 1) * limit)
      .limit(limit);

    return { items, total, page, limit };
  }

  async dailySummary(userId: string, date: string): Promise<DailySummaryResponse> {
    const day = await this.workDayModel.findOne({ userId, date });

    return {
      date,
      workedMinutes: day?.workedMinutes ?? 0,
      expectedMinutes: day?.expectedMinutes ?? DEFAULT_EXPECTED_MINUTES,
      balanceMinutes: day?.balanceMinutes ?? 0,
    };
  }

  async weeklySummary(
    userId: string,
    weekStart?: string,
  ): Promise<WeeklySummaryResponse> {
    const reference = weekStart ? this.parseISODate(weekStart) : new Date();
    const monday = this.mondayOf(reference);
    const start = this.toISODate(monday);
    const end = this.toISODate(this.addDays(monday, 6));

    const workedMinutes = await this.sumCompletedMinutes(userId, start, end);

    return {
      weekStart: start,
      expectedMinutes: DEFAULT_WEEKLY_EXPECTED_MINUTES,
      workedMinutes,
      balanceMinutes: workedMinutes - DEFAULT_WEEKLY_EXPECTED_MINUTES,
    };
  }

  async monthlySummary(
    userId: string,
    year?: number,
    month?: number,
  ): Promise<MonthlySummaryResponse> {
    const now = new Date();
    const targetYear = year ?? now.getFullYear();
    const targetMonth = month ?? now.getMonth() + 1;

    const { start, end } = this.monthRange(targetYear, targetMonth);
    const workedMinutes = await this.sumCompletedMinutes(userId, start, end);
    const expectedMinutes =
      this.businessDaysInMonth(targetYear, targetMonth) * DEFAULT_EXPECTED_MINUTES;

    return {
      year: targetYear,
      month: targetMonth,
      expectedMinutes,
      workedMinutes,
      balanceMinutes: workedMinutes - expectedMinutes,
    };
  }

  private async sumCompletedMinutes(
    userId: string,
    start: string,
    end: string,
  ): Promise<number> {
    const days = await this.workDayModel.find({
      userId,
      date: { $gte: start, $lte: end },
    });

    return days
      .filter((day) => day.status === WorkDayStatus.COMPLETED)
      .reduce((total, day) => total + day.workedMinutes, 0);
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

  private monthRange(year: number, month: number): { start: string; end: string } {
    const mm = String(month).padStart(2, '0');
    const daysInMonth = new Date(Date.UTC(year, month, 0)).getUTCDate();
    return {
      start: `${year}-${mm}-01`,
      end: `${year}-${mm}-${String(daysInMonth).padStart(2, '0')}`,
    };
  }

  private businessDaysInMonth(year: number, month: number): number {
    const daysInMonth = new Date(Date.UTC(year, month, 0)).getUTCDate();
    let count = 0;

    for (let day = 1; day <= daysInMonth; day++) {
      const weekday = new Date(Date.UTC(year, month - 1, day)).getUTCDay();
      if (weekday !== 0 && weekday !== 6) {
        count++;
      }
    }

    return count;
  }

  private async findByIdForUser(userId: string, id: string): Promise<WorkDayDocument> {
    if (!isValidObjectId(id)) {
      throw new NotFoundException('Journée introuvable');
    }

    const day = await this.workDayModel.findById(id);
    if (!day || String(day.userId) !== userId) {
      throw new NotFoundException('Journée introuvable');
    }

    return day;
  }

  private assertCoherent(times: WorkDayTimes): void {
    const { entryTime, breakStart, breakEnd, exitTime } = times;

    if (Boolean(breakStart) !== Boolean(breakEnd)) {
      throw new BadRequestException(
        'La pause doit être renseignée avec un début et une fin',
      );
    }

    if (!entryTime && (breakStart || breakEnd)) {
      throw new BadRequestException(
        "L'heure d'entrée est obligatoire pour enregistrer une pause",
      );
    }

    if (!entryTime && exitTime) {
      throw new BadRequestException(
        "L'heure d'entrée est obligatoire pour enregistrer l'heure de sortie",
      );
    }

    if (breakStart && breakEnd && this.toMinutes(breakEnd) <= this.toMinutes(breakStart)) {
      throw new BadRequestException(
        'La fin de pause doit être postérieure au début de pause',
      );
    }

    if (entryTime && exitTime && this.toMinutes(exitTime) <= this.toMinutes(entryTime)) {
      throw new BadRequestException(
        "L'heure de sortie doit être postérieure à l'heure d'entrée",
      );
    }

    if (entryTime && breakStart && this.toMinutes(breakStart) < this.toMinutes(entryTime)) {
      throw new BadRequestException('Le début de pause doit être postérieur à l’entrée');
    }

    if (exitTime && breakEnd && this.toMinutes(breakEnd) > this.toMinutes(exitTime)) {
      throw new BadRequestException('La fin de pause doit être antérieure à la sortie');
    }
  }

  private calculate(times: WorkDayTimes): {
    workedMinutes: number;
    balanceMinutes: number;
    status: WorkDayStatus;
  } {
    const { entryTime, breakStart, breakEnd, exitTime } = times;

    if (!entryTime || !exitTime) {
      return {
        workedMinutes: 0,
        balanceMinutes: 0,
        status: WorkDayStatus.INCOMPLETE,
      };
    }

    const presenceMinutes = this.toMinutes(exitTime) - this.toMinutes(entryTime);
    const breakMinutes =
      breakStart && breakEnd ? this.toMinutes(breakEnd) - this.toMinutes(breakStart) : 0;
    const workedMinutes = Math.max(0, presenceMinutes - breakMinutes);

    return {
      workedMinutes,
      balanceMinutes: workedMinutes - DEFAULT_EXPECTED_MINUTES,
      status: WorkDayStatus.COMPLETED,
    };
  }

  private toMinutes(time: string): number {
    const [hours, minutes] = time.split(':').map(Number);
    return hours * 60 + minutes;
  }

  private isDuplicateKeyError(error: unknown): boolean {
    return (
      typeof error === 'object' &&
      error !== null &&
      'code' in error &&
      (error as { code?: unknown }).code === 11000
    );
  }
}
