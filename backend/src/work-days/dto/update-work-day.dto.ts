import { Matches, IsOptional } from 'class-validator';
import { TIME_PATTERN } from '../../config/constants';

export class UpdateWorkDayDto {
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
