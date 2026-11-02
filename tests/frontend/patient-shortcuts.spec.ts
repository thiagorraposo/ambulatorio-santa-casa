import { test, expect } from '@playwright/test';
import { apiAs, assertNoPersistentClinicalState, fixture, signIn, signInCurrentPage } from './fixtures';
import { assertAccessible, assertFitsViewport } from './stage7-helpers';

for (const perfil of ['consulta', 'edicao', 'administracao'] as const) {
  test(`FM-NAV-12: busca, ficha, abas e recarga preservam retorno — ${perfil}`, async ({ page }, info) => {
    const name = `Retorno busca ${perfil} ${Date.now()} Sintético`;
    for (let index = 0; index < 2; index++) {
      const response = await apiAs('administracao', 'POST', '/pacientes', { nome: `${name} ${index}`, sexo: 'feminino' });
      expect(response.status).toBe(201);
      const { pacienteId } = await response.json();
      expect((await apiAs('administracao', 'POST', `/pacientes/${pacienteId}/atendimentos`,
        { dataAtendimento: '2026-11-01', observacoes: 'Retorno de navegação exclusivamente sintético' })).status).toBe(201);
      if (perfil !== 'administracao') {
        expect((await apiAs('administracao', 'PUT', `/pacientes/${pacienteId}/acesso/${fixture.users[perfil].usuarioId}`,
          { ativo: true, podeEditar: perfil === 'edicao' })).status).toBe(200);
      }
    }
    const source = `/pacientes?${new URLSearchParams({ nome: name, sexo: 'feminino', limit: '1', offset: '1' })}`;
    await signIn(page, perfil, source);
    const record = page.getByRole('link', { name: /^Ver ficha de / }).first();
    await expect(record).toBeVisible();
    const target = new URL((await record.getAttribute('href'))!, 'http://app.local');
    expect(target.searchParams.get('retorno')).toBe(source);
    await record.focus(); await page.keyboard.press('Enter');
    await expect(page.getByRole('heading', { name: 'Ficha do paciente', exact: true })).toBeVisible();
    const origin = new URL(page.url()).pathname + new URL(page.url()).search;
    for (const via of ['último', 'histórico'] as const) {
      if (via === 'histórico') {
        await page.getByRole('navigation', { name: 'Seções da ficha' }).getByRole('link', { name: 'Atendimentos', exact: true }).click();
      }
      const from = new URL(page.url()).pathname + new URL(page.url()).search;
      const open = via === 'último' ? page.getByRole('link', { name: /^Abrir último atendimento / })
        : page.getByRole('table').getByRole('link', { name: /^Atendimento / }).first();
      await open.focus(); await page.keyboard.press('Enter');
      const back = page.getByRole('link', { name: 'Voltar à ficha de origem', exact: true });
      await expect(back).toHaveAttribute('href', from);
      const list = page.getByRole('navigation', { name: 'Caminho da página' }).getByRole('link', { name: 'Pacientes', exact: true });
      await expect(list).toHaveAttribute('href', source);
      if (via === 'último') {
        const detail = page.url();
        await list.focus(); await page.keyboard.press('Enter');
        await expect(page).toHaveURL(source);
        await page.goBack(); await expect(page).toHaveURL(detail);
      }
      await back.click();
      await expect(page).toHaveURL(from);
    }
    expect(new URL(page.url()).searchParams.get('retorno')).toBe(new URL(origin, 'http://app.local').searchParams.get('retorno'));
    await page.getByRole('navigation', { name: 'Seções da ficha' }).getByRole('link', { name: 'Projetos', exact: true }).click();
    await page.reload();
    // Sessão somente em memória: recarga exige novo login e conserva next/query.
    await signInCurrentPage(page, perfil);
    const breadcrumb = page.getByRole('navigation', { name: 'Caminho da página' }).getByRole('link', { name: 'Pacientes', exact: true });
    await expect(breadcrumb).toHaveAttribute('href', source);
    for (const width of [1440, 390, 320]) {
      await page.setViewportSize({ width, height: width === 1440 ? 960 : 844 });
      await assertFitsViewport(page); await assertAccessible(page);
      await page.screenshot({ path: info.outputPath(`ficha-retorno-${perfil}-${width}.png`), fullPage: true });
    }
    await breadcrumb.focus(); await page.keyboard.press('Enter');
    await expect(page).toHaveURL(source);
    await expect(page.getByRole('searchbox', { name: 'Nome', exact: true })).toHaveValue(name);
    await expect(page.getByRole('combobox', { name: 'Sexo', exact: true })).toHaveValue('feminino');
    await expect(page.getByRole('link', { name: /^Ver ficha de / }).first()).toHaveAttribute('href', target.pathname + target.search);
    await assertNoPersistentClinicalState(page);
  });
}

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
  const table = page.getByRole('region', { name: /^Pacientes disponíveis; tabela rolável/ });
  for (const width of [1440, 390, 320]) {
    await page.setViewportSize({ width, height: width === 1440 ? 960 : 844 });
    await assertFitsViewport(page); await assertAccessible(page);
    await expect(table.locator('tbody td').first()).toHaveCSS('white-space', 'nowrap');
    await expect(table.locator('tbody td').nth(1)).toHaveCSS('white-space', 'nowrap');
    await table.evaluate(node => { node.scrollLeft = 0; });
    await page.screenshot({ path: testInfo.outputPath(`pacientes-legiveis-${width}.png`), fullPage: true });
    if (width < 600) {
      expect(await table.evaluate(node => node.scrollWidth > node.clientWidth)).toBe(true);
      await table.focus(); await page.keyboard.press('ArrowRight');
      await expect.poll(() => table.evaluate(node => node.scrollLeft)).toBeGreaterThan(0);
    }
  }
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
