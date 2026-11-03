import { patientsSearchReturn } from './PatientsSearchReturn';

/** A detail may return only to the same patient's record, never to another detail. */
export function attendanceReturn(patientPath: string, raw: string | null): string | null {
  if (!raw || !raw.startsWith('/') || raw.startsWith('//') || /[\\\u0000-\u001f\u007f]/.test(raw)) return null;
  const url = new URL(raw, 'http://app.local');
  if (url.origin !== 'http://app.local' || url.pathname !== patientPath) return null;
  // Keep the record's search origin, but never another record/detail chain.
  // The list itself needs no return; stripping it bounds nesting on repeat visits.
  if (url.searchParams.has('retorno')) {
    const search = patientsSearchReturn(url.searchParams.get('retorno'));
    if (search) {
      const list = new URL(search, 'http://app.local');
      list.searchParams.delete('retorno');
      url.searchParams.set('retorno', `${list.pathname}${list.search}`);
    } else url.searchParams.delete('retorno');
  }
  return `${url.pathname}${url.search}${url.hash}`;
}

export function attendanceDetailPath(patientPath: string, attendanceId: string, origin: string): string {
  const detail = `${patientPath}/atendimentos/${encodeURIComponent(attendanceId)}`;
  const back = attendanceReturn(patientPath, origin);
  return back ? `${detail}?${new URLSearchParams({ retorno: back })}` : detail;
}
