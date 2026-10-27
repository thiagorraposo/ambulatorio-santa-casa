import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ApiError } from '../../api/client';
import { useSession } from '../../app/session';
import ImportacaoSimulacaoPage from './ImportacaoSimulacaoPage';

vi.mock('../../app/session', () => ({ useSession: vi.fn() }));
const request = vi.fn();
const response = { codigoLote: 'sintetico-1', codigoLoteSolicitado: 'sintetico-1', dryRun: true, loteId: null, status: 'dry_run_concluido' };
function session(perfil: 'consulta' | 'edicao' | 'administracao' = 'edicao', generation = 0) {
  return { client: { request }, user: { usuarioId: '1', nome: 'Sintético', perfil }, generation, draftScope: generation } as unknown as ReturnType<typeof useSession>;
}
function setup() { return render(<MemoryRouter><ImportacaoSimulacaoPage /></MemoryRouter>); }
async function fill() {
  const user = userEvent.setup();
  await user.upload(screen.getByLabelText('Arquivo XLSX sintético'), new File(['sintético'], 'sintetico.xlsx'));
  await user.type(screen.getByLabelText('Código do lote'), 'sintetico-1');
  return user;
}
function deferred<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>(done => { resolve = done; });
  return { promise, resolve };
}
beforeEach(() => { request.mockReset(); request.mockResolvedValue(response); vi.mocked(useSession).mockReturnValue(session()); });

