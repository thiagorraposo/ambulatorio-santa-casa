import { expect, test } from '@playwright/test';
import { apiAs, delayOneApiResponse, fixture, resumePage, setUserActive, signInCurrentPage } from './fixtures';
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


test('8D1U.1: detalhe real conserva página, recarga, teclado e leitura em telas menores', async ({ page }, testInfo) => {
  const response = await apiAs('administracao', 'GET', '/usuarios?limit=1&offset=1');
  const [user] = await response.json() as Array<{ usuarioId: string; nome: string; perfil: string }>;
  const detail = await apiAs('administracao', 'GET', `/usuarios/${user!.usuarioId}`);
  expect(detail.status).toBe(200);
  expect(await detail.json()).toEqual(user);
  await signIn(page, 'administracao', '/usuarios?limit=1&offset=1');
  const link = page.getByRole('link', { name: user!.nome, exact: true });
  await link.focus(); await page.keyboard.press('Enter');
  await expect(page).toHaveURL(url => url.pathname === `/usuarios/${user!.usuarioId}` && url.search === '?limit=1&offset=1');
  await expect(page.getByRole('heading', { name: 'Dados do usuário', exact: true })).toBeVisible();
  await expect(page.locator('dl')).toContainText(user!.usuarioId);
  await expect(page.locator('dl')).toContainText(user!.nome);
  await expect(page).toHaveTitle('Usuários | Ambulatório Santa Casa');
  await page.reload(); await signInCurrentPage(page, 'administracao');
  await expect(page.locator('dl')).toContainText(user!.usuarioId);
  for (const width of [1440, 390, 320]) {
    await page.setViewportSize({ width, height: 900 });
    await assertFitsViewport(page); await assertAccessible(page);
    await page.screenshot({ path: testInfo.outputPath(`usuario-detalhe-${width}.png`), fullPage: true });
  }
  const back = page.getByRole('link', { name: 'Voltar aos usuários', exact: true });
  await back.focus(); await page.keyboard.press('Enter');
  await expect(page).toHaveURL(/\/usuarios\?limit=1&offset=1$/);
  await expect(page.getByRole('table')).toContainText(user!.usuarioId);
});

test('8D1U.1: detalhe distingue 404, erro e repetição sem mostrar conta anterior', async ({ page }) => {
  const user = fixture.users.consulta;
  const path = `/usuarios/${user.usuarioId}`;
  await signIn(page, 'administracao', path);
  await expect(page.locator('dl')).toContainText(user.nome);
  await page.route(`**/v1${path}`, route => route.abort('failed'));
  await resumePage(page);
  await expect(page.getByRole('alert')).toContainText('Não foi possível carregar');
  await expect(page.locator('dl')).toHaveCount(0);
  await page.unroute(`**/v1${path}`);
  await page.getByRole('button', { name: 'Tentar novamente', exact: true }).click();
  await expect(page.locator('dl')).toContainText(user.nome);
  await page.goto('/usuarios/9223372036854775807?limit=1&offset=1');
  await signInCurrentPage(page, 'administracao');
  await expect(page.getByRole('alert')).toContainText('Registro ou página não disponível.');
  await expect(page.locator('dl')).toHaveCount(0);
  await expect(page.getByRole('button', { name: 'Tentar novamente', exact: true })).toHaveCount(0);
  await page.getByRole('link', { name: 'Voltar aos usuários', exact: true }).click();
  await expect(page).toHaveURL(/\/usuarios\?limit=1&offset=1$/);
});

for (const profile of ['consulta', 'edicao'] as const) {
  test(`8D1U.1: ${profile} não consulta detalhe por URL nem a própria conta administrativa`, async ({ page }) => {
    const path = `/usuarios/${fixture.users[profile].usuarioId}`;
    expect((await apiAs(profile, 'GET', path)).status).toBe(403);
    let reads = 0;
    page.on('request', request => { if (new URL(request.url()).pathname.startsWith('/v1/usuarios/')) reads++; });
    await signIn(page, profile, path);
    await expect(page.getByRole('heading', { name: 'Acesso administrativo necessário', exact: true })).toBeVisible();
    await expect(page.locator('dl')).toHaveCount(0);
    expect(reads).toBe(0);
  });
}

test('8D1U.1: inativação real do requisitante oculta detalhe e encerra sessão', async ({ page }) => {
  const user = fixture.users.consulta;
  await signIn(page, 'administracao', `/usuarios/${user.usuarioId}`);
  await expect(page.locator('dl')).toContainText(user.nome);
  try {
    await setUserActive('administracao', false);
    await resumePage(page);
    await expect(page).toHaveURL(/\/login/);
    await expect(page.locator('dl')).toHaveCount(0);
    await expect(page.getByText(user.nome, { exact: true })).toHaveCount(0);
  } finally { await setUserActive('administracao', true); }
});


test('8D1U.1: troca de conta por navegação mantém dados antigos ocultos durante carga', async ({ page }) => {
  const first = fixture.users.consulta;
  const second = fixture.users.edicao;
  await signIn(page, 'administracao', `/usuarios/${first.usuarioId}`);
  await expect(page.locator('dl')).toContainText(first.nome);
  await page.getByRole('link', { name: 'Voltar aos usuários', exact: true }).click();
  const delayed = await delayOneApiResponse(page, `**/v1/usuarios/${second.usuarioId}`);
  try {
    await page.getByRole('link', { name: second.nome, exact: true }).click();
    await delayed.fetched;
    await expect(page.getByRole('status')).toContainText('Carregando');
    await expect(page.locator('dl')).toHaveCount(0);
  } finally { delayed.release(); }
  await delayed.done;
  await expect(page.locator('dl')).toContainText(second.nome);
  await expect(page.locator('dl')).not.toContainText(first.nome);
});
