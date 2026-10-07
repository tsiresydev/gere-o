import { Type } from 'class-transformer';
import { IsInt, IsOptional, Matches, Max, Min } from 'class-validator';
import { DATE_PATTERN } from '../../config/constants';

export class ListWorkDaysQueryDto {
  @IsOptional()
  @Matches(DATE_PATTERN, { message: 'startDate doit être au format YYYY-MM-DD' })
  startDate?: string;

  @IsOptional()
  @Matches(DATE_PATTERN, { message: 'endDate doit être au format YYYY-MM-DD' })
  endDate?: string;

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
}