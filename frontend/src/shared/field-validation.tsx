import { createContext, useContext, type ReactNode } from 'react';

export interface FieldViolation { path: string; code: string }
const labels: Record<string, string> = {
  dataAtendimento: 'Data do atendimento', localizacaoProntuario: 'Localização do prontuário',
  ambulatorioUnicamente: 'Somente ambulatório', ambulatorioAnexoProjeto: 'Ambulatório anexo a projeto', observacoes: 'Observações do atendimento',
  'dadosClinicos.alturaCm': 'Altura (cm)', 'dadosClinicos.pesoKg': 'Peso (kg)',
  'dadosClinicos.circunferenciaAbdominalCm': 'Circunferência abdominal (cm)', 'dadosClinicos.frequenciaCardiacaBpm': 'Frequência cardíaca (bpm)',
  'dadosClinicos.saturacaoPercentual': 'Saturação (%)', 'dadosClinicos.paSistolicaMmhg': 'PA sistólica (mmHg)',
  'dadosClinicos.paDiastolicaMmhg': 'PA diastólica (mmHg)', 'dadosClinicos.nyha': 'NYHA', 'dadosClinicos.observacoes': 'Observações clínicas',
  'diagnosticoChagas.possuiDiagnosticoChagas': 'Possui diagnóstico de Chagas', 'diagnosticoChagas.statusDiagnostico': 'Status do diagnóstico',
  'diagnosticoChagas.resultadoFinal': 'Resultado final', 'diagnosticoChagas.dataResultadoFinal': 'Data do resultado final',
  'diagnosticoChagas.dataDescobertaAutorelato': 'Data de descoberta por autorrelato', 'diagnosticoChagas.criterioConfirmacao': 'Critério de confirmação',
  'diagnosticoChagas.observacoes': 'Observações do diagnóstico', 'rastreioFamiliar.familiaresExaminados': 'Familiares examinados',
};
const reasons: Record<string, string> = {
  date: 'Informe uma data válida no formato dia/mês/ano.', integer: 'Informe um número inteiro.',
  number: 'Informe um número com até duas casas decimais.', length: 'Revise o preenchimento e o limite de caracteres do campo.',
  option: 'Selecione uma opção válida.', invalid: 'Revise o preenchimento deste campo.',
  attendance_context: 'As opções “Somente ambulatório” e “Ambulatório anexo a projeto” não podem ser Sim ao mesmo tempo.',
};
export function fieldLabel(path: string): string | undefined {
  if (Object.hasOwn(labels, path)) return labels[path];
  const match = /^(exames|pendencias)\.([0-9]|[12][0-9])\.(\w+)$/.exec(path);
  if (match) {
    const names: Record<string, string> = match[1] === 'exames'
      ? { tipoExameId: 'Tipo de exame', bloco: 'Origem do exame', identificacao: 'Identificação do exame', resultado: 'Resultado do exame', observacoes: 'Observações do exame' }
      : { descricao: 'Descrição da pendência', status: 'Status da pendência', dataResolucao: 'Data de resolução da pendência' };
    if (Object.hasOwn(names, match[3]!)) return `${names[match[3]!]!} ${Number(match[2]) + 1}`;
  }
  const family = /^rastreioFamiliar\.familiares\.([0-9]|[1-4][0-9])\.(familiar|resultado)$/.exec(path);
  if (family) return `${family[2] === 'familiar' ? 'Identificação' : 'Resultado'} do familiar ${Number(family[1]) + 1}`;
  return undefined;
}
export const fieldReason = (code: string): string => Object.hasOwn(reasons, code) ? reasons[code]! : reasons.invalid!;
export function readFieldViolations(body: unknown): FieldViolation[] {
  if (!body || typeof body !== 'object' || !('errors' in body) || !Array.isArray(body.errors)) return [];
  return body.errors.slice(0, 100).filter((item): item is FieldViolation => Boolean(item && typeof item.path === 'string'
    && typeof item.code === 'string' && fieldLabel(item.path) && Object.hasOwn(reasons, item.code)))
    .map(({ path, code }) => ({ path, code }));
}
export class FieldValidationError extends Error {
  constructor(readonly errors: FieldViolation[]) { super('Revise os campos indicados.'); }
}
const FieldsContext = createContext<{ errors: FieldViolation[]; prefix: string }>({ errors: [], prefix: '' });
export function FieldValidationProvider({ errors, prefix, children }: { errors: FieldViolation[]; prefix: string; children: ReactNode }) {
  return <FieldsContext value={{ errors, prefix }}>{children}</FieldsContext>;
}
export function useFieldValidation(path?: string) {
  const { errors, prefix } = useContext(FieldsContext);
  const error = path ? errors.find(item => item.path === path) : undefined;
  const id = path && prefix ? `${prefix}-${path}` : undefined;
  return { id, error, errorId: error && id ? `${id}-error` : undefined };
}
export function FieldValidationSummary({ errors, prefix, reveal }: { errors: FieldViolation[]; prefix: string; reveal?: (path: string) => void }) {
  return errors.length > 0 && <ul>{errors.map((item, index) => <li key={`${item.path}-${index}`}>
    <a href={`#${prefix}-${item.path}`} onClick={event => {
      event.preventDefault(); reveal?.(item.path);
      requestAnimationFrame(() => document.getElementById(`${prefix}-${item.path}`)?.focus());
    }}>{fieldLabel(item.path)}: {fieldReason(item.code)}</a>
  </li>)}</ul>;
}
