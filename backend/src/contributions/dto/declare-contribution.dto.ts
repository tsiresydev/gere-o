import { Transform, Type } from 'class-transformer';
import {
  ArrayNotEmpty,
  ArrayUnique,
  IsArray,
  IsInt,
  IsMongoId,
  IsOptional,
  IsString,
  Matches,
  Max,
  MaxLength,
  Min,
} from 'class-validator';
import { DATE_PATTERN } from '../../config/constants';
import { CONTRIBUTION_START_YEAR } from '../../config/constants';

export class DeclareContributionDto {
  @IsOptional()
  @IsMongoId({ message: 'Identifiant de membre invalide' })
  memberId?: string;

  @IsArray({ message: 'La liste des mois est obligatoire' })
  @ArrayNotEmpty({ message: 'Sélectionnez au moins un mois' })
  @ArrayUnique({ message: 'Un mois ne peut pas être sélectionné deux fois' })
  @Transform(({ value }) =>
    Array.isArray(value) ? value.map((month) => Number(month)) : value,
  )
  @IsInt({ each: true, message: 'Chaque mois doit être un entier' })
  @Min(1, { each: true, message: 'Le mois doit être compris entre 1 et 12' })
  @Max(12, { each: true, message: 'Le mois doit être compris entre 1 et 12' })
  months: number[];

  @Type(() => Number)
  @IsInt({ message: "L'année doit être un entier" })
  @Min(CONTRIBUTION_START_YEAR, {
    message: `L'année doit être au moins ${CONTRIBUTION_START_YEAR}`,
  })
  year: number;

  @Matches(DATE_PATTERN, {
    message: 'La date de paiement doit être au format AAAA-MM-JJ',
  })
  paymentDate: string;

  @IsOptional()
  @IsString()
  @MaxLength(80)
  paymentMethod?: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  notes?: string;
}
