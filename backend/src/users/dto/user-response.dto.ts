import { UserRole } from '../../common/enums/user-role.enum';
import { UserDocument } from '../entities/user.schema';

export class UserResponseDto {
  id: string;

  firstName: string;

  lastName: string;

  email: string;

  role: UserRole;

  isActive: boolean;

  createdAt?: Date;

  updatedAt?: Date;

  static from(user: UserDocument): UserResponseDto {
    const dto = new UserResponseDto();
    dto.id = String(user._id);
    dto.firstName = user.firstName;
    dto.lastName = user.lastName;
    dto.email = user.email;
    dto.role = user.role;
    dto.isActive = user.isActive;
    dto.createdAt = user.createdAt;
    dto.updatedAt = user.updatedAt;
    return dto;
  }
}
