import type { ComplicacaoResponse } from '../../api/contracts';

export const complicacaoFields = [
  ['tipoComplicacao', 'Tipo de complicação', 'text'],
  ['possuiComplicacao', 'Possui complicação', 'boolean'],
  ['descricao', 'Descrição da complicação', 'textarea'],
  ['gravidade', 'Gravidade da complicação', 'severity'],
] as const;
export type ComplicacaoField = typeof complicacaoFields[number][0];
export type ComplicacaoValues = Record<ComplicacaoField, string>;
export const complicacaoSeverities = [['leve', 'Leve'], ['moderada', 'Moderada'], ['grave', 'Grave'],
  ['nao_informado', 'Não informado (registrado)']] as const;
export function emptyComplicacao(): ComplicacaoValues {
  return { tipoComplicacao: '', possuiComplicacao: '', descricao: '', gravidade: '' };
}
export function complicacaoBody(values: ComplicacaoValues): Pick<ComplicacaoResponse, ComplicacaoField> {
  return { tipoComplicacao: values.tipoComplicacao || null,
    possuiComplicacao: values.possuiComplicacao === '' ? null : values.possuiComplicacao === 'sim',
    descricao: values.descricao || null, gravidade: values.gravidade || null };
}
export function complicacaoValue(name: ComplicacaoField, value: string | boolean | null): string {
  if (value === null) return 'Desconhecido / não registrado';
  if (typeof value === 'boolean') return value ? 'Sim' : 'Não';
  if (value === '') return 'Texto vazio';
  if (/^\s+$/.test(value)) return 'Texto em branco (preservado)';
  return name === 'gravidade' ? complicacaoSeverities.find(([code]) => code === value)?.[1] ?? value : value;
}
