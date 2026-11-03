import { Injectable } from '@nestjs/common';
import { DatabaseService } from '../common/database/database.service';
import { PageQuery } from '../clinico/dto/clinico.dto';
import { CatalogoResponse, ComorbidadeCatalogoResponse, MedicamentoCatalogoResponse } from './dto/catalogo.response';

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
  async listComorbidades(query: PageQuery): Promise<ComorbidadeCatalogoResponse[]> {
    const result = await this.database.query<ComorbidadeCatalogoResponse>(`SELECT comorbidade_id::text AS id,
      nome_comorbidade AS nome,ativo FROM ambulatorio.comorbidade WHERE ativo
      ORDER BY nome_comorbidade,comorbidade_id LIMIT $1 OFFSET $2`, [query.limit, query.offset]);
    return result.rows.map(row => ({ id: row.id, nome: row.nome, ativo: row.ativo }));
  }

  async listMedicamentos(query: PageQuery): Promise<MedicamentoCatalogoResponse[]> {
    const result = await this.database.query<MedicamentoCatalogoResponse>(`SELECT medicamento_id::text AS id,
      codigo_medicamento AS codigo,nome_medicamento AS nome,ativo,
      principio_ativo AS "principioAtivo",classe_medicamento AS "classeMedicamento"
      FROM ambulatorio.medicamento WHERE ativo ORDER BY nome_medicamento,medicamento_id
      LIMIT $1 OFFSET $2`, [query.limit, query.offset]);
    return result.rows.map(row => ({ id: row.id, codigo: row.codigo, nome: row.nome, ativo: row.ativo,
      principioAtivo: row.principioAtivo, classeMedicamento: row.classeMedicamento }));
  }

}
