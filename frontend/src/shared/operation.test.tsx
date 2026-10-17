import { createHash } from 'node:crypto';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { act, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { createMemoryRouter, RouterProvider } from 'react-router';
import { SessionManager } from '../app/SessionManager';
import { SessionProvider } from '../app/session';
import { DraftProvider, MutationForm, useClinicalDraft } from './writing';
import { clinicalHash, type ClinicalIntention } from './operation';

const path = '/pacientes/9007199254740993/atendimentos';
const resources: SessionManager[] = [];
afterEach(() => { resources.splice(0).forEach(manager => manager.dispose()); vi.restoreAllMocks(); });

function Example({ saved }: { saved: (value: unknown) => void }) {
  const [draft, setDraft] = useClinicalDraft('operation-test', '');
  return <MutationForm title="Atendimento sintético" path={path} method="POST" dirty={!!draft}
    responseId="atendimentoId" onSaved={saved}
    buildBody={() => ({ dataAtendimento: '2026-02-01', observacoes: draft })}>
    <label>Observação do atendimento<input value={draft} onChange={event => setDraft(event.target.value)} /></label>
  </MutationForm>;
}

async function setup({ firstFailure = 'network', outcome = 'confirmada', registrationLost = false, beforeSubmit }: {
  registrationLost?: boolean; beforeSubmit?: (manager: SessionManager) => void;
  firstFailure?: 'network' | 'denied'; outcome?: 'confirmada' | 'nao_aplicada' | 'indeterminavel';
} = {}) {
  let intention: ClinicalIntention | undefined;
  let access = false;
  let verificationFailure = false;
  let wrongReceipt = false;
  const registrations: ClinicalIntention[] = [];
  const clinicalWrites = vi.fn(async (_url: RequestInfo | URL, init?: RequestInit) => {
    expect(new Headers(init?.headers).get('X-Operacao-Id')).toBe(intention!.operacaoId);
    if (clinicalWrites.mock.calls.length === 1) {
      if (firstFailure === 'network') throw new TypeError('Resposta sintética perdida após envio');
      return Response.json({}, { status: 403 });
    }
    return Response.json({ atendimentoId: '9007199254740995' }, { status: 201 });
  });
  const verifications = vi.fn(async () => {
    if (verificationFailure) return Response.json({}, { status: 503 });
    return Response.json({ ...intention, caminho: wrongReceipt ? '/v1/pacientes/99/atendimentos' : intention!.caminho,
      expiraEm: '2099-01-01T00:00:00.000Z', estado: outcome,
      ...(outcome === 'confirmada' ? { resultado: { atendimentoId: '9007199254740995' } } : {}) });
  });
  const fetcher: typeof fetch = async (url, init) => {
    if (url === '/v1/auth/login') return Response.json({ accessToken: 'sintetico', tokenType: 'Bearer', expiresIn: 900 });
    if (url === '/v1/auth/me') return Response.json({ usuarioId: '42', nome: 'Equipe Sintética', perfil: 'edicao' });
    if (url === '/v1/operacoes') {
      intention = JSON.parse(String(init?.body)) as ClinicalIntention;
      registrations.push(intention);
      expect(intention.caminho).toBe(`/v1${path}`);
      expect(intention.corpoHash).toMatch(/^[a-f0-9]{64}$/);
      if (registrationLost) throw new TypeError('Resposta do registro perdida');
      return Response.json({ ...intention, estado: 'registrada', expiraEm: '2099-01-01T00:00:00.000Z' }, { status: 201 });
    }
    if (String(url).startsWith('/v1/operacoes/')) return verifications();
    if (url === '/v1/pacientes/9007199254740993') return Response.json({}, { status: access ? 200 : 403 });
    if (url === `/v1${path}`) return clinicalWrites(url, init);
    throw new Error(`Rota sintética inesperada: ${url}`);
  };
  const manager = new SessionManager(fetcher); resources.push(manager);
  await manager.login('sintetico@example.invalid', 'senha-sintetica');
  const saved = vi.fn();
  const router = createMemoryRouter([{ path: '/', element: <SessionProvider manager={manager}>
    <DraftProvider><Example saved={saved} /></DraftProvider></SessionProvider> }]);
  render(<RouterProvider router={router} />);
  const user = userEvent.setup();
  await user.type(screen.getByLabelText('Observação do atendimento'), 'Dados clínicos sintéticos');
  beforeSubmit?.(manager);
  await user.click(screen.getByRole('button', { name: 'Salvar registro' }));
  await screen.findByRole('alert');
  return { user, saved, clinicalWrites, registrations, verifications,
    allowAccess: () => { access = true; }, failVerification: () => { verificationFailure = true; },
    corruptReceipt: () => { wrongReceipt = true; } };
}

describe('recuperação conclusiva sem reaplicar escrita', () => {
  it('hash preserva bigint textual, datas, null e ordem de arrays, ordenando somente chaves', async () => {
    const body = { z: ['9007199254740993', null], data: '2026-02-01', a: { naoInformado: null }, omitido: undefined };
    const canonical = '{"a":{"naoInformado":null},"data":"2026-02-01","z":["9007199254740993",null]}';
    expect(await clinicalHash(body)).toBe(createHash('sha256').update(canonical).digest('hex'));
    expect(await clinicalHash({ a: [1, 2] })).not.toBe(await clinicalHash({ a: [2, 1] }));
  });
  it('interrupção durante o hash mantém rascunho revisável sem UUID nem escrita clínica', async () => {
    let finishHash!: (value: ArrayBuffer) => void;
    let manager!: SessionManager;
    vi.spyOn(crypto.subtle, 'digest').mockImplementationOnce(() => new Promise<ArrayBuffer>(resolve => { finishHash = resolve; }));
    const pending = setup({ beforeSubmit: value => { manager = value; } });
    await waitFor(() => expect(finishHash).toBeTypeOf('function'));
    await act(async () => { manager.client.cancelPending(); finishHash(new ArrayBuffer(32)); });
    const { registrations, clinicalWrites, saved } = await pending;
    expect(screen.getByRole('button', { name: 'Salvar registro' })).toBeEnabled();
    expect(screen.getByLabelText('Observação do atendimento')).toHaveValue('Dados clínicos sintéticos');
    expect(screen.queryByRole('button', { name: 'Verificar resultado do envio' })).not.toBeInTheDocument();
    expect(registrations).toHaveLength(0);
    expect(clinicalWrites).not.toHaveBeenCalled();
    expect(saved).not.toHaveBeenCalled();
  });
  it('resposta perdida do registro preserva UUID para verificar e encerrar sem enviar clínica', async () => {
    const { user, registrations, verifications, clinicalWrites, saved } = await setup({
      registrationLost: true, outcome: 'indeterminavel',
    });
    expect(screen.getByRole('button', { name: 'Salvar registro' })).toBeDisabled();
    await user.click(screen.getByRole('button', { name: 'Verificar resultado do envio' }));
    await waitFor(() => expect(verifications).toHaveBeenCalledTimes(1));
    expect(screen.getByRole('button', { name: 'Salvar registro' })).toBeDisabled();
    await user.click(screen.getByRole('button', { name: 'Encerrar tentativa e verificar' }));
    await waitFor(() => expect(verifications).toHaveBeenCalledTimes(2));
    expect(registrations).toHaveLength(1);
    expect(clinicalWrites).not.toHaveBeenCalled();
    expect(saved).not.toHaveBeenCalled();
    expect(screen.getByLabelText('Observação do atendimento')).toHaveValue('Dados clínicos sintéticos');
  });
  it('reconhece commit com resposta perdida por recibo e não envia novamente', async () => {
    const { user, saved, clinicalWrites, verifications, registrations } = await setup();
    expect(screen.getByRole('button', { name: 'Salvar registro' })).toBeDisabled();
    expect(saved).not.toHaveBeenCalled();
    await user.click(screen.getByRole('button', { name: 'Verificar resultado do envio' }));
    await waitFor(() => expect(saved).toHaveBeenCalledExactlyOnceWith({ atendimentoId: '9007199254740995' }));
    expect(screen.getByText('Registro salvo.')).toBeVisible();
    expect(clinicalWrites).toHaveBeenCalledTimes(1);
    expect(registrations).toHaveLength(1);
    expect(verifications).toHaveBeenCalledTimes(1);
  });
  it('nova tentativa exige prova de não aplicação e duas confirmações explícitas', async () => {
    const { user, clinicalWrites, registrations, saved } = await setup({ outcome: 'nao_aplicada' });
    await user.click(screen.getByRole('button', { name: 'Encerrar tentativa e verificar' }));
    expect(await screen.findByText(/O servidor confirmou que este envio não foi aplicado/)).toBeVisible();
    expect(clinicalWrites).toHaveBeenCalledTimes(1);
    await user.click(screen.getByRole('button', { name: 'Revisar e preparar novo envio' }));
    expect(screen.getByLabelText('Observação do atendimento')).toHaveValue('Dados clínicos sintéticos');
    expect(clinicalWrites).toHaveBeenCalledTimes(1);
    await user.click(screen.getByRole('button', { name: 'Salvar registro' }));
    await waitFor(() => expect(saved).toHaveBeenCalledTimes(1));
    expect(clinicalWrites).toHaveBeenCalledTimes(2);
    expect(registrations[0]!.operacaoId).not.toBe(registrations[1]!.operacaoId);
  });
  it.each(['indeterminavel', 'falha de leitura', 'outro contexto'])(
    '%s mantém bloqueio, rascunho e ausência de sucesso', async scenario => {
      const { user, clinicalWrites, saved, failVerification, corruptReceipt } = await setup({
        outcome: scenario === 'indeterminavel' ? 'indeterminavel' : 'confirmada',
      });
      if (scenario === 'falha de leitura') failVerification();
      if (scenario === 'outro contexto') corruptReceipt();
      await user.click(screen.getByRole('button', { name: 'Verificar resultado do envio' }));
      await waitFor(() => expect(screen.getByRole('alert')).not.toHaveTextContent('Consulte o registro antes'));
      expect(saved).not.toHaveBeenCalled();
      expect(screen.getByRole('button', { name: 'Salvar registro' })).toBeDisabled();
      expect(screen.getByLabelText('Observação do atendimento')).toHaveValue('Dados clínicos sintéticos');
      expect(clinicalWrites).toHaveBeenCalledTimes(1);
    });
  it('403 preserva rascunho; acesso restaurado habilita revisão sem disparar nova escrita', async () => {
    const { user, allowAccess, clinicalWrites, saved } = await setup({ firstFailure: 'denied' });
    const revalidate = screen.getByRole('button', { name: 'Revalidar acesso e revisar rascunho' });
    await user.click(revalidate);
    expect(await screen.findByText(/O acesso ainda não pôde ser revalidado/)).toBeVisible();
    expect(screen.getByRole('button', { name: 'Salvar registro' })).toBeDisabled();
    allowAccess();
    await user.click(revalidate);
    await waitFor(() => expect(screen.getByRole('button', { name: 'Salvar registro' })).toBeEnabled());
    expect(clinicalWrites).toHaveBeenCalledTimes(1);
    expect(saved).not.toHaveBeenCalled();
    await user.click(screen.getByRole('button', { name: 'Salvar registro' }));
    await waitFor(() => expect(saved).toHaveBeenCalledTimes(1));
    expect(clinicalWrites).toHaveBeenCalledTimes(2);
  });
});
