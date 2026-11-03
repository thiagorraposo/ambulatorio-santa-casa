import { expect, test } from '@playwright/test';
import { apiAs, assertNoPersistentClinicalState, fixture, resumePage, setUserActive, restoreUserGrants } from './fixtures';
import { assertAccessible, assertFitsViewport, signIn } from './stage7-helpers';

for (const profile of ['consulta', 'edicao', 'administracao'] as const) {
  test(`8D1B.2/U.2: ${profile} consulta identificação própria real e suporte aprovado`, async ({ page }, info) => {
    const user = fixture.users[profile];
    const me = await apiAs(profile, 'GET', '/auth/me');
    expect(me.status).toBe(200);
    expect(await me.json()).toEqual({ usuarioId: user.usuarioId, nome: user.nome, perfil: profile, login: user.login, ativo: true });
    await signIn(page, profile, '/minha-conta');
    await expect(page.getByRole('heading', { name: 'Minha conta', exact: true })).toBeVisible();
    await expect(page.locator('dl')).toContainText(user.usuarioId);
    await expect(page.locator('dl')).toContainText(user.login);
    await expect(page.locator('dl')).toContainText('Ativa');
    await expect(page.getByText('Procure um administrador autorizado da unidade', { exact: true })).toBeVisible();
    await expect(page.getByRole('combobox')).toHaveCount(0);
    await assertNoPersistentClinicalState(page);
    if (profile === 'consulta') {
      for (const width of [1440, 390, 320]) {
        await page.setViewportSize({ width, height: 900 });
        await assertFitsViewport(page); await assertAccessible(page);
        await page.screenshot({ path: info.outputPath(`minha-conta-${width}.png`), fullPage: true });
      }
    }
    await page.getByRole('button', { name: 'Sair da conta', exact: true }).click();
    await expect(page.getByLabel('Usuário', { exact: true })).toBeVisible();
    await expect(page.getByText(user.login, { exact: true })).toHaveCount(0);
    await assertNoPersistentClinicalState(page);
  });
}

test('8D1B.2/U.2: falha de identidade oculta login e inativação real encerra a conta', async ({ page }) => {
  const user = fixture.users.consulta;
  await signIn(page, 'consulta', '/minha-conta');
  await expect(page.locator('dl')).toContainText(user.login);
  await page.route('**/v1/auth/me', route => route.abort('failed'));
  await resumePage(page);
  await expect(page.getByRole('heading', { name: 'Não foi possível verificar seu acesso' })).toBeVisible();
  await expect(page.getByText(user.login, { exact: true })).toHaveCount(0);
  await page.unroute('**/v1/auth/me');
  await page.getByRole('button', { name: 'Tentar novamente', exact: true }).click();
  await expect(page.locator('dl')).toContainText(user.login);
  try {
    await setUserActive('consulta', false);
    await resumePage(page);
    await expect(page.getByLabel('Usuário', { exact: true })).toBeVisible();
    await expect(page.getByText(user.login, { exact: true })).toHaveCount(0);
    await assertNoPersistentClinicalState(page);
  } finally { await setUserActive('consulta', true); await restoreUserGrants('consulta'); }
});
