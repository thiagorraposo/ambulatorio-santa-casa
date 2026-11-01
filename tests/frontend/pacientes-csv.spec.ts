import { readFile } from 'node:fs/promises';
import { expect, test, type Page } from '@playwright/test';
import { assertNoPersistentClinicalState, fixture } from './fixtures';
import { apiJson, assertAccessible, assertFitsViewport, seedPatient, signIn } from './stage7-helpers';

const exportLabel = 'Exportar CSV desta página';
const confirmLabel = 'Confirmar exportação CSV';
const readyMessage = 'Arquivo CSV preparado para download.';

async function downloadCsv(page: Page) {
  const event = page.waitForEvent('download');
  const response = page.waitForResponse(item => new URL(item.url()).pathname === '/v1/pacientes/export.csv');
  await page.getByRole('button', { name: confirmLabel, exact: true }).click();
  const result = await response;
  expect(result.status()).toBe(200);
  expect(result.headers()['content-type']).toContain('text/csv');
  const download = await event;
  expect(download.suggestedFilename()).toBe('pacientes-pagina.csv');
  expect(await download.failure()).toBeNull();
  const path = await download.path();
  expect(path).not.toBeNull();
  const bytes = await readFile(path!);
  expect([...bytes.subarray(0, 3)]).toEqual([0xef, 0xbb, 0xbf]);
  const text = bytes.subarray(3).toString('utf8');
  expect(text).toBe(await result.text());
  await expect(page.getByRole('status').filter({ hasText: readyMessage })).toBeVisible();
  return { text, result };
}

