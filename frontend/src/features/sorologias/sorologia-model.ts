import type { SorologiaResponse } from '../../api/contracts';
import { formatClinicalDate } from '../../shared/formatters';

export const sorologiaFields = [
  ['metodoSorologico', 'Método sorológico', 'text'],
  ['dataSolicitacao', 'Data de solicitação', 'date'],
  ['dataColeta', 'Data de coleta', 'date'],
  ['dataResultado', 'Data do resultado', 'date'],
  ['resultado', 'Resultado da sorologia', 'result'],
  ['laboratorio', 'Laboratório', 'text'],
  ['observacoes', 'Observações da sorologia', 'textarea'],
] as const;
export type SorologiaField = typeof sorologiaFields[number][0];
export type SorologiaValues = Record<SorologiaField, string>;
export const sorologiaResults = [
  ['reagente', 'Reagente'], ['nao_reagente', 'Não reagente'], ['inconclusivo', 'Inconclusivo'],
  ['indeterminado', 'Indeterminado'], ['nao_informado', 'Não informado (registrado)'],
] as const;

export function emptySorologia(): SorologiaValues {
  return Object.fromEntries(sorologiaFields.map(([name]) => [name, ''])) as SorologiaValues;
}

export function sorologiaBody(values: SorologiaValues) {
  return Object.fromEntries(sorologiaFields.map(([name]) => [name, values[name] === '' ? null : values[name]]));
}

export function sorologiaValue(name: SorologiaField, value: SorologiaResponse[SorologiaField]): string {
  if (value === null) return 'Desconhecido / não registrado';
  if (value === '') return 'Texto vazio';
  if (/^\s+$/.test(value)) return 'Texto em branco (preservado)';
  if (name === 'resultado') return sorologiaResults.find(([code]) => code === value)?.[1] ?? value;
  if (name.startsWith('data')) return formatClinicalDate(value);
  return value;
}

/** Only the same patient's same attendance/list can be a return target. */
export function sameResourceReturn(path: string, raw: string | null): string {
  if (!raw || !raw.startsWith('/') || raw.startsWith('//') || /[\\\u0000-\u001f\u007f]/.test(raw)) return path;
  const target = new URL(raw, 'http://app.local');
  return target.origin === 'http://app.local' && target.pathname === path
    ? `${target.pathname}${target.search}${target.hash}` : path;
}
