import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { fixture, signIn, apiAs, setUserActive, resumePage, assertNoPersistentClinicalState, delayOneApiResponse } from './fixtures';

const mainPath = `/pacientes/${fixture.main.pacienteId}`;
const patientRows = (page: import('@playwright/test').Page) => page.getByRole('table').locator('tbody tr');
const menu = (page: import('@playwright/test').Page) => page.getByRole('navigation', { name: 'Menu principal' });
const assertAccessible = async (page: import('@playwright/test').Page) => {
  const result = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa']).analyze();
  expect(result.violations.map(violation => ({ id: violation.id, impact: violation.impact,
    nodes: violation.nodes.map(node => ({ target: node.target, summary: node.failureSummary })) }))).toEqual([]);
};

test('consulta: busca, paginação, leitura e acessibilidade com dados reais da API', async ({ page }, testInfo) => {
  test.setTimeout(90_000);
  await page.goto('/login');
  await assertAccessible(page);
  const authentication = await signIn(page, 'consulta');
  const me = await page.request.get('/v1/auth/me', { headers: { authorization: `Bearer ${authentication.accessToken}` } });
  expect(await me.json()).toEqual({ usuarioId: fixture.users.consulta.usuarioId, nome: fixture.users.consulta.nome, perfil: 'consulta' });
  await expect(page.getByRole('heading', { name: 'Início', exact: true })).toBeVisible();
  await menu(page).getByRole('link', { name: 'Minha conta', exact: true }).click();
  await expect(page.getByRole('main')).toBeFocused();
  await expect(page.getByText(fixture.users.consulta.nome, { exact: true }).first()).toBeVisible();
  await expect(page.getByText(fixture.users.consulta.usuarioId, { exact: true })).toBeVisible();

  const requests: string[] = [];
  page.on('request', request => requests.push(new URL(request.url()).pathname));
  let release!: () => void;
  const delayed = new Promise<void>(resolve => { release = resolve; });
  let fetched!: () => void;
  const fetchedResponse = new Promise<void>(resolve => { fetched = resolve; });
  let first = true;
  await page.route('**/v1/pacientes?**', async route => {
    if (!first) { await route.continue(); return; }
    first = false;
    const response = await route.fetch();
    fetched();
    await delayed;
    await route.fulfill({ response });
  });
  await menu(page).getByRole('link', { name: 'Pacientes', exact: true }).click();
  await fetchedResponse;
  await expect(page.getByText(/Carregando/).first()).toBeVisible();
  release();
  await expect(patientRows(page)).toHaveCount(20);
  expect(requests.some(path => /^\/v1\/pacientes\/\d+$/.test(path))).toBe(false);
  await expect(page.getByText(fixture.reserved.nome, { exact: true })).toHaveCount(0);
  const headers = await page.getByRole('columnheader').allTextContents();
  expect(headers).toEqual(['ID', 'Nome', 'Ficha']);
  await page.getByRole('button', { name: 'Próxima', exact: true }).click();
  await expect(page).toHaveURL(/offset=20/);
  await expect(patientRows(page)).toHaveCount(4);
  await expect(page.getByText(fixture.large.pacienteId, { exact: true })).toBeVisible();
  expect(BigInt(fixture.large.pacienteId)).toBeGreaterThan(BigInt(Number.MAX_SAFE_INTEGER));
  await page.goBack();
  await expect(patientRows(page)).toHaveCount(20);
  await page.getByLabel('Nome', { exact: true }).fill('Paginação');
  await page.getByLabel('Sexo', { exact: true }).selectOption('masculino');
  await page.getByRole('button', { name: 'Buscar', exact: true }).click();
  await expect.poll(() => new URL(page.url()).searchParams.get('nome')).toBe('Paginação');
  await expect(page).toHaveURL(/sexo=masculino/);
  await expect(patientRows(page)).toHaveCount(11);
  await page.getByLabel('Itens por página').selectOption('10');
  await expect(patientRows(page)).toHaveCount(10);
  await page.getByRole('button', { name: 'Próxima', exact: true }).click();
  await expect(patientRows(page)).toHaveCount(1);
  await expect(page).toHaveURL(/offset=10/);
  await page.getByLabel('Nome', { exact: true }).fill('Inexistente Sintético');
  await page.getByRole('button', { name: 'Buscar', exact: true }).click();
  await expect(page.getByText('Nenhum paciente nesta página para os filtros e o acesso atuais.')).toBeVisible();
  await expect(page.getByRole('button', { name: 'Próxima', exact: true })).toBeDisabled();

  await page.getByRole('button', { name: 'Limpar filtros', exact: true }).click();
  await expect(patientRows(page)).toHaveCount(10);
  await page.getByRole('link', { name: `Ver ficha de ${fixture.main.nome}`, exact: true }).click();
  await expect(page.getByRole('heading', { name: fixture.main.nome, exact: true })).toBeVisible();
  await expect(page.getByText('10/02/1980', { exact: true })).toBeVisible();
  await expect(page.getByText('Valor legado sintético', { exact: true })).toBeVisible();
  const patient = await (await apiAs('consulta', 'GET', mainPath)).json();
  await expect(page.getByText(new RegExp(`${patient.idade} anos.*referência:`))).toBeVisible();
  await expect(page.getByText(patient.dataReferenciaIdade.split('-').reverse().join('/'), { exact: false }).first()).toBeVisible();
  await assertAccessible(page);
  await page.screenshot({ path: testInfo.outputPath('ficha-desktop.png'), fullPage: true });
  await page.setViewportSize({ width: 390, height: 844 });
  await assertAccessible(page);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1)).toBe(true);
  await page.screenshot({ path: testInfo.outputPath('ficha-mobile.png'), fullPage: true });
  await page.setViewportSize({ width: 1280, height: 900 });
  await page.evaluate(() => { document.documentElement.style.zoom = '2'; });
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1)).toBe(true);
  await page.screenshot({ path: testInfo.outputPath('ficha-zoom200.png'), fullPage: true });
  await page.evaluate(() => { document.documentElement.style.zoom = ''; });
  const sections = page.getByRole('navigation', { name: 'Seções da ficha' });
  await sections.getByRole('link', { name: 'Atendimentos', exact: true }).click();
  await expect(page).toHaveURL(/aba=atendimentos/);
  await expect(patientRows(page)).toHaveCount(20);
  await page.getByLabel('Itens por página').selectOption('10');
  await expect(patientRows(page)).toHaveCount(10);
  await page.getByRole('button', { name: 'Próxima', exact: true }).click();
  await expect(page).toHaveURL(/atendimentosOffset=10/);
  await expect(patientRows(page)).toHaveCount(10);
  await page.getByRole('button', { name: 'Próxima', exact: true }).click();
  await expect(patientRows(page)).toHaveCount(1);
  await expect(page.getByText('Observação sintética 1', { exact: true })).toBeVisible();
  await sections.getByRole('link', { name: 'Exames', exact: true }).click();
  await expect(page.getByText(/Resultado sintético/)).toHaveCount(20);
  await page.getByLabel('Itens por página').selectOption('10');
  await expect(page.getByText(/Resultado sintético/)).toHaveCount(10);
  await page.getByRole('button', { name: 'Próxima', exact: true }).click();
  await expect(page).toHaveURL(/examesOffset=10/);
  await expect(page.getByText(/Resultado sintético/)).toHaveCount(10);
  await sections.getByRole('link', { name: 'Projetos', exact: true }).click();
  await expect(page.getByText('Pendência de projeto sintética', { exact: true })).toBeVisible();
  await sections.getByRole('link', { name: 'Notificação', exact: true }).click();
  await expect(page.getByText('SINTETICO-000', { exact: true })).toBeVisible();
  await expect(page.locator('dl div').filter({ has: page.getByText('Paciente notificado', { exact: true }) })).toContainText('Não informado');
  await sections.getByRole('link', { name: 'BZN e retornos', exact: true }).click();
  await expect(page.getByText('Retorno BZN sintético', { exact: true })).toBeVisible();
  await page.locator('summary').filter({ hasText: 'Reação sintética' }).click();
  await expect(page.getByText('02/02/2026', { exact: true })).toBeVisible();
  await sections.getByRole('link', { name: 'Encaminhamentos', exact: true }).click();
  await expect(page.getByText('Unidade Sintética', { exact: true })).toBeVisible();
  await page.locator('summary').filter({ hasText: `Contrarreferências do encaminhamento ${fixture.main.encaminhamento.encaminhamentoId}` }).click();
  await expect(page).toHaveURL(new RegExp(`contrarreferencia=${fixture.main.encaminhamento.encaminhamentoId}`));
  const counterPagination = page.getByRole('navigation', { name: 'Paginação de contrarreferências', exact: true });
  await expect(page.getByText('Resposta pendente sintética', { exact: true })).toBeVisible();
  await counterPagination.getByLabel('Itens por página').selectOption('10');
  await expect(page.getByText('Resposta pendente sintética', { exact: true })).toHaveCount(0);
  await counterPagination.getByRole('button', { name: 'Próxima', exact: true }).click();
  await expect(page).toHaveURL(new RegExp(`contrarreferencia${fixture.main.encaminhamento.encaminhamentoId}Offset=10`));
  await expect(page.getByText('Resposta pendente sintética', { exact: true })).toBeVisible();
  await expect(page.getByText('Resposta concluída sintética', { exact: true })).toHaveCount(0);
  await sections.getByRole('link', { name: 'Pendências', exact: true }).click();
  await expect(page.getByText('Pendência sintética 21', { exact: true })).toBeVisible();
  await sections.getByRole('link', { name: 'Acompanhamento anual', exact: true }).click();
  await expect(page.getByText('2025', { exact: true })).toBeVisible();
  await expect(page.getByText('Retorno anual sintético', { exact: true })).toBeVisible();
  await assertAccessible(page);
  await assertNoPersistentClinicalState(page);
});

