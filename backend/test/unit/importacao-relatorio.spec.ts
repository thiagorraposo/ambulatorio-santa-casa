import { importacaoRelatorio } from '../../src/importacoes/importacao-relatorio';

const report = () => ({ schema: 'ambulatorio.import-quality-report/v1', mode: 'dry-run',
  metrics: { total_rows: 5, importable_rows: 3, valid_rows: 3, pending_rows: 1, rejected_rows: 2 },
  issue_counts: { pendencia_nao_promovida: 1, data_invalida: 2 },
  file_sha256: 'SEGREDO_SINTETICO', arbitrary: 'SEGREDO_SINTETICO' });

describe('relatório de importação sanitizado', () => {
  it('separa importadas sem pendência e mantém totais reais, com allowlist de campos/códigos', () => {
    expect(importacaoRelatorio(JSON.stringify(report()), true)).toEqual({ totalLinhas: 5,
      linhasImportadas: 2, linhasComPendencia: 1, linhasRejeitadas: 2,
      codigosErro: [{ codigo: 'data_invalida', total: 2 }, { codigo: 'pendencia_nao_promovida', total: 1 }] });
  });

  it.each([
    { ...report(), mode: 'apply' },
    { ...report(), schema: 'desconhecido' },
    { ...report(), metrics: { ...report().metrics, total_rows: 6 } },
    { ...report(), metrics: { ...report().metrics, rejected_rows: -1 } },
    { ...report(), metrics: { ...report().metrics, pending_rows: 1.5 } },
    { ...report(), metrics: { ...report().metrics, valid_rows: '3' } },
    { ...report(), issue_counts: { SEGREDO_SINTETICO: 3 } },
    { ...report(), issue_counts: { data_invalida: 1 } },
  ])('recusa protocolo incoerente ou fora da allowlist', invalid => {
    expect(() => importacaoRelatorio(JSON.stringify(invalid), true)).toThrow();
  });
});
