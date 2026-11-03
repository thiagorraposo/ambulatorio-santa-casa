import { randomUUID } from 'node:crypto';
import { expect, test } from '@playwright/test';
import { apiAs, captureUserGrants, fixture, resumePage, restoreUserGrants, signIn, signInCurrentPage, waitForRateLimitWindow } from './fixtures';
import { assertAccessible, assertFitsViewport } from './stage7-helpers';
const target = () => `/usuarios/${fixture.users.edicao.usuarioId}`;
test.beforeEach(async () => { await captureUserGrants('edicao'); });
test.afterEach(async () => {
  const row = await (await apiAs('administracao', 'GET', target())).json() as { ativo: boolean; versao: string };
  if (!row.ativo) expect((await apiAs('administracao', 'POST', `${target()}/estado`, { operacaoId: randomUUID(), versao: row.versao,
    ativo: true, justificativa: 'Restaurar fixture sintética após o teste' })).status).toBe(201);
  await restoreUserGrants('edicao');
});
async function review(page: import('@playwright/test').Page) {
  await page.getByLabel('Nova situação', { exact: true }).selectOption('inativa');
  await page.getByLabel('Justificativa', { exact: true }).fill('Mudança sintética da situação de acesso');
  await page.getByRole('button', { name: 'Revisar alteração', exact: true }).click();
  await expect(page.getByRole('dialog')).toContainText('Ativa → Inativa');
}
test('8D2U.2 inativa/reativa de verdade, revoga JWT/vínculo e não restaura acesso', async ({ page, browser }, testInfo) => {
  const created = await (await apiAs('edicao', 'POST', '/pacientes', { nome: 'Paciente situação sintético' })).json() as { pacienteId: string };
  await captureUserGrants('edicao');
  expect((await apiAs('edicao', 'GET', `/pacientes/${created.pacienteId}`)).status).toBe(200);
  await signIn(page, 'administracao', `${target()}?comando=estado`);
  let writes = 0; page.on('request', req => { if (req.method() === 'POST' && new URL(req.url()).pathname.endsWith('/estado')) writes++; });
  await review(page);
  for (const width of [1440, 390, 320]) {
    await page.setViewportSize({ width, height: 900 }); await assertFitsViewport(page); await assertAccessible(page);
    await page.screenshot({ path: testInfo.outputPath(`estado-inativacao-${width}.png`), fullPage: true });
  }
  await page.keyboard.press('Escape'); expect(writes).toBe(0);
  await expect(page.getByRole('button', { name: 'Revisar alteração', exact: true })).toBeFocused();
  const other = await browser.newContext(); const affected = await other.newPage();
  try {
    await signIn(affected, 'edicao', '/minha-conta');
    await page.getByRole('button', { name: 'Revisar alteração', exact: true }).click();
    await expect(page.getByRole('dialog')).toContainText('vínculos com pacientes serão revogados');
    await page.getByRole('button', { name: 'Confirmar alteração', exact: true }).dblclick();
    await expect(page.getByText('Alteração de situação da conta confirmada.', { exact: true })).toBeVisible();
    await expect(page.locator('dl')).toContainText('Inativa'); expect(writes).toBe(1);
    await resumePage(affected); await expect(affected).toHaveURL(/\/login/);
    await page.getByRole('button', { name: 'Preparar nova alteração', exact: true }).click();
    await page.getByLabel('Nova situação', { exact: true }).selectOption('ativa');
    await page.getByRole('button', { name: 'Revisar alteração', exact: true }).click();
    await expect(page.getByRole('dialog')).toContainText('Inativa → Ativa');
    await expect(page.getByRole('dialog')).toContainText('Vínculos revogados não serão restaurados');
    for (const width of [1440, 390, 320]) {
      await page.setViewportSize({ width, height: 900 }); await assertFitsViewport(page); await assertAccessible(page);
      await page.screenshot({ path: testInfo.outputPath(`estado-reativacao-${width}.png`), fullPage: true });
    }
    await page.getByRole('button', { name: 'Confirmar alteração', exact: true }).click();
    await expect(page.locator('dl')).toContainText('Ativa'); expect(writes).toBe(2);
    await signInCurrentPage(affected, 'edicao');
    await expect(affected.getByRole('heading', { name: 'Minha conta', exact: true })).toBeVisible();
    expect((await apiAs('edicao', 'GET', `/pacientes/${created.pacienteId}`)).status).toBe(403);
  } finally { await other.close(); }
});

