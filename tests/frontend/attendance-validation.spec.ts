import { expect, test } from '@playwright/test';
import { apiAs } from './fixtures';
import { assertAccessible, assertFitsViewport, moveAttendanceToReview, nextAttendanceStep, attendanceSection,
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
    const catalog = await (await apiAs('administracao', 'GET', '/catalogos/exames?limit=100')).json() as Array<{ id: string; codigo: string }>;
    const generic = catalog.find(exam => exam.codigo === 'outro')!;
    expect(generic).toBeDefined();
    const cases = [
      { extra: { exames: [{ tipoExameId: '99999999', bloco: 'solicitado' }] }, path: 'exames.0.tipoExameId', code: 'exam_active' },
      { extra: { exames: [{ tipoExameId: generic.id, bloco: 'solicitado', identificacao: '   ' }] }, path: 'exames.0.identificacao', code: 'exam_identification' },
      { extra: { pendencias: [{ descricao: 'Sintética', status: 'resolvida' }] }, path: 'pendencias.0.dataResolucao', code: 'pending_date' },
      { extra: { pendencias: [{ descricao: 'Sintética', status: 'aberta', dataResolucao: '2026-02-01' }] }, path: 'pendencias.0.status', code: 'pending_status' },
      { extra: { pendencias: [{ descricao: '   ' }] }, path: 'pendencias.0.descricao', code: 'required' },
    ];
    for (const rejection of cases) {
      const response = await apiAs('administracao', 'POST', path, {
        dataAtendimento: '2026-02-01', dadosClinicos: { pesoKg: 65.25 }, ...rejection.extra,
      });
      expect(response.status).toBe(400);
      const body = await response.json();
      expect(body).toMatchObject({ errors: [{ path: rejection.path, code: rejection.code }] });
      expect(JSON.stringify(body)).not.toMatch(/INSERT|SELECT|constraint|stack|65\.25/);
      expect(await (await apiAs('administracao', 'GET', path)).json()).toEqual([]);
    }
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

test('P0: limites de registro e familiares apontam campo e etapa antes de confirmar', async ({ page }) => {
  const patient = await seedPatient('Limites e familiares');
  await signIn(page, 'edicao', `${patient.path}/atendimentos/novo`);
  const path = `${patient.path}/atendimentos`;
  for (const [field, value, code] of [
    ['alturaCm', 1000, 'decimal_range'], ['pesoKg', -1000, 'decimal_range'],
    ['frequenciaCardiacaBpm', 2147483648, 'integer_range'], ['paDiastolicaMmhg', -2147483649, 'integer_range'],
  ] as const) {
    const refused = await apiAs('edicao', 'POST', path, { dataAtendimento: '2026-02-01', dadosClinicos: { [field]: value } });
    expect(refused.status).toBe(400);
    expect(await refused.json()).toMatchObject({ errors: [{ path: `dadosClinicos.${field}`, code }] });
    expect(await (await apiAs('edicao', 'GET', path)).json()).toEqual([]);
  }
  let writes = 0;
  page.on('request', request => { if (request.method() === 'POST' && new URL(request.url()).pathname === `/v1${path}`) writes++; });
  await page.getByLabel('Data do atendimento', { exact: true }).fill('2026-02-01');
  await attendanceSection(page, 'Avaliação Clínica');
  await page.getByLabel('Altura (cm)', { exact: true }).fill('1000');
  await attendanceSection(page, 'Observações');
  await page.getByRole('button', { name: 'Revisar atendimento', exact: true }).click();
  await expect(page.getByRole('alert')).toBeFocused();
  await page.getByRole('link', { name: /^Altura \(cm\):/ }).click();
  await expect(page.getByLabel('Altura (cm)', { exact: true })).toBeFocused();
  await expect(page.getByLabel('Altura (cm)', { exact: true })).toHaveValue('1000');
  expect(writes).toBe(0);
  await page.getByLabel('Altura (cm)', { exact: true }).fill('170.25');
  await attendanceSection(page, 'Exames');
  await page.getByLabel('Familiares examinados', { exact: true }).selectOption('nao');
  await page.getByRole('button', { name: 'Adicionar familiar examinado', exact: true }).click();
  await page.getByLabel('Identificação do familiar 1', { exact: true }).fill('Familiar sintético');
  await page.getByLabel('Resultado do familiar 1', { exact: true }).fill('Resultado exclusivamente sintético');
  await nextAttendanceStep(page);
  await page.getByRole('button', { name: 'Revisar atendimento', exact: true }).click();
  await expect(page.getByRole('alert')).toBeFocused();
  await page.getByRole('link', { name: /^Familiares examinados:/ }).click();
  const familyStatus = page.getByLabel('Familiares examinados', { exact: true });
  await expect(familyStatus).toBeFocused(); await expect(familyStatus).toHaveAttribute('aria-invalid', 'true');
  await expect(page.getByLabel('Resultado do familiar 1', { exact: true })).toHaveValue('Resultado exclusivamente sintético');
  expect(writes).toBe(0);
  await page.setViewportSize({ width: 320, height: 844 });
  await assertFitsViewport(page); await assertAccessible(page);
  await familyStatus.selectOption('sim'); await nextAttendanceStep(page);
  await page.getByRole('button', { name: 'Revisar atendimento', exact: true }).click();
  const saved = await submitWrite(page, 'POST', path, 'Confirmar atendimento');
  const { atendimentoId } = await saved.response.json() as { atendimentoId: string };
  expect(await readAttendance(`${path}/${atendimentoId}`)).toMatchObject({ dadosClinicos: { alturaCm: '170.25' },
    rastreioFamiliar: { familiaresExaminados: true, familiares: [{ identificacaoFamiliar: 'Familiar sintético', resultadoSorologia: 'Resultado exclusivamente sintético' }] } });
  expect(writes).toBe(1);
});
