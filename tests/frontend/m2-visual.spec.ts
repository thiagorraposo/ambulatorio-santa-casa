import { test, expect } from '@playwright/test';
import { assertAccessible, assertFitsViewport, seedAttendance, seedPatient, signIn } from './stage7-helpers';

test('7D-U4.2: evidências de formulário, tabela, diálogo, carga e erro em 320/390 px e zoom', async ({ page }, info) => {
  test.setTimeout(180_000);
  const patient = await seedPatient('Comparação visual M2');
  await seedAttendance(patient.path, { observacoes: 'Histórico exclusivamente sintético para comparação visual' });
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/login');
  await expect(page.getByLabel('Usuário', { exact: true })).toBeFocused();
  await assertAccessible(page);
  await page.screenshot({ path: info.outputPath('login-390.png'), fullPage: true });
  await signIn(page, 'edicao', `${patient.path}/atendimentos/novo`);
  await page.getByLabel('Data do atendimento', { exact: true }).fill('2026-04-12');
  await page.getByLabel('Observações do atendimento', { exact: true }).fill('Rascunho exclusivamente sintético');
  const cancel = page.getByRole('button', { name: 'Cancelar atendimento', exact: true });
  let writes = 0;
  page.on('request', request => {
    if (request.method() !== 'GET' && new URL(request.url()).pathname.startsWith('/v1/pacientes')) writes++;
  });
  for (const width of [320, 390, 1440]) {
    await page.setViewportSize({ width, height: width === 1440 ? 960 : 844 });
    await assertFitsViewport(page);
    await assertAccessible(page);
    await page.screenshot({ path: info.outputPath(`atendimento-${width}.png`), fullPage: true });
    await cancel.focus();
    await page.keyboard.press('Enter');
    const dialog = page.getByRole('dialog', { name: 'Alterações não salvas', exact: true });
    await expect(dialog.getByRole('button', { name: 'Continuar editando', exact: true })).toBeFocused();
    await assertFitsViewport(page);
    await assertAccessible(page);
    await page.screenshot({ path: info.outputPath(`dialogo-${width}.png`), fullPage: true });
    await page.keyboard.press('Escape');
    await expect(dialog).toHaveCount(0);
    await expect(cancel).toBeFocused();
  }
  await page.setViewportSize({ width: 1280, height: 900 });
  await page.evaluate(() => { document.documentElement.style.zoom = '2'; });
  await assertFitsViewport(page);
  await assertAccessible(page);
  await page.screenshot({ path: info.outputPath('atendimento-zoom200.png'), fullPage: true });
  await page.evaluate(() => { document.documentElement.style.zoom = ''; });
  expect(writes).toBe(0);

  await cancel.click();
  await page.getByRole('button', { name: 'Sair e manter rascunho', exact: true }).click();
  await page.getByRole('navigation', { name: 'Seções da ficha', exact: true })
    .getByRole('link', { name: 'Atendimentos', exact: true }).click();
  await expect(page.getByRole('link', { name: /Atendimento \d+/ }).first()).toBeVisible();
  for (const width of [320, 390, 1440]) {
    await page.setViewportSize({ width, height: width === 1440 ? 960 : 844 });
    const region = page.getByRole('region', { name: /Histórico/ });
    await expect(region).toHaveAttribute('tabindex', '0');
    await region.focus();
    await page.keyboard.press('ArrowRight');
    if (width < 400) await expect.poll(() => region.evaluate(node => node.scrollLeft)).toBeGreaterThan(0);
    await region.evaluate(node => { node.scrollLeft = 0; });
    await assertFitsViewport(page);
    await assertAccessible(page);
    await page.screenshot({ path: info.outputPath(`historico-${width}.png`), fullPage: true });
  }

  // Delay a genuine response to inspect loading; only the read delivery changes.
  let release!: () => void;
  const gate = new Promise<void>(resolve => { release = resolve; });
  await page.route('**/v1/pacientes?**', async route => {
    const response = await route.fetch();
    await gate;
    await route.fulfill({ response });
  });
  await page.setViewportSize({ width: 1440, height: 960 });
  await page.getByRole('navigation', { name: 'Menu principal', exact: true })
    .getByRole('link', { name: 'Pacientes', exact: true }).click();
  await page.setViewportSize({ width: 390, height: 844 });
  await expect(page.getByRole('status').filter({ hasText: 'Carregando' }).last()).toBeVisible();
  await assertFitsViewport(page);
  await assertAccessible(page);
  await page.screenshot({ path: info.outputPath('pacientes-carregando-390.png'), fullPage: true });
  release();
  await expect(page.getByRole('table')).toBeVisible();
  await page.unroute('**/v1/pacientes?**');

  // Transport failure, not a mocked successful response or persistence.
  await page.route('**/v1/pacientes?**', route => route.abort('connectionreset'));
  await page.getByLabel('Nome', { exact: true }).fill('Falha exclusivamente sintética');
  await page.getByRole('button', { name: 'Buscar', exact: true }).click();
  await expect(page.getByRole('alert')).toBeVisible();
  await assertFitsViewport(page);
  await assertAccessible(page);
  await page.screenshot({ path: info.outputPath('pacientes-erro-390.png'), fullPage: true });
  await expect(page.getByRole('button', { name: /Tentar novamente/i })).toBeVisible();
  expect(writes).toBe(0);
});