test('edicao consulta só seus vínculos e mantém a ficha em leitura', async ({ page }) => {
  await signIn(page, 'edicao', `/pacientes/${fixture.reserved.pacienteId}`);
  await expect(page.getByRole('alert')).toContainText(/acesso|permissão|autorizado/i);
  await expect(page.getByText(fixture.reserved.nome, { exact: true })).toHaveCount(0);
  await menu(page).getByRole('link', { name: 'Pacientes', exact: true }).click();
  await expect(patientRows(page)).toHaveCount(2);
  await expect(page.getByText(fixture.main.nome, { exact: true })).toBeVisible();
  await expect(page.getByText(fixture.large.nome, { exact: true })).toBeVisible();
  await expect(page.getByText(fixture.patients[1].nome, { exact: true })).toHaveCount(0);
  await page.getByRole('link', { name: `Ver ficha de ${fixture.main.nome}`, exact: true }).click();
  await expect(page.getByRole('heading', { name: fixture.main.nome, exact: true })).toBeVisible();
  await expect(page.getByRole('button', { name: /salvar|editar|cadastrar/i })).toHaveCount(0);
  expect((await apiAs('edicao', 'GET', `/pacientes/${fixture.reserved.pacienteId}/atendimentos`)).status).toBe(403);
  expect((await apiAs('consulta', 'POST', '/pacientes', { nome: 'Cadastro recusado sintético' })).status).toBe(403);
});

