import { test, expect } from '@playwright/test';
import { apiAs, assertNoPersistentClinicalState, fixture } from './fixtures';
import { apiJson, assertAccessible, seedAttendance, seedPatient, signIn } from './stage7-helpers';

const assessmentText = 'Avaliação exclusiva da consulta A sintética';
const diagnosisText = 'Diagnóstico exclusivo da consulta A sintético';

async function twoVisits() {
  const patient = await seedPatient('Seleção temporal U3.2');
  const first = await seedAttendance(patient.path, {
    dataAtendimento: '2026-04-15', dadosClinicos: { pesoKg: 73.25, alturaCm: 170, observacoes: assessmentText },
    diagnosticoChagas: { possuiDiagnosticoChagas: null, statusDiagnostico: 'inconclusivo',
      resultadoFinal: 'indeterminado', observacoes: diagnosisText },
  });
  const second = await seedAttendance(patient.path, { dataAtendimento: '2026-04-16' });
  return { patient, first, second };
}

test('7D-U3.2: escolher consulta, alternar avaliação/Chagas e reler ausência sem último não nulo', async ({ page }, testInfo) => {
  const { patient, first, second } = await twoVisits();
  const writes: string[] = [];
  page.on('request', request => {
    if (new URL(request.url()).pathname.startsWith(`/v1${patient.path}`)
      && ['POST', 'PATCH', 'PUT', 'DELETE'].includes(request.method())) writes.push(request.url());
  });
  await signIn(page, 'consulta', `${patient.path}?aba=avaliacao&consultaLimit=1`);
  await expect(page.getByText('Selecione um atendimento para consultar os dados registrados naquela consulta.')).toBeVisible();
  const select = page.getByLabel('Atendimento para consulta clínica', { exact: true });
  const pagination = page.getByRole('navigation', { name: 'Paginação de consultas clínicas', exact: true });
  const tabs = page.getByRole('navigation', { name: 'Seções da ficha', exact: true });
  await select.selectOption(second.atendimentoId);
  await expect(page.getByText('Dados clínicos não registrados neste atendimento.')).toBeVisible();
  await pagination.getByRole('button', { name: 'Próxima', exact: true }).click();
  await expect(select).toHaveValue(second.atendimentoId);
  await expect(page).toHaveURL(/consultaOffset=1/);
  await select.selectOption(first.atendimentoId);
  await expect(page.getByText(assessmentText, { exact: true })).toBeVisible();
  await expect(page.getByText('73,25 kg', { exact: true })).toBeVisible();
  await tabs.getByRole('link', { name: 'Chagas', exact: true }).click();
  await expect(select).toHaveValue(first.atendimentoId);
  await expect(page.getByText(diagnosisText, { exact: true })).toBeVisible();
  await page.goBack();
  await expect(page.getByText(assessmentText, { exact: true })).toBeVisible();
  await pagination.getByRole('button', { name: 'Anterior', exact: true }).click();
  await expect(select).toHaveValue(first.atendimentoId);
  await select.selectOption(second.atendimentoId);
  await expect(page.getByText('Dados clínicos não registrados neste atendimento.')).toBeVisible();
  await expect(page.getByText(assessmentText, { exact: true })).toHaveCount(0);
  await tabs.getByRole('link', { name: 'Chagas', exact: true }).click();
  await expect(page.getByText('Diagnóstico não registrado neste atendimento.')).toBeVisible();
  await expect(page.getByText(diagnosisText, { exact: true })).toHaveCount(0);
  await page.setViewportSize({ width: 320, height: 844 });
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1)).toBe(true);
  await select.focus();
  await expect(select).toBeFocused();
  await assertAccessible(page);
  await page.screenshot({ path: testInfo.outputPath('consulta-selecionada-320.png'), fullPage: true });
  expect(writes).toEqual([]);
  await assertNoPersistentClinicalState(page);
});

test('7D-U3.2: revogar vínculo ao paginar opções oculta a avaliação previamente consultada', async ({ page }) => {
  const { patient, first } = await twoVisits();
  await signIn(page, 'consulta', `${patient.path}?aba=avaliacao&atendimentoId=${first.atendimentoId}&consultaLimit=1`);
  await expect(page.getByText(assessmentText, { exact: true })).toBeVisible();
  await apiJson('PUT', `${patient.path}/acesso/${fixture.users.consulta.usuarioId}`, { ativo: false, podeEditar: false });
  const denied = page.waitForResponse(response => new URL(response.url()).pathname === `/v1${patient.path}/atendimentos`
    && response.status() === 403);
  await page.getByRole('navigation', { name: 'Paginação de consultas clínicas', exact: true })
    .getByRole('button', { name: 'Próxima', exact: true }).click();
  await denied;
  await expect(page.getByText(assessmentText, { exact: true })).toHaveCount(0);
  await expect(page.getByRole('heading', { name: 'Consulta selecionada', exact: true })).toHaveCount(0);
  expect(new URL(page.url()).searchParams.get('atendimentoId')).toBe(first.atendimentoId);
  expect((await apiAs('consulta', 'GET', `${first.path}?limit=1&offset=0`)).status).toBe(403);
  await assertNoPersistentClinicalState(page);
});
