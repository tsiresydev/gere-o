import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectConnection, InjectModel } from '@nestjs/mongoose';
import { ClientSession, Connection, FilterQuery, Model, Types } from 'mongoose';
import { CashDirection } from '../common/enums/cash-direction.enum';
import { CashTransactionType } from '../common/enums/cash-transaction-type.enum';
import { AuthUser } from '../common/interfaces/auth-user.interface';
import { CreateCorrectionDto } from './dto/member-and-category.dto';
import { JournalQueryDto } from './dto/query.dto';
import {
  CashTransaction,
  CashTransactionDocument,
} from './entities/cash-transaction.schema';

export interface LedgerEntryInput {
  type: CashTransactionType;
  direction: CashDirection;
  amount: number;
  description: string;
  createdBy: Types.ObjectId | string;
  createdByName: string;
  contributionId?: Types.ObjectId | string;
  expenseId?: Types.ObjectId | string;
  correctionOf?: Types.ObjectId | string;
  balanceAfter: number;
}

export interface PageResult<T> {
  items: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

@Injectable()
export class CashLedgerService {
  private transactionSupported?: boolean;

  constructor(
    @InjectModel(CashTransaction.name)
    private readonly model: Model<CashTransactionDocument>,
    @InjectConnection() private readonly connection: Connection,
  ) {}

  /**
   * Utilise une transaction MongoDB quand le déploiement est un replica set.
   * Sur un MongoDB autonome, les écritures restent protégées par les index uniques
   * mais la transaction multi-documents n'est pas disponible.
   */
  async runInTransaction<T>(
    fn: (session?: ClientSession) => Promise<T>,
  ): Promise<T> {
    if (!(await this.supportsTransactions())) {
      return fn(undefined);
    }

    const session = await this.connection.startSession();
    try {
      let result: T | undefined;
      await session.withTransaction(async () => {
        result = await fn(session);
      });
      return result as T;
    } finally {
      await session.endSession();
    }
  }

  private async supportsTransactions(): Promise<boolean> {
    if (this.transactionSupported !== undefined) {
      return this.transactionSupported;
    }

    try {
      const db = this.connection.db;
      if (!db) {
        this.transactionSupported = false;
        return false;
      }
      const hello = await db.admin().command({ hello: 1 });
      this.transactionSupported = Boolean(hello.setName);
      return this.transactionSupported;
    } catch {
      this.transactionSupported = false;
      return false;
    }
  }

  async getBalance(session?: ClientSession): Promise<number> {
    const aggregate = this.model.aggregate<{ _id: string; total: number }>([
      {
        $group: {
          _id: '$direction',
          total: { $sum: '$amount' },
        },
      },
    ]);
    if (session) aggregate.session(session);

    const rows = await aggregate.exec();
    const incoming =
      rows.find((row) => row._id === CashDirection.IN)?.total ?? 0;
    const outgoing =
      rows.find((row) => row._id === CashDirection.OUT)?.total ?? 0;
    return incoming - outgoing;
  }

  async createEntry(
    input: LedgerEntryInput,
    session?: ClientSession,
  ): Promise<CashTransactionDocument> {
    const [created] = await this.model.create(
      [input as unknown as CashTransaction],
      { session },
    );
    return created;
  }

  async listJournal(query: JournalQueryDto): Promise<PageResult<CashTransactionDocument>> {
    const filter: FilterQuery<CashTransaction> = {};
    if (query.type) filter.type = query.type;
    if (query.startDate || query.endDate) {
      filter.createdAt = {};
      if (query.startDate) {
        (filter.createdAt as Record<string, Date>).$gte = new Date(
          `${query.startDate}T00:00:00.000Z`,
        );
      }
      if (query.endDate) {
        (filter.createdAt as Record<string, Date>).$lte = new Date(
          `${query.endDate}T23:59:59.999Z`,
        );
      }
    }
    if (query.search) {
      const escaped = query.search.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      filter.$or = [
        { description: { $regex: escaped, $options: 'i' } },
        { createdByName: { $regex: escaped, $options: 'i' } },
      ];
    }

    const all = await this.model.find(filter).sort({ createdAt: 1 }).exec();
    let running = 0;
    const withBalance = all.map((entry) => {
      running +=
        entry.direction === CashDirection.IN ? entry.amount : -entry.amount;
      return Object.assign(entry, { balanceAfter: running });
    });

    const total = withBalance.length;
    const start = (query.page - 1) * query.limit;
    const items = withBalance.reverse().slice(start, start + query.limit);

    return {
      items,
      total,
      page: query.page,
      limit: query.limit,
      totalPages: Math.max(1, Math.ceil(total / query.limit)),
    };
  }

  async correct(
    dto: CreateCorrectionDto,
    user: AuthUser,
  ): Promise<{ transaction: CashTransactionDocument; balance: number }> {
    return this.runInTransaction(async (session) => {
      const findQuery = this.model.findById(dto.transactionId);
      if (session) findQuery.session(session);
      const original = await findQuery.exec();
      if (!original) {
        throw new NotFoundException('Transaction introuvable');
      }

      const balance = await this.getBalance(session);
      if (dto.direction === CashDirection.OUT && dto.amount > balance) {
        throw new BadRequestException(
          `Correction impossible : le solde disponible est de ${balance} Ar`,
        );
      }

      const direction =
        dto.direction === CashDirection.IN
          ? CashDirection.IN
          : CashDirection.OUT;
      const balanceAfter =
        balance + (direction === CashDirection.IN ? dto.amount : -dto.amount);
      const createdByName = `${user.firstName} ${user.lastName}`.trim();

      const transaction = await this.createEntry(
        {
          type: CashTransactionType.CORRECTION,
          direction,
          amount: dto.amount,
          description: `${dto.reason} — correction de « ${original.description} »`,
          createdBy: new Types.ObjectId(user.id),
          createdByName,
          correctionOf: original._id,
          balanceAfter,
        },
        session,
      );

      return { transaction, balance: balanceAfter };
    });
  }
}
