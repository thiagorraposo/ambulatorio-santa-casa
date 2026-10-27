import { test, expect, type Page } from '@playwright/test';
import { assertAccessible, assertFitsViewport, nextAttendanceStep, seedPatient, signIn, visitByLink } from './stage7-helpers';

async function removePair(page: Page, addName: string, removePrefix: string, firstLabel: string, secondLabel: string) {
  const add = page.getByRole('button', { name: addName, exact: true });
  await add.click();
  await page.getByLabel(firstLabel, { exact: true }).fill('Primeiro exclusivamente sintético');
  await add.click();
  await page.getByLabel(secondLabel, { exact: true }).fill('Segundo exclusivamente sintético');
  const remove = () => page.getByRole('button', { name: `${removePrefix} 1`, exact: true });
  await remove().focus();
  await page.keyboard.press('Enter');
  await expect(page.getByLabel(firstLabel, { exact: true })).toHaveValue('Segundo exclusivamente sintético');
  await expect(add).toBeFocused();
  // Enter again adds an item; it cannot accidentally remove the next clinical draft.
  await page.keyboard.press('Enter');
  await expect(page.getByLabel(secondLabel, { exact: true })).toHaveValue('');
  await page.getByRole('button', { name: `${removePrefix} 2`, exact: true }).focus();
  await page.keyboard.press('Enter');
  await expect(add).toBeFocused();
  await remove().focus();
  await page.keyboard.press('Enter');
  await expect(page.getByLabel(firstLabel, { exact: true })).toHaveCount(0);
  await expect(add).toBeFocused();
}

test('7D-U4.2: remoção de itens devolve foco à coleção sem apagar o próximo rascunho', async ({ page }) => {
  test.setTimeout(180_000);
  const patient = await seedPatient('Remoção por teclado');
  await signIn(page, 'edicao', `${patient.path}/editar`);
  await page.setViewportSize({ width: 320, height: 844 });
  let writes = 0;
  page.on('request', request => {
    if (['POST', 'PATCH', 'PUT', 'DELETE'].includes(request.method()) && new URL(request.url()).pathname.startsWith(`/v1${patient.path}`)) writes++;
  });
  const addPhone = page.getByRole('button', { name: 'Adicionar telefone', exact: true });
  for (let index = 0; index < 10; index++) await addPhone.click();
  await page.getByLabel('Novo telefone', { exact: true }).fill('000000001');
  await expect(addPhone).toBeDisabled();
  for (let index = 10; index > 1; index--) {
    await page.getByRole('button', { name: `Remover novo telefone ${index}`, exact: true }).focus();
    await page.keyboard.press('Enter');
    await expect(addPhone).toBeEnabled();
    await expect(addPhone).toBeFocused();
  }
  await expect(page.getByLabel('Novo telefone', { exact: true })).toHaveValue('000000001');
  await page.getByRole('button', { name: 'Remover novo telefone 1', exact: true }).focus();
  await page.keyboard.press('Enter');
  await expect(addPhone).toBeFocused();
  await assertFitsViewport(page);

  await visitByLink(page, patient.path);
  await visitByLink(page, `${patient.path}/atendimentos/novo`);
  await page.getByLabel('Data do atendimento', { exact: true }).fill('2026-04-14');
  await nextAttendanceStep(page);
  await nextAttendanceStep(page);
  await removePair(page, 'Adicionar exame', 'Remover exame', 'Identificação do exame 1', 'Identificação do exame 2');
  await removePair(page, 'Adicionar familiar examinado', 'Remover familiar', 'Identificação do familiar 1', 'Identificação do familiar 2');
  await assertFitsViewport(page);
  await assertAccessible(page);
  await nextAttendanceStep(page);
  await removePair(page, 'Adicionar pendência', 'Remover pendência', 'Descrição da pendência 1', 'Descrição da pendência 2');
  for (let step = 0; step < 3; step++) await page.getByRole('button', { name: 'Etapa anterior', exact: true }).click();
  await page.getByLabel('Data do atendimento', { exact: true }).fill('');
  await visitByLink(page, patient.path);
  await visitByLink(page, `${patient.path}?aba=bzn`);
  await visitByLink(page, `${patient.path}/registrar?tipo=bzn`);
  await removePair(page, 'Adicionar reação', 'Remover reação', 'Descrição da reação 1', 'Descrição da reação 2');
  await assertFitsViewport(page);
  await assertAccessible(page);
  expect(writes).toBe(0);
});
