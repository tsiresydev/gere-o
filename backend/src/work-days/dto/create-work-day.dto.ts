import { IsOptional, Matches } from 'class-validator';
import { DATE_PATTERN, TIME_PATTERN } from '../../config/constants';

export class CreateWorkDayDto {
  @Matches(DATE_PATTERN, { message: 'La date doit être au format YYYY-MM-DD' })
  date: string;

  @IsOptional()
  @Matches(TIME_PATTERN, { message: "L'heure d'entrée doit être au format HH:mm" })
  entryTime?: string;

  @IsOptional()
  @Matches(TIME_PATTERN, { message: 'Le début de pause doit être au format HH:mm' })
  breakStart?: string;

  @IsOptional()
  @Matches(TIME_PATTERN, { message: 'La fin de pause doit être au format HH:mm' })
  breakEnd?: string;

  @IsOptional()
  @Matches(TIME_PATTERN, { message: "L'heure de sortie doit être au format HH:mm" })
  exitTime?: string;
}
