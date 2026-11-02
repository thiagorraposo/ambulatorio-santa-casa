import { test, expect } from '@playwright/test';
import { readFile } from 'node:fs/promises';
import type { AtendimentoDetalheResponse, ResultadoExameResponse, SorologiaResponse } from '../../frontend/src/api/contracts';
import { fixture, apiAs, assertNoPersistentClinicalState } from './fixtures';
import { apiJson, nextAttendanceStep, reviewAttendance, signIn, submitWrite,
  assertAccessible, assertFitsViewport, loseResponseAfterCommit } from './stage7-helpers';

test('M3 demonstração sintética: cadastro buscado, consulta, episódios, parâmetros, histórico e CSV', async ({page}, info) => {
  test.setTimeout(180_000);
  const name = `Demonstração M3 ${Date.now()} Sintética`;
  const writes: string[] = [];
  page.on('request', request => {
    const path = new URL(request.url()).pathname;
    if (request.method() === 'POST' && path.startsWith('/v1/pacientes')) writes.push(path);
  });
  await signIn(page, 'administracao', '/pacientes/novo');
  await page.getByLabel('Nome para busca prévia', {exact:true}).fill(name);
  await page.getByRole('button', {name:'Consultar possíveis cadastros',exact:true}).click();
  await expect(page.getByText(/Nenhum paciente nesta página/)).toBeVisible();
  await page.getByRole('button', {name:'Nenhuma correspondência serve — continuar para cadastro'}).click();
  await page.getByLabel('Nome completo', {exact:true}).fill(name);
  const registration = await submitWrite(page, 'POST', '/pacientes', 'Cadastrar paciente');
  const {pacienteId} = await registration.response.json() as {pacienteId:string};
  const patientPath = `/pacientes/${pacienteId}`;
  await expect(page.getByText('Paciente salvo.', {exact:true})).toBeVisible();
  await page.getByRole('link', {name:'Novo atendimento',exact:true}).click();
  await page.getByLabel('Data do atendimento', {exact:true}).fill('2026-10-30');
  await page.getByLabel('Observações do atendimento', {exact:true}).fill('Ensaio M3 exclusivamente sintético');
  await nextAttendanceStep(page);
  await nextAttendanceStep(page);
  await page.getByRole('button', {name:'Adicionar exame',exact:true}).click();
  const exams = await apiJson<Array<{id:string;codigo:string}>>('GET','/catalogos/exames?limit=100');
  await page.getByLabel('Tipo de exame 1', {exact:true}).selectOption(exams.find(exam => exam.codigo==='outro')!.id);
  await page.getByLabel('Identificação do exame 1', {exact:true}).fill('Exame da demonstração sintética M3');
  await nextAttendanceStep(page);
  await reviewAttendance(page);
  await expect(page.getByRole('group',{name:'Etapa 5 — Revisão'})).toContainText('Exame da demonstração sintética M3');
  const consultation = await submitWrite(page,'POST',`${patientPath}/atendimentos`,'Confirmar atendimento');
  const {atendimentoId} = await consultation.response.json() as {atendimentoId:string};
  const attendancePath = `${patientPath}/atendimentos/${atendimentoId}`;
  await expect(page.getByText(/Atendimento salvo.*confirmação própria/)).toBeVisible();
  const original = await apiJson<AtendimentoDetalheResponse>('GET',attendancePath);
  const exam = original.exames[0]!;
  expect(original.diagnosticoChagas).toBeNull();
  await expect(page).toHaveURL(attendancePath);

  await page.getByRole('link',{name:'Sorologias deste atendimento',exact:true}).click();
  await page.getByRole('link',{name:'Registrar sorologia',exact:true}).click();
  await page.getByLabel('Método sorológico',{exact:true}).fill('Método exclusivamente sintético M3');
  await page.getByLabel('Resultado da sorologia',{exact:true}).selectOption('inconclusivo');
  await page.getByRole('button',{name:'Revisar sorologia',exact:true}).click();
  await submitWrite(page,'POST',`${attendancePath}/sorologias`,'Confirmar sorologia');
  await page.getByRole('link',{name:'Conferir episódios deste atendimento',exact:true}).click();
  await expect(page.getByRole('article')).toContainText('Método exclusivamente sintético M3');
  // E1B cria somente a âncora técnica de diagnóstico com campos clínicos null.
  const anchor = (await apiJson<AtendimentoDetalheResponse>('GET',attendancePath)).diagnosticoChagas;
  expect(anchor).not.toBeNull();
  expect(Object.values(anchor!)).toEqual(Object.keys(anchor!).map(()=>null));
  await page.getByRole('link',{name:'← Voltar ao atendimento de origem',exact:true}).click();

  await page.getByRole('link',{name:'Condição de Chagas deste atendimento',exact:true}).click();
  await page.getByRole('link',{name:'Registrar condição de Chagas',exact:true}).click();
  await page.getByLabel('Forma clínica',{exact:true}).selectOption('cardiaca');
  await page.getByLabel('Possui sintomas',{exact:true}).selectOption('nao');
  await page.getByRole('button',{name:'Revisar condição',exact:true}).click();
  await submitWrite(page,'POST',`${attendancePath}/condicao-chagas`,'Confirmar condição');
  await page.getByRole('link',{name:'Conferir condição deste atendimento',exact:true}).first().click();
  await expect(page.getByText('Cardíaca',{exact:true})).toBeVisible();
  await page.getByRole('link',{name:'← Voltar ao atendimento de origem',exact:true}).click();
  await page.getByRole('link',{name:'Complicações deste atendimento',exact:true}).click();
  await page.getByRole('link',{name:'Registrar complicação',exact:true}).click();
  for (const [index,description] of ['Primeira ocorrência sintética M3','Segunda ocorrência sintética M3'].entries()) {
    if(index) await page.getByRole('button',{name:'Registrar outro episódio',exact:true}).click();
    await page.getByLabel('Tipo de complicação',{exact:true}).fill('Tipo livre sintético M3');
    await page.getByLabel('Descrição da complicação',{exact:true}).fill(description);
    await page.getByRole('button',{name:'Revisar complicação',exact:true}).click();
    await submitWrite(page,'POST',`${attendancePath}/complicacoes-chagas`,'Confirmar complicação');
  }
  await page.getByRole('link',{name:'Conferir episódios deste atendimento',exact:true}).click();
  await expect(page.getByRole('article')).toHaveCount(2);
  await page.getByRole('link',{name:'← Voltar ao atendimento de origem',exact:true}).click();

  await page.getByRole('link',{name:'Comorbidades deste atendimento',exact:true}).click();
  await page.getByRole('link',{name:'Registrar comorbidades',exact:true}).click();
  await page.getByLabel('Avaliar hipertensao_arterial',{exact:true}).check();
  await page.getByLabel('Presença de hipertensao_arterial',{exact:true}).selectOption('nao');
  await page.getByLabel('Histórico de doença familiar',{exact:true}).selectOption('desconhecido');
  await page.getByLabel('Relato familiar',{exact:true}).fill('Relato familiar sintético M3');
  await page.getByRole('button',{name:'Revisar comorbidades',exact:true}).click();
  await submitWrite(page,'POST',`${attendancePath}/comorbidades`,'Confirmar comorbidades');
  await page.getByRole('link',{name:'Conferir avaliação deste atendimento',exact:true}).click();
  await expect(page.getByText('Relato familiar sintético M3',{exact:true})).toBeVisible();
  await page.getByRole('link',{name:'← Voltar ao atendimento de origem',exact:true}).click();

  await page.locator('summary').filter({hasText:`(ID ${exam.exameId})`}).click();
  await page.getByRole('link',{name:`Parâmetros do exame ${exam.nomeExame}, ID ${exam.exameId}`,exact:true}).click();
  await page.getByRole('link',{name:'Registrar parâmetro',exact:true}).click();
  await page.getByLabel('Nome do parâmetro',{exact:true}).fill('Parâmetro sintético M3');
  await page.getByLabel('Valor informado',{exact:true}).fill('001,2300 literal');
  await page.getByLabel('Unidade informada',{exact:true}).fill('unidade informada');
  await page.getByLabel('Referência informada',{exact:true}).fill('referência humana');
  await page.getByLabel('Interpretação informada',{exact:true}).fill('texto humano sem cálculo');
  await page.getByRole('button',{name:'Revisar parâmetro',exact:true}).click();
  const resultsPath = `${patientPath}/exames/${exam.exameId}/resultados`;
  const lost = await loseResponseAfterCommit(page,'POST',resultsPath);
  await page.getByRole('button',{name:'Confirmar parâmetro',exact:true}).click();
  expect((await lost.committed).status()).toBe(201);
  await page.getByRole('button',{name:'Verificar resultado do envio',exact:true}).click();
  await expect(page.getByRole('heading',{name:/^Parâmetro confirmado /})).toBeVisible();
  expect(lost.writes()).toBe(1);
  await page.getByRole('link',{name:'Conferir parâmetros do exame',exact:true}).click();
  await expect(page.getByRole('article')).toContainText('001,2300 literal');
  for (const width of [1440,390]) {
    await page.setViewportSize({width,height:width===1440?960:844});
    await assertFitsViewport(page); await assertAccessible(page);
    await page.screenshot({path:info.outputPath(`m3-parametros-integrados-${width}.png`),fullPage:true});
  }
  await page.setViewportSize({width:1440,height:960});
  await page.getByRole('link',{name:'← Voltar à origem',exact:true}).click();
  await expect(page).toHaveURL(new RegExp(`${attendancePath.replaceAll('/','\\/')}[?]`));
  expect((await apiJson<AtendimentoDetalheResponse>('GET',attendancePath)).diagnosticoChagas).toEqual(anchor);
  expect(await apiJson<SorologiaResponse[]>('GET',`${attendancePath}/sorologias`)).toHaveLength(1);
  const results = await apiJson<ResultadoExameResponse[]>('GET',resultsPath);
  expect(results).toHaveLength(1);

  // Segunda consulta criada pela UI: episódios por atendimento não são herdados.
  await page.getByRole('link',{name:'Histórico do paciente',exact:true}).click();
  await page.getByRole('link',{name:'Novo atendimento',exact:true}).click();
  await page.getByLabel('Data do atendimento',{exact:true}).fill('2026-10-31');
  await nextAttendanceStep(page); await nextAttendanceStep(page); await nextAttendanceStep(page); await reviewAttendance(page);
  const next = await submitWrite(page,'POST',`${patientPath}/atendimentos`,'Confirmar atendimento');
  const secondId = (await next.response.json()).atendimentoId as string;
  expect(await apiJson('GET',`${patientPath}/atendimentos/${secondId}/sorologias`)).toEqual([]);
  expect(await apiJson('GET',`${patientPath}/atendimentos/${secondId}/comorbidades`)).toBeNull();
  expect(await apiJson('GET',`${patientPath}/atendimentos/${secondId}/condicao-chagas`)).toBeNull();
  expect(await apiJson('GET',`${patientPath}/atendimentos/${secondId}/complicacoes-chagas`)).toEqual([]);
  expect(writes.filter(path=>path===`/v1${patientPath}/atendimentos`)).toHaveLength(2);
  expect(writes.filter(path=>path===`/v1${resultsPath}`)).toHaveLength(1);

  await apiJson('PUT',`${patientPath}/acesso/${fixture.users.consulta.usuarioId}`,{ativo:true,podeEditar:false});
  await page.getByRole('button',{name:'Sair',exact:true}).click();
  await signIn(page,'consulta',resultsPath);
  await expect(page.getByRole('article')).toContainText('texto humano sem cálculo');
  await expect(page.getByRole('link',{name:'Registrar parâmetro',exact:true})).toHaveCount(0);
  expect((await apiAs('consulta','POST',resultsPath,{nomeParametro:'Escrita recusada sintética'})).status).toBe(403);
  await page.getByRole('navigation',{name:'Menu principal'}).getByRole('link',{name:'Pacientes',exact:true}).click();
  await page.getByLabel('Nome',{exact:true}).fill(name);
  await page.getByRole('button',{name:'Buscar',exact:true}).click();
  await expect(page.getByRole('link',{name:`Ver ficha de ${name}`,exact:true})).toBeVisible();
  await page.getByRole('button',{name:'Exportar CSV desta página',exact:true}).click();
  const downloadEvent=page.waitForEvent('download');
  await page.getByRole('button',{name:'Confirmar exportação CSV',exact:true}).click();
  const download=await downloadEvent;
  expect((await readFile((await download.path())!,'utf8'))).toContain(name);
  await assertNoPersistentClinicalState(page);
  info.annotations.push({type:'Ensaio sintético M3',description:JSON.stringify({pacienteId,atendimentoId,segundaConsultaId:secondId,exameId:exam.exameId,resultadoId:results[0]!.resultadoId})});
});
