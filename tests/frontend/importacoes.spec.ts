import { expect, test } from '@playwright/test';
import { fixture } from './fixtures';
import { signIn } from './stage7-helpers';

const secret = 'SEGREDO_CLINICO_SINTETICO';

test('importações: administração consulta lote sanitizado', async ({ page }) => {
  await signIn(page, 'administracao', '/importacoes');
  await expect(page.getByRole('heading', { name: 'Importações' })).toBeVisible();
  await expect(page.getByText(/frontend-lote-sanitizado-/)).toBeVisible();
  await page.getByRole('row').filter({ hasText: /frontend-lote-sanitizado-/ }).getByRole('link', { name: 'Consultar' }).click();
  await expect(page.getByRole('heading', { name: 'Detalhe da importação' })).toBeVisible();
  await expect(page.getByRole('columnheader', { name: 'Código do erro' })).toBeVisible();
  await expect(page.getByText(secret, { exact: false })).toHaveCount(0);
});

for (const profile of ['consulta', 'edicao'] as const) {
  test(`importações: ${profile} pagina apenas lote integralmente vinculado`, async ({ page }) => {
    await signIn(page, profile, '/importacoes');
    await expect(page.getByText(/frontend-lote-sanitizado-/)).toBeVisible();
    await expect(page.getByText(/frontend-lote-sem-vinculo-/)).toHaveCount(0);
    await page.getByRole('link', { name: 'Consultar' }).click();
    await expect(page.getByRole('heading', { name: 'Detalhe da importação' })).toBeVisible();
    await expect(page.getByRole('cell', { name: 'SEGREDO_CLINICO_SINTETICO' })).toHaveCount(0);
    const pagination = page.getByRole('navigation', { name: 'Paginação de linhas' });
    await pagination.getByRole('button', { name: 'Próxima' }).click();
    await expect(page.getByRole('cell', { name: '21' })).toBeVisible();
    await expect(page.getByText('1 item nesta página')).toBeVisible();
    const erroFilter = page.getByRole('checkbox', { name: 'Somente linhas com erro' });
    if (!(await erroFilter.isChecked())) await erroFilter.click();
    await expect(erroFilter).toBeChecked();
    await expect(page).toHaveURL(/apenasComErro=true/);
    await expect(page.getByRole('cell', { name: '21' })).toHaveCount(0);
    await expect(page.getByText(secret, { exact: false })).toHaveCount(0);
    await page.evaluate(path => {
      window.history.pushState({}, '', path);
      window.dispatchEvent(new PopStateEvent('popstate'));
    }, `/importacoes/lotes/${fixture.importacoes.loteSemVinculoId}`);
    await expect(page.getByRole('heading', { name: 'Acesso não autorizado' })).toBeVisible();
    await expect(page.getByText(/frontend-lote-sanitizado-/)).toHaveCount(0);
  });
}
