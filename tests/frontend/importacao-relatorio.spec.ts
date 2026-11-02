import { test, expect } from '@playwright/test';
import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { signIn, apiAs } from './fixtures';
import { assertAccessible, assertFitsViewport } from './stage7-helpers';

const workbook = resolve(process.env.FRONTEND_E2E_DIR!, 'relatorio-sintetico.xlsx');
test.beforeAll(() => execFileSync('python3', [resolve(__dirname, 'gerar_planilha_relatorio_sintetica.py'), workbook]));
const expected = { totalLinhas: 6, linhasImportadas: 3, linhasComPendencia: 2, linhasRejeitadas: 1,
  codigosErro: [{ codigo: 'data_invalida', total: 1 }, { codigo: 'pendencia_nao_promovida', total: 2 }] };

test('H14: relatório simulado real apresenta categorias distintas, códigos e nenhum POST efetivo', async ({ page }, info) => {
  test.setTimeout(120_000);
  await signIn(page, 'administracao', '/importacoes/simular');
  await page.getByLabel('Arquivo XLSX sintético', { exact: true }).setInputFiles(workbook);
  await page.getByLabel('Código do lote', { exact: true }).fill('relatorio-ui-dry');
  const response = page.waitForResponse(item => item.request().method() === 'POST' && new URL(item.url()).pathname === '/v1/importacoes');
  await page.getByRole('button', { name: 'Simular planilha', exact: true }).click();
  const submitted = await response;
  expect(submitted.status()).toBe(201);
  const result = await submitted.json();
  expect(result).toMatchObject({ dryRun: true, loteId: null, relatorio: expected });
  const report = page.getByRole('region', { name: 'Relatório da simulação' });
  await expect(report).toBeVisible();
  for (const [label, value] of [['Total de linhas', '6'], ['Importáveis sem pendência', '3'], ['Com pendência', '2'], ['Rejeitadas', '1']]) {
    await expect(report.locator('div').filter({ has: page.getByText(label!, { exact: true }) }).locator('dd')).toHaveText(value!);
  }
  await expect(report.getByRole('list')).toContainText('Data inválida (data_invalida): 1');
  await expect(report.getByRole('list')).toContainText('Pendência não promovida (pendencia_nao_promovida): 2');
  await expect(page.getByText(/pode avançar a numeração interna/)).toBeVisible();
  await expect(page.getByRole('button', { name: /confirmar importação/i })).toHaveCount(0);
  for (const width of [1440, 320]) {
    await page.setViewportSize({ width, height: width === 1440 ? 960 : 844 });
    await assertFitsViewport(page);
    await page.screenshot({ path: info.outputPath(`relatorio-simulacao-${width}.png`), fullPage: true });
  }
  await assertAccessible(page);
});

test('H14: simulação de mesmo conteúdo relata lote efetivo e contagens já existentes', async ({ page }) => {
  test.setTimeout(120_000);
  // Setup autorizado somente no banco descartável do runner, sem confirmação na UI.
  const authentication = await signIn(page, 'administracao', '/importacoes/simular');
  const data = new FormData();
  data.append('arquivo', new Blob([readFileSync(workbook)]), 'relatorio-sintetico.xlsx');
  data.append('finalidade', 'carga_inicial'); data.append('codigoLote', 'relatorio-ui-original'); data.append('dryRun', 'false');
  const effective = await fetch(`${process.env.FRONTEND_API_TARGET}/v1/importacoes`, {
    method: 'POST', headers: { authorization: `Bearer ${authentication.accessToken}` }, body: data,
  });
  expect(effective.status).toBe(201);
  const original = await effective.json();
  expect(original.relatorio).toEqual(expected);
  const read = await apiAs('administracao', 'GET', `/importacoes/lotes/${original.loteId}`);
  expect(read.status).toBe(200);
  await page.getByLabel('Arquivo XLSX sintético', { exact: true }).setInputFiles(workbook);
  await page.getByLabel('Finalidade', { exact: true }).selectOption('mesmo_conteudo');
  await page.getByLabel('Código do lote', { exact: true }).fill('relatorio-ui-outro-codigo');
  const response = page.waitForResponse(item => item.request().method() === 'POST' && new URL(item.url()).pathname === '/v1/importacoes');
  await page.getByRole('button', { name: 'Simular planilha', exact: true }).click();
  expect(await (await response).json()).toMatchObject({ loteId: original.loteId, codigoLote: 'relatorio-ui-original',
    codigoLoteSolicitado: 'relatorio-ui-outro-codigo', relatorio: expected });
  await expect(page.getByText('Os números descrevem o lote existente; não representam novas gravações.')).toBeVisible();
  await expect(page.getByRole('link', { name: `Consultar lote existente ${original.loteId}` })).toHaveAttribute('href', `/importacoes/lotes/${original.loteId}`);
});

test('H14: nascimento inválido anterior ao savepoint mantém rejeição no relatório dry-run', async ({ page }) => {
  test.setTimeout(120_000);
  const invalidBirthWorkbook = resolve(process.env.FRONTEND_E2E_DIR!, 'relatorio-nascimento-invalido.xlsx');
  execFileSync('python3', [resolve(__dirname, 'gerar_planilha_relatorio_sintetica.py'), invalidBirthWorkbook, '--nascimento-invalido']);
  await signIn(page, 'administracao', '/importacoes/simular');
  await page.getByLabel('Arquivo XLSX sintético', { exact: true }).setInputFiles(invalidBirthWorkbook);
  await page.getByLabel('Código do lote', { exact: true }).fill('relatorio-nascimento-invalido');
  const response = page.waitForResponse(item => item.request().method() === 'POST' && new URL(item.url()).pathname === '/v1/importacoes');
  await page.getByRole('button', { name: 'Simular planilha', exact: true }).click();
  const submitted = await response;
  expect(submitted.status()).toBe(201);
  expect(await submitted.json()).toMatchObject({ dryRun: true, loteId: null, relatorio: expected });
  await expect(page.getByRole('region', { name: 'Relatório da simulação' }).getByRole('list')).toContainText('Data inválida (data_invalida): 1');
});
