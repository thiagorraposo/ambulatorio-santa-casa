import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { SessionManager } from '../../app/SessionManager';
import { SessionProvider } from '../../app/session';
import PatientCsvExport from './PatientCsvExport';
import PatientsPage from './PatientsPage';

const csv = 'paciente_id,nome\n"9007199254740997","Paciente Sintético"\n';
const scope = { nome: 'Aplicado', sexo: 'feminino', limit: 10, offset: 20, available: true };
const sessions: SessionManager[] = [];
let makeUrl: ReturnType<typeof vi.fn>;
let revokeUrl: ReturnType<typeof vi.fn>;
let click: ReturnType<typeof vi.spyOn>;
beforeEach(() => {
  makeUrl = vi.fn(() => 'blob:csv-sintetico'); revokeUrl = vi.fn();
  Object.defineProperty(URL, 'createObjectURL', { value: makeUrl, configurable: true });
  Object.defineProperty(URL, 'revokeObjectURL', { value: revokeUrl, configurable: true });
  click = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => undefined);
});
afterEach(() => { sessions.splice(0).forEach(session => session.dispose()); vi.restoreAllMocks(); });
function deferred<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>(done => { resolve = done; });
  return { promise, resolve };
}
async function setup({ profile = 'consulta', page = false, responder = async () => new Response(csv, {
  headers: { 'Content-Type': 'text/csv; charset=utf-8' },
}) } = {}) {
  const exports = vi.fn<typeof fetch>(async () => responder());
  const fetcher: typeof fetch = async (url, init) => {
    if (url === '/v1/auth/login') return Response.json({ accessToken: 'sintetico', tokenType: 'Bearer', expiresIn: 900 });
    if (url === '/v1/auth/me') return Response.json({ usuarioId: '42', nome: 'Profissional sintético', perfil: profile });
    if (String(url).startsWith('/v1/pacientes/export.csv?')) return exports(url, init);
    if (url === '/v1/pacientes/capacidades') return Response.json({ podeCadastrar: false });
    if (String(url).startsWith('/v1/pacientes?')) return Response.json([]);
    throw new Error(`Rota sintética inesperada: ${url}`);
  };
  const manager = new SessionManager(fetcher); sessions.push(manager);
  await manager.login('sintetico@example.invalid', 'senha-sintetica');
  const tree = (props = scope) => <SessionProvider manager={manager}>
    <MemoryRouter initialEntries={['/pacientes?nome=Aplicado&sexo=feminino&limit=10&offset=20']}>
      {page ? <PatientsPage /> : <PatientCsvExport {...props} />}
    </MemoryRouter></SessionProvider>;
  const view = render(tree());
  return { user: userEvent.setup(), exports, manager, ...view, update: (props: typeof scope) => view.rerender(tree(props)) };
}
async function open(user: ReturnType<typeof userEvent.setup>) {
  await user.click(screen.getByRole('button', { name: 'Exportar CSV desta página' }));
  expect(screen.getByRole('button', { name: 'Cancelar exportação' })).toHaveFocus();
}

