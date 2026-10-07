import { Types } from 'mongoose';
import { WorkDayStatus } from '../../src/common/enums/work-day-status.enum';

export interface FakeWorkDayRecord {
  _id: string;
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
  createdAt: Date;
  updatedAt: Date;
}

type Query = Record<string, unknown>;

export interface FakeWorkDaySelection extends PromiseLike<FakeWorkDayRecord[]> {
  sort(order: Record<string, 1 | -1>): FakeWorkDaySelection;
  skip(offset: number): FakeWorkDaySelection;
  limit(amount: number): Promise<FakeWorkDayRecord[]>;
}

export interface FakeWorkDayModel {
  store: FakeWorkDayRecord[];
  create(input: Record<string, unknown>): Promise<FakeWorkDayRecord>;
  findOne(query: Query): Promise<FakeWorkDayRecord | null>;
  findById(id: string): Promise<FakeWorkDayRecord | null>;
  find(query: Query): FakeWorkDaySelection;
  countDocuments(query: Query): Promise<number>;
  findByIdAndUpdate(
    id: string,
    update: Record<string, unknown>,
    options: { new: boolean },
  ): Promise<FakeWorkDayRecord | null>;
  findByIdAndDelete(id: string): Promise<FakeWorkDayRecord | null>;
}

const matches = (record: FakeWorkDayRecord, query: Query): boolean =>
  Object.entries(query).every(([field, value]) => {
    if (field === 'userId') {
      return record.userId === String(value);
    }

    if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
      const ops = value as Record<string, unknown>;
      const current = (record as unknown as Record<string, unknown>)[field] as
        | string
        | undefined;
      if (current === undefined) {
        return false;
      }
      if (typeof ops.$gte === 'string' && current < ops.$gte) {
        return false;
      }
      if (typeof ops.$lte === 'string' && current > ops.$lte) {
        return false;
      }
      return true;
    }

    return (record as unknown as Record<string, unknown>)[field] === value;
  });

export function createFakeWorkDayModel(): FakeWorkDayModel {
  const store: FakeWorkDayRecord[] = [];

  const create = async (input: Record<string, unknown>): Promise<FakeWorkDayRecord> => {
    const userId = String(input.userId);
    const date = String(input.date);

    if (store.some((record) => record.userId === userId && record.date === date)) {
      const error = new Error(
        'E11000 duplicate key error collection: work_days',
      ) as Error & { code: number };
      error.code = 11000;
      throw error;
    }

    const now = new Date();
    const record: FakeWorkDayRecord = {
      _id: new Types.ObjectId().toString(),
      userId,
      date,
      entryTime: input.entryTime as string | undefined,
      breakStart: input.breakStart as string | undefined,
      breakEnd: input.breakEnd as string | undefined,
      exitTime: input.exitTime as string | undefined,
      expectedMinutes: (input.expectedMinutes as number) ?? 480,
      workedMinutes: (input.workedMinutes as number) ?? 0,
      balanceMinutes: (input.balanceMinutes as number) ?? 0,
      status: (input.status as WorkDayStatus) ?? WorkDayStatus.INCOMPLETE,
      createdAt: now,
      updatedAt: now,
    };

    store.push(record);
    return record;
  };

  const findOne = async (query: Query): Promise<FakeWorkDayRecord | null> =>
    store.find((record) => matches(record, query)) ?? null;

  const findById = async (id: string): Promise<FakeWorkDayRecord | null> =>
    store.find((record) => record._id === id) ?? null;

  const buildSelection = (items: FakeWorkDayRecord[]): FakeWorkDaySelection => {
    const selection: FakeWorkDaySelection = {
      sort: () => selection,
      skip: (offset: number) => buildSelection(items.slice(offset)),
      limit: async (amount: number): Promise<FakeWorkDayRecord[]> =>
        items.slice(0, amount),
      then: <TResult1 = FakeWorkDayRecord[], TResult2 = never>(
        onfulfilled?:
          | ((value: FakeWorkDayRecord[]) => TResult1 | PromiseLike<TResult1>)
          | null,
        onrejected?: ((reason: unknown) => TResult2 | PromiseLike<TResult2>) | null,
      ): PromiseLike<TResult1 | TResult2> =>
        Promise.resolve(items).then(onfulfilled, onrejected),
    };
    return selection;
  };

  const find = (query: Query): FakeWorkDaySelection =>
    buildSelection(
      [...store]
        .filter((record) => matches(record, query))
        .sort((a, b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : 0)),
    );

  const countDocuments = async (query: Query): Promise<number> =>
    [...store].filter((record) => matches(record, query)).length;

  const findByIdAndUpdate = async (
    id: string,
    update: Record<string, unknown>,
  ): Promise<FakeWorkDayRecord | null> => {
    const record = store.find((item) => item._id === id);
    if (!record) {
      return null;
    }

    Object.assign(record, update, { updatedAt: new Date() });
    return record;
  };

  const findByIdAndDelete = async (id: string): Promise<FakeWorkDayRecord | null> => {
    const index = store.findIndex((record) => record._id === id);
    if (index === -1) {
      return null;
    }
    return store.splice(index, 1)[0];
  };

  return {
    store,
    create,
    findOne,
    findById,
    find,
    countDocuments,
    findByIdAndUpdate,
    findByIdAndDelete,
  };
}