import { Injectable } from '@nestjs/common';
import { Perfil } from '../auth/auth.types';
import { PageQuery } from '../clinico/dto/clinico.dto';
import { DatabaseService } from '../common/database/database.service';

export interface UsuarioResumo { usuarioId: string; nome: string; perfil: Perfil }

@Injectable()
export class UsuariosService {
  constructor(private readonly database: DatabaseService) {}

  async list(query: PageQuery): Promise<UsuarioResumo[]> {
    const result = await this.database.query<UsuarioResumo>(`SELECT usuario_id::text AS "usuarioId",nome,perfil
      FROM ambulatorio.usuario_aplicacao ORDER BY nome,usuario_id LIMIT $1 OFFSET $2`, [query.limit, query.offset]);
    return result.rows.map(row => ({ usuarioId: row.usuarioId, nome: row.nome, perfil: row.perfil }));
  }
}
