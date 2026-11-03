import { Injectable } from '@nestjs/common';
import { DatabaseService } from '../common/database/database.service';
import { Perfil } from './auth.types';

export interface UsuarioAuthRow {
  usuario_id: string;
  nome: string;
  login: string;
  senha_hash: string;
  perfil: Perfil;
  ativo: boolean;
  geracao_sessao: string;
  troca_obrigatoria?: boolean;
  credencial_expira_em?: Date;
  credencial_consumida_em?: Date;
}

@Injectable()
export class AuthRepository {
  constructor(private readonly database: DatabaseService) {}

  async consumeInitial(user: UsuarioAuthRow): Promise<boolean> {
    const result = await this.database.query<{ok: boolean}>(
      'SELECT ambulatorio.consumir_credencial_inicial($1,$2,$3) AS ok', [user.usuario_id, user.senha_hash, user.geracao_sessao ?? '0']);
    return result.rows[0]?.ok === true;
  }

  async changePassword(user: UsuarioAuthRow, newHash: string): Promise<boolean> {
    return this.database.transaction(async tx => {
      const result = await tx.query<{ok: boolean}>(
        'SELECT ambulatorio.trocar_senha_usuario($1,$2,$3) AS ok', [user.senha_hash, newHash, user.geracao_sessao ?? '0']);
      return result.rows[0]?.ok === true;
    }, user.usuario_id);
  }

  async findByLogin(login: string): Promise<UsuarioAuthRow | undefined> {
    const result = await this.database.query<UsuarioAuthRow>(
      `SELECT usuario_id::text, nome, login, senha_hash, perfil, ativo, geracao_sessao::text, troca_obrigatoria, credencial_expira_em, credencial_consumida_em
         FROM usuario_aplicacao WHERE login = $1 LIMIT 1`, [login]);
    return result.rows[0];
  }

  async findActiveById(usuarioId: string): Promise<Omit<UsuarioAuthRow, 'senha_hash'> | undefined> {
    const result = await this.database.query<Omit<UsuarioAuthRow, 'senha_hash'>>(
      `SELECT usuario_id::text, nome, perfil, login, ativo, geracao_sessao::text, troca_obrigatoria, credencial_expira_em, credencial_consumida_em
         FROM usuario_aplicacao WHERE usuario_id = $1 AND ativo = TRUE LIMIT 1`, [usuarioId]);
    return result.rows[0];
  }
}

