import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { FilterQuery, Model, Types } from 'mongoose';
import { CashDirection } from '../common/enums/cash-direction.enum';
import { CashTransactionType } from '../common/enums/cash-transaction-type.enum';
import { ContributionMemberStatus } from '../common/enums/contribution-member-status.enum';
import { ContributionStatus } from '../common/enums/contribution-status.enum';
import { NotificationEvent } from '../common/enums/notification-event.enum';
import { AuthUser } from '../common/interfaces/auth-user.interface';
import {
  CONTRIBUTION_MONTHLY_AMOUNT,
  CONTRIBUTION_START_YEAR,
  FRENCH_MONTHS,
  INITIAL_CONTRIBUTION_MEMBERS,
} from '../config/constants';
import { CashLedgerService, PageResult } from './cash-ledger.service';
import { ContributionQueryDto } from './dto/contribution-query.dto';
import { DeclareContributionDto } from './dto/declare-contribution.dto';
import { DecideContributionDto } from './dto/decide-contribution.dto';
import {
  CreateContributionMemberDto,
  CreateExpenseCategoryDto,
  UpdateContributionMemberDto,
  UpdateExpenseCategoryDto,
} from './dto/member-and-category.dto';
import {
  Contribution,
  ContributionDocument,
} from './entities/contribution.schema';
import {
  ContributionMember,
  ContributionMemberDocument,
} from './entities/contribution-member.schema';
import { Expense, ExpenseDocument } from './entities/expense.schema';
import {
  ExpenseCategory,
  ExpenseCategoryDocument,
} from './entities/expense-category.schema';
import { NotificationsService } from './notifications.service';

export interface ContributionRow {
  id: string;
  memberId: string;
  memberName: string;
  memberEmail: string;
  periodMonth: number;
  periodYear: number;
  monthLabel: string;
  expectedAmount: number;
  declaredAmount: number;
  status: ContributionStatus;
  paymentDate?: string;
  paymentMethod?: string;
  declaredAt?: string;
  validatedAt?: string;
  validatedBy?: string;
  rejectedAt?: string;
  rejectionReason?: string;
  notes?: string;
  declarationGroupId?: string;
  isSynthetic: boolean;
}

export interface MemberRow {
  id: string;
  userId?: string;
  name: string;
  email: string;
  status: ContributionMemberStatus;
  canValidate: boolean;
  joinedAt: string;
  deactivatedAt?: string;
  validatedMonths: number;
  pendingMonths: number;
  lateMonths: number;
}

export interface OverviewResponse {
  balance: number;
  totalCollected: number;
  totalExpenses: number;
  totalExpected: number;
  pendingCount: number;
  upToDateMembers: number;
  lateMembers: number;
  activeMembers: number;
  monthly: Array<{
    year: number;
    month: number;
    label: string;
    contributions: number;
    expenses: number;
  }>;
  categories: Array<{ category: string; amount: number }>;
}

interface Period {
  year: number;
  month: number;
}

const keyOf = (memberId: Types.ObjectId | string, period: Period): string =>
  `${memberId.toString()}:${period.year}-${period.month}`;

const isoDate = (value?: Date): string | undefined =>
  value ? value.toISOString().slice(0, 10) : undefined;

const isDuplicateKeyError = (error: unknown): boolean =>
  typeof error === 'object' &&
  error !== null &&
  (error as { code?: number }).code === 11000;

const STATUS_PRIORITY: Record<ContributionStatus, number> = {
  [ContributionStatus.VALIDE]: 4,
  [ContributionStatus.EN_ATTENTE_DE_VALIDATION]: 3,
  [ContributionStatus.REFUSE]: 2,
  [ContributionStatus.EN_RETARD]: 1,
  [ContributionStatus.NON_PAYE]: 1,
};

