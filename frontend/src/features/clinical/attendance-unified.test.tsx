import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { createMemoryRouter, RouterProvider } from 'react-router';
import { afterEach, describe, expect, it } from 'vitest';
import { SessionManager } from '../../app/SessionManager';
import { SessionProvider } from '../../app/session';
import { DraftProvider } from '../../shared/writing';
import { withRegisteredOperations } from '../../test/operation-fixture';
import type { ClinicalIntention } from '../../shared/operation';
import AttendanceFormPage from './AttendanceFormPage';

const managers: SessionManager[] = [];
const routers: ReturnType<typeof createMemoryRouter>[] = [];
afterEach(() => { routers.splice(0).forEach(router => router.dispose()); managers.splice(0).forEach(manager => manager.dispose()); });
interface Write { path: string; operationId: string | null; body: Record<string, unknown> }
async function setup({ loseCommit = false, existing = false, rejectFirst = 0, origin }: { loseCommit?: boolean; existing?: boolean; rejectFirst?: 0 | 400 | 409; origin?: string } = {}) {
  const writes: Write[] = [];
  const intentions: ClinicalIntention[] = [];
  const receipt = { atendimentoId: '501', condicaoChagasId: '502', sorologia0Id: '503', avc0Id: '504', avaliacaoComorbidadesId: '505' };
  const fetcher: typeof fetch = async (url, init) => {
    const path = String(url);
    if (path === '/v1/auth/login') return Response.json({ accessToken: 'sintetico', tokenType: 'Bearer', expiresIn: 3600 });
    if (path === '/v1/auth/me') return Response.json({ usuarioId: '7', nome: 'Profissional sintético', perfil: 'edicao' });
    if (path.startsWith('/v1/operacoes/')) {
      const intention = intentions.find(value => path.endsWith(value.operacaoId));
      return Response.json({ ...intention, estado: rejectFirst === 409 && writes.length === 1 ? 'nao_aplicada' : 'confirmada', expiraEm: '2099-01-01T00:00:00Z', resultado: receipt });
    }
    if (init?.method === 'POST') {
      writes.push({ path, operationId: new Headers(init.headers).get('X-Operacao-Id'), body: JSON.parse(String(init.body)) });
      if (rejectFirst && writes.length === 1) return Response.json({ message: 'SQL privado não publicável',
        errors: [{ path: 'condicaoChagas.formaClinica', code: 'option' }] }, { status: rejectFirst });
      if (loseCommit) throw new TypeError('Falha sintética depois do COMMIT');
      return Response.json(receipt, { status: 201 });
    }
    if (path === '/v1/pacientes/42') return Response.json({ pacienteId: '42', nome: 'Paciente exclusivamente sintético', versao: '1' });
    if (path.startsWith('/v1/catalogos/')) return Response.json([{ id: '9007199254740993', nome: 'Opção sintética', codigo: 'sintetico', ativo: true }]);
    if (path === '/v1/pacientes/42/obito') return Response.json(existing ? { obitoId: '71', houveObito: false, dataObito: null, causaObito: null, observacoes: null } : null);
    if (path === '/v1/pacientes/42/tratamento-bzn') return Response.json(existing ? { tratamentoId: '72', iniciado: false, atendimentoId: null } : null);
    if (path === '/v1/pacientes/42/notificacao') return Response.json(existing ? { notificacaoId: '73', pacienteNotificado: true, numeroNotificacao: 'SINTETICO' } : null);
    if (path.startsWith('/v1/pacientes/42/avcs?')) return Response.json(existing ? [{ eventoId: '74', ocorreu: true, anoEvento: 2001 }] : []);
    if (path.startsWith('/v1/pacientes/42/dispositivos?')) return Response.json(existing ? [{ dispositivoId: '75', tipoDispositivo: 'cdi', possuiDispositivo: true }] : []);
    if (path.startsWith('/v1/pacientes/42/projetos?')) return Response.json(existing ? [{ projetoId: '9007199254740993', nome: 'Projeto existente', participa: true }] : []);
    throw new Error(`Chamada inesperada na fixture sintética: ${path}`);
  };
  const registered = withRegisteredOperations(fetcher);
  const manager = new SessionManager(async (url, init) => {
    if (url === '/v1/operacoes' && init?.method === 'POST') intentions.push(JSON.parse(String(init.body)) as ClinicalIntention);
    return registered(url, init);
  });
  managers.push(manager); await manager.login('sintetico@example.invalid', 'senha-sintetica');
  const router = createMemoryRouter([{ path: '/pacientes/:pacienteId/atendimentos/novo',
    element: <SessionProvider manager={manager}><DraftProvider><AttendanceFormPage /></DraftProvider></SessionProvider> }],
  { initialEntries: [`/pacientes/42/atendimentos/novo${origin ? `?${new URLSearchParams({ retorno: origin })}` : ''}`] });
  routers.push(router); render(<RouterProvider router={router} />);
  const user = userEvent.setup();
  const date = await screen.findByLabelText('Data do atendimento');
  fireEvent.change(date, { target: { value: '2026-04-12' } });
  return { user, writes, intentions, receipt };
}
async function section(user: ReturnType<typeof userEvent.setup>, title: string) {
  await user.click(within(screen.getByRole('navigation', { name: 'Seções do atendimento' })).getByRole('button', { name: title }));
}
const add = (user: ReturnType<typeof userEvent.setup>, title: string) => user.click(screen.getByRole('button', { name: `Adicionar ${title}` }));
const review = (user: ReturnType<typeof userEvent.setup>) => user.click(screen.getByRole('button', { name: 'Revisar atendimento' }));

