import { Type } from 'class-transformer';
import { IsInt, IsOptional, Matches, Max, Min } from 'class-validator';
import { DATE_PATTERN } from '../../config/constants';

export class WeeklySummaryQueryDto {
  @IsOptional()
  @Matches(DATE_PATTERN, { message: 'weekStart doit être au format YYYY-MM-DD' })
  weekStart?: string;
}

export class MonthlySummaryQueryDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt({ message: 'year doit être un entier' })
  @Min(2000, { message: 'Année invalide' })
  @Max(2100, { message: 'Année invalide' })
  year?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt({ message: 'month doit être un entier' })
  @Min(1, { message: 'month doit être compris entre 1 et 12' })
  @Max(12, { message: 'month doit être compris entre 1 et 12' })
  month?: number;
}