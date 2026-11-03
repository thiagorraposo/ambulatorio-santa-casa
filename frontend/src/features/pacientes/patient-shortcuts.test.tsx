import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes, useLocation } from 'react-router';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useApiQuery } from '../../api/useApiQuery';
import PatientsPage from './PatientsPage';
import { PatientsSearchReturn, patientsSearchReturn, searchReturnPath } from './PatientsSearchReturn';

vi.mock('../../api/useApiQuery', () => ({ useApiQuery: vi.fn() }));
vi.mock('../clinical/PatientCreateGate', () => ({ PatientCreateLink: () => null }));
const access = vi.hoisted(() => ({ perfil: 'edicao' }));
vi.mock('../../app/session', () => ({ useSession: () => ({ user: { perfil: access.perfil } }) }));
const ID = '9007199254740993';
const origin = '/pacientes?nome=Pessoa&sexo=feminino&limit=1&offset=2';
function Destination() {
  const location = useLocation();
  return <><output>{location.pathname}</output><PatientsSearchReturn /></>;
}
function show() {
  render(<MemoryRouter initialEntries={[origin]}><Routes>
    <Route path="/pacientes" element={<PatientsPage />} />
    <Route path="/pacientes/:pacienteId/editar" element={<Destination />} />
    <Route path="/pacientes/:pacienteId/atendimentos/novo" element={<Destination />} />
  </Routes></MemoryRouter>);
}
beforeEach(() => {
  access.perfil = 'edicao';
  vi.mocked(useApiQuery).mockReturnValue({ isSuccess: true, isFetching: false, isPending: false,
    isError: false, data: [{ pacienteId: ID, nome: 'Pessoa Sintética' }, { pacienteId: '2', nome: 'Pessoa Sintética' }] } as never);
});
describe('8B3U.4 atalhos por pessoa', () => {
  it.each(['edicao', 'administracao'])('identifica homônimos por ID sem leituras de ficha para %s', perfil => {
    access.perfil = perfil;
    show();
    expect(screen.getByRole('link', { name: `Editar Pessoa Sintética, ID ${ID}` })).toHaveAttribute('href',
      `/pacientes/${ID}/editar?${new URLSearchParams({ retorno: origin })}`);
    expect(screen.getByRole('link', { name: 'Editar Pessoa Sintética, ID 2' })).toHaveAttribute('href',
      `/pacientes/2/editar?${new URLSearchParams({ retorno: origin })}`);
    expect(vi.mocked(useApiQuery).mock.calls.every(([path]) => path.startsWith('/pacientes?'))).toBe(true);
  });
  it.each(['Editar', 'Novo atendimento para'])('abre %s da pessoa correta e retorna a filtros e página', async action => {
    const user = userEvent.setup();
    show();
    await user.click(screen.getByRole('link', { name: `${action} Pessoa Sintética, ID ${ID}` }));
    expect(screen.getByRole('status')).toHaveTextContent(`/pacientes/${ID}/${action === 'Editar' ? 'editar' : 'atendimentos/novo'}`);
    await user.click(screen.getByRole('link', { name: 'Voltar aos resultados da busca' }));
    expect(screen.getByRole('searchbox', { name: 'Nome' })).toHaveValue('Pessoa');
    expect(screen.getByRole('combobox', { name: 'Sexo' })).toHaveValue('feminino');
    expect(useApiQuery).toHaveBeenLastCalledWith('/pacientes?nome=Pessoa&sexo=feminino&limit=1&offset=2');
  });
  it('consulta mantém apenas ficha sem atalhos de escrita', () => {
    access.perfil = 'consulta';
    show();
    expect(screen.queryByRole('link', { name: /^Editar|^Novo atendimento/ })).not.toBeInTheDocument();
    expect(screen.getAllByRole('link', { name: 'Ver ficha de Pessoa Sintética' })).toHaveLength(2);
  });
  it.each(['https://outside.invalid', '//outside.invalid', '/pacientes/2', '/pacientes#fora', '/pacientes?nome=a\\b'])('recusa retorno alheio à busca: %s', retorno => {
    render(<MemoryRouter initialEntries={[`/formulario?${new URLSearchParams({ retorno })}`]}><PatientsSearchReturn /></MemoryRouter>);
    expect(screen.queryByRole('link')).not.toBeInTheDocument();
  });
  it('retorna ao Dashboard com filtros, ordenação e página preservados', () => {
    const retorno = '/dashboard?inicio=2026-10-01&fim=2026-10-31&nome=Ana&offset=20&ordem=data_desc';
    render(<MemoryRouter initialEntries={[`/formulario?${new URLSearchParams({ retorno })}`]}><PatientsSearchReturn /></MemoryRouter>);
    expect(screen.getByRole('link', { name: 'Voltar ao dashboard' })).toHaveAttribute('href', retorno);
    expect(searchReturnPath(`/pacientes/${ID}/editar`, retorno)).toBe(`/pacientes/${ID}/editar?${new URLSearchParams({ retorno })}`);
  });
  it.each(['/dashboard/externo', '/dashboard#fora', '/dashboard?nome=a\\b', '/dashboard\n', '/dashboard?nome=a\t', '/dashboardevil', 'https://outside.invalid/dashboard', '//outside.invalid/dashboard'])('rejeita retorno de análise inválido: %s', retorno => {
    expect(patientsSearchReturn(retorno)).toBeNull();
    expect(searchReturnPath(`/pacientes/${ID}/editar`, retorno)).toBe(`/pacientes/${ID}/editar`);
  });
});
