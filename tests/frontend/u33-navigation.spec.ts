import { expect, test } from '@playwright/test';
import { apiAs, assertNoPersistentClinicalState, delayOneApiResponse, fixture } from './fixtures';
import { apiJson, assertAccessible, assertFitsViewport, seedAttendance, seedPatient, signIn } from './stage7-helpers';

async function visits() {
  const patient = await seedPatient('Histórico e exames U3.3');
  const catalog = await apiJson<Array<{ id: string; codigo: string }>>('GET', '/catalogos/exames?limit=100');
  const type = catalog.find(item => item.codigo === 'outro')!;
  expect(type).toBeTruthy();
  const first = await seedAttendance(patient.path, { dataAtendimento: '2026-03-10',
    ambulatorioUnicamente: false, ambulatorioAnexoProjeto: true, observacoes: 'Observação exclusiva da consulta anterior U3.3',
    dadosClinicos: { pesoKg: 64.25, frequenciaCardiacaBpm: 71, paSistolicaMmhg: 120, paDiastolicaMmhg: 80 },
    exames: [
      { tipoExameId: type.id, bloco: 'trazido', identificacao: 'Exame trazido U3.3', resultado: 'Resultado exclusivo trazido U3.3', observacoes: 'Observação do exame U3.3' },
      { tipoExameId: type.id, bloco: 'solicitado', identificacao: 'Exame solicitado U3.3' },
    ],
    pendencias: [{ descricao: 'Pendência da consulta anterior U3.3', status: 'aberta' }],
  });
  const second = await seedAttendance(patient.path, { dataAtendimento: '2026-03-11', observacoes: 'Consulta recente sem exames U3.3' });
  const exams = await apiJson<Array<{ exameId: string; bloco: string }>>('GET', `${patient.path}/exames?limit=100`);
  return { patient, first, second, exams };
}

