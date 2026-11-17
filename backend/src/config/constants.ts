export const MIN_PASSWORD_LENGTH = 8;
export const PASSWORD_HASH_ROUNDS = 10;

export const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;
export const MONTH_PATTERN = /^\d{4}-\d{2}$/;
export const TIME_PATTERN = /^([01]\d|2[0-3]):[0-5]\d$/;

export const DEFAULT_EXPECTED_MINUTES = 480;
export const DEFAULT_WEEKLY_EXPECTED_MINUTES = 2400;
export const DEFAULT_ENTRY_TIME = '08:45';
export const DEFAULT_BREAK_START = '13:00';
export const DEFAULT_BREAK_END = '13:30';

export const LEAVE_MONTHLY_ACCRUAL = 2.08;
export const DEFAULT_LEAVE_INITIAL_BALANCE = 0;

/** Module Cotisations — caisse commune. */
export const CONTRIBUTION_START_YEAR = 2026;
export const CONTRIBUTION_MONTHLY_AMOUNT = 5000;
export const CONTRIBUTION_PAGE_SIZE = 10;
export const NOTIFICATION_MAX_ATTEMPTS = 5;
export const CASH_MANAGER_EMAIL = 'mahefa.madasoftware@gmail.com';

export const FRENCH_MONTHS = [
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
] as const;

export interface InitialContributionMember {
  name: string;
  email: string;
  canValidate?: boolean;
}

/** Liste initiale stable des dix participants. Les comptes Gere-o ne sont pas créés ici. */
export const INITIAL_CONTRIBUTION_MEMBERS: InitialContributionMember[] = [
  { name: 'Mahefa', email: 'mahefa.madasoftware@gmail.com', canValidate: true },
  { name: 'Sambany', email: 'sambany.madasoftware@gmail.com' },
  { name: 'Tsiresy', email: 'tsiresy.madasoftware@gmail.com', canValidate: true },
  { name: 'Charlot', email: 'charlot.madasoftware@gmail.com' },
  { name: 'Nico', email: 'alfrednico@gmail.com' },
  { name: 'Mamy', email: 'mamy.madasoftware@gmail.com' },
  { name: 'Samuel', email: 'samuel.madasoftware@gmail.com' },
  { name: 'Stephanie', email: 'stephannie.madasoftware@gmail.com' },
  { name: 'Tiavina', email: 'tiavina.madasoftware@gmail.com' },
  { name: 'Johary', email: 'johary.madasoftware@gmail.com' },
];

export const INITIAL_EXPENSE_CATEGORIES = [
  { name: 'FAHASOAVANA', label: 'Fahasoavana' },
  { name: 'HOSPITALISATION', label: 'Hospitalisation' },
  { name: 'FAHORIANA', label: 'Fahoriana' },
  { name: 'AUTRE', label: 'Autre' },
] as const;
