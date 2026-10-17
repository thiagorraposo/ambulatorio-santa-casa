import type { FollowupKind } from './followup-contracts';

/** Keep the source page and clinical IDs as text throughout the operation links. */
export function followupOperationPath(patientPath: string, kind: FollowupKind, attendanceId = '',
  original?: URLSearchParams): string {
  const params = new URLSearchParams(original);
  params.set('tipo', kind);
  if (attendanceId) params.set('atendimentoId', attendanceId);
  else params.delete('atendimentoId');
  return `${patientPath}/registrar?${params}`;
}

export function followupOrigin(patientPath: string, raw: string | null): string | null {
  if (!raw || !raw.startsWith('/') || raw.startsWith('//') || raw.includes('\\')) return null;
  const url = new URL(raw, 'http://app.local');
  if (url.origin !== 'http://app.local') return null;
  const suffix = url.pathname.slice(patientPath.length);
  if (url.pathname !== patientPath && (!url.pathname.startsWith(patientPath)
    || !/^\/atendimentos\/[1-9]\d{0,18}$/.test(suffix))) return null;
  return `${url.pathname}${url.search}${url.hash}`;
}
