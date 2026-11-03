import { Injectable, NotFoundException } from '@nestjs/common';
import { Perfil } from '../auth/auth.types';
import { PageQuery } from '../clinico/dto/clinico.dto';
import { DatabaseService } from '../common/database/database.service';

export interface UsuarioResumo { usuarioId: string; nome: string; perfil: Perfil; login: string; ativo: boolean }

@Injectable()
export class UsuariosService {
  constructor(private readonly database: DatabaseService) {}

  async get(usuarioId: string): Promise<UsuarioResumo> {
    const result = await this.database.query<UsuarioResumo>(`SELECT usuario_id::text AS "usuarioId",nome,perfil,login,ativo
      FROM ambulatorio.usuario_aplicacao WHERE usuario_id=$1`, [usuarioId]);
    const row = result.rows[0];
    if (!row) throw new NotFoundException('Usuário não disponível');
    return { usuarioId: row.usuarioId, nome: row.nome, perfil: row.perfil, login: row.login, ativo: row.ativo };
  }

  async list(query: PageQuery): Promise<UsuarioResumo[]> {
    const result = await this.database.query<UsuarioResumo>(`SELECT usuario_id::text AS "usuarioId",nome,perfil,login,ativo
      FROM ambulatorio.usuario_aplicacao ORDER BY nome,usuario_id LIMIT $1 OFFSET $2`, [query.limit, query.offset]);
    return result.rows.map(row => ({ usuarioId: row.usuarioId, nome: row.nome, perfil: row.perfil, login: row.login, ativo: row.ativo }));
  }
}
