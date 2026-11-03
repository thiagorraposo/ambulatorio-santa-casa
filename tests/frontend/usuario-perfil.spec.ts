import { randomUUID } from 'node:crypto';
import { expect, test } from '@playwright/test';
import { apiAs, fixture, resumePage, signIn, signInCurrentPage } from './fixtures';
import { assertAccessible, assertFitsViewport } from './stage7-helpers';

const target = () => `/usuarios/${fixture.users.consulta.usuarioId}`;
async function restore() {
  const response = await apiAs('administracao', 'GET', target());
  const row = await response.json() as { perfil: string; versao: string };
  if (row.perfil !== 'consulta') expect((await apiAs('administracao', 'POST', `${target()}/perfil`, {
    operacaoId: randomUUID(), versao: row.versao, perfil: 'consulta', justificativa: 'Restauração de fixture sintética após teste',
  })).status).toBe(201);
}
test.afterEach(async () => { await restore(); });

async function review(page: import('@playwright/test').Page) {
  await page.getByLabel('Novo perfil', { exact: true }).selectOption('edicao');
  await page.getByLabel('Justificativa', { exact: true }).fill('Alteração administrativa sintética de teste');
  await page.getByRole('button', { name: 'Revisar alteração', exact: true }).click();
  await expect(page.getByRole('dialog')).toContainText('Consulta → Edição');
}

test('8D2U.1 revisão acessível, cancelar/Escape, confirmação/releitura e JWT revogado', async ({ page, browser }, testInfo) => {
  let writes = 0;
  page.on('request', request => { if (request.method() === 'POST' && new URL(request.url()).pathname.endsWith('/perfil')) writes++; });
  await signIn(page, 'administracao', target());
  await review(page);
  for (const width of [1440, 390, 320]) {
    await page.setViewportSize({ width, height: 900 });
    await assertFitsViewport(page); await assertAccessible(page);
    await page.screenshot({ path: testInfo.outputPath(`perfil-revisao-${width}.png`), fullPage: true });
  }
  await page.keyboard.press('Escape'); expect(writes).toBe(0);
  await expect(page.getByRole('button', { name: 'Revisar alteração', exact: true })).toBeFocused();
  await page.getByRole('button', { name: 'Revisar alteração', exact: true }).click();
  await page.getByRole('button', { name: 'Cancelar', exact: true }).click(); expect(writes).toBe(0);
  await page.getByRole('button', { name: 'Revisar alteração', exact: true }).click();
  await page.getByRole('button', { name: 'Fechar revisão', exact: true }).click(); expect(writes).toBe(0);
  await page.getByRole('button', { name: 'Revisar alteração', exact: true }).click();
  await page.mouse.click(1, 1); await expect(page.getByRole('dialog')).toHaveCount(0); expect(writes).toBe(0);
  const other = await browser.newContext(); const affected = await other.newPage();
  try {
    await signIn(affected, 'consulta', '/minha-conta');
    await page.getByRole('button', { name: 'Revisar alteração', exact: true }).click();
    await page.getByRole('button', { name: 'Confirmar alteração', exact: true }).dblclick();
    await expect(page.getByText('Alteração de perfil confirmada.', { exact: true })).toBeVisible();
    expect(writes).toBe(1);
    await expect(page.locator('dl')).toContainText('Edição');
    const row = await (await apiAs('administracao', 'GET', target())).json() as { perfil: string; versao: string };
    expect(row.perfil).toBe('edicao'); expect(BigInt(row.versao)).toBeGreaterThan(1n);
    await resumePage(affected); await expect(affected).toHaveURL(/\/login/);
    for (const width of [1440, 390, 320]) {
      await page.setViewportSize({ width, height: 900 }); await assertFitsViewport(page); await assertAccessible(page);
      await page.screenshot({ path: testInfo.outputPath(`perfil-confirmado-${width}.png`), fullPage: true });
    }
  } finally { await other.close(); }
});

test('8D2U.1 resposta perdida é recuperada por código após novo login sem novo POST', async ({ page }) => {
  await signIn(page, 'administracao', target()); await review(page);
  let writes = 0;
  await page.route(`**/v1${target()}/perfil`, async route => {
    writes++; await route.fetch(); await route.abort('failed');
  });
  await page.getByRole('button', { name: 'Confirmar alteração', exact: true }).click();
  await expect(page.getByText(/Resposta não confirmada/)).toBeVisible();
  const code = await page.getByLabel('Código da operação').inputValue();
  expect(code).toMatch(/^[a-f0-9-]{36}$/);
  await expect(page.getByRole('button', { name: 'Revisar alteração', exact: true })).toBeDisabled();
  await page.reload(); await signInCurrentPage(page, 'administracao');
  await expect(page.getByLabel('Código da operação')).toHaveValue(code);
  await page.getByRole('button', { name: 'Consultar resultado', exact: true }).click();
  await expect(page.getByText('Alteração de perfil confirmada.', { exact: true })).toBeVisible(); expect(writes).toBe(1);
});

test('8D2U.1 conflito preserva rascunho, compara estado e exige nova revisão', async ({ page }) => {
  await signIn(page, 'administracao', target()); await review(page);
  const current = await (await apiAs('administracao', 'GET', target())).json() as { versao: string };
  expect((await apiAs('administracao', 'POST', `${target()}/perfil`, { operacaoId: randomUUID(), versao: current.versao,
    perfil: 'administracao', justificativa: 'Alteração concorrente sintética por administrador' })).status).toBe(201);
  await page.getByRole('button', { name: 'Confirmar alteração', exact: true }).click();
  await expect(page.getByText(/Conflito: sua escolha/)).toBeVisible();
  await page.getByRole('button', { name: 'Consultar resultado', exact: true }).click();
  await expect(page.getByText(/A conta mudou desde a leitura/)).toBeVisible();
  await expect(page.locator('dl')).toContainText('Administração');
  await expect(page.getByLabel('Novo perfil', { exact: true })).toHaveValue('edicao');
  await expect(page.getByLabel('Justificativa', { exact: true })).toHaveValue('Alteração administrativa sintética de teste');
  await page.getByRole('button', { name: 'Preparar nova revisão', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Revisar alteração', exact: true })).toBeEnabled();
});

test('8D2U.1 código sem recibo e falha de consulta mantêm reenvio bloqueado; autoação não oferece escrita', async ({ page }) => {
  await signIn(page, 'administracao', `${target()}?operacao=${randomUUID()}`);
  await page.getByRole('button', { name: 'Consultar resultado', exact: true }).click();
  await expect(page.getByText(/resultado permanece indeterminado/)).toBeVisible();
  await expect(page.getByRole('button', { name: 'Revisar alteração', exact: true })).toBeDisabled();
  await page.route('**/v1/usuarios/*/operacoes/*', route => route.abort('failed'));
  await page.getByRole('button', { name: 'Consultar resultado', exact: true }).click();
  await expect(page.getByText(/resultado permanece indeterminado/)).toBeVisible();
  await page.goto(`/usuarios/${fixture.users.administracao.usuarioId}`); await signInCurrentPage(page, 'administracao');
  await expect(page.getByText(/Não é permitido alterar o próprio perfil/)).toBeVisible();
  await expect(page.getByRole('button', { name: 'Revisar alteração', exact: true })).toHaveCount(0);
});
