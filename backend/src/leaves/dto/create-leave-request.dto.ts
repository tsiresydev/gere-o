import { IsEnum, IsNotEmpty, IsString, Matches, MaxLength } from 'class-validator';
import { LeaveDurationType } from '../../common/enums/leave-duration-type.enum';
import { LeaveType } from '../../common/enums/leave-type.enum';
import { DATE_PATTERN } from '../../config/constants';

export class CreateLeaveRequestDto {
  @IsEnum(LeaveType, { message: 'leaveType invalide' })
  leaveType: LeaveType;

  @IsString()
  @IsNotEmpty({ message: 'Le motif est obligatoire' })
  @MaxLength(500, { message: 'Le motif ne doit pas dépasser 500 caractères' })
  reason: string;

  @Matches(DATE_PATTERN, { message: 'startDate doit être au format YYYY-MM-DD' })
  startDate: string;

  @Matches(DATE_PATTERN, { message: 'endDate doit être au format YYYY-MM-DD' })
  endDate: string;

  @IsEnum(LeaveDurationType, { message: 'durationType invalide' })
  durationType: LeaveDurationType;
}