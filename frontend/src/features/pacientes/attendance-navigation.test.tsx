import type { UseQueryResult } from '@tanstack/react-query';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes, useLocation } from 'react-router';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ApiError } from '../../api/client';
import type { AtendimentoDetalheResponse, PacienteDetalheResponse } from '../../api/contracts';
import { useApiQuery } from '../../api/useApiQuery';
import AttendancePage from './AttendancePage';
import PatientPage from './PatientPage';
import { AttendanceLink } from './components';
import { attendanceDetailPath, attendanceReturn } from './attendance-navigation';

vi.mock('../../api/useApiQuery', () => ({ useApiQuery: vi.fn() }));
vi.mock('../../app/session', () => ({ useSession: () => ({ user: { perfil: 'consulta' } }) }));

const patientId = '9007199254740993';
const attendanceId = '9007199254740995';
const patientPath = `/pacientes/${patientId}`;
const detailPath = `${patientPath}/atendimentos/${attendanceId}`;
const source = `${patientPath}?aba=atendimentos&dadosLimit=1&dadosOffset=20&atendimentosLimit=1&atendimentosOffset=1&atendimentoId=${attendanceId}#historico`;
const patient: PacienteDetalheResponse = {
  pacienteId: patientId, nome: 'Pessoa sintética de navegação', dataNascimento: null, sexo: null,
  idade: null, dataReferenciaIdade: '2026-10-17', raca: null, pertenceComunidadeTradicional: null,
  tipoComunidadeTradicional: null, versao: '1', endereco: null, telefones: [], atendimentos: [],
  paginacaoColecoes: { limit: 1, offset: 20 },
};
const attendance: AtendimentoDetalheResponse = {
  atendimentoId: attendanceId, dataAtendimento: '2026-02-21', localizacaoProntuario: null,
  ambulatorioUnicamente: false, ambulatorioAnexoProjeto: null, observacoes: null, versao: '1',
  dadosClinicos: null, diagnosticoChagas: null, exames: [], pendencias: [], rastreioFamiliar: null,
  rastreiosFamiliares: [], paginacaoColecoes: { limit: 20, offset: 0 },
};

function Location() {
  const location = useLocation();
  return <div data-testid="location">{location.pathname}{location.search}{location.hash}</div>;
}

function show(url: string) {
  return render(<MemoryRouter initialEntries={[url]}><Location /><Routes>
    <Route path="/pacientes/:pacienteId" element={<PatientPage />} />
    <Route path="/pacientes/:pacienteId/atendimentos/:atendimentoId" element={<AttendancePage />} />
  </Routes></MemoryRouter>);
}

beforeEach(() => {
  const responses = new Map<string, unknown>([
    [`${patientPath}?limit=1&offset=20`, patient],
    [`${patientPath}/atendimentos?limit=1&offset=0`, []],
    [`${patientPath}/atendimentos?limit=1&offset=1`, [attendance]],
    [`${detailPath}?limit=20&offset=0`, attendance],
    [`${detailPath}/rastreios-familiares?limit=20&offset=0`, []],
  ]);
  vi.mocked(useApiQuery).mockImplementation(<T,>(resource: string) => {
    if (!responses.has(resource)) throw new Error(`Resposta sintética ausente: ${resource}`);
    return { data: responses.get(resource), isSuccess: true, isPending: false, isFetching: false,
      isError: false, refetch: vi.fn() } as unknown as UseQueryResult<T, ApiError>;
  });
});

