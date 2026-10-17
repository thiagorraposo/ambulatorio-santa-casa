import { QueryClient, QueryClientProvider, type UseQueryResult } from '@tanstack/react-query';
import { useState } from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { createMemoryRouter, Link, RouterProvider } from 'react-router';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ApiError } from '../../api/client';
import type { PacienteDetalheResponse, ProjectResponse, TratamentoBznResponse } from '../../api/contracts';
import { useApiQuery } from '../../api/useApiQuery';
import { useSession } from '../../app/session';
import { DraftProvider } from '../../shared/writing';
import FollowupPage from './FollowupPage';

vi.mock('../../api/useApiQuery', () => ({ useApiQuery: vi.fn() }));
vi.mock('../../app/session', () => ({ useSession: vi.fn() }));

const ID = '9007199254740993';
const ATTENDANCE = '9007199254740995';
const path = `/pacientes/${ID}`;
const responses = new Map<string, unknown>();
const request = vi.fn();
const get = vi.fn();
const patient: PacienteDetalheResponse = {
  pacienteId: ID, nome: 'Pessoa Sintética', dataNascimento: null, sexo: null, idade: null,
  dataReferenciaIdade: '2026-10-04', raca: null, pertenceComunidadeTradicional: null,
  tipoComunidadeTradicional: null, versao: '1', endereco: null, telefones: [], atendimentos: [],
  paginacaoColecoes: { limit: 1, offset: 0 },
};
const treatment: TratamentoBznResponse = {
  tratamentoId: '101', atendimentoId: ATTENDANCE, temIndicacao: null, iniciado: null,
  tratamentoPeloAmbulatorio: null, duracaoCumpridaDias: null, anoUsoAproximado: null,
  dataPrescricao: null, motivoNaoIndicacao: null, motivoNaoInicio: null,
  teveReacaoAdversa: null, observacoes: null, reacoes: [],
};

function renderFollowup(kind: string, extra = '') {
  const router = createMemoryRouter([
    { path: '/pacientes/:pacienteId/registrar', element: <FollowupPage /> },
    { path: '/pacientes/:pacienteId', element: <><p>Ficha sintética para verificação</p>
      <Link to={`${path}/registrar?tipo=${kind}${extra}`}>Registrar novamente</Link></> },
  ], { initialEntries: [`${path}/registrar?tipo=${kind}${extra}`] });
  const queries = new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: 0 } } });
  const element = () => <QueryClientProvider client={queries}><DraftProvider><RouterProvider router={router} /></DraftProvider></QueryClientProvider>;
  const view = render(element());
  return { ...view, router, refresh: () => view.rerender(element()) };
}

beforeEach(() => {
  responses.clear();
  responses.set(`${path}?limit=1&offset=0`, patient);
  responses.set(`${path}/atendimentos?limit=20&offset=0`, [{ atendimentoId: ATTENDANCE, dataAtendimento: '2024-02-29',
    localizacaoProntuario: null, ambulatorioUnicamente: null, ambulatorioAnexoProjeto: null, observacoes: null, versao: '1' }]);
  responses.set(`${path}/atendimentos/${ATTENDANCE}?limit=1&offset=0`, { atendimentoId: ATTENDANCE, dataAtendimento: '2024-02-29' });
  responses.set(`${path}/tratamento-bzn`, treatment);
  responses.set(`${path}/notificacao`, null);
  responses.set(`${path}/projetos?limit=100&offset=0`, []);
  responses.set(`${path}/pendencias?limit=100&offset=0`, []);
  responses.set(`${path}/pendencias?limit=20&offset=0`, []);
  responses.set(`${path}/encaminhamentos?limit=20&offset=0`, [{ encaminhamentoId: '301', atendimentoId: ATTENDANCE,
    destinoServico: 'Serviço Sintético', destinoNome: null }]);
  responses.set(`${path}/encaminhamentos?limit=100&offset=0`, responses.get(`${path}/encaminhamentos?limit=20&offset=0`));
  responses.set('/catalogos/projetos?limit=20&offset=0', [{ id: '501', codigo: 'SINTETICO', nome: 'Projeto Sintético', ativo: true }]);
  responses.set('/catalogos/tipos-encaminhamento?limit=20&offset=0', [{ id: '601', codigo: 'SINTETICO', nome: 'Tipo Sintético', ativo: true }]);
  vi.mocked(useSession).mockReturnValue({ status: 'authenticated', generation: 1, identityError: null, reason: null,
    user: { usuarioId: '11', nome: 'Equipe Sintética', perfil: 'edicao' }, client: {
      request: async (resource: string, options: { method: string; body?: unknown }) => resource === '/operacoes'
        ? { ...(options.body as object), estado: 'registrada', expiraEm: '2099-01-01T00:00:00Z' }
        : request(resource, { method: options.method, body: options.body }), get },
  } as unknown as ReturnType<typeof useSession>);
  vi.mocked(useApiQuery).mockImplementation(<T,>(queryPath: string, enabled = true): UseQueryResult<T, ApiError> => {
    const [, setRevision] = useState(0);
    const refetch = vi.fn(async () => { setRevision(value => value + 1); });
    if (!enabled) return { isSuccess: false, isError: false, isPending: false, isFetching: false,
      data: undefined, refetch } as unknown as UseQueryResult<T, ApiError>;
    if (!responses.has(queryPath)) throw new Error(`Resposta sintética ausente para ${queryPath}`);
    const data = responses.get(queryPath);
    if (data instanceof ApiError) return { isSuccess: false, isError: true, isPending: false, isFetching: false,
      error: data, refetch } as unknown as UseQueryResult<T, ApiError>;
    return { isSuccess: true, isError: false, isPending: false, isFetching: false,
      data, refetch } as unknown as UseQueryResult<T, ApiError>;
  });
  get.mockImplementation(async (queryPath: string) => {
    if (!responses.has(queryPath)) throw new Error(`Resposta sintética ausente para ${queryPath}`);
    const data = responses.get(queryPath);
    if (data instanceof Error) throw data;
    return data;
  });
  request.mockResolvedValue({ retornoId: '201' });
});

