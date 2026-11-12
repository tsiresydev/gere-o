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
  messageId?: string;
  error?: string;
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
};