import { Injectable } from '@nestjs/common';
import { DatabaseService } from '../common/database/database.service';
import { PageQuery } from '../clinico/dto/clinico.dto';
import { CatalogoResponse } from './dto/catalogo.response';

// Identificadores fixos; nenhum nome de tabela/coluna vem da requisição.
const CATALOGOS = {
  exames: { tabela: 'tipo_exame_complementar', id: 'tipo_exame_complementar_id',
    codigo: 'codigo_exame', nome: 'nome_exame' },
  projetos: { tabela: 'projeto_estudo', id: 'projeto_estudo_id',
    codigo: 'codigo_projeto', nome: 'nome_projeto' },
  'tipos-encaminhamento': { tabela: 'tipo_encaminhamento', id: 'tipo_encaminhamento_id',
    codigo: 'codigo_tipo', nome: 'nome_tipo' },
} as const;

export type Catalogo = keyof typeof CATALOGOS;

@Injectable()
export class CatalogosService {
  constructor(private readonly database: DatabaseService) {}

  async list(catalogo: Catalogo, query: PageQuery): Promise<CatalogoResponse[]> {
    const fonte = CATALOGOS[catalogo];
    const result = await this.database.query<CatalogoResponse>(`SELECT ${fonte.id}::text AS id,
      ${fonte.codigo} AS codigo,${fonte.nome} AS nome,ativo
      FROM ambulatorio.${fonte.tabela} WHERE ativo
      ORDER BY ${fonte.nome},${fonte.id} LIMIT $1 OFFSET $2`, [query.limit, query.offset]);
    return result.rows.map((row) => ({ id: row.id, codigo: row.codigo, nome: row.nome, ativo: row.ativo }));
  }
}
