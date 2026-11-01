import { INestApplication } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Test } from '@nestjs/testing';
import { Pool } from 'pg';
import request from 'supertest';
import { AppModule } from '../../src/app.module';
import { configureApp } from '../../src/bootstrap';

const suite = process.env.TEST_CLINICAL_DB ? describe : describe.skip;
const catalogos = [
  { rota: 'exames', tabela: 'tipo_exame_complementar', id: 'tipo_exame_complementar_id', codigo: 'codigo_exame', nome: 'nome_exame' },
  { rota: 'projetos', tabela: 'projeto_estudo', id: 'projeto_estudo_id', codigo: 'codigo_projeto', nome: 'nome_projeto' },
  { rota: 'tipos-encaminhamento', tabela: 'tipo_encaminhamento', id: 'tipo_encaminhamento_id', codigo: 'codigo_tipo', nome: 'nome_tipo' },
] as const;

suite('Catálogos HTTP no banco descartável', () => {
  let app: INestApplication;
  let owner: Pool;
  const ids: Record<string, string> = {};
  const tokens: Record<string, string> = {};
  const options: Record<string, { id: string; codigo: string; nome: string; ativo: boolean }[]> = {};
  const http = () => request(app.getHttpServer());

  beforeAll(async () => {
    if (!/^etapa5_clinical_\d+_\d+$/.test(process.env.TEST_CLINICAL_DB!)) throw new Error('Banco descartável obrigatório');
    owner = new Pool({ host: process.env.TEST_OWNER_HOST, port: Number(process.env.TEST_OWNER_PORT),
      user: process.env.TEST_OWNER_USER, password: process.env.TEST_OWNER_PASSWORD, database: process.env.TEST_CLINICAL_DB });
    for (const perfil of ['consulta', 'edicao', 'administracao']) {
      const result = await owner.query(`INSERT INTO ambulatorio.usuario_aplicacao(nome,login,senha_hash,perfil)
        VALUES($1,$2,$3,$4) RETURNING usuario_id::text`, [perfil, `catalogos-${perfil}@example.invalid`,
        '$2b$12$AHXFrksRrsnCtxc0yzPeSO3XHF94Quhjtu/5RZVYwRyvU6alPJXSK', perfil]);
      ids[perfil] = result.rows[0].usuario_id;
    }
    for (const c of catalogos) {
      // IDs grandes pertencem à fixture criada aqui; não dependem dos IDs dos seeds.
      const inserted = await owner.query(`INSERT INTO ambulatorio.${c.tabela}(${c.id},${c.codigo},${c.nome},ativo)
        VALUES($1,$2,$3,true),($4,$5,$3,true),($6,$7,$3,false)
        RETURNING ${c.id}::text AS id,${c.codigo} AS codigo,${c.nome} AS nome,ativo`, [
        '9007199254740993', `teste_etapa7_${c.rota}_a`, '000 Catálogo Sintético Etapa 7',
        '9007199254740994', `teste_etapa7_${c.rota}_b`,
        '9007199254740995', `teste_etapa7_${c.rota}_inativo`,
      ]);
      options[c.rota] = inserted.rows;
    }
    const module = await Test.createTestingModule({ imports: [AppModule] }).compile();
    app = module.createNestApplication(); configureApp(app); await app.init();
    for (const perfil of Object.keys(ids)) tokens[perfil] = await app.get(JwtService).signAsync({ sub: ids[perfil], typ: 'access' });
  });

  afterAll(async () => { await app?.close(); await owner?.end(); });

  it.each(catalogos)('lista $rota somente com ativos nos três perfis, sem vínculo de paciente', async (c) => {
    const expected = (await owner.query(`SELECT ${c.id}::text AS id,${c.codigo} AS codigo,${c.nome} AS nome,ativo
      FROM ambulatorio.${c.tabela} WHERE ativo ORDER BY ${c.nome},${c.id} LIMIT 100`)).rows;
    for (const perfil of ['consulta', 'edicao', 'administracao']) {
      const response = await http().get(`/v1/catalogos/${c.rota}?limit=100`).auth(tokens[perfil], { type: 'bearer' }).expect(200);
      expect(response.body).toEqual(expected);
      expect(response.body).toEqual(expect.arrayContaining(options[c.rota].filter((item) => item.ativo)));
      expect(response.body.every((item: { ativo: boolean; id: unknown }) => item.ativo && typeof item.id === 'string')).toBe(true);
      expect(response.body.some((item: { id: string }) => item.id === options[c.rota].find((option) => !option.ativo)!.id)).toBe(false);
    }
  });

  it.each(catalogos)('pagina $rota com ordem estável inclusive quando nomes coincidem', async (c) => {
    const expected = (await owner.query(`SELECT ${c.id}::text AS id FROM ambulatorio.${c.tabela}
      WHERE ativo ORDER BY ${c.nome},${c.id} LIMIT 2`)).rows;
    const first = await http().get(`/v1/catalogos/${c.rota}?limit=1`).auth(tokens.consulta, { type: 'bearer' }).expect(200);
    const second = await http().get(`/v1/catalogos/${c.rota}?limit=1&offset=1`).auth(tokens.consulta, { type: 'bearer' }).expect(200);
    expect(first.body).toHaveLength(1); expect(second.body).toHaveLength(1);
    expect([first.body[0].id, second.body[0].id]).toEqual(expected.map((item: { id: string }) => item.id));
    expect(first.body[0].id).not.toBe(second.body[0].id);
    await http().get(`/v1/catalogos/${c.rota}?offset=100000`).auth(tokens.consulta, { type: 'bearer' }).expect(200).expect([]);
    await http().get(`/v1/catalogos/${c.rota}?limit=0`).auth(tokens.consulta, { type: 'bearer' }).expect(400);
    await http().get(`/v1/catalogos/${c.rota}?limit=101`).auth(tokens.consulta, { type: 'bearer' }).expect(400);
    await http().get(`/v1/catalogos/${c.rota}?offset=-1`).auth(tokens.consulta, { type: 'bearer' }).expect(400);
    await http().get(`/v1/catalogos/${c.rota}?ativo=false`).auth(tokens.consulta, { type: 'bearer' }).expect(400);
  });

  it('consulta comorbidades ativas nos três perfis sem fabricar código ou dados de paciente', async () => {
    const inserted = await owner.query(`INSERT INTO ambulatorio.comorbidade
      (nome_comorbidade,descricao,ativo) VALUES
      ('000 A Comorbidade sintética','Descrição interna A',true),
      ('000 B Comorbidade sintética','Descrição interna B',true),
      ('000 C Comorbidade inativa sintética','Descrição interna C',false)
      RETURNING comorbidade_id::text AS id,nome_comorbidade AS nome,ativo`);
    const expected = (await owner.query(`SELECT comorbidade_id::text AS id,nome_comorbidade AS nome,ativo
      FROM ambulatorio.comorbidade WHERE ativo ORDER BY nome_comorbidade,comorbidade_id LIMIT 100`)).rows;
    const before = (await owner.query('SELECT count(*)::int AS n FROM ambulatorio.paciente_comorbidade')).rows[0].n;
    for (const perfil of ['consulta','edicao','administracao']) {
      const response = await http().get('/v1/catalogos/comorbidades?limit=100').auth(tokens[perfil], { type: 'bearer' }).expect(200);
      expect(response.body).toEqual(expected);
      expect(response.body).toEqual(expect.arrayContaining(inserted.rows.filter(row => row.ativo)));
      expect(response.body.every((row: Record<string, unknown>) => Object.keys(row).sort().join(',') === 'ativo,id,nome')).toBe(true);
      expect(response.body.some((row: { id: string }) => row.id === inserted.rows.find(row => !row.ativo).id)).toBe(false);
    }
    expect((await owner.query('SELECT count(*)::int AS n FROM ambulatorio.paciente_comorbidade')).rows[0].n).toBe(before);
  });

  it('pagina comorbidades e recusa entrada extra/credencial ausente sem oferecer escrita', async () => {
    const expected = (await owner.query(`SELECT comorbidade_id::text AS id FROM ambulatorio.comorbidade
      WHERE ativo ORDER BY nome_comorbidade,comorbidade_id LIMIT 2`)).rows;
    const first = await http().get('/v1/catalogos/comorbidades?limit=1').auth(tokens.consulta, { type: 'bearer' }).expect(200);
    const second = await http().get('/v1/catalogos/comorbidades?limit=1&offset=1').auth(tokens.consulta, { type: 'bearer' }).expect(200);
    expect([first.body[0].id,second.body[0].id]).toEqual(expected.map(row => row.id));
    await http().get('/v1/catalogos/comorbidades?offset=100000').auth(tokens.consulta, { type: 'bearer' }).expect(200).expect([]);
    for (const query of ['limit=0','limit=101','offset=-1','ativo=false','pacienteId=1']) {
      await http().get(`/v1/catalogos/comorbidades?${query}`).auth(tokens.consulta, { type: 'bearer' }).expect(400);
    }
    await http().get('/v1/catalogos/comorbidades').expect(401);
    await http().get('/v1/catalogos/comorbidades').auth('invalido', { type: 'bearer' }).expect(401);
    await http().post('/v1/catalogos/comorbidades').auth(tokens.administracao, { type: 'bearer' }).send({ nome: 'Não criar' }).expect(404);
  });


  it('consulta medicamentos ativos, IDs grandes e metadados nullable sem criar uso clínico', async () => {
    await owner.query(`INSERT INTO ambulatorio.medicamento
      (medicamento_id,codigo_medicamento,nome_medicamento,principio_ativo,classe_medicamento,ativo)
      VALUES(9007199254740993,'med_sint_a','000 Medicamento sintético',null,'Classe literal',true),
      (9007199254740994,'med_sint_b','000 Medicamento sintético','Princípio literal',null,true),
      (9007199254740995,'med_sint_inativo','000 Inativo sintético',null,null,false)`);
    const expected = (await owner.query(`SELECT medicamento_id::text AS id,codigo_medicamento AS codigo,
      nome_medicamento AS nome,ativo,principio_ativo AS "principioAtivo",classe_medicamento AS "classeMedicamento"
      FROM ambulatorio.medicamento WHERE ativo ORDER BY nome_medicamento,medicamento_id LIMIT 100`)).rows;
    const before = (await owner.query('SELECT count(*)::text AS n FROM ambulatorio.atendimento_medicamento')).rows[0].n;
    for (const perfil of ['consulta','edicao','administracao']) {
      const response = await http().get('/v1/catalogos/medicamentos?limit=100').auth(tokens[perfil], { type: 'bearer' }).expect(200);
      expect(response.body).toEqual(expected);
      expect(response.body.some((r: { id: string }) => r.id === '9007199254740995')).toBe(false);
    }
    expect(expected).toEqual(expect.arrayContaining([
      expect.objectContaining({id:'9007199254740993',principioAtivo:null,classeMedicamento:'Classe literal'}),
      expect.objectContaining({id:'9007199254740994',principioAtivo:'Princípio literal',classeMedicamento:null}),
    ]));
    expect((await owner.query('SELECT count(*)::text AS n FROM ambulatorio.atendimento_medicamento')).rows[0].n).toBe(before);
    const a = await http().get('/v1/catalogos/medicamentos?limit=1').auth(tokens.consulta,{type:'bearer'}).expect(200);
    const b = await http().get('/v1/catalogos/medicamentos?limit=1&offset=1').auth(tokens.consulta,{type:'bearer'}).expect(200);
    expect([a.body[0].id,b.body[0].id]).toEqual(expected.slice(0,2).map(row=>row.id));
    await http().get('/v1/catalogos/medicamentos?offset=100000').auth(tokens.consulta,{type:'bearer'}).expect(200).expect([]);
  });

  it('recusa paginação inválida, credenciais e escrita no catálogo de medicamentos', async () => {
    for (const query of ['limit=0','limit=101','offset=-1','pacienteId=1','ativo=false']) {
      await http().get(`/v1/catalogos/medicamentos?${query}`).auth(tokens.consulta,{type:'bearer'}).expect(400);
    }
    await http().get('/v1/catalogos/medicamentos').expect(401);
    await http().get('/v1/catalogos/medicamentos').auth('invalido',{type:'bearer'}).expect(401);
    const expired = await app.get(JwtService).signAsync({sub:ids.consulta,typ:'access'},{expiresIn:-1});
    await http().get('/v1/catalogos/medicamentos').auth(expired,{type:'bearer'}).expect(401);
    await owner.query('UPDATE ambulatorio.usuario_aplicacao SET ativo=false WHERE usuario_id=$1',[ids.edicao]);
    await http().get('/v1/catalogos/medicamentos').auth(tokens.edicao,{type:'bearer'}).expect(401);
    await owner.query('UPDATE ambulatorio.usuario_aplicacao SET ativo=true WHERE usuario_id=$1',[ids.edicao]);
    await http().post('/v1/catalogos/medicamentos').auth(tokens.administracao,{type:'bearer'}).send({nome:'Não criar'}).expect(404);
  });

  it('recusa ausência de credencial, token inválido/expirado e usuário desativado', async () => {
    for (const c of catalogos) {
      await http().get(`/v1/catalogos/${c.rota}`).expect(401);
      await http().get(`/v1/catalogos/${c.rota}`).auth('token-invalido', { type: 'bearer' }).expect(401);
    }
    const expired = await app.get(JwtService).signAsync({ sub: ids.consulta, typ: 'access' }, { expiresIn: -1 });
    await http().get('/v1/catalogos/exames').auth(expired, { type: 'bearer' }).expect(401);
    await owner.query('UPDATE ambulatorio.usuario_aplicacao SET ativo=false WHERE usuario_id=$1', [ids.consulta]);
    for (const c of catalogos) await http().get(`/v1/catalogos/${c.rota}`).auth(tokens.consulta, { type: 'bearer' }).expect(401);
  });
});