for (const profile of ['consulta', 'edicao'] as const) {
  test(`7D-U3.3: ${profile} percorre histórico, detalhe e exames com retorno exato`, async ({ page }, testInfo) => {
    const { patient, first, second, exams } = await visits();
    const writes: string[] = [];
    page.on('request', request => {
      if (new URL(request.url()).pathname.startsWith(`/v1${patient.path}`)
        && ['POST', 'PUT', 'PATCH', 'DELETE'].includes(request.method())) writes.push(request.url());
    });
    const source = `${patient.path}?aba=atendimentos&atendimentosLimit=1&atendimentosOffset=1&dadosLimit=1&dadosOffset=2`;
    await signIn(page, profile, source);
    await expect(page.getByText('Observação exclusiva da consulta anterior U3.3', { exact: true })).toBeVisible();
    const history = page.getByRole('table');
    await expect(history).toContainText('Unicamente pelo ambulatório: Não');
    await expect(history).toContainText('Anexo a projeto: Sim');
    await history.getByRole('link', { name: `Atendimento ${first.atendimentoId}`, exact: true }).click();
    await expect(page.getByText('64,25 kg', { exact: true })).toBeVisible();
    await expect(page.getByText('71 bpm', { exact: true })).toBeVisible();
    await expect(page.getByText('120 mmHg', { exact: true })).toBeVisible();
    await expect(page.getByText('80 mmHg', { exact: true })).toBeVisible();
    await expect(page.getByText('Pendência da consulta anterior U3.3', { exact: true })).toBeVisible();
    await expect(page.getByText('Consulta recente sem exames U3.3', { exact: true })).toHaveCount(0);
    await expect(page.getByRole('link', { name: 'Voltar à ficha de origem' })).toHaveAttribute('href', source);
    const areas = page.getByRole('navigation', { name: 'Áreas do paciente' });
    await expect(areas.getByRole('link', { name: 'Projetos', exact: true })).toHaveAttribute('href',
      `${patient.path}?aba=projetos&atendimentosLimit=1&atendimentosOffset=1&dadosLimit=1&dadosOffset=2&atendimentoId=${first.atendimentoId}`);
    await areas.getByRole('link', { name: 'Projetos', exact: true }).click();
    await expect(page.getByRole('heading', { name: 'Projetos', exact: true })).toBeVisible();
    await page.goBack();
    await expect(page.getByRole('heading', { name: 'Detalhe do atendimento', exact: true })).toBeVisible();
    if (profile === 'consulta') await expect(page.getByRole('link', { name: 'Editar atendimento', exact: true })).toHaveCount(0);
    await page.getByRole('link', { name: 'Voltar à ficha de origem' }).click();
    await expect(page).toHaveURL(source);
    const sections = page.getByRole('navigation', { name: 'Seções da ficha' });
    await sections.getByRole('link', { name: 'Exames', exact: true }).click();
    const brought = page.getByRole('region', { name: 'Trazidos pelo paciente' });
    const requested = page.getByRole('region', { name: 'Solicitados' });
    await expect(brought).toContainText('1 nesta página');
    await expect(requested).toContainText('1 nesta página');
    const summary = brought.locator('summary');
    await summary.focus(); await page.keyboard.press('Enter');
    await expect(page.getByText('Resultado exclusivo trazido U3.3', { exact: true })).toBeVisible();
    await expect(page.getByText('Observação do exame U3.3', { exact: true })).toBeVisible();
    expect(new URL(page.url()).searchParams.get('exameId')).toBe(exams.find(exam => exam.bloco === 'trazido')!.exameId);
    const examSource = new URL(page.url()).pathname + new URL(page.url()).search;
    await brought.getByRole('link', { name: `Atendimento ${first.atendimentoId}`, exact: true }).click();
    await page.getByRole('link', { name: 'Voltar à ficha de origem' }).click();
    await expect(page).toHaveURL(examSource);
    await expect(page.getByText('Resultado exclusivo trazido U3.3', { exact: true })).toBeVisible();
    await requested.locator('summary').click();
    await expect(page.getByText('Resultado exclusivo trazido U3.3', { exact: true })).not.toBeVisible();
    await expect(requested.locator('dl div').filter({ has: page.getByText('Resultado', { exact: true }) })).toContainText('Não informado');
    await page.goBack();
    await expect(page.getByText('Resultado exclusivo trazido U3.3', { exact: true })).toBeVisible();
    await page.setViewportSize({ width: 390, height: 844 });
    await assertFitsViewport(page); await assertAccessible(page);
    await page.screenshot({ path: testInfo.outputPath('exames-390.png'), fullPage: true });
    await page.setViewportSize({ width: 320, height: 844 });
    await assertFitsViewport(page);
    await page.setViewportSize({ width: 1440, height: 960 });
    await page.screenshot({ path: testInfo.outputPath('exames-desktop.png'), fullPage: true });
    await page.evaluate(() => { document.documentElement.style.zoom = '2'; });
    await assertFitsViewport(page);
    await page.evaluate(() => { document.documentElement.style.zoom = ''; });
    await sections.getByRole('link', { name: 'Atendimentos', exact: true }).click();
    await expect(page.getByRole('table').getByRole('link', { name: `Atendimento ${first.atendimentoId}`, exact: true })).toBeVisible();
    await page.screenshot({ path: testInfo.outputPath('historico-desktop.png'), fullPage: true });
    await page.getByRole('table').getByRole('link', { name: `Atendimento ${first.atendimentoId}`, exact: true }).click();
    await expect(page.getByText('64,25 kg', { exact: true })).toBeVisible();
    await page.screenshot({ path: testInfo.outputPath('detalhe-desktop.png'), fullPage: true });
    await page.getByRole('link', { name: 'Voltar à ficha de origem' }).click();
    const pagination = page.getByRole('navigation', { name: 'Paginação de histórico de atendimentos' });
    await pagination.getByRole('button', { name: 'Anterior', exact: true }).click();
    await expect(page.getByRole('table').getByRole('link', { name: `Atendimento ${second.atendimentoId}`, exact: true })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Histórico de atendimentos', exact: true })).toBeFocused();
    testInfo.annotations.push({ type: 'IDs sintéticos', description: JSON.stringify({ pacienteId: patient.pacienteId, atendimentos: [first.atendimentoId, second.atendimentoId], exames: exams }) });
    expect(writes).toEqual([]);
    await assertNoPersistentClinicalState(page);
  });
}

test('7D-U3.3: reconsulta e revogação na página de exames ocultam o resultado anterior', async ({ page }) => {
  const { patient, exams } = await visits();
  const examId = exams.find(exam => exam.bloco === 'trazido')!.exameId;
  await signIn(page, 'consulta', `${patient.path}?aba=exames&exameId=${examId}&examesLimit=2`);
  const result = page.getByText('Resultado exclusivo trazido U3.3', { exact: true });
  await expect(result).toBeVisible();
  const delayed = await delayOneApiResponse(page, `**/v1${patient.path}/exames?**`);
  const pagination = page.getByRole('navigation', { name: 'Paginação de exames' });
  await pagination.getByRole('button', { name: 'Próxima', exact: true }).click();
  await delayed.fetched;
  await expect(result).toHaveCount(0);
  delayed.release(); await delayed.done;
  await expect(page.getByText('Nenhum registro nesta página.', { exact: true })).toBeVisible();
  await page.unroute(`**/v1${patient.path}/exames?**`);
  await pagination.getByRole('button', { name: 'Anterior', exact: true }).click();
  await expect(result).toBeVisible();
  await apiJson('PUT', `${patient.path}/acesso/${fixture.users.consulta.usuarioId}`, { ativo: false, podeEditar: false });
  const denied = page.waitForResponse(response => new URL(response.url()).pathname === `/v1${patient.path}/exames` && response.status() === 403);
  await pagination.getByRole('button', { name: 'Próxima', exact: true }).click(); await denied;
  await expect(result).toHaveCount(0);
  await expect(page.getByRole('heading', { name: 'Acesso não autorizado', exact: true })).toBeVisible();
  expect(new URL(page.url()).searchParams.get('exameId')).toBe(examId);
  expect((await apiAs('consulta', 'GET', `${patient.path}/exames`)).status).toBe(403);
});
