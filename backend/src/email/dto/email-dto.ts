import { Type } from 'class-transformer';
import {
  IsEmail,
  IsInt,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
  MinLength,
} from 'class-validator';

export interface LeaveDayDetail {
  date: string;
  duration: number;
  period: 'morning' | 'afternoon' | 'full';
}

export interface EmailReportData {
  month: number;
  year: number;
  monthLabel: string;
  workedDays: number;
  totalLeaveDays: number;
  leaveDetails: LeaveDayDetail[];
  senderName: string;
}

export interface EmailReportPreview {
  from: string;
  to: string;
  cc?: string;
  subject: string;
  message: string;
  monthLabel: string;
  workedDays: number;
  totalLeaveDays: number;
  leaveDetails: LeaveDayDetail[];
  senderName: string;
}

export class GenerateReportDto {
  @Type(() => Number)
  @IsInt({ message: "L'année doit être un entier" })
  @Min(2000, { message: 'Année invalide' })
  year: number;

  @Type(() => Number)
  @IsInt({ message: 'Le mois doit être un entier' })
  @Min(1, { message: 'Le mois doit être compris entre 1 et 12' })
  @Max(12, { message: 'Le mois doit être compris entre 1 et 12' })
  month: number;
}

export class SendReportDto {
  @Type(() => Number)
  @IsInt({ message: "L'année doit être un entier" })
  @Min(2000, { message: 'Année invalide' })
  year: number;

  @Type(() => Number)
  @IsInt({ message: 'Le mois doit être un entier' })
  @Min(1, { message: 'Le mois doit être compris entre 1 et 12' })
  @Max(12, { message: 'Le mois doit être compris entre 1 et 12' })
  month: number;

  @IsEmail({}, { message: "L'adresse email du destinataire est invalide" })
  @IsString()
  to: string;

  @IsOptional()
  @IsString()
  cc?: string;

  @IsString()
  @MinLength(1, { message: "L'objet est obligatoire" })
  @MaxLength(200, { message: "L'objet ne doit pas dépasser 200 caractères" })
  subject: string;

  @IsString()
  @MinLength(1, { message: 'Le message est obligatoire' })
  @MaxLength(5000, { message: 'Le message ne doit pas dépasser 5000 caractères' })
  message: string;
}

export class EmailSendResult {
  success: boolean;
  messageId?: string;
  error?: string;
}