import { Link, useSearchParams } from 'react-router';

export function patientsSearchReturn(target: string | null): string | null {
  // Somente a lista local pode ser usada como retorno desses atalhos.
  if (!target || !/^\/pacientes(?:\?[^#]*)?$/.test(target) || /[\r\n\\]/.test(target)) return null;
  return target;
}

export function PatientsSearchReturn() {
  const [search] = useSearchParams();
  const target = patientsSearchReturn(search.get('retorno'));
  if (!target) return null;
  return <p><Link to={target}>Voltar aos resultados da busca</Link></p>;
}
