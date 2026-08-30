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
}

@Injectable()
export class AuthRepository {
  constructor(private readonly database: DatabaseService) {}

  async findByLogin(login: string): Promise<UsuarioAuthRow | undefined> {
    const result = await this.database.query<UsuarioAuthRow>(
      `SELECT usuario_id::text, nome, login, senha_hash, perfil, ativo
         FROM usuario_aplicacao WHERE login = $1 LIMIT 1`, [login]);
    return result.rows[0];
  }

  async findActiveById(usuarioId: string): Promise<Omit<UsuarioAuthRow, 'senha_hash' | 'login'> | undefined> {
    const result = await this.database.query<Omit<UsuarioAuthRow, 'senha_hash' | 'login'>>(
      `SELECT usuario_id::text, nome, perfil, ativo
         FROM usuario_aplicacao WHERE usuario_id = $1 AND ativo = TRUE LIMIT 1`, [usuarioId]);
    return result.rows[0];
  }
}

