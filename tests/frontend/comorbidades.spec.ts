import { createRequire } from 'node:module';
import { resolve } from 'node:path';
import { expect, test } from '@playwright/test';
import { apiAs } from './fixtures';
import { apiJson, assertAccessible, assertFitsViewport, loseResponseAfterCommit, seedAttendance,
  seedPatient, signIn } from './stage7-helpers';

test.describe.configure({ timeout: 180_000 });
interface Catalog { id: string; nome: string }
interface Evaluation { avaliacaoComorbidadesId: string; itens: Array<{ comorbidadeId: string; possuiComorbidade: boolean | null; observacoes: string | null }>; historicoFamiliar: { possuiDoenca: boolean | null; descricao: string | null } | null }
const catalog = () => apiJson<Catalog[]>('GET', '/catalogos/comorbidades?limit=100');

test.beforeAll(async () => {
  if (!/^etapa6_frontend_\d+_\d+_[a-f0-9]{6}$/.test(process.env.FRONTEND_E2E_DB ?? '')) throw new Error('Banco descartável obrigatório');
  const requireBackend = createRequire(resolve(__dirname, '../../backend/package.json'));
  const { Pool } = requireBackend('pg');
  const owner = new Pool({ host: process.env.PGHOST, port: Number(process.env.PGPORT), user: process.env.PGUSER,
    password: process.env.PGPASSWORD, database: process.env.FRONTEND_E2E_DB });
  try {
    await owner.query(`INSERT INTO ambulatorio.comorbidade(nome_comorbidade)
      SELECT 'E3U Catálogo sintético '||lpad(g::text,2,'0') FROM generate_series(1,25) g ON CONFLICT DO NOTHING`);
  } finally { await owner.end(); }
});

