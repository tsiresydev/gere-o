export type ContributionStatus =
  | 'NON_PAYE'
  | 'EN_RETARD'
  | 'EN_ATTENTE_DE_VALIDATION'
  | 'VALIDE'
  | 'REFUSE';

export const CONTRIBUTION_STATUS_LABELS: Record<ContributionStatus, string> = {
  NON_PAYE: 'Non payé',
  EN_RETARD: 'En retard',
  EN_ATTENTE_DE_VALIDATION: 'En attente de validation',
  VALIDE: 'Payé',
  REFUSE: 'Refusé',
};

export type ContributionMemberStatus = 'ACTIVE' | 'INACTIVE';

export interface Page<T> {
  items: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

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

export interface Expense {
  id: string;
  description: string;
  category: string;
  amount: number;
  expenseDate: string;
  notes?: string;
  createdBy: string;
  createdByName: string;
  status: string;
  balanceAfter?: number;
  createdAt?: string;
}

export interface CashTransaction {
  id: string;
  type: 'CONTRIBUTION_VALIDEE' | 'DEPENSE' | 'CORRECTION';
  direction: 'IN' | 'OUT';
  amount: number;
  description: string;
  createdBy: string;
  createdByName: string;
  balanceAfter?: number;
  createdAt?: string;
  correctionOf?: string;
}

export interface ExpenseCategory {
  id: string;
  name: string;
  label: string;
  isActive: boolean;
}

export interface NotificationLog {
  id: string;
  eventType: 'CONTRIBUTION_DECLAREE' | 'DEPENSE_ENREGISTREE';
  referenceId: string;
  recipients: { to: string[]; cc: string[] };
  subject: string;
  status: 'PENDING' | 'PROCESSING' | 'SENT' | 'FAILED';
  attempts: number;
  sentAt?: string;
  errorMessage?: string;
  createdAt?: string;
}

export interface FinanceOverview {
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

export interface DeclareContributionInput {
  memberId?: string;
  months: number[];
  year: number;
  paymentDate: string;
  paymentMethod?: string;
  notes?: string;
}

export interface CreateExpenseInput {
  description: string;
  category: string;
  amount: number;
  expenseDate: string;
  notes?: string;
}

export interface ContributionFilters {
  memberId?: string;
  month?: number;
  year?: number;
  status?: ContributionStatus;
  search?: string;
  page?: number;
  limit?: number;
}

export interface ExpenseFilters {
  category?: string;
  startDate?: string;
  endDate?: string;
  page?: number;
  limit?: number;
}

export interface JournalFilters {
  type?: string;
  startDate?: string;
  endDate?: string;
  search?: string;
  page?: number;
  limit?: number;
}

export const FINANCE_MONTHS = [
  'Janvier',
  'Février',
  'Mars',
  'Avril',
  'Mai',
  'Juin',
  'Juillet',
  'Août',
  'Septembre',
  'Octobre',
  'Novembre',
  'Décembre',
];

export const CATEGORIE_COLORS = ['#7c3aed', '#38bdf8', '#f59e0b', '#22c55e', '#f472b6'];
