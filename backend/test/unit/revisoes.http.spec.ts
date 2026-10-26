import { INestApplication, ValidationPipe, ForbiddenException } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { Test } from '@nestjs/testing';
import { JwtModule, JwtService } from '@nestjs/jwt';
import request from 'supertest';
import { mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { AuthGuard } from '../../src/auth/auth.guard';
import { AuthService } from '../../src/auth/auth.service';
import { PerfisGuard } from '../../src/auth/perfis.guard';
import { RevisoesController } from '../../src/importacoes/revisoes.controller';
import { RevisoesService } from '../../src/importacoes/revisoes.service';

const execFileAsync = promisify(execFile);

const secret = 'chave-sintetica-de-teste-com-tamanho-minimo-superior-a-32-caracteres';
describe('Operações HTTP de revisão sintética', () => {
  let app: INestApplication;
  let jwt: JwtService;
  const api = { simulateProposal: jest.fn(), simulateWorkbookProposal: jest.fn(), prepare: jest.fn(), simulateDecision: jest.fn(), publishDecision: jest.fn() };

  beforeAll(async () => {
    const module = await Test.createTestingModule({
      imports: [JwtModule.register({ secret, signOptions: { algorithm: 'HS256' } })],
      controllers: [RevisoesController],
      providers: [
        { provide: RevisoesService, useValue: api },
        { provide: AuthService, useValue: { resolveIdentity: async (payload: { sub: string }) => ({
          usuarioId: payload.sub, nome: 'Operador Sintético', perfil: payload.sub === '2' ? 'edicao' : 'administracao',
        }) } },
        AuthGuard, PerfisGuard,
        { provide: APP_GUARD, useExisting: AuthGuard },
        { provide: APP_GUARD, useExisting: PerfisGuard },
      ],
    }).compile();
    app = module.createNestApplication();
    app.useGlobalPipes(new ValidationPipe({ transform: true, whitelist: true, forbidNonWhitelisted: true }));
    await app.init(); jwt = app.get(JwtService);
  });
  afterAll(async () => app.close());
  beforeEach(() => jest.clearAllMocks());
  const bearer = async (sub: string) => jwt.signAsync({ sub, typ: 'access' });
  const proposal = { fonteId: '1', loteBaseId: '2', autorizacaoId: '3', manifestoRevisado: '{}', transformacoes: '{}', proposta: { linhas: [] } };

  it('exige autenticação e perfil administrativo', async () => {
    await request(app.getHttpServer()).post('/importacoes/revisoes/propostas/simular').send(proposal).expect(401);
    await request(app.getHttpServer()).post('/importacoes/revisoes/propostas/simular')
      .auth(await bearer('2'), { type: 'bearer' }).send(proposal).expect(403);
    expect(api.simulateProposal).not.toHaveBeenCalled();
  });

  it('retorna 503 quando a camada opt-in está desabilitada', async () => {
    api.simulateProposal.mockRejectedValueOnce(new (await import('@nestjs/common')).ServiceUnavailableException('Revisão HTTP desabilitada neste ambiente'));
    await request(app.getHttpServer()).post('/importacoes/revisoes/propostas/simular')
      .auth(await bearer('1'), { type: 'bearer' }).send(proposal).expect(503);
  });

  it('recebe um XLSX real e encaminha a proposta pré-staging ao simulador', async () => {
    api.simulateWorkbookProposal.mockResolvedValue({ resultado: 'sem_dml', linhasAvaliadas: 1 });
    const workbook = resolve(process.cwd(), '../tests/fixtures/planilha_importacao_v1_sintetica.xlsx');
    const response = await request(app.getHttpServer()).post('/importacoes/revisoes/propostas/arquivo/simular')
      .auth(await bearer('1'), { type: 'bearer' })
      .field('fonteId', '1').field('loteBaseId', '2').field('autorizacaoId', '3')
      .field('manifestoRevisado', '{"sheets":[]}').field('transformacoes', '{}').field('proposta', '{"linhas":[]}')
      .attach('arquivo', workbook).expect(201, { resultado: 'sem_dml', linhasAvaliadas: 1 });
    expect(api.simulateWorkbookProposal).toHaveBeenCalledWith(expect.objectContaining({
      originalname: 'planilha_importacao_v1_sintetica.xlsx', size: expect.any(Number), buffer: expect.any(Buffer),
    }), expect.objectContaining({ fonteId: '1', loteBaseId: '2' }), '1');
    expect(response.body).toHaveProperty('resultado', 'sem_dml');
  });

  it('valida DTO antes de executar e mapeia autorização recusada', async () => {
    await request(app.getHttpServer()).post('/importacoes/revisoes/decisoes/simular')
      .auth(await bearer('1'), { type: 'bearer' }).send({ decisaoId: '0', autorizacaoId: '3', actorId: '999' }).expect(400);
    api.simulateDecision.mockRejectedValueOnce(new ForbiddenException('Autorização de revisão inválida ou insuficiente'));
    await request(app.getHttpServer()).post('/importacoes/revisoes/decisoes/simular')
      .auth(await bearer('1'), { type: 'bearer' }).send({ decisaoId: '8', autorizacaoId: '3' }).expect(403);
    expect(api.simulateDecision).toHaveBeenCalledWith({ decisaoId: '8', autorizacaoId: '3' }, '1');
  });

  it('valida campos e envelopes aninhados e distingue valor nulo de propriedade ausente', async () => {
    const envelope = { estado: 'nulo', valor: null, tipo_sql: 'integer', precisao: 'ano', serializacao_versao: 'v1' };
    const field = { campoId: '1', registroId: '2', alvoChave: 'ano', chaveSemantica: 'retorno_anual_realizado',
      blocoFuncional: 'geral', ocorrencia: 1, categoria: 'sem_mudanca', operacao: 'conservar', base: envelope, proposto: envelope };
    const line = { linhaBaseId: '3', pacienteId: '4', atendimentoBaseId: null, abaNomeOriginal: 'Sintética',
      abaOrdem: 1, numeroLinha: 2, resultado: 'autorizar', campos: [field], dadosBrutos: [] };
    const body = { ...proposal, proposta: { linhas: [line] } };
    const invalid = [
      { ...proposal, proposta: undefined },
      { ...proposal, proposta: { linhas: [null] } },
      { ...proposal, proposta: { linhas: [{ ...line, campos: [null] }] } },
      { ...proposal, proposta: { linhas: [{ ...line, campos: [{ ...field, base: undefined }] }] } },
      { ...proposal, proposta: { linhas: [{ ...line, campos: [{ ...field, proposto: { ...envelope, valor: undefined } }] }] } },
      { ...proposal, proposta: { linhas: [{ ...line, campos: [{ ...field, base: { ...envelope, actorId: '999' } }] }] } },
    ];
    const token = await bearer('1');
    for (const rejected of invalid) await request(app.getHttpServer()).post('/importacoes/revisoes/propostas/simular')
      .auth(token, { type: 'bearer' }).send(rejected).expect(400);
    expect(api.simulateProposal).not.toHaveBeenCalled();
    api.simulateProposal.mockResolvedValueOnce({ resultado: 'apta' });
    await request(app.getHttpServer()).post('/importacoes/revisoes/propostas/simular')
      .auth(token, { type: 'bearer' }).send(body).expect(201, { resultado: 'apta' });
    expect(api.simulateProposal).toHaveBeenCalledWith(body, '1');
  });

  it('encaminha dry-run/proposta, preparação e publicação com ator vindo da identidade autenticada', async () => {
    api.simulateProposal.mockResolvedValue({ resultado: 'aptas', total: 0 });
    await request(app.getHttpServer()).post('/importacoes/revisoes/propostas/simular')
      .auth(await bearer('1'), { type: 'bearer' }).send(proposal).expect(201, { resultado: 'aptas', total: 0 });
    expect(api.simulateProposal).toHaveBeenCalledWith(proposal, '1');
    api.prepare.mockResolvedValue({ revisaoId: '12' });
    await request(app.getHttpServer()).post('/importacoes/revisoes/preparar').auth(await bearer('1'), { type: 'bearer' })
      .send({ fonteId: '1', loteBaseId: '2', loteRevisadoId: '3', hashTransformacoes: 'a'.repeat(64), autorizacaoId: '4' })
      .expect(201, { revisaoId: '12' });
    const decision = { revisaoId: '1', linhaRevisadaId: '2', linhaBaseId: '3', pacienteId: '4', atendimentoBaseId: null,
      autorizacaoId: '5', resultado: 'bloquear', justificativa: 'Revisão sintética', campos: [], decisaoAnteriorId: null };
    api.publishDecision.mockResolvedValue({ decisaoId: '13' });
    await request(app.getHttpServer()).post('/importacoes/revisoes/decisoes/publicar')
      .auth(await bearer('1'), { type: 'bearer' }).send(decision).expect(201, { decisaoId: '13' });
    expect(api.publishDecision).toHaveBeenCalledWith(decision, '1');
    expect(JSON.stringify(api.publishDecision.mock.calls)).not.toContain('actorId');
  });
});

describe('Leitura pré-staging de XLSX', () => {
  it('recusa metadados malformados antes do parser e da simulação', async () => {
    const root = resolve(process.cwd(), '..');
    const manifest = JSON.parse(readFileSync(resolve(root, 'manifestos/planilha_ambulatorio_v1.json'), 'utf8'));
    const service = new RevisoesService({ get: () => ({ enabled: false, syntheticMode: false }) } as never);
    const simulation = jest.spyOn(service, 'simulateProposal');
    const dto = { fonteId: '1', loteBaseId: '2', autorizacaoId: '3', transformacoes: '{}',
      manifestoRevisado: JSON.stringify(manifest), proposta: JSON.stringify({ linhas: [null] }) };
    const file = { originalname: 'sintetico.xlsx', buffer: Buffer.from('parser não deve abrir estes bytes'), size: 1 };
    await expect(service.simulateWorkbookProposal(file, dto, '4')).rejects.toMatchObject({ status: 400 });
    const badManifest = structuredClone(manifest); badManifest.sheets[0].columns[0] = null;
    await expect(service.simulateWorkbookProposal(file,
      { ...dto, proposta: '{"linhas":[]}', manifestoRevisado: JSON.stringify(badManifest) }, '4'))
      .rejects.toMatchObject({ status: 400 });
    expect(simulation).not.toHaveBeenCalled();
    await service.onModuleDestroy();
  });

  it('obtém as células da planilha sintética usando o parser do importador e as associa ao manifesto', async () => {
    const root = resolve(process.cwd(), '..');
    const fixture = resolve(root, 'tests/fixtures/planilha_importacao_v1_sintetica.xlsx');
    const manifest = JSON.parse(readFileSync(resolve(root, 'manifestos/planilha_ambulatorio_v1.json'), 'utf8'));
    const sheet = manifest.sheets[0];
    const service = new RevisoesService({ get: () => ({ enabled: false, syntheticMode: false }) } as never);
    const simulation = jest.spyOn(service, 'simulateProposal').mockResolvedValue({ resultado: 'apta' } as never);
    try {
      await service.simulateWorkbookProposal({ originalname: 'synthetic.xlsx', buffer: readFileSync(fixture), size: 1 }, {
        fonteId: '1', loteBaseId: '2', autorizacaoId: '3', manifestoRevisado: JSON.stringify(manifest), transformacoes: '{}',
        proposta: JSON.stringify({ linhas: [{ linhaBaseId: '4', pacienteId: '5', atendimentoBaseId: null,
          abaNomeOriginal: sheet.aba_nome_original, abaOrdem: sheet.aba_ordem, numeroLinha: 2,
          resultado: 'bloquear', campos: [] }] }),
      }, '6');
      const forwarded = simulation.mock.calls[0][0].proposta;
      expect(forwarded.linhas[0].dadosBrutos).toHaveLength(sheet.columns.length);
      expect(forwarded.linhas[0].dadosBrutos[0]).toMatchObject({
        posicao: sheet.columns[0].posicao_fisica, cabecalho: sheet.columns[0].cabecalho_original,
        chave: sheet.columns[0].chave_semantica,
      });
      expect(forwarded.linhas[0].dadosBrutos[0]).toHaveProperty('valor');
      expect(simulation).toHaveBeenCalledWith(expect.objectContaining({ proposta: expect.objectContaining({ linhas: expect.any(Array) }) }), '6');
    } finally { await service.onModuleDestroy(); }
  });

  it('recusa cabeçalho divergente e preserva número físico em linhas XML esparsas', async () => {
    const root = resolve(process.cwd(), '..');
    const fixture = resolve(root, 'tests/fixtures/planilha_importacao_v1_sintetica.xlsx');
    const manifest = JSON.parse(readFileSync(resolve(root, 'manifestos/planilha_ambulatorio_v1.json'), 'utf8'));
    const service = new RevisoesService({ get: () => ({ enabled: false, syntheticMode: false }) } as never);
    const simulation = jest.spyOn(service, 'simulateProposal').mockResolvedValue({ resultado: 'simulado' } as never);
    const input = { fonteId: '1', loteBaseId: '2', autorizacaoId: '3', transformacoes: '{}',
      proposta: JSON.stringify({ linhas: [{ linhaBaseId: '4', pacienteId: '5', atendimentoBaseId: null,
        abaNomeOriginal: manifest.sheets[0].aba_nome_original, abaOrdem: manifest.sheets[0].aba_ordem,
        numeroLinha: 2, resultado: 'bloquear', campos: [] }] }) };
    try {
      const mismatch = structuredClone(manifest);
      mismatch.sheets[0].columns[0].cabecalho_original = 'Cabeçalho fabricado';
      await expect(service.simulateWorkbookProposal({ originalname: 'source.xlsx', buffer: readFileSync(fixture), size: 1 },
        { ...input, manifestoRevisado: JSON.stringify(mismatch) }, '6')).rejects.toMatchObject({ status: 400 });
      expect(simulation).not.toHaveBeenCalled();

      const temp = mkdtempSync(join(tmpdir(), 'revisao-xlsx-sparse-'));
      try {
        const sparse = join(temp, 'sparse.xlsx');
        const python = `import re,sys,zipfile\nsrc,dst=sys.argv[1:]\nwith zipfile.ZipFile(src) as z,zipfile.ZipFile(dst,'w',zipfile.ZIP_DEFLATED) as out:\n  for i in z.infolist():\n    data=z.read(i.filename)\n    if i.filename=='xl/worksheets/sheet1.xml':\n      text=data.decode(); text=text.replace('<row r="2"','<row r="5"',1); text=re.sub(r'([A-Z]+)2(?=[" ])',r'\\g<1>5',text)\n      data=text.encode()\n    out.writestr(i,data)`;
        await execFileAsync('python3', ['-c', python, fixture, sparse]);
        const sparseLine = { ...input, proposta: JSON.stringify({ linhas: [{ linhaBaseId: '4', pacienteId: '5', atendimentoBaseId: null,
          abaNomeOriginal: manifest.sheets[0].aba_nome_original, abaOrdem: manifest.sheets[0].aba_ordem,
          numeroLinha: 5, resultado: 'bloquear', campos: [] }] }) };
        await service.simulateWorkbookProposal({ originalname: 'sparse.xlsx', buffer: readFileSync(sparse), size: 1 },
          { ...sparseLine, manifestoRevisado: JSON.stringify(manifest) }, '6');
        const forwarded = simulation.mock.calls[0][0].proposta;
        expect(forwarded.linhas[0].numeroLinha).toBe(5);
        expect(forwarded.linhas[0].dadosBrutos).toHaveLength(manifest.sheets[0].columns.length);
      } finally { rmSync(temp, { recursive: true, force: true }); }
    } finally { await service.onModuleDestroy(); }
  });
});
