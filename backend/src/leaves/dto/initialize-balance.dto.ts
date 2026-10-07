import { Type } from 'class-transformer';
import { IsMongoId, IsNumber, IsOptional, Min } from 'class-validator';

export class InitializeBalanceDto {
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 }, { message: 'initialDays doit être un nombre' })
  @Min(0, { message: 'initialDays doit être positif ou nul' })
  initialDays: number;

  @IsOptional()
  @IsMongoId({ message: 'userId invalide' })
  userId?: string;
}