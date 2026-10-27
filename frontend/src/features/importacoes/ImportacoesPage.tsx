import { Link, useLocation, useParams, useSearchParams } from 'react-router';
import type { ImportacaoLoteDetalheResponse, ImportacaoLoteResponse } from '../../api/contracts';
import { useApiQuery } from '../../api/useApiQuery';
import { useSession } from '../../app/session';
import { Card, EmptyState, PageHeading, QueryState, TableScroll } from '../../shared/ui';
import { Pagination, usePage } from '../pacientes/pagination';

function date(value: string | null) {
  if (!value) return '—';
  const parsed = new Date(value);
  return Number.isNaN(parsed.valueOf()) ? '—' : new Intl.DateTimeFormat('pt-BR', { dateStyle: 'short', timeStyle: 'short' }).format(parsed);
}

export function ImportacoesPage() {
  const session = useSession();
  const page = usePage('lotes');
  const query = useApiQuery<ImportacaoLoteResponse[]>(`/importacoes/lotes?limit=${page.limit}&offset=${page.offset}`);
  const location = useLocation();
  return <>
    <PageHeading title="Importações" description="Consulte os lotes e as linhas disponíveis para seu acesso." />
    {session.user && session.user.perfil !== 'consulta' && <Link className="button" to="/importacoes/simular">Simular planilha</Link>}
    <Card>
      <h2>Lotes disponíveis</h2>
      <QueryState query={query} emptyMessage="Nenhum lote disponível nesta página para seu acesso.">
        {rows => rows.length === 0 ? <EmptyState>Nenhum lote disponível nesta página para seu acesso.</EmptyState> :
          <TableScroll label="Lotes de importação"><table className="data-table">
            <caption className="sr-only">Lotes disponíveis nesta página</caption>
            <thead><tr><th scope="col">Código</th><th scope="col">Estado</th><th scope="col">Linhas</th><th scope="col">Atualizado</th><th scope="col">Detalhe</th></tr></thead>
            <tbody>{rows.map(row => <tr key={row.loteId}>
              <td>{row.codigo}</td><td>{row.status}</td><td>{row.totalLinhas}</td><td>{date(row.atualizadoEm)}</td>
              <td><Link to={`/importacoes/lotes/${encodeURIComponent(row.loteId)}`} state={{ from: `${location.pathname}${location.search}` }}>Consultar</Link></td>
            </tr>)}</tbody>
          </table></TableScroll>}
      </QueryState>
      <Pagination label="lotes" {...page} count={query.isSuccess && !query.isFetching ? query.data.length : undefined}
        onChange={page.changePage} />
      <p className="muted">A lista considera seu acesso e mostra somente esta página; uma página vazia não indica ausência de outros lotes.</p>
    </Card>
  </>;
}

export function ImportacaoDetalhePage() {
  const { loteId = '' } = useParams();
  const page = usePage('linhas');
  const [params, setParams] = useSearchParams();
  const apenasComErro = params.get('apenasComErro') === 'true';
  const query = useApiQuery<ImportacaoLoteDetalheResponse>(
    `/importacoes/lotes/${encodeURIComponent(loteId)}?limit=${page.limit}&offset=${page.offset}&apenasComErro=${apenasComErro}`,
  );
  const location = useLocation();
  const from = (location.state as { from?: string } | null)?.from;
  const back = from?.startsWith('/importacoes?') ? from : '/importacoes';
  return <>
    <Link to={back} className="back-link">← Voltar para importações</Link>
    <PageHeading title="Detalhe da importação" description="Metadados e linhas publicados para seu acesso." />
    <Card>
      <label className="checkbox-field"><input type="checkbox" checked={apenasComErro} onChange={event => {
        const next = new URLSearchParams(params); next.set('apenasComErro', String(event.target.checked));
        next.set('linhasOffset', '0'); setParams(next);
      }} /> Somente linhas com erro</label>
      <QueryState query={query}>
        {batch => <>
          <h2>{batch.codigo}</h2>
          <dl className="record-grid">
            <div><dt>Estado</dt><dd>{batch.status}</dd></div><div><dt>Layout</dt><dd>{batch.layout}</dd></div>
            <div><dt>Criado em</dt><dd>{date(batch.criadoEm)}</dd></div><div><dt>Total de linhas</dt><dd>{batch.totalLinhas}</dd></div>
            <div><dt>Importadas</dt><dd>{batch.linhasImportadas}</dd></div><div><dt>Com pendência</dt><dd>{batch.linhasComPendencia}</dd></div>
            <div><dt>Rejeitadas</dt><dd>{batch.linhasRejeitadas}</dd></div>
            <div><dt>Código do erro do lote</dt><dd>{batch.codigoErro ?? '—'}</dd></div>
          </dl>
          {batch.linhas.length === 0 ? <EmptyState>Nenhuma linha nesta página para o filtro e o acesso atuais.</EmptyState> :
            <TableScroll label="Linhas do lote de importação"><table className="data-table">
              <caption className="sr-only">Linhas disponíveis nesta página</caption>
              <thead><tr><th scope="col">Aba</th><th scope="col">Linha</th><th scope="col">Estado</th><th scope="col">Código do erro</th></tr></thead>
              <tbody>{batch.linhas.map(line => <tr key={line.linhaId}>
                <td>{line.aba}</td><td>{line.numero}</td><td>{line.status}</td><td>{line.codigoErro ?? '—'}</td>
              </tr>)}</tbody>
            </table></TableScroll>}
          <Pagination label="linhas" {...page} count={query.isSuccess && !query.isFetching ? batch.linhas.length : undefined}
            onChange={page.changePage} />
          <p className="muted">São exibidos apenas campos sanitizados. Conteúdo original e detalhes internos de processamento não são publicados nesta tela.</p>
        </>}
      </QueryState>
    </Card>
  </>;
}