test('administracao lê inclusive o paciente fora dos vínculos de consulta/edicao', async ({ page }) => {
  await signIn(page, 'administracao', `/pacientes?nome=Reservado&limit=10&offset=0`);
  await expect(patientRows(page)).toHaveCount(1);
  await page.getByRole('link', { name: `Ver ficha de ${fixture.reserved.nome}`, exact: true }).click();
  await expect(page.getByRole('heading', { name: fixture.reserved.nome, exact: true })).toBeVisible();
  await expect(page.getByText(/Idade não informada/)).toBeVisible();
  await assertNoPersistentClinicalState(page);
});

test('link direto do atendimento, recarregamento e voltar preservam o destino', async ({ page }) => {
  const attendance = fixture.main.atendimentos[0];
  const destination = `${mainPath}/atendimentos/${attendance.atendimentoId}?limit=1&offset=0`;
  await signIn(page, 'consulta', destination);
  await expect(page).toHaveURL(new RegExp(`/atendimentos/${attendance.atendimentoId}\\?limit=1&offset=0$`));
  await expect(page.getByText('Observação sintética 1', { exact: true })).toBeVisible();
  await expect(page.getByText('03/05/2010', { exact: true })).toBeVisible();
  await expect(page.getByText('Resultado familiar sintético', { exact: true })).toBeVisible();
  await expect(page.getByText('Resultado familiar embutido sintético 2', { exact: true })).toBeVisible();
  const collections = page.getByRole('navigation', { name: 'Paginação de coleções do atendimento' });
  await collections.getByRole('button', { name: 'Próxima', exact: true }).click();
  await expect(page).toHaveURL(/offset=1/);
  // Exames/pendências não deslocam os snapshots nem a página de cada familiar.
  await expect(page.getByText('Resultado familiar sintético', { exact: true })).toBeVisible();
  await expect(page.getByText('Resultado embutido sintético 2', { exact: true })).toBeVisible();
  await collections.getByRole('button', { name: 'Anterior', exact: true }).click();
  await expect(page.getByText('Resultado familiar sintético', { exact: true })).toBeVisible();
  await page.reload();
  await expect(page.getByLabel('Usuário', { exact: true })).toBeVisible();
  await expect(page.getByText('Observação sintética 1', { exact: true })).toHaveCount(0);
  const response = page.waitForResponse(r => new URL(r.url()).pathname === '/v1/auth/login' && r.status() === 201);
  await page.getByLabel('Usuário', { exact: true }).fill(fixture.users.consulta.login);
  await page.getByLabel('Senha', { exact: true }).fill(fixture.password);
  await page.getByRole('button', { name: 'Entrar', exact: true }).click();
  await response;
  await expect(page).toHaveURL(new RegExp(`/atendimentos/${attendance.atendimentoId}\\?limit=1&offset=0$`));
  await expect(page.getByText('Observação sintética 1', { exact: true })).toBeVisible();
  await menu(page).getByRole('link', { name: 'Pacientes', exact: true }).click();
  await expect(patientRows(page)).toHaveCount(20);
  await page.goBack();
  await expect(page.getByText('Observação sintética 1', { exact: true })).toBeVisible();
});