describe('formulários de acompanhamento', () => {
  it('perfil consulta não apresenta controles de gravação e a leitura não cria registros', () => {
    const session = vi.mocked(useSession).getMockImplementation()!();
    vi.mocked(useSession).mockReturnValue({ ...session, user: { usuarioId: '11', nome: 'Consulta Sintética', perfil: 'consulta' } });
    renderFollowup('bzn');
    expect(screen.getByText(/Seu perfil permite consultar registros/)).toBeVisible();
    expect(screen.queryByRole('button', { name: 'Salvar registro' })).not.toBeInTheDocument();
    expect(request).not.toHaveBeenCalled();
    expect(useApiQuery).toHaveBeenCalledTimes(1);
  });

  it('BZN existente não oferece nova criação ou uma edição sem suporte', () => {
    renderFollowup('bzn');
    expect(screen.getByRole('heading', { name: 'Tratamento BZN já registrado' })).toBeVisible();
    expect(screen.queryByRole('button', { name: 'Salvar registro' })).not.toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Consultar tratamento e reações' })).toHaveAttribute('href', `${path}?aba=bzn`);
    expect(request).not.toHaveBeenCalled();
  });

  it('falha na consulta de BZN não é tratada como ausência de tratamento', () => {
    responses.set(`${path}/tratamento-bzn`, new ApiError(503));
    renderFollowup('bzn');
    expect(screen.getByRole('alert')).toHaveTextContent('O serviço está indisponível');
    expect(screen.queryByRole('button', { name: 'Salvar registro' })).not.toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: 'Tratamento BZN necessário' })).not.toBeInTheDocument();
    expect(request).not.toHaveBeenCalled();
  });

  it.each(['invalido', '9007199254740997'])('contexto de atendimento %s não confirmado impede qualquer formulário de escrita', id => {
    if (/^\d+$/.test(id)) responses.set(`${path}/atendimentos/${id}?limit=1&offset=0`, new ApiError(404));
    renderFollowup('encaminhamento', `&atendimentoId=${id}`);
    expect(screen.queryByRole('button', { name: 'Salvar registro' })).not.toBeInTheDocument();
    expect(screen.queryByLabelText('Serviço de destino')).not.toBeInTheDocument();
    expect(request).not.toHaveBeenCalled();
  });

  it('preserva contexto nos atalhos BZN/retorno e na origem, e troca explícita leva o novo atendimento aos links', async () => {
    const user = userEvent.setup();
    const second = '9007199254740997';
    const attendanceRows = responses.get(`${path}/atendimentos?limit=20&offset=0`) as object[];
    responses.set(`${path}/atendimentos?limit=20&offset=0`, [...attendanceRows,
      { atendimentoId: second, dataAtendimento: '2024-05-12' }]);
    responses.set(`${path}/atendimentos/${second}?limit=1&offset=0`, { atendimentoId: second, dataAtendimento: '2024-05-12' });
    const source = `${path}/atendimentos/${ATTENDANCE}?limit=10&offset=20`;
    renderFollowup('bzn', `&atendimentoId=${ATTENDANCE}&retorno=${encodeURIComponent(source)}`);
    const bznReturn = screen.getByRole('link', { name: 'Registrar retorno BZN efetivo' });
    expect(new URL(bznReturn.getAttribute('href')!, 'http://app.local').searchParams.get('atendimentoId')).toBe(ATTENDANCE);
    await user.click(bznReturn);
    expect(screen.getByLabelText('Atendimento de registro')).toHaveValue(ATTENDANCE);
    expect(screen.getByRole('link', { name: 'Voltar à origem' })).toHaveAttribute('href', source);
    await user.selectOptions(screen.getByLabelText('Atendimento de registro'), second);
    const annual = screen.getByRole('link', { name: 'Registrar retorno anual' });
    expect(new URL(annual.getAttribute('href')!, 'http://app.local').searchParams.get('atendimentoId')).toBe(second);
    expect(useApiQuery).toHaveBeenCalledWith(`${path}/atendimentos/${second}?limit=1&offset=0`, true);
    expect(request).not.toHaveBeenCalled();
  });

  it('perda concorrente de BZN conserva campos e reações para comparação/cópia e exige descarte explícito', async () => {
    const user = userEvent.setup();
    responses.set(`${path}/tratamento-bzn`, null);
    request.mockImplementation(async () => {
      responses.set(`${path}/tratamento-bzn`, { ...treatment, observacoes: 'Tratamento concorrente sintético' });
      throw new ApiError(409);
    });
    renderFollowup('bzn', `&atendimentoId=${ATTENDANCE}`);
    await user.type(screen.getByLabelText('Observações do tratamento'), 'Texto do rascunho perdedor');
    await user.type(screen.getByLabelText('Ano aproximado de uso'), '2014');
    await user.click(screen.getByRole('button', { name: 'Adicionar reação' }));
    await user.type(screen.getByLabelText('Descrição da reação 1'), 'Reação própria do rascunho');
    await user.type(screen.getByLabelText('Consequência da reação 1'), 'Consequência não enviada novamente');
    await user.click(screen.getByRole('button', { name: 'Salvar registro' }));
    expect(await screen.findByRole('table', { name: 'Tratamento registrado e valores do rascunho BZN' })).toBeVisible();
    expect(screen.getByText('Tratamento concorrente sintético')).toBeVisible();
    expect(screen.getByLabelText('Observações do tratamento')).toHaveValue('Texto do rascunho perdedor');
    expect(screen.getByLabelText('Descrição da reação 1')).toHaveValue('Reação própria do rascunho');
    expect(screen.getByRole('button', { name: 'Salvar registro' })).toBeDisabled();
    const contents = JSON.parse((screen.getByLabelText('Rascunho BZN para copiar') as HTMLTextAreaElement).value);
    expect(contents).toMatchObject({ atendimentoId: ATTENDANCE, anoUsoAproximado: '2014',
      reacoes: [{ descricao: 'Reação própria do rascunho', consequencia: 'Consequência não enviada novamente' }] });
    const copy = vi.spyOn(navigator.clipboard, 'writeText').mockResolvedValue();
    await user.click(screen.getByRole('button', { name: 'Copiar rascunho BZN' }));
    expect(copy).toHaveBeenCalledWith(expect.stringContaining('Reação própria do rascunho'));
    expect(request).toHaveBeenCalledTimes(1);
    await user.click(screen.getByRole('button', { name: 'Descartar este rascunho BZN' }));
    expect(screen.getByLabelText('Observações do tratamento')).toHaveValue('Texto do rascunho perdedor');
    await user.click(screen.getByRole('button', { name: 'Confirmar descarte do rascunho BZN' }));
    expect(screen.queryByLabelText('Observações do tratamento')).not.toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Tratamento BZN já registrado' })).toBeVisible();
    const unload = new Event('beforeunload', { cancelable: true });
    fireEvent(window, unload);
    expect(unload.defaultPrevented).toBe(false);
    expect(request).toHaveBeenCalledTimes(1);
  });

  it('falha de leitura após conflito BZN mantém o rascunho bloqueado e a reconsulta não escreve', async () => {
    const user = userEvent.setup();
    responses.set(`${path}/tratamento-bzn`, null);
    request.mockImplementation(async () => {
      responses.set(`${path}/tratamento-bzn`, new ApiError(503));
      throw new ApiError(409);
    });
    renderFollowup('bzn');
    await user.type(screen.getByLabelText('Observações do tratamento'), 'Rascunho após falha da leitura');
    await user.click(screen.getByRole('button', { name: 'Salvar registro' }));
    expect(await screen.findByText(/O serviço está indisponível ou este recurso está desabilitado/)).toBeVisible();
    expect(screen.queryByRole('button', { name: 'Salvar registro' })).not.toBeInTheDocument();
    responses.set(`${path}/tratamento-bzn`, treatment);
    await user.click(screen.getByRole('button', { name: 'Tentar novamente' }));
    expect(await screen.findByLabelText('Observações do tratamento')).toHaveValue('Rascunho após falha da leitura');
    expect(screen.getByRole('button', { name: 'Salvar registro' })).toBeDisabled();
    expect(request).toHaveBeenCalledTimes(1);
  });

  it('cria tratamento com reação completa sem inferir indicadores preenchidos como desconhecidos', async () => {
    const user = userEvent.setup();
    responses.set(`${path}/tratamento-bzn`, null);
    request.mockResolvedValue({ tratamentoId: '101' });
    renderFollowup('bzn');
    await user.selectOptions(screen.getByLabelText('Atendimento de registro'), ATTENDANCE);
    await user.selectOptions(screen.getByLabelText('Tem indicação de BZN?'), 'false');
    await user.type(screen.getByLabelText('Motivo de não indicação'), 'Relato sintético');
    await user.type(screen.getByLabelText('Duração efetivamente cumprida (dias)'), '60');
    await user.click(screen.getByRole('button', { name: 'Adicionar reação' }));
    await user.type(screen.getByLabelText('Descrição da reação 1'), 'Reação sintética');
    await user.type(screen.getByLabelText('Gravidade da reação 1'), 'Gravidade textual');
    fireEvent.change(screen.getByLabelText('Data da reação 1'), { target: { value: '2024-02-29' } });
    await user.type(screen.getByLabelText('Consequência da reação 1'), 'Consequência textual');
    await user.type(screen.getByLabelText('Observações da reação 1'), 'Observação preservada');
    await user.click(screen.getByRole('button', { name: 'Salvar registro' }));
    expect(await screen.findByText('Registro salvo.')).toBeVisible();
    expect(request).toHaveBeenCalledWith(`${path}/tratamento-bzn`, { method: 'POST', body: expect.objectContaining({
      atendimentoId: ATTENDANCE, temIndicacao: false, iniciado: null, teveReacaoAdversa: null, duracaoCumpridaDias: 60,
      reacoes: [{ descricao: 'Reação sintética', gravidade: 'Gravidade textual', dataReacao: '2024-02-29',
        consequencia: 'Consequência textual', observacoes: 'Observação preservada' }],
    }) });
    expect(screen.getByRole('button', { name: 'Salvar registro' })).toBeDisabled();
    expect(screen.getByLabelText('Descrição da reação 1')).toHaveValue('Reação sintética');
    expect(screen.getByLabelText('Duração efetivamente cumprida (dias)')).toHaveValue(60);
  });

  it('rascunho BZN iniciado sem contexto permanece ao escolher atendimento e alternar módulos pelos atalhos', async () => {
    const user = userEvent.setup();
    responses.set(`${path}/tratamento-bzn`, null);
    renderFollowup('bzn');
    await user.type(screen.getByLabelText('Observações do tratamento'), 'Rascunho iniciado antes da escolha');
    await user.selectOptions(screen.getByLabelText('Atendimento de registro'), ATTENDANCE);
    await user.click(screen.getByRole('link', { name: 'Notificação do paciente' }));
    await user.click(await screen.findByRole('button', { name: 'Sair e manter rascunho' }));
    await user.click(screen.getByRole('link', { name: 'Registrar tratamento BZN' }));
    expect(screen.getByLabelText('Atendimento de registro')).toHaveValue(ATTENDANCE);
    expect(screen.getByLabelText('Observações do tratamento')).toHaveValue('Rascunho iniciado antes da escolha');
    expect(request).not.toHaveBeenCalled();
  });

  it('recibo de retorno iniciado sem contexto permanece ao navegar entre módulos depois de escolher atendimento', async () => {
    const user = userEvent.setup();
    renderFollowup('retorno-anual');
    await user.selectOptions(screen.getByLabelText('Atendimento de registro'), ATTENDANCE);
    fireEvent.change(screen.getByLabelText('Data efetiva do comparecimento'), { target: { value: '2024-02-29' } });
    await user.type(screen.getByLabelText('Resumo do retorno anual'), 'Comparecimento sem contexto inicial');
    await user.click(screen.getByRole('button', { name: 'Salvar registro' }));
    expect(await screen.findByText('Registro salvo.')).toBeVisible();
    await user.click(screen.getByRole('link', { name: 'Notificação do paciente' }));
    await user.click(screen.getByRole('link', { name: 'Registrar retorno anual' }));
    expect(screen.getByText('Registro salvo.')).toBeVisible();
    expect(screen.getByText('201')).toBeVisible();
    expect(screen.getByLabelText('Resumo do retorno anual')).toHaveValue('Comparecimento sem contexto inicial');
    expect(screen.getByRole('button', { name: 'Salvar registro' })).toBeDisabled();
    expect(request).toHaveBeenCalledTimes(1);
  });

  it('permite dois retornos BZN depois de conferir o primeiro, com comprovantes separados', async () => {
    const user = userEvent.setup();
    renderFollowup('retorno-bzn', `&atendimentoId=${ATTENDANCE}`);
    await user.selectOptions(screen.getByLabelText('Tipo de retorno BZN'), 'retorno_bzn_30_dias');
    fireEvent.change(screen.getByLabelText('Data efetiva do comparecimento'), { target: { value: '2024-02-29' } });
    await user.type(screen.getByLabelText('Resumo do retorno'), 'Primeiro retorno sintético');
    await user.click(screen.getByRole('button', { name: 'Salvar registro' }));
    expect(await screen.findByText('Registro salvo.')).toBeVisible();
    expect(screen.getByLabelText('Resumo do retorno')).toHaveValue('Primeiro retorno sintético');
    await user.click(screen.getByRole('link', { name: 'Verificar registro salvo' }));
    await user.click(screen.getByRole('link', { name: 'Registrar novamente' }));
    expect(screen.getByText('Registro salvo.')).toBeVisible();
    await user.click(screen.getByRole('button', { name: 'Registrar outro comparecimento' }));
    expect(screen.queryByText('Registro salvo.')).not.toBeInTheDocument();
    await user.selectOptions(screen.getByLabelText('Tipo de retorno BZN'), 'retorno_bzn_final');
    fireEvent.change(screen.getByLabelText('Data efetiva do comparecimento'), { target: { value: '2024-04-15' } });
    await user.type(screen.getByLabelText('Resumo do retorno'), 'Segundo retorno sintético');
    request.mockResolvedValue({ retornoId: '202' });
    await user.click(screen.getByRole('button', { name: 'Salvar registro' }));
    expect(await screen.findByText('Registro salvo.')).toBeVisible();
    expect(request).toHaveBeenCalledTimes(2);
    expect(request.mock.calls.map(([, options]) => options.body)).toEqual([
      { atendimentoId: ATTENDANCE, tipo: 'retorno_bzn_30_dias', dataRealizada: '2024-02-29', resumo: 'Primeiro retorno sintético' },
      { atendimentoId: ATTENDANCE, tipo: 'retorno_bzn_final', dataRealizada: '2024-04-15', resumo: 'Segundo retorno sintético' },
    ]);
  });

  it('mantém o envio ambíguo bloqueado e o rascunho preservado após a leitura e retorno', async () => {
    const user = userEvent.setup();
    request.mockRejectedValue(new ApiError(0));
    renderFollowup('retorno-anual', `&atendimentoId=${ATTENDANCE}`);
    fireEvent.change(screen.getByLabelText('Data efetiva do comparecimento'), { target: { value: '2024-10-04' } });
    await user.type(screen.getByLabelText('Resumo do retorno anual'), 'Rascunho sintético');
    await user.click(screen.getByRole('button', { name: 'Salvar registro' }));
    expect(await screen.findByText(/Não foi possível confirmar se a operação foi salva/)).toBeVisible();
    expect(screen.getByRole('button', { name: 'Salvar registro' })).toBeDisabled();
    await user.click(screen.getByRole('link', { name: 'Verificar registro salvo' }));
    await user.click(await screen.findByRole('button', { name: 'Sair e manter rascunho' }));
    await user.click(await screen.findByRole('link', { name: 'Registrar novamente' }));
    expect(screen.getByLabelText('Resumo do retorno anual')).toHaveValue('Rascunho sintético');
    expect(screen.getByRole('button', { name: 'Salvar registro' })).toBeDisabled();
    expect(request).toHaveBeenCalledTimes(1);
  });

  it('carrega um projeto além da primeira página e salva só o estado alterado', async () => {
    const user = userEvent.setup();
    const first: ProjectResponse[] = Array.from({ length: 100 }, (_, index) => ({
      projetoId: String(index + 1), codigo: `SINTETICO_${index}`, nome: `Projeto sintético ${index}`,
      participa: null, possuiPendencia: null, descricaoPendencia: null, houveFalha: null, descricaoFalha: null, observacoes: null,
    }));
    responses.set(`${path}/projetos?limit=100&offset=0`, first);
    responses.set(`${path}/projetos?limit=100&offset=100`, [{ projetoId: '501', codigo: 'SINTETICO', nome: 'Projeto Sintético',
      participa: false, possuiPendencia: null, descricaoPendencia: 'Descrição anterior preservada', houveFalha: false,
      descricaoFalha: 'Texto independente', observacoes: null }]);
    request.mockResolvedValue({ projetoId: '501' });
    renderFollowup('projeto');
    await user.selectOptions(screen.getByLabelText('Projeto'), '501');
    expect(await screen.findByLabelText('Participa do projeto?')).toHaveValue('false');
    expect(screen.getByLabelText('Descrição da pendência no projeto')).toHaveValue('Descrição anterior preservada');
    expect(get).toHaveBeenCalledWith(`${path}/projetos?limit=100&offset=100`, expect.any(AbortSignal));
    await user.selectOptions(screen.getByLabelText('Participa do projeto?'), '');
    await user.click(screen.getByRole('button', { name: 'Salvar registro' }));
    expect(await screen.findByText('Registro salvo.')).toBeVisible();
    expect(request).toHaveBeenCalledWith(`${path}/projetos`, { method: 'PUT', body: { projetoId: '501', participa: null } });
  });

  it('preserva rascunhos ao alternar projetos e protege recarga com um rascunho inativo', async () => {
    const user = userEvent.setup();
    responses.set('/catalogos/projetos?limit=20&offset=0', [
      { id: '501', codigo: 'SINTETICO_A', nome: 'Projeto Sintético A', ativo: true },
      { id: '502', codigo: 'SINTETICO_B', nome: 'Projeto Sintético B', ativo: true },
      { id: '503', codigo: 'SINTETICO_INATIVO', nome: 'Projeto Sintético Inativo', ativo: false },
    ]);
    renderFollowup('projeto');
    expect(screen.queryByRole('option', { name: /Projeto Sintético Inativo/ })).not.toBeInTheDocument();
    await user.selectOptions(screen.getByLabelText('Projeto'), '501');
    await user.type(await screen.findByLabelText('Descrição da pendência no projeto'), 'Rascunho próprio do projeto A');
    await user.selectOptions(screen.getByLabelText('Projeto'), '502');
    expect(await screen.findByLabelText('Descrição da pendência no projeto')).toHaveValue('');
    expect(screen.getByRole('button', { name: 'Salvar registro' })).toBeDisabled();
    const unload = new Event('beforeunload', { cancelable: true });
    fireEvent(window, unload);
    expect(unload.defaultPrevented).toBe(true);
    await user.selectOptions(screen.getByLabelText('Projeto'), '501');
    expect(await screen.findByLabelText('Descrição da pendência no projeto')).toHaveValue('Rascunho próprio do projeto A');
    expect(request).not.toHaveBeenCalled();
  });

  it('preserva número/justificativa independentes e permite nova edição da notificação após leitura', async () => {
    const user = userEvent.setup();
    const previous = { notificacaoId: '701', pacienteNotificado: false, numeroNotificacao: 'SINTETICO-001',
      justificativaNaoNotificacao: 'Justificativa anterior', observacoes: 'Anterior' };
    responses.set(`${path}/notificacao`, previous);
    request.mockImplementation(async (_resource: string, options: { body: unknown }) => {
      responses.set(`${path}/notificacao`, { ...previous, ...(options.body as object) });
      return { notificacaoId: '701' };
    });
    renderFollowup('notificacao');
    expect(screen.getByLabelText('Paciente notificado?')).toHaveValue('false');
    expect(screen.getByLabelText('Número da notificação')).toHaveValue('SINTETICO-001');
    await user.clear(screen.getByLabelText('Observações da notificação'));
    await user.type(screen.getByLabelText('Observações da notificação'), 'Nova observação');
    await user.click(screen.getByRole('button', { name: 'Salvar registro' }));
    expect(await screen.findByText('Registro salvo.')).toBeVisible();
    expect(request).toHaveBeenLastCalledWith(`${path}/notificacao`, { method: 'PUT', body: { observacoes: 'Nova observação' } });
    await user.click(screen.getByRole('link', { name: 'Verificar registro salvo' }));
    await user.click(screen.getByRole('link', { name: 'Registrar novamente' }));
    expect(screen.getByLabelText('Observações da notificação')).toHaveValue('Nova observação');
    await user.click(screen.getByRole('button', { name: 'Revisar este registro novamente' }));
    await user.selectOptions(screen.getByLabelText('Paciente notificado?'), '');
    await user.click(screen.getByRole('button', { name: 'Salvar registro' }));
    expect(await screen.findByText('Registro salvo.')).toBeVisible();
    expect(request).toHaveBeenLastCalledWith(`${path}/notificacao`, { method: 'PUT', body: { pacienteNotificado: null } });
    expect(request).toHaveBeenCalledTimes(2);
  });

  it('mantém episódios de contrarreferência separados no encaminhamento escolhido', async () => {
    const user = userEvent.setup();
    request.mockResolvedValue({ contrarreferenciaId: '801' });
    renderFollowup('contrarreferencia', '&encaminhamentoId=301');
    await user.type(await screen.findByLabelText('Resumo da contrarreferência'), 'Episódio sintético 1');
    await user.click(screen.getByRole('button', { name: 'Salvar registro' }));
    expect(await screen.findByText('Registro salvo.')).toBeVisible();
    await user.click(screen.getByRole('link', { name: 'Verificar registro salvo' }));
    await user.click(screen.getByRole('link', { name: 'Registrar novamente' }));
    await user.click(screen.getByRole('button', { name: 'Registrar outro episódio' }));
    await user.type(screen.getByLabelText('Resumo da contrarreferência'), 'Episódio sintético 2');
    request.mockResolvedValue({ contrarreferenciaId: '802' });
    await user.click(screen.getByRole('button', { name: 'Salvar registro' }));
    expect(await screen.findByText('Registro salvo.')).toBeVisible();
    expect(request).toHaveBeenCalledTimes(2);
    expect(request.mock.calls.map(([resource, options]) => [resource, options.body.resumo])).toEqual([
      [`${path}/encaminhamentos/301/contrarreferencias`, 'Episódio sintético 1'],
      [`${path}/encaminhamentos/301/contrarreferencias`, 'Episódio sintético 2'],
    ]);
  });

  it('envia encaminhamento com todos os campos públicos preenchidos e mantém a data escolhida', async () => {
    const user = userEvent.setup();
    request.mockResolvedValue({ encaminhamentoId: '302' });
    renderFollowup('encaminhamento', `&atendimentoId=${ATTENDANCE}`);
    await user.selectOptions(screen.getByLabelText('Tipo de encaminhamento'), '601');
    await user.selectOptions(screen.getByLabelText('Projeto associado ao encaminhamento'), '501');
    await user.selectOptions(screen.getByLabelText('Origem do encaminhamento'), 'projeto_pesquisa');
    await user.type(screen.getByLabelText('Nome do destino'), 'Destino sintético');
    await user.type(screen.getByLabelText('Serviço de destino'), 'Serviço sintético');
    await user.type(screen.getByLabelText('Especialidade de destino'), 'Especialidade sintética');
    fireEvent.change(screen.getByLabelText('Data do encaminhamento'), { target: { value: '2024-02-29' } });
    fireEvent.change(screen.getByLabelText('Data do agendamento'), { target: { value: '2024-03-12' } });
    fireEvent.change(screen.getByLabelText('Data da realização'), { target: { value: '2024-03-15' } });
    await user.selectOptions(screen.getByLabelText('Status do encaminhamento'), 'realizado');
    await user.selectOptions(screen.getByLabelText('Prioridade'), 'media');
    await user.selectOptions(screen.getByLabelText('Documento apresentado?'), 'false');
    await user.type(screen.getByLabelText('Motivo do encaminhamento'), 'Motivo sintético');
    await user.type(screen.getByLabelText('Conduta orientada'), 'Conduta sintética');
    await user.type(screen.getByLabelText('Observações do encaminhamento'), 'Observações sintéticas');
    await user.click(screen.getByRole('button', { name: 'Salvar registro' }));
    expect(await screen.findByText('Registro salvo.')).toBeVisible();
    expect(request).toHaveBeenCalledWith(`${path}/encaminhamentos`, { method: 'POST', body: {
      atendimentoId: ATTENDANCE, tipoEncaminhamentoId: '601', projetoId: '501', origem: 'projeto_pesquisa',
      destinoNome: 'Destino sintético', destinoServico: 'Serviço sintético', especialidadeDestino: 'Especialidade sintética',
      dataEncaminhamento: '2024-02-29', dataAgendamento: '2024-03-12', dataRealizacao: '2024-03-15',
      status: 'realizado', prioridade: 'media', documentoApresentado: false, motivo: 'Motivo sintético',
      condutaOrientada: 'Conduta sintética', observacoes: 'Observações sintéticas',
    } });
    expect(screen.getByLabelText('Data do encaminhamento')).toHaveValue('2024-02-29');
  });

  it.each([403, 409])('preserva a notificação após HTTP %s sem apresentar salvamento', async status => {
    const user = userEvent.setup();
    request.mockRejectedValue(new ApiError(status));
    renderFollowup('notificacao');
    await user.type(screen.getByLabelText('Número da notificação'), 'RASCUNHO-SINTETICO');
    await user.click(screen.getByRole('button', { name: 'Salvar registro' }));
    expect(await screen.findByRole('alert')).toBeVisible();
    expect(screen.getByLabelText('Número da notificação')).toHaveValue('RASCUNHO-SINTETICO');
    expect(screen.queryByText('Registro salvo.')).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Salvar registro' })).toBeDisabled();
    expect(request).toHaveBeenCalledTimes(1);
  });

  it('resposta com ID de outro recurso não confirma a operação nem libera reenvio', async () => {
    const user = userEvent.setup();
    request.mockResolvedValue({ pacienteId: ID });
    renderFollowup('retorno-anual', `&atendimentoId=${ATTENDANCE}`);
    fireEvent.change(screen.getByLabelText('Data efetiva do comparecimento'), { target: { value: '2024-02-29' } });
    await user.click(screen.getByRole('button', { name: 'Salvar registro' }));
    expect(await screen.findByText(/Não foi possível confirmar se a operação foi salva/)).toBeVisible();
    expect(screen.queryByText('Registro salvo.')).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Salvar registro' })).toBeDisabled();
    expect(screen.getByRole('link', { name: 'Verificar registro salvo' })).toHaveAttribute('href', `${path}?aba=acompanhamento`);
    expect(request).toHaveBeenCalledTimes(1);
  });

  it('nova intenção depois de um retorno salvo volta a proteger o rascunho na navegação', async () => {
    const user = userEvent.setup();
    renderFollowup('retorno-anual', `&atendimentoId=${ATTENDANCE}`);
    fireEvent.change(screen.getByLabelText('Data efetiva do comparecimento'), { target: { value: '2024-02-29' } });
    await user.click(screen.getByRole('button', { name: 'Salvar registro' }));
    expect(await screen.findByText('Registro salvo.')).toBeVisible();
    await user.click(screen.getByRole('link', { name: 'Verificar registro salvo' }));
    await user.click(screen.getByRole('link', { name: 'Registrar novamente' }));
    await user.click(screen.getByRole('button', { name: 'Registrar outro comparecimento' }));
    await user.type(screen.getByLabelText('Resumo do retorno anual'), 'Novo rascunho depois do salvamento');
    await user.click(screen.getByRole('link', { name: 'Ficha do paciente' }));
    expect(await screen.findByRole('button', { name: 'Continuar editando' })).toBeVisible();
    await user.click(screen.getByRole('button', { name: 'Continuar editando' }));
    expect(screen.getByLabelText('Resumo do retorno anual')).toHaveValue('Novo rascunho depois do salvamento');
    expect(request).toHaveBeenCalledTimes(1);
  });

  it('fato anual não permite escolher atendimento nem envia uma visita', async () => {
    const user = userEvent.setup();
    request.mockResolvedValue({ eventoId: '901' });
    renderFollowup('ocorrencia-anual');
    expect(screen.queryByLabelText('Atendimento de registro')).not.toBeInTheDocument();
    await user.type(screen.getByLabelText('Ano de comparecimento informado'), '2023');
    await user.click(screen.getByRole('button', { name: 'Salvar registro' }));
    expect(await screen.findByText('Registro salvo.')).toBeVisible();
    expect(request).toHaveBeenCalledWith(`${path}/ocorrencias-anuais`, { method: 'POST', body: { ano: 2023 } });
  });

  it('exige data antes de resolver uma pendência existente e mostra o status desconhecido preservado', async () => {
    const user = userEvent.setup();
    const pending = { pendenciaId: '1001', atendimentoId: ATTENDANCE, descricao: 'Pendência sintética',
      status: 'legado_sintetico', dataIdentificacao: '2024-01-01', dataResolucao: null };
    responses.set(`${path}/pendencias?limit=100&offset=0`, [pending]);
    responses.set(`${path}/pendencias?limit=20&offset=0`, [pending]);
    request.mockResolvedValue({ pendenciaId: '1001', status: 'resolvida' });
    renderFollowup('pendencia', '&pendenciaId=1001');
    const status = await screen.findByLabelText('Status da pendência');
    expect(status).toHaveValue('legado_sintetico');
    await user.selectOptions(status, 'resolvida');
    await user.click(screen.getByRole('button', { name: 'Salvar registro' }));
    expect(await screen.findByText(/a data da resolução com dia, mês e ano/)).toBeVisible();
    expect(request).not.toHaveBeenCalled();
    fireEvent.change(screen.getByLabelText('Data de resolução da pendência'), { target: { value: '2024-02-29' } });
    await user.click(screen.getByRole('button', { name: 'Salvar registro' }));
    await waitFor(() => expect(request).toHaveBeenCalledWith(`${path}/pendencias/1001`, {
      method: 'PATCH', body: { status: 'resolvida', dataResolucao: '2024-02-29' },
    }));
  });

  it('exige remoção explícita da data ao reabrir uma pendência resolvida', async () => {
    const user = userEvent.setup();
    const pending = { pendenciaId: '1002', atendimentoId: ATTENDANCE, descricao: 'Pendência resolvida sintética',
      status: 'resolvida', dataIdentificacao: '2024-01-01', dataResolucao: '2024-02-29' };
    responses.set(`${path}/pendencias?limit=100&offset=0`, [pending]);
    responses.set(`${path}/pendencias?limit=20&offset=0`, [pending]);
    request.mockResolvedValue({ pendenciaId: '1002', status: 'aberta' });
    renderFollowup('pendencia', '&pendenciaId=1002');
    expect(await screen.findByLabelText('Data de resolução da pendência')).toHaveValue('2024-02-29');
    await user.selectOptions(screen.getByLabelText('Status da pendência'), 'aberta');
    await user.click(screen.getByRole('button', { name: 'Salvar registro' }));
    expect(await screen.findByText(/Data de resolução exige status resolvida/)).toBeVisible();
    expect(request).not.toHaveBeenCalled();
    fireEvent.change(screen.getByLabelText('Data de resolução da pendência'), { target: { value: '' } });
    await user.click(screen.getByRole('button', { name: 'Salvar registro' }));
    expect(await screen.findByText('Registro salvo.')).toBeVisible();
    expect(request).toHaveBeenCalledWith(`${path}/pendencias/1002`, { method: 'PATCH', body: { status: 'aberta', dataResolucao: null } });
  });

  it('cria uma pendência resolvida apenas com data efetiva de resolução e conserva os campos informados', async () => {
    const user = userEvent.setup();
    request.mockResolvedValue({ pendenciaId: '1003' });
    renderFollowup('pendencia', `&atendimentoId=${ATTENDANCE}`);
    await user.type(screen.getByLabelText('Descrição da pendência'), 'Pendência sintética já resolvida');
    await user.selectOptions(screen.getByLabelText('Status da pendência'), 'resolvida');
    fireEvent.change(screen.getByLabelText('Data de identificação da pendência'), { target: { value: '2024-01-01' } });
    await user.click(screen.getByRole('button', { name: 'Salvar registro' }));
    expect(await screen.findByText(/a data da resolução com dia, mês e ano/)).toBeVisible();
    expect(request).not.toHaveBeenCalled();
    fireEvent.change(screen.getByLabelText('Data de resolução da pendência'), { target: { value: '2024-02-29' } });
    await user.click(screen.getByRole('button', { name: 'Salvar registro' }));
    expect(await screen.findByText('Registro salvo.')).toBeVisible();
    expect(request).toHaveBeenCalledWith(`${path}/pendencias`, { method: 'POST', body: {
      atendimentoId: ATTENDANCE, descricao: 'Pendência sintética já resolvida', status: 'resolvida',
      dataIdentificacao: '2024-01-01', dataResolucao: '2024-02-29',
    } });
  });

  it.each([['', null], ['nao_informado', 'nao_informado'], ['aberta', 'aberta']])(
    'criação de pendência representa o status %s sem inferir aberta', async (selection, expected) => {
      const user = userEvent.setup();
      request.mockResolvedValue({ pendenciaId: '1004' });
      renderFollowup('pendencia', `&atendimentoId=${ATTENDANCE}`);
      expect(screen.getByLabelText('Status da pendência')).toHaveValue('');
      await user.type(screen.getByLabelText('Descrição da pendência'), 'Estado sintético preservado');
      await user.selectOptions(screen.getByLabelText('Status da pendência'), selection!);
      await user.click(screen.getByRole('button', { name: 'Salvar registro' }));
      expect(await screen.findByText('Registro salvo.')).toBeVisible();
      expect(request).toHaveBeenCalledWith(`${path}/pendencias`, { method: 'POST', body: {
        atendimentoId: ATTENDANCE, descricao: 'Estado sintético preservado', status: expected,
        dataIdentificacao: null, dataResolucao: null,
      } });
    });
});
