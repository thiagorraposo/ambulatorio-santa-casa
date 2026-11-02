import { Link, useSearchParams } from 'react-router';

export function PatientsSearchReturn() {
  const [search] = useSearchParams();
  const target = search.get('retorno');
  // Somente a lista local pode ser usada como retorno desses atalhos.
  if (!target || !/^\/pacientes(?:\?[^#]*)?$/.test(target) || /[\r\n\\]/.test(target)) return null;
  return <p><Link to={target}>Voltar aos resultados da busca</Link></p>;
}
