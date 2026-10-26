import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { resolve } from 'node:path';
import { expect, test, type Page } from '@playwright/test';

export type Perfil = 'consulta' | 'edicao' | 'administracao';
interface User { usuarioId: string; login: string; nome: string; perfil: Perfil }
interface Patient { pacienteId: string; nome: string; sexo: string }
interface Fixture {
  password: string;
  users: Record<Perfil, User>;
  patients: Patient[];
  main: Patient & { atendimentos: Array<{ atendimentoId: string; dataAtendimento: string }>; encaminhamento: { encaminhamentoId: string } };
  reserved: Patient;
  large: Patient;
  importacoes: { loteId: string; loteSemVinculoId: string };
}

if (!/^etapa6_frontend_\d+_\d+_[a-f0-9]{6}$/.test(process.env.FRONTEND_E2E_DB ?? '')) {
  throw new Error('Fixtures somente no banco descartável criado por test_e2e.sh');
}
export const fixture: Fixture = JSON.parse(readFileSync(process.env.FRONTEND_E2E_FIXTURE!, 'utf8'));
const requireBackend = createRequire(resolve(__dirname, '../../backend/package.json'));
const { sign } = requireBackend('jsonwebtoken');
const { Pool } = requireBackend('pg');
let loginWindowUntil = 0;

async function waitForLoginWindow(milliseconds: number) {
  // The real rate limiter can add a full minute between logins. Account for
  // that wait separately from the scenario's action/assertion budget.
  const info = test.info();
  info.setTimeout(info.timeout + milliseconds);
  await new Promise(resolve => setTimeout(resolve, milliseconds));
}

export async function signIn(page: Page, perfil: Perfil, destination = '/') {
  const pause = loginWindowUntil - Date.now();
  if (pause > 0) await waitForLoginWindow(pause);
  await page.goto(destination);
  await expect(page.getByLabel('Usuário', { exact: true })).toBeVisible();
  await page.getByLabel('Usuário', { exact: true }).fill(fixture.users[perfil].login);
  await page.keyboard.press('Tab');
  await expect(page.getByLabel('Senha', { exact: true })).toBeFocused();
  await page.getByLabel('Senha', { exact: true }).fill(fixture.password);
  await page.keyboard.press('Tab');
  await expect(page.getByRole('button', { name: 'Entrar', exact: true })).toBeFocused();
  const loginResponse = page.waitForResponse(response => new URL(response.url()).pathname === '/v1/auth/login'
    && response.request().method() === 'POST');
  await page.keyboard.press('Enter');
  let response = await loginResponse;
  // A new Playwright worker/file may start without the previous login window.
  // Respect the real 429 rather than changing or bypassing the API limiter.
  if (response.status() === 429) {
    const seconds = Number(response.headers()['retry-after'] ?? response.headers()['x-ratelimit-reset']);
    expect(Number.isFinite(seconds) && seconds > 0 && seconds <= 60).toBe(true);
    await expect(page.getByRole('alert')).toContainText(/tentativas|aguarde|limite/i);
    await waitForLoginWindow(seconds * 1000 + 200);
    const resumed = page.waitForResponse(item => new URL(item.url()).pathname === '/v1/auth/login'
      && item.request().method() === 'POST');
    await page.getByRole('button', { name: 'Entrar', exact: true }).click();
    response = await resumed;
  }
  expect(response.status()).toBe(201);
  if (response.headers()['x-ratelimit-remaining'] === '0') {
    const seconds = Number(response.headers()['x-ratelimit-reset']);
    if (Number.isFinite(seconds) && seconds > 0) loginWindowUntil = Date.now() + seconds * 1000 + 200;
  }
  const authentication = await response.json() as { accessToken: string; expiresIn: number };
  await expect(page).not.toHaveURL(/\/login(?:\?|$)/);
  return authentication;
}

export async function apiAs(perfil: Perfil, method: string, path: string, body?: unknown) {
  // Tokens de setup são usados só pelas verificações/alterações autorizadas do
  // teste. Login, identidade e sessão da interface usam as chamadas HTTP reais.
  const token = sign({ sub: fixture.users[perfil].usuarioId, typ: 'access' }, process.env.AUTH_JWT_SECRET, { expiresIn: 120 });
  return fetch(`${process.env.FRONTEND_API_TARGET}/v1${path}`, {
    method, headers: { authorization: `Bearer ${token}`, 'content-type': 'application/json' },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
}

export async function setUserActive(perfil: Perfil, active: boolean) {
  const owner = new Pool({ host: process.env.PGHOST, port: Number(process.env.PGPORT),
    user: process.env.PGUSER, password: process.env.PGPASSWORD, database: process.env.FRONTEND_E2E_DB });
  try {
    await owner.query('BEGIN');
    await owner.query('UPDATE ambulatorio.usuario_aplicacao SET ativo=$1 WHERE usuario_id=$2', [active, fixture.users[perfil].usuarioId]);
    await owner.query('COMMIT');
  } finally { await owner.end(); }
}

export async function resumePage(page: Page) {
  await page.evaluate(() => {
    window.dispatchEvent(new Event('blur'));
    document.dispatchEvent(new Event('visibilitychange'));
    window.dispatchEvent(new Event('focus'));
  });
}

export async function assertNoPersistentClinicalState(page: Page) {
  const stored = await page.evaluate(async () => ({
    local: Object.entries(localStorage), session: Object.entries(sessionStorage),
    cookie: document.cookie, indexedDb: await indexedDB.databases(), caches: await caches.keys(),
  }));
  expect(stored).toEqual({ local: [], session: [], cookie: '', indexedDb: [], caches: [] });
}

export async function delayOneApiResponse(page: Page, pattern: string) {
  let release!: () => void;
  let ready!: () => void;
  let finished!: () => void;
  const delayed = new Promise<void>(resolve => { release = resolve; });
  const fetched = new Promise<void>(resolve => { ready = resolve; });
  const done = new Promise<void>(resolve => { finished = resolve; });
  let first = true;
  await page.route(pattern, async route => {
    if (!first) { await route.continue(); return; }
    first = false;
    const response = await route.fetch();
    ready();
    await delayed;
    try { await route.fulfill({ response }); } catch { /* a sessão cancelou o pedido */ }
    finally { finished(); }
  });
  return { fetched, release, done };
}
