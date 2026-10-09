import { IsEnum, IsNotEmpty, IsOptional, IsString, Matches, MaxLength } from 'class-validator';
import { LeaveDurationType } from '../../common/enums/leave-duration-type.enum';
import { LeaveType } from '../../common/enums/leave-type.enum';
import { DATE_PATTERN } from '../../config/constants';

export class UpdateLeaveRequestDto {
  @IsEnum(LeaveType, { message: 'leaveType invalide' })
  @IsNotEmpty()
  leaveType: LeaveType;

  @IsString()
  @IsNotEmpty({ message: 'Le motif est obligatoire' })
  @MaxLength(500, { message: 'Le motif ne doit pas dépasser 500 caractères' })
  reason: string;

  @Matches(DATE_PATTERN, { message: 'startDate doit être au format YYYY-MM-DD' })
  @IsNotEmpty()
  startDate: string;

  @Matches(DATE_PATTERN, { message: 'endDate doit être au format YYYY-MM-DD' })
  @IsNotEmpty()
  endDate: string;

  @IsEnum(LeaveDurationType, { message: 'startDurationType invalide' })
  @IsOptional()
  startDurationType?: LeaveDurationType;

  @IsEnum(LeaveDurationType, { message: 'endDurationType invalide' })
  @IsOptional()
  endDurationType?: LeaveDurationType;
}