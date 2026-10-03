import { INestApplication } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Test } from '@nestjs/testing';
import { Pool } from 'pg';
import request from 'supertest';
import { AppModule } from '../../src/app.module';
import { configureApp } from '../../src/bootstrap';

const suite = process.env.TEST_CLINICAL_DB ? describe : describe.skip;

suite('Versionamento URI HTTP compatível', () => {
  let app: INestApplication;
  let owner: Pool;
  let token: string;
  const http = () => request(app.getHttpServer());

  beforeAll(async () => {
    if (!/^etapa5_clinical_\d+_\d+$/.test(process.env.TEST_CLINICAL_DB!)) {
      throw new Error('Banco descartável obrigatório');
    }
    owner = new Pool({ host: process.env.TEST_OWNER_HOST, port: Number(process.env.TEST_OWNER_PORT),
      user: process.env.TEST_OWNER_USER, password: process.env.TEST_OWNER_PASSWORD,
      database: process.env.TEST_CLINICAL_DB });
    const user = await owner.query(`INSERT INTO ambulatorio.usuario_aplicacao(nome,login,senha_hash,perfil)
      VALUES('Usuário versionamento sintético',$1,'$2b$12$AHXFrksRrsnCtxc0yzPeSO3XHF94Quhjtu/5RZVYwRyvU6alPJXSK','consulta')
      RETURNING usuario_id::text`, [`versioning-${Date.now()}@example.invalid`]);
    const module = await Test.createTestingModule({ imports: [AppModule] }).compile();
    app = module.createNestApplication(); configureApp(app); await app.init();
    token = await app.get(JwtService).signAsync({ sub: user.rows[0].usuario_id, typ: 'access' });
  });

  afterAll(async () => { await app?.close(); await owner?.end(); });

  it('serve login/me e rotas clínicas tanto em /v1 quanto no alias legado', async () => {
    for (const prefix of ['/v1', '']) {
      await http().post(`${prefix}/auth/login`).send({ login: 'inexistente@example.invalid', senha: 'senha-sintetica' }).expect(401);
      const me = await http().get(`${prefix}/auth/me`).auth(token, { type: 'bearer' }).expect(200);
      expect(me.body.perfil).toBe('consulta');
      await http().get(`${prefix}/pacientes`).expect(401);
      await http().post(`${prefix}/pacientes`).auth(token, { type: 'bearer' })
        .send({ nome: 'Cadastro sintético não autorizado' }).expect(403);
    }
  });

  it('não publica versões que não foram declaradas', async () => {
    await http().get('/v2/auth/me').auth(token, { type: 'bearer' }).expect(404);
  });
});