describe('simulação mínima de XLSX', () => {
  it('envia arquivo real e finalidade por multipart somente com dryRun explícito', async () => {
    setup();
    const user = await fill();
    expect(request).not.toHaveBeenCalled();
    await user.selectOptions(screen.getByLabelText('Finalidade'), 'mesmo_conteudo');
    expect(screen.queryByRole('option', { name: /revisão/i })).not.toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Simular planilha' }));
    await screen.findByRole('heading', { name: 'Simulação concluída' });
    const [path, options] = request.mock.calls[0]!;
    expect(path).toBe('/importacoes');
    expect(options.method).toBe('POST');
    const body = options.body as FormData;
    expect(body.get('arquivo')).toMatchObject({ name: 'sintetico.xlsx' });
    expect(body.get('codigoLote')).toBe('sintetico-1');
    expect(body.get('finalidade')).toBe('mesmo_conteudo');
    expect(body.get('dryRun')).toBe('true');
    expect(request).toHaveBeenCalledTimes(1);
    expect(screen.getByText('Nenhum lote foi criado por esta simulação.')).toBeVisible();
  });

  it('valida seleção, extensão, limite e código antes de enviar', async () => {
    setup();
    const user = userEvent.setup({ applyAccept: false });
    await user.click(screen.getByRole('button', { name: 'Simular planilha' }));
    expect(screen.getByRole('alert')).toHaveTextContent('Selecione um arquivo XLSX');
    await user.click(screen.getByRole('button', { name: 'Simular planilha' }));
    expect(screen.getByRole('alert')).toHaveFocus();
    await user.upload(screen.getByLabelText('Arquivo XLSX sintético'), new File(['sintético'], 'arquivo.csv'));
    await user.click(screen.getByRole('button', { name: 'Simular planilha' }));
    expect(screen.getByRole('alert')).toHaveTextContent('Selecione um arquivo XLSX');
    const large = new File(['sintético'], 'grande.xlsx');
    Object.defineProperty(large, 'size', { value: 10 * 1024 * 1024 + 1 });
    await user.upload(screen.getByLabelText('Arquivo XLSX sintético'), large);
    await user.click(screen.getByRole('button', { name: 'Simular planilha' }));
    expect(screen.getByRole('alert')).toHaveTextContent('Selecione um arquivo XLSX');
    await user.upload(screen.getByLabelText('Arquivo XLSX sintético'), new File(['sintético'], 'valido.xlsx'));
    await user.type(screen.getByLabelText('Código do lote'), 'codigo inválido');
    await user.click(screen.getByRole('button', { name: 'Simular planilha' }));
    expect(screen.getByRole('alert')).toHaveTextContent('Informe um código');
    expect(screen.getByRole('alert')).toHaveFocus();
    expect(request).not.toHaveBeenCalled();
  });

  it('limpa resultado ao editar ou cancelar e não envia automaticamente', async () => {
    setup(); const user = await fill();
    await user.click(screen.getByRole('button', { name: 'Simular planilha' }));
    await screen.findByRole('heading', { name: 'Simulação concluída' });
    await user.type(screen.getByLabelText('Código do lote'), '-alterado');
    expect(screen.queryByRole('heading', { name: 'Simulação concluída' })).not.toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Cancelar seleção' }));
    expect((screen.getByLabelText('Arquivo XLSX sintético') as HTMLInputElement).files).toHaveLength(0);
    expect(screen.getByLabelText('Arquivo XLSX sintético')).toHaveFocus();
    expect(request).toHaveBeenCalledTimes(1);
  });

  it('bloqueia dois submits síncronos e descarta resposta após cancelar mesmo se o transporte ignora abort', async () => {
    const late = deferred<typeof response>(); request.mockReturnValue(late.promise);
    setup(); const user = await fill();
    const form = screen.getByRole('button', { name: 'Simular planilha' }).closest('form')!;
    fireEvent.submit(form); fireEvent.submit(form);
    expect(request).toHaveBeenCalledTimes(1);
    const signal = request.mock.calls[0]![1].signal as AbortSignal;
    await user.click(screen.getByRole('button', { name: 'Cancelar seleção' }));
    expect(signal.aborted).toBe(true);
    await act(async () => { late.resolve(response); await late.promise; });
    expect(screen.queryByRole('heading', { name: 'Simulação concluída' })).not.toBeInTheDocument();
  });

  it('trocar finalidade invalida resposta pendente e trocar identidade descarta seleção', async () => {
    const late = deferred<typeof response>(); request.mockReturnValue(late.promise);
    const view = setup(); const user = await fill();
    await user.click(screen.getByRole('button', { name: 'Simular planilha' }));
    await user.selectOptions(screen.getByLabelText('Finalidade'), 'mesmo_conteudo');
    expect(request.mock.calls[0]![1].signal.aborted).toBe(true);
    await act(async () => { late.resolve(response); await late.promise; });
    expect(screen.queryByRole('heading', { name: 'Simulação concluída' })).not.toBeInTheDocument();
    vi.mocked(useSession).mockReturnValue(session('administracao', 1));
    view.rerender(<MemoryRouter><ImportacaoSimulacaoPage /></MemoryRouter>);
    expect((screen.getByLabelText('Arquivo XLSX sintético') as HTMLInputElement).files).toHaveLength(0);
    expect(screen.getByLabelText('Código do lote')).toHaveValue('');
  });

  it('aborta ao sair e não permite ação ao perfil consulta', async () => {
    const late = deferred<typeof response>(); request.mockReturnValue(late.promise);
    const view = setup(); const user = await fill();
    await user.click(screen.getByRole('button', { name: 'Simular planilha' }));
    const signal = request.mock.calls[0]![1].signal as AbortSignal;
    vi.mocked(useSession).mockReturnValue(session('consulta', 1));
    view.rerender(<MemoryRouter><ImportacaoSimulacaoPage /></MemoryRouter>);
    expect(signal.aborted).toBe(true);
    expect(screen.getByRole('heading', { name: 'Acesso não autorizado' })).toBeVisible();
    expect(screen.queryByRole('button', { name: 'Simular planilha' })).not.toBeInTheDocument();
    await act(async () => { late.resolve(response); await late.promise; });
    expect(screen.queryByText('Simulação concluída')).not.toBeInTheDocument();
  });

  it.each([new ApiError(403), new Error('SQL: segredo sintético')])('exibe falhas sanitizadas sem reenvio automático', async failure => {
    request.mockRejectedValue(failure);
    setup(); const user = await fill();
    await user.click(screen.getByRole('button', { name: 'Simular planilha' }));
    await waitFor(() => expect(screen.getByRole('alert')).toBeVisible());
    expect(screen.getByRole('alert')).not.toHaveTextContent('SQL');
    expect(screen.getByRole('alert')).toHaveFocus();
    expect(screen.queryByText('Simulação concluída')).not.toBeInTheDocument();
    expect(request).toHaveBeenCalledTimes(1);
  });

  it('não anuncia sucesso se a resposta não corresponde a uma simulação do código enviado', async () => {
    request.mockResolvedValue({ ...response, dryRun: false, loteId: '2' });
    setup(); const user = await fill();
    await user.click(screen.getByRole('button', { name: 'Simular planilha' }));
    await screen.findByRole('alert');
    expect(screen.queryByText('Simulação concluída')).not.toBeInTheDocument();
  });

  it('mostra o lote efetivo existente quando o mesmo arquivo foi enviado com outro código', async () => {
    request.mockResolvedValue({ ...response, codigoLote: 'lote-anterior', loteId: '9007199254740993', status: 'concluido_com_pendencias' });
    setup(); const user = await fill();
    await user.selectOptions(screen.getByLabelText('Finalidade'), 'mesmo_conteudo');
    await user.click(screen.getByRole('button', { name: 'Simular planilha' }));
    await screen.findByRole('heading', { name: 'Simulação concluída' });
    expect(screen.getByText('Código solicitado: sintetico-1')).toBeVisible();
    expect(screen.getByText('Código do lote existente: lote-anterior')).toBeVisible();
    expect(screen.getByRole('link', { name: 'Consultar lote existente 9007199254740993' }))
      .toHaveAttribute('href', '/importacoes/lotes/9007199254740993');
    expect((request.mock.calls[0]![1].body as FormData).get('dryRun')).toBe('true');
  });
});
