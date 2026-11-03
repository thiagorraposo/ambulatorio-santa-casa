import { Link, useSearchParams } from 'react-router';

export function patientsSearchReturn(target: string | null): string | null {
  // Somente as duas páginas locais de busca/análise podem originar o percurso.
  if (!target || !/^\/(?:pacientes|dashboard)(?:\?[^#]*)?$/.test(target) || /[\\\u0000-\u001f\u007f]/.test(target)) return null;
  return target;
}

export function searchReturnPath(path: string, raw: string | null): string {
  const origin = patientsSearchReturn(raw);
  return origin ? `${path}${path.includes('?') ? '&' : '?'}${new URLSearchParams({ retorno: origin })}` : path;
}

export function PatientsSearchReturn() {
  const [search] = useSearchParams();
  const target = patientsSearchReturn(search.get('retorno'));
  if (!target) return null;
  return <p><Link to={target}>{target.startsWith('/dashboard') ? 'Voltar ao dashboard' : 'Voltar aos resultados da busca'}</Link></p>;
}
