import { useEffect, useRef, useState, type FormEvent } from 'react';
import { Link } from 'react-router';
import { ApiClient, ApiError, isAbort } from '../../api/client';
import type { ImportacaoFinalidade, ImportacaoSubmitResponse } from '../../api/contracts';
import { useSession } from '../../app/session';
import { ApiErrorState, Card, PageHeading } from '../../shared/ui';

export default function ImportacaoSimulacaoPage() {
  const session = useSession();
  if (!session.user || session.user.perfil === 'consulta') return <ApiErrorState error={new ApiError(403)} />;
  return <SimulationForm key={`${session.draftScope}:${session.generation}`} client={session.client} />;
}

function SimulationForm({ client }: { client: ApiClient }) {
  const [file, setFile] = useState<File | null>(null);
  const [purpose, setPurpose] = useState<Exclude<ImportacaoFinalidade, 'revisao'>>('carga_inicial');
  const [code, setCode] = useState('');
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<ImportacaoSubmitResponse | null>(null);
  const [error, setError] = useState<{ message: string } | null>(null);
  const fileInput = useRef<HTMLInputElement>(null);
  const feedback = useRef<HTMLDivElement>(null);
  const pending = useRef(false);
  const revision = useRef(0);
  const controller = useRef<AbortController | null>(null);
  useEffect(() => () => { revision.current++; controller.current?.abort(); }, []);
  useEffect(() => { if (error || result) feedback.current?.focus(); }, [error, result]);

  const invalidate = () => {
    revision.current++;
    controller.current?.abort();
    pending.current = false;
    setBusy(false);
    setResult(null);
    setError(null);
  };
  const cancel = () => {
    invalidate();
    setFile(null);
    if (fileInput.current) { fileInput.current.value = ''; fileInput.current.focus(); }
  };
  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (pending.current) return;
    setResult(null);
    setError(null);
    if (!file || !file.name.toLowerCase().endsWith('.xlsx') || file.size > 10 * 1024 * 1024) {
      setError({ message: 'Selecione um arquivo XLSX de até 10 MiB.' });
      return;
    }
    if (!/^[a-z0-9][a-z0-9_-]{0,98}$/i.test(code)) {
      setError({ message: 'Informe um código de lote com 1 a 99 letras, números, hífen ou sublinhado, começando por letra ou número.' });
      return;
    }
    pending.current = true;
    setBusy(true);
    const current = ++revision.current;
    const request = new AbortController();
    controller.current = request;
    const body = new FormData();
    body.append('arquivo', file);
    body.append('finalidade', purpose);
    body.append('codigoLote', code);
    body.append('dryRun', 'true');
    try {
      const response = await client.request<ImportacaoSubmitResponse>('/importacoes', {
        method: 'POST', body, signal: request.signal,
      });
      if (current !== revision.current) return;
      const knownStatus = ['recebido', 'validando', 'pronto', 'processando', 'concluido',
        'concluido_com_pendencias', 'falhou', 'cancelado'];
      const validLot = response.loteId === null
        ? response.status === 'dry_run_concluido' && response.codigoLote === code
        : typeof response.loteId === 'string' && /^[1-9]\d{0,18}$/.test(response.loteId)
          && knownStatus.includes(response.status);
      if (response.dryRun !== true || !validLot || typeof response.codigoLote !== 'string'
        || !/^[a-z0-9][a-z0-9_-]{0,98}$/i.test(response.codigoLote)
        || response.codigoLoteSolicitado !== code) throw new ApiError(502);
      setResult(response);
    } catch (failure) {
      if (current !== revision.current || isAbort(failure)) return;
      setError({ message: failure instanceof ApiError ? failure.message : new ApiError(0).message });
    } finally {
      if (current === revision.current) { pending.current = false; setBusy(false); }
    }
  };
  return <>
    <PageHeading title="Simular planilha" description="Confira uma planilha sintética antes de importar. Esta simulação não grava os dados da planilha." />
    <Link to="/importacoes">Voltar aos lotes</Link>
    <Card>
      <p>A revisão temporal entre arquivos é um processo separado. Use aqui a carga inicial ou a verificação de conteúdo já enviado.</p>
      <form noValidate onSubmit={event => { void submit(event); }} aria-busy={busy}>
        <div className="form-field"><label htmlFor="simulation-file">Arquivo XLSX sintético</label>
          <input ref={fileInput} id="simulation-file" type="file" accept=".xlsx" aria-describedby="simulation-file-help"
            onChange={event => { invalidate(); setFile(event.target.files?.[0] ?? null); }} />
          <p id="simulation-file-help" className="muted">Até 10 MiB. A seleção é descartada ao sair da página. O arquivo é enviado ao serviço somente ao simular.</p></div>
        <div className="form-field"><label htmlFor="simulation-purpose">Finalidade</label>
          <select id="simulation-purpose" value={purpose} onChange={event => {
            invalidate(); setPurpose(event.target.value as typeof purpose);
          }}><option value="carga_inicial">Carga inicial</option><option value="mesmo_conteudo">Mesmo conteúdo</option></select></div>
        <div className="form-field"><label htmlFor="simulation-code">Código do lote</label>
          <input id="simulation-code" value={code} maxLength={99} aria-describedby="simulation-code-help"
            onChange={event => { invalidate(); setCode(event.target.value); }} />
          <p id="simulation-code-help" className="muted">Comece por letra ou número; use letras, números, hífen ou sublinhado.</p></div>
        <div className="form-actions"><button type="submit" className="button" disabled={busy}>Simular planilha</button>
          <button type="button" className="button button-secondary" onClick={cancel}>Cancelar seleção</button></div>
        {busy && <p role="status">Simulando a planilha…</p>}
      </form>
      {error && <div ref={feedback} tabIndex={-1} className="error-state" role="alert">{error.message}</div>}
      {result && <div ref={feedback} tabIndex={-1} role="status"><h2>Simulação concluída</h2>
        <p>Nenhum lote foi criado por esta simulação.</p><p>Código solicitado: {result.codigoLoteSolicitado}</p>
        {result.loteId !== null && <><p>Código do lote existente: {result.codigoLote}</p>
          <Link to={`/importacoes/lotes/${encodeURIComponent(result.loteId)}`}>Consultar lote existente {result.loteId}</Link></>}
        <p>A confirmação da importação é uma operação separada.</p></div>}
    </Card>
  </>;
}
