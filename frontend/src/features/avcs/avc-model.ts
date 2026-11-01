import type { AvcResponse } from '../../api/contracts';
export const avcFields = [['ocorreu', 'AVC informado', 'boolean'], ['anoEvento', 'Ano do último AVC informado', 'number'], ['descricao', 'Descrição do registro', 'textarea'], ['observacoes', 'Observações do registro', 'textarea']] as const;
export type AvcField = typeof avcFields[number][0];
export type AvcValues = Record<AvcField, string>;
export const emptyAvc = (): AvcValues => ({ ocorreu: '', anoEvento: '', descricao: '', observacoes: '' });
export function avcBody(v: AvcValues): Pick<AvcResponse, AvcField> { return { ocorreu: v.ocorreu === '' ? null : v.ocorreu === 'sim', anoEvento: v.anoEvento === '' ? null : Number(v.anoEvento), descricao: v.descricao || null, observacoes: v.observacoes || null }; }
export function avcValue(_name: AvcField, value: string | number | boolean | null): string { if (value === null) return 'Desconhecido / não registrado'; if (typeof value === 'boolean') return value ? 'Sim' : 'Não'; if (value === '') return 'Texto vazio'; return String(value); }
export function avcReturn(patientPath: string, raw: string | null): string {
  if (!raw || !raw.startsWith('/') || raw.startsWith('//') || /[\\\u0000-\u001f\u007f]/.test(raw)) return patientPath;
  const u = new URL(raw, 'http://app.local');
  return u.origin === 'http://app.local' && (u.pathname === patientPath || new RegExp(`^${patientPath}/atendimentos/[1-9]\\d{0,18}$`).test(u.pathname)) ? u.pathname + u.search + u.hash : patientPath;
}
