import { api } from './api';
import type {
  CashTransaction,
  ContributionFilters,
  ContributionRow,
  CreateExpenseInput,
  DeclareContributionInput,
  Expense,
  ExpenseCategory,
  ExpenseFilters,
  FinanceOverview,
  JournalFilters,
  MemberRow,
  NotificationLog,
  Page,
} from '../types/contribution';

const toQuery = (filters: object): string => {
  const params = new URLSearchParams();
  Object.entries(filters).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== '') {
      params.set(key, String(value));
    }
  });
  const query = params.toString();
  return query ? `?${query}` : '';
};

export const contributionsService = {
  overview(year?: number, month?: number): Promise<FinanceOverview> {
    return api<FinanceOverview>(
      `/contributions/overview${toQuery({ year, month })}`,
    );
  },

  members(): Promise<MemberRow[]> {
    return api<MemberRow[]>('/contributions/members');
  },

  createMember(input: {
    name: string;
    email: string;
    canValidate?: boolean;
  }): Promise<MemberRow> {
    return api<MemberRow>('/contributions/members', {
      method: 'POST',
      body: JSON.stringify(input),
    });
  },

  updateMember(
    id: string,
    input: { name?: string; email?: string; status?: 'ACTIVE' | 'INACTIVE'; canValidate?: boolean },
  ): Promise<MemberRow> {
    return api<MemberRow>(`/contributions/members/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(input),
    });
  },

  categories(): Promise<ExpenseCategory[]> {
    return api<ExpenseCategory[]>('/contributions/categories');
  },

  createCategory(input: { name: string; label: string }): Promise<ExpenseCategory> {
    return api<ExpenseCategory>('/contributions/categories', {
      method: 'POST',
      body: JSON.stringify(input),
    });
  },

  updateCategory(
    id: string,
    input: { isActive?: boolean; label?: string },
  ): Promise<ExpenseCategory> {
    return api<ExpenseCategory>(`/contributions/categories/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(input),
    });
  },

  list(filters: ContributionFilters = {}): Promise<Page<ContributionRow>> {
    return api<Page<ContributionRow>>(`/contributions${toQuery(filters)}`);
  },

  mine(filters: ContributionFilters = {}): Promise<Page<ContributionRow>> {
    return api<Page<ContributionRow>>(`/contributions/me${toQuery(filters)}`);
  },

  pendingDeclarations(): Promise<ContributionRow[]> {
    return api<ContributionRow[]>('/contributions/pending-declarations');
  },

  declare(input: DeclareContributionInput): Promise<{
    items: ContributionRow[];
    groupId: string;
  }> {
    return api('/contributions', {
      method: 'POST',
      body: JSON.stringify(input),
    });
  },

  validate(id: string): Promise<ContributionRow> {
    return api<ContributionRow>(`/contributions/${id}/validate`, {
      method: 'PATCH',
      body: JSON.stringify({}),
    });
  },

  reject(id: string, reason: string): Promise<ContributionRow> {
    return api<ContributionRow>(`/contributions/${id}/reject`, {
      method: 'PATCH',
      body: JSON.stringify({ reason }),
    });
  },

  expenses(filters: ExpenseFilters = {}): Promise<Page<Expense>> {
    return api<Page<Expense>>(`/contributions/expenses${toQuery(filters)}`);
  },

  createExpense(input: CreateExpenseInput): Promise<Expense> {
    return api<Expense>('/contributions/expenses', {
      method: 'POST',
      body: JSON.stringify(input),
    });
  },

  journal(filters: JournalFilters = {}): Promise<Page<CashTransaction>> {
    return api<Page<CashTransaction>>(`/contributions/journal${toQuery(filters)}`);
  },

  correct(input: {
    transactionId: string;
    amount: number;
    direction: 'IN' | 'OUT';
    reason: string;
  }): Promise<{ transaction: CashTransaction; balance: number }> {
    return api('/contributions/journal/correct', {
      method: 'POST',
      body: JSON.stringify(input),
    });
  },

  notifications(page = 1): Promise<Page<NotificationLog>> {
    return api<Page<NotificationLog>>(
      `/contributions/notifications${toQuery({ page, limit: 10 })}`,
    );
  },

  retryNotification(id: string): Promise<{ sent: boolean; skipped?: string }> {
    return api(`/contributions/notifications/${id}/retry`, { method: 'POST' });
  },
};
