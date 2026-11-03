import { expect, test } from '@playwright/test';
import { attendanceSection, assertAccessible, assertFitsViewport, readAttendance, reviewAttendance,
  seedPatient, signIn, submitWrite, visitByLink } from './stage7-helpers';

const sections = ['Atendimento', 'Chagas e Sorologia', 'Condição Clínica', 'Comorbidades',
  'Avaliação Clínica', 'Eventos e Dispositivos', 'Projetos', 'Exames', 'Medicamentos e BZN',
  'Encaminhamentos', 'Notificação', 'Observações'];

test('M3: doze seções informacionais, navegação livre, rascunho, validação e confirmação real', async ({ page }, info) => {
  test.setTimeout(180_000);
  const patient = await seedPatient('Seções da referência');
  const creationPath = `${patient.path}/atendimentos/novo`;
  await signIn(page, 'edicao', creationPath);
  const nav = page.getByRole('navigation', { name: 'Seções do atendimento', exact: true });
  for (const section of sections) await expect(nav.getByRole('button', { name: section, exact: true })).toBeVisible();
  let writes = 0;
  page.on('request', request => {
    if (request.method() === 'POST' && new URL(request.url()).pathname === `/v1${patient.path}/atendimentos`) writes++;
  });

  // A seção opcional pode ser aberta antes do campo obrigatório: o índice não é um wizard obrigatório.
  await attendanceSection(page, 'Exames');
  await expect(page.getByRole('button', { name: 'Adicionar exame', exact: true })).toBeVisible();
  await attendanceSection(page, 'Atendimento');
  await expect(page.getByLabel('Data do atendimento', { exact: true })).toHaveValue('');
  await page.getByLabel('Data do atendimento', { exact: true }).fill('2026-04-12');
  await page.getByLabel('Observações do atendimento', { exact: true }).fill('Rascunho entre seções exclusivamente sintético');
  await attendanceSection(page, 'Chagas e Sorologia');
  await page.getByLabel('Data de descoberta por autorrelato', { exact: true }).fill('2012-05-06');
  await attendanceSection(page, 'Avaliação Clínica');
  await page.getByLabel('Peso (kg)', { exact: true }).fill('65.25');
  await attendanceSection(page, 'Observações');
  await page.getByRole('button', { name: 'Adicionar pendência', exact: true }).click();
  await page.getByLabel('Descrição da pendência 1', { exact: true }).fill('Pendência exclusivamente sintética');
  await page.getByRole('button', { name: 'Cancelar atendimento', exact: true }).click();
  await page.getByRole('button', { name: 'Sair e manter rascunho', exact: true }).click();
  await visitByLink(page, creationPath);
  await expect(page.getByLabel('Observações do atendimento', { exact: true })).toHaveValue('Rascunho entre seções exclusivamente sintético');
  await attendanceSection(page, 'Avaliação Clínica');
  await expect(page.getByLabel('Peso (kg)', { exact: true })).toHaveValue('65.25');
  await page.getByLabel('Peso (kg)', { exact: true }).fill('1000');
  await attendanceSection(page, 'Observações');
  await expect(page.getByLabel('Descrição da pendência 1', { exact: true })).toHaveValue('Pendência exclusivamente sintética');
  await page.getByRole('button', { name: 'Revisar atendimento', exact: true }).click();
  await expect(page.getByRole('alert')).toBeFocused();
  await page.getByRole('link', { name: /^Peso \(kg\):/ }).click();
  await expect(page.getByLabel('Peso (kg)', { exact: true })).toBeFocused();
  await expect(page.getByLabel('Peso (kg)', { exact: true })).toHaveAttribute('aria-invalid', 'true');
  expect(writes).toBe(0);
  await page.getByLabel('Peso (kg)', { exact: true }).fill('65.25');

  for (const section of sections) {
    await attendanceSection(page, section);
    for (const width of [1440, 390]) {
      await page.setViewportSize({ width, height: width === 1440 ? 960 : 844 });
      if (width === 390) await expect.poll(() => nav.getByRole('button', { name: section, exact: true }).evaluate(button => {
        const item = button.getBoundingClientRect();
        const viewport = button.parentElement!.getBoundingClientRect();
        return item.left >= viewport.left && item.right <= viewport.right;
      })).toBe(true);
      await assertFitsViewport(page); await assertAccessible(page);
      await page.screenshot({ path: info.outputPath(`secoes-${sections.indexOf(section) + 1}-${width}.png`), fullPage: true });
    }
  }
  await reviewAttendance(page);
  const review = page.getByRole('group', { name: 'Revisão do atendimento', exact: true });
  await expect(review).toContainText('Rascunho entre seções exclusivamente sintético');
  await expect(review).toContainText('Pendência exclusivamente sintética');
  expect(writes).toBe(0);
  const saved = await submitWrite(page, 'POST', `${patient.path}/atendimentos`, 'Confirmar atendimento');
  const { atendimentoId } = await saved.response.json() as { atendimentoId: string };
  expect(await readAttendance(`${patient.path}/atendimentos/${atendimentoId}`)).toMatchObject({
    observacoes: 'Rascunho entre seções exclusivamente sintético', dadosClinicos: { pesoKg: '65.25' },
    diagnosticoChagas: { dataDescobertaAutorelato: '2012-05-06' },
    pendencias: [{ descricao: 'Pendência exclusivamente sintética' }],
  });
  expect(writes).toBe(1);
});
