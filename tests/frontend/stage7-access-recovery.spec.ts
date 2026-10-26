import { expect, test } from '@playwright/test';
import { assertNoPersistentClinicalState, fixture } from './fixtures';
import { apiJson, readPatient, seedPatient, signIn, submitWrite } from './stage7-helpers';

test('7D-R2: 403 de escrita permite revisar o mesmo rascunho e confirmar após restaurar o vínculo', async ({ page }) => {
  test.setTimeout(180_000);
  const patient = await seedPatient('Recuperação de escrita recusada');
  const original = await readPatient(patient.path);
  const intendedName = 'Etapa 7 intenção preservada após 403 Sintético';
  const accessPath = `${patient.path}/acesso/${fixture.users.edicao.usuarioId}`;
  const writes: Array<{ operationId: string | undefined; body: Record<string, unknown> }> = [];
  const registrations: Array<{ operacaoId: string; metodo: string; caminho: string; corpoHash: string }> = [];
  page.on('request', request => {
    const path = new URL(request.url()).pathname;
    if (request.method() === 'PATCH' && path === `/v1${patient.path}`) {
      writes.push({ operationId: request.headers()['x-operacao-id'], body: request.postDataJSON() as Record<string, unknown> });
    }
    if (request.method() === 'POST' && path === '/v1/operacoes') {
      registrations.push(request.postDataJSON() as typeof registrations[number]);
    }
  });

  await signIn(page, 'edicao', `${patient.path}/editar`);
  await expect(page.getByLabel('Nome completo', { exact: true })).toHaveValue(original.nome);
  await page.getByLabel('Nome completo', { exact: true }).fill(intendedName);

  // Register with the current write permission, then revoke only that permission
  // before delivering the real registration response. The clinical PATCH must
  // reach the real API and be refused there; no mocked 403 or failed registration.
  let revokedAfterRegistration = false;
  await page.route('**/v1/operacoes', async route => {
    if (revokedAfterRegistration || route.request().method() !== 'POST') {
      await route.continue();
      return;
    }
    const intention = route.request().postDataJSON() as typeof registrations[number];
    expect(intention).toMatchObject({ metodo: 'PATCH', caminho: `/v1${patient.path}` });
    const response = await route.fetch();
    expect(response.status()).toBe(201);
    expect(await response.json()).toMatchObject({ operacaoId: intention.operacaoId, estado: 'registrada' });
    await apiJson('PUT', accessPath, { ativo: true, podeEditar: false });
    revokedAfterRegistration = true;
    await route.fulfill({ response });
  });

  const refused = await submitWrite(page, 'PATCH', patient.path, 'Salvar paciente', 403);
  expect(revokedAfterRegistration).toBe(true);
  expect(refused.body).toEqual({ versao: original.versao, nome: intendedName });
  await expect(page.getByRole('alert')).toContainText(/acesso|permissão|autoriza/i);
  await expect(page.getByLabel('Nome completo', { exact: true })).toHaveValue(intendedName);
  await expect(page.getByRole('button', { name: 'Salvar paciente', exact: true })).toBeDisabled();
  await expect(page.getByText('Paciente salvo.', { exact: true })).toHaveCount(0);
  await page.waitForLoadState('networkidle');
  expect(writes).toHaveLength(1);
  expect(writes[0]!.operationId).toBe(registrations[0]!.operacaoId);
  expect(await readPatient(patient.path)).toMatchObject({ nome: original.nome, versao: original.versao });

  // Read access remains valid while write access is absent. This check only
  // unlocks review; it cannot submit or establish permission to write.
  const read = page.waitForResponse(response => response.request().method() === 'GET'
    && new URL(response.url()).pathname === `/v1${patient.path}`
    && new URL(response.url()).search === '');
  await page.getByRole('button', { name: 'Revalidar acesso e revisar rascunho', exact: true }).click();
  expect((await read).status()).toBe(200);
  await expect(page.getByRole('alert')).toContainText(/Confirme novamente.*autorização de escrita.*servidor/);
  await expect(page.getByLabel('Nome completo', { exact: true })).toHaveValue(intendedName);
  await expect(page.getByRole('button', { name: 'Salvar paciente', exact: true })).toBeEnabled();
  await page.waitForLoadState('networkidle');
  expect(writes).toHaveLength(1);
  expect(registrations).toHaveLength(1);
  expect(await readPatient(patient.path)).toMatchObject({ nome: original.nome, versao: original.versao });

  await apiJson('PUT', accessPath, { ativo: true, podeEditar: true });
  await page.waitForLoadState('networkidle');
  expect(writes).toHaveLength(1);
  const confirmed = await submitWrite(page, 'PATCH', patient.path, 'Salvar paciente');
  const receipt = await confirmed.response.json() as { pacienteId: string; versao: string };
  expect(confirmed.body).toEqual({ versao: original.versao, nome: intendedName });
  await expect(page.getByText('Paciente salvo.', { exact: true })).toBeVisible();
  await page.waitForLoadState('networkidle');
  expect(writes).toHaveLength(2);
  expect(registrations).toHaveLength(2);
  expect(writes.map(write => write.body)).toEqual([
    { versao: original.versao, nome: intendedName }, { versao: original.versao, nome: intendedName },
  ]);
  expect(new Set(writes.map(write => write.operationId)).size).toBe(2);
  expect(writes[1]!.operationId).toBe(registrations[1]!.operacaoId);
  expect(registrations[1]!.corpoHash).toBe(registrations[0]!.corpoHash);
  expect(receipt.pacienteId).toBe(patient.pacienteId);
  expect(receipt.versao).not.toBe(original.versao);
  expect(await readPatient(patient.path)).toMatchObject({ pacienteId: patient.pacienteId, nome: intendedName, versao: receipt.versao });
  await assertNoPersistentClinicalState(page);
});
