import {expect,test} from '@playwright/test';
import {apiJson,seedPatient,seedAttendance,signIn,assertAccessible,assertFitsViewport,loseResponseAfterCommit} from './stage7-helpers';
import {fixture} from './fixtures';
async function setup(generic=false){
 const p=await seedPatient('Parâmetros de exames');
 const catalog=await apiJson<Array<{id:string;codigo:string}>>('GET','/catalogos/exames?limit=100');
 const tipo=catalog.find(c=>c.codigo===(generic?'outro':'holter'))!;
 const a=await seedAttendance(p.path,{exames:[{tipoExameId:tipo.id,bloco:'solicitado',...(generic?{identificacao:'Identificação sintética alfa'}:{})},{tipoExameId:tipo.id,bloco:'trazido',...(generic?{identificacao:'Identificação sintética beta'}:{})}]});
 const detail=await apiJson<{exames:Array<{exameId:string;nomeExame:string}>}>('GET',a.path);
 const exam=detail.exames[0];const other=detail.exames[1];
 return {p,a,exam,other,path:`${p.path}/exames/${exam.exameId}/resultados`};
}
test('E6U parâmetros: exame escolhido, seis campos, revisão e duas intenções com recuperação',async({page},info)=>{
 const {p,a,exam,other,path}=await setup();
 const parent=await apiJson('GET',`${p.path}/exames/${exam.exameId}`);
 await signIn(page,'edicao',`${a.path}?limit=10&offset=0`);
 await page.locator('summary').filter({hasText:`(ID ${exam.exameId})`}).click();
 const origin=new URL(page.url());
 await page.getByRole('link',{name:`Parâmetros do exame ${exam.nomeExame}, ID ${exam.exameId}`,exact:true}).click();
 await expect(page.getByRole('link',{name:'← Voltar à origem',exact:true})).toHaveAttribute('href',origin.pathname+origin.search+origin.hash);
 await expect(page.getByRole('heading',{name:`${exam.nomeExame} · exame ${exam.exameId}`,exact:true})).toBeVisible();
 await page.getByRole('link',{name:'Registrar parâmetro',exact:true}).click();
 await page.getByRole('button',{name:'Revisar parâmetro',exact:true}).click();
 await expect(page.getByLabel('Nome do parâmetro',{exact:true})).toBeFocused();
 const first={nomeParametro:'  Campo sintético alfa  ',valorInformado:'001,2300 ± relato',unidadeInformada:'Unidade literal alfa',
  referenciaInformada:'Referência alfa',interpretacaoInformada:'Interpretação humana literal alfa',observacoes:'Observações alfa'};
 const labels={nomeParametro:'Nome do parâmetro',valorInformado:'Valor informado',unidadeInformada:'Unidade informada',
  referenciaInformada:'Referência informada',interpretacaoInformada:'Interpretação informada',observacoes:'Observações do parâmetro'};
 for(const [key,label] of Object.entries(labels))await page.getByLabel(label,{exact:true}).fill(first[key as keyof typeof first]);
 await page.getByRole('link',{name:'← Voltar aos parâmetros',exact:true}).click();
 await page.getByRole('dialog',{name:'Alterações não salvas',exact:true}).getByRole('button',{name:'Sair e manter rascunho',exact:true}).click();
 await page.getByRole('link',{name:'Registrar parâmetro',exact:true}).click();
 await expect(page.getByLabel('Valor informado',{exact:true})).toHaveValue(first.valorInformado);
 for(const width of [1440,390,320]){await page.setViewportSize({width,height:width===1440?960:844});await assertFitsViewport(page);await assertAccessible(page);
  await page.screenshot({path:info.outputPath(`parametro-exame-${width}.png`),fullPage:true});}
 await page.getByRole('button',{name:'Revisar parâmetro',exact:true}).click();
 const review=page.getByRole('region',{name:'Resumo do parâmetro',exact:true});
 await expect(page.getByRole('heading',{name:'Revisão do parâmetro',exact:true})).toBeFocused();
 await expect(review.locator('dt')).toHaveCount(6);
 for(const [key,label]of Object.entries(labels))await expect(review.locator('dt').filter({hasText:new RegExp(`^${label}$`)}).locator('..').locator('dd')).toHaveText(first[key as keyof typeof first].trim());
 const lost=await loseResponseAfterCommit(page,'POST',path);await page.getByRole('button',{name:'Confirmar parâmetro',exact:true}).click();
 const sent=await lost.committed;expect(sent.status()).toBe(201);const id=(await sent.json()).resultadoId;
 await page.getByRole('button',{name:'Verificar resultado do envio',exact:true}).click();
 await expect(page.getByRole('heading',{name:`Parâmetro confirmado ${id}`,exact:true})).toBeVisible();expect(lost.writes()).toBe(1);
 await page.getByRole('button',{name:'Registrar outro parâmetro',exact:true}).click();
 await page.getByLabel('Nome do parâmetro',{exact:true}).fill('Campo beta');
 await page.getByRole('button',{name:'Revisar parâmetro',exact:true}).click();
 const sent2=page.waitForResponse(r=>r.request().method()==='POST'&&new URL(r.url()).pathname===`/v1${path}`);
 await page.getByRole('button',{name:'Confirmar parâmetro',exact:true}).click();const saved2=await sent2;expect(saved2.status()).toBe(201);
 const id2=(await saved2.json()).resultadoId;expect(id2).not.toBe(id);
 const rows=await apiJson<Array<Record<string,unknown>>>('GET',path);expect(rows).toHaveLength(2);
 expect(rows[1]).toEqual({...first,resultadoId:id,exameId:exam.exameId});
 expect(rows[0]).toMatchObject({resultadoId:id2,nomeParametro:'Campo beta',valorInformado:null,unidadeInformada:null,referenciaInformada:null,interpretacaoInformada:null});
 expect(await apiJson('GET',`${p.path}/exames/${exam.exameId}`)).toEqual(parent);
 expect(await apiJson('GET',`${p.path}/exames/${other.exameId}/resultados`)).toEqual([]);
 await page.getByRole('link',{name:'Conferir parâmetros do exame',exact:true}).last().click();
 await expect(page.getByRole('article')).toHaveCount(2);
});
test('E6U parâmetros: paginação persistente, perfil consulta, erro recuperável e revogação',async({page})=>{
 const {p,exam,path}=await setup();
 for(let n=1;n<=21;n++)await apiJson('POST',path,{nomeParametro:`Campo sintético ${n}`});
 await signIn(page,'consulta',path);await expect(page.getByRole('article')).toHaveCount(20);
 await expect(page.getByRole('link',{name:'Registrar parâmetro',exact:true})).toHaveCount(0);
 await page.getByRole('navigation',{name:'Paginação de parâmetros do exame',exact:true}).getByRole('button',{name:'Próxima',exact:true}).click();
 await expect(page.getByRole('article')).toHaveCount(1);await expect(page.getByRole('article').getByText('Campo sintético 1',{exact:true})).toBeVisible();
 await page.route(`**/v1${path}?*`,route=>route.fulfill({status:503,contentType:'application/json',
  body:JSON.stringify({statusCode:503,error:'Service Unavailable',message:'Serviço temporariamente indisponível'})}));
 await signIn(page,'consulta',path);await expect(page.getByText(/temporariamente indisponível|Não foi possível/).first()).toBeVisible();
 await expect(page.getByRole('article')).toHaveCount(0);
 await page.unroute(`**/v1${path}?*`);await signIn(page,'consulta',path);await expect(page.getByRole('article')).toHaveCount(20);
 await signIn(page,'consulta',`${path}/nova`);await expect(page.getByRole('heading',{name:'Acesso de consulta',exact:true})).toBeVisible();
 await apiJson('PUT',`${p.path}/acesso/${fixture.users.consulta.usuarioId}`,{ativo:false,podeEditar:false});
 await signIn(page,'consulta',path);await expect(page.getByText(/não autorizado|permissão|acesso negado/i).first()).toBeVisible();
 await expect(page.getByRole('article')).toHaveCount(0);
 expect((await apiJson<{exameId:string}>('GET',`${p.path}/exames/${exam.exameId}`)).exameId).toBe(exam.exameId);
});

