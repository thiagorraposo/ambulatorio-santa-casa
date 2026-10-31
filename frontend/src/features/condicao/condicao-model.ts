import type { CondicaoChagasResponse } from '../../api/contracts';

export const condicaoFields = [
  ['formaClinica', 'Forma clínica', 'forma'],
  ['faseDoenca', 'Fase da doença', 'fase'],
  ['classificacaoClinica', 'Classificação clínica', 'text'],
  ['possuiSintomas', 'Possui sintomas', 'boolean'],
  ['descricaoSintomas', 'Descrição de sintomas', 'textarea'],
  ['observacoes', 'Observações da condição', 'textarea'],
] as const;
export type CondicaoField = typeof condicaoFields[number][0];
export type CondicaoValues = Record<CondicaoField, string>;
export const formaOptions = [
  ['indeterminada', 'Indeterminada'], ['cardiaca', 'Cardíaca'], ['digestiva', 'Digestiva'],
  ['cardiodigestiva', 'Cardiodigestiva'], ['aguda', 'Aguda'], ['cronica', 'Crônica'],
  ['nao_informado', 'Não informado (registrado)'],
] as const;
export const faseOptions = [['aguda', 'Aguda'], ['cronica', 'Crônica'], ['nao_informado', 'Não informado (registrado)']] as const;
export function emptyCondicao(): CondicaoValues {
  return Object.fromEntries(condicaoFields.map(([name]) => [name, ''])) as CondicaoValues;
}
export function condicaoBody(values: CondicaoValues): Pick<CondicaoChagasResponse, CondicaoField> {
  return { formaClinica: values.formaClinica || null, faseDoenca: values.faseDoenca || null,
    classificacaoClinica: values.classificacaoClinica || null,
    possuiSintomas: values.possuiSintomas === '' ? null : values.possuiSintomas === 'sim',
    descricaoSintomas: values.descricaoSintomas || null, observacoes: values.observacoes || null };
}
export function condicaoValue(name: CondicaoField, value: string | boolean | null): string {
  if (value === null) return 'Desconhecido / não registrado';
  if (typeof value === 'boolean') return value ? 'Sim' : 'Não';
  if (value === '') return 'Texto vazio';
  if (/^\s+$/.test(value)) return 'Texto em branco (preservado)';
  const options = name === 'formaClinica' ? formaOptions : name === 'faseDoenca' ? faseOptions : [];
  return options.find(([code]) => code === value)?.[1] ?? value;
}
