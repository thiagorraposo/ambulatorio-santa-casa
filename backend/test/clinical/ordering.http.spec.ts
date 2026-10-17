import { INestApplication } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Test } from '@nestjs/testing';
import { Pool } from 'pg';
import { createHash } from 'node:crypto';
import request from 'supertest';
import { AppModule } from '../../src/app.module';
import { configureApp } from '../../src/bootstrap';

const suite = process.env.TEST_CLINICAL_DB ? describe : describe.skip;
// Explicit IDs cross decimal width and exceed MAX_SAFE_INTEGER, without changing
// sequences or depending on IDs allocated by another clinical fixture.
const orderedIds = ['999999999999999999', '1000000000000000000', '1000000000000000001'];

suite('Ordenação numérica dos identificadores clínicos e de importação', () => {
  let app: INestApplication;
  let owner: Pool;
  let patient: string;
  let attendance: string;
  const users: Record<string, string> = {};
  const tokens: Record<string, string> = {};
  const http = () => request(app.getHttpServer());
  const patientPath = () => `/pacientes/${patient}`;
  const attendancePath = () => `${patientPath()}/atendimentos/${attendance}`;

  beforeAll(async () => {
    if (!/^etapa5_clinical_\d+_\d+$/.test(process.env.TEST_CLINICAL_DB!)) throw new Error('Banco descartável obrigatório');
    owner = new Pool({ host: process.env.TEST_OWNER_HOST, port: Number(process.env.TEST_OWNER_PORT),
      user: process.env.TEST_OWNER_USER, password: process.env.TEST_OWNER_PASSWORD, database: process.env.TEST_CLINICAL_DB });
    for (const perfil of ['consulta', 'edicao', 'administracao', 'sem-vinculo']) {
      users[perfil] = (await owner.query(`INSERT INTO ambulatorio.usuario_aplicacao(nome,login,senha_hash,perfil)
        VALUES($1,$2,$3,$4) RETURNING usuario_id::text`, [`Ordenação ${perfil} sintética`,
      `ordering-${perfil}@example.invalid`, '$2b$12$AHXFrksRrsnCtxc0yzPeSO3XHF94Quhjtu/5RZVYwRyvU6alPJXSK',
      perfil === 'sem-vinculo' ? 'edicao' : perfil])).rows[0].usuario_id;
    }
    patient = (await owner.query(`INSERT INTO ambulatorio.paciente(nome)
      VALUES('Paciente de ordenação sintético') RETURNING paciente_id::text`)).rows[0].paciente_id;
    for (const perfil of ['consulta', 'edicao']) await owner.query(`INSERT INTO ambulatorio.acesso_paciente
      (paciente_id,usuario_id,pode_editar,concedido_por_usuario_id) VALUES($1,$2,$3,$4)`,
    [patient, users[perfil], perfil === 'edicao', users.administracao]);
    attendance = (await owner.query(`INSERT INTO ambulatorio.atendimento(paciente_id,data_atendimento)
      VALUES($1,'2020-01-01') RETURNING atendimento_id::text`, [patient])).rows[0].atendimento_id;
    const treatment = (await owner.query(`INSERT INTO ambulatorio.tratamento_benzonidazol(paciente_id,atendimento_id)
      VALUES($1,$2) RETURNING tratamento_benzonidazol_id::text`, [patient, attendance])).rows[0].tratamento_benzonidazol_id;
    for (const id of orderedIds) {
      await owner.query(`INSERT INTO ambulatorio.pendencia_atendimento(pendencia_atendimento_id,atendimento_id,descricao)
        VALUES($1,$2,'Pendência de ordenação sintética')`, [id, attendance]);
      await owner.query(`INSERT INTO ambulatorio.reacao_adversa_benzonidazol
        (reacao_adversa_benzonidazol_id,tratamento_benzonidazol_id,descricao)
        VALUES($1,$2,'Reação de ordenação sintética')`, [id, treatment]);
      await owner.query(`INSERT INTO ambulatorio.importacao_lote
        (importacao_lote_id,codigo_lote,hash_arquivo_sha256,layout_versao,status_lote)
        VALUES($1,$2,$3,'ordenacao-sintetica','concluido')`,
      [id, `ordering-${id}`, createHash('sha256').update(`ordering-${id}`).digest('hex')]);
      const line = (await owner.query(`INSERT INTO ambulatorio.importacao_linha
        (importacao_lote_id,aba_nome_original,aba_ordem,numero_linha,dados_brutos,status_linha)
        VALUES($1,'Sintética',1,2,'[]','importada') RETURNING importacao_linha_id::text`, [id])).rows[0].importacao_linha_id;
      await owner.query(`INSERT INTO ambulatorio.importacao_registro(importacao_linha_id,tabela_destino,registro_id,acao)
        VALUES($1,'paciente',$2,'associado')`, [line, patient]);
    }
    const module = await Test.createTestingModule({ imports: [AppModule] }).compile();
    app = module.createNestApplication(); configureApp(app); await app.init();
    for (const perfil of Object.keys(users)) tokens[perfil] = await app.get(JwtService).signAsync({ sub: users[perfil], typ: 'access' });
  });
  afterAll(async () => { await app?.close(); await owner?.end(); });

  it('preserva autenticação e vínculo nas três leituras', async () => {
    for (const path of [attendancePath(), `${patientPath()}/tratamento-bzn`, '/importacoes/lotes']) {
      await http().get(path).expect(401);
    }
    for (const path of [attendancePath(), `${patientPath()}/tratamento-bzn`]) {
      await http().get(path).auth(tokens['sem-vinculo'], { type: 'bearer' }).expect(403);
    }
    await http().get('/importacoes/lotes').auth(tokens['sem-vinculo'], { type: 'bearer' }).expect(200).expect([]);
  });

  it('pagina pendências do atendimento por ID bigint crescente nos três perfis', async () => {
    for (const perfil of ['consulta', 'edicao', 'administracao']) {
      for (const offset of [0, 1, 2, 3]) {
        const result = await http().get(`${attendancePath()}?limit=1&offset=${offset}`)
          .auth(tokens[perfil], { type: 'bearer' }).expect(200);
        expect(result.body.pendencias.map((row: { pendenciaId: string }) => row.pendenciaId)).toEqual(orderedIds.slice(offset, offset + 1));
      }
    }
  });

  it('retorna reações BZN em sequência numérica crescente nos três perfis', async () => {
    for (const perfil of ['consulta', 'edicao', 'administracao']) {
      const result = await http().get(`${patientPath()}/tratamento-bzn`).auth(tokens[perfil], { type: 'bearer' }).expect(200);
      expect(result.body.reacoes.map((row: { reacaoId: string }) => row.reacaoId)).toEqual(orderedIds);
    }
  });

  it('pagina lotes autorizados por ID bigint decrescente nos três perfis', async () => {
    const descending = [...orderedIds].reverse();
    for (const perfil of ['consulta', 'edicao', 'administracao']) {
      // Administrators can also see batches created by other suites.
      for (const offset of perfil === 'administracao' ? [0, 1, 2] : [0, 1, 2, 3]) {
        const result = await http().get(`/importacoes/lotes?limit=1&offset=${offset}`)
          .auth(tokens[perfil], { type: 'bearer' }).expect(200);
        expect(result.body.map((row: { loteId: string }) => row.loteId)).toEqual(descending.slice(offset, offset + 1));
      }
    }
  });
});
