import { Link, useParams, useSearchParams } from 'react-router';
import { useSession } from '../../app/session';
import { useApiQuery } from '../../api/useApiQuery';
import { Card, EmptyState, PageHeading, QueryState, TableScroll } from '../../shared/ui';
import { pagePath, Pagination, usePage } from '../pacientes/pagination';

import type { UsuarioResumo } from '../../api/contracts';
import { AlterarConta, profiles } from './AlterarConta';
import CriarUsuario from './CriarUsuario';
import RecuperarCredencial from './RecuperarCredencial';

function UsersList() {
  const session = useSession();
  const page = usePage();
  const query = useApiQuery<UsuarioResumo[]>(pagePath('/usuarios', page.limit, page.offset));
  return <>
    <PageHeading title="Usuários" description="Consulte a identificação, o perfil e a situação das contas do ambulatório." />
    <Link className="button" to="/usuarios/novo">Criar usuário</Link>
    <Card>
      <QueryState query={query} emptyMessage="Nenhum usuário nesta página.">
        {rows => rows.length === 0 ? <EmptyState>Nenhum usuário nesta página.</EmptyState> :
          <TableScroll label="Usuários do ambulatório"><table className="data-table users-table">
            <caption className="sr-only">Usuários desta página</caption>
            <thead><tr><th scope="col">ID</th><th scope="col">Nome</th><th scope="col">Login</th><th scope="col">Perfil</th><th scope="col">Situação da conta</th></tr></thead>
            <tbody>{rows.map(row => <tr key={row.usuarioId}><td className="mono">{row.usuarioId}</td>
              <td><Link to={pagePath(`/usuarios/${encodeURIComponent(row.usuarioId)}`, page.limit, page.offset)}>{row.nome}</Link>{row.usuarioId === session.user?.usuarioId && <span className="muted"> (você)</span>}</td><td>{row.login}</td><td><span className="badge">{profiles[row.perfil]}</span></td><td>{row.ativo ? 'Ativa' : 'Inativa'}</td></tr>)}</tbody>
          </table></TableScroll>}
      </QueryState>
      <Pagination label="usuários" {...page} onChange={page.changePage}
        count={query.isSuccess && !query.isFetching ? query.data.length : undefined} />
    </Card>
  </>;
}

function UserDetail({ usuarioId }: { usuarioId: string }) {
  const page = usePage();
  const [params] = useSearchParams();
  const kind = params.get('comando') === 'estado' ? 'estado' : 'perfil';
  const query = useApiQuery<UsuarioResumo>(`/usuarios/${encodeURIComponent(usuarioId)}`);
  return <>
    <Link to={pagePath('/usuarios', page.limit, page.offset)}>Voltar aos usuários</Link>
    <PageHeading title="Dados do usuário" />
    <Card>
      <QueryState query={query}>{user => <><dl className="details-list">
        <div><dt>ID</dt><dd className="mono">{user.usuarioId}</dd></div>
        <div><dt>Nome</dt><dd>{user.nome}</dd></div>
        <div><dt>Login</dt><dd>{user.login}</dd></div>
        <div><dt>Situação da conta</dt><dd>{user.ativo ? 'Ativa' : 'Inativa'}</dd></div>
        <div><dt>Perfil</dt><dd><span className="badge">{profiles[user.perfil]}</span></dd></div>
      </dl><AlterarConta key={`${user.usuarioId}:${kind}`} user={user} kind={kind} /><RecuperarCredencial key={`recuperacao:${user.usuarioId}`} user={user} /></>}</QueryState>
    </Card>
  </>;
}

export default function UsuariosPage() {
  const session = useSession();
  const { usuarioId } = useParams();
  return session.user?.perfil === 'administracao' ? (usuarioId === 'novo' ? <CriarUsuario /> : usuarioId ? <UserDetail key={usuarioId} usuarioId={usuarioId} /> : <UsersList />) : <Card>
    <PageHeading title="Acesso administrativo necessário" description="A consulta de usuários exige perfil de Administração." />
    <Link to="/">Voltar ao início</Link>
  </Card>;
}
