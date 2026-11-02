import { ApiError } from '../../api/client';
import type { ImportacaoCodigoErro, ImportacaoRelatorioResponse } from '../../api/contracts';

const labels: Record<ImportacaoCodigoErro, string> = {
  falha_operacional: 'Falha operacional', campo_obrigatorio_ausente: 'Campo obrigatório ausente',
  data_invalida: 'Data inválida', booleano_invalido: 'Valor de sim/não inválido',
  numero_invalido: 'Número inválido', ano_invalido: 'Ano inválido', duracao_ambigua: 'Duração ambígua',
  dominio_invalido: 'Valor fora das opções permitidas', identidade_ambigua: 'Identidade ambígua',
  dados_conflitantes: 'Dados conflitantes', catalogo_indisponivel: 'Catálogo indisponível',
  proveniencia_ambigua: 'Proveniência ambígua', dados_divergentes: 'Dados divergentes',
  cadeia_reprocessamento_invalida: 'Cadeia de reprocessamento inválida', linha_rejeitada: 'Linha rejeitada',
  pendencia_nao_promovida: 'Pendência não promovida',
};

function count(value: unknown): value is number {
  return typeof value === 'number' && Number.isSafeInteger(value) && value >= 0;
}

export function readImportacaoRelatorio(value: unknown): ImportacaoRelatorioResponse {
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new ApiError(502);
  const report = value as Record<string, unknown>;
  const { totalLinhas, linhasImportadas, linhasComPendencia, linhasRejeitadas, codigosErro } = report;
  if (!count(totalLinhas) || !count(linhasImportadas) || !count(linhasComPendencia) || !count(linhasRejeitadas)
    || linhasImportadas + linhasComPendencia + linhasRejeitadas !== totalLinhas || !Array.isArray(codigosErro)) throw new ApiError(502);
  const seen = new Set<string>();
  const issues = codigosErro.map((item: unknown) => {
    if (!item || typeof item !== 'object' || Array.isArray(item)) throw new ApiError(502);
    const { codigo, total } = item as Record<string, unknown>;
    if (typeof codigo !== 'string' || !Object.hasOwn(labels, codigo) || seen.has(codigo) || !count(total) || total === 0) throw new ApiError(502);
    seen.add(codigo);
    return { codigo: codigo as ImportacaoCodigoErro, total };
  });
  if (issues.reduce((sum, item) => sum + item.total, 0) !== linhasComPendencia + linhasRejeitadas) throw new ApiError(502);
  return { totalLinhas, linhasImportadas, linhasComPendencia, linhasRejeitadas, codigosErro: issues };
}

export function ImportacaoRelatorio({ report, existing }: { report: ImportacaoRelatorioResponse; existing: boolean }) {
  return <section aria-label="Relatório da simulação">
    <h3>Linhas e ocorrências</h3>
    <p>{existing ? 'Os números descrevem o lote existente; não representam novas gravações.'
      : 'Os números descrevem o resultado simulado; os registros da planilha não foram salvos.'}</p>
    <dl className="record-grid">
      <div><dt>Total de linhas</dt><dd>{report.totalLinhas}</dd></div>
      <div><dt>Importáveis sem pendência</dt><dd>{report.linhasImportadas}</dd></div>
      <div><dt>Com pendência</dt><dd>{report.linhasComPendencia}</dd></div>
      <div><dt>Rejeitadas</dt><dd>{report.linhasRejeitadas}</dd></div>
    </dl>
    {report.codigosErro.length === 0 ? <p>Nenhuma ocorrência informada no relatório.</p>
      : <ul aria-label="Ocorrências por código">{report.codigosErro.map(item => <li key={item.codigo}>
        {labels[item.codigo]} <span className="mono">({item.codigo})</span>: {item.total}
      </li>)}</ul>}
  </section>;
}
