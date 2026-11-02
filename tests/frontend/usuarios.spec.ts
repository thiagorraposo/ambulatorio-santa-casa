import { expect, test } from '@playwright/test';
import { apiAs, signInCurrentPage } from './fixtures';
import { assertAccessible, assertFitsViewport, signIn } from './stage7-helpers';

test('8D1U.1: Administração consulta usuários reais, pagina, recupera leitura e mantém URL', async ({ page }, testInfo) => {
  const expectedResponse = await apiAs('administracao', 'GET', '/usuarios?limit=1&offset=0');
  expect(expectedResponse.status).toBe(200);
  const expected = await expectedResponse.json() as Array<{ usuarioId: string; nome: string; perfil: string }>;
  await signIn(page, 'administracao', '/usuarios?limit=1&offset=0');
  await expect(page.getByRole('heading', { name: 'Usuários', exact: true })).toBeVisible();
  await expect(page.getByRole('table')).toContainText(expected[0]!.nome);
  await expect(page.getByRole('table')).toContainText(expected[0]!.usuarioId);
  await page.getByRole('button', { name: 'Próxima', exact: true }).click();
  await expect(page).toHaveURL(/offset=1/);
  const secondResponse = await apiAs('administracao', 'GET', '/usuarios?limit=1&offset=1');
  const second = await secondResponse.json() as typeof expected;
  await expect(page.getByRole('table')).toContainText(second[0]!.nome);
  await page.reload(); await signInCurrentPage(page, 'administracao'); await expect(page.getByRole('table')).toContainText(second[0]!.usuarioId);
  await page.getByRole('button', { name: 'Anterior', exact: true }).click();
  await expect(page).toHaveURL(/offset=0/);
  await page.route('**/v1/usuarios?*', route => route.abort('failed'));
  await page.reload(); await signInCurrentPage(page, 'administracao');
  await expect(page.getByRole('alert')).toContainText('Não foi possível carregar');
  await expect(page.getByRole('table')).toHaveCount(0);
  await page.unroute('**/v1/usuarios?*');
  await page.getByRole('button', { name: 'Tentar novamente', exact: true }).click();
  await expect(page.getByRole('table')).toContainText(expected[0]!.usuarioId);
  for (const width of [1440, 390, 320]) {
    await page.setViewportSize({ width, height: 900 });
    await assertFitsViewport(page); await assertAccessible(page);
    await page.screenshot({ path: testInfo.outputPath(`usuarios-${width}.png`), fullPage: true });
  }
  const region = page.getByRole('region', { name: /^Usuários do ambulatório;/ });
  await region.focus(); await page.keyboard.press('ArrowRight');
  await expect.poll(() => region.evaluate(element => element.scrollLeft)).toBeGreaterThan(0);
  await signIn(page, 'administracao', '/usuarios?offset=100000');
  await expect(page.getByText('Nenhum usuário nesta página.', { exact: true })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Próxima', exact: true })).toBeDisabled();
});

for (const profile of ['consulta', 'edicao'] as const) {
  test(`8D1U.1: ${profile} não lista terceiros por menu ou URL`, async ({ page }) => {
    expect((await apiAs(profile, 'GET', '/usuarios')).status).toBe(403);
    let reads = 0;
    page.on('request', request => { if (new URL(request.url()).pathname === '/v1/usuarios') reads++; });
    await signIn(page, profile, '/usuarios');
    await expect(page.getByRole('heading', { name: 'Acesso administrativo necessário', exact: true })).toBeVisible();
    await expect(page.getByRole('link', { name: 'Usuários', exact: true })).toHaveCount(0);
    await expect(page.getByRole('table')).toHaveCount(0);
    expect(reads).toBe(0);
  });
}
