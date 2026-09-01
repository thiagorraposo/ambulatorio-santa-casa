import { Injectable, Logger, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { compare } from 'bcryptjs';
import { AppConfig } from '../config/app.config';
import { AuthRepository } from './auth.repository';
import { AuthenticatedUser, TokenPayload } from './auth.types';
import { LoginResponse } from './dto/login.response';

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);
  private readonly dummyHash = '$2b$12$KIXxMnrc1FvX/2W.7c4bOeGPMJvM9pSFWmN6p3qvRnpfI4HrC4Y0K';

  constructor(private readonly repository: AuthRepository, private readonly jwt: JwtService,
    private readonly config: ConfigService<AppConfig, true>) {}

  async login(rawLogin: string, senha: string): Promise<LoginResponse> {
    const login = rawLogin.trim().toLowerCase();
    const user = await this.repository.findByLogin(login);
    const validPassword = await compare(senha, user?.senha_hash ?? this.dummyHash);
    if (!user || !validPassword || !user.ativo) {
      this.logger.warn(JSON.stringify({ event: 'authentication', outcome: 'failure' }));
      throw new UnauthorizedException('Credenciais inválidas');
    }
    const expiresIn = this.config.get('auth.jwtExpiresInSeconds', { infer: true });
    const accessToken = await this.jwt.signAsync({ sub: user.usuario_id, typ: 'access' } satisfies TokenPayload);
    this.logger.log(JSON.stringify({ event: 'authentication', outcome: 'success', userId: user.usuario_id }));
    return { accessToken, tokenType: 'Bearer', expiresIn };
  }

  async resolveIdentity(payload: TokenPayload): Promise<AuthenticatedUser | undefined> {
    if (payload.typ !== 'access' || !/^\d+$/.test(payload.sub)) return undefined;
    const user = await this.repository.findActiveById(payload.sub);
    return user ? { usuarioId: user.usuario_id, nome: user.nome, perfil: user.perfil } : undefined;
  }
}
