/* eslint-disable @typescript-eslint/no-explicit-any */
import { Types } from 'mongoose';

type Doc = Record<string, any> & { _id?: Types.ObjectId };

const same = (left: unknown, right: unknown): boolean =>
  left !== null &&
  right !== null &&
  left !== undefined &&
  right !== undefined &&
  String(left) === String(right);

const matchesValue = (value: unknown, condition: unknown): boolean => {
  if (condition && typeof condition === 'object' && !Types.ObjectId.isValid(String(condition))) {
    const operators = condition as Record<string, unknown>;
    if ('$in' in operators) {
      return (operators.$in as unknown[]).some((item) => same(value, item));
    }
    if ('$ne' in operators) return !same(value, operators.$ne);
    if ('$gte' in operators && value !== undefined) {
      return (value as number) >= (operators.$gte as number);
    }
    if ('$lte' in operators && value !== undefined) {
      return (value as number) <= (operators.$lte as number);
    }
    if ('$exists' in operators) {
      return operators.$exists ? value !== undefined : value === undefined;
    }
  }
  return same(value, condition);
};

export const matches = (doc: Doc, filter: Record<string, any> = {}): boolean =>
  Object.entries(filter).every(([key, condition]) => {
    if (key === '$or') {
      return (condition as Record<string, unknown>[]).some((item) =>
        matches(doc, item),
      );
    }
    return matchesValue(doc[key], condition);
  });

export class FakeQuery<T> {
  constructor(private readonly value: T) {}

  session(): this {
    return this;
  }

  select(): this {
    return this;
  }

  sort(): this {
    return this;
  }

  skip(): this {
    return this;
  }

  limit(): this {
    return this;
  }

  async exec(): Promise<T> {
    return this.value;
  }

  then<TResult1 = T, TResult2 = never>(
    onfulfilled?: ((value: T) => TResult1 | PromiseLike<TResult1>) | null,
    onrejected?: ((reason: unknown) => TResult2 | PromiseLike<TResult2>) | null,
  ): Promise<TResult1 | TResult2> {
    return this.exec().then(onfulfilled, onrejected);
  }
}

const applyUpdate = (doc: Doc, update: Record<string, any>): void => {
  if (update.$set) Object.assign(doc, update.$set);
  if (update.$unset) {
    Object.keys(update.$unset).forEach((key) => delete doc[key]);
  }
  if (update.$inc) {
    Object.entries(update.$inc).forEach(([key, value]) => {
      doc[key] = (Number(doc[key]) || 0) + Number(value);
    });
  }
};

interface FakeModelOptions {
  uniqueFields?: string[];
  groupDirection?: boolean;
}

export function createFakeModel<T extends Doc>(
  seed: T[] = [],
  options: FakeModelOptions = {},
): any {
  const docs: T[] = seed.map((doc) => ({
    ...doc,
    _id: doc._id ?? new Types.ObjectId(),
  }));

  return {
    docs,

    find(filter: Record<string, any> = {}) {
      return new FakeQuery(docs.filter((doc) => matches(doc, filter)));
    },

    findOne(filter: Record<string, any> = {}) {
      return new FakeQuery(docs.find((doc) => matches(doc, filter)) ?? null);
    },

    findById(id: unknown) {
      return new FakeQuery(docs.find((doc) => same(doc._id, id)) ?? null);
    },

    findOneAndUpdate(
      filter: Record<string, any>,
      update: Record<string, any>,
    ) {
      const doc = docs.find((item) => matches(item, filter));
      if (!doc) return new FakeQuery(null);
      applyUpdate(doc, update);
      return new FakeQuery(doc);
    },

    findByIdAndUpdate(
      id: unknown,
      update: Record<string, any>,
    ) {
      const doc = docs.find((item) => same(item._id, id));
      if (!doc) return new FakeQuery(null);
      applyUpdate(doc, update);
      return new FakeQuery(doc);
    },

    async create(input: T | T[]) {
      const items = Array.isArray(input) ? input : [input];
      for (const item of items) {
        for (const field of options.uniqueFields ?? []) {
          if (item[field] === undefined || item[field] === null) continue;
          if (
            docs.some(
              (existing) =>
                existing[field] !== undefined &&
                same(existing[field], item[field]),
            )
          ) {
            throw { code: 11000 };
          }
        }
        if (!item._id) item._id = new Types.ObjectId();
        docs.push(item);
      }
      return items;
    },

    countDocuments(filter: Record<string, any> = {}) {
      return new FakeQuery(docs.filter((doc) => matches(doc, filter)).length);
    },

    async updateOne(filter: Record<string, any>, update: Record<string, any>) {
      const doc = docs.find((item) => matches(item, filter));
      if (!doc) {
        docs.push({
          filter,
          ...(update.$setOnInsert ?? {}),
          _id: new Types.ObjectId(),
        } as T);
        return;
      }
      applyUpdate(doc, update);
    },

    async updateMany(filter: Record<string, any>, update: Record<string, any>) {
      docs.filter((doc) => matches(doc, filter)).forEach((doc) => applyUpdate(doc, update));
    },

    aggregate() {
      return {
        session() {
          return this;
        },
        async exec() {
          if (!options.groupDirection) return [];
          const totals = new Map<string, number>();
          docs.forEach((doc) => {
            totals.set(
              String(doc.direction),
              (totals.get(String(doc.direction)) ?? 0) + Number(doc.amount),
            );
          });
          return [...totals.entries()].map(([_id, total]) => ({ _id, total }));
        },
      };
    },
  };
}

export const fakeConnection = {
  db: {
    admin: () => ({
      command: async () => ({}), // pas de setName : pas de transaction MongoDB
    }),
  },
};

export const fakeEmailService = () => ({
  sendMail: jest.fn(
    async (_options: any): Promise<{ success: boolean; error?: string; messageId?: string }> => ({
      success: true,
    }),
  ),
  getFrom: jest.fn(() => ({ email: 'caisse@gere-o.test' })),
  getBcc: jest.fn(() => null),
});

export const fakeConfigService = {
  get: jest.fn(() => 'test'),
  getOrThrow: jest.fn(() => 'test'),
};
