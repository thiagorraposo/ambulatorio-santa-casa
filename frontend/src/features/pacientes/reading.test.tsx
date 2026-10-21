import type { ReactElement } from 'react';
import type { UseQueryResult } from '@tanstack/react-query';
import { fireEvent, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes, useLocation, useNavigate } from 'react-router';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ApiError } from '../../api/client';
import type { AtendimentoDetalheResponse, PacienteDetalheResponse, ReferralResponse } from '../../api/contracts';
import { useApiQuery } from '../../api/useApiQuery';
import AttendancePage from './AttendancePage';
import PatientPage from './PatientPage';
import PatientsPage from './PatientsPage';

vi.mock('../../api/useApiQuery', () => ({ useApiQuery: vi.fn() }));
vi.mock('../../app/session', () => ({ useSession: () => ({ user: { usuarioId: '42', nome: 'Consulta sintética', perfil: 'consulta' } }) }));

const ID = '9007199254740993';
const responses = new Map<string, unknown>();
const patient: PacienteDetalheResponse = {
  pacienteId: ID, nome: 'Pessoa Sintética', dataNascimento: '1980-02-10', sexo: null,
  idade: 37, dataReferenciaIdade: '2001-01-01', raca: 'legado_sintetico',
  pertenceComunidadeTradicional: false, tipoComunidadeTradicional: 'Texto legado sintético',
  versao: '1', endereco: null, telefones: [], atendimentos: [], paginacaoColecoes: { limit: 20, offset: 0 },
};

function Location() {
  const location = useLocation();
  const navigate = useNavigate();
  return <><output data-testid="location">{location.pathname}{location.search}</output>
    <button onClick={() => navigate(-1)}>Voltar no navegador</button></>;
}

function renderRoute(element: ReactElement, url: string, route = '/pacientes') {
  return render(<MemoryRouter initialEntries={[url]}><Location /><Routes>
    <Route path={route} element={element} />
  </Routes></MemoryRouter>);
}

function successful<T>(data: T): UseQueryResult<T, ApiError> {
  return { data, isSuccess: true, isPending: false, isFetching: false, isError: false, refetch: vi.fn() } as unknown as UseQueryResult<T, ApiError>;
}

beforeEach(() => {
  responses.clear();
  responses.set(`/pacientes/${ID}?limit=20&offset=0`, patient);
  responses.set(`/pacientes/${ID}/atendimentos?limit=1&offset=0`, []);
  vi.mocked(useApiQuery).mockImplementation(<T,>(path: string): UseQueryResult<T, ApiError> => {
    const value = responses.get(path);
    if (value instanceof ApiError) return {
      error: value, isError: true, isPending: false, isFetching: false, isSuccess: false, refetch: vi.fn(),
    } as unknown as UseQueryResult<T, ApiError>;
    if (!responses.has(path)) throw new Error(`Resposta sintética ausente para ${path}`);
    return successful(value as T);
  });
});

