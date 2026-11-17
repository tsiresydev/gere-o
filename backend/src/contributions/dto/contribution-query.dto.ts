import { Type } from 'class-transformer';
import {
  IsEnum,
  IsInt,
  IsMongoId,
  IsOptional,
  IsString,
  Max,
  Min,
} from 'class-validator';
import { ContributionStatus } from '../../common/enums/contribution-status.enum';
import { CONTRIBUTION_PAGE_SIZE, CONTRIBUTION_START_YEAR } from '../../config/constants';

export class ContributionQueryDto {
  @IsOptional()
  @IsMongoId({ message: 'Identifiant de membre invalide' })
  memberId?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(12)
  month?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(CONTRIBUTION_START_YEAR)
  year?: number;

  @IsOptional()
  @IsEnum(ContributionStatus, { message: 'Statut invalide' })
  status?: ContributionStatus;

  @IsOptional()
  @IsString()
  search?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page: number = 1;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit: number = CONTRIBUTION_PAGE_SIZE;
}
