import { expect, test } from '@playwright/test';
import { apiAs } from './fixtures';
import { assertAccessible, assertFitsViewport, moveAttendanceToReview, nextAttendanceStep,
  readAttendance, seedPatient, signIn, submitWrite } from './stage7-helpers';

for (const scenario of ['novo pela interface', 'existente'] as const) {
  test(`P0: contexto inválido, correção e releitura de atendimento — paciente ${scenario}`, async ({ page }) => {
    let patientPath: string;
    if (scenario === 'novo pela interface') {
      const name = 'P0 Novo Cadastro Exclusivamente Sintético';
      await signIn(page, 'administracao', '/pacientes/novo');
      await page.getByLabel('Nome para busca prévia', { exact: true }).fill(name);
      await page.getByRole('button', { name: 'Consultar possíveis cadastros', exact: true }).click();
      await expect(page.getByText(/Nenhum paciente nesta página/)).toBeVisible();
      await page.getByRole('button', { name: 'Nenhuma correspondência serve — continuar para cadastro' }).click();
      await page.getByLabel('Nome completo', { exact: true }).fill(name);
      const registration = await submitWrite(page, 'POST', '/pacientes', 'Cadastrar paciente');
      const { pacienteId } = await registration.response.json() as { pacienteId: string };
      patientPath = `/pacientes/${pacienteId}`;
      await page.getByRole('link', { name: 'Novo atendimento', exact: true }).click();
    } else {
      const patient = await seedPatient('P0 Existente'); patientPath = patient.path;
      await signIn(page, 'edicao', `${patientPath}/atendimentos/novo`);
    }
    const path = `${patientPath}/atendimentos`;
    // This is a known invalid synthetic case, not a claimed reconstruction of the human session.
    const invalid = await apiAs('administracao', 'POST', path, { dataAtendimento: '2026-02-01',
      ambulatorioUnicamente: true, ambulatorioAnexoProjeto: true });
    expect(invalid.status).toBe(400);
    expect(await invalid.json()).toMatchObject({ errors: [
      { path: 'ambulatorioUnicamente', code: 'attendance_context' },
      { path: 'ambulatorioAnexoProjeto', code: 'attendance_context' },
    ] });
    expect(await (await apiAs('administracao', 'GET', path)).json()).toEqual([]);
    await page.getByLabel('Data do atendimento', { exact: true }).fill('2026-02-01');
    await page.getByLabel('Observações do atendimento', { exact: true }).fill('Rascunho exclusivamente sintético preservado');
    await page.getByLabel('Somente ambulatório', { exact: true }).selectOption('sim');
    const project = page.getByLabel('Ambulatório anexo a projeto', { exact: true });
    await project.selectOption('sim');
    let writes = 0;
    page.on('request', request => { if (request.method() === 'POST' && new URL(request.url()).pathname === `/v1${path}`) writes++; });
    await nextAttendanceStep(page);
    const alert = page.getByRole('alert');
    await expect(alert).toBeFocused(); await expect(alert).toContainText('não podem ser Sim ao mesmo tempo');
    await expect(project).toHaveAttribute('aria-invalid', 'true'); await expect(project).toHaveValue('sim');
    await page.getByRole('link', { name: /^Ambulatório anexo a projeto:/ }).click();
    await expect(project).toBeFocused();
    await page.setViewportSize({ width: 320, height: 844 });
    await assertAccessible(page); await assertFitsViewport(page);
    expect(writes).toBe(0);
    await project.selectOption(''); await moveAttendanceToReview(page);
    const saved = await submitWrite(page, 'POST', path, 'Confirmar atendimento');
    const { atendimentoId } = await saved.response.json() as { atendimentoId: string };
    expect(await readAttendance(`${path}/${atendimentoId}`)).toMatchObject({
      ambulatorioUnicamente: true, ambulatorioAnexoProjeto: null,
      observacoes: 'Rascunho exclusivamente sintético preservado',
    });
    expect(writes).toBe(1);
    expect(await (await apiAs('administracao', 'GET', path)).json()).toHaveLength(1);
  });
}
