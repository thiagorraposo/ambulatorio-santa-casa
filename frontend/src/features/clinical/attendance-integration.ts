import { FieldValidationError } from '../../shared/field-validation';
import type { Fields } from './core-contracts';

export interface IntegratedField {
  name: string; label: string; type?: 'boolean' | 'number' | 'date' | 'textarea';
  options?: ReadonlyArray<readonly [string, string]>; required?: boolean; max?: number;
  catalog?: 'comorbidades' | 'projetos' | 'tipos-encaminhamento';
}
export interface IntegratedResource {
  key: string; title: string; section: number; fields: IntegratedField[];
  multiple?: boolean; limit?: number; longitudinal?: string; singleton?: boolean;
}
const text = (name: string, label: string, max = 10000): IntegratedField => ({ name, label, max, type: max === 10000 ? 'textarea' : undefined });
const bool = (name: string, label: string): IntegratedField => ({ name, label, type: 'boolean' });
const date = (name: string, label: string): IntegratedField => ({ name, label, type: 'date' });
const options = (values: string[]) => values.map(value => [value, value.replaceAll('_', ' ')] as const);
const obs = text('observacoes', 'Observações');
export const integratedResources: IntegratedResource[] = [
  { key: 'sorologias', title: 'sorologia', section: 1, multiple: true, fields: [text('metodoSorologico', 'Método sorológico', 120),
    date('dataSolicitacao', 'Data de solicitação da sorologia'), date('dataColeta', 'Data da coleta'), date('dataResultado', 'Data do resultado sorológico'),
    { name: 'resultado', label: 'Resultado sorológico', options: options(['reagente', 'nao_reagente', 'inconclusivo', 'indeterminado', 'nao_informado']) }, text('laboratorio', 'Laboratório', 120), obs] },
  { key: 'condicaoChagas', title: 'condição de Chagas', section: 2, fields: [
    { name: 'formaClinica', label: 'Forma clínica', options: options(['indeterminada', 'cardiaca', 'digestiva', 'cardiodigestiva', 'aguda', 'cronica', 'nao_informado']) },
    { name: 'faseDoenca', label: 'Fase da doença', options: options(['aguda', 'cronica', 'nao_informado']) }, text('classificacaoClinica', 'Classificação clínica', 80),
    bool('possuiSintomas', 'Possui sintomas'), text('descricaoSintomas', 'Descrição dos sintomas'), obs] },
  { key: 'complicacoesChagas', title: 'complicação de Chagas', section: 2, multiple: true, fields: [text('tipoComplicacao', 'Tipo de complicação', 80),
    bool('possuiComplicacao', 'Possui complicação'), text('descricao', 'Descrição da complicação'),
    { name: 'gravidade', label: 'Gravidade da complicação', options: options(['leve', 'moderada', 'grave', 'nao_informado']) }] },
  { key: 'comorbidades', title: 'avaliação de comorbidade', section: 3, multiple: true, fields: [
    { name: 'comorbidadeId', label: 'Comorbidade', catalog: 'comorbidades', required: true },
    bool('possuiComorbidade', 'Possui comorbidade'), obs] },
  { key: 'historicoFamiliar', title: 'histórico familiar', section: 3, fields: [bool('possuiDoenca', 'Possui doença na família'), text('descricao', 'Descrição do histórico familiar')] },
  { key: 'avcs', title: 'AVC', section: 5, multiple: true, longitudinal: 'avcs', fields: [bool('ocorreu', 'Ocorreu AVC'),
    { name: 'anoEvento', label: 'Ano do AVC', type: 'number', max: 9999 }, text('descricao', 'Descrição do AVC'), obs] },
  { key: 'dispositivos', title: 'dispositivo', section: 5, multiple: true, limit: 2, longitudinal: 'dispositivos', fields: [
    { name: 'tipoDispositivo', label: 'Tipo de dispositivo', required: true, options: [['marcapasso', 'Marcapasso'], ['cdi', 'CDI']] }, bool('possuiDispositivo', 'Possui dispositivo'), obs] },
  { key: 'obito', title: 'óbito', section: 5, longitudinal: 'obito', singleton: true, fields: [bool('houveObito', 'Houve óbito'), date('dataObito', 'Data do óbito'), text('causaObito', 'Causa do óbito'), obs] },
  { key: 'projetos', title: 'projeto', section: 6, multiple: true, longitudinal: 'projetos', fields: [
    { name: 'projetoId', label: 'Projeto', catalog: 'projetos', required: true }, bool('participa', 'Participa do projeto'), bool('possuiPendencia', 'Possui pendência no projeto'),
    text('descricaoPendencia', 'Descrição da pendência no projeto'), bool('houveFalha', 'Houve falha no projeto'), text('descricaoFalha', 'Descrição da falha no projeto'), obs] },
  { key: 'tratamentoBzn', title: 'tratamento BZN', section: 8, longitudinal: 'tratamento-bzn', singleton: true, fields: [bool('temIndicacao', 'Tem indicação de BZN'),
    text('motivoNaoIndicacao', 'Motivo de não indicação'), bool('iniciado', 'Tratamento iniciado'), text('motivoNaoInicio', 'Motivo de não início'),
    bool('tratamentoPeloAmbulatorio', 'Tratamento pelo ambulatório'), { name: 'duracaoCumpridaDias', label: 'Duração cumprida em dias', type: 'number', max: 2147483647 },
    { name: 'anoUsoAproximado', label: 'Ano aproximado de uso', type: 'number', max: 9999 }, date('dataPrescricao', 'Data da prescrição BZN'), bool('teveReacaoAdversa', 'Teve reação adversa'), obs] },
  { key: 'encaminhamentos', title: 'encaminhamento', section: 9, multiple: true, fields: [
    { name: 'tipoEncaminhamentoId', label: 'Tipo de encaminhamento', catalog: 'tipos-encaminhamento' },
    { name: 'projetoId', label: 'Projeto de origem', catalog: 'projetos' },
    { name: 'origem', label: 'Origem do encaminhamento', options: options(['ambulatorio', 'projeto_pesquisa', 'atencao_basica', 'servico_especializado', 'hospital', 'demanda_espontanea', 'outro', 'nao_informado']) },
    text('destinoNome', 'Nome do destino', 180), text('destinoServico', 'Serviço de destino', 180), text('especialidadeDestino', 'Especialidade de destino', 120),
    date('dataEncaminhamento', 'Data do encaminhamento'), date('dataAgendamento', 'Data do agendamento'), date('dataRealizacao', 'Data da realização'),
    { name: 'status', label: 'Status do encaminhamento', options: options(['indicado', 'solicitado', 'agendado', 'realizado', 'pendente', 'cancelado', 'nao_compareceu', 'nao_informado']) },
    { name: 'prioridade', label: 'Prioridade do encaminhamento', options: options(['baixa', 'media', 'alta', 'urgente', 'nao_informado']) },
    bool('documentoApresentado', 'Documento apresentado'), text('motivo', 'Motivo do encaminhamento'), text('condutaOrientada', 'Conduta orientada'), obs] },
  { key: 'notificacao', title: 'notificação', section: 10, longitudinal: 'notificacao', singleton: true, fields: [bool('pacienteNotificado', 'Paciente notificado'),
    text('numeroNotificacao', 'Número da notificação', 100), text('justificativaNaoNotificacao', 'Justificativa de não notificação'), obs] },
];
for (const resource of integratedResources) resource.fields = resource.fields.map(field => field.name === 'observacoes'
  ? { ...field, label: `Observações (${resource.title})` } : field);