describe('busca e paginação de pacientes', () => {
  it('corrige paginação inválida com replace e mantém filtros e páginas independentes', async () => {
    const user = userEvent.setup();
    responses.set('/pacientes?nome=Pessoa&sexo=feminino&limit=20&offset=0', []);
    responses.set('/pacientes?nome=Antes&limit=20&offset=0', []);
    render(<MemoryRouter initialEntries={[
      '/pacientes?nome=Antes',
      '/pacientes?nome=Pessoa&sexo=feminino&limit=0&offset=200000&projetosLimit=1&projetosOffset=3',
    ]} initialIndex={1}>
      <Location /><Routes><Route path="/pacientes" element={<PatientsPage />} /></Routes>
    </MemoryRouter>);
    expect(screen.getByTestId('location')).toHaveTextContent(
      '/pacientes?nome=Pessoa&sexo=feminino&limit=20&offset=0&projetosLimit=1&projetosOffset=3',
    );
    expect(screen.getByRole('searchbox', { name: 'Nome' })).toHaveValue('Pessoa');
    expect(screen.getByRole('combobox', { name: 'Sexo' })).toHaveValue('feminino');
    expect(useApiQuery).toHaveBeenCalledWith('/pacientes?nome=Pessoa&sexo=feminino&limit=20&offset=0');

    await user.click(screen.getByRole('button', { name: 'Voltar no navegador' }));
    expect(screen.getByTestId('location')).toHaveTextContent('/pacientes?nome=Antes');
    expect(screen.getByRole('searchbox', { name: 'Nome' })).toHaveValue('Antes');
  });

  it('consulta somente ID/nome, preserva IDs grandes e volta entre páginas sem inventar total', async () => {
    const user = userEvent.setup();
    responses.set('/pacientes?nome=Pessoa&sexo=feminino&limit=1&offset=0', [{ pacienteId: ID, nome: 'Pessoa Sintética' }]);
    responses.set('/pacientes?nome=Pessoa&sexo=feminino&limit=1&offset=1', []);
    renderRoute(<PatientsPage />, '/pacientes?nome=Pessoa&sexo=feminino&limit=1&offset=0');

    expect(screen.getByText(ID)).toBeVisible();
    expect(screen.getByRole('link', { name: 'Ver ficha de Pessoa Sintética' })).toHaveAttribute('href', `/pacientes/${ID}`);
    expect(screen.queryByText(/cadastrados|de \d+ páginas|total de/i)).not.toBeInTheDocument();
    expect(vi.mocked(useApiQuery).mock.calls.every(([path]) => path.startsWith('/pacientes?'))).toBe(true);

    await user.click(screen.getByRole('button', { name: 'Próxima' }));
    expect(screen.getByTestId('location')).toHaveTextContent('nome=Pessoa&sexo=feminino&limit=1&offset=1');
    expect(screen.getByText('Nenhum paciente nesta página para os filtros e o acesso atuais.')).toBeVisible();
    expect(screen.getByRole('button', { name: 'Anterior' })).toBeEnabled();
    expect(screen.getByRole('button', { name: 'Próxima' })).toBeDisabled();

    await user.click(screen.getByRole('button', { name: 'Voltar no navegador' }));
    expect(screen.getByText('Pessoa Sintética')).toBeVisible();
    expect(screen.getByRole('searchbox', { name: 'Nome' })).toHaveValue('Pessoa');
  });

  it('submete nome/sexo e reinicia a página, sincronizando filtros ao voltar', async () => {
    const user = userEvent.setup();
    responses.set('/pacientes?nome=Antes&limit=10&offset=10', []);
    responses.set('/pacientes?nome=Depois&sexo=outro&limit=10&offset=0', []);
    renderRoute(<PatientsPage />, '/pacientes?nome=Antes&limit=10&offset=10');
    await user.clear(screen.getByRole('searchbox', { name: 'Nome' }));
    await user.type(screen.getByRole('searchbox', { name: 'Nome' }), 'Depois');
    await user.selectOptions(screen.getByRole('combobox', { name: 'Sexo' }), 'outro');
    await user.click(screen.getByRole('button', { name: 'Buscar' }));
    expect(screen.getByTestId('location')).toHaveTextContent('nome=Depois&sexo=outro&limit=10&offset=0');
    await user.click(screen.getByRole('button', { name: 'Voltar no navegador' }));
    expect(screen.getByRole('searchbox', { name: 'Nome' })).toHaveValue('Antes');
    expect(screen.getByRole('combobox', { name: 'Sexo' })).toHaveValue('');
  });
});

