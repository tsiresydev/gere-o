import { Type } from 'class-transformer';
import { IsInt, IsOptional, Max, Min } from 'class-validator';
import { SentReportDocument } from '../entities/sent-report.schema';

export interface CreateSentReportInput {
  year: number;
  month: number;
  monthLabel: string;
  from: string;
  to: string;
  cc?: string;
  bcc?: string;
  subject: string;
  message: string;
  workedDays: number;
  totalLeaveDays: number;
  senderName: string;
  messageId?: string;
}

export class ListSentReportsQueryDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt({ message: 'page doit être un entier' })
  @Min(1, { message: 'page doit être au moins 1' })
  page?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt({ message: 'limit doit être un entier' })
  @Min(1, { message: 'limit doit être au moins 1' })
  @Max(100, { message: 'limit ne doit pas dépasser 100' })
  limit?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt({ message: "L'année doit être un entier" })
  @Min(2000, { message: 'Année invalide' })
  year?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt({ message: 'Le mois doit être un entier' })
  @Min(1, { message: 'Le mois doit être compris entre 1 et 12' })
  @Max(12, { message: 'Le mois doit être compris entre 1 et 12' })
  month?: number;
}

export class SentReportSummaryDto {
  id: string;

  year: number;

  month: number;

  monthLabel: string;

  to: string;

  cc?: string;

  subject: string;

  workedDays: number;

  totalLeaveDays: number;

  createdAt?: Date;

  static from(report: SentReportDocument): SentReportSummaryDto {
    const dto = new SentReportSummaryDto();
    dto.id = String(report._id);
    dto.year = report.year;
    dto.month = report.month;
    dto.monthLabel = report.monthLabel;
    dto.to = report.to;
    dto.cc = report.cc;
    dto.subject = report.subject;
    dto.workedDays = report.workedDays;
    dto.totalLeaveDays = report.totalLeaveDays;
    dto.createdAt = report.createdAt;
    return dto;
  }
}

export class SentReportResponseDto extends SentReportSummaryDto {
  from: string;

  bcc?: string;

  message: string;

  senderName: string;

  messageId?: string;

  static detail(report: SentReportDocument): SentReportResponseDto {
    const dto = new SentReportResponseDto();
    Object.assign(dto, SentReportSummaryDto.from(report));
    dto.from = report.from;
    dto.bcc = report.bcc;
    dto.message = report.message;
    dto.senderName = report.senderName;
    dto.messageId = report.messageId;
    return dto;
  }
}

export interface SentReportPageResponse {
  items: SentReportSummaryDto[];
  total: number;
  page: number;
  limit: number;
}