describe('retorno autorizado à ficha de origem', () => {
  it('abre detalhe e retorna explicitamente à aba, seleção e páginas exatas da ficha', async () => {
    const user = userEvent.setup();
    show(source);
    const open = screen.getByRole('link', { name: `Atendimento ${attendanceId}` });
    expect(new URL(open.getAttribute('href')!, 'http://app.local').searchParams.get('retorno')).toBe(source);
    await user.click(open);
    expect(screen.getByRole('heading', { name: 'Detalhe do atendimento' })).toBeVisible();
    const back = screen.getByRole('link', { name: 'Voltar à ficha de origem' });
    expect(back).toHaveAttribute('href', source);
    await user.click(back);
    expect(screen.getByTestId('location')).toHaveTextContent(source);
    expect(screen.getByRole('link', { name: `Atendimento ${attendanceId}` })).toBeVisible();
  });


  it('link da própria consulta conserva paginação, exame expandido e retorno à ficha', () => {
    const current = `${detailPath}?limit=1&offset=2&exameId=81&${new URLSearchParams({ retorno: source })}`;
    render(<MemoryRouter initialEntries={[current]}>
      <AttendanceLink pacienteId={patientId} atendimentoId={attendanceId} />
    </MemoryRouter>);
    expect(screen.getByRole('link', { name: `Atendimento ${attendanceId}` })).toHaveAttribute('href', current);
  });

  it('áreas canônicas mantêm paciente, consulta de origem e páginas sem atribuir estado atual ao passado', () => {
    show(`${detailPath}?${new URLSearchParams({ retorno: source })}`);
    for (const [section, label] of [['exames', 'Exames do paciente'], ['bzn', 'BZN e retornos'], ['projetos', 'Projetos'],
      ['notificacao', 'Notificação'], ['encaminhamentos', 'Encaminhamentos'], ['pendencias', 'Pendências']]) {
      const target = new URL(screen.getByRole('link', { name: label }).getAttribute('href')!, 'http://app.local');
      expect(target.pathname).toBe(patientPath);
      expect(target.searchParams.get('aba')).toBe(section);
      expect(target.searchParams.get('atendimentoId')).toBe(attendanceId);
      expect(target.searchParams.get('atendimentosOffset')).toBe('1');
      expect(target.searchParams.get('dadosOffset')).toBe('20');
    }
    expect(screen.getByText(/Tratamento, projetos e notificação são registros do paciente/)).toBeVisible();
  });

  it.each([null, 'https://example.invalid/', '/pacientes/2?aba=dados', detailPath])(
    'usa histórico padrão quando retorno é ausente ou inválido: %s', raw => {
      show(`${detailPath}${raw === null ? '' : `?${new URLSearchParams({ retorno: raw })}`}`);
      expect(screen.getByRole('link', { name: 'Histórico do paciente' })).toHaveAttribute('href', `${patientPath}?aba=atendimentos`);
      expect(screen.queryByRole('link', { name: 'Voltar à ficha de origem' })).not.toBeInTheDocument();
    },
  );

  it.each(['//example.invalid/', '/\\example.invalid/', '/pacientes/90071992547409931',
    `${patientPath}/editar`, `${patientPath}/registrar`, `\n${patientPath}`, `${patientPath}\t`,
    encodeURIComponent(source)])('rejeita destino externo, de outro paciente ou fora da ficha: %s', raw => {
    expect(attendanceReturn(patientPath, raw)).toBeNull();
  });

  it('mantém IDs textuais e codifica o retorno uma vez, removendo cadeias de retornos', () => {
    const nested = `${patientPath}?aba=chagas&atendimentoId=${attendanceId}&${new URLSearchParams({ retorno: detailPath })}#consulta`;
    const clean = `${patientPath}?aba=chagas&atendimentoId=${attendanceId}#consulta`;
    const target = attendanceDetailPath(patientPath, attendanceId, nested);
    const parsed = new URL(target, 'http://app.local');
    expect(parsed.pathname).toBe(detailPath);
    expect(parsed.searchParams.get('retorno')).toBe(clean);
    expect(attendanceReturn(patientPath, parsed.searchParams.get('retorno'))).toBe(clean);
    expect(attendanceDetailPath(patientPath, attendanceId, clean)).toBe(target);
    expect(attendanceDetailPath(patientPath, attendanceId, detailPath)).toBe(detailPath);
  });
});