describe('ficha por recurso', () => {
  it('abre Chagas e avaliação por demanda preservando a consulta selecionada entre abas', async () => {
    const user = userEvent.setup();
    const attendance = { atendimentoId: '9007199254740995', dataAtendimento: '2026-02-21',
      localizacaoProntuario: null, ambulatorioUnicamente: null, ambulatorioAnexoProjeto: null,
      observacoes: null, versao: '1' };
    responses.set(`/pacientes/${ID}/atendimentos?limit=20&offset=0`, [attendance]);
    responses.set(`/pacientes/${ID}/atendimentos/${attendance.atendimentoId}?limit=1&offset=0`, {
      ...attendance, dadosClinicos: null, diagnosticoChagas: null,
      exames: [], pendencias: [], rastreioFamiliar: null, rastreiosFamiliares: [],
      paginacaoColecoes: { limit: 1, offset: 0 },
    });
    renderRoute(<PatientPage />, `/pacientes/${ID}?dadosOffset=0&nome=Pessoa`, '/pacientes/:pacienteId');
    expect(useApiQuery).not.toHaveBeenCalledWith(`/pacientes/${ID}/atendimentos?limit=20&offset=0`);
    const navigation = within(screen.getByRole('navigation', { name: 'Seções da ficha' }));
    await user.click(navigation.getByRole('link', { name: 'Chagas' }));
    expect(screen.getByRole('combobox', { name: 'Atendimento para consulta clínica' })).toHaveValue('');
    await user.selectOptions(screen.getByRole('combobox', { name: 'Atendimento para consulta clínica' }), attendance.atendimentoId);
    expect(screen.getByText('Diagnóstico não registrado neste atendimento.')).toBeVisible();
    await user.click(navigation.getByRole('link', { name: 'Avaliação clínica' }));
    expect(screen.getByRole('combobox', { name: 'Atendimento para consulta clínica' })).toHaveValue(attendance.atendimentoId);
    expect(screen.getByText('Dados clínicos não registrados neste atendimento.')).toBeVisible();
    expect(screen.getByTestId('location')).toHaveTextContent('nome=Pessoa');
    expect(screen.getByTestId('location')).toHaveTextContent(`atendimentoId=${attendance.atendimentoId}`);
    await user.click(screen.getByRole('button', { name: 'Voltar no navegador' }));
    expect(screen.getByText('Diagnóstico não registrado neste atendimento.')).toBeVisible();
  });

  it('identifica nascimento e última consulta mesmo fora da primeira página dos dados', () => {
    responses.set(`/pacientes/${ID}?limit=1&offset=20`, {
      ...patient, telefones: ['Telefone sintético da página 20'],
      atendimentos: [{ atendimentoId: '81', dataAtendimento: '2020-01-01', observacoes: null, versao: '1' }],
      paginacaoColecoes: { limit: 1, offset: 20 },
    });
    responses.set(`/pacientes/${ID}/atendimentos?limit=1&offset=0`, [{
      atendimentoId: '9007199254740995', dataAtendimento: '2026-02-21', localizacaoProntuario: null,
      ambulatorioUnicamente: null, ambulatorioAnexoProjeto: null, observacoes: null, versao: '1',
    }]);
    renderRoute(<PatientPage />, `/pacientes/${ID}?dadosLimit=1&dadosOffset=20`, '/pacientes/:pacienteId');
    const header = screen.getByRole('heading', { name: patient.nome }).closest('section')!;
    expect(header).toHaveTextContent('Nascimento: 10/02/1980');
    expect(within(header).getByText('10/02/1980')).toBeVisible();
    expect(within(header).getByText('37 anos · referência: 01/01/2001')).toBeVisible();
    const latest = screen.getByRole('heading', { name: 'Último atendimento por data registrada' }).closest('section')!;
    expect(within(latest).getByText('21/02/2026')).toBeVisible();
    expect(within(latest).getByRole('link', { name: 'Abrir último atendimento 9007199254740995' })).toHaveAttribute(
      'href', `/pacientes/${ID}/atendimentos/9007199254740995?${new URLSearchParams({
        retorno: `/pacientes/${ID}?dadosLimit=1&dadosOffset=20`,
      })}`,
    );
    expect(screen.getByRole('link', { name: 'Atendimento 81' })).toBeVisible();
    expect(screen.getByText('Telefone sintético da página 20')).toBeVisible();
  });

  it('normaliza scopes simultâneos sem perder correções, filtros ou scopes válidos', () => {
    responses.set(`/pacientes/${ID}?limit=20&offset=2`, {
      ...patient, paginacaoColecoes: { limit: 20, offset: 2 },
    });
    responses.set(`/pacientes/${ID}/ocorrencias-anuais?limit=20&offset=0`, []);
    responses.set(`/pacientes/${ID}/retornos-anuais?limit=20&offset=0`, []);
    renderRoute(<PatientPage />,
      `/pacientes/${ID}?aba=acompanhamento&dadosLimit=0&dadosOffset=2&ocorrenciasLimit=0&ocorrenciasOffset=-1&retornosAnuaisLimit=101&retornosAnuaisOffset=200000&projetosLimit=1&projetosOffset=3&nome=Pessoa`,
      '/pacientes/:pacienteId');
    const url = new URL(screen.getByTestId('location').textContent!, 'http://app.local');
    expect(Object.fromEntries(url.searchParams)).toEqual({
      aba: 'acompanhamento', dadosLimit: '20', dadosOffset: '2',
      ocorrenciasLimit: '20', ocorrenciasOffset: '0', retornosAnuaisLimit: '20', retornosAnuaisOffset: '0',
      projetosLimit: '1', projetosOffset: '3', nome: 'Pessoa',
    });
    expect(useApiQuery).toHaveBeenCalledWith(`/pacientes/${ID}?limit=20&offset=2`);
    expect(useApiQuery).toHaveBeenCalledWith(`/pacientes/${ID}/ocorrencias-anuais?limit=20&offset=0`);
    expect(useApiQuery).toHaveBeenCalledWith(`/pacientes/${ID}/retornos-anuais?limit=20&offset=0`);
    expect(url.searchParams.has('limit')).toBe(false);
    expect(url.searchParams.has('offset')).toBe(false);
  });

  it('carrega cada aba por demanda e preserva sua página na navegação', async () => {
    const user = userEvent.setup();
    responses.set(`/pacientes/${ID}/projetos?limit=1&offset=1`, [{
      projetoId: '23', codigo: 'SINTETICO', nome: 'Projeto Sintético', participa: false,
      possuiPendencia: null, descricaoPendencia: 'Descrição preservada', houveFalha: false,
      descricaoFalha: null, observacoes: null,
    }]);
    renderRoute(<PatientPage />, `/pacientes/${ID}?projetosLimit=1&projetosOffset=1`, '/pacientes/:pacienteId');
    expect(screen.getByText('10/02/1980')).toBeVisible();
    expect(screen.getByText('37 anos · referência: 01/01/2001')).toBeVisible();
    expect(screen.getByText('legado_sintetico')).toBeVisible();
    expect(vi.mocked(useApiQuery).mock.calls.every(([path]) => [
      `/pacientes/${ID}?limit=20&offset=0`, `/pacientes/${ID}/atendimentos?limit=1&offset=0`,
    ].includes(path))).toBe(true);

    await user.click(within(screen.getByRole('navigation', { name: 'Seções da ficha' })).getByRole('link', { name: 'Projetos' }));
    expect(screen.getByText('Projeto Sintético')).toBeVisible();
    expect(screen.getByText('Descrição preservada')).toBeVisible();
    expect(screen.getByTestId('location')).toHaveTextContent('projetosLimit=1&projetosOffset=1&aba=projetos');
    expect(useApiQuery).toHaveBeenCalledWith(`/pacientes/${ID}/projetos?limit=1&offset=1`);
    expect(vi.mocked(useApiQuery).mock.calls.some(([path]) => path.includes('/exames'))).toBe(false);

    await user.click(within(screen.getByRole('navigation', { name: 'Seções da ficha' })).getByRole('link', { name: 'Dados do paciente' }));
    expect(screen.getByText('10/02/1980')).toBeVisible();
    expect(screen.getByTestId('location')).toHaveTextContent('projetosOffset=1');
  });

  it('mantém número e justificativa da notificação mesmo quando o indicador é false', () => {
    responses.set(`/pacientes/${ID}/notificacao`, {
      notificacaoId: '31', pacienteNotificado: false, numeroNotificacao: 'SINTETICO-001',
      justificativaNaoNotificacao: 'Justificativa sintética preservada', observacoes: null,
    });
    renderRoute(<PatientPage />, `/pacientes/${ID}?aba=notificacao`, '/pacientes/:pacienteId');
    expect(screen.getByText('SINTETICO-001')).toBeVisible();
    expect(screen.getByText('Justificativa sintética preservada')).toBeVisible();
    expect(screen.getByText('Não', { selector: 'dd' })).toBeVisible();
  });

  it('consulta contrarreferências somente após abrir o encaminhamento e mantém o vínculo no caminho', () => {
    const referral: ReferralResponse = {
      encaminhamentoId: '41', atendimentoId: '51', tipoEncaminhamentoId: null, projetoId: null,
      origem: null, destinoNome: null, destinoServico: null, especialidadeDestino: null,
      dataEncaminhamento: '2024-02-29', dataAgendamento: null, dataRealizacao: null,
      status: 'codigo_legado', prioridade: null, documentoApresentado: false, motivo: null,
      condutaOrientada: null, observacoes: null,
    };
    responses.set(`/pacientes/${ID}/encaminhamentos?limit=20&offset=0`, [referral]);
    responses.set(`/pacientes/${ID}/encaminhamentos/41/contrarreferencias?limit=20&offset=0`, [{
      contrarreferenciaId: '61', encaminhamentoId: '41', atendimentoId: '51', dataRealizada: '2024-03-01',
      status: 'concluido', resumo: 'Resumo sintético', conduta: null, observacoes: null,
    }]);
    renderRoute(<PatientPage />, `/pacientes/${ID}?aba=encaminhamentos`, '/pacientes/:pacienteId');
    expect(vi.mocked(useApiQuery).mock.calls.some(([path]) => path.includes('/contrarreferencias'))).toBe(false);
    expect(screen.getByText('codigo_legado')).toBeVisible();
    fireEvent.click(screen.getByText(/Contrarreferências do encaminhamento/));
    expect(screen.getByText('Resumo sintético')).toBeVisible();
    expect(screen.getByTestId('location')).toHaveTextContent('contrarreferencia=41');
    expect(useApiQuery).toHaveBeenCalledWith(`/pacientes/${ID}/encaminhamentos/41/contrarreferencias?limit=20&offset=0`);
  });

  it('mantém estados independentes para tratamento BZN recusado e retornos vazios', () => {
    responses.set(`/pacientes/${ID}/tratamento-bzn`, new ApiError(403));
    responses.set(`/pacientes/${ID}/retornos-bzn?limit=20&offset=0`, []);
    renderRoute(<PatientPage />, `/pacientes/${ID}?aba=bzn`, '/pacientes/:pacienteId');
    expect(screen.getByRole('alert')).toHaveTextContent('Acesso não autorizado');
    expect(screen.getByRole('heading', { name: 'Retornos BZN' })).toBeVisible();
    expect(screen.getByText('Nenhum registro nesta página.')).toBeVisible();
  });

  it('apresenta os tipos de retorno BZN com os nomes usados no registro clínico', () => {
    responses.set(`/pacientes/${ID}/tratamento-bzn`, null);
    responses.set(`/pacientes/${ID}/retornos-bzn?limit=20&offset=0`, [
      { retornoId: '81', atendimentoId: '71', dataRealizada: '2024-03-30',
        tipo: 'retorno_bzn_30_dias', status: 'realizado', resumo: null },
      { retornoId: '82', atendimentoId: '72', dataRealizada: '2024-04-30',
        tipo: 'retorno_bzn_final', status: 'realizado', resumo: null },
    ]);
    renderRoute(<PatientPage />, `/pacientes/${ID}?aba=bzn`, '/pacientes/:pacienteId');
    expect(screen.getByText('Retorno BZN de 30 dias')).toBeVisible();
    expect(screen.getByText('Retorno BZN final')).toBeVisible();
    expect(screen.queryByText('retorno_bzn_30_dias')).not.toBeInTheDocument();
    expect(screen.queryByText('retorno_bzn_final')).not.toBeInTheDocument();
  });
});

