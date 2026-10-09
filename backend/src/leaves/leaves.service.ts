import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { isValidObjectId, Model } from 'mongoose';
import { LeaveDurationType } from '../common/enums/leave-duration-type.enum';
import { LeaveStatus } from '../common/enums/leave-status.enum';
import { LeaveTransactionType } from '../common/enums/leave-transaction-type.enum';
import {
  DEFAULT_LEAVE_INITIAL_BALANCE,
  LEAVE_MONTHLY_ACCRUAL,
} from '../config/constants';
import { CreateLeaveRequestDto } from './dto/create-leave-request.dto';
import { UpdateLeaveRequestDto } from './dto/update-leave-request.dto';
import {
  LeaveBalance,
  LeaveBalanceDocument,
} from './entities/leave-balance.schema';
import {
  LeaveRequest,
  LeaveRequestDocument,
} from './entities/leave-request.schema';
import {
  LeaveTransaction,
  LeaveTransactionDocument,
} from './entities/leave-transaction.schema';

const round2 = (value: number): number =>
  Math.round((value + Number.EPSILON) * 100) / 100;

@Injectable()
export class LeavesService {
  constructor(
    @InjectModel(LeaveBalance.name)
    private readonly balanceModel: Model<LeaveBalanceDocument>,
    @InjectModel(LeaveRequest.name)
    private readonly requestModel: Model<LeaveRequestDocument>,
    @InjectModel(LeaveTransaction.name)
    private readonly transactionModel: Model<LeaveTransactionDocument>,
  ) {}

  async create(userId: string, dto: CreateLeaveRequestDto): Promise<LeaveRequestDocument> {
    this.assertValidRequest(dto);
    const startDurationType = dto.startDurationType ?? LeaveDurationType.FULL_DAY;
    const endDurationType = dto.endDurationType ?? LeaveDurationType.FULL_DAY;
    const durationDays = this.computeDurationDays(dto.startDate, dto.endDate, startDurationType, endDurationType);

    const balance = await this.ensureBalance(userId);
    if (balance.availableDays < durationDays - 1e-9) {
      throw new BadRequestException('Solde de congés insuffisant');
    }

    const request = await this.requestModel.create({
      userId,
      leaveType: dto.leaveType,
      reason: dto.reason,
      startDate: dto.startDate,
      endDate: dto.endDate,
      durationType: startDurationType,
      startDurationType,
      endDurationType,
      durationDays,
      status: LeaveStatus.APPROVED,
    });

    balance.consumedDays = round2(balance.consumedDays + durationDays);
    balance.availableDays = this.recomputeAvailable(balance);
    await balance.save();

    await this.transactionModel.create({
      userId,
      type: LeaveTransactionType.LEAVE_TAKEN,
      amount: -durationDays,
      reason: dto.reason,
      referenceId: String(request._id),
      date: this.today(),
    });

    return request;
  }

  async update(userId: string, id: string, dto: UpdateLeaveRequestDto): Promise<LeaveRequestDocument> {
    const request = await this.findById(id);

    if (String(request.userId) !== userId) {
      throw new NotFoundException('Demande de congé introuvable');
    }

    if (request.validated === true) {
      throw new ConflictException('Impossible de modifier une demande validée');
    }

    if (request.status === LeaveStatus.CANCELLED) {
      throw new ConflictException('Impossible de modifier une demande annulée');
    }

    const oldDurationDays = request.durationDays;

    const startDurationType = dto.startDurationType ?? LeaveDurationType.FULL_DAY;
    const endDurationType = dto.endDurationType ?? LeaveDurationType.FULL_DAY;
    const newDurationDays = this.computeDurationDays(dto.startDate, dto.endDate, startDurationType, endDurationType);

    const balance = await this.ensureBalance(userId);
    const delta = round2(newDurationDays - oldDurationDays);

    if (delta > 0 && balance.availableDays < delta - 1e-9) {
      throw new BadRequestException('Solde de congés insuffisant');
    }

    const updated = await this.requestModel.findByIdAndUpdate(
      String(request._id),
      {
        leaveType: dto.leaveType,
        reason: dto.reason,
        startDate: dto.startDate,
        endDate: dto.endDate,
        durationType: startDurationType,
        startDurationType,
        endDurationType,
        durationDays: newDurationDays,
      },
      { new: true },
    );

    if (!updated) {
      throw new NotFoundException('Demande de congé introuvable');
    }

    if (delta !== 0) {
      balance.consumedDays = round2(balance.consumedDays + delta);
      balance.availableDays = this.recomputeAvailable(balance);
      await balance.save();

      await this.transactionModel.create({
        userId,
        type: LeaveTransactionType.LEAVE_TAKEN,
        amount: -delta,
        reason: dto.reason,
        referenceId: String(request._id),
        date: this.today(),
      });
    }

    return updated;
  }

