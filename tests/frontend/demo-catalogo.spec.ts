import { expect, test } from '@playwright/test';
import { apiJson, seedPatient, seedAttendance, signIn } from './stage7-helpers';
test('fixture de demonstração disponibiliza catálogo canônico sem depender de outro teste', async ({ page }) => {
  const catalog = await apiJson<Array<{ id: string; nome: string }>>('GET', '/catalogos/comorbidades?limit=100');
  expect(catalog.map(r => r.nome)).toEqual(expect.arrayContaining(['hipertensao_arterial', 'diabetes']));
  const p = await seedPatient('Catálogo demo sintético'); const a = await seedAttendance(p.path);
  const path = `${a.path}/comorbidades`;
  await signIn(page, 'edicao', `${path}/nova`);
  await page.getByLabel('Avaliar hipertensao_arterial', { exact: true }).check();
  await page.getByLabel('Presença de hipertensao_arterial', { exact: true }).selectOption('nao');
  await page.getByRole('button', { name: 'Revisar comorbidades', exact: true }).click();
  const saved = page.waitForResponse(r => r.request().method() === 'POST' && new URL(r.url()).pathname === `/v1${path}`);
  await page.getByRole('button', { name: 'Confirmar comorbidades', exact: true }).click();
  expect((await saved).status()).toBe(201);
  const result = await apiJson<{ itens: Array<{ nomeComorbidade: string; possuiComorbidade: boolean }> }>('GET', path);
  expect(result.itens).toHaveLength(1);
  expect(result.itens[0]).toMatchObject({ nomeComorbidade: 'hipertensao_arterial', possuiComorbidade: false });
});
