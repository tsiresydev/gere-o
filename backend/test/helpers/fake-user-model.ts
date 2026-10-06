import { Types } from 'mongoose';
import { UserRole } from '../../src/common/enums/user-role.enum';

export interface FakeUserRecord {
  _id: string;
  email: string;
  passwordHash: string;
  firstName: string;
  lastName: string;
  role: UserRole;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface FakeUserModel {
  store: FakeUserRecord[];
  create(input: Partial<FakeUserRecord>): Promise<FakeUserRecord>;
  findOne(query: Partial<FakeUserRecord>): Promise<FakeUserRecord | null>;
  findById(id: string): Promise<FakeUserRecord | null>;
  find(): {
    sort(order: Record<string, 1 | -1>): Promise<FakeUserRecord[]>;
  };
}

const matches = (record: FakeUserRecord, query: Partial<FakeUserRecord>): boolean =>
  Object.entries(query).every(([field, value]) => {
    const key = field as keyof FakeUserRecord;
    return record[key] === value;
  });

export function createFakeUserModel(): FakeUserModel {
  const store: FakeUserRecord[] = [];

  const create = async (input: Partial<FakeUserRecord>): Promise<FakeUserRecord> => {
    const email = input.email?.trim().toLowerCase();

    if (email && store.some((record) => record.email === email)) {
      const error = new Error('E11000 duplicate key error collection: users') as Error & {
        code: number;
      };
      error.code = 11000;
      throw error;
    }

    const now = new Date();
    const record: FakeUserRecord = {
      _id: new Types.ObjectId().toString(),
      email: email ?? '',
      passwordHash: input.passwordHash ?? '',
      firstName: input.firstName ?? '',
      lastName: input.lastName ?? '',
      role: input.role ?? UserRole.EMPLOYEE,
      isActive: input.isActive ?? true,
      createdAt: now,
      updatedAt: now,
    };

    store.push(record);
    return record;
  };

  const findOne = async (query: Partial<FakeUserRecord>): Promise<FakeUserRecord | null> =>
    store.find((record) => matches(record, query)) ?? null;

  const findById = async (id: string): Promise<FakeUserRecord | null> =>
    store.find((record) => record._id === id) ?? null;

  const find = () => ({
    sort: (): Promise<FakeUserRecord[]> =>
      Promise.resolve(
        [...store].sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime()),
      ),
  });

  return { store, create, findOne, findById, find };
}