describe('atendimento e coleções aninhadas', () => {
  it('preserva decimais e lê rastreios/familiares pelos recursos independentes', () => {
    const attendance: AtendimentoDetalheResponse = {
      atendimentoId: '71', dataAtendimento: '2024-02-29', localizacaoProntuario: null,
      ambulatorioUnicamente: false, ambulatorioAnexoProjeto: null, observacoes: null, versao: '1',
      diagnosticoChagas: null,
      dadosClinicos: {
        alturaCm: '9007199254740993.123456789000', pesoKg: null, circunferenciaAbdominalCm: null,
        frequenciaCardiacaBpm: 0, saturacaoPercentual: null, paSistolicaMmhg: null,
        paDiastolicaMmhg: null, nyha: 'nyha_legado', observacoes: null,
      },
      exames: [], pendencias: [], rastreioFamiliar: null,
      rastreiosFamiliares: [
        { rastreioFamiliarId: '81', familiaresExaminados: true, familiares: [{ resultadoId: '901', rastreioFamiliarId: '81', identificacaoFamiliar: 'Familiar sintético A', resultadoSorologia: 'positivo' }], paginacaoFamiliares: { limit: 20, offset: 0 } },
        { rastreioFamiliarId: '82', familiaresExaminados: false, familiares: [], paginacaoFamiliares: { limit: 20, offset: 0 } },
      ],
      paginacaoColecoes: { limit: 2, offset: 0 },
    };
    responses.set(`/pacientes/${ID}/atendimentos/71?limit=2&offset=0`, attendance);
    responses.set(`/pacientes/${ID}/atendimentos/71/rastreios-familiares?limit=20&offset=0`, attendance.rastreiosFamiliares);
    for (const snapshot of attendance.rastreiosFamiliares) responses.set(
      `/pacientes/${ID}/atendimentos/71/rastreios-familiares/${snapshot.rastreioFamiliarId}/familiares?limit=20&offset=0`, snapshot);
    renderRoute(<AttendancePage />, `/pacientes/${ID}/atendimentos/71?limit=2&offset=0`, '/pacientes/:pacienteId/atendimentos/:atendimentoId');
    expect(screen.getByText('9007199254740993,123456789000 cm')).toBeVisible();
    expect(screen.getByText('0 bpm')).toBeVisible();
    expect(screen.getByText('nyha_legado')).toBeVisible();
    expect(screen.getByText('Familiar sintético A')).toBeVisible();
    expect(screen.getByRole('heading', { name: 'Rastreio 81' })).toBeVisible();
    expect(screen.getByRole('heading', { name: 'Rastreio 82' })).toBeVisible();
    expect(screen.getByRole('heading', { name: 'Atendimento de 29/02/2024' })).toBeVisible();
    expect(screen.getByRole('navigation', { name: 'Paginação de coleções do atendimento' })).toBeVisible();
    expect(screen.getByRole('navigation', { name: 'Paginação de rastreios familiares' })).toBeVisible();
    expect(useApiQuery).toHaveBeenCalledWith(`/pacientes/${ID}/atendimentos/71/rastreios-familiares?limit=20&offset=0`);
    expect(useApiQuery).toHaveBeenCalledWith(`/pacientes/${ID}/atendimentos/71/rastreios-familiares/81/familiares?limit=20&offset=0`);
  });
});
