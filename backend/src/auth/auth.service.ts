import { BadRequestException, Injectable, Logger, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { compare, hash } from 'bcryptjs';
import { AppConfig } from '../config/app.config';
import { AuthRepository } from './auth.repository';
import { AuthenticatedUser, SESSION_VERSION, TokenPayload } from './auth.types';
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
    if (user.troca_obrigatoria && !await this.repository.consumeInitial(user)) {
      throw new UnauthorizedException('Credenciais inválidas');
    }
    const expiresIn = this.config.get('auth.jwtExpiresInSeconds', { infer: true });
    const accessToken = await this.jwt.signAsync({ sub: user.usuario_id, typ: 'access', ver: user.geracao_sessao ?? '0' } satisfies TokenPayload);
    this.logger.log(JSON.stringify({ event: 'authentication', outcome: 'success', userId: user.usuario_id }));
    return { accessToken, tokenType: 'Bearer', expiresIn, ...(user.troca_obrigatoria ? {trocaObrigatoria: true} : {}) };
  }

  async changePassword(identity: AuthenticatedUser, current: string, next: string) {
    if (Buffer.byteLength(next, 'utf8') > 72 || current === next) throw new BadRequestException('Escolha uma nova senha forte de até 72 bytes');
    const user = await this.repository.findByLogin(identity.login!);
    if (!user || user.usuario_id !== identity.usuarioId || (user.geracao_sessao ?? '0') !== identity[SESSION_VERSION]
      || !await compare(current, user.senha_hash)) throw new UnauthorizedException('Credencial atual inválida');
    if (!await this.repository.changePassword(user, await hash(next, 12))) throw new UnauthorizedException('Sessão inválida; procure um administrador autorizado da unidade');
    return {alterada: true};
  }

  async resolveIdentity(payload: TokenPayload): Promise<AuthenticatedUser | undefined> {
    if (payload.typ !== 'access' || !/^\d+$/.test(payload.sub)) return undefined;
    const user = await this.repository.findActiveById(payload.sub);
    if (!user || (payload.ver ?? '0') !== (user.geracao_sessao ?? '0')) return undefined;
    if (user.troca_obrigatoria && (!user.credencial_consumida_em || !user.credencial_expira_em || new Date(user.credencial_expira_em).getTime() <= Date.now())) return undefined;
    return { ...(user.troca_obrigatoria ? {trocaObrigatoria: true} : {}), [SESSION_VERSION]: user.geracao_sessao ?? '0', usuarioId: user.usuario_id, nome: user.nome, perfil: user.perfil, login: user.login, ativo: user.ativo };
  }
}
