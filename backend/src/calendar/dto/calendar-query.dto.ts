import { IsOptional, Matches } from 'class-validator';
import { DATE_PATTERN, MONTH_PATTERN } from '../../config/constants';

export class CalendarQueryDto {
  @IsOptional()
  @Matches(MONTH_PATTERN, {
    message: 'Le mois doit être au format YYYY-MM',
  })
  month?: string;

  @IsOptional()
  @Matches(DATE_PATTERN, {
    message: 'La date de début doit être au format YYYY-MM-DD',
  })
  start?: string;

  @IsOptional()
  @Matches(DATE_PATTERN, {
    message: 'La date de fin doit être au format YYYY-MM-DD',
  })
  end?: string;
}
