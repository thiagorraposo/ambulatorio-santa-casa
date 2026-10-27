import { test, expect } from '@playwright/test';
import { createRequire } from 'node:module';
import { resolve } from 'node:path';
import { signIn } from './fixtures';
import { assertAccessible, assertFitsViewport } from './stage7-helpers';

const requireBackend = createRequire(resolve(__dirname, '../../backend/package.json'));
const { Pool } = requireBackend('pg');
const workbook = process.env.FRONTEND_E2E_IMPORT_FILE!;

async function snapshot() {
  const pool = new Pool({ host: process.env.PGHOST, port: Number(process.env.PGPORT),
    user: process.env.PGUSER, password: process.env.PGPASSWORD, database: process.env.FRONTEND_E2E_DB });
  try {
    expect((await pool.query('SELECT current_database() AS name')).rows[0].name).toBe(process.env.FRONTEND_E2E_DB);
    const tables = await pool.query("SELECT tablename FROM pg_tables WHERE schemaname='ambulatorio' ORDER BY tablename");
    const contents: Record<string, unknown> = {};
    for (const { tablename } of tables.rows) {
      if (!/^[a-z_][a-z0-9_]*$/.test(tablename)) throw new Error('Nome de tabela inesperado no ambiente sintético');
      contents[tablename] = (await pool.query(`SELECT count(*)::text AS total,
        md5(COALESCE(jsonb_agg(to_jsonb(t) ORDER BY to_jsonb(t)::text)::text,'[]')) AS digest FROM ambulatorio."${tablename}" t`)).rows[0];
    }
    const sequences = (await pool.query("SELECT sequencename,last_value::text FROM pg_sequences WHERE schemaname='ambulatorio' ORDER BY sequencename")).rows;
    return { contents, sequences };
  } finally { await pool.end(); }
}

test('8C2U.1: seleciona e simula XLSX sintético uma vez sem persistir registros', async ({ page }, info) => {
  test.setTimeout(120_000);
  await signIn(page, 'edicao', '/importacoes');
  await page.getByRole('link', { name: 'Simular planilha', exact: true }).click();
  await page.setViewportSize({ width: 320, height: 844 });
  let posts = 0;
  page.on('request', request => { if (request.method() === 'POST' && new URL(request.url()).pathname === '/v1/importacoes') posts++; });
  await page.getByLabel('Arquivo XLSX sintético', { exact: true }).setInputFiles(workbook);
  await page.getByLabel('Código do lote', { exact: true }).fill('frontend-dry-run');
  await page.getByRole('button', { name: 'Cancelar seleção', exact: true }).click();
  await expect(page.getByLabel('Arquivo XLSX sintético', { exact: true })).toBeFocused();
  expect(posts).toBe(0);
  await page.getByLabel('Arquivo XLSX sintético', { exact: true }).setInputFiles(workbook);
  const before = await snapshot();
  const response = page.waitForResponse(item => item.request().method() === 'POST' && new URL(item.url()).pathname === '/v1/importacoes');
  await page.getByRole('button', { name: 'Simular planilha', exact: true }).evaluate(node => {
    (node as HTMLButtonElement).click(); (node as HTMLButtonElement).click();
  });
  const submitted = await response;
  expect(submitted.status()).toBe(201);
  expect(submitted.request().headers()['content-type']).toMatch(/^multipart\/form-data; boundary=/);
  expect(await submitted.json()).toMatchObject({ dryRun: true, codigoLoteSolicitado: 'frontend-dry-run',
    loteId: null, status: 'dry_run_concluido' });
  await expect(page.getByRole('heading', { name: 'Simulação concluída', exact: true })).toBeVisible();
  expect(posts).toBe(1);
  const after = await snapshot();
  expect(after.contents).toEqual(before.contents);
  // C2B.1 defines a future no-sequence-consumption guarantee; record the current H14 limit.
  info.annotations.push({ type: 'Sequências H14', description: JSON.stringify({ before: before.sequences, after: after.sequences }) });
  await assertAccessible(page);
  await assertFitsViewport(page);
  await page.getByLabel('Código do lote', { exact: true }).fill('outra-escolha');
  await expect(page.getByRole('heading', { name: 'Simulação concluída', exact: true })).toHaveCount(0);
  expect(posts).toBe(1);
});

test('8C2U.1: consulta não tem formulário de simulação', async ({ page }) => {
  await signIn(page, 'consulta', '/importacoes');
  await expect(page.getByRole('link', { name: 'Simular planilha', exact: true })).toHaveCount(0);
  await signIn(page, 'consulta', '/importacoes/simular');
  await expect(page.getByRole('heading', { name: 'Acesso não autorizado', exact: true })).toBeVisible();
  await expect(page.getByLabel('Arquivo XLSX sintético', { exact: true })).toHaveCount(0);
});

test('8C2U.1: resposta perdida de simulação não gera reenvio automático ou falso sucesso', async ({ page }) => {
  test.setTimeout(120_000);
  await signIn(page, 'administracao', '/importacoes/simular');
  await page.getByLabel('Arquivo XLSX sintético', { exact: true }).setInputFiles(workbook);
  await page.getByLabel('Código do lote', { exact: true }).fill('frontend-resposta-perdida');
  const before = await snapshot();
  let posts = 0;
  // Fail only the real response: replaying via route.fetch omits Chromium's file bytes.
  const protocol = await page.context().newCDPSession(page);
  await protocol.send('Fetch.enable', { patterns: [{ urlPattern: '*/v1/importacoes', requestStage: 'Response' }] });
  const intercepted = new Promise<number>(resolve => protocol.on('Fetch.requestPaused', async event => {
    posts++;
    await protocol.send('Fetch.failRequest', { requestId: event.requestId, errorReason: 'ConnectionReset' });
    resolve(event.responseStatusCode ?? 0);
  }));
  await page.getByRole('button', { name: 'Simular planilha', exact: true }).click();
  expect(await intercepted).toBe(201);
  await expect(page.getByRole('alert')).toContainText('Não foi possível conectar');
  await expect(page.getByRole('heading', { name: 'Simulação concluída', exact: true })).toHaveCount(0);
  await page.getByRole('button', { name: 'Cancelar seleção', exact: true }).click();
  expect(posts).toBe(1);
  expect((await snapshot()).contents).toEqual(before.contents);
  await protocol.detach();
});
