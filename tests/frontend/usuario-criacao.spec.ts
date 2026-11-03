import { randomUUID } from 'node:crypto';
import { expect, test, type Page } from '@playwright/test';
import { apiAs, signIn, signInCurrentPage, waitForRateLimitWindow } from './fixtures';
import { assertAccessible, assertFitsViewport } from './stage7-helpers';

async function prepare(page: Page) {
  const login = `conta-${randomUUID()}`;
  await page.getByLabel('Nome completo', { exact: true }).fill('Nova conta exclusivamente sintética');
  await page.getByLabel('Login', { exact: true }).fill(login.toUpperCase());
  await page.getByLabel('Perfil inicial', { exact: true }).selectOption('consulta');
  await page.getByRole('button', { name: 'Revisar criação', exact: true }).click();
  return login;
}
async function loginNew(page: Page, login: string, senha: string) {
  await page.getByLabel('Usuário', { exact: true }).fill(login);
  await page.getByLabel('Senha', { exact: true }).fill(senha);
  const response = page.waitForResponse(item => new URL(item.url()).pathname === '/v1/auth/login' && item.request().method() === 'POST');
  await page.getByRole('button', { name: 'Entrar', exact: true }).click();
  const result = await response;
  if (result.status() === 429) {
    const seconds = Number(result.headers()['retry-after'] ?? result.headers()['x-ratelimit-reset']);
    expect(Number.isFinite(seconds) && seconds > 0 && seconds <= 60).toBe(true);
    await waitForRateLimitWindow(seconds * 1000 + 200);
    await page.getByRole('button', { name: 'Entrar', exact: true }).click();
  }
}

test('8D2U.3 criação real, cancelamento, primeiro acesso obrigatório e acesso normal', async ({ page, browser }, info) => {
  await signIn(page, 'administracao', '/usuarios/novo');
  let writes = 0; page.on('request', request => { if (request.method() === 'POST' && new URL(request.url()).pathname === '/v1/usuarios') writes++; });
  const login = await prepare(page);
  for (const width of [1440, 390, 320]) {
    await page.setViewportSize({ width, height: 900 }); await assertFitsViewport(page); await assertAccessible(page);
    await page.screenshot({ path: info.outputPath(`criacao-revisao-${width}.png`), fullPage: true });
  }
  await page.keyboard.press('Escape'); expect(writes).toBe(0);
  await expect(page.getByRole('button', { name: 'Revisar criação', exact: true })).toBeFocused();
  await page.getByRole('button', { name: 'Revisar criação', exact: true }).click();
  await page.getByRole('button', { name: 'Cancelar', exact: true }).click(); expect(writes).toBe(0);
  await page.getByRole('button', { name: 'Revisar criação', exact: true }).click();
  await page.getByRole('button', { name: 'Confirmar criação', exact: true }).dblclick();
  await expect(page.getByRole('heading', { name: 'Usuário criado', exact: true })).toBeVisible();
  const temporary = await page.getByLabel('Credencial temporária', { exact: true }).inputValue();
  expect(temporary.length).toBeGreaterThanOrEqual(20); expect(writes).toBe(1);
  await expect(page.getByText(/Conta relida:/)).toContainText('ativa');
  await page.getByRole('button', { name: 'Encerrar exibição da credencial', exact: true }).click();
  await expect(page.getByLabel('Credencial temporária', { exact: true })).toHaveCount(0);
  const other = await browser.newContext(); const newcomer = await other.newPage();
  try {
    await newcomer.goto('/pacientes'); await loginNew(newcomer, login, temporary);
    await expect(newcomer.getByRole('heading', { name: 'Defina sua nova senha', exact: true })).toBeVisible();
    await expect(newcomer.getByRole('navigation')).toHaveCount(0);
    for (const width of [1440, 390, 320]) {
      await newcomer.setViewportSize({ width, height: 900 }); await assertFitsViewport(newcomer); await assertAccessible(newcomer);
      await newcomer.screenshot({ path: info.outputPath(`primeiro-acesso-${width}.png`), fullPage: true });
    }
    const permanent = `Nova-${randomUUID()}!Aa1`;
    await newcomer.getByLabel('Credencial temporária', { exact: true }).fill(temporary);
    await newcomer.getByLabel('Nova senha', { exact: true }).fill(permanent);
    await newcomer.getByLabel('Confirme a nova senha', { exact: true }).fill(permanent);
    await newcomer.getByRole('button', { name: 'Confirmar nova senha', exact: true }).click();
    await expect(newcomer.getByText('Senha alterada. Entre novamente com sua nova senha para continuar.', { exact: true })).toBeVisible();
    await newcomer.getByRole('button', { name: 'Entrar com a nova senha', exact: true }).click();
    await loginNew(newcomer, login, permanent);
    await expect(newcomer.getByRole('heading', { name: 'Pacientes', exact: true })).toBeVisible();
    await expect(newcomer.getByRole('heading', { name: 'Defina sua nova senha', exact: true })).toHaveCount(0);
    await newcomer.setViewportSize({ width: 1440, height: 900 });
    await newcomer.getByRole('button', { name: 'Sair', exact: true }).click();
    await loginNew(newcomer, login, temporary);
    await expect(newcomer.getByRole('alert')).toContainText('Usuário ou senha não conferem');
  } finally { await other.close(); }
});

