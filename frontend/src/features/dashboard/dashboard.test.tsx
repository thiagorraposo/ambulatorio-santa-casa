import { afterEach, describe, expect, it, vi } from 'vitest';
import { act, fireEvent, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router';
import { SessionManager } from '../../app/SessionManager';
import { SessionProvider } from '../../app/session';
import DashboardPage from './DashboardPage';
import { defaultDashboardPeriod, validDashboardPeriod, type DashboardResponse } from './dashboard-model';
const managers: SessionManager[] = [];
afterEach(() => managers.splice(0).forEach(manager => manager.dispose()));
function data(inicio = '2026-10-30', fim = '2026-10-31'): DashboardResponse {
  const metric = (valor: number, periodoAplicado: boolean) => ({ valor, periodoAplicado, estado: 'disponivel' as const, definicao: 'Definição sintética autorizada' });
  return { resultados: [], paginacao: { limit: 20, offset: 0, total: 0 }, serieAtendimentos: [], projetos: [], periodo: { inicio, fim, limites: 'inclusivos', tempoLotes: 'timestamp_sem_fuso' }, atualizadoEm: '2026-11-03T10:00:00Z', indicadores: {
    pacientes: metric(3, false), atendimentos: metric(inicio === '2026-10-30' ? 3 : 1, true), pendencias: metric(2, false),
    lotes: { estado: 'sem_permissao', valor: null, periodoAplicado: true, definicao: 'Capacidade explícita necessária' },
  } };
}
async function setup() {
  let fail = 0;
  let pending: Promise<Response> | undefined;
  const reads = vi.fn(async (url: string) => {
    if (pending) return pending;
    if (fail) return Response.json({ message: 'SQL não deve vazar' }, { status: fail });
    const params = new URL(url, 'http://synthetic.invalid').searchParams;
    return Response.json(data(params.get('inicio')!, params.get('fim')!));
  });
  const fetcher: typeof fetch = async (url) => {
    if (url === '/v1/auth/login') return Response.json({ accessToken: 'sintetico', tokenType: 'Bearer', expiresIn: 900 });
    if (url === '/v1/auth/me') return Response.json({ usuarioId: '42', nome: 'Conta sintética', perfil: 'consulta' });
    return reads(String(url));
  };
  const manager = new SessionManager(fetcher); managers.push(manager); await manager.login('sintetico', 'senha-sintetica');
  render(<MemoryRouter initialEntries={['/?inicio=2026-10-30&fim=2026-10-31']}><SessionProvider manager={manager}><DashboardPage /></SessionProvider></MemoryRouter>);
  return { user: userEvent.setup(), reads, manager, setFailure: (code: number) => { fail = code; }, setPending: (value: Promise<Response> | undefined) => { pending = value; } };
}
describe('8B1 dashboard integrado', () => {
  it('exibe os quatro indicadores, definições e falta de autorização sem transformá-la em zero', async () => {
    await setup();
    const patients = await screen.findByRole('group', { name: 'Pacientes autorizados' });
    expect(within(patients).getByLabelText('Pacientes autorizados: 3')).toBeVisible();
    expect(patients).toHaveTextContent('Situação atual · todos os períodos');
    const lots = screen.getByRole('group', { name: 'Lotes de importação concluídos' });
    expect(lots).toHaveTextContent('Sem permissão'); expect(lots).not.toHaveTextContent(/^0$/);
    expect(screen.getByText(/30\/10\/2026 a 31\/10\/2026/)).toBeVisible();
    expect(screen.getByRole('link', { name: /Consultar pacientes/ })).toHaveAttribute('href', '/pacientes');
  });
  it('aplica datas na consulta real e mantém indicadores sem filtro temporal', async () => {
    const { user, reads } = await setup(); await screen.findByRole('group', { name: 'Pacientes autorizados' });
    fireEvent.change(screen.getByLabelText('Data inicial'), { target: { value: '2026-11-01' } });
    fireEvent.change(screen.getByLabelText('Data final'), { target: { value: '2026-11-01' } });
    await user.click(screen.getByRole('button', { name: 'Aplicar filtros' }));
    expect(await screen.findByLabelText('Atendimentos realizados: 1')).toBeVisible();
    expect(screen.getByLabelText('Pacientes autorizados: 3')).toBeVisible();
    expect(reads.mock.calls.at(-1)?.[0]).toBe('/v1/dashboard?inicio=2026-11-01&fim=2026-11-01&ordenacao=data_desc&limit=20&offset=0');
  });
  it('recusa período inválido sem nova consulta', async () => {
    const { user, reads } = await setup(); await screen.findByRole('group', { name: 'Pacientes autorizados' });
    fireEvent.change(screen.getByLabelText('Data inicial'), { target: { value: '2026-11-01' } });
    await user.click(screen.getByRole('button', { name: 'Aplicar filtros' }));
    expect(screen.getByRole('alert')).toHaveTextContent('ordem crescente'); expect(reads).toHaveBeenCalledTimes(1);
  });
  it('atualização oculta valores durante carga e falha sem conservar contagens anteriores', async () => {
    const { user, setPending } = await setup(); await screen.findByLabelText('Pacientes autorizados: 3');
    let release!: (value: Response) => void;
    setPending(new Promise(resolve => { release = resolve; }));
    await user.click(screen.getByRole('button', { name: 'Atualizar indicadores' }));
    expect(await screen.findByText('Carregando…')).toBeVisible();
    expect(screen.queryByLabelText('Pacientes autorizados: 3')).not.toBeInTheDocument();
    await act(async () => release(Response.json({}, { status: 503 })));
    expect(await screen.findByRole('alert')).toHaveTextContent('Não foi possível carregar');
    expect(screen.queryByRole('group', { name: 'Pacientes autorizados' })).not.toBeInTheDocument();
  });
  it('erro403 fica explícito sem indicadores fictícios', async () => {
    const { user, setFailure } = await setup(); await screen.findByLabelText('Pacientes autorizados: 3');
    setFailure(403); await user.click(screen.getByRole('button', { name: 'Atualizar indicadores' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('Acesso não autorizado');
    expect(screen.queryByLabelText('Pacientes autorizados: 3')).not.toBeInTheDocument();
  });
  it('valida calendário, limite367dias e padrãoUTC', () => {
    expect(defaultDashboardPeriod(new Date('2026-11-03T00:01:00Z'))).toEqual({ inicio: '2026-11-01', fim: '2026-11-03' });
    expect(validDashboardPeriod('2026-02-29', '2026-03-01')).toBe(false);
    expect(validDashboardPeriod('2026-01-01', '2027-01-02')).toBe(true);
    expect(validDashboardPeriod('2026-01-01', '2027-01-03')).toBe(false);
  });
});
