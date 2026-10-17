import type { AtendimentoDetalheResponse, PacienteDetalheResponse } from '../../api/contracts';
import type { CatalogItem } from '../../shared/writing';

export type Fields = Record<string, string>;
export const triValue = (value: string): boolean | null => value === 'sim' ? true : value === 'nao' ? false : null;
export const triInput = (value: boolean | null | undefined): string => value === true ? 'sim' : value === false ? 'nao' : '';
export const textInput = (value: unknown): string => value == null ? '' : String(value);
export const dirtyFields = (value: unknown, initial: unknown): boolean => JSON.stringify(value) !== JSON.stringify(initial);

export function optionalNumber(raw: string, label: string, integer = false): number | null {
  if (raw === '') return null;
  if (!/^-?\d+(?:\.\d{1,2})?$/.test(raw) || (integer && !/^-?\d+$/.test(raw))) {
    throw new Error(`${label}: informe um número${integer ? ' inteiro' : ' com até duas casas decimais'}.`);
  }
  const value = Number(raw);
  if (!Number.isFinite(value) || (integer && !Number.isSafeInteger(value))) throw new Error(`${label}: valor fora da faixa válida.`);
  return value;
}

export function patientInitial(data?: PacienteDetalheResponse): Fields {
  return {
    nome: data?.nome ?? '', dataNascimento: textInput(data?.dataNascimento), sexo: textInput(data?.sexo),
    raca: textInput(data?.raca), pertenceComunidadeTradicional: triInput(data?.pertenceComunidadeTradicional),
    tipoComunidadeTradicional: textInput(data?.tipoComunidadeTradicional),
    endereco: textInput(data?.endereco?.endereco), cidade: textInput(data?.endereco?.cidade),
  };
}

export function patientBody(values: Fields, phones: string[], original?: PacienteDetalheResponse): Record<string, unknown> {
  const initial = patientInitial(original);
  const body: Record<string, unknown> = original ? { versao: original.versao } : {};
  for (const key of ['nome', 'dataNascimento', 'sexo', 'raca', 'pertenceComunidadeTradicional', 'tipoComunidadeTradicional']) {
    if (original && values[key] === initial[key]) continue;
    if (!original && values[key] === '' && key !== 'nome') continue;
    body[key] = key === 'pertenceComunidadeTradicional' ? triValue(values[key]!)
      : key === 'nome' ? values[key]!.trim() : values[key] === '' ? null : values[key];
  }
  const address: Record<string, string | null> = {};
  for (const key of ['endereco', 'cidade']) {
    if (original ? values[key] !== initial[key] : values[key] !== '') address[key] = values[key] === '' ? null : values[key]!;
  }
  if (Object.keys(address).length) body.endereco = address;
  if (phones.some(phone => !phone.trim())) throw new Error('Preencha ou remova cada novo telefone antes de salvar.');
  if (phones.length) body[original ? 'telefonesAdicionar' : 'telefones'] = phones;
  if (!values.nome?.trim()) throw new Error('Nome completo é obrigatório.');
  if (original && Object.keys(body).length === 1) throw new Error('Nenhuma alteração informada.');
  return body;
}

export function attendanceInitial(data?: AtendimentoDetalheResponse): Fields {
  return {
    dataAtendimento: data?.dataAtendimento ?? '', localizacaoProntuario: textInput(data?.localizacaoProntuario),
    ambulatorioUnicamente: triInput(data?.ambulatorioUnicamente), ambulatorioAnexoProjeto: triInput(data?.ambulatorioAnexoProjeto),
    observacoes: textInput(data?.observacoes),
  };
}

export function attendanceCore(values: Fields, original?: AtendimentoDetalheResponse): Record<string, unknown> {
  const initial = attendanceInitial(original);
  const body: Record<string, unknown> = original ? { versao: original.versao } : {};
  for (const key of Object.keys(initial)) {
    if (original && values[key] === initial[key]) continue;
    if (!original && values[key] === '' && key !== 'dataAtendimento') continue;
    body[key] = ['ambulatorioUnicamente', 'ambulatorioAnexoProjeto'].includes(key) ? triValue(values[key]!)
      : values[key] === '' ? null : values[key];
  }
  if (!values.dataAtendimento) throw new Error('Data do atendimento é obrigatória.');
  if (original && Object.keys(body).length === 1) throw new Error('Nenhuma alteração informada.');
  return body;
}

