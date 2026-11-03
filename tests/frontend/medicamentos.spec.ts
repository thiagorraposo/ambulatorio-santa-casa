import { createRequire } from 'node:module';
import { resolve } from 'node:path';
import { expect, test } from '@playwright/test';
import { apiJson, seedPatient, seedAttendance, signIn, assertAccessible, assertFitsViewport } from './stage7-helpers';
const requireBackend = createRequire(resolve(__dirname,'../../backend/package.json'));
const { Pool } = requireBackend('pg');

test('E5U leitura: campos literais, paginação, responsividade e nenhuma escrita', async ({page},info) => {
  const patient = await seedPatient('medicamentos leitura');
  const attendance = await seedAttendance(patient.path);
  const second = await seedAttendance(patient.path);
  const path = `${attendance.path}/medicamentos`;
  const owner = new Pool({host:process.env.PGHOST,port:Number(process.env.PGPORT),user:process.env.PGUSER,
    password:process.env.PGPASSWORD,database:process.env.FRONTEND_E2E_DB});
  let latest: string;
  try {
    // Legado sintético criado pelo owner; este teste não alega criação via HTTP/UI.
    const records = await owner.query(`INSERT INTO ambulatorio.atendimento_medicamento
      (atendimento_id,nome_medicamento_livre,dose,via_administracao,frequencia,data_inicio,data_fim,
      uso_atual,prescrito_no_atendimento,status_uso,motivo,observacoes,valor_original_medicamento)
      SELECT $1,'Medicamento sintético ' || n,'Dose literal','Via literal','Frequência literal',
      '2026-02-01'::date,'2026-02-02'::date,false,null,'desconhecido','Motivo literal','Observação literal',
      'BRUTO_NAO_PUBLICAR' FROM generate_series(1,21) n RETURNING atendimento_medicamento_id::text AS id`,[attendance.atendimentoId]);
    latest = records.rows[20].id;
    await owner.query(`INSERT INTO ambulatorio.atendimento_medicamento(atendimento_id,nome_medicamento_livre)
      VALUES($1,'Registro de outra consulta')`,[second.atendimentoId]);
  } finally {await owner.end();}
  const writes: string[]=[];
  page.on('request',r=>{if(new URL(r.url()).pathname.startsWith(`/v1${path}`)&&r.method()!=='GET')writes.push(r.method());});
  const origin = `${attendance.path}?limit=10&offset=0`;
  await signIn(page,'edicao',origin);
  await page.getByRole('link',{name:'Medicamentos deste atendimento',exact:true}).click();
  await expect(page.getByRole('link',{name:'← Voltar ao atendimento de origem',exact:true})).toHaveAttribute('href',origin);
  await expect(page.getByRole('article')).toHaveCount(20);
  const item = page.getByRole('article').first();
  await expect(item.getByRole('heading',{name:`Registro ${latest}`,exact:true})).toBeVisible();
  await expect(item.locator('dt')).toHaveCount(18);
  for (const [label,value] of [['Nome livre informado','Medicamento sintético 21'],['Dose informada','Dose literal'],
    ['Via informada','Via literal'],['Frequência informada','Frequência literal'],['Uso atual informado','Não'],
    ['Prescrito neste atendimento','Não informado'],['Data de início informada','01/02/2026'],
    ['Data de fim informada','02/02/2026'],['Nome no catálogo','Não informado'],['Motivo informado','Motivo literal']]) {
    await expect(item.locator('dt').filter({hasText:new RegExp(`^${label}$`)}).locator('..').locator('dd')).toHaveText(value);
  }
  await expect(page.getByText('Registro de outra consulta',{exact:true})).toHaveCount(0);
  await expect(page.getByText('BRUTO_NAO_PUBLICAR')).toHaveCount(0);
  for (const width of [1440,390,320]) {
    await page.setViewportSize({width,height:width===1440?960:844});
    await assertFitsViewport(page);await assertAccessible(page);
    await page.screenshot({path:info.outputPath(`medicamentos-${width}.png`)});
  }
  const nav=page.getByRole('navigation',{name:'Paginação de medicamentos do atendimento',exact:true});
  await nav.getByRole('button',{name:'Próxima',exact:true}).click();
  await expect(page.getByRole('article')).toHaveCount(1);
  await expect(page.getByRole('article').getByText('Medicamento sintético 1',{exact:true})).toBeVisible();
  const paginated = new URL(page.url());
  await signIn(page,'edicao',paginated.pathname+paginated.search);
  await expect(page.getByRole('article')).toHaveCount(1);
  expect(writes).toEqual([]);
  expect((await apiJson<unknown[]>('GET',`${path}?limit=100`)).length).toBe(21);
});

test('E5U leitura: consulta só lê, troca de origem, vazio, erro e acesso negado',async({page})=>{
  const p=await seedPatient('medicamentos vazio');const a=await seedAttendance(p.path);const path=`${a.path}/medicamentos`;
  await signIn(page,'consulta',path);
  await expect(page.getByText('Nenhum medicamento nesta página. Isso não significa ausência de uso.',{exact:true})).toBeVisible();
  await expect(page.locator('form')).toHaveCount(0);
  await page.route(`**/v1${path}?*`,route=>route.fulfill({status:503,contentType:'application/json',
    body:JSON.stringify({statusCode:503,error:'Service Unavailable',message:'Serviço temporariamente indisponível'})}));
  await signIn(page,'consulta',path);await expect(page.getByText(/Não foi possível|temporariamente indisponível/).first()).toBeVisible();
  await expect(page.getByRole('article')).toHaveCount(0);
  await page.unroute(`**/v1${path}?*`);await signIn(page,'consulta',path);
  await expect(page.getByText('Nenhum medicamento nesta página. Isso não significa ausência de uso.',{exact:true})).toBeVisible();
  await apiJson('PUT',`${p.path}/acesso/${(await import('./fixtures')).fixture.users.consulta.usuarioId}`,{ativo:false,podeEditar:false});
  await signIn(page,'consulta',path);await expect(page.getByRole('article')).toHaveCount(0);
  await expect(page.getByText(/não autorizado|permissão|acesso negado/i).first()).toBeVisible();
});
