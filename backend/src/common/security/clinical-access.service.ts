import { ForbiddenException, Injectable, ServiceUnavailableException, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AppConfig } from '../../config/app.config';
import { AuthenticatedUser, Perfil } from '../../auth/auth.types';
import { Transaction } from '../database/database.service';

@Injectable()
export class ClinicalAccessService {
  constructor(private readonly config: ConfigService<AppConfig, true>) {}

  get policy(): AppConfig['clinical']['accessPolicy'] {
    return this.config.get('clinical', { infer: true }).accessPolicy;
  }

  requireEnabled(): void {
    if (this.policy === 'desabilitada') throw new ServiceUnavailableException('Fluxo clínico desabilitado neste ambiente');
  }

  async identity(tx: Transaction, user: AuthenticatedUser, write = false): Promise<void> {
    this.requireEnabled();
    const result = await tx.query<{ perfil: Perfil }>(
      'SELECT perfil FROM usuario_aplicacao WHERE usuario_id=$1 AND ativo', [user.usuarioId]);
    if (result.rows.length !== 1 || result.rows[0].perfil !== user.perfil) throw new UnauthorizedException('Sessão inválida');
    if (write && user.perfil === 'consulta') throw new ForbiddenException('Operação não autorizada');
  }

  scope(user: AuthenticatedUser, position: number, alias = 'p'): { sql: string; values: string[] } {
    if (this.policy === 'todos_sinteticos' || user.perfil === 'administracao') return { sql: 'TRUE', values: [] };
    return { sql: `EXISTS (SELECT 1 FROM acesso_paciente ac WHERE ac.paciente_id=${alias}.paciente_id AND ac.usuario_id=$${position} AND ac.ativo)`, values: [user.usuarioId] };
  }

  async patient(tx: Transaction, user: AuthenticatedUser, patientId: string, write = false): Promise<void> {
    await this.identity(tx, user, write);
    if (this.policy === 'vinculo_explicito' && user.perfil !== 'administracao') {
      const grant = await tx.query<{ pode_editar: boolean }>(
        'SELECT pode_editar FROM acesso_paciente WHERE paciente_id=$1 AND usuario_id=$2 AND ativo FOR SHARE',
        [patientId, user.usuarioId]);
      if (grant.rows.length !== 1 || (write && !grant.rows[0].pode_editar)) throw new ForbiddenException('Recurso não autorizado');
    }
  }

  canCreate(user: AuthenticatedUser): boolean {
    return this.policy !== 'desabilitada' && (user.perfil === 'administracao'
      || (user.perfil === 'edicao' && this.policy === 'todos_sinteticos'));
  }

  requireCreate(user: AuthenticatedUser): void {
    this.requireEnabled();
    if (!this.canCreate(user)) {
      throw new ForbiddenException('Cadastro não autorizado para este perfil');
    }
  }
}
