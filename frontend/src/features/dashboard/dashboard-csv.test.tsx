import { afterEach, describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router';
import { SessionManager } from '../../app/SessionManager';
import { SessionProvider } from '../../app/session';
import DashboardCsvExport from './DashboardCsvExport';
const managers: SessionManager[] = [];
afterEach(() => { managers.splice(0).forEach(manager => manager.dispose()); vi.restoreAllMocks(); vi.unstubAllGlobals(); });
async function setup(total = 2, failure = 0) {
  const exports = vi.fn(async () => failure ? Response.json({}, { status: failure }) : new Response('paciente_id,nome,atendimento_id,data_atendimento,pendencias_abertas\n1,Sintética,2,2004-03-13,0\n', { headers: { 'content-type': 'text/csv' } }));
  const fetcher: typeof fetch = async (path) => path === '/v1/auth/login' ? Response.json({ accessToken: 'sintetico', tokenType: 'Bearer', expiresIn: 900 }) : path === '/v1/auth/me' ? Response.json({ usuarioId: '42', nome: 'Conta sintética', perfil: 'consulta' }) : exports();
  const manager = new SessionManager(fetcher); managers.push(manager); await manager.login('sintetico', 'senha-sintetica');
  const create = vi.fn(() => 'blob:sintetico'); const revoke = vi.fn();
  vi.stubGlobal('URL', class extends URL { static createObjectURL = create; static revokeObjectURL = revoke; });
  const clicked = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {});
  const view = render(<MemoryRouter><SessionProvider manager={manager}><DashboardCsvExport filters="inicio=2004-03-01&fim=2004-03-31&ordenacao=data_asc" total={total} available /></SessionProvider></MemoryRouter>);
  return { user: userEvent.setup(), exports, clicked, create, revoke, view };
}
describe('CSV analítico autorizado', () => {
  it('revisa escopo de todas as páginas antes de baixar e libera o arquivo ao sair', async () => {
    const { user, exports, clicked, create, revoke, view } = await setup();
    await user.click(screen.getByRole('button', { name: 'Exportar CSV' }));
    expect(exports).not.toHaveBeenCalled();
    expect(screen.getByText(/em todas as páginas/)).toBeVisible();
    await user.click(screen.getByRole('button', { name: 'Confirmar exportação CSV' }));
    expect(await screen.findByRole('status')).toHaveTextContent('preparado para download');
    expect(clicked).toHaveBeenCalledTimes(1); expect(create).toHaveBeenCalledTimes(1);
    view.unmount(); expect(revoke).toHaveBeenCalledWith('blob:sintetico');
  });
  it('exige refinamento acima do limite e não baixa arquivo parcial', async () => {
    const { exports } = await setup(5001);
    expect(screen.getByRole('button', { name: 'Exportar CSV' })).toBeDisabled();
    expect(screen.getByRole('status')).toHaveTextContent('Refine os filtros'); expect(exports).not.toHaveBeenCalled();
  });
  it('expõe recusa do servidor sem anunciar download concluído', async () => {
    const { user, clicked } = await setup(2, 403);
    await user.click(screen.getByRole('button', { name: 'Exportar CSV' }));
    await user.click(screen.getByRole('button', { name: 'Confirmar exportação CSV' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('não tem autorização'); expect(clicked).not.toHaveBeenCalled();
  });
});