test('saída e troca de identidade impedem uma resposta real antiga de reaparecer', async ({ page }) => {
  await signIn(page, 'consulta');
  let release!: () => void;
  let ready!: () => void;
  const delayed = new Promise<void>(resolve => { release = resolve; });
  const fetched = new Promise<void>(resolve => { ready = resolve; });
  let first = true;
  await page.route('**/v1/pacientes?**', async route => {
    if (!first) { await route.continue(); return; }
    first = false;
    const response = await route.fetch();
    ready();
    await delayed;
    try { await route.fulfill({ response }); } catch { /* cancelamento da sessão encerra a requisição antiga */ }
  });
  await menu(page).getByRole('link', { name: 'Pacientes', exact: true }).click();
  await fetched;
  await page.getByRole('button', { name: 'Sair', exact: true }).click();
  await expect(page.getByLabel('Usuário', { exact: true })).toBeVisible();
  await expect(page.getByText(fixture.main.nome, { exact: true })).toHaveCount(0);
  await signIn(page, 'edicao', '/pacientes');
  await expect(patientRows(page)).toHaveCount(2);
  release();
  await page.waitForLoadState('networkidle');
  await expect(patientRows(page)).toHaveCount(2);
  await expect(page.getByText(fixture.patients[1].nome, { exact: true })).toHaveCount(0);
  await assertNoPersistentClinicalState(page);
});

