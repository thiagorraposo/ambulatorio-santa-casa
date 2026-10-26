/** A detail may return only to the same patient's record, never to another detail. */
export function attendanceReturn(patientPath: string, raw: string | null): string | null {
  if (!raw || !raw.startsWith('/') || raw.startsWith('//') || /[\\\u0000-\u001f\u007f]/.test(raw)) return null;
  const url = new URL(raw, 'http://app.local');
  if (url.origin !== 'http://app.local' || url.pathname !== patientPath) return null;
  // A record's own return parameter has no meaning here. Removing it prevents
  // nested return URLs from growing each time the reader opens a detail.
  if (url.searchParams.has('retorno')) url.searchParams.delete('retorno');
  return `${url.pathname}${url.search}${url.hash}`;
}

export function attendanceDetailPath(patientPath: string, attendanceId: string, origin: string): string {
  const detail = `${patientPath}/atendimentos/${encodeURIComponent(attendanceId)}`;
  const back = attendanceReturn(patientPath, origin);
  return back ? `${detail}?${new URLSearchParams({ retorno: back })}` : detail;
}