test('8D2U.3 resposta perdida recupera recibo após login sem nova criação ou segredo', async ({ page }) => {
  await signIn(page, 'administracao', '/usuarios/novo'); await prepare(page);
  let writes = 0;
  await page.route('**/v1/usuarios', async route => { if (route.request().method() !== 'POST') return route.continue(); writes++; await route.fetch(); await route.abort('failed'); });
  await page.getByRole('button', { name: 'Confirmar criação', exact: true }).click();
  await expect(page.getByText(/Resposta não confirmada/)).toBeVisible();
  const code = await page.getByLabel('Código da criação', { exact: true }).inputValue();
  await page.reload(); await signInCurrentPage(page, 'administracao');
  await expect(page.getByLabel('Código da criação', { exact: true })).toHaveValue(code);
  await page.getByRole('button', { name: 'Consultar resultado da criação', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Usuário criado', exact: true })).toBeVisible();
  await expect(page.getByText(/A credencial não pode ser consultada novamente/)).toBeVisible();
  await expect(page.getByLabel('Credencial temporária', { exact: true })).toHaveCount(0); expect(writes).toBe(1);
});

for (const perfil of ['consulta', 'edicao'] as const) test(`8D2U.3 ${perfil} não cria conta por interface ou API`, async ({ page }) => {
  await signIn(page, perfil, '/usuarios/novo');
  await expect(page.getByRole('heading', { name: 'Acesso administrativo necessário', exact: true })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Revisar criação', exact: true })).toHaveCount(0);
  expect((await apiAs(perfil, 'POST', '/usuarios', { operacaoId: randomUUID(), nome: 'Conta sintética recusada', login: `negado-${randomUUID()}`, perfil: 'consulta' })).status).toBe(403);
});

test('8D2U.3 recuperação administrativa substitui credencial perdida com recibo real', async ({ page, browser }, info) => {
  const login = `recuperavel-${randomUUID()}`;
  const created = await apiAs('administracao', 'POST', '/usuarios', { operacaoId: randomUUID(), nome: 'Conta sintética recuperável', login, perfil: 'consulta' });
  expect(created.status).toBe(201);
  const initial = await created.json() as { recibo: { usuarioId: string }; credencialTemporaria: string };
  await signIn(page, 'administracao', `/usuarios/${initial.recibo.usuarioId}`);
  await page.getByLabel('Justificativa da recuperação', { exact: true }).fill('Recuperação de credencial exclusivamente sintética');
  await page.getByRole('button', { name: 'Revisar recuperação', exact: true }).click();
  for (const width of [1440, 390, 320]) {
    await page.setViewportSize({ width, height: 900 }); await assertFitsViewport(page); await assertAccessible(page);
    await page.screenshot({ path: info.outputPath(`recuperacao-revisao-${width}.png`), fullPage: true });
  }
  await page.getByRole('button', { name: 'Cancelar recuperação', exact: true }).click();
  await page.getByRole('button', { name: 'Revisar recuperação', exact: true }).click();
  await page.getByRole('button', { name: 'Confirmar recuperação', exact: true }).click();
  await expect(page.getByText('Recuperação confirmada.', { exact: true })).toBeVisible();
  const replacement = await page.getByLabel('Nova credencial temporária', { exact: true }).inputValue();
  expect(replacement).not.toBe(initial.credencialTemporaria);
  await page.getByRole('button', { name: 'Encerrar exibição da nova credencial', exact: true }).click();
  await page.getByRole('button', { name: 'Consultar resultado da recuperação', exact: true }).click();
  await expect(page.getByLabel('Nova credencial temporária', { exact: true })).toHaveCount(0);
  const other = await browser.newContext(); const affected = await other.newPage();
  try {
    await affected.goto('/minha-conta'); await loginNew(affected, login, initial.credencialTemporaria);
    await expect(affected.getByRole('alert')).toContainText('Usuário ou senha não conferem');
    await loginNew(affected, login, replacement);
    await expect(affected.getByRole('heading', { name: 'Defina sua nova senha', exact: true })).toBeVisible();
  } finally { await other.close(); }
});
