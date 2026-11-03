import { ConflictException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { AuthenticatedUser, Perfil, SESSION_VERSION } from '../auth/auth.types';
import { PageQuery } from '../clinico/dto/clinico.dto';
import { AlterarEstadoDto, AlterarPerfilDto } from './usuarios.dto';
import { DatabaseService } from '../common/database/database.service';

export interface UsuarioResumo { usuarioId: string; nome: string; perfil: Perfil; login: string; ativo: boolean; versao: string }

@Injectable()
export class UsuariosService {
  constructor(private readonly database: DatabaseService) {}

  async get(usuarioId: string): Promise<UsuarioResumo> {
    const result = await this.database.query<UsuarioResumo>(`SELECT usuario_id::text AS "usuarioId",nome,perfil,login,ativo,versao_conta::text AS "versao"
      FROM ambulatorio.usuario_aplicacao WHERE usuario_id=$1`, [usuarioId]);
    const row = result.rows[0];
    if (!row) throw new NotFoundException('Usuário não disponível');
    return { usuarioId: row.usuarioId, nome: row.nome, perfil: row.perfil, login: row.login, ativo: row.ativo, versao: row.versao };
  }

  async operation(usuarioId: string, operacaoId: string): Promise<ContaRecibo> {
    const result = await this.database.query<{ recibo: ContaRecibo }>(`SELECT recibo FROM ambulatorio.usuario_conta_operacao
      WHERE usuario_id=$1 AND operacao_id=$2`, [usuarioId, operacaoId]);
    if (!result.rows[0]) throw new NotFoundException('Recibo não disponível; resultado ainda indeterminado');
    return result.rows[0].recibo;
  }

  async changeProfile(user: AuthenticatedUser, usuarioId: string, dto: AlterarPerfilDto): Promise<PerfilRecibo> {
    return this.change(user, usuarioId, dto, 'perfil') as Promise<PerfilRecibo>;
  }

  async changeState(user: AuthenticatedUser, usuarioId: string, dto: AlterarEstadoDto): Promise<EstadoRecibo> {
    return this.change(user, usuarioId, dto, 'estado') as Promise<EstadoRecibo>;
  }

  private async change(user: AuthenticatedUser, usuarioId: string, dto: AlterarPerfilDto | AlterarEstadoDto, kind: 'perfil' | 'estado'): Promise<ContaRecibo> {
    let receipt: ContaRecibo;
    try {
      receipt = await this.database.transaction(async tx => {
        const result = await tx.query<{ recibo: ContaRecibo }>(
          `SELECT ambulatorio.${kind === 'perfil' ? 'alterar_perfil_usuario' : 'alterar_estado_usuario'}($1,$2,$3,$4,$5,$6) AS recibo`,
          [usuarioId, dto.versao, 'perfil' in dto ? dto.perfil : dto.ativo, dto.justificativa, dto.operacaoId, user[SESSION_VERSION] ?? '0']);
        return result.rows[0].recibo;
      }, user.usuarioId);
    } catch (error) {
      const code = (error as { code?: string }).code;
      if (code === '42501') throw new ForbiddenException('Administração vigente necessária');
      if (code === '23505') throw new ConflictException('Código de operação já utilizado');
      throw error;
    }
    // Recusas são commitadas antes da resposta HTTP para recuperação autoritativa.
    if (receipt.resultado === 'autoacao_proibida') throw new ForbiddenException('Procure outro administrador');
    if (receipt.resultado === 'alvo_inexistente') throw new NotFoundException('Usuário não disponível');
    if (receipt.resultado !== 'aplicada') throw new ConflictException('Revise o estado atual e o recibo da operação');
    return receipt;
  }

  async list(query: PageQuery): Promise<UsuarioResumo[]> {
    const result = await this.database.query<UsuarioResumo>(`SELECT usuario_id::text AS "usuarioId",nome,perfil,login,ativo,versao_conta::text AS "versao"
      FROM ambulatorio.usuario_aplicacao ORDER BY nome,usuario_id LIMIT $1 OFFSET $2`, [query.limit, query.offset]);
    return result.rows.map(row => ({ usuarioId: row.usuarioId, nome: row.nome, perfil: row.perfil, login: row.login, ativo: row.ativo, versao: row.versao }));
  }
}

interface ReciboBase {
  operacaoId: string; usuarioId: string; atorUsuarioId: string; instante: string;
  resultado: 'aplicada' | 'autoacao_proibida' | 'alvo_inexistente' | 'versao_obsoleta' | 'ultimo_administrador' | 'perfil_inalterado' | 'estado_inalterado';
  versaoAnterior: string | null; versaoNova: string | null; justificativa: string;
}

export type PerfilRecibo = ReciboBase & { operacao: 'perfil'; anterior: Perfil | null; novo: Perfil };
export type EstadoRecibo = ReciboBase & { operacao: 'estado'; anterior: boolean | null; novo: boolean };
export type ContaRecibo = PerfilRecibo | EstadoRecibo;