export type ExamDraft = { tipoExameId: string; catalog?: CatalogItem; bloco: string; identificacao: string; resultado: string; observacoes: string };
export type FamilyDraft = { familiar: string; resultado: string };
export type PendingDraft = { descricao: string; status: string; dataResolucao?: string };
export const clinicalNumbers = [
  ['alturaCm', 'Altura (cm)', false], ['pesoKg', 'Peso (kg)', false],
  ['circunferenciaAbdominalCm', 'Circunferência abdominal (cm)', false],
  ['frequenciaCardiacaBpm', 'Frequência cardíaca (bpm)', true], ['saturacaoPercentual', 'Saturação (%)', false],
  ['paSistolicaMmhg', 'PA sistólica (mmHg)', true], ['paDiastolicaMmhg', 'PA diastólica (mmHg)', true],
] as const;
export interface AttendanceDraft {
  values: Fields; initial: Fields; original?: AtendimentoDetalheResponse;
  clinical: Fields; diagnosis: Fields; exams: ExamDraft[]; families: FamilyDraft[];
  familyStatus: string; pending: PendingDraft[];
  operationKey?: string;
}

export function attendanceBody(draft: AttendanceDraft): Record<string, unknown> {
  const body = attendanceCore(draft.values, draft.original);
  if (draft.original) return body;
  if (Object.values(draft.clinical).some(value => value !== '')) {
    const clinical: Record<string, unknown> = {};
    for (const [key, label, integer] of clinicalNumbers) {
      if (draft.clinical[key] !== undefined && draft.clinical[key] !== '') {
        clinical[key] = optionalNumber(draft.clinical[key]!, label, integer);
      }
    }
    for (const key of ['nyha', 'observacoes']) if (draft.clinical[key]) clinical[key] = draft.clinical[key];
    body.dadosClinicos = clinical;
  }
  if (Object.values(draft.diagnosis).some(value => value !== '')) {
    const diagnosis: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(draft.diagnosis)) {
      if (value !== '') diagnosis[key] = key === 'possuiDiagnosticoChagas' ? triValue(value) : value;
    }
    body.diagnosticoChagas = diagnosis;
  }
  if (draft.exams.length) {
    body.exames = draft.exams.map((exam, index) => {
      if (!exam.tipoExameId) throw new Error(`Exame ${index + 1}: selecione um tipo de exame ativo.`);
      if (['laboratoriais', 'imagem', 'outro', 'nao_informado'].includes(exam.catalog?.codigo ?? '') && !exam.identificacao.trim()) {
        throw new Error(`Exame ${index + 1}: identifique qual exame foi trazido ou solicitado.`);
      }
      return { tipoExameId: exam.tipoExameId, bloco: exam.bloco,
        ...(exam.identificacao ? { identificacao: exam.identificacao } : {}),
        ...(exam.resultado ? { resultado: exam.resultado } : {}),
        ...(exam.observacoes ? { observacoes: exam.observacoes } : {}) };
    });
  }
  if (draft.pending.length) {
    if (draft.pending.some(item => !item.descricao.trim())) throw new Error('Preencha a descrição de cada pendência.');
    body.pendencias = draft.pending.map((item, index) => {
      if (item.status === 'resolvida' && !item.dataResolucao) throw new Error(`Pendência ${index + 1}: informe a data de resolução.`);
      if (item.status !== 'resolvida' && item.dataResolucao) throw new Error(`Pendência ${index + 1}: data de resolução exige status resolvida. Nenhum campo será descartado.`);
      return { descricao: item.descricao, status: item.status || null,
        ...(item.dataResolucao ? { dataResolucao: item.dataResolucao } : {}) };
    });
  }
  if (draft.familyStatus !== '' || draft.families.length) {
    const flag = triValue(draft.familyStatus);
    if (flag === true && !draft.families.length) throw new Error('Identifique ao menos um familiar examinado e seu resultado.');
    if (flag !== true && draft.families.length) throw new Error('Os familiares preenchidos exigem a indicação de familiares examinados. Nenhum resultado será descartado.');
    if (draft.families.some(item => !item.familiar.trim() || !item.resultado.trim())) throw new Error('Informe a identificação e o resultado de cada familiar.');
    body.rastreioFamiliar = { familiaresExaminados: flag, familiares: draft.families };
  }
  return body;
}
