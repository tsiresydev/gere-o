import { Type } from 'class-transformer';
import {
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  Matches,
  Max,
  Min,
} from 'class-validator';
import { CashTransactionType } from '../../common/enums/cash-transaction-type.enum';
import { CONTRIBUTION_PAGE_SIZE, DATE_PATTERN } from '../../config/constants';

export class ExpenseQueryDto {
  @IsOptional()
  @IsString()
  category?: string;

  @IsOptional()
  @Matches(DATE_PATTERN)
  startDate?: string;

  @IsOptional()
  @Matches(DATE_PATTERN)
  endDate?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page: number = 1;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit: number = CONTRIBUTION_PAGE_SIZE;
}

export class JournalQueryDto {
  @IsOptional()
  @IsEnum(CashTransactionType, { message: 'Type invalide' })
  type?: CashTransactionType;

  @IsOptional()
  @Matches(DATE_PATTERN)
  startDate?: string;

  @IsOptional()
  @Matches(DATE_PATTERN)
  endDate?: string;

  @IsOptional()
  @IsString()
  search?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page: number = 1;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit: number = CONTRIBUTION_PAGE_SIZE;
}

export class OverviewQueryDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(2026)
  year?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(12)
  month?: number;
}
