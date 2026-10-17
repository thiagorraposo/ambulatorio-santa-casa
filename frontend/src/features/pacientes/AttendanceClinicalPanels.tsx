import type { DadosClinicosResponse, DiagnosticoChagasResponse } from '../../api/contracts';
import { clinicalLabel, displayText, formatClinicalDate, formatNumeric, triState } from '../../shared/formatters';
import { Card, EmptyState } from '../../shared/ui';
import { Fields } from './components';

export function AttendanceClinicalAssessment({ clinical }: { clinical: DadosClinicosResponse | null }) {
  return <Card>
    <h2>Dados clínicos deste atendimento</h2>
    {clinical === null ? <EmptyState>Dados clínicos não registrados neste atendimento.</EmptyState> : <Fields items={[
      ['Altura', formatNumeric(clinical.alturaCm, 'cm')], ['Peso', formatNumeric(clinical.pesoKg, 'kg')],
      ['Circunferência abdominal', formatNumeric(clinical.circunferenciaAbdominalCm, 'cm')],
      ['Frequência cardíaca', formatNumeric(clinical.frequenciaCardiacaBpm, 'bpm')],
      ['Saturação', formatNumeric(clinical.saturacaoPercentual, '%')],
      ['PA sistólica', formatNumeric(clinical.paSistolicaMmhg, 'mmHg')],
      ['PA diastólica', formatNumeric(clinical.paDiastolicaMmhg, 'mmHg')],
      ['NYHA', clinicalLabel(clinical.nyha)], ['Observações', displayText(clinical.observacoes)],
    ]} />}
  </Card>;
}

export function AttendanceChagasDiagnosis({ diagnosis }: { diagnosis: DiagnosticoChagasResponse | null }) {
  return <Card>
    <h2>Diagnóstico de Chagas deste atendimento</h2>
    {diagnosis === null ? <EmptyState>Diagnóstico não registrado neste atendimento.</EmptyState> : <Fields items={[
      ['Possui diagnóstico', triState(diagnosis.possuiDiagnosticoChagas)],
      ['Status', clinicalLabel(diagnosis.statusDiagnostico)], ['Resultado final', clinicalLabel(diagnosis.resultadoFinal)],
      ['Data do resultado final', formatClinicalDate(diagnosis.dataResultadoFinal)],
      ['Descoberta por autorrelato', formatClinicalDate(diagnosis.dataDescobertaAutorelato)],
      ['Critério de confirmação', clinicalLabel(diagnosis.criterioConfirmacao)], ['Observações', displayText(diagnosis.observacoes)],
    ]} />}
  </Card>;
}