  async findAll(userId: string): Promise<LeaveRequestDocument[]> {
    return await this.requestModel.find({ userId }).sort({ createdAt: -1 });
  }

  async findOne(userId: string, id: string): Promise<LeaveRequestDocument> {
    const request = await this.findById(id);

    if (String(request.userId) !== userId) {
      throw new NotFoundException('Demande de congé introuvable');
    }

    return request;
  }

  async remove(userId: string, id: string): Promise<void> {
    const request = await this.findById(id);

    if (String(request.userId) !== userId) {
      throw new NotFoundException('Demande de congé introuvable');
    }

    if (request.status === LeaveStatus.CANCELLED) {
      throw new ConflictException('Demande déjà annulée');
    }

    if (request.status === LeaveStatus.APPROVED) {
      const balance = await this.ensureBalance(userId);
      balance.consumedDays = round2(balance.consumedDays - request.durationDays);
      balance.availableDays = this.recomputeAvailable(balance);
      await balance.save();

      await this.transactionModel.create({
        userId,
        type: LeaveTransactionType.LEAVE_RELEASED,
        amount: request.durationDays,
        reason: 'Annulation de la demande',
        referenceId: String(request._id),
        date: this.today(),
      });
    }

    await this.requestModel.findByIdAndUpdate(String(request._id), {
      status: LeaveStatus.CANCELLED,
    });
  }

  async validate(userId: string, id: string): Promise<LeaveRequestDocument> {
    const request = await this.findById(id);

    if (String(request.userId) !== userId) {
      throw new NotFoundException('Demande de congé introuvable');
    }

    if (request.validated === true) {
      throw new ConflictException('Demande déjà validée');
    }

    if (request.status === LeaveStatus.CANCELLED) {
      throw new ConflictException('Impossible de valider une demande annulée');
    }

    request.validated = true;
    request.validatedAt = new Date();
    await request.save();

    await this.transactionModel.create({
      userId,
      type: LeaveTransactionType.DECISION,
      amount: 0,
      reason: 'Demande validée définitivement',
      referenceId: String(request._id),
      date: this.today(),
    });

    return request;
  }

  async balance(userId: string): Promise<LeaveBalanceDocument> {
    return await this.ensureBalance(userId);
  }

  async initialize(userId: string, initialDays: number): Promise<LeaveBalanceDocument> {
    const existing = await this.balanceModel.findOne({ userId });
    if (existing) {
      const previousInitial = existing.initialBalance;
      const delta = initialDays - previousInitial;
      existing.initialBalance = initialDays;
      existing.availableDays = this.recomputeAvailable(existing);
      await existing.save();

      await this.transactionModel.create({
        userId,
        type: LeaveTransactionType.INIT,
        amount: delta,
        reason: `Ajustement solde initial (${previousInitial} → ${initialDays})`,
        date: this.today(),
      });

      return existing;
    }

    const balance = await this.balanceModel.create({
      userId,
      initialBalance: initialDays,
      accruedDays: 0,
      consumedDays: 0,
      pendingDays: 0,
      availableDays: initialDays,
      lastAccrualMonth: this.currentMonth(),
    });

    await this.transactionModel.create({
      userId,
      type: LeaveTransactionType.INIT,
      amount: initialDays,
      reason: 'Solde initial',
      date: this.today(),
    });

    return balance;
  }

  private async ensureBalance(userId: string): Promise<LeaveBalanceDocument> {
    let balance = await this.balanceModel.findOne({ userId });

    if (!balance) {
      balance = await this.balanceModel.create({
        userId,
        initialBalance: DEFAULT_LEAVE_INITIAL_BALANCE,
        accruedDays: 0,
        consumedDays: 0,
        pendingDays: 0,
        availableDays: DEFAULT_LEAVE_INITIAL_BALANCE,
        lastAccrualMonth: this.currentMonth(),
      });

      await this.transactionModel.create({
        userId,
        type: LeaveTransactionType.INIT,
        amount: DEFAULT_LEAVE_INITIAL_BALANCE,
        reason: 'Solde initial',
        date: this.today(),
      });
    }

    await this.accrueUpTo(balance);
    return balance;
  }

  private async accrueUpTo(balance: LeaveBalanceDocument): Promise<void> {
    let month = this.nextMonth(balance.lastAccrualMonth);
    const current = this.currentMonth();
    let changed = false;

    while (month <= current) {
      balance.accruedDays = round2(balance.accruedDays + LEAVE_MONTHLY_ACCRUAL);
      balance.lastAccrualMonth = month;
      balance.availableDays = this.recomputeAvailable(balance);
      await this.transactionModel.create({
        userId: String(balance.userId),
        type: LeaveTransactionType.ACCRUAL,
        amount: LEAVE_MONTHLY_ACCRUAL,
        reason: `Acquisition ${month}`,
        date: `${month}-01`,
      });
      changed = true;
      month = this.nextMonth(month);
    }

    if (changed) {
      await balance.save();
    }
  }

