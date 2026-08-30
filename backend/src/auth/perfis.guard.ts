import { CanActivate, ExecutionContext, ForbiddenException, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Request } from 'express';
import { AuthenticatedUser, Perfil } from './auth.types';
import { PERFIS_KEY } from './perfis.decorator';

@Injectable()
export class PerfisGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const required = this.reflector.getAllAndOverride<Perfil[]>(PERFIS_KEY,
      [context.getHandler(), context.getClass()]);
    if (!required?.length) return true;
    const user = context.switchToHttp().getRequest<Request & { user?: AuthenticatedUser }>().user;
    if (!user || !required.includes(user.perfil)) throw new ForbiddenException('Acesso não autorizado para este perfil');
    return true;
  }
}

