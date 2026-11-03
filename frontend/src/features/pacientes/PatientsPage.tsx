import { useEffect, useState, type FormEvent } from 'react';
import { Link, useSearchParams } from 'react-router';
import type { PacienteResponse } from '../../api/contracts';
import { useApiQuery } from '../../api/useApiQuery';
import { Card, EmptyState, PageHeading, QueryState, TableScroll } from '../../shared/ui';
import { pagePath, Pagination, usePage } from './pagination';
import PatientCsvExport from './PatientCsvExport';
import { PatientCreateLink } from '../clinical/PatientCreateGate';
import { useSession } from '../../app/session';

export default function PatientsPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const session = useSession();
  const canWrite = session.user?.perfil === 'edicao' || session.user?.perfil === 'administracao';
  const returnSearch = new URLSearchParams({ retorno: `/pacientes?${searchParams}` });
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
      <PageHeading title="Pacientes" description="Busque e consulte os pacientes disponíveis para sua conta." actions={<PatientCreateLink />} />
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
      <Card className="patients-results">
        <div className="patients-results-heading"><h2>Resultado da busca</h2>
        <PatientCsvExport key={`${path}:${page.limit}:${page.offset}`} nome={currentName} sexo={currentSex}
          limit={page.limit} offset={page.offset} available={query.isSuccess && !query.isFetching} /></div>
        <QueryState query={query} emptyMessage="Nenhum paciente nesta página para os filtros e o acesso atuais.">
          {rows => rows.length === 0 ? (
            <EmptyState>Nenhum paciente nesta página para os filtros e o acesso atuais.</EmptyState>
          ) : (
            <><TableScroll label="Pacientes disponíveis">
              <table className="data-table patients-table">
                <caption className="sr-only">Pacientes desta página</caption>
                <thead><tr><th scope="col">Paciente</th><th scope="col">ID do sistema</th><th scope="col">Ações</th></tr></thead>
                <tbody>{rows.map(patient => (
                  <tr key={patient.pacienteId}>
                    <td data-label="Paciente"><strong>{patient.nome}</strong></td>
                    <td data-label="ID do sistema" className="mono">{patient.pacienteId}</td>
                    <td data-label="Ações"><div className="patient-row-actions"><Link to={`/pacientes/${encodeURIComponent(patient.pacienteId)}?${returnSearch}`}
                      aria-label={`Ver ficha de ${patient.nome}`}>Ver ficha</Link>
                      {canWrite && <div className="patient-shortcuts">
                        <Link to={`/pacientes/${encodeURIComponent(patient.pacienteId)}/editar?${returnSearch}`}
                          aria-label={`Editar ${patient.nome}, ID ${patient.pacienteId}`}>Editar</Link>
                        <Link to={`/pacientes/${encodeURIComponent(patient.pacienteId)}/atendimentos/novo?${returnSearch}`}
                          aria-label={`Novo atendimento para ${patient.nome}, ID ${patient.pacienteId}`}>Novo atendimento</Link>
                      </div>}</div></td>
                  </tr>
                ))}</tbody>
              </table>
            </TableScroll></>
          )}
        </QueryState>
        <Pagination label="pacientes" {...page} onChange={page.changePage}
          count={query.isSuccess && !query.isFetching ? query.data.length : undefined} />
        <p className="muted">A busca considera os filtros e seu acesso. Uma página vazia não indica ausência de cadastro no sistema.</p>
      </Card>
    </>
  );
}
