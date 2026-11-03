import { Link, useParams } from 'react-router';
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
              <td><Link to={pagePath(`/usuarios/${encodeURIComponent(row.usuarioId)}`, page.limit, page.offset)}>{row.nome}</Link>{row.usuarioId === session.user?.usuarioId && <span className="muted"> (você)</span>}</td><td><span className="badge">{profiles[row.perfil]}</span></td></tr>)}</tbody>
          </table></TableScroll>}
      </QueryState>
      <Pagination label="usuários" {...page} onChange={page.changePage}
        count={query.isSuccess && !query.isFetching ? query.data.length : undefined} />
    </Card>
  </>;
}

function UserDetail({ usuarioId }: { usuarioId: string }) {
  const page = usePage();
  const query = useApiQuery<UsuarioResumo>(`/usuarios/${encodeURIComponent(usuarioId)}`);
  return <>
    <Link to={pagePath('/usuarios', page.limit, page.offset)}>Voltar aos usuários</Link>
    <PageHeading title="Dados do usuário" />
    <Card>
      <QueryState query={query}>{user => <dl className="details-list">
        <div><dt>ID</dt><dd className="mono">{user.usuarioId}</dd></div>
        <div><dt>Nome</dt><dd>{user.nome}</dd></div>
        <div><dt>Perfil</dt><dd><span className="badge">{profiles[user.perfil]}</span></dd></div>
      </dl>}</QueryState>
    </Card>
  </>;
}

export default function UsuariosPage() {
  const session = useSession();
  const { usuarioId } = useParams();
  return session.user?.perfil === 'administracao' ? (usuarioId ? <UserDetail usuarioId={usuarioId} /> : <UsersList />) : <Card>
    <PageHeading title="Acesso administrativo necessário" description="A consulta de usuários exige perfil de Administração." />
    <Link to="/">Voltar ao início</Link>
  </Card>;
}
