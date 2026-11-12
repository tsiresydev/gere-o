import { api } from './api';

export interface ReportPreview {
  from: string;
  to: string;
  cc?: string;
  subject: string;
  message: string;
  monthLabel: string;
  workedDays: number;
  totalLeaveDays: number;
  leaveDetails: { date: string; duration: number; period: 'morning' | 'afternoon' | 'full' }[];
  senderName: string;
}

export interface SendReportInput {
  year: number;
  month: number;
  to: string;
  cc?: string;
  subject: string;
  message: string;
}

export interface SendReportResult {
  success: boolean;
  id?: string;
  messageId?: string;
  error?: string;
}

export interface SentReportSummary {
  id: string;
  year: number;
  month: number;
  monthLabel: string;
  to: string;
  cc?: string;
  subject: string;
  workedDays: number;
  totalLeaveDays: number;
  createdAt: string;
}

export interface SentReportDetail extends SentReportSummary {
  from: string;
  bcc?: string;
  message: string;
  senderName: string;
  messageId?: string;
}

export interface SentReportPage {
  items: SentReportSummary[];
  total: number;
  page: number;
  limit: number;
}

export interface ListReportsParams {
  page?: number;
  limit?: number;
  year?: number;
  month?: number;
}

export const reportService = {
  async preview(year: number, month: number): Promise<ReportPreview> {
    return api<ReportPreview>('/email/report/preview', {
      method: 'POST',
      body: JSON.stringify({ year, month }),
    });
  },
  async send(input: SendReportInput): Promise<SendReportResult> {
    return api<SendReportResult>('/email/report/send', {
      method: 'POST',
      body: JSON.stringify(input),
    });
  },
  async list(params: ListReportsParams = {}): Promise<SentReportPage> {
    const search = new URLSearchParams();
    if (params.page !== undefined) search.set('page', String(params.page));
    if (params.limit !== undefined) search.set('limit', String(params.limit));
    if (params.year !== undefined) search.set('year', String(params.year));
    if (params.month !== undefined) search.set('month', String(params.month));
    const query = search.toString();
    return api<SentReportPage>(`/email/reports${query ? `?${query}` : ''}`);
  },
  async get(id: string): Promise<SentReportDetail> {
    return api<SentReportDetail>(`/email/reports/${encodeURIComponent(id)}`);
  },
};
