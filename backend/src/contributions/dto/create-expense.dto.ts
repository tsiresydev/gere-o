import { Type } from 'class-transformer';
import {
  IsInt,
  IsString,
  Matches,
  MaxLength,
  Min,
  MinLength,
} from 'class-validator';
import { DATE_PATTERN } from '../../config/constants';

export class CreateExpenseDto {
  @IsString()
  @MinLength(2, { message: 'Le motif doit contenir au moins 2 caractères' })
  @MaxLength(200)
  description: string;

  @IsString()
  @MinLength(1, { message: 'La catégorie est obligatoire' })
  @MaxLength(80)
  category: string;

  @Type(() => Number)
  @IsInt({ message: 'Le montant doit être un entier en Ariary' })
  @Min(1, { message: 'Le montant doit être supérieur à 0' })
  amount: number;

  @Matches(DATE_PATTERN, {
    message: 'La date de dépense doit être au format AAAA-MM-JJ',
  })
  expenseDate: string;

  @IsString()
  @MaxLength(500)
  notes?: string;
}