  private recomputeAvailable(balance: LeaveBalanceDocument): number {
    return round2(
      balance.initialBalance +
        balance.accruedDays -
        balance.consumedDays -
        balance.pendingDays,
    );
  }

  private assertValidRequest(dto: CreateLeaveRequestDto): void {
    if (dto.endDate < dto.startDate) {
      throw new BadRequestException(
        'La date de fin doit être postérieure ou égale à la date de début',
      );
    }
  }

  private computeDurationDays(
    startDate: string,
    endDate: string,
    startDurationType: LeaveDurationType = LeaveDurationType.FULL_DAY,
    endDurationType: LeaveDurationType = LeaveDurationType.FULL_DAY,
  ): number {
    // Si startDate = endDate, on ne compte qu'une seule demi-journée ou journée complète
    if (startDate === endDate) {
      // Si l'une des deux est une demi-journée, c'est 0.5 jour
      if (
        startDurationType === LeaveDurationType.HALF_DAY_MORNING ||
        startDurationType === LeaveDurationType.HALF_DAY_AFTERNOON ||
        endDurationType === LeaveDurationType.HALF_DAY_MORNING ||
        endDurationType === LeaveDurationType.HALF_DAY_AFTERNOON
      ) {
        return 0.5;
      }
      // Sinon c'est une journée complète
      return 1;
    }

    // Période multi-jours
    let total = 0;

    // Jour de début (vérifier si c'est un week-end)
    const startDay = this.getDayOfWeek(startDate);
    if (startDay === 0 || startDay === 6) {
      // Week-end, pas de congé compté pour le début
      // Mais on compte les jours intermédiaires normalement
    } else if (
      startDurationType === LeaveDurationType.HALF_DAY_MORNING ||
      startDurationType === LeaveDurationType.HALF_DAY_AFTERNOON
    ) {
      total += 0.5;
    } else {
      total += 1;
    }

    // Jour de fin (vérifier si c'est un week-end)
    const endDay = this.getDayOfWeek(endDate);
    if (endDay === 0 || endDay === 6) {
      // Week-end, pas de congé compté pour la fin
    } else if (
      endDurationType === LeaveDurationType.HALF_DAY_MORNING ||
      endDurationType === LeaveDurationType.HALF_DAY_AFTERNOON
    ) {
      total += 0.5;
    } else {
      total += 1;
    }

    // Jours intermédiaires (exclusifs)
    if (this.isDateAfter(startDate, endDate)) {
      // startDate < endDate, on compte les jours entre exclusifs
      total += this.countBusinessDaysExclusive(startDate, endDate);
    }

    if (total === 0) {
      throw new BadRequestException('Aucun jour ouvré dans cette période');
    }

    return total;
  }

  private isDateAfter(date1: string, date2: string): boolean {
    const d1 = new Date(date1);
    const d2 = new Date(date2);
    return d1 < d2;
  }

  private getDayOfWeek(dateStr: string): number {
    const date = new Date(`${dateStr}T00:00:00.000Z`);
    return date.getUTCDay();
  }

  private countBusinessDaysExclusive(start: string, end: string): number {
    // Compte les jours ouvrés entre start (exclusif) et end (exclusif)
    let count = 0;
    const current = new Date(`${start}T00:00:00.000Z`);
    current.setUTCDate(current.getUTCDate() + 1); // Commencer au jour après start
    const last = new Date(`${end}T00:00:00.000Z`);
    last.setUTCDate(last.getUTCDate() - 1); // Finir au jour avant end

    while (current <= last) {
      const day = current.getUTCDay();
      if (day !== 0 && day !== 6) {
        count++;
      }
      current.setUTCDate(current.getUTCDate() + 1);
    }

    return count;
  }

  private countBusinessDays(start: string, end: string): number {
    let count = 0;
    const current = new Date(`${start}T00:00:00.000Z`);
    const last = new Date(`${end}T00:00:00.000Z`);

    while (current <= last) {
      const day = current.getUTCDay();
      if (day !== 0 && day !== 6) {
        count++;
      }
      current.setUTCDate(current.getUTCDate() + 1);
    }

    if (count === 0) {
      throw new BadRequestException('Aucun jour ouvré dans cette période');
    }

    return count;
  }

  private async findById(id: string): Promise<LeaveRequestDocument> {
    if (!isValidObjectId(id)) {
      throw new NotFoundException('Demande de congé introuvable');
    }

    const request = await this.requestModel.findOne({ _id: id });
    if (!request) {
      throw new NotFoundException('Demande de congé introuvable');
    }

    return request;
  }

  private currentMonth(): string {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  }

  private nextMonth(month: string): string {
    const [year, monthNumber] = month.split('-').map(Number);
    const date = new Date(Date.UTC(year, monthNumber, 1));
    return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, '0')}`;
  }

  private today(): string {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }
}