test('E6U parâmetros: identificação genérica, descarte protegido e exame de outro paciente recusado',async({page})=>{
 const {p,exam,path}=await setup(true);
 const parent=await apiJson<{identificacao:string}>('GET',`${p.path}/exames/${exam.exameId}`);
 await signIn(page,'edicao',path);
 await expect(page.getByText(`Identificação informada: ${parent.identificacao} · bloco solicitado.`,{exact:true})).toBeVisible();
 await page.getByRole('link',{name:'Registrar parâmetro',exact:true}).click();
 await page.getByLabel('Nome do parâmetro',{exact:true}).fill('Rascunho sintético descartável');
 await page.getByRole('button',{name:'Descartar rascunho',exact:true}).click();
 await expect(page.getByRole('button',{name:'Continuar editando',exact:true})).toBeFocused();
 await page.keyboard.press('Escape');
 await expect(page.getByRole('button',{name:'Descartar rascunho',exact:true})).toBeFocused();
 await expect(page.getByLabel('Nome do parâmetro',{exact:true})).toHaveValue('Rascunho sintético descartável');
 await page.getByRole('button',{name:'Descartar rascunho',exact:true}).click();
 await page.getByRole('button',{name:'Confirmar descarte do rascunho',exact:true}).click();
 await expect(page.getByLabel('Nome do parâmetro',{exact:true})).toHaveValue('');
 expect(await apiJson('GET',path)).toEqual([]);
 const otherPatient=await seedPatient('Outro contexto de exame');
 await signIn(page,'edicao',`${otherPatient.path}/exames/${exam.exameId}/resultados/nova`);
 await expect(page.getByRole('alert')).toBeVisible();
 await expect(page.getByLabel('Nome do parâmetro',{exact:true})).toHaveCount(0);
 expect(await apiJson('GET',`${p.path}/exames/${exam.exameId}`)).toEqual(parent);
});
