import { useState } from 'react';
import { useApiQuery } from '../../api/useApiQuery';
import { QueryState, TableScroll } from '../../shared/ui';
import type { Fields } from './core-contracts';

export function VersionComparison<T extends { versao: string }>({ path, originalVersion, original, draft,
  fields, valuesOf, onLoadCurrent }: {
  path: string; originalVersion: string; original: Fields; draft: Fields;
  fields: ReadonlyArray<readonly [string, string]>; valuesOf: (current: T) => Fields;
  onLoadCurrent: (current: T) => void;
}) {
  const [requested, setRequested] = useState(false);
  const query = useApiQuery<T>(path, false);
  return <section className="form-section" aria-label="Comparação de versões">
    <p>O rascunho e a versão carregada inicialmente foram preservados. Consulte o registro atual para comparar antes de decidir como continuar.</p>
    <button type="button" className="button button-secondary" disabled={query.isFetching}
      onClick={() => { setRequested(true); void query.refetch(); }}>Comparar com registro atual</button>
    {requested && <QueryState query={query}>{current => <>
      <p>Versão original: <span className="mono">{originalVersion}</span> · Versão atual: <span className="mono">{current.versao}</span></p>
      <TableScroll label="Comparação dos dados do atendimento"><table className="data-table">
        <caption>Valores carregados, alterações locais e registro atual</caption>
        <thead><tr><th scope="col">Campo</th><th scope="col">Carregado inicialmente</th>
          <th scope="col">Rascunho</th><th scope="col">Registro atual</th></tr></thead>
        <tbody>{fields.map(([key, label]) => <tr key={key}><th scope="row">{label}</th>
          <td>{original[key] || 'Não informado'}</td><td>{draft[key] || 'Não informado'}</td>
          <td>{valuesOf(current)[key] || 'Não informado'}</td></tr>)}</tbody>
      </table></TableScroll>
      <p>Carregar a versão atual descarta somente este rascunho. Depois, preencha e confirme uma nova edição; nenhuma alteração será reenviada automaticamente.</p>
      <button type="button" className="button button-secondary" onClick={() => onLoadCurrent(current)}>
        Descartar este rascunho e carregar versão atual
      </button>
    </>}</QueryState>}
  </section>;
}
