import { CatalogosService, Catalogo } from '../../src/catalogos/catalogos.service';

describe('Catálogos ativos', () => {
  it.each([
    ['exames', 'tipo_exame_complementar', 'nome_exame', 'tipo_exame_complementar_id'],
    ['projetos', 'projeto_estudo', 'nome_projeto', 'projeto_estudo_id'],
    ['tipos-encaminhamento', 'tipo_encaminhamento', 'nome_tipo', 'tipo_encaminhamento_id'],
  ])('consulta %s com ID textual, ordem estável e paginação parametrizada', async (catalogo, tabela, nome, id) => {
    const query = jest.fn().mockResolvedValue({ rows: [{ id: '9007199254740993', codigo: 'sintetico',
      nome: 'Catálogo Sintético', ativo: true, descricao: 'Metadado não público', criado_em: 'interno' }] });
    const service = new CatalogosService({ query } as never);
    await expect(service.list(catalogo as Catalogo, { limit: 5, offset: 10 })).resolves.toEqual([
      { id: '9007199254740993', codigo: 'sintetico', nome: 'Catálogo Sintético', ativo: true },
    ]);
    const [sql, values] = query.mock.calls[0];
    expect(sql).toContain(`${id}::text AS id`);
    expect(sql).toContain(`FROM ambulatorio.${tabela} WHERE ativo`);
    expect(sql).toContain(`ORDER BY ${nome},${id} LIMIT $1 OFFSET $2`);
    expect(values).toEqual([5, 10]);
  });

  it('mantém resposta vazia sem fabricar opções', async () => {
    const service = new CatalogosService({ query: jest.fn().mockResolvedValue({ rows: [] }) } as never);
    await expect(service.list('exames', { limit: 20, offset: 0 })).resolves.toEqual([]);
  });
});
