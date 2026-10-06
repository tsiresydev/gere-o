import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { AuthUser } from '../interfaces/auth-user.interface';

export const CurrentUser = createParamDecorator(
  (field: keyof AuthUser | undefined, context: ExecutionContext): AuthUser | AuthUser[keyof AuthUser] | undefined => {
    const request = context.switchToHttp().getRequest<{ user?: AuthUser }>();
    const user = request.user;
    if (!user) {
      return undefined;
    }
    return field ? user[field] : user;
  },
);