export type IntegratedDraft = Record<string, Fields[]>;
export const integratedPath = (resource: IntegratedResource, index: number, name: string) => resource.key === 'comorbidades'
  ? `comorbidades.itens.${index}.${name}` : resource.key === 'historicoFamiliar' ? `comorbidades.historicoFamiliar.${name}`
  : `${resource.key}.${resource.multiple ? `${index}.` : ''}${name}`;
export function integratedFieldLabel(path: string): string | undefined {
  for (const resource of integratedResources) {
    for (const field of resource.fields) {
      for (let i = 0; i < (resource.multiple ? 30 : 1); i++) {
        if (integratedPath(resource, i, field.name) === path) return `${field.label} ${i + 1}`;
      }
    }
  }
  return undefined;
}
export function integratedBody(draft: IntegratedDraft = {}): Record<string, unknown> {
  const body: Record<string, unknown> = {};
  for (const resource of integratedResources) {
    const rows = draft[resource.key] ?? [];
    if (!rows.length) continue;
    const values = rows.map((row, index) => {
      const record: Record<string, unknown> = {};
      for (const field of resource.fields) {
        const value = row[field.name] ?? '';
        const path = integratedPath(resource, index, field.name);
        if (field.required && !value) throw new FieldValidationError([{ path, code: 'required' }]);
        if (value === '') continue;
        if (field.type === 'date' && (!/^\d{4}-\d{2}-\d{2}$/.test(value) || Number.isNaN(Date.parse(value)) || new Date(value).toISOString().slice(0, 10) !== value)) {
          throw new FieldValidationError([{ path, code: 'date' }]);
        }
        if (field.options && !field.options.some(([key]) => key === value)) throw new FieldValidationError([{ path, code: 'option' }]);
        if (field.type !== 'number' && field.max && value.length > field.max) throw new FieldValidationError([{ path, code: 'length' }]);
        if (field.type === 'boolean' && !['sim', 'nao', 'desconhecido'].includes(value)) throw new FieldValidationError([{ path, code: 'option' }]);
        if (field.type === 'boolean') record[field.name] = value === 'desconhecido' ? null : value === 'sim';
        else if (field.type === 'number') {
          const min = field.name === 'anoEvento' ? 0 : 1;
          if (!/^\d+$/.test(value) || !Number.isSafeInteger(Number(value)) || Number(value) < min || Number(value) > field.max!) {
            throw new FieldValidationError([{ path, code: 'integer' }]);
          }
          record[field.name] = Number(value);
        } else record[field.name] = value;
      }
      if (resource.key === 'comorbidades' && !Object.hasOwn(record, 'possuiComorbidade')) {
        throw new FieldValidationError([{ path: integratedPath(resource, index, 'possuiComorbidade'), code: 'required' }]);
      }
      if (resource.key === 'historicoFamiliar' && !Object.hasOwn(record, 'possuiDoenca')) {
        throw new FieldValidationError([{ path: integratedPath(resource, index, 'possuiDoenca'), code: 'required' }]);
      }
      if (!Object.keys(record).length) throw new FieldValidationError([{ path: integratedPath(resource, index, resource.fields[0]!.name), code: 'required' }]);
      return record;
    });
    if (resource.key === 'comorbidades' || resource.key === 'historicoFamiliar') {
      body.comorbidades = { ...(body.comorbidades as object ?? {}), [resource.key === 'comorbidades' ? 'itens' : 'historicoFamiliar']: resource.key === 'comorbidades' ? values : values[0] };
    } else body[resource.key] = resource.multiple ? values : values[0];
  }
  return body;
}
export const integratedSectionForField = (path: string) => integratedResources.find(resource => resource.fields.some(field =>
  Array.from({ length: resource.multiple ? 30 : 1 }, (_, i) => integratedPath(resource, i, field.name)).includes(path)))?.section;

/** A truncated success body must stay uncertain until the authoritative receipt is complete. */
export function completeAttendanceReceipt(receipt: Record<string, unknown>, draft: IntegratedDraft = {}): boolean {
  const expected = new Set(['atendimentoId']);
  const singles: Record<string, string> = { condicaoChagas: 'condicaoChagasId', comorbidades: 'avaliacaoComorbidadesId',
    historicoFamiliar: 'avaliacaoComorbidadesId', obito: 'obitoId', tratamentoBzn: 'tratamentoId', notificacao: 'notificacaoId' };
  const arrays: Record<string, string> = { sorologias: 'sorologia', complicacoesChagas: 'complicacao', avcs: 'avc',
    dispositivos: 'dispositivo', projetos: 'projeto', encaminhamentos: 'encaminhamento' };
  for (const [key, rows] of Object.entries(draft)) {
    if (!rows.length) continue;
    if (singles[key]) expected.add(singles[key]);
    else rows.forEach((_, index) => expected.add(`${arrays[key]}${index}Id`));
  }
  return [...expected].every(key => typeof receipt[key] === 'string' && /^[1-9]\d{0,18}$/.test(receipt[key]));
}
