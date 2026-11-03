import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { JwtService } from '@nestjs/jwt';
import { Pool } from 'pg';
import request from 'supertest';
import { AppModule } from '../../src/app.module';
import { configureApp } from '../../src/bootstrap';

const suite = process.env.TEST_CLINICAL_DB ? describe : describe.skip;
suite('7B-E5B — consulta de medicamentos em PostgreSQL descartável', () => {
  let app: INestApplication;
  let owner: Pool;
  let patient: string;
  let other: string;
  let attendance: string;
  let secondAttendance: string;
  let otherAttendance: string;
  let catalogId: string;
  let itemId: string;
  let emptyId: string;
  const users: Record<string, string> = {};
  const tokens: Record<string, string> = {};
  const http = () => request(app.getHttpServer());
  const route = (a = attendance, p = patient) => `/v1/pacientes/${p}/atendimentos/${a}/medicamentos`;
  const get = (path: string, perfil = 'consulta') => http().get(path).auth(tokens[perfil], {type:'bearer'});
  const create = (path: string, body: object) => http().post(path).auth(tokens.administracao,{type:'bearer'}).send(body);
  beforeAll(async () => {
    const database = process.env.TEST_CLINICAL_DB!;
    if (!/^etapa5_clinical_\d+_\d+$/.test(database)) throw new Error('Banco descartável obrigatório');
    owner = new Pool({host:process.env.TEST_OWNER_HOST,port:Number(process.env.TEST_OWNER_PORT),
      user:process.env.TEST_OWNER_USER,password:process.env.TEST_OWNER_PASSWORD,database});
    for (const perfil of ['consulta','edicao','administracao']) {
      users[perfil] = (await owner.query(`INSERT INTO ambulatorio.usuario_aplicacao(nome,login,senha_hash,perfil)
        VALUES($1,$2,$3,$4) RETURNING usuario_id::text`,[perfil,`medicamentos-${perfil}@example.invalid`,
        '$2b$12$AHXFrksRrsnCtxc0yzPeSO3XHF94Quhjtu/5RZVYwRyvU6alPJXSK',perfil])).rows[0].usuario_id;
    }
    const module = await Test.createTestingModule({imports:[AppModule]}).compile();
    app = module.createNestApplication(); configureApp(app); await app.init();
    for (const perfil of Object.keys(users)) tokens[perfil] = await app.get(JwtService).signAsync({sub:users[perfil],typ:'access'});
    patient = (await create('/v1/pacientes',{nome:'Paciente medicamentos sintético A'}).expect(201)).body.pacienteId;
    other = (await create('/v1/pacientes',{nome:'Paciente medicamentos sintético B'}).expect(201)).body.pacienteId;
    for (const perfil of ['consulta','edicao']) await http().put(`/v1/pacientes/${patient}/acesso/${users[perfil]}`)
      .auth(tokens.administracao,{type:'bearer'}).send({ativo:true,podeEditar:perfil==='edicao'}).expect(200);
    attendance = (await create(`/v1/pacientes/${patient}/atendimentos`,{dataAtendimento:'2026-02-01'}).expect(201)).body.atendimentoId;
    secondAttendance = (await create(`/v1/pacientes/${patient}/atendimentos`,{dataAtendimento:'2026-02-02'}).expect(201)).body.atendimentoId;
    otherAttendance = (await create(`/v1/pacientes/${other}/atendimentos`,{dataAtendimento:'2026-02-03'}).expect(201)).body.atendimentoId;
    catalogId = (await owner.query(`INSERT INTO ambulatorio.medicamento(codigo_medicamento,nome_medicamento,
      principio_ativo,classe_medicamento,ativo) VALUES('med_leitura_sint','Medicamento sintético inativo',
      'Princípio literal','Classe literal',false) RETURNING medicamento_id::text`)).rows[0].medicamento_id;
    // Fixture de legado, criada pelo owner: o HTTP deste recorte não escreve.
    itemId = (await owner.query(`INSERT INTO ambulatorio.atendimento_medicamento
      (atendimento_id,medicamento_id,nome_medicamento_livre,tipo_registro,finalidade_uso,dose,via_administracao,
      frequencia,data_inicio,data_fim,uso_atual,prescrito_no_atendimento,status_uso,motivo,observacoes,
      valor_original_medicamento,valor_original_dose,valor_original_status)
      VALUES($1,$2,'Nome livre separado','uso_referido','outro','dose literal','via literal','frequência literal',
      '2026-01-10','2026-01-05',false,null,'desconhecido','Motivo literal','Observação literal',
      'BRUTO NÃO PUBLICAR','BRUTO NÃO PUBLICAR','BRUTO NÃO PUBLICAR') RETURNING atendimento_medicamento_id::text`,
      [attendance,catalogId])).rows[0].atendimento_medicamento_id;
    emptyId = (await owner.query(`INSERT INTO ambulatorio.atendimento_medicamento(atendimento_id)
      VALUES($1) RETURNING atendimento_medicamento_id::text`,[attendance])).rows[0].atendimento_medicamento_id;
    await owner.query(`INSERT INTO ambulatorio.atendimento_medicamento(atendimento_id,nome_medicamento_livre)
      VALUES($1,'Outra consulta'),($2,'Outro paciente')`,[secondAttendance,otherAttendance]);
  });
  afterAll(async () => {await app?.close();await owner?.end();});

  it('preserva todos os campos, null/negativa, catálogo inativo e datas legadas sem inferência', async () => {
    for (const perfil of ['consulta','edicao','administracao']) {
      const rows = (await get(route(),perfil).expect(200)).body;
      expect(rows).toHaveLength(2);
      expect(rows[0]).toMatchObject({atendimentoMedicamentoId:emptyId,medicamentoId:null,
        nomeMedicamento:null,principioAtivo:null,usoAtual:null,prescritoNoAtendimento:null});
      expect(rows[1]).toEqual({atendimentoMedicamentoId:itemId,atendimentoId:attendance,medicamentoId:catalogId,
        codigoMedicamento:'med_leitura_sint',nomeMedicamento:'Medicamento sintético inativo',
        principioAtivo:'Princípio literal',classeMedicamento:'Classe literal',nomeMedicamentoLivre:'Nome livre separado',
        tipoRegistro:'uso_referido',finalidadeUso:'outro',dose:'dose literal',viaAdministracao:'via literal',
        frequencia:'frequência literal',dataInicio:'2026-01-10',dataFim:'2026-01-05',usoAtual:false,
        prescritoNoAtendimento:null,statusUso:'desconhecido',motivo:'Motivo literal',observacoes:'Observação literal'});
      expect(JSON.stringify(rows)).not.toMatch(/BRUTO|valor_original|criado_em|atualizado_em/);
    }
  });
  it('pagina e isola consultas do mesmo paciente sem consolidação', async () => {
    expect((await get(`${route()}?limit=1`).expect(200)).body[0].atendimentoMedicamentoId).toBe(emptyId);
    expect((await get(`${route()}?limit=1&offset=1`).expect(200)).body[0].atendimentoMedicamentoId).toBe(itemId);
    await get(`${route()}?offset=100000`).expect(200).expect([]);
    const second = (await get(route(secondAttendance)).expect(200)).body;
    expect(second).toHaveLength(1);expect(second[0].nomeMedicamentoLivre).toBe('Outra consulta');
    const emptyAttendance = (await create(`/v1/pacientes/${patient}/atendimentos`,{dataAtendimento:'2026-02-04'}).expect(201)).body.atendimentoId;
    await get(route(emptyAttendance)).expect(200).expect([]);
  });
  it('recusa ausência de vínculo, paciente/consulta trocados, ID inválido e credenciais', async () => {
    await get(route(otherAttendance,other)).expect(403);
    await get(route(otherAttendance)).expect(404);
    await get(route(attendance,other),'administracao').expect(404);
    for (const id of ['0','abc','9223372036854775808']) await get(route(id)).expect(400);
    await http().get(route()).expect(401);
    await http().get(route()).auth('invalido',{type:'bearer'}).expect(401);
    for (const q of ['limit=0','limit=101','offset=-1','ativo=true']) await get(`${route()}?${q}`).expect(400);
  });
  it('não oferece escrita e respeita revogação de vínculo sem alterar legado', async () => {
    const before = (await owner.query('SELECT count(*)::text AS n FROM ambulatorio.atendimento_medicamento')).rows[0].n;
    await http().post(route()).auth(tokens.administracao,{type:'bearer'}).send({dose:'Não escrever'}).expect(404);
    await http().patch(route()).auth(tokens.edicao,{type:'bearer'}).send({dose:'Não escrever'}).expect(404);
    await owner.query('UPDATE ambulatorio.acesso_paciente SET ativo=false WHERE paciente_id=$1 AND usuario_id=$2',[patient,users.consulta]);
    await get(route()).expect(403);
    expect((await owner.query('SELECT count(*)::text AS n FROM ambulatorio.atendimento_medicamento')).rows[0].n).toBe(before);
  });
});