@Injectable()
export class ContributionsService {
  constructor(
    @InjectModel(ContributionMember.name)
    private readonly memberModel: Model<ContributionMemberDocument>,
    @InjectModel(Contribution.name)
    private readonly contributionModel: Model<ContributionDocument>,
    @InjectModel(Expense.name)
    private readonly expenseModel: Model<ExpenseDocument>,
    @InjectModel(ExpenseCategory.name)
    private readonly categoryModel: Model<ExpenseCategoryDocument>,
    private readonly ledger: CashLedgerService,
    private readonly notifications: NotificationsService,
  ) {}

  private fullName(user: AuthUser): string {
    return `${user.firstName} ${user.lastName}`.trim();
  }

  async isValidator(user: AuthUser): Promise<boolean> {
    const member = await this.memberModel
      .findOne({
        status: ContributionMemberStatus.ACTIVE,
        canValidate: true,
        $or: [
          { userId: new Types.ObjectId(user.id) },
          { email: user.email.toLowerCase() },
        ],
      })
      .exec();
    return Boolean(member);
  }

  async assertValidator(user: AuthUser): Promise<void> {
    if (!(await this.isValidator(user))) {
      throw new ForbiddenException(
        'Cette action est réservée aux responsables de la caisse (Tsiresy ou Mahefa)',
      );
    }
  }

  private async resolveMember(
    memberId: string | undefined,
    user: AuthUser,
  ): Promise<ContributionMemberDocument> {
    if (memberId) {
      await this.assertValidator(user);
      const member = await this.memberModel.findById(memberId).exec();
      if (!member) {
        throw new NotFoundException('Membre introuvable');
      }
      if (member.status !== ContributionMemberStatus.ACTIVE) {
        throw new BadRequestException('Ce membre est désactivé');
      }
      return member;
    }

    const member = await this.memberModel
      .findOne({
        status: ContributionMemberStatus.ACTIVE,
        $or: [
          { userId: new Types.ObjectId(user.id) },
          { email: user.email.toLowerCase() },
        ],
      })
      .exec();
    if (!member) {
      throw new ForbiddenException(
        "Votre compte n'est associé à aucun membre de la caisse",
      );
    }
    return member;
  }

  private periods(query: { year?: number; month?: number }): Period[] {
    const now = new Date();
    const currentYear = now.getUTCFullYear();
    const currentMonth = now.getUTCMonth() + 1;

    if (query.year) {
      const months = query.month
        ? [query.month]
        : Array.from({ length: 12 }, (_, index) => index + 1);
      return months.map((month) => ({ year: query.year as number, month }));
    }
    if (query.month) {
      return [{ year: currentYear, month: query.month }];
    }

    const result: Period[] = [];
    for (let year = CONTRIBUTION_START_YEAR; year <= currentYear; year += 1) {
      const lastMonth = year === currentYear ? currentMonth : 12;
      for (let month = 1; month <= lastMonth; month += 1) {
        result.push({ year, month });
      }
    }
    return result;
  }

  private async buildRows(
    members: ContributionMemberDocument[],
    periods: Period[],
  ): Promise<ContributionRow[]> {
    if (members.length === 0 || periods.length === 0) return [];

    const years = [...new Set(periods.map((period) => period.year))];
    const months = [...new Set(periods.map((period) => period.month))];
    const contributions = await this.contributionModel
      .find({
        memberId: { $in: members.map((member) => member._id) },
        periodYear: { $in: years },
        periodMonth: { $in: months },
      })
      .exec();

    const byKey = new Map<string, ContributionDocument>();
    for (const contribution of contributions) {
      const key = keyOf(contribution.memberId, {
        year: contribution.periodYear,
        month: contribution.periodMonth,
      });
      const existing = byKey.get(key);
      if (
        !existing ||
        STATUS_PRIORITY[contribution.status] > STATUS_PRIORITY[existing.status]
      ) {
        byKey.set(key, contribution);
      }
    }

    const now = new Date();
    const currentPeriodStart = new Date(
      Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1),
    );