test('8D2U.2 resposta perdida recupera estado após novo login sem repetir POST', async ({ page }) => {
  await signIn(page, 'administracao', `${target()}?comando=estado`); await review(page);
  let writes = 0;
  await page.route(`**/v1${target()}/estado`, async route => { writes++; await route.fetch(); await route.abort('failed'); });
  await page.getByRole('button', { name: 'Confirmar alteração', exact: true }).click();
  await expect(page.getByText(/Resposta não confirmada/)).toBeVisible();
  const code = await page.getByLabel('Código da operação').inputValue();
  await page.reload(); await signInCurrentPage(page, 'administracao');
  await expect(page.getByLabel('Código da operação')).toHaveValue(code);
  await page.getByRole('button', { name: 'Consultar resultado', exact: true }).click();
  await expect(page.getByText('Alteração de situação da conta confirmada.', { exact: true })).toBeVisible();
  await expect(page.locator('dl')).toContainText('Inativa'); expect(writes).toBe(1);
});

test('8D2U.2 conflito perfil×estado preserva escolha, cancelamento e preparação explícita', async ({ page }) => {
  await signIn(page, 'administracao', `${target()}?comando=estado`); await review(page);
  await page.getByRole('button', { name: 'Cancelar', exact: true }).click();
  await page.getByRole('button', { name: 'Revisar alteração', exact: true }).click();
  const row = await (await apiAs('administracao', 'GET', target())).json() as { perfil: string; versao: string };
  const dto = { operacaoId: randomUUID(), versao: row.versao, perfil: 'consulta', justificativa: 'Perfil concorrente no teste de estado' };
  expect((await apiAs('administracao', 'POST', `${target()}/perfil`, dto)).status).toBe(201);
  try {
    await page.getByRole('button', { name: 'Confirmar alteração', exact: true }).click();
    await expect(page.getByText(/Conflito: sua escolha/)).toBeVisible();
    await page.getByRole('button', { name: 'Consultar resultado', exact: true }).click();
    await expect(page.getByText(/A conta mudou desde a leitura/)).toBeVisible();
    await expect(page.getByLabel('Nova situação', { exact: true })).toHaveValue('inativa');
    await page.getByRole('button', { name: 'Preparar nova revisão', exact: true }).click();
    await expect(page.getByRole('button', { name: 'Revisar alteração', exact: true })).toBeEnabled();
  } finally {
    const current = await (await apiAs('administracao', 'GET', target())).json() as { versao: string };
    expect((await apiAs('administracao', 'POST', `${target()}/perfil`, { ...dto, operacaoId: randomUUID(), versao: current.versao, perfil: row.perfil })).status).toBe(201);
  }
});

test('fixture sintética restaura mais de cem vínculos respeitando o limitador real', async () => {
  for (let index = 0; index < 101; index++) {
    const create = () => apiAs('edicao', 'POST', '/pacientes', { nome: `Restauração ${index} exclusivamente sintética` });
    let response = await create();
    // Preparação sintética volumosa também respeita a recusa explícita anterior à escrita.
    if (response.status === 429) {
      const seconds = Number(response.headers.get('retry-after') ?? response.headers.get('x-ratelimit-reset'));
      expect(Number.isFinite(seconds) && seconds > 0 && seconds <= 60).toBe(true);
      await waitForRateLimitWindow(seconds * 1000 + 200);
      response = await create();
    }
    expect(response.status).toBe(201);
  }
  await captureUserGrants('edicao');
  const patients = async () => {
    const result = [];
    for (const offset of [0, 100]) {
      const response = await apiAs('edicao', 'GET', `/pacientes?limit=100&offset=${offset}`);
      expect(response.status).toBe(200);
      result.push(...await response.json() as Array<{ pacienteId: string }>);
    }
    return result;
  };
  const before = await patients();
  expect(before.length).toBeGreaterThan(100);
  let row = await (await apiAs('administracao', 'GET', target())).json() as { versao: string };
  expect((await apiAs('administracao', 'POST', `${target()}/estado`, { operacaoId: randomUUID(), versao: row.versao,
    ativo: false, justificativa: 'Inativação exclusivamente sintética para validar restauração da fixture' })).status).toBe(201);
  row = await (await apiAs('administracao', 'GET', target())).json() as { versao: string };
  expect((await apiAs('administracao', 'POST', `${target()}/estado`, { operacaoId: randomUUID(), versao: row.versao,
    ativo: true, justificativa: 'Reativação exclusivamente sintética para validar restauração da fixture' })).status).toBe(201);
  expect(await patients()).toEqual([]);
  await restoreUserGrants('edicao');
  expect(await patients()).toEqual(before);
});