test('expiração local do token limpa ficha e exige nova autenticação', async ({ page }) => {
  await page.clock.install({ time: new Date() });
  const authentication = await signIn(page, 'consulta', mainPath);
  expect(authentication.expiresIn).toBe(60);
  await expect(page.getByRole('heading', { name: fixture.main.nome, exact: true })).toBeVisible();
  const delayed = await delayOneApiResponse(page, `**/v1${mainPath}/exames?**`);
  await page.getByRole('navigation', { name: 'Seções da ficha' }).getByRole('link', { name: 'Exames', exact: true }).click();
  await delayed.fetched;
  try {
    await page.clock.fastForward(61_000);
    await expect(page.getByLabel('Usuário', { exact: true })).toBeVisible();
  } finally { delayed.release(); }
  await delayed.done;
  await expect(page.getByText(fixture.main.nome, { exact: true })).toHaveCount(0);
  await expect(page.getByText(/Resultado sintético/)).toHaveCount(0);
  await assertNoPersistentClinicalState(page);
});

test('401 real por identidade inativada limpa sessão e cache ao retomar foco', async ({ page }) => {
  await signIn(page, 'consulta', mainPath);
  await expect(page.getByRole('heading', { name: fixture.main.nome, exact: true })).toBeVisible();
  const delayed = await delayOneApiResponse(page, `**/v1${mainPath}/exames?**`);
  await page.getByRole('navigation', { name: 'Seções da ficha' }).getByRole('link', { name: 'Exames', exact: true }).click();
  await delayed.fetched;
  try {
    await setUserActive('consulta', false);
    const unauthorized = page.waitForResponse(response => new URL(response.url()).pathname.startsWith('/v1/') && response.status() === 401);
    await resumePage(page);
    await unauthorized;
    await expect(page.getByLabel('Usuário', { exact: true })).toBeVisible();
    await expect(page.getByText(fixture.main.nome, { exact: true })).toHaveCount(0);
    delayed.release();
    await delayed.done;
    await expect(page.getByText(/Resultado sintético/)).toHaveCount(0);
    await assertNoPersistentClinicalState(page);
  } finally {
    delayed.release();
    await setUserActive('consulta', true);
  }
});

test('revogação real de vínculo oculta a ficha quando o navegador retoma foco', async ({ page }) => {
  await signIn(page, 'consulta', mainPath);
  await expect(page.getByRole('heading', { name: fixture.main.nome, exact: true })).toBeVisible();
  const accessPath = `${mainPath}/acesso/${fixture.users.consulta.usuarioId}`;
  try {
    expect((await apiAs('administracao', 'PUT', accessPath, { ativo: false, podeEditar: false })).status).toBe(200);
    const forbidden = page.waitForResponse(response => new URL(response.url()).pathname.startsWith(mainPath.replace('/pacientes', '/v1/pacientes')) && response.status() === 403);
    await resumePage(page);
    await forbidden;
    await expect(page.getByRole('alert')).toContainText(/acesso|permissão|autorizado/i);
    await expect(page.getByText(fixture.main.nome, { exact: true })).toHaveCount(0);
    await expect(page.getByText('Rua Sintética 000', { exact: true })).toHaveCount(0);
    await expect(page.getByLabel('Usuário', { exact: true })).toHaveCount(0);
  } finally {
    expect((await apiAs('administracao', 'PUT', accessPath, { ativo: true, podeEditar: false })).status).toBe(200);
  }
});