    const rows: ContributionRow[] = [];
    for (const member of members) {
      for (const period of periods) {
        const key = keyOf(member._id, period);
        const contribution = byKey.get(key);
        const periodStart = new Date(Date.UTC(period.year, period.month - 1, 1));
        const status =
          contribution?.status ??
          (periodStart < currentPeriodStart
            ? ContributionStatus.EN_RETARD
            : ContributionStatus.NON_PAYE);

        rows.push({
          id: contribution?._id.toString() ?? key,
          memberId: member._id.toString(),
          memberName: member.name,
          memberEmail: member.email,
          periodMonth: period.month,
          periodYear: period.year,
          monthLabel: `${FRENCH_MONTHS[period.month - 1]} ${period.year}`,
          expectedAmount: CONTRIBUTION_MONTHLY_AMOUNT,
          declaredAmount: contribution?.declaredAmount ?? 0,
          status,
          paymentDate: isoDate(contribution?.paymentDate),
          paymentMethod: contribution?.paymentMethod,
          declaredAt: isoDate(contribution?.declaredAt),
          validatedAt: isoDate(contribution?.validatedAt),
          validatedBy: contribution?.validatedBy?.toString(),
          rejectedAt: isoDate(contribution?.rejectedAt),
          rejectionReason: contribution?.rejectionReason,
          notes: contribution?.notes,
          declarationGroupId: contribution?.declarationGroupId,
          isSynthetic: !contribution,
        });
      }
    }
    return rows;
  }

  async listMembers(): Promise<MemberRow[]> {
    const members = await this.memberModel.find().sort({ name: 1 }).exec();
    const now = new Date();
    const nowYear = now.getUTCFullYear();
    const nowMonth = now.getUTCMonth() + 1;
    const pastPeriods: Period[] = [];
    for (let year = CONTRIBUTION_START_YEAR; year <= nowYear; year += 1) {
      const last = year === nowYear ? nowMonth - 1 : 12;
      for (let month = 1; month <= last; month += 1) {
        pastPeriods.push({ year, month });
      }
    }

    const contributions = await this.contributionModel
      .find({ periodYear: { $gte: CONTRIBUTION_START_YEAR } })
      .exec();
    const declaredKeys = new Set(
      contributions
        .filter((item) => item.status !== ContributionStatus.REFUSE)
        .map((item) =>
          keyOf(item.memberId, { year: item.periodYear, month: item.periodMonth }),
        ),
    );

    return members.map((member) => {
      const memberContributions = contributions.filter(
        (item) => item.memberId.toString() === member._id.toString(),
      );
      const lateMonths = pastPeriods.filter(
        (period) => !declaredKeys.has(keyOf(member._id, period)),
      ).length;
      return {
        id: member._id.toString(),
        userId: member.userId?.toString(),
        name: member.name,
        email: member.email,
        status: member.status,
        canValidate: member.canValidate,
        joinedAt: isoDate(member.joinedAt) ?? '',
        deactivatedAt: isoDate(member.deactivatedAt),
        validatedMonths: memberContributions.filter(
          (item) => item.status === ContributionStatus.VALIDE,
        ).length,
        pendingMonths: memberContributions.filter(
          (item) => item.status === ContributionStatus.EN_ATTENTE_DE_VALIDATION,
        ).length,
        lateMonths,
      };
    });
  }

  async createMember(dto: CreateContributionMemberDto): Promise<MemberRow> {
    try {
      const member = await this.memberModel.create({
        name: dto.name,
        email: dto.email.toLowerCase(),
        status: ContributionMemberStatus.ACTIVE,
        canValidate: dto.canValidate ?? false,
        joinedAt: new Date(),
      });
      const rows = await this.listMembers();
      return rows.find((row) => row.id === member._id.toString()) as MemberRow;
    } catch (error) {
      if (isDuplicateKeyError(error)) {
        throw new ConflictException('Ce membre existe déjà');
      }
      throw error;
    }
  }

  async updateMember(
    id: string,
    dto: UpdateContributionMemberDto,
  ): Promise<MemberRow> {
    const existing = await this.memberModel.findById(id).exec();
    if (!existing) throw new NotFoundException('Membre introuvable');
    const set: Record<string, unknown> = {};
    const unset: Record<string, unknown> = {};
    if (dto.name !== undefined) {
      const name = dto.name.trim();
      if (name.length < 2) throw new BadRequestException('Nom invalide');
      set.name = name;
    }
    if (dto.email !== undefined && dto.email.toLowerCase().trim() !== existing.email) {
      set.email = dto.email.toLowerCase().trim();
      unset.userId = 1;
      if (!existing.seedKey && INITIAL_CONTRIBUTION_MEMBERS.some((item) => item.email === existing.email)) {
        set.seedKey = existing.email;
      }
    }
    if (dto.status) set.status = dto.status;
    if (dto.canValidate !== undefined) set.canValidate = dto.canValidate;
    if (dto.status === ContributionMemberStatus.INACTIVE) {
      set.deactivatedAt = new Date();
    }
    if (dto.status === ContributionMemberStatus.ACTIVE) {
      unset.deactivatedAt = 1;
    }

    let member: ContributionMemberDocument | null;
    try {
      member = await this.memberModel
      .findByIdAndUpdate(
        id,
        {
          $set: set,
          ...(Object.keys(unset).length ? { $unset: unset } : {}),
        },
        { new: true },
      )
        .exec();
    } catch (error) {
      if (isDuplicateKeyError(error)) throw new ConflictException('Ce membre existe déjà');
      throw error;
    }
    if (!member) throw new NotFoundException('Membre introuvable');
    const rows = await this.listMembers();
    return rows.find((row) => row.id === member._id.toString()) as MemberRow;
  }

  async listCategories(): Promise<ExpenseCategoryDocument[]> {
    return this.categoryModel.find().sort({ label: 1 }).exec();
  }

  async createCategory(
    dto: CreateExpenseCategoryDto,
  ): Promise<ExpenseCategoryDocument> {
    try {
      return await this.categoryModel.create({
        name: dto.name.toUpperCase().trim(),
        label: dto.label.trim(),
        isActive: true,
      });
    } catch (error) {
      if (isDuplicateKeyError(error)) {
        throw new ConflictException('Cette catégorie existe déjà');
      }
      throw error;
    }
  }

  async updateCategory(
    id: string,
    dto: UpdateExpenseCategoryDto,
  ): Promise<ExpenseCategoryDocument> {
    const set: Record<string, unknown> = {};
    if (dto.isActive !== undefined) set.isActive = dto.isActive;
    if (dto.label) set.label = dto.label;
    const category = await this.categoryModel
      .findByIdAndUpdate(id, { $set: set }, { new: true })
      .exec();
    if (!category) throw new NotFoundException('Catégorie introuvable');
    return category;
  }

  async declare(
    dto: DeclareContributionDto,
    user: AuthUser,
  ): Promise<{ items: ContributionRow[]; groupId: string }> {
    if (user.email.toLowerCase() !== 'tsiresy.madasoftware@gmail.com') {
      throw new ForbiddenException('La saisie des cotisations est réservée à Tsiresy');
    }
    await this.assertValidator(user);
    const member = await this.resolveMember(dto.memberId, user);
    const months = [...new Set(dto.months)].sort((a, b) => a - b);
    const uniqueKeys = months.map((month) =>
      keyOf(member._id, { year: dto.year, month }),
    );
    const existing = await this.contributionModel
      .find({ uniqueKey: { $in: uniqueKeys } })
      .exec();
    if (existing.length > 0) {
      const periods = existing
        .map(
          (item) => `${FRENCH_MONTHS[item.periodMonth - 1]} ${item.periodYear}`,
        )
        .join(', ');
      throw new ConflictException(`Cotisation déjà déclarée pour : ${periods}`);
    }

    const groupId = new Types.ObjectId().toString();
    const paymentDate = new Date(`${dto.paymentDate}T00:00:00.000Z`);
    const declaredAt = new Date();
    const docs = months.map(
      (month) =>
        ({
          memberId: member._id,
          periodMonth: month,
          periodYear: dto.year,
          expectedAmount: CONTRIBUTION_MONTHLY_AMOUNT,
          declaredAmount: CONTRIBUTION_MONTHLY_AMOUNT,
          paymentDate,
          paymentMethod: dto.paymentMethod,
          status: ContributionStatus.EN_ATTENTE_DE_VALIDATION,
          uniqueKey: keyOf(member._id, { year: dto.year, month }),
          declaredBy: new Types.ObjectId(user.id),
          declaredAt,
          declarationGroupId: groupId,
          notes: dto.notes,
        }) as Contribution,
    );

    let created: ContributionDocument[];
    try {
      created = await this.ledger.runInRequiredTransaction((session) =>
        this.contributionModel.create(docs, { session, ordered: true }),
      );
    } catch (error) {
      if (isDuplicateKeyError(error)) {
        throw new ConflictException(
          'Une cotisation a déjà été déclarée pour l une de ces périodes',
        );
      }
      throw error;
    }

    return {
      items: created.map((item) => this.toRow(item)),
      groupId,
    };
  }

  private toRow(item: ContributionDocument): ContributionRow {
    return {
      id: item._id.toString(),
      memberId: item.memberId.toString(),
      memberName: '',
      memberEmail: '',
      periodMonth: item.periodMonth,
      periodYear: item.periodYear,
      monthLabel: `${FRENCH_MONTHS[item.periodMonth - 1]} ${item.periodYear}`,
      expectedAmount: item.expectedAmount,
      declaredAmount: item.declaredAmount,
      status: item.status,
      paymentDate: isoDate(item.paymentDate),
      paymentMethod: item.paymentMethod,
      declaredAt: isoDate(item.declaredAt),
      validatedAt: isoDate(item.validatedAt),
      validatedBy: item.validatedBy?.toString(),
      rejectionReason: item.rejectionReason,
      notes: item.notes,
      declarationGroupId: item.declarationGroupId,
      isSynthetic: false,
    };
  }

  async listContributions(
    query: ContributionQueryDto,
  ): Promise<PageResult<ContributionRow>> {
    const memberFilter: FilterQuery<ContributionMember> = query.memberId
      ? { _id: new Types.ObjectId(query.memberId) }
      : {};
    const members = await this.memberModel.find(memberFilter).exec();
    const periods = this.periods(query);
    let rows = await this.buildRows(members, periods);

    if (query.status) {
      rows = rows.filter((row) => row.status === query.status);
    }
    if (query.search) {
      const search = query.search.toLowerCase();
      rows = rows.filter(
        (row) =>
          row.memberName.toLowerCase().includes(search) ||
          row.memberEmail.toLowerCase().includes(search) ||
          row.monthLabel.toLowerCase().includes(search),
      );
    }

    rows.sort((a, b) => {
      if (a.periodYear !== b.periodYear) return b.periodYear - a.periodYear;
      if (a.periodMonth !== b.periodMonth) return b.periodMonth - a.periodMonth;
      return a.memberName.localeCompare(b.memberName, 'fr');
    });

    const total = rows.length;
    const start = (query.page - 1) * query.limit;
    return {
      items: rows.slice(start, start + query.limit),
      total,
      page: query.page,
      limit: query.limit,
      totalPages: Math.max(1, Math.ceil(total / query.limit)),
    };
  }

  async getMine(
    user: AuthUser,
    query: ContributionQueryDto,
  ): Promise<PageResult<ContributionRow>> {
    const member = await this.resolveMember(undefined, user);
    return this.listContributions({
      ...query,
      memberId: member._id.toString(),
    });
  }

  async listPendingDeclarations(user: AuthUser): Promise<ContributionRow[]> {
    await this.assertValidator(user);
    if (!['tsiresy.madasoftware@gmail.com', 'mahefa.madasoftware@gmail.com'].includes(user.email.toLowerCase())) throw new ForbiddenException('Accès réservé à Tsiresy ou Mahefa');
    const items = await this.contributionModel.find({ status: ContributionStatus.EN_ATTENTE_DE_VALIDATION }).exec();
    const members = await this.memberModel.find({ _id: { $in: items.map((item) => item.memberId) } }).exec();
    const byId = new Map(members.map((member) => [String(member._id), member]));
    return items.map((item) => ({ ...this.toRow(item), memberName: byId.get(String(item.memberId))?.name ?? 'Membre inconnu', memberEmail: byId.get(String(item.memberId))?.email ?? '' }));
  }

  async validate(id: string, user: AuthUser): Promise<ContributionRow> {
    await this.assertValidator(user);
    if (!['tsiresy.madasoftware@gmail.com', 'mahefa.madasoftware@gmail.com'].includes(user.email.toLowerCase())) throw new ForbiddenException('Validation réservée à Tsiresy ou Mahefa');
    const result = await this.ledger.runInRequiredTransaction(async (session) => {
      const current = await this.contributionModel.findById(id).session(session).exec();
      if (!current) throw new NotFoundException('Cotisation introuvable');
      if (current.status !== ContributionStatus.EN_ATTENTE_DE_VALIDATION) {
        throw new ConflictException('Cette déclaration ne peut plus être validée');
      }
      const items = await this.contributionModel.find({ declarationGroupId: current.declarationGroupId }).session(session).exec();
      if (!items.length || items.some((item) => item.status !== ContributionStatus.EN_ATTENTE_DE_VALIDATION)) {
        throw new ConflictException('Cette déclaration a déjà été traitée');
      }
      let balance = await this.ledger.getBalance(session);
      const validatedAt = new Date();
      let updated: ContributionDocument | null = null;
      for (const item of items) {
        const row = await this.contributionModel.findOneAndUpdate(
          { _id: item._id, status: ContributionStatus.EN_ATTENTE_DE_VALIDATION },
          { $set: { status: ContributionStatus.VALIDE, validatedBy: new Types.ObjectId(user.id), validatedAt, validatedAmount: item.declaredAmount } },
          { new: true, session },
        ).exec();
        if (!row) throw new ConflictException('Cette déclaration a déjà été traitée');
        if (String(item._id) === id) updated = row;
        balance += item.declaredAmount;
        await this.ledger.createEntry({
          type: CashTransactionType.CONTRIBUTION_VALIDEE, direction: CashDirection.IN,
          amount: item.declaredAmount,
          description: `Cotisation validée — ${FRENCH_MONTHS[item.periodMonth - 1]} ${item.periodYear}`,
          createdBy: new Types.ObjectId(user.id), createdByName: this.fullName(user),
          contributionId: item._id, balanceAfter: balance,
        }, session);
      }
      if (!updated) throw new ConflictException('Déclaration introuvable');
      const member = await this.memberModel.findById(current.memberId).session(session).exec();
      if (!member) throw new NotFoundException('Membre introuvable');
      const email = this.notifications.buildContributionEmail(member.name, items.map((item) => item.periodMonth), current.periodYear, items.reduce((sum, item) => sum + item.declaredAmount, 0), balance, this.fullName(user));
      const log = await this.notifications.enqueue({ eventType: NotificationEvent.CONTRIBUTION_DECLAREE, referenceId: current.declarationGroupId, primaryTo: member.email, subject: email.subject, html: email.html, createdBy: new Types.ObjectId(user.id) }, session);
      return { row: this.toRow(updated), logId: log._id.toString() };
    });
    // La transaction et le journal sont déjà enregistrés : SMTP ne doit pas bloquer la réponse.
    void this.notifications.dispatch(result.logId).catch(() => undefined);
    return result.row;
  }

  async reject(
    id: string,
    dto: DecideContributionDto,
    user: AuthUser,
  ): Promise<ContributionRow> {
    await this.assertValidator(user);
    if (!['tsiresy.madasoftware@gmail.com', 'mahefa.madasoftware@gmail.com'].includes(user.email.toLowerCase())) throw new ForbiddenException('Refus réservé à Tsiresy ou Mahefa');
    const reason = dto.reason?.trim();
    if (!reason) throw new BadRequestException('Le motif du refus est obligatoire');
    return this.ledger.runInRequiredTransaction(async (session) => {
      const current = await this.contributionModel.findById(id).session(session).exec();
      if (!current) throw new NotFoundException('Cotisation introuvable');
      const items = await this.contributionModel.find({ declarationGroupId: current.declarationGroupId }).session(session).exec();
      if (!items.length || items.some((item) => item.status !== ContributionStatus.EN_ATTENTE_DE_VALIDATION)) throw new ConflictException('Cette déclaration a déjà été traitée');
      let updated: ContributionDocument | null = null;
      const rejectedAt = new Date();
      for (const item of items) {
        const row = await this.contributionModel.findOneAndUpdate(
          { _id: item._id, status: ContributionStatus.EN_ATTENTE_DE_VALIDATION },
          { $set: { status: ContributionStatus.REFUSE, rejectedBy: new Types.ObjectId(user.id), rejectedAt, rejectionReason: reason }, $unset: { uniqueKey: 1 } },
          { new: true, session },
        ).exec();
        if (!row) throw new ConflictException('Cette déclaration a déjà été traitée');
        if (String(item._id) === id) updated = row;
      }
      if (!updated) throw new ConflictException('Déclaration introuvable');
      return this.toRow(updated);
    });
  }

  async getOverview(query: {
    year?: number;
    month?: number;
  }): Promise<OverviewResponse> {
    const periods = this.periods(query);
    const activeMembers = await this.memberModel
      .find({ status: ContributionMemberStatus.ACTIVE })
      .exec();
    const rows = await this.buildRows(activeMembers, periods);

    const first = periods[0];
    const last = periods[periods.length - 1];
    const start = new Date(Date.UTC(first.year, first.month - 1, 1));
    const end = new Date(Date.UTC(last.year, last.month, 0, 23, 59, 59, 999));
    const expenses = await this.expenseModel
      .find({ expenseDate: { $gte: start, $lte: end } })
      .exec();

    const monthly = periods.map((period) => ({
      year: period.year,
      month: period.month,
      label: FRENCH_MONTHS[period.month - 1].slice(0, 3),
      contributions: rows
        .filter(
          (row) =>
            row.periodYear === period.year &&
            row.periodMonth === period.month &&
            row.status === ContributionStatus.VALIDE,
        )
        .reduce((sum, row) => sum + row.declaredAmount, 0),
      expenses: expenses
        .filter(
          (expense) =>
            expense.expenseDate.getUTCFullYear() === period.year &&
            expense.expenseDate.getUTCMonth() + 1 === period.month,
        )
        .reduce((sum, expense) => sum + expense.amount, 0),
    }));

    const categoryMap = new Map<string, number>();
    for (const expense of expenses) {
      categoryMap.set(
        expense.category,
        (categoryMap.get(expense.category) ?? 0) + expense.amount,
      );
    }

    const now = new Date();
    const currentPeriodStart = new Date(
      Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1),
    );
    const lateMemberIds = new Set(
      rows
        .filter(
          (row) =>
            row.status === ContributionStatus.EN_RETARD &&
            new Date(Date.UTC(row.periodYear, row.periodMonth - 1, 1)) <
              currentPeriodStart,
        )
        .map((row) => row.memberId),
    );

    return {
      balance: await this.ledger.getBalance(),
      totalCollected: rows
        .filter((row) => row.status === ContributionStatus.VALIDE)
        .reduce((sum, row) => sum + row.declaredAmount, 0),
      totalExpenses: expenses.reduce((sum, expense) => sum + expense.amount, 0),
      totalExpected:
        activeMembers.length * periods.length * CONTRIBUTION_MONTHLY_AMOUNT,
      pendingCount: rows.filter(
        (row) => row.status === ContributionStatus.EN_ATTENTE_DE_VALIDATION,
      ).length,
      upToDateMembers: activeMembers.length - lateMemberIds.size,
      lateMembers: lateMemberIds.size,
      activeMembers: activeMembers.length,
      monthly,
      categories: [...categoryMap.entries()].map(([category, amount]) => ({
        category,
        amount,
      })),
    };
  }
}
