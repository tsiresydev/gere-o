import { IsOptional, Matches } from 'class-validator';
import { DATE_PATTERN } from '../../config/constants';

export class DailySummaryQueryDto {
  @IsOptional()
  @Matches(DATE_PATTERN, { message: 'La date doit être au format YYYY-MM-DD' })
  date?: string;
}
