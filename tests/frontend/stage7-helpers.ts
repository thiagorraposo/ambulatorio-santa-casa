import AxeBuilder from '@axe-core/playwright';
import { expect, type APIResponse, type Page } from '@playwright/test';
import type { AtendimentoDetalheResponse, PacienteDetalheResponse } from '../../frontend/src/api/contracts';
import { apiAs, fixture, signIn as fixtureSignIn, type Perfil } from './fixtures';

let loginWindowUntil = 0;

// Several browser scenarios authenticate separately. Respect the API's real
// login limiter rather than changing its configuration for this test suite.
export async function signIn(page: Page, perfil: Perfil, destination = '/') {
  const pause = loginWindowUntil - Date.now();
  if (pause > 0) await new Promise(resolve => setTimeout(resolve, pause));
  const response = page.waitForResponse(item => new URL(item.url()).pathname === '/v1/auth/login'
    && item.status() === 201);
  const authentication = await fixtureSignIn(page, perfil, destination);
  const headers = (await response).headers();
  if (headers['x-ratelimit-remaining'] === '0') {
    const seconds = Number(headers['x-ratelimit-reset']);
    if (Number.isFinite(seconds) && seconds > 0) loginWindowUntil = Date.now() + seconds * 1000 + 100;
  }
  return authentication;
}

export async function apiJson<T>(method: string, path: string, body?: unknown, perfil: Perfil = 'administracao'): Promise<T> {
  const response = await apiAs(perfil, method, path, body);
  expect(response.status, `${method} ${path}`).toBe(method === 'POST' ? 201 : 200);
  return await response.json() as T;
}

export async function seedPatient(label: string, extra: Record<string, unknown> = {}) {
  const patient = await apiJson<{ pacienteId: string }>('POST', '/pacientes', {
    nome: `Etapa 7 ${label} Sintético`, ...extra,
  });
  expect(typeof patient.pacienteId).toBe('string');
  for (const perfil of ['consulta', 'edicao'] as const) {
    await apiJson('PUT', `/pacientes/${patient.pacienteId}/acesso/${fixture.users[perfil].usuarioId}`, {
      ativo: true, podeEditar: perfil === 'edicao',
    });
  }
  return { ...patient, path: `/pacientes/${patient.pacienteId}` };
}

export async function seedAttendance(patientPath: string, extra: Record<string, unknown> = {}) {
  const attendance = await apiJson<{ atendimentoId: string }>('POST', `${patientPath}/atendimentos`, {
    dataAtendimento: '2026-04-03', ...extra,
  });
  expect(typeof attendance.atendimentoId).toBe('string');
  return { ...attendance, path: `${patientPath}/atendimentos/${attendance.atendimentoId}` };
}

export const readPatient = (path: string) => apiJson<PacienteDetalheResponse>('GET', `${path}?limit=100&offset=0`);
export const readAttendance = (path: string) => apiJson<AtendimentoDetalheResponse>('GET', `${path}?limit=100&offset=0`);

export async function submitWrite(page: Page, method: string, path: string, button: string, expectedStatus = method === 'POST' ? 201 : 200) {
  const waiting = page.waitForResponse(response => response.request().method() === method
    && new URL(response.url()).pathname === `/v1${path}`);
  await page.getByRole('button', { name: button, exact: true }).click();
  const response = await waiting;
  expect(response.status()).toBe(expectedStatus);
  return { response, body: response.request().postDataJSON() as Record<string, unknown> };
}

export async function visitByLink(page: Page, path: string) {
  await page.locator(`a[href="${path}"]`).first().click();
  await expect.poll(() => `${new URL(page.url()).pathname}${new URL(page.url()).search}`).toBe(path);
}

export async function assertAccessible(page: Page) {
  const result = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa']).analyze();
  expect(result.violations.map(violation => ({ id: violation.id, impact: violation.impact,
    nodes: violation.nodes.map(node => ({ target: node.target, summary: node.failureSummary })) }))).toEqual([]);
}

export async function assertFitsViewport(page: Page) {
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1)).toBe(true);
}

// A escrita acontece na API real. Somente a entrega de sua resposta ao
// navegador é interrompida, reproduzindo uma conexão perdida após o commit.
export async function loseResponseAfterCommit(page: Page, method: string, path: string) {
  let announce!: (response: APIResponse) => void;
  const committed = new Promise<APIResponse>(resolve => { announce = resolve; });
  let writes = 0;
  let requestBody: Record<string, unknown> | null = null;
  let first = true;
  page.on('request', request => {
    if (request.method() === method && new URL(request.url()).pathname === `/v1${path}`) writes++;
  });
  await page.route(`**/v1${path}`, async route => {
    if (route.request().method() !== method || !first) { await route.continue(); return; }
    first = false;
    requestBody = route.request().postDataJSON() as Record<string, unknown>;
    const response = await route.fetch();
    announce(response);
    await route.abort('connectionreset');
  });
  return { committed, writes: () => writes, requestBody: () => requestBody };
}
