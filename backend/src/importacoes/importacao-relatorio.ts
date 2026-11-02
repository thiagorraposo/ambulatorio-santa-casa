import type { ImportacaoCodigoErro, ImportacaoRelatorioResponse } from './dto/importacao.response';

const issueCodes: readonly ImportacaoCodigoErro[] = [
  'falha_operacional', 'campo_obrigatorio_ausente', 'data_invalida', 'booleano_invalido',
  'numero_invalido', 'ano_invalido', 'duracao_ambigua', 'dominio_invalido', 'identidade_ambigua',
  'dados_conflitantes', 'catalogo_indisponivel', 'proveniencia_ambigua', 'dados_divergentes',
  'cadeia_reprocessamento_invalida', 'linha_rejeitada', 'pendencia_nao_promovida',
];

function object(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error('Relatório inválido');
  return value as Record<string, unknown>;
}
function count(value: unknown): number {
  if (typeof value !== 'number' || !Number.isSafeInteger(value) || value < 0) throw new Error('Contagem inválida');
  return value;
}

/** Projeta somente totais/códigos fechados; nunca repassa stdout ou metadados do worker. */
export function importacaoRelatorio(stdout: string, dryRun: boolean): ImportacaoRelatorioResponse {
  const report = object(JSON.parse(stdout));
  if (report.schema !== 'ambulatorio.import-quality-report/v1'
    || report.mode !== (dryRun ? 'dry-run' : 'apply')) throw new Error('Contrato do relatório inválido');
  const metrics = object(report.metrics);
  const totalLinhas = count(metrics.total_rows);
  const importadas = count(metrics.importable_rows);
  const linhasComPendencia = count(metrics.pending_rows);
  const linhasRejeitadas = count(metrics.rejected_rows);
  if (linhasComPendencia > importadas || importadas + linhasRejeitadas !== totalLinhas
    || count(metrics.valid_rows) !== importadas) throw new Error('Totais inconsistentes');
  const issues = object(report.issue_counts);
  const codigosErro = Object.entries(issues).map(([codigo, total]) => {
    if (!issueCodes.includes(codigo as ImportacaoCodigoErro)) throw new Error('Código desconhecido');
    return { codigo: codigo as ImportacaoCodigoErro, total: count(total) };
  }).filter(item => item.total > 0).sort((a, b) => a.codigo.localeCompare(b.codigo));
  if (codigosErro.reduce((sum, item) => sum + item.total, 0) !== linhasComPendencia + linhasRejeitadas) {
    throw new Error('Códigos inconsistentes');
  }
  return { totalLinhas, linhasImportadas: importadas - linhasComPendencia,
    linhasComPendencia, linhasRejeitadas, codigosErro };
}
