import type { AtendimentoResumoResponse } from '../../api/contracts';
import { Link } from 'react-router';
import { useApiQuery } from '../../api/useApiQuery';
import { displayText, formatClinicalDate, triState } from '../../shared/formatters';
import { Card, EmptyState, QueryState } from '../../shared/ui';
import { Fields } from './components';

export function LatestAttendance({ pacienteId }: { pacienteId: string }) {
  const path = `/pacientes/${encodeURIComponent(pacienteId)}/atendimentos?limit=1&offset=0`;
  const query = useApiQuery<AtendimentoResumoResponse[]>(path);
  return <Card>
    <h2>Último atendimento por data registrada</h2>
    <QueryState query={query}>{rows => {
      const attendance = rows[0];
      if (!attendance) return <EmptyState>Nenhum atendimento registrado.</EmptyState>;
      return <>
        <Fields items={[
          ['Data do atendimento', formatClinicalDate(attendance.dataAtendimento)],
          ['Atendimento', <Link to={`/pacientes/${encodeURIComponent(pacienteId)}/atendimentos/${encodeURIComponent(attendance.atendimentoId)}`}>
            Abrir último atendimento <span className="mono">{attendance.atendimentoId}</span>
          </Link>],
          ['Localização do prontuário', displayText(attendance.localizacaoProntuario)],
          ['Somente ambulatório', triState(attendance.ambulatorioUnicamente)],
          ['Ambulatório anexo a projeto', triState(attendance.ambulatorioAnexoProjeto)],
          ['Observações do atendimento', displayText(attendance.observacoes)],
        ]} />
        {attendance.dataAtendimento === null && <p className="muted">
          A data deste atendimento não foi informada; este registro não comprova a ordem cronológica das consultas.
        </p>}
      </>;
    }}</QueryState>
  </Card>;
}
