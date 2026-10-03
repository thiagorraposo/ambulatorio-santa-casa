import 'reflect-metadata';
import { plainToInstance } from 'class-transformer';
import { validateSync } from 'class-validator';
import { ImportacaoLoteQuery } from '../../src/importacoes/dto/importacao.query';

describe('filtro paginado de ocorrências de importação', () => {
  it('transforma apenasComErro e preserva paginação padrão', () => {
    const query = plainToInstance(ImportacaoLoteQuery, { apenasComErro: 'true', limit: '5', offset: '10' });
    expect(query).toMatchObject({ apenasComErro: true, limit: 5, offset: 10 });
    expect(validateSync(query)).toEqual([]);
  });

  it('recusa booleano e paginação inválidos', () => {
    const query = plainToInstance(ImportacaoLoteQuery, { apenasComErro: 'sim', limit: '101', offset: '-1' });
    expect(validateSync(query).map(error => error.property)).toEqual(expect.arrayContaining(['apenasComErro', 'limit', 'offset']));
  });
});
