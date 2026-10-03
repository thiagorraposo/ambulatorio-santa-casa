import { INestApplication } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Test } from '@nestjs/testing';
import { Pool } from 'pg';
import request from 'supertest';
import { AppModule } from '../../src/app.module';
import { configureApp } from '../../src/bootstrap';

const suite = process.env.TEST_CLINICAL_DB ? describe : describe.skip;

suite('Acompanhamento sanitizado de importações HTTP', () => {
  let app: INestApplication;
  let owner: Pool;
  const ids: Record<string, string> = {};
  const tokens: Record<string, string> = {};
  const lotId: string[] = [];
  const patientId: string[] = [];
  const scopedLot: string[] = [];
  const mixedLot: string[] = [];
  const http = () => request(app.getHttpServer());

  beforeAll(async () => {
    if (!/^etapa5_clinical_\d+_\d+$/.test(process.env.TEST_CLINICAL_DB!)) throw new Error('Banco descartável obrigatório');
    owner = new Pool({ host: process.env.TEST_OWNER_HOST, port: Number(process.env.TEST_OWNER_PORT),
      user: process.env.TEST_OWNER_USER, password: process.env.TEST_OWNER_PASSWORD, database: process.env.TEST_CLINICAL_DB });
    for (const perfil of ['consulta', 'edicao', 'administracao']) {
      const result = await owner.query(`INSERT INTO ambulatorio.usuario_aplicacao(nome,login,senha_hash,perfil)
        VALUES($1,$2,$3,$4) RETURNING usuario_id::text`, [perfil, `import-errors-${perfil}@example.invalid`,
        '$2b$12$AHXFrksRrsnCtxc0yzPeSO3XHF94Quhjtu/5RZVYwRyvU6alPJXSK', perfil]);
      ids[perfil] = result.rows[0].usuario_id;
    }
    const createdLot = await owner.query(`INSERT INTO ambulatorio.importacao_lote
      (codigo_lote,hash_arquivo_sha256,layout_versao,status_lote,mensagem_erro)
      VALUES('erros-http-sinteticos-' || txid_current(),repeat('a',64),'teste_sintetico','falhou',
        'erro com VALOR_CLINICO_SINTETICO') RETURNING importacao_lote_id::text`);
    lotId.push(createdLot.rows[0].importacao_lote_id);
    await owner.query(`INSERT INTO ambulatorio.importacao_linha
      (importacao_lote_id,aba_nome_original,aba_ordem,numero_linha,dados_brutos,status_linha,mensagem_processamento)
      VALUES($1,'Sintetica',1,2,$2::jsonb,'rejeitada',$3),
            ($1,'Sintetica',1,3,'[]'::jsonb,'importada_com_pendencia',$4),
            ($1,'Sintetica',1,4,'[]'::jsonb,'importada','linha importada'),
            ($1,'Sintetica',1,5,'[]'::jsonb,'rejeitada',$5)`, [lotId[0],
      JSON.stringify([{ chave: 'diagnostico_chagas', valor: 'SEGREDO_CLINICO_SINTETICO' }]),
      'resultado original contém SEGREDO_CLINICO_SINTETICO: domínio inválido',
      'campos preservados em dados_brutos: dado clínico omitido',
      'identidade: múltiplos pacientes candidatos; SEGREDO_CLINICO_SINTETICO']);

    for (const label of ['A', 'B', 'sem-vínculo']) {
      const patient = await owner.query('INSERT INTO ambulatorio.paciente(nome) VALUES($1) RETURNING paciente_id::text',
        [`Paciente sintético importação ${label}`]);
      patientId.push(patient.rows[0].paciente_id);
    }
    const accepted = await owner.query(`INSERT INTO ambulatorio.importacao_lote
      (codigo_lote,hash_arquivo_sha256,layout_versao,status_lote)
      VALUES('escopo-aceito-' || txid_current(),repeat('b',64),'teste_sintetico','concluido')
      RETURNING importacao_lote_id::text`);
    scopedLot.push(accepted.rows[0].importacao_lote_id);
    const acceptedLines = await owner.query(`INSERT INTO ambulatorio.importacao_linha
      (importacao_lote_id,aba_nome_original,aba_ordem,numero_linha,dados_brutos,status_linha)
      VALUES($1,'Sintetica',1,2,'[]','importada'),($1,'Sintetica',1,3,'[]','importada')
      RETURNING importacao_linha_id::text`, [scopedLot[0]]);
    await owner.query(`INSERT INTO ambulatorio.importacao_registro(importacao_linha_id,tabela_destino,registro_id,acao)
      VALUES($1,'paciente',$3,'associado'),($2,'paciente',$4,'associado')`,
      [acceptedLines.rows[0].importacao_linha_id, acceptedLines.rows[1].importacao_linha_id, patientId[0], patientId[1]]);
    const mixed = await owner.query(`INSERT INTO ambulatorio.importacao_lote
      (codigo_lote,hash_arquivo_sha256,layout_versao,status_lote)
      VALUES('escopo-misto-' || txid_current(),repeat('c',64),'teste_sintetico','concluido')
      RETURNING importacao_lote_id::text`);
    mixedLot.push(mixed.rows[0].importacao_lote_id);
    const mixedLines = await owner.query(`INSERT INTO ambulatorio.importacao_linha
      (importacao_lote_id,aba_nome_original,aba_ordem,numero_linha,dados_brutos,status_linha)
      VALUES($1,'Sintetica',1,2,'[]','importada'),($1,'Sintetica',1,3,'[]','importada')
      RETURNING importacao_linha_id::text`, [mixedLot[0]]);
    await owner.query(`INSERT INTO ambulatorio.importacao_registro(importacao_linha_id,tabela_destino,registro_id,acao)
      VALUES($1,'paciente',$3,'associado'),($2,'paciente',$4,'associado')`,
      [mixedLines.rows[0].importacao_linha_id, mixedLines.rows[1].importacao_linha_id, patientId[0], patientId[2]]);

    const module = await Test.createTestingModule({ imports: [AppModule] }).compile();
    app = module.createNestApplication(); configureApp(app); await app.init();
    for (const perfil of Object.keys(ids)) tokens[perfil] = await app.get(JwtService).signAsync({ sub: ids[perfil], typ: 'access' });
  });
  afterAll(async () => { await app?.close(); await owner?.end(); });

  it('expõe códigos fechados de erro com filtro/paginação para os três perfis sem conteúdo original', async () => {
    await http().get(`/importacoes/lotes/${lotId[0]}?apenasComErro=true&limit=1&offset=0`).expect(401);
    for (const perfil of ['consulta', 'edicao']) await http().get(`/importacoes/lotes/${lotId[0]}?limit=1`)
      .auth(tokens[perfil], { type: 'bearer' }).expect(403);
    const first = await http().get(`/importacoes/lotes/${lotId[0]}?apenasComErro=true&limit=1&offset=0`)
      .auth(tokens.administracao, { type: 'bearer' }).expect(200);
    expect(first.body.codigoErro).toBe('falha_operacional');
    expect(first.body.possuiErro).toBe(true);
    expect(first.body.linhas).toHaveLength(1);
    expect(first.body.linhas[0]).toMatchObject({ possuiErro: true, codigoErro: 'dominio_invalido', numero: 2 });
    const second = await http().get(`/importacoes/lotes/${lotId[0]}?apenasComErro=true&limit=1&offset=1`)
      .auth(tokens.administracao, { type: 'bearer' }).expect(200);
    expect(second.body.linhas).toHaveLength(1);
    expect(second.body.linhas[0]).toMatchObject({ possuiErro: true,
      codigoErro: 'pendencia_nao_promovida', numero: 3 });
    const third = await http().get(`/importacoes/lotes/${lotId[0]}?apenasComErro=true&limit=1&offset=2`)
      .auth(tokens.administracao, { type: 'bearer' }).expect(200);
    expect(third.body.linhas[0]).toMatchObject({ possuiErro: true, codigoErro: 'identidade_ambigua', numero: 5 });
    const full = await http().get(`/importacoes/lotes/${lotId[0]}?limit=10`)
      .auth(tokens.administracao, { type: 'bearer' }).expect(200);
    expect(full.body.linhas).toHaveLength(4);
    expect(full.body.linhas[2]).toMatchObject({ possuiErro: false, codigoErro: null, numero: 4 });
    const serialized = JSON.stringify([first.body, second.body, third.body, full.body]);
    for (const forbidden of ['SEGREDO_CLINICO_SINTETICO', 'VALOR_CLINICO_SINTETICO',
      'mensagem_processamento', 'dados_brutos', 'stack']) expect(serialized).not.toContain(forbidden);
    await http().get(`/importacoes/lotes/${lotId[0]}?apenasComErro=sometimes`)
      .auth(tokens.consulta, { type: 'bearer' }).expect(400);
  });

  it('retorna orientação genérica para falha do worker sem reproduzir o erro ou os bytes enviados', async () => {
    const secret = 'SEGREDO_CLINICO_SINTETICO_NO_ARQUIVO';
    const response = await http().post('/importacoes').auth(tokens.edicao, { type: 'bearer' })
      .field('finalidade', 'carga_inicial').field('codigoLote', 'arquivo-sintetico-invalido')
      .attach('arquivo', Buffer.from(secret), 'arquivo-invalido.xlsx').expect(400);
    expect(response.body.message).toContain('consulte o lote e os erros sanitizados');
    expect(JSON.stringify(response.body)).not.toContain(secret);
    expect(JSON.stringify(response.body)).not.toMatch(/stack|Traceback|mensagem_processamento|dados_brutos/i);
  });

  it('limita lote à interseção completa de proveniência e vínculos ativos', async () => {
    await http().get(`/importacoes/lotes/${lotId[0]}`).auth(tokens.administracao, { type: 'bearer' }).expect(200);
    for (const patient of patientId.slice(0, 2)) {
      for (const perfil of ['consulta', 'edicao']) await http().put(`/pacientes/${patient}/acesso/${ids[perfil]}`)
        .auth(tokens.administracao, { type: 'bearer' }).send({ ativo: true, podeEditar: perfil === 'edicao' }).expect(200);
    }
    for (const perfil of ['consulta', 'edicao']) {
      const list = await http().get('/importacoes/lotes?limit=100').auth(tokens[perfil], { type: 'bearer' }).expect(200);
      expect(list.body.map((item: { loteId: string }) => item.loteId)).toContain(scopedLot[0]);
      expect(list.body.map((item: { loteId: string }) => item.loteId)).not.toContain(lotId[0]);
      expect(list.body.map((item: { loteId: string }) => item.loteId)).not.toContain(mixedLot[0]);
      const detail = await http().get(`/importacoes/lotes/${scopedLot[0]}?limit=1`)
        .auth(tokens[perfil], { type: 'bearer' }).expect(200);
      expect(detail.body.linhas).toHaveLength(1);
      await http().get(`/importacoes/lotes/${mixedLot[0]}`).auth(tokens[perfil], { type: 'bearer' }).expect(403);
      await http().get('/importacoes/lotes/9223372036854775807').auth(tokens[perfil], { type: 'bearer' }).expect(404);
    }
    const administrator = await http().get('/importacoes/lotes?limit=100')
      .auth(tokens.administracao, { type: 'bearer' }).expect(200);
    expect(administrator.body.map((item: { loteId: string }) => item.loteId)).toContain(lotId[0]);
    expect(administrator.body.map((item: { loteId: string }) => item.loteId)).toContain(mixedLot[0]);
  });
});
