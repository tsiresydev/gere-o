import { IsIn, IsOptional, IsString, MaxLength } from 'class-validator';
import { LeaveStatus } from '../../common/enums/leave-status.enum';

export class DecideLeaveRequestDto {
  @IsIn([LeaveStatus.APPROVED, LeaveStatus.REJECTED], {
    message: 'statut invalide : seuls APPROVED ou REJECTED sont acceptés',
  })
  status: LeaveStatus.APPROVED | LeaveStatus.REJECTED;

  @IsOptional()
  @IsString()
  @MaxLength(500, { message: 'Le commentaire ne doit pas dépasser 500 caractères' })
  comment?: string;
}
