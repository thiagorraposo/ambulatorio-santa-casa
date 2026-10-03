import { INestApplication } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Test } from '@nestjs/testing';
import { Pool } from 'pg';
import request from 'supertest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { AppModule } from '../../src/app.module';
import { configureApp } from '../../src/bootstrap';

const suite = process.env.TEST_CLINICAL_DB && process.env.REVISION_HTTP_ENABLED === 'true' ? describe : describe.skip;
suite('Dry-run XLSX de revisão HTTP → SQL50 em banco descartável', () => {
  let app: INestApplication; let owner: Pool; let actorId: string; let unentitledActorId: string;
  let reviewerId: string; let fonteId: string; let autorizacaoId: string; let baseLotId: string;
  let token: string; let unentitledToken: string;
  const sourceXlsx = resolve(process.cwd(), '../tests/fixtures/planilha_importacao_v1_sintetica.xlsx');
  const manifestText = readFileSync(resolve(process.cwd(), '../manifestos/planilha_ambulatorio_v1.json'), 'utf8');
  const manifest = JSON.parse(manifestText) as { layout_versao: string; sheets: Array<{
    aba_nome_original: string; aba_ordem: number; columns: unknown[];
  }> };

  beforeAll(async () => {
    if (!/^etapa5_clinical_\d+_\d+$/.test(process.env.TEST_CLINICAL_DB!)) throw new Error('Banco descartável obrigatório');
    owner = new Pool({ host: process.env.TEST_OWNER_HOST, port: Number(process.env.TEST_OWNER_PORT),
      user: process.env.TEST_OWNER_USER, password: process.env.TEST_OWNER_PASSWORD, database: process.env.TEST_CLINICAL_DB });
    const user = await owner.query(`INSERT INTO ambulatorio.usuario_aplicacao(nome,login,senha_hash,perfil)
      VALUES('Revisor XLSX sintético','revisor-xlsx-' || txid_current() || '@example.invalid',
        '$2b$12$AHXFrksRrsnCtxc0yzPeSO3XHF94Quhjtu/5RZVYwRyvU6alPJXSK','administracao')
      RETURNING usuario_id::text`);
    actorId = user.rows[0].usuario_id;
    const unentitled = await owner.query(`INSERT INTO ambulatorio.usuario_aplicacao(nome,login,senha_hash,perfil)
      VALUES('Admin sem entitlement sintético','admin-sem-entitlement-' || txid_current() || '@example.invalid',
        '$2b$12$AHXFrksRrsnCtxc0yzPeSO3XHF94Quhjtu/5RZVYwRyvU6alPJXSK','administracao')
      RETURNING usuario_id::text`);
    unentitledActorId = unentitled.rows[0].usuario_id;
    const reviewer = await owner.query(`INSERT INTO ambulatorio.usuario_aplicacao(nome,login,senha_hash,perfil)
      VALUES('Revisor por fonte sintético','revisor-por-fonte-' || txid_current() || '@example.invalid',
        '$2b$12$AHXFrksRrsnCtxc0yzPeSO3XHF94Quhjtu/5RZVYwRyvU6alPJXSK','edicao')
      RETURNING usuario_id::text`);
    reviewerId = reviewer.rows[0].usuario_id;
    await owner.query('INSERT INTO ambulatorio.importacao_revisao_gestor(usuario_id) VALUES($1)', [actorId]);
    const patient = await owner.query("INSERT INTO ambulatorio.paciente(nome) VALUES('Paciente base de revisão sintético') RETURNING paciente_id::text");
    const attendance = await owner.query(`INSERT INTO ambulatorio.atendimento(paciente_id,data_atendimento)
      VALUES($1,'2026-10-01') RETURNING atendimento_id::text`, [patient.rows[0].paciente_id]);
    const lot = await owner.query(`INSERT INTO ambulatorio.importacao_lote
      (codigo_lote,hash_arquivo_sha256,layout_versao,status_lote,manifesto_sha256,importador_versao,revisao_git,iniciado_em,finalizado_em)
      VALUES('revisao-http-base-' || txid_current(),repeat('a',64),$1,'concluido',repeat('b',64),'1.7.0','abcdef0',now(),now())
      RETURNING importacao_lote_id::text`, [manifest.layout_versao]);
    baseLotId = lot.rows[0].importacao_lote_id;
    const line = await owner.query(`INSERT INTO ambulatorio.importacao_linha
      (importacao_lote_id,aba_nome_original,aba_ordem,numero_linha,dados_brutos,status_linha)
      VALUES($1,'Sintética',1,2,'[]'::jsonb,'importada') RETURNING importacao_linha_id::text`, [baseLotId]);
    await owner.query(`INSERT INTO ambulatorio.importacao_registro(importacao_linha_id,tabela_destino,registro_id,acao)
      VALUES($1,'paciente',$2,'criado'),($1,'atendimento',$3,'criado')`,
    [line.rows[0].importacao_linha_id, patient.rows[0].paciente_id, attendance.rows[0].atendimento_id]);

    const module = await Test.createTestingModule({ imports: [AppModule] }).compile();
    app = module.createNestApplication(); configureApp(app); await app.init();
    token = await app.get(JwtService).signAsync({ sub: actorId, typ: 'access' });
    unentitledToken = await app.get(JwtService).signAsync({ sub: unentitledActorId, typ: 'access' });
  });
  afterAll(async () => { await app?.close(); await owner?.end(); });

  it('usa o XLSX real no simulador read-only e valida autorização na fronteira SQL', async () => {
    await request(app.getHttpServer()).post('/importacoes/revisoes/fontes').auth(unentitledToken, { type: 'bearer' })
      .send({ codigoFonte: 'fonte-nao-autorizada', loteInicialId: baseLotId }).expect(403);

    const source = await request(app.getHttpServer()).post('/importacoes/revisoes/fontes')
      .auth(token, { type: 'bearer' }).send({ codigoFonte: `fonte-http-${Date.now()}`, loteInicialId: baseLotId }).expect(201);
    fonteId = source.body.fonteId;
    const selfAuthorization = await request(app.getHttpServer()).post('/importacoes/revisoes/autorizacoes')
      .auth(token, { type: 'bearer' }).send({ fonteId, usuarioId: actorId }).expect(201);
    autorizacaoId = selfAuthorization.body.autorizacaoId;
    const otherAuthorization = await request(app.getHttpServer()).post('/importacoes/revisoes/autorizacoes')
      .auth(token, { type: 'bearer' }).send({ fonteId, usuarioId: reviewerId }).expect(201);
    await request(app.getHttpServer()).post('/importacoes/revisoes/autorizacoes/revogar')
      .auth(token, { type: 'bearer' }).send({ autorizacaoId: otherAuthorization.body.autorizacaoId }).expect(201);
    const revoked = await owner.query(`SELECT revogada_por_usuario_id::text FROM ambulatorio.importacao_revisao_autorizacao
      WHERE autorizacao_id=$1`, [otherAuthorization.body.autorizacaoId]);
    expect(revoked.rows[0].revogada_por_usuario_id).toBe(actorId);

    const proposal = { linhas: [{ linhaBaseId: null, pacienteId: null, atendimentoBaseId: null,
      abaNomeOriginal: manifest.sheets[0].aba_nome_original, abaOrdem: manifest.sheets[0].aba_ordem,
      numeroLinha: 2, resultado: 'bloquear', campos: [] }] };
    const submit = (authorizationId: string) => request(app.getHttpServer()).post('/importacoes/revisoes/propostas/arquivo/simular')
      .auth(token, { type: 'bearer' }).field('fonteId', fonteId).field('loteBaseId', baseLotId)
      .field('autorizacaoId', authorizationId).field('manifestoRevisado', manifestText)
      .field('transformacoes', JSON.stringify({ formato: 'revisao-transformacoes/v1', regras: [] }))
      .field('proposta', JSON.stringify(proposal)).attach('arquivo', sourceXlsx);

    const result = await submit(autorizacaoId).expect(201);
    expect(result.body).toMatchObject({ resultado: 'sem_aplicacao', quantidadeLinhas: 1, aptas: 0, bloqueadas: 1 });
    expect(result.body.linhas[0]).toMatchObject({ resultado: 'bloqueada', codigo: 'revisao_linha_bloqueada', numeroLinha: 2 });
    expect(JSON.stringify(result.body)).not.toMatch(/Paciente|nome|dadosBrutos|mensagem|stack/i);
    await submit('9223372036854775807').expect(403);
  });
});
