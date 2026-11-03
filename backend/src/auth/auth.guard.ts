import { CanActivate, ExecutionContext, ForbiddenException, Injectable, UnauthorizedException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { JwtService } from '@nestjs/jwt';
import { Request } from 'express';
import { AuthService } from './auth.service';
import { AuthenticatedUser, TokenPayload } from './auth.types';
import { IS_PUBLIC_KEY } from './public.decorator';

@Injectable()
export class AuthGuard implements CanActivate {
  constructor(private readonly reflector: Reflector, private readonly jwt: JwtService,
    private readonly auth: AuthService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    if (this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [context.getHandler(), context.getClass()])) return true;
    const request = context.switchToHttp().getRequest<Request & { user?: AuthenticatedUser }>();
    const authorization = request.headers.authorization;
    if (!authorization?.startsWith('Bearer ') || authorization.slice(7).trim() === '') {
      throw new UnauthorizedException('Autenticação necessária');
    }
    try {
      const payload = await this.jwt.verifyAsync<TokenPayload>(authorization.slice(7), {
        algorithms: ['HS256'],
      });
      const user = await this.auth.resolveIdentity(payload);
      if (!user) throw new Error('invalid identity');
      request.user = user;

    } catch {
      throw new UnauthorizedException('Credencial inválida ou expirada');
    }
    if (request.user?.trocaObrigatoria && !['/v1/auth/me', '/v1/auth/senha'].includes(request.path)) {
      throw new ForbiddenException('Troca de senha obrigatória antes de continuar');
    }
    return true;
  }
}
