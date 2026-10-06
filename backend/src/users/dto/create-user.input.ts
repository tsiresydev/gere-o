import { UserRole } from '../../common/enums/user-role.enum';

export interface CreateUserInput {
  email: string;
  passwordHash: string;
  firstName: string;
  lastName: string;
  role: UserRole;
}
