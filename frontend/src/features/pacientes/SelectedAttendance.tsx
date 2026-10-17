import { useEffect, useId, useRef } from 'react';
import { Link, useSearchParams } from 'react-router';
import type { AtendimentoDetalheResponse, AtendimentoResumoResponse } from '../../api/contracts';
import { useApiQuery } from '../../api/useApiQuery';
import { formatClinicalDate } from '../../shared/formatters';
import { Card, EmptyState, QueryState } from '../../shared/ui';
import { AttendanceChagasDiagnosis, AttendanceClinicalAssessment } from './AttendanceClinicalPanels';
import { pagePath, Pagination, usePage } from './pagination';

export type AttendanceClinicalSection = 'chagas' | 'avaliacao';

function validAttendanceId(value: string): boolean {
  return /^[1-9]\d{0,18}$/.test(value) && (value.length < 19 || value <= '9223372036854775807');
}

function SelectedAttendanceDetail({ pacienteId, atendimentoId, section }: {
  pacienteId: string; atendimentoId: string; section: AttendanceClinicalSection;
}) {
  const path = `/pacientes/${encodeURIComponent(pacienteId)}/atendimentos/${encodeURIComponent(atendimentoId)}`;
  const query = useApiQuery<AtendimentoDetalheResponse>(`${path}?limit=1&offset=0`);
  return <QueryState query={query}>{record => record.atendimentoId !== atendimentoId
    ? <Card><p role="alert">A consulta não confirmou o atendimento selecionado. Confira a seleção antes de continuar.</p></Card>
    : <>
      <Card>
        <h2>Consulta selecionada</h2>
        <p>Atendimento <span className="mono">{record.atendimentoId}</span> · Data: {formatClinicalDate(record.dataAtendimento)}.</p>
        <p className="muted">Os dados abaixo pertencem somente a este atendimento.</p>
        <Link to={path}>Abrir detalhe do atendimento <span className="mono">{record.atendimentoId}</span></Link>
      </Card>
      {section === 'chagas' ? <AttendanceChagasDiagnosis diagnosis={record.diagnosticoChagas} />
        : <AttendanceClinicalAssessment clinical={record.dadosClinicos} />}
    </>}
  </QueryState>;
}

export function SelectedAttendance({ pacienteId, section }: { pacienteId: string; section: AttendanceClinicalSection }) {
  const [search, setSearch] = useSearchParams();
  const selected = search.get('atendimentoId') ?? '';
  const valid = validAttendanceId(selected);
  const page = usePage('consulta');
  const path = `/pacientes/${encodeURIComponent(pacienteId)}/atendimentos`;
  const query = useApiQuery<AtendimentoResumoResponse[]>(pagePath(path, page.limit, page.offset));
  const unavailable = query.isError && (query.error.status === 403 || query.error.status === 404);
  const id = useId();
  const heading = useRef<HTMLHeadingElement>(null);
  const previousPage = useRef(`${page.limit}:${page.offset}`);
  const needsFocus = useRef(false);
  useEffect(() => {
    const key = `${page.limit}:${page.offset}`;
    if (previousPage.current !== key) needsFocus.current = true;
    previousPage.current = key;
    if (needsFocus.current && !query.isFetching && !query.isPending) {
      heading.current?.focus();
      needsFocus.current = false;
    }
  }, [page.limit, page.offset, query.isFetching, query.isPending]);
  return <>
    <Card>
      <h2 ref={heading} tabIndex={-1}>Escolher consulta</h2>
      <QueryState query={query}>{rows => <>
        <div className="form-field"><label htmlFor={id}>Atendimento para consulta clínica</label>
          <select id={id} value={valid ? selected : ''} onChange={event => {
            const next = new URLSearchParams(search);
            if (event.target.value) next.set('atendimentoId', event.target.value);
            else next.delete('atendimentoId');
            setSearch(next);
          }}>
            <option value="">Selecione um atendimento</option>
            {valid && !rows.some(row => row.atendimentoId === selected)
              && <option value={selected}>Atendimento {selected} (seleção fora desta página)</option>}
            {rows.map(row => <option key={row.atendimentoId} value={row.atendimentoId}>
              {formatClinicalDate(row.dataAtendimento)} · Atendimento {row.atendimentoId}
            </option>)}
          </select>
        </div>
        {rows.length === 0 && <EmptyState>Nenhum atendimento nesta página de opções.</EmptyState>}
      </>}</QueryState>
      <Pagination label="consultas clínicas" {...page} onChange={page.changePage}
        count={query.isSuccess && !query.isFetching ? query.data.length : undefined} />
    </Card>
    {!unavailable && (selected === '' ? <EmptyState>Selecione um atendimento para consultar os dados registrados naquela consulta.</EmptyState>
      : !valid ? <Card><p role="alert">Identificador de atendimento inválido. Escolha uma consulta disponível.</p></Card>
        : <SelectedAttendanceDetail key={`${pacienteId}:${selected}`} pacienteId={pacienteId} atendimentoId={selected} section={section} />)}
  </>;
}