test('7B-E3U: seleciona e revisa triestado, mantém rascunho e origem sem copiar entre consultas', async ({ page }, info) => {
  const patient = await seedPatient('Comorbidades pela interface'); const attendance = await seedAttendance(patient.path);
  const next = await seedAttendance(patient.path); const [first, second] = await catalog();
  expect(first).toBeTruthy(); expect(second).toBeTruthy();
  const path = `${attendance.path}/comorbidades`; const origin = `${attendance.path}?limit=10&offset=0`;
  const writes: Array<{ operation: string | undefined; body: unknown }> = [];
  page.on('request', r => { if (r.method() === 'POST' && new URL(r.url()).pathname === `/v1${path}`) writes.push({ operation: r.headers()['x-operacao-id'], body: r.postDataJSON() }); });
  await signIn(page, 'edicao', origin);
  await page.getByRole('link', { name: 'Comorbidades deste atendimento', exact: true }).click();
  await expect(page.getByRole('link', { name: 'Voltar ao atendimento de origem' })).toHaveAttribute('href', origin);
  await page.getByRole('link', { name: 'Registrar comorbidades', exact: true }).click();
  await page.setViewportSize({ width: 320, height: 844 });
  await page.getByRole('button', { name: 'Revisar comorbidades', exact: true }).click();
  await expect(page.getByRole('alert')).toContainText('Selecione uma comorbidade');
  await page.getByLabel(`Avaliar ${first!.nome}`, { exact: true }).check();
  await page.getByLabel(`Presença de ${first!.nome}`, { exact: true }).selectOption('nao');
  await page.getByLabel(`Observações de ${first!.nome}`, { exact: true }).fill('  Observação literal sintética\nNegativa preservada  ');
  await page.getByLabel(`Avaliar ${second!.nome}`, { exact: true }).check();
  await page.getByLabel('Histórico de doença familiar', { exact: true }).selectOption('desconhecido');
  await page.getByLabel('Relato familiar', { exact: true }).fill('Relato independente de exames');
  await assertFitsViewport(page); await assertAccessible(page);
  await page.getByRole('button', { name: 'Descartar rascunho', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Continuar editando', exact: true })).toBeFocused();
  await page.keyboard.press('Escape');
  await expect(page.getByRole('button', { name: 'Descartar rascunho', exact: true })).toBeFocused();
  await page.getByRole('link', { name: /Voltar às comorbidades$/ }).click();
  await page.getByRole('dialog', { name: 'Alterações não salvas', exact: true }).getByRole('button', { name: 'Sair e manter rascunho', exact: true }).click();
  await page.getByRole('link', { name: 'Registrar comorbidades', exact: true }).click();
  await expect(page.getByLabel(`Presença de ${first!.nome}`, { exact: true })).toHaveValue('nao');
  await page.getByRole('button', { name: 'Revisar comorbidades', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Revisão das comorbidades', exact: true })).toBeFocused();
  const review = page.getByRole('region', { name: 'Resumo das comorbidades', exact: true });
  await expect(review.getByRole('heading', { level: 4 })).toHaveCount(2);
  await expect(review.getByText('Desconhecido (registrado)', { exact: true })).toHaveCount(2);
  await page.getByRole('button', { name: 'Voltar aos campos', exact: true }).click();
  await page.getByLabel('Relato familiar', { exact: true }).fill('Relato corrigido na revisão');
  await page.getByRole('button', { name: 'Revisar comorbidades', exact: true }).click();
  await page.setViewportSize({ width: 390, height: 844 }); await assertFitsViewport(page); await assertAccessible(page);
  await page.screenshot({ path: info.outputPath('comorbidades-revisao-390.png'), fullPage: true });
  const saved = page.waitForResponse(r => r.request().method() === 'POST' && new URL(r.url()).pathname === `/v1${path}`);
  await page.getByRole('button', { name: 'Confirmar comorbidades', exact: true }).evaluate(node => { (node as HTMLButtonElement).click(); (node as HTMLButtonElement).click(); });
  const response = await saved; expect(response.status()).toBe(201);
  const id = (await response.json()).avaliacaoComorbidadesId;
  await expect(page.getByRole('heading', { name: `Avaliação confirmada ${id}`, exact: true })).toBeVisible();
  expect(writes).toHaveLength(1); expect(writes[0]!.operation).toMatch(/^[a-f0-9-]{36}$/);
  const read = await apiJson<Evaluation>('GET', path);
  expect(read.itens.map(row => [row.comorbidadeId, row.possuiComorbidade])).toEqual([[first!.id, false], [second!.id, null]].sort((a,b) => BigInt(a[0] as string) < BigInt(b[0] as string) ? -1 : 1));
  expect(read.itens.find(row => row.comorbidadeId === first!.id)?.observacoes).toBe('  Observação literal sintética\nNegativa preservada  ');
  expect(read.historicoFamiliar).toEqual({ possuiDoenca: null, descricao: 'Relato corrigido na revisão' });
  expect(await apiJson('GET', `${next.path}/comorbidades`)).toBeNull();
  await page.getByRole('link', { name: 'Conferir avaliação deste atendimento', exact: true }).click();
  await expect(page.getByRole('heading', { name: `Avaliação ${id}`, exact: true })).toBeVisible();
  await expect(page.getByRole('link', { name: 'Registrar comorbidades', exact: true })).toHaveCount(0);
  await page.setViewportSize({ width: 1280, height: 900 }); await page.evaluate(() => { document.documentElement.style.zoom = '2'; });
  await assertFitsViewport(page); await assertAccessible(page);
  info.annotations.push({ type: 'Avaliação sintética', description: JSON.stringify({ pacienteId: patient.pacienteId, atendimentoId: attendance.atendimentoId, avaliacaoComorbidadesId: id, operacaoId: writes[0]!.operation }) });
});

test('7B-E3U: leitura de consulta e falha não expõem conteúdo antigo ou habilitam escrita', async ({ page }) => {
  const patient = await seedPatient('Comorbidades consulta'); const attendance = await seedAttendance(patient.path);
  const path = `${attendance.path}/comorbidades`; const [first] = await catalog();
  const saved = await apiJson<{ avaliacaoComorbidadesId: string }>('POST', path, { itens: [{ comorbidadeId: first!.id, possuiComorbidade: false, observacoes: 'Relato sintético sensível de teste' }] });
  await signIn(page, 'consulta', path);
  await expect(page.getByRole('heading', { name: `Avaliação ${saved.avaliacaoComorbidadesId}`, exact: true })).toBeVisible();
  await expect(page.getByRole('link', { name: 'Registrar comorbidades', exact: true })).toHaveCount(0);
  expect((await apiAs('consulta', 'POST', path, { historicoFamiliar: { possuiDoenca: false } })).status).toBe(403);
  await page.route(`**/v1${path}`, route => route.fulfill({ status: 503, contentType: 'application/json', body: JSON.stringify({ message: 'Indisponível sintético' }) }));
  await page.getByRole('link', { name: /Voltar ao atendimento de origem$/ }).click();
  await page.getByRole('link', { name: 'Comorbidades deste atendimento', exact: true }).click();
  await expect(page.getByRole('alert')).toBeVisible();
  await expect(page.getByText('Relato sintético sensível de teste', { exact: true })).toHaveCount(0);
  await page.unroute(`**/v1${path}`);
  await page.getByRole('button', { name: 'Tentar novamente', exact: true }).click();
  await expect(page.getByText('Relato sintético sensível de teste', { exact: true })).toBeVisible();
  await signIn(page, 'consulta', `${path}/nova`);
  await expect(page.getByRole('heading', { name: 'Acesso de consulta', exact: true })).toBeVisible();
});

test('7B-E3U: confirma somente histórico familiar e recupera COMMIT sem repetir envio', async ({ page }) => {
  const patient = await seedPatient('Comorbidades recuperação'); const attendance = await seedAttendance(patient.path);
  const path = `${attendance.path}/comorbidades`;
  await signIn(page, 'edicao', `${path}/nova`);
  await page.getByLabel('Histórico de doença familiar', { exact: true }).selectOption('nao');
  await page.getByLabel('Relato familiar', { exact: true }).fill('Texto preservado com negativa');
  await page.getByRole('button', { name: 'Revisar comorbidades', exact: true }).click();
  const lost = await loseResponseAfterCommit(page, 'POST', path);
  await page.getByRole('button', { name: 'Confirmar comorbidades', exact: true }).click();
  const committed = await lost.committed; expect(committed.status()).toBe(201);
  const id = (await committed.json()).avaliacaoComorbidadesId;
  await expect(page.getByRole('alert')).toContainText(/não foi possível confirmar/i);
  await expect(page.getByRole('button', { name: 'Confirmar comorbidades', exact: true })).toBeDisabled();
  await page.getByRole('button', { name: 'Verificar resultado do envio', exact: true }).click();
  await expect(page.getByRole('heading', { name: `Avaliação confirmada ${id}`, exact: true })).toBeVisible();
  expect(lost.writes()).toBe(1);
  expect(await apiJson<Evaluation>('GET', path)).toMatchObject({ itens: [], historicoFamiliar: { possuiDoenca: false, descricao: 'Texto preservado com negativa' } });
});

test('7B-E3U: catálogo paginado preserva seleções de páginas distintas e não registra itens ausentes', async ({ page }) => {
  const patient = await seedPatient('Comorbidades páginas'); const attendance = await seedAttendance(patient.path);
  const path = `${attendance.path}/comorbidades`;
  const firstPage = await apiJson<Catalog[]>('GET', '/catalogos/comorbidades?limit=20&offset=0');
  const secondPage = await apiJson<Catalog[]>('GET', '/catalogos/comorbidades?limit=20&offset=20');
  expect(firstPage).toHaveLength(20); expect(secondPage.length).toBeGreaterThan(0);
  await signIn(page, 'edicao', `${path}/nova`);
  await page.getByLabel(`Avaliar ${firstPage[0]!.nome}`, { exact: true }).check();
  await page.getByLabel(`Presença de ${firstPage[0]!.nome}`, { exact: true }).selectOption('sim');
  await page.getByRole('button', { name: 'Próxima página do catálogo', exact: true }).click();
  await page.getByLabel(`Avaliar ${secondPage[0]!.nome}`, { exact: true }).check();
  await page.getByRole('button', { name: 'Página anterior do catálogo', exact: true }).click();
  await expect(page.getByLabel(`Avaliar ${firstPage[0]!.nome}`, { exact: true })).toBeChecked();
  await expect(page.getByLabel(`Presença de ${firstPage[0]!.nome}`, { exact: true })).toHaveValue('sim');
  await page.getByRole('button', { name: 'Revisar comorbidades', exact: true }).click();
  const summary = page.getByRole('region', { name: 'Resumo das comorbidades', exact: true });
  await expect(summary.getByRole('heading', { level: 4 })).toHaveCount(2);
  await expect(summary.getByRole('heading', { name: secondPage[0]!.nome, exact: true })).toBeVisible();
  const saved = page.waitForResponse(r => r.request().method() === 'POST' && new URL(r.url()).pathname === `/v1${path}`);
  await page.getByRole('button', { name: 'Confirmar comorbidades', exact: true }).click();
  expect((await saved).status()).toBe(201);
  const read = await apiJson<Evaluation>('GET', path);
  expect(read.itens).toHaveLength(2); expect(read.historicoFamiliar).toBeNull();
  expect(read.itens.find(row => row.comorbidadeId === firstPage[0]!.id)?.possuiComorbidade).toBe(true);
  expect(read.itens.find(row => row.comorbidadeId === secondPage[0]!.id)?.possuiComorbidade).toBeNull();
});
