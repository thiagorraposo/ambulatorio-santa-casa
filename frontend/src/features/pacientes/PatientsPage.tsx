import { useEffect, useState, type FormEvent } from 'react';
import { Link, useSearchParams } from 'react-router';
import type { PacienteResponse } from '../../api/contracts';
import { useApiQuery } from '../../api/useApiQuery';
import { Card, EmptyState, PageHeading, QueryState } from '../../shared/ui';
import { pagePath, Pagination, usePage } from './pagination';

export default function PatientsPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const page = usePage();
  const currentName = searchParams.get('nome') ?? '';
  const currentSex = searchParams.get('sexo') ?? '';
  const [nome, setNome] = useState(currentName);
  const [sexo, setSexo] = useState(currentSex);
  useEffect(() => { setNome(currentName); setSexo(currentSex); }, [currentName, currentSex]);
  const filters = new URLSearchParams();
  if (currentName) filters.set('nome', currentName);
  if (currentSex) filters.set('sexo', currentSex);
  const path = filters.size ? `/pacientes?${filters}` : '/pacientes';
  const query = useApiQuery<PacienteResponse[]>(pagePath(path, page.limit, page.offset));

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const next = new URLSearchParams();
    if (nome.trim()) next.set('nome', nome.trim());
    if (sexo) next.set('sexo', sexo);
    next.set('limit', String(page.limit));
    next.set('offset', '0');
    setSearchParams(next);
  }

  return (
    <>
      <PageHeading title="Pacientes" description="Busque e consulte os pacientes disponíveis para sua conta." />
      <Card>
        <form className="filters" onSubmit={submit} aria-label="Busca de pacientes">
          <div className="form-field">
            <label htmlFor="patient-name">Nome</label>
            <input id="patient-name" type="search" value={nome} maxLength={120}
              onChange={event => setNome(event.target.value)} placeholder="Buscar por nome" />
          </div>
          <div className="form-field">
            <label htmlFor="patient-sex">Sexo</label>
            <select id="patient-sex" value={sexo} onChange={event => setSexo(event.target.value)}>
              <option value="">Todos</option>
              <option value="feminino">Feminino</option>
              <option value="masculino">Masculino</option>
              <option value="outro">Outro</option>
              <option value="nao_informado">Não informado</option>
              {currentSex && !['feminino', 'masculino', 'outro', 'nao_informado'].includes(currentSex)
                && <option value={currentSex}>{currentSex}</option>}
            </select>
          </div>
          <button className="button" type="submit">Buscar</button>
          <button className="button button-secondary" type="button" onClick={() => {
            setNome(''); setSexo('');
            setSearchParams({ limit: String(page.limit), offset: '0' });
          }}>Limpar filtros</button>
        </form>
      </Card>
      <Card className="collection-section">
        <h2>Resultado da busca</h2>
        <QueryState query={query} emptyMessage="Nenhum paciente nesta página para os filtros e o acesso atuais.">
          {rows => rows.length === 0 ? (
            <EmptyState>Nenhum paciente nesta página para os filtros e o acesso atuais.</EmptyState>
          ) : (
            <div className="table-scroll">
              <table className="data-table">
                <caption className="sr-only">Pacientes desta página</caption>
                <thead><tr><th scope="col">ID</th><th scope="col">Nome</th><th scope="col">Ficha</th></tr></thead>
                <tbody>{rows.map(patient => (
                  <tr key={patient.pacienteId}>
                    <td className="mono">{patient.pacienteId}</td>
                    <td>{patient.nome}</td>
                    <td><Link to={`/pacientes/${encodeURIComponent(patient.pacienteId)}`}
                      aria-label={`Ver ficha de ${patient.nome}`}>Ver ficha</Link></td>
                  </tr>
                ))}</tbody>
              </table>
            </div>
          )}
        </QueryState>
        <Pagination label="pacientes" {...page} onChange={page.changePage}
          count={query.isSuccess && !query.isFetching ? query.data.length : undefined} />
        <p className="muted">A busca considera os filtros e seu acesso. Uma página vazia não indica ausência de cadastro no sistema.</p>
      </Card>
    </>
  );
}
