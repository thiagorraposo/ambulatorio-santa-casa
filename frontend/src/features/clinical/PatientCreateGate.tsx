import type { ReactNode } from 'react';
import { Link } from 'react-router';
import type { PacienteCapacidadesResponse } from '../../api/contracts';
import { useApiQuery } from '../../api/useApiQuery';
import { useSession } from '../../app/session';
import { Card, QueryState } from '../../shared/ui';

export function PatientCreateGate({ children }: { children: ReactNode }) {
  const query = useApiQuery<PacienteCapacidadesResponse>('/pacientes/capacidades');
  return <QueryState query={query}>{capabilities => capabilities.podeCadastrar === true ? children
    : <Card><h2>Cadastro indisponível para este acesso</h2>
      <p>A política clínica deste ambiente permite consultar e editar os pacientes autorizados. O cadastro de um novo paciente exige permissão específica.</p>
      <Link to="/pacientes">Consultar pacientes</Link>
    </Card>}</QueryState>;
}

function AuthorizedCreateLink() {
  const query = useApiQuery<PacienteCapacidadesResponse>('/pacientes/capacidades');
  return <QueryState query={query}>{capabilities => capabilities.podeCadastrar === true
    ? <p><Link to="/pacientes/novo" className="button">Cadastrar paciente</Link></p> : null}</QueryState>;
}

export function PatientCreateLink() {
  const session = useSession();
  return session.user?.perfil === 'consulta' ? null : <AuthorizedCreateLink />;
}
