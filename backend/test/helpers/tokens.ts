import { JwtService, JwtSignOptions } from '@nestjs/jwt';
import { UserRole } from '../../src/common/enums/user-role.enum';

export interface TokenPayload {
  sub: string;
  email: string;
  role: UserRole;
}

const secret = process.env.JWT_SECRET ?? '';

const jwtService = new JwtService({ secret });

export function signToken(
  payload: TokenPayload,
  options: { expiresIn?: JwtSignOptions['expiresIn'] } = {},
): string {
  return jwtService.sign(payload, {
    expiresIn: options.expiresIn ?? '1h',
  });
}
