import { Link } from 'react-router';
import { useSession } from '../../app/session';
import { useApiQuery } from '../../api/useApiQuery';
import { Card, EmptyState, PageHeading, QueryState, TableScroll } from '../../shared/ui';
import { pagePath, Pagination, usePage } from '../pacientes/pagination';

interface UsuarioResumo { usuarioId: string; nome: string; perfil: 'consulta' | 'edicao' | 'administracao' }
const profiles = { consulta: 'Consulta', edicao: 'Edição', administracao: 'Administração' };

function UsersList() {
  const session = useSession();
  const page = usePage();
  const query = useApiQuery<UsuarioResumo[]>(pagePath('/usuarios', page.limit, page.offset));
  return <>
    <PageHeading title="Usuários" description="Consulte os nomes e perfis das contas do ambulatório." />
    <Card>
      <QueryState query={query} emptyMessage="Nenhum usuário nesta página.">
        {rows => rows.length === 0 ? <EmptyState>Nenhum usuário nesta página.</EmptyState> :
          <TableScroll label="Usuários do ambulatório"><table className="data-table users-table">
            <caption className="sr-only">Usuários desta página</caption>
            <thead><tr><th scope="col">ID</th><th scope="col">Nome</th><th scope="col">Perfil</th></tr></thead>
            <tbody>{rows.map(row => <tr key={row.usuarioId}><td className="mono">{row.usuarioId}</td>
              <td>{row.nome}{row.usuarioId === session.user?.usuarioId && <span className="muted"> (você)</span>}</td><td><span className="badge">{profiles[row.perfil]}</span></td></tr>)}</tbody>
          </table></TableScroll>}
      </QueryState>
      <Pagination label="usuários" {...page} onChange={page.changePage}
        count={query.isSuccess && !query.isFetching ? query.data.length : undefined} />
    </Card>
  </>;
}

export default function UsuariosPage() {
  const session = useSession();
  return session.user?.perfil === 'administracao' ? <UsersList /> : <Card>
    <PageHeading title="Acesso administrativo necessário" description="A consulta de usuários exige perfil de Administração." />
    <Link to="/">Voltar ao início</Link>
  </Card>;
}
