import { UserResponseDto } from '../../users/dto/user-response.dto';

export interface LoginResponseDto {
  accessToken: string;
  user: UserResponseDto;
}