describe('CSV da página autorizada', () => {
  it('explicita escopo, cancela/Escape sem request e restaura foco', async () => {
    const { user, exports } = await setup();
    await open(user);
    expect(screen.getByText('Campos: ID e nome.')).toBeVisible();
    expect(screen.getByText('Aplicado')).toBeVisible();
    expect(screen.getByText('feminino')).toBeVisible();
    expect(screen.getByText('10', { exact: true })).toBeVisible();
    expect(screen.getByText('20', { exact: true })).toBeVisible();
    await user.keyboard('{Escape}');
    expect(screen.queryByRole('button', { name: 'Confirmar exportação CSV' })).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Exportar CSV desta página' })).toHaveFocus();
    await open(user);
    await user.click(screen.getByRole('button', { name: 'Cancelar exportação' }));
    expect(exports).not.toHaveBeenCalled(); expect(makeUrl).not.toHaveBeenCalled();
  });

  it.each(['consulta', 'edicao', 'administracao'])('recebe arquivo real antes de preparar download para %s, sem duplicar', async profile => {
    const late = deferred<Response>();
    const { user, exports, unmount } = await setup({ profile, responder: () => late.promise });
    await open(user);
    const confirm = screen.getByRole('button', { name: 'Confirmar exportação CSV' });
    fireEvent.click(confirm); fireEvent.click(confirm);
    expect(screen.getByText('Preparando arquivo CSV…')).toBeVisible();
    expect(screen.queryByText('Arquivo CSV preparado para download.')).not.toBeInTheDocument();
    expect(makeUrl).not.toHaveBeenCalled();
    expect(exports).toHaveBeenCalledTimes(1);
    expect(exports.mock.calls[0]![0]).toBe('/v1/pacientes/export.csv?nome=Aplicado&sexo=feminino&limit=10&offset=20');
    await act(async () => { late.resolve(new Response(csv, { headers: { 'Content-Type': 'text/csv' } })); });
    expect(await screen.findByText('Arquivo CSV preparado para download.')).toBeVisible();
    expect(makeUrl).toHaveBeenCalledExactlyOnceWith(expect.any(Blob));
    expect(click).toHaveBeenCalledOnce();
    const anchor = click.mock.instances[0] as HTMLAnchorElement;
    expect(anchor.download).toBe('pacientes-pagina.csv');
    expect(anchor.href).toBe('blob:csv-sintetico');
    expect(screen.getByRole('button', { name: 'Exportar CSV desta página' })).toHaveFocus();
    unmount();
    expect(revokeUrl).toHaveBeenCalledExactlyOnceWith('blob:csv-sintetico');
  });

  it('exporta os filtros aplicados na URL e não o formulário ainda não submetido', async () => {
    const { user, exports } = await setup({ page: true });
    await user.clear(screen.getByRole('searchbox', { name: 'Nome' }));
    await user.type(screen.getByRole('searchbox', { name: 'Nome' }), 'Rascunho não aplicado');
    await user.selectOptions(screen.getByRole('combobox', { name: 'Sexo' }), 'outro');
    await waitFor(() => expect(screen.getByRole('button', { name: 'Exportar CSV desta página' })).toBeEnabled());
    await open(user);
    expect(screen.getByText('Aplicado', { exact: true })).toBeVisible();
    await user.click(screen.getByRole('button', { name: 'Confirmar exportação CSV' }));
    await screen.findByText('Arquivo CSV preparado para download.');
    expect(exports.mock.calls[0]![0]).toBe('/v1/pacientes/export.csv?nome=Aplicado&sexo=feminino&limit=10&offset=20');
  });

  it.each([403, 503])('recusa HTTP %i sem arquivo nem falso sucesso e sem exibir texto bruto', async status => {
    const { user } = await setup({ responder: async () => new Response('SQL clínico bruto sintético', { status }) });
    await open(user);
    await user.click(screen.getByRole('button', { name: 'Confirmar exportação CSV' }));
    expect(await screen.findByRole('alert')).not.toHaveTextContent('SQL');
    expect(screen.queryByText('Arquivo CSV preparado para download.')).not.toBeInTheDocument();
    expect(makeUrl).not.toHaveBeenCalled(); expect(click).not.toHaveBeenCalled();
  });

  it('rejeita conteúdo CSV sem o cabeçalho contratado', async () => {
    const { user } = await setup({ responder: async () => new Response('coluna_indevida\ntexto', { headers: { 'Content-Type': 'text/csv' } }) });
    await open(user); await user.click(screen.getByRole('button', { name: 'Confirmar exportação CSV' }));
    await screen.findByRole('alert');
    expect(makeUrl).not.toHaveBeenCalled(); expect(click).not.toHaveBeenCalled();
  });

  it.each(['cancelar', 'filtro', 'indisponível', 'logout', 'unmount'])('descarta resposta atrasada após %s', async action => {
    const late = deferred<Response>();
    const { user, exports, manager, update, unmount } = await setup({ responder: () => late.promise });
    await open(user); await user.click(screen.getByRole('button', { name: 'Confirmar exportação CSV' }));
    const signal = exports.mock.calls[0]![1]!.signal!;
    if (action === 'cancelar') await user.click(screen.getByRole('button', { name: 'Cancelar exportação' }));
    else if (action === 'filtro') update({ ...scope, nome: 'Outro filtro' });
    else if (action === 'indisponível') update({ ...scope, available: false });
    else if (action === 'logout') act(() => manager.logout());
    else unmount();
    expect(signal.aborted).toBe(true);
    await act(async () => { late.resolve(new Response(csv, { headers: { 'Content-Type': 'text/csv' } })); });
    expect(makeUrl).not.toHaveBeenCalled(); expect(click).not.toHaveBeenCalled();
    expect(screen.queryByText('Arquivo CSV preparado para download.')).not.toBeInTheDocument();
  });
});
