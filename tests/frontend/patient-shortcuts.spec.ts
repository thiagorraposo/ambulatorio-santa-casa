import { test, expect } from '@playwright/test';
import { assertNoPersistentClinicalState, fixture, signIn } from './fixtures';

test('8B3U.4: atalhos abrem pessoa identificada e preservam busca, teclado e 320px', async ({ page }, testInfo) => {
  const patient = fixture.main;
  const source = `/pacientes?${new URLSearchParams({ nome: patient.nome, limit: '1', offset: '0' })}`;
  const details: string[] = [];
  const writes: string[] = [];
  page.on('request', request => {
    const path = new URL(request.url()).pathname;
    if (/^\/v1\/pacientes\/\d+$/.test(path) && request.method() === 'GET') details.push(path);
    if (path.startsWith('/v1/pacientes') && ['POST', 'PATCH', 'PUT', 'DELETE'].includes(request.method())) writes.push(path);
  });
  await signIn(page, 'edicao', source);
  const edit = page.getByRole('link', { name: `Editar ${patient.nome}, ID ${patient.pacienteId}`, exact: true });
  const create = page.getByRole('link', { name: `Novo atendimento para ${patient.nome}, ID ${patient.pacienteId}`, exact: true });
  await expect(edit).toBeVisible();
  expect(details).toEqual([]);
  await page.setViewportSize({ width: 320, height: 844 });
  await edit.focus();
  await expect(edit).toBeFocused();
  await page.keyboard.press('Enter');
  await expect(page.getByRole('heading', { name: 'Editar paciente', exact: true })).toBeVisible();
  await expect(page.getByLabel('Nome completo')).toHaveValue(patient.nome);
  await expect(page.getByText(`Paciente: ${patient.nome} · ID ${patient.pacienteId}`, { exact: true })).toBeVisible();
  await page.getByRole('link', { name: 'Voltar aos resultados da busca' }).click();
  await expect(page).toHaveURL(source);
  await expect(page.getByRole('searchbox', { name: 'Nome' })).toHaveValue(patient.nome);
  await create.focus();
  await expect(create).toBeFocused();
  await page.screenshot({ path: testInfo.outputPath('atalhos-busca-320.png'), fullPage: true });
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1)).toBe(true);
  await page.keyboard.press('Enter');
  await expect(page.getByRole('heading', { name: 'Novo atendimento', exact: true })).toBeVisible();
  await expect(page.getByText(`Paciente: ${patient.nome} · ID ${patient.pacienteId}`, { exact: true })).toBeVisible();
  await page.getByRole('link', { name: 'Voltar aos resultados da busca' }).click();
  await expect(page).toHaveURL(source);
  expect(writes).toEqual([]);
  await assertNoPersistentClinicalState(page);
});

test('8B3U.4: consulta só recebe o atalho de ficha', async ({ page }) => {
  await signIn(page, 'consulta', `/pacientes?${new URLSearchParams({ nome: fixture.main.nome })}`);
  await expect(page.getByRole('link', { name: `Ver ficha de ${fixture.main.nome}`, exact: true })).toBeVisible();
  await expect(page.getByRole('link', { name: /^Editar |^Novo atendimento para / })).toHaveCount(0);
});