for (const perfil of ['consulta', 'edicao', 'administracao'] as const) {
  test(`8A1: ${perfil} baixa CSV UTF-8 da página/filtros aplicados e respeita o escopo`, async ({ page }, info) => {
    const marker = `CSV8A1 ${perfil}`;
    const first = await seedPatient(`Exportação ${perfil} A`, { nome: `Árvore ${marker}, "nome sintético"`, sexo: 'feminino' });
    const formula = await seedPatient(`Exportação ${perfil} B`, { nome: `=1+1, "${marker}"`, sexo: 'feminino' });
    const excludedSex = await seedPatient(`Exportação ${perfil} sexo`, { nome: `${marker} sexo excluído`, sexo: 'masculino' });
    const restricted = await apiJson<{ pacienteId: string }>('POST', '/pacientes', { nome: `${marker} sem vínculo`, sexo: 'feminino' });
    const query = new URLSearchParams({ nome: marker, sexo: 'feminino', limit: '2', offset: '0' });
    await signIn(page, perfil, `/pacientes?${query}`);
    await expect(page.getByRole('link', { name: `Ver ficha de Árvore ${marker}, "nome sintético"`, exact: true })).toBeVisible();
    const requests: string[] = [];
    page.on('request', request => {
      if (new URL(request.url()).pathname === '/v1/pacientes/export.csv') requests.push(request.url());
    });
    // A filter edit is only a draft until Buscar applies it to the URL.
    await page.getByLabel('Nome', { exact: true }).fill('Filtro não aplicado, sintético');
    const start = page.getByRole('button', { name: exportLabel, exact: true });
    await start.click();
    await expect(page.getByRole('heading', { name: 'Confirmar exportação da página', exact: true })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Cancelar exportação', exact: true })).toBeFocused();
    const scope = page.getByRole('region', { name: 'Exportação da página de pacientes', exact: true });
    await expect(scope.getByText(marker, { exact: true })).toBeVisible();
    await expect(scope.getByText('Filtro não aplicado, sintético', { exact: true })).toHaveCount(0);
    expect(requests).toHaveLength(0);
    await page.keyboard.press('Escape');
    await expect(start).toBeFocused();
    await expect(page.getByRole('button', { name: confirmLabel, exact: true })).toHaveCount(0);
    expect(requests).toHaveLength(0);
    await start.click();
    await page.getByRole('button', { name: 'Cancelar exportação', exact: true }).click();
    await expect(start).toBeFocused();
    expect(requests).toHaveLength(0);
    await start.click();
    await page.setViewportSize({ width: 320, height: 844 });
    await assertFitsViewport(page);
    await assertAccessible(page);
    const exported = await downloadCsv(page);
    expect(exported.text).toBe(`paciente_id,nome\n"${first.pacienteId}","Árvore ${marker}, ""nome sintético"""\n"${formula.pacienteId}","'=1+1, ""${marker}"""\n`);
    expect(exported.text).not.toContain(excludedSex.pacienteId);
    expect(exported.text).not.toContain(restricted.pacienteId);
    expect(requests).toHaveLength(1);
    const applied = new URL(requests[0]!);
    expect(Object.fromEntries(applied.searchParams)).toEqual(Object.fromEntries(query));
    await expect(start).toBeFocused();
    const pagination = page.getByRole('navigation', { name: 'Paginação de pacientes', exact: true });
    await pagination.getByRole('button', { name: 'Próxima', exact: true }).click();
    await expect(page.getByRole('status').filter({ hasText: readyMessage })).toHaveCount(0);
    await expect(start).toBeEnabled();
    await start.click();
    const next = await downloadCsv(page);
    expect(new URL(next.result.url()).searchParams.get('offset')).toBe('2');
    expect(next.text).toBe(perfil === 'administracao'
      ? `paciente_id,nome\n"${restricted.pacienteId}","${marker} sem vínculo"\n`
      : 'paciente_id,nome\n');
    expect(requests).toHaveLength(2);
    await page.setViewportSize({ width: 390, height: 844 });
    await assertFitsViewport(page);
    await assertAccessible(page);
    await assertNoPersistentClinicalState(page);
    info.annotations.push({ type: 'Escopo CSV sintético', description: JSON.stringify({ perfil,
      pacienteIds: [first.pacienteId, formula.pacienteId], semVinculo: restricted.pacienteId, filtro: marker, limit: 2, offsets: [0, 2] }) });
  });
}

test('8A1: falha de rede e resposta 403 entregue não geram arquivo nem sucesso fictício', async ({ page }) => {
  const patient = await seedPatient('CSV falhas', { sexo: 'feminino' });
  await signIn(page, 'consulta', `/pacientes?nome=${encodeURIComponent('CSV falhas')}`);
  await expect(page.getByRole('link', { name: /Ver ficha de Etapa 7 CSV falhas Sintético/ })).toBeVisible();
  const downloads: string[] = [];
  page.on('download', download => downloads.push(download.suggestedFilename()));
  let mode: 'network' | 'denied' = 'network';
  await page.route('**/v1/pacientes/export.csv?**', async route => {
    if (mode === 'network') { await route.abort('connectionreset'); return; }
    // Deliver an actual API refusal to the export request. H16 itself filters
    // by scope and returns an empty CSV; this injects a transport-layer 403.
    const denied = await route.fetch({ url: `${process.env.FRONTEND_API_TARGET}/v1/pacientes/${fixture.reserved.pacienteId}` });
    expect(denied.status()).toBe(403);
    await route.fulfill({ response: denied });
  });
  for (const failure of ['network', 'denied'] as const) {
    mode = failure;
    await page.getByRole('button', { name: exportLabel, exact: true }).click();
    await page.getByRole('button', { name: confirmLabel, exact: true }).click();
    await expect(page.getByRole('alert')).toBeVisible();
    await expect(page.getByRole('status').filter({ hasText: readyMessage })).toHaveCount(0);
    expect(downloads).toEqual([]);
    await page.getByRole('button', { name: 'Cancelar exportação', exact: true }).click();
    await expect(page.getByRole('button', { name: exportLabel, exact: true })).toBeFocused();
  }
  expect((await apiJson<Array<{ pacienteId: string }>>('GET', `/pacientes?nome=${encodeURIComponent('CSV falhas')}`, undefined, 'consulta'))
    .some(row => row.pacienteId === patient.pacienteId)).toBe(true);
  await assertNoPersistentClinicalState(page);
});
