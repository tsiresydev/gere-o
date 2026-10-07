import { Types } from 'mongoose';
import { LeaveTransactionType } from '../../src/common/enums/leave-transaction-type.enum';

type Query = Record<string, unknown>;

export interface LeaveBalanceRecord {
  _id: string;
  userId: string;
  initialBalance: number;
  accruedDays: number;
  consumedDays: number;
  pendingDays: number;
  availableDays: number;
  lastAccrualMonth: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface LeaveRequestRecord {
  _id: string;
  userId: string;
  leaveType: string;
  reason: string;
  startDate: string;
  endDate: string;
  durationType: string;
  durationDays: number;
  status: string;
  comment?: string;
  decidedBy?: unknown;
  decidedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

export interface LeaveTransactionRecord {
  _id: string;
  userId: string;
  type: LeaveTransactionType;
  amount: number;
  reason?: string;
  referenceId?: string;
  date: string;
  createdAt: Date;
}

export type FakeLeaveDoc<T> = T & { save(): Promise<FakeLeaveDoc<T>> };

export interface FakeLeaveSelection extends PromiseLike<LeaveRequestRecord[]> {
  sort(order: Record<string, 1 | -1>): FakeLeaveSelection;
}

export interface FakeLeavesModels {
  balances: LeaveBalanceRecord[];
  requests: LeaveRequestRecord[];
  transactions: LeaveTransactionRecord[];
  balanceDoc(userId: string): LeaveBalanceRecord | undefined;
  createBalance(input: Record<string, unknown>): Promise<FakeLeaveDoc<LeaveBalanceRecord>>;
  findBalance(query: Query): Promise<FakeLeaveDoc<LeaveBalanceRecord> | null>;
  createRequest(input: Record<string, unknown>): Promise<FakeLeaveDoc<LeaveRequestRecord>>;
  findRequests(query: Query): FakeLeaveSelection;
  countRequests(query: Query): Promise<number>;
  findOneRequest(query: Query): Promise<FakeLeaveDoc<LeaveRequestRecord> | null>;
  updateRequest(id: string, patch: Record<string, unknown>): Promise<FakeLeaveDoc<LeaveRequestRecord> | null>;
  createTransaction(input: Record<string, unknown>): Promise<FakeLeaveDoc<LeaveTransactionRecord>>;
}

const asRecord = (value: object): Record<string, unknown> =>
  value as Record<string, unknown>;

const matches = (record: object, query: Query): boolean =>
  Object.entries(query).every(([field, value]) => {
    const current = asRecord(record)[field];
    if (field === 'userId' || field === '_id' || field === 'referenceId') {
      return current === String(value);
    }
    return current === value;
  });

export function createFakeLeavesModels(): FakeLeavesModels {
  const balances: LeaveBalanceRecord[] = [];
  const requests: LeaveRequestRecord[] = [];
  const transactions: LeaveTransactionRecord[] = [];

  const withSave = <T extends { _id: string }>(record: T): FakeLeaveDoc<T> => {
    const doc = { ...record } as FakeLeaveDoc<T>;
    doc.save = async () => {
      if ('lastAccrualMonth' in record) {
        const index = balances.findIndex((item) => item._id === record._id);
        if (index !== -1) {
          balances[index] = { ...(doc as unknown as LeaveBalanceRecord) };
        }
      }
      if ('durationDays' in record) {
        const index = requests.findIndex((item) => item._id === record._id);
        if (index !== -1) {
          requests[index] = { ...(doc as unknown as LeaveRequestRecord) };
        }
      }
      return doc;
    };
    return doc;
  };

  const createBalance = async (
    input: Record<string, unknown>,
  ): Promise<FakeLeaveDoc<LeaveBalanceRecord>> => {
    const now = new Date();
    const record: LeaveBalanceRecord = {
      _id: new Types.ObjectId().toString(),
      userId: String(input.userId),
      initialBalance: (input.initialBalance as number) ?? 0,
      accruedDays: (input.accruedDays as number) ?? 0,
      consumedDays: (input.consumedDays as number) ?? 0,
      pendingDays: (input.pendingDays as number) ?? 0,
      availableDays: (input.availableDays as number) ?? 0,
      lastAccrualMonth: String(input.lastAccrualMonth),
      createdAt: now,
      updatedAt: now,
    };
    balances.push(record);
    return withSave(record);
  };

  const findBalance = async (
    query: Query,
  ): Promise<FakeLeaveDoc<LeaveBalanceRecord> | null> => {
    const record = balances.find((item) => matches(item, query));
    return record ? withSave(record) : null;
  };

  const createRequest = async (
    input: Record<string, unknown>,
  ): Promise<FakeLeaveDoc<LeaveRequestRecord>> => {
    const now = new Date();
    const record: LeaveRequestRecord = {
      _id: new Types.ObjectId().toString(),
      userId: String(input.userId),
      leaveType: String(input.leaveType),
      reason: String(input.reason),
      startDate: String(input.startDate),
      endDate: String(input.endDate),
      durationType: String(input.durationType),
      durationDays: Number(input.durationDays),
      status: String(input.status),
      comment: input.comment === undefined ? undefined : String(input.comment),
      decidedBy: input.decidedBy,
      decidedAt:
        input.decidedAt === undefined
          ? undefined
          : new Date(input.decidedAt as string | number | Date),
      createdAt: now,
      updatedAt: now,
    };
    requests.push(record);
    return withSave(record);
  };

  const countRequests = async (query: Query): Promise<number> =>
    requests.filter((item) => matches(item, query)).length;

  const findOneRequest = async (
    query: Query,
  ): Promise<FakeLeaveDoc<LeaveRequestRecord> | null> => {
    const record = requests.find((item) => matches(item, query));
    return record ? withSave(record) : null;
  };

  const findRequests = (query: Query): FakeLeaveSelection => {
    const filtered = [...requests]
      .filter((item) => matches(item, query))
      .sort((a, b) => (a.createdAt < b.createdAt ? 1 : a.createdAt > b.createdAt ? -1 : 0));

    return {
      sort: () => findRequests(query),
      then: <TResult1 = LeaveRequestRecord[], TResult2 = never>(
        onfulfilled?:
          | ((value: LeaveRequestRecord[]) => TResult1 | PromiseLike<TResult1>)
          | null,
        onrejected?: ((reason: unknown) => TResult2 | PromiseLike<TResult2>) | null,
      ): PromiseLike<TResult1 | TResult2> =>
        Promise.resolve(filtered).then(onfulfilled, onrejected),
    };
  };

  const updateRequest = async (
    id: string,
    patch: Record<string, unknown>,
  ): Promise<FakeLeaveDoc<LeaveRequestRecord> | null> => {
    const record = requests.find((item) => item._id === id);
    if (!record) {
      return null;
    }
    Object.assign(record, patch, { updatedAt: new Date() });
    return withSave(record);
  };

  const createTransaction = async (
    input: Record<string, unknown>,
  ): Promise<FakeLeaveDoc<LeaveTransactionRecord>> => {
    const record: LeaveTransactionRecord = {
      _id: new Types.ObjectId().toString(),
      userId: String(input.userId),
      type: input.type as LeaveTransactionType,
      amount: Number(input.amount),
      reason: input.reason === undefined ? undefined : String(input.reason),
      referenceId:
        input.referenceId === undefined ? undefined : String(input.referenceId),
      date: String(input.date),
      createdAt: new Date(),
    };
    transactions.push(record);
    return withSave(record);
  };

  return {
    balances,
    requests,
    transactions,
    balanceDoc: (userId: string) =>
      balances.find((item) => item.userId === userId),
    createBalance,
    findBalance,
    createRequest,
    findRequests,
    countRequests,
    findOneRequest,
    updateRequest,
    createTransaction,
  };
}