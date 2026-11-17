import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { FilterQuery, Model, Types } from 'mongoose';
import { ContributionsService } from './contributions.service';
import { CashDirection } from '../common/enums/cash-direction.enum';
import { CashTransactionType } from '../common/enums/cash-transaction-type.enum';
import { ContributionMemberStatus } from '../common/enums/contribution-member-status.enum';
import { NotificationEvent } from '../common/enums/notification-event.enum';
import { AuthUser } from '../common/interfaces/auth-user.interface';
import { CASH_MANAGER_EMAIL } from '../config/constants';
import { PageResult } from './cash-ledger.service';
import { CashLedgerService } from './cash-ledger.service';
import { CreateExpenseDto } from './dto/create-expense.dto';
import { ExpenseQueryDto } from './dto/query.dto';
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

@Injectable()
export class ExpensesService {
  constructor(
    @InjectModel(Expense.name)
    private readonly expenseModel: Model<ExpenseDocument>,
    @InjectModel(ExpenseCategory.name)
    private readonly categoryModel: Model<ExpenseCategoryDocument>,
    @InjectModel(ContributionMember.name)
    private readonly memberModel: Model<ContributionMemberDocument>,
    private readonly ledger: CashLedgerService,
    private readonly notifications: NotificationsService,
    private readonly contributionsService: ContributionsService,
  ) {}

  async list(query: ExpenseQueryDto): Promise<PageResult<ExpenseDocument>> {
    const filter: FilterQuery<Expense> = {};
    if (query.category) filter.category = query.category.toUpperCase();
    if (query.startDate || query.endDate) {
      filter.expenseDate = {};
      if (query.startDate) {
        (filter.expenseDate as Record<string, Date>).$gte = new Date(
          `${query.startDate}T00:00:00.000Z`,
        );
      }
      if (query.endDate) {
        (filter.expenseDate as Record<string, Date>).$lte = new Date(
          `${query.endDate}T23:59:59.999Z`,
        );
      }
    }

    const total = await this.expenseModel.countDocuments(filter).exec();
    const items = await this.expenseModel
      .find(filter)
      .sort({ expenseDate: -1, createdAt: -1 })
      .skip((query.page - 1) * query.limit)
      .limit(query.limit)
      .exec();
    return {
      items,
      total,
      page: query.page,
      limit: query.limit,
      totalPages: Math.max(1, Math.ceil(total / query.limit)),
    };
  }

  async create(dto: CreateExpenseDto, user: AuthUser): Promise<ExpenseDocument> {
    await this.contributionsService.assertValidator(user);

    const categoryName = dto.category.toUpperCase().trim();
    const category = await this.categoryModel
      .findOne({ name: categoryName, isActive: true })
      .exec();
    if (!category) {
      throw new BadRequestException('Catégorie de dépense inconnue ou inactive');
    }

    const manager = await this.memberModel
      .findOne({ email: CASH_MANAGER_EMAIL, status: ContributionMemberStatus.ACTIVE })
      .exec();
    if (!manager) {
      throw new NotFoundException('Responsable de la caisse introuvable');
    }

    const authorName = `${user.firstName} ${user.lastName}`.trim();
    const expenseDate = new Date(`${dto.expenseDate}T00:00:00.000Z`);
    const result = await this.ledger.runInTransaction(async (session) => {
      const balance = await this.ledger.getBalance(session);
      if (dto.amount > balance) {
        throw new BadRequestException(
          `Solde insuffisant : ${new Intl.NumberFormat('fr-FR').format(balance)} Ar disponibles`,
        );
      }
      const balanceAfter = balance - dto.amount;

      const [expense] = await this.expenseModel.create(
        [
          {
            description: dto.description.trim(),
            category: categoryName,
            amount: dto.amount,
            expenseDate,
            notes: dto.notes,
            createdBy: new Types.ObjectId(user.id),
            createdByName: authorName,
            balanceAfter,
          } as Expense,
        ],
        { session },
      );

      await this.ledger.createEntry(
        {
          type: CashTransactionType.DEPENSE,
          direction: CashDirection.OUT,
          amount: dto.amount,
          description: `Dépense — ${dto.description.trim()}`,
          createdBy: new Types.ObjectId(user.id),
          createdByName: authorName,
          expenseId: expense._id,
          balanceAfter,
        },
        session,
      );

      const email = this.notifications.buildExpenseEmail(
        dto.description.trim(),
        category.label,
        dto.amount,
        balanceAfter,
        dto.expenseDate,
        manager.name,
        authorName,
      );
      const log = await this.notifications.enqueue(
        {
          eventType: NotificationEvent.DEPENSE_ENREGISTREE,
          referenceId: expense._id.toString(),
          primaryTo: manager.email,
          subject: email.subject,
          html: email.html,
          createdBy: new Types.ObjectId(user.id),
        },
        session,
      );

      return { expense, logId: log._id.toString() };
    });

    await this.notifications.dispatch(result.logId);
    return result.expense;
  }
}