describe('rascunho e confirmação do atendimento integrado', () => {
  it.each(['/pacientes?nome=Ana&limit=1&offset=2', '/dashboard?nome=Ana&offset=20&inicio=2026-10-01&fim=2026-10-31'])('mantém a origem filtrada após confirmar uma única vez: %s', async origin => {
    const { user, writes } = await setup({ origin });
    const record = `/pacientes/42?${new URLSearchParams({ retorno: origin })}`;
    expect(screen.getByRole('link', { name: 'Ficha do paciente' })).toHaveAttribute('href', record);
    await section(user, 'Condição Clínica');
    await add(user, 'condição de Chagas');
    await user.selectOptions(screen.getByLabelText('Possui sintomas 1'), 'nao');
    await review(user);
    await user.click(screen.getByRole('button', { name: 'Confirmar atendimento' }));
    const detail = await screen.findByRole('link', { name: 'Consultar atendimento confirmado' });
    expect(new URL(detail.getAttribute('href')!, 'http://app.local').searchParams.get('retorno')).toBe(record);
    expect(writes).toHaveLength(1);
  });
  it('preserva campos entre seções e revisa negativo, desconhecido e omitido sem escrever na navegação', async () => {
    const { user, writes } = await setup();
    await section(user, 'Condição Clínica'); await add(user, 'condição de Chagas');
    await user.selectOptions(screen.getByLabelText('Possui sintomas 1'), 'desconhecido');
    fireEvent.change(screen.getByLabelText('Descrição dos sintomas 1'), { target: { value: '  Texto sintético preservado  ' } });
    await section(user, 'Chagas e Sorologia'); await add(user, 'sorologia');
    await user.type(screen.getByLabelText('Método sorológico 1'), 'Método sintético');
    await section(user, 'Avaliação Clínica'); await user.type(screen.getByLabelText('Peso (kg)'), '65.25');
    await section(user, 'Eventos e Dispositivos'); await add(user, 'AVC');
    await user.selectOptions(screen.getByLabelText('Ocorreu AVC 1'), 'nao');
    await section(user, 'Condição Clínica');
    expect(screen.getByLabelText('Descrição dos sintomas 1')).toHaveValue('  Texto sintético preservado  ');
    expect(screen.getByLabelText('Possui sintomas 1')).toHaveValue('desconhecido');
    await section(user, 'Avaliação Clínica'); expect(screen.getByLabelText('Peso (kg)')).toHaveValue(65.25);
    expect(writes).toEqual([]);
    await review(user);
    const summary = screen.getByRole('group', { name: 'Revisão do atendimento' });
    expect(summary).toHaveTextContent('Método sintético'); expect(summary).toHaveTextContent('65.25');
    expect(summary).toHaveTextContent('Desconhecido (registrar)'); expect(summary).toHaveTextContent('Não preenchido (não será enviado)');
    await user.click(screen.getByRole('button', { name: 'Confirmar atendimento' }));
    expect(await screen.findByRole('heading', { name: 'Confirmação concluída' })).toBeVisible();
    expect(writes).toHaveLength(1);
    expect(writes[0]!.path).toBe('/v1/pacientes/42/atendimentos/confirmacao');
    expect(writes[0]!.body).toEqual({ dataAtendimento: '2026-04-12', dadosClinicos: { pesoKg: 65.25 },
      condicaoChagas: { possuiSintomas: null, descricaoSintomas: '  Texto sintético preservado  ' },
      sorologias: [{ metodoSorologico: 'Método sintético' }], avcs: [{ ocorreu: false }] });
    expect(screen.getByRole('status')).toHaveTextContent('Nenhuma operação ficou pendente neste envio.');
  });

  it('inicia outra intenção sem herdar medidas, condição ou estado salvo da confirmação anterior', async () => {
    const { user, writes, intentions } = await setup();
    await section(user, 'Condição Clínica'); await add(user, 'condição de Chagas');
    await user.selectOptions(screen.getByLabelText('Possui sintomas 1'), 'nao');
    await section(user, 'Avaliação Clínica'); await user.type(screen.getByLabelText('Peso (kg)'), '72.50');
    await review(user); await user.click(screen.getByRole('button', { name: 'Confirmar atendimento' }));
    await user.click(await screen.findByRole('button', { name: 'Iniciar novo atendimento' }));
    expect(screen.getByLabelText('Data do atendimento')).toHaveValue('');
    await section(user, 'Avaliação Clínica'); expect(screen.getByLabelText('Peso (kg)')).toHaveValue(null);
    await section(user, 'Condição Clínica'); expect(screen.queryByLabelText('Possui sintomas 1')).not.toBeInTheDocument();
    await add(user, 'condição de Chagas'); await user.selectOptions(screen.getByLabelText('Possui sintomas 1'), 'sim');
    await section(user, 'Atendimento'); fireEvent.change(screen.getByLabelText('Data do atendimento'), { target: { value: '2026-04-13' } });
    await review(user); await user.click(screen.getByRole('button', { name: 'Confirmar atendimento' }));
    expect(await screen.findByRole('heading', { name: 'Confirmação concluída' })).toBeVisible();
    expect(writes).toHaveLength(2); expect(intentions).toHaveLength(2);
    expect(intentions[1]!.operacaoId).not.toBe(intentions[0]!.operacaoId);
    expect(writes[1]!.body).toEqual({ dataAtendimento: '2026-04-13', condicaoChagas: { possuiSintomas: true } });
  });

  it('bloqueia repetição após resposta perdida e recupera o recibo integral sem outro POST clínico', async () => {
    const { user, writes, intentions, receipt } = await setup({ loseCommit: true });
    await section(user, 'Condição Clínica'); await add(user, 'condição de Chagas');
    await user.selectOptions(screen.getByLabelText('Possui sintomas 1'), 'nao');
    await review(user);
    const confirm = screen.getByRole('button', { name: 'Confirmar atendimento' });
    fireEvent.click(confirm); fireEvent.click(confirm);
    await waitFor(() => expect(screen.getByRole('alert')).toHaveTextContent('Não foi possível confirmar se a operação foi salva'));
    expect(confirm).toBeDisabled(); expect(writes).toHaveLength(1); expect(intentions).toHaveLength(1);
    await user.click(screen.getByRole('button', { name: 'Verificar resultado do envio' }));
    expect(await screen.findByRole('heading', { name: 'Confirmação concluída' })).toBeVisible();
    const status = screen.getByRole('status');
    for (const id of Object.values(receipt)) expect(status).toHaveTextContent(`ID ${id}`);
    expect(writes).toHaveLength(1);
  });

  it('consulta histórico existente e não copia nem oferece recriação de registros únicos', async () => {
    const { user, writes } = await setup({ existing: true });
    await section(user, 'Eventos e Dispositivos');
    await waitFor(() => expect(screen.getByText('Já existe registro de óbito. Nenhuma cópia será criada nesta confirmação.')).toBeVisible());
    expect(screen.queryByRole('button', { name: 'Adicionar óbito' })).not.toBeInTheDocument();
    await section(user, 'Medicamentos e BZN');
    expect(screen.queryByRole('button', { name: 'Adicionar tratamento BZN' })).not.toBeInTheDocument();
    await section(user, 'Notificação');
    expect(screen.queryByRole('button', { name: 'Adicionar notificação' })).not.toBeInTheDocument();
    await section(user, 'Condição Clínica'); await add(user, 'condição de Chagas');
    await user.selectOptions(screen.getByLabelText('Possui sintomas 1'), 'nao'); await review(user);
    await user.click(screen.getByRole('button', { name: 'Confirmar atendimento' }));
    expect(await screen.findByRole('heading', { name: 'Confirmação concluída' })).toBeVisible();
    expect(writes[0]!.body).toEqual({ dataAtendimento: '2026-04-12', condicaoChagas: { possuiSintomas: false } });
  });

  it('exige uma avaliação explícita da comorbidade e preserva bigint do catálogo', async () => {
    const { user, writes } = await setup();
    await section(user, 'Comorbidades'); await add(user, 'avaliação de comorbidade');
    await user.selectOptions(screen.getByLabelText('Comorbidade 1'), '9007199254740993');
    await review(user);
    expect(screen.getByRole('alert')).toHaveTextContent('Preencha este campo.'); expect(writes).toHaveLength(0);
    expect(screen.getByLabelText('Possui comorbidade 1')).toHaveAttribute('aria-invalid', 'true');
    await user.selectOptions(screen.getByLabelText('Possui comorbidade 1'), 'desconhecido');
    await review(user); await user.click(screen.getByRole('button', { name: 'Confirmar atendimento' }));
    expect(await screen.findByRole('heading', { name: 'Confirmação concluída' })).toBeVisible();
    expect(writes[0]!.body).toEqual({ dataAtendimento: '2026-04-12', comorbidades: { itens: [{ comorbidadeId: '9007199254740993', possuiComorbidade: null }] } });
  });

  it('após HTTP409 só permite corrigir e enviar nova intenção depois da prova autoritativa de não aplicação', async () => {
    const { user, writes, intentions } = await setup({ rejectFirst: 409 });
    await section(user, 'Condição Clínica'); await add(user, 'condição de Chagas');
    await user.selectOptions(screen.getByLabelText('Possui sintomas 1'), 'nao');
    await section(user, 'Eventos e Dispositivos'); await add(user, 'AVC');
    await user.selectOptions(screen.getByLabelText('Ocorreu AVC 1'), 'nao');
    await review(user); await user.click(screen.getByRole('button', { name: 'Confirmar atendimento' }));
    const confirm = screen.getByRole('button', { name: 'Confirmar atendimento' });
    await waitFor(() => expect(confirm).toBeDisabled());
    expect(writes).toHaveLength(1); expect(intentions).toHaveLength(1);
    expect(screen.queryByRole('button', { name: 'Revisar e preparar novo envio' })).not.toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Verificar resultado do envio' }));
    await waitFor(() => expect(screen.getByRole('alert')).toHaveTextContent('O servidor confirmou que este envio não foi aplicado.'));
    expect(confirm).toBeDisabled(); expect(writes).toHaveLength(1);
    await user.click(screen.getByRole('button', { name: 'Revisar e preparar novo envio' }));
    expect(confirm).toBeEnabled(); expect(writes).toHaveLength(1);
    await section(user, 'Eventos e Dispositivos');
    await user.click(screen.getByRole('button', { name: 'Remover AVC 1' }));
    await section(user, 'Condição Clínica'); expect(screen.getByLabelText('Possui sintomas 1')).toHaveValue('nao');
    await review(user); await user.click(screen.getByRole('button', { name: 'Confirmar atendimento' }));
    expect(await screen.findByRole('heading', { name: 'Confirmação concluída' })).toBeVisible();
    expect(writes).toHaveLength(2); expect(intentions).toHaveLength(2);
    expect(intentions[1]!.operacaoId).not.toBe(intentions[0]!.operacaoId);
    expect(writes[1]!.body).toEqual({ dataAtendimento: '2026-04-12', condicaoChagas: { possuiSintomas: false } });
  });

  it('associa erro HTTP400 de campo complementar à seção e ao controle preservando o rascunho', async () => {
    const { user, writes } = await setup({ rejectFirst: 400 });
    await section(user, 'Condição Clínica'); await add(user, 'condição de Chagas');
    await user.selectOptions(screen.getByLabelText('Forma clínica 1'), 'indeterminada');
    await review(user); await user.click(screen.getByRole('button', { name: 'Confirmar atendimento' }));
    await waitFor(() => expect(screen.getByRole('alert')).toHaveTextContent('Selecione uma opção válida.'));
    expect(screen.getByRole('alert')).not.toHaveTextContent('SQL privado');
    await user.click(screen.getByRole('link', { name: /^Forma clínica 1:/ }));
    const control = screen.getByLabelText('Forma clínica 1');
    await waitFor(() => expect(control).toHaveFocus());
    expect(control).toBeVisible(); expect(control).toHaveValue('indeterminada'); expect(control).toHaveAttribute('aria-invalid', 'true');
    expect(writes).toHaveLength(1);
  });
});
