import { expect,test } from '@playwright/test';
import { apiJson,seedPatient,seedAttendance,signIn,assertAccessible,assertFitsViewport,loseResponseAfterCommit } from './stage7-helpers';
test('E4U óbito: positivo sem data/causa, revisão e recibo de COMMIT perdido',async({page},info)=>{
 const p=await seedPatient('Óbito UI sintético');const a=await seedAttendance(p.path);const path=`${p.path}/obito`;
 await signIn(page,'edicao',a.path);await page.getByRole('link',{name:'Estado de óbito do paciente',exact:true}).click();
 await expect(page.getByRole('link',{name:/Voltar à origem/})).toHaveAttribute('href',a.path);
 await page.getByRole('link',{name:'Registrar estado de óbito',exact:true}).click();
 await page.getByLabel('Óbito informado',{exact:true}).selectOption('sim');
 for(const width of [320,390,1440]){await page.setViewportSize({width,height:width===1440?960:844});await assertFitsViewport(page);await assertAccessible(page);await page.screenshot({path:info.outputPath(`obito-${width}.png`),fullPage:true});}
 await page.getByRole('button',{name:'Revisar estado de óbito',exact:true}).click();
 await expect(page.getByRole('heading',{name:'Revisão do estado de óbito',exact:true})).toBeFocused();
 await expect(page.getByRole('region',{name:'Resumo do estado de óbito',exact:true}).locator('dt')).toHaveCount(4);
 const lost=await loseResponseAfterCommit(page,'POST',path);await page.getByRole('button',{name:'Confirmar estado de óbito',exact:true}).click();
 const saved=await lost.committed;expect(saved.status()).toBe(201);const id=(await saved.json()).obitoId;
 await page.getByRole('button',{name:'Verificar resultado do envio',exact:true}).click();
 await expect(page.getByRole('heading',{name:`Estado confirmado ${id}`,exact:true})).toBeVisible();expect(lost.writes()).toBe(1);
 expect(await apiJson('GET',path)).toEqual({obitoId:id,pacienteId:p.pacienteId,houveObito:true,dataObito:null,causaObito:null,observacoes:null});
 await page.getByRole('link',{name:'Conferir estado do paciente',exact:true}).first().click();
 await expect(page.getByRole('link',{name:'Registrar estado de óbito',exact:true})).toHaveCount(0);
});
test('E4U óbito: negativa preserva data/causa e rascunho, consulta não escreve',async({page})=>{
 const p=await seedPatient('Óbito campos independentes');const path=`${p.path}/obito`;
 await signIn(page,'edicao',`${path}/nova`);
 await page.getByLabel('Data completa do óbito',{exact:true}).fill('2026-02-01');
 await page.getByLabel('Causa informada',{exact:true}).fill('  Texto sintético independente  ');
 await page.getByLabel('Observações do estado',{exact:true}).fill('Relato em revisão');
 await page.getByLabel('Óbito informado',{exact:true}).selectOption('nao');
 await page.getByRole('link',{name:/Voltar ao estado de óbito/}).click();
 await page.getByRole('dialog',{name:'Alterações não salvas',exact:true}).getByRole('button',{name:'Sair e manter rascunho',exact:true}).click();
 await page.getByRole('link',{name:'Registrar estado de óbito',exact:true}).click();
 await expect(page.getByLabel('Causa informada',{exact:true})).toHaveValue('  Texto sintético independente  ');
 await expect(page.getByLabel('Data completa do óbito',{exact:true})).toHaveValue('2026-02-01');
 await page.getByRole('button',{name:'Revisar estado de óbito',exact:true}).click();
 const saved=page.waitForResponse(r=>r.request().method()==='POST'&&new URL(r.url()).pathname===`/v1${path}`);
 await page.getByRole('button',{name:'Confirmar estado de óbito',exact:true}).click();expect((await saved).status()).toBe(201);
 expect(await apiJson('GET',path)).toMatchObject({houveObito:false,dataObito:'2026-02-01',causaObito:'  Texto sintético independente  ',observacoes:'Relato em revisão'});
 await signIn(page,'consulta',path);await expect(page.getByRole('link',{name:'Registrar estado de óbito',exact:true})).toHaveCount(0);
 await signIn(page,'consulta',`${path}/nova`);await expect(page.getByRole('heading',{name:'Acesso de consulta',exact:true})).toBeVisible();
});
