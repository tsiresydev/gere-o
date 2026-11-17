import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { AuthUser } from '../common/interfaces/auth-user.interface';
import { ContributionsService } from './contributions.service';

/** Droit spécifique au module Cotisations, sans modifier le rôle Gere-o global. */
@Injectable()
export class ContributionValidatorGuard implements CanActivate {
  constructor(private readonly contributionsService: ContributionsService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<{ user?: AuthUser }>();
    const user = request.user;
    if (!user || !(await this.contributionsService.isValidator(user))) {
      throw new ForbiddenException(
        'Cette action est réservée aux responsables de la caisse (Tsiresy ou Mahefa)',
      );
    }
    return true;
  }
}
