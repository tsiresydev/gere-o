import { Type } from 'class-transformer';
import {
  IsBoolean,
  IsEmail,
  IsEnum,
  IsInt,
  IsMongoId,
  IsOptional,
  IsString,
  MaxLength,
  Min,
  MinLength,
} from 'class-validator';
import { CashDirection } from '../../common/enums/cash-direction.enum';
import { ContributionMemberStatus } from '../../common/enums/contribution-member-status.enum';

export class CreateContributionMemberDto {
  @IsString()
  @MinLength(2)
  @MaxLength(120)
  name: string;

  @IsEmail({}, { message: "L'adresse email est invalide" })
  email: string;

  @IsOptional()
  @IsBoolean()
  canValidate?: boolean;
}

export class UpdateContributionMemberDto {
  @IsOptional()
  @IsString()
  @MinLength(2)
  @MaxLength(120)
  name?: string;

  @IsOptional()
  @IsEmail({}, { message: "L'adresse email est invalide" })
  email?: string;

  @IsOptional()
  @IsEnum(ContributionMemberStatus, { message: 'Statut invalide' })
  status?: ContributionMemberStatus;

  @IsOptional()
  @IsBoolean()
  canValidate?: boolean;
}

export class CreateExpenseCategoryDto {
  @IsString()
  @MinLength(2)
  @MaxLength(80)
  name: string;

  @IsString()
  @MinLength(2)
  @MaxLength(120)
  label: string;
}

export class UpdateExpenseCategoryDto {
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @IsOptional()
  @IsString()
  @MinLength(2)
  @MaxLength(120)
  label?: string;
}

export class CreateCorrectionDto {
  @IsMongoId({ message: 'Identifiant de transaction invalide' })
  transactionId: string;

  @Type(() => Number)
  @IsInt()
  @Min(1)
  amount: number;

  @IsEnum(CashDirection, { message: 'Direction invalide' })
  direction: CashDirection;

  @IsString()
  @MinLength(3, { message: 'Le motif de correction est obligatoire' })
  @MaxLength(500)
  reason: string;
}
