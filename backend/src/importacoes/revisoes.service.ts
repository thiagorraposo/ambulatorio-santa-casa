import { ForbiddenException, Injectable, Logger, OnModuleDestroy, ServiceUnavailableException, BadRequestException, ConflictException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Pool, PoolClient } from 'pg';
import { execFile } from 'node:child_process';
import { promises as fs } from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';
import { promisify } from 'node:util';
import { createHash } from 'node:crypto';
import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { AppConfig } from '../config/app.config';
import { ConcederAutorizacaoRevisaoDto, FinalizarRevisaoDto, PrepararRevisaoDto, PropostaRevisaoDto, PublicarDecisaoDto,
  RegistrarFonteRevisaoDto, RevogarAutorizacaoRevisaoDto, SimularArquivoDto,
  SimularDecisaoDto, SimularPropostaDto } from './revisoes.dto';
import { RevisaoAplicacaoResponse, RevisaoDecisaoSimulacaoResponse, RevisaoPropostaSimulacaoResponse, RevisaoRecebimentoResponse } from './dto/revisao.response';

const execFileAsync = promisify(execFile);
type RawProposal = { linhas: Array<Record<string, unknown>> };
type PhysicalManifest = { sheets: Array<{ aba_nome_original: string; aba_ordem: number; columns: Array<{
  posicao_fisica: string; cabecalho_original: string; chave_semantica: string; ocorrencia: number | null; bloco_funcional: string;
}> }> };
type WorkbookLine = { numeroLinha: number; valores: Array<string | null> };
type WorkbookSheet = { abaOrdem: number; linhas: WorkbookLine[] };
type ParsedWorkbook = Record<string, WorkbookSheet>;

@Injectable()
export class RevisoesService implements OnModuleDestroy {
  private readonly logger = new Logger(RevisoesService.name);
  private readonly pool?: Pool;
  private readonly enabled: boolean;
  private readonly managerPool?: Pool;
  private readonly managerEnabled: boolean;
  private readonly stagingEnabled: boolean;
  private readonly gitRevision?: string;
  private readonly executionEnabled: boolean;

  constructor(config: ConfigService<AppConfig, true>) {
    const revision = config.get('revisions', { infer: true });
    this.enabled = revision.enabled && revision.syntheticMode;
    this.managerEnabled = this.enabled && revision.manager.enabled;
    this.stagingEnabled = this.enabled && revision.stagingEnabled;
    this.gitRevision = revision.gitRevision;
    this.executionEnabled = this.enabled && revision.executionEnabled;
    if (this.enabled) {
      this.pool = new Pool({ host: revision.host, port: revision.port, database: revision.name,
        user: revision.user, password: revision.password, max: 3, connectionTimeoutMillis: 3000, idleTimeoutMillis: 10000 });
    }
    if (this.managerEnabled) {
      const manager = revision.manager;
      this.managerPool = new Pool({ host: manager.host, port: manager.port, database: manager.name,
        user: manager.user, password: manager.password, max: 2, connectionTimeoutMillis: 3000, idleTimeoutMillis: 10000 });
    }
  }

  async onModuleDestroy(): Promise<void> { await Promise.all([this.pool?.end(), this.managerPool?.end()]); }

  async registerSource(dto: RegistrarFonteRevisaoDto, actorId: string): Promise<{ fonteId: string }> {
    return this.runManager(actorId, async (client) => {
      const result = await client.query<{ fonte_id: string }>(
        'SELECT ambulatorio.revisao_registrar_fonte($1::text,$2::bigint)::text AS fonte_id',
        [dto.codigoFonte, dto.loteInicialId]);
      return { fonteId: result.rows[0].fonte_id };
    });
  }

  async grantAuthorization(dto: ConcederAutorizacaoRevisaoDto, actorId: string): Promise<{ autorizacaoId: string }> {
    return this.runManager(actorId, async (client) => {
      const result = await client.query<{ autorizacao_id: string }>(
        'SELECT ambulatorio.revisao_conceder_autorizacao($1::bigint,$2::bigint,$3::timestamptz)::text AS autorizacao_id',
        [dto.fonteId, dto.usuarioId, dto.validaAte ?? null]);
      return { autorizacaoId: result.rows[0].autorizacao_id };
    });
  }

  async revokeAuthorization(dto: RevogarAutorizacaoRevisaoDto, actorId: string): Promise<{ revogada: true }> {
    return this.runManager(actorId, async (client) => {
      await client.query('SELECT ambulatorio.revisao_revogar_autorizacao($1::bigint)', [dto.autorizacaoId]);
      return { revogada: true };
    });
  }

  async simulateProposal(dto: SimularPropostaDto, actorId: string): Promise<RevisaoPropostaSimulacaoResponse> {
    return this.run(actorId, async (client) => {
      const result = await client.query<{ resultado: RevisaoPropostaSimulacaoResponse }>(
        'SELECT ambulatorio.revisao_simular_proposta($1::bigint,$2::bigint,$3::bigint,$4::bigint,$5::text,$6::text,$7::jsonb) AS resultado',
        [dto.fonteId, dto.loteBaseId, dto.autorizacaoId, actorId, dto.manifestoRevisado, dto.transformacoes, JSON.stringify(dto.proposta)]);
      return result.rows[0].resultado;
    });
  }

  async simulateWorkbookProposal(file: { originalname: string; buffer: Buffer; size: number }, dto: SimularArquivoDto,
    actorId: string): Promise<RevisaoPropostaSimulacaoResponse> {
    const { manifest, proposal, workbook } = await this.parseWorkbookProposal(file, dto);
    const virtualManifest = this.virtualManifest(manifest);
    const mapped = await this.validatedProposal(this.attachWorkbookCells(workbook, virtualManifest, proposal));
    return this.simulateProposal({ ...dto, manifestoRevisado: JSON.stringify(virtualManifest), proposta: mapped }, actorId);
  }

  async receiveWorkbook(file: { originalname: string; buffer: Buffer; size: number }, dto: SimularArquivoDto,
    actorId: string): Promise<RevisaoRecebimentoResponse> {
    if (!this.stagingEnabled || !this.gitRevision) throw new ServiceUnavailableException('Recebimento de revisão desabilitado neste ambiente');
    const { manifest, proposal, workbook } = await this.parseWorkbookProposal(file, dto);
    const mapped = this.attachWorkbookCells(workbook, manifest, proposal);
    this.requireCompleteWorkbook(workbook, manifest, mapped);
    const virtualManifest = this.virtualManifest(manifest);
    const virtualProposal = await this.validatedProposal(this.attachWorkbookCells(workbook, virtualManifest, proposal));
    const sha = (bytes: string | Buffer) => createHash('sha256').update(bytes).digest('hex');
    const rawLines = mapped.linhas.map(line => ({ abaNomeOriginal: line.abaNomeOriginal,
      abaOrdem: line.abaOrdem, numeroLinha: line.numeroLinha, dadosBrutos: line.dadosBrutos }));
    return this.run(actorId, async (client) => {
      const receiptArgs = [dto.fonteId, dto.loteBaseId, dto.autorizacaoId, sha(file.buffer), sha(dto.manifestoRevisado),
        sha(dto.transformacoes), 'revisao-http-1.0.0', this.gitRevision, JSON.stringify(rawLines)];
      const historical = await client.query<{ resultado: RevisaoRecebimentoResponse | null }>(
        `SELECT ambulatorio.revisao_consultar_recebimento_historico($1::bigint,$2::bigint,$3::bigint,$4::text,
          $5::text,$6::text,$7::text,$8::text,$9::jsonb) AS resultado`, receiptArgs);
      if (historical.rows[0].resultado) return historical.rows[0].resultado;
      const simulation = await client.query<{ resultado: RevisaoPropostaSimulacaoResponse }>(
        'SELECT ambulatorio.revisao_simular_proposta($1::bigint,$2::bigint,$3::bigint,$4::bigint,$5::text,$6::text,$7::jsonb) AS resultado',
        [dto.fonteId, dto.loteBaseId, dto.autorizacaoId, actorId, JSON.stringify(virtualManifest), dto.transformacoes, JSON.stringify(virtualProposal)]);
      if (simulation.rows[0].resultado.obsoletas > 0) throw new ConflictException('Proposta de revisão obsoleta; simule novamente');
      const result = await client.query<{ resultado: RevisaoRecebimentoResponse }>(
        `SELECT ambulatorio.revisao_receber_arquivo($1::bigint,$2::bigint,$3::bigint,$4::text,
          $5::text,$6::text,$7::text,$8::text,$9::jsonb) AS resultado`,
        receiptArgs);
      return result.rows[0].resultado;
    });
  }

  private virtualManifest(manifest: PhysicalManifest): PhysicalManifest {
    return { ...manifest, sheets: manifest.sheets.map(sheet => ({ ...sheet,
      columns: sheet.columns.map(column => ({ ...column, ocorrencia: column.ocorrencia ?? 1 })) })) };
  }

  private async validatedProposal(proposal: RawProposal): Promise<PropostaRevisaoDto> {
    const dto = plainToInstance(PropostaRevisaoDto, proposal);
    const errors = await validate(dto, { whitelist: true, forbidNonWhitelisted: true });
    if (errors.length) throw new BadRequestException('Metadados ou campos da proposta inválidos');
    return dto;
  }

  private async parseWorkbookProposal(file: { originalname: string; buffer: Buffer; size: number }, dto: SimularArquivoDto):
    Promise<{ manifest: PhysicalManifest; proposal: RawProposal; workbook: ParsedWorkbook }> {
    if (!file.originalname.toLowerCase().endsWith('.xlsx') || file.size < 1 || file.size > 10 * 1024 * 1024
      || file.buffer.byteLength < 1 || file.buffer.byteLength > 10 * 1024 * 1024) {
      throw new BadRequestException('Arquivo XLSX inválido ou excede o limite sintético');
    }
    let manifest: PhysicalManifest; let proposal: RawProposal;
    try {
      manifest = JSON.parse(dto.manifestoRevisado) as PhysicalManifest;
      proposal = JSON.parse(dto.proposta) as RawProposal;
    } catch { throw new BadRequestException('Manifesto ou proposta inválidos'); }
    if (!Array.isArray(manifest?.sheets) || manifest.sheets.length < 1 || manifest.sheets.length > 50
      || manifest.sheets.some(sheet => !sheet || typeof sheet.aba_nome_original !== 'string'
        || !sheet.aba_nome_original.trim() || !Number.isInteger(sheet.aba_ordem) || sheet.aba_ordem < 1
        || !Array.isArray(sheet.columns) || sheet.columns.length < 1 || sheet.columns.length > 512
        || sheet.columns.some(column => !column || typeof column.posicao_fisica !== 'string'
          || !/^[A-Z]+$/.test(column.posicao_fisica) || typeof column.cabecalho_original !== 'string'
          || typeof column.chave_semantica !== 'string' || !column.chave_semantica.trim()
          || typeof column.bloco_funcional !== 'string' || !column.bloco_funcional.trim()
          || (column.ocorrencia !== null && (!Number.isInteger(column.ocorrencia) || column.ocorrencia < 1))))
      || !Array.isArray(proposal?.linhas) || proposal.linhas.length > 10000
      || proposal.linhas.some(line => !line || typeof line !== 'object' || Array.isArray(line))) {
      throw new BadRequestException('Manifesto ou proposta inválidos');
    }
    const workbook = await this.readWorkbook(file.buffer);
    return { manifest, proposal, workbook };
  }

  private requireCompleteWorkbook(workbook: ParsedWorkbook, manifest: PhysicalManifest, proposal: RawProposal): void {
    if (Object.keys(workbook).some(name => !manifest.sheets.some(sheet => sheet.aba_nome_original === name))) {
      throw new BadRequestException('Abas do XLSX divergem do manifesto');
    }
    const physical = manifest.sheets.flatMap(sheet => {
      const source = workbook[sheet.aba_nome_original];
      if (!source || source.abaOrdem !== sheet.aba_ordem) throw new BadRequestException('Abas do XLSX divergem do manifesto');
      return source.linhas.filter(row => row.numeroLinha > 1 && row.valores.some(value => value !== null && value !== ''))
        .map(row => `${sheet.aba_ordem}:${row.numeroLinha}`);
    });
    const submitted = proposal.linhas.map(line => `${line.abaOrdem}:${line.numeroLinha}`);
    if (physical.length === 0 || physical.length !== submitted.length || new Set(submitted).size !== submitted.length
      || physical.some(key => !submitted.includes(key))) {
      throw new BadRequestException('Recebimento exige todas as linhas preenchidas do XLSX');
    }
  }

  private attachWorkbookCells(workbook: ParsedWorkbook, manifest: PhysicalManifest,
    proposal: RawProposal): RawProposal {
    if (!Array.isArray(manifest?.sheets) || !Array.isArray(proposal?.linhas)) throw new BadRequestException('Manifesto ou proposta inválidos');
    const linhas = proposal.linhas.map((line) => {
      const sheet = manifest.sheets.find((entry) => entry.aba_nome_original === line.abaNomeOriginal
        && entry.aba_ordem === line.abaOrdem);
      const number = Number(line.numeroLinha);
      const sourceSheet = sheet && workbook[sheet.aba_nome_original];
      const sourceHeader = sourceSheet?.linhas.find((row) => row.numeroLinha === 1)?.valores;
      const sourceLine = sourceSheet?.linhas.find((row) => row.numeroLinha === number);
      if (!sheet || !Array.isArray(sheet.columns) || !sourceSheet || sourceSheet.abaOrdem !== sheet.aba_ordem
        || !Number.isSafeInteger(number) || number < 2 || !sourceLine || !sourceHeader) {
        throw new BadRequestException('Proposta não corresponde às abas e linhas do XLSX');
      }
      const headerColumns = new Set<number>();
      for (let index = 0; index < sourceHeader.length; index++) if ((sourceHeader[index] ?? '').trim() !== '') headerColumns.add(index + 1);
      const manifestColumns = new Set<number>();
      for (const column of sheet.columns) {
        const index = this.columnNumber(column.posicao_fisica);
        if (manifestColumns.has(index) || sourceHeader[index - 1] !== column.cabecalho_original) {
          throw new BadRequestException('Cabeçalhos ou posições do XLSX divergem do manifesto');
        }
        manifestColumns.add(index);
      }
      if (headerColumns.size !== manifestColumns.size || [...headerColumns].some((index) => !manifestColumns.has(index))) {
        throw new BadRequestException('Colunas físicas do XLSX divergem do manifesto');
      }
      if (sourceLine.valores.some((value, index) => value !== null && value !== '' && !manifestColumns.has(index + 1))) {
        throw new BadRequestException('Célula preenchida fora das colunas do manifesto');
      }
      const dadosBrutos = sheet.columns.map((column, index) => ({
        posicao: column.posicao_fisica, cabecalho: column.cabecalho_original, chave: column.chave_semantica,
        ocorrencia: column.ocorrencia, bloco: column.bloco_funcional,
        valor: sourceLine.valores[this.columnNumber(column.posicao_fisica) - 1] ?? null,
      }));
      const { dadosBrutos: _untrusted, ...metadata } = line;
      return { ...metadata, dadosBrutos };
    });
    return { linhas };
  }

  private columnNumber(position: string): number {
    if (!/^[A-Z]+$/.test(position)) throw new BadRequestException('Posição física inválida no manifesto');
    return [...position].reduce((value, letter) => value * 26 + letter.charCodeAt(0) - 64, 0);
  }

  private async readWorkbook(buffer: Buffer): Promise<ParsedWorkbook> {
    const directory = await fs.mkdtemp(path.join(os.tmpdir(), 'ambulatorio-revisao-'));
    const source = path.join(directory, 'proposta.xlsx');
    const parser = path.resolve(__dirname, '../../../scripts/importador');
    const python = `import json,re,sys,zipfile\nfrom pathlib import Path\nfrom xml.etree import ElementTree as ET\nsys.path.insert(0,sys.argv[2])\nfrom xlsx import NS,_column\nns=NS\nwith zipfile.ZipFile(sys.argv[1]) as z:\n  if sum(i.file_size for i in z.infolist())>67108864 or len(z.infolist())>512: raise ValueError('xlsx size limit')\n  shared=[]\n  if 'xl/sharedStrings.xml' in z.namelist():\n    root=ET.fromstring(z.read('xl/sharedStrings.xml')); shared=[''.join(t.text or '' for t in si.findall('.//m:t',ns)) for si in root.findall('m:si',ns)]\n  wb=ET.fromstring(z.read('xl/workbook.xml')); rel=ET.fromstring(z.read('xl/_rels/workbook.xml.rels')); targets={r.attrib['Id']:r.attrib['Target'] for r in rel}\n  out={}\n  for order,sh in enumerate(wb.findall('.//m:sheet',ns),1):\n    target=targets[sh.attrib['{'+ns['r']+'}id']].lstrip('/')\n    if not target.startswith('xl/'): target='xl/'+target\n    root=ET.fromstring(z.read(target)); rows=[]\n    for row in root.findall('.//m:sheetData/m:row',ns):\n      cells={}\n      for cell in row.findall('m:c',ns):\n        idx=_column(cell.attrib['r']); kind=cell.attrib.get('t')\n        if kind=='inlineStr': value=''.join(t.text or '' for t in cell.findall('.//m:t',ns))\n        else:\n          node=cell.find('m:v',ns); value=None if node is None else node.text\n          if value is not None and kind=='s': value=shared[int(value)]\n          elif value is not None and kind=='b': value='1' if value=='1' else '0'\n        cells[idx]=value\n      rows.append({'numeroLinha':int(row.attrib['r']),'valores':[cells.get(i) for i in range(1,max(cells,default=0)+1)]})\n    out[sh.attrib['name']]={'abaOrdem':order,'linhas':rows}\nprint(json.dumps(out,ensure_ascii=False,separators=(',',':'))) `;
    try {
      await fs.writeFile(source, buffer, { mode: 0o600 });
      const { stdout } = await execFileAsync('python3', ['-c', python, source, parser], { maxBuffer: 16 * 1024 * 1024, timeout: 30000,
        env: { PATH: process.env.PATH, LANG: process.env.LANG, LC_ALL: process.env.LC_ALL } });
      const workbook = JSON.parse(stdout) as ParsedWorkbook;
      if (!workbook || typeof workbook !== 'object' || Array.isArray(workbook)) throw new Error('invalid workbook payload');
      return workbook;
    } catch { throw new BadRequestException('XLSX inválido ou incompatível com o parser sintético'); }
    finally { await fs.rm(directory, { recursive: true, force: true }); }
  }

  async prepare(dto: PrepararRevisaoDto, actorId: string): Promise<{ revisaoId: string }> {
    return this.run(actorId, async (client) => {
      const result = await client.query<{ revisao_id: string }>(
        'SELECT ambulatorio.revisao_preparar($1::bigint,$2::bigint,$3::bigint,$4::text,$5::bigint)::text AS revisao_id',
        [dto.fonteId, dto.loteBaseId, dto.loteRevisadoId, dto.hashTransformacoes, dto.autorizacaoId]);
      return { revisaoId: result.rows[0].revisao_id };
    });
  }

  async simulateDecision(dto: SimularDecisaoDto, actorId: string): Promise<RevisaoDecisaoSimulacaoResponse> {
    return this.run(actorId, async (client) => {
      const result = await client.query<{ resultado: RevisaoDecisaoSimulacaoResponse }>(
        'SELECT ambulatorio.revisao_simular_decisao($1::bigint,$2::bigint,$3::bigint) AS resultado',
        [dto.decisaoId, dto.autorizacaoId, actorId]);
      return result.rows[0].resultado;
    });
  }

  async publishDecision(dto: PublicarDecisaoDto, actorId: string): Promise<{ decisaoId: string }> {
    return this.run(actorId, async (client) => {
      const result = await client.query<{ decisao_id: string }>(
        `SELECT ambulatorio.revisao_publicar_decisao($1::bigint,$2::bigint,$3::bigint,$4::bigint,$5::bigint,
          $6::bigint,$7::text,$8::text,$9::jsonb,$10::bigint)::text AS decisao_id`,
        [dto.revisaoId, dto.linhaRevisadaId, dto.linhaBaseId, dto.pacienteId, dto.atendimentoBaseId,
          dto.autorizacaoId, dto.resultado, dto.justificativa, JSON.stringify(dto.campos), dto.decisaoAnteriorId]);
      return { decisaoId: result.rows[0].decisao_id };
    });
  }

  async applyDecision(dto: SimularDecisaoDto, actorId: string): Promise<RevisaoAplicacaoResponse> {
    if (!this.executionEnabled) throw new ServiceUnavailableException('Execução de revisão desabilitada até o aceite integrado');
    return this.run(actorId, async client => {
      const result = await client.query<{ resultado: RevisaoAplicacaoResponse }>(
        'SELECT ambulatorio.revisao_aplicar_aprovada($1::bigint,$2::bigint) AS resultado', [dto.decisaoId,dto.autorizacaoId]);
      const value = result.rows[0].resultado;
      return { resultado: value.resultado, codigo: value.codigo, aplicacaoId: value.aplicacaoId ?? null };
    }, async code => {
      await this.run(actorId, async client => {
        await client.query('SELECT ambulatorio.revisao_diagnosticar_falha($1::bigint,$2::bigint,$3::text)',
          [dto.decisaoId,dto.autorizacaoId,code]);
      });
    });
  }

  async finish(dto: FinalizarRevisaoDto, actorId: string): Promise<{ estado: string }> {
    if (!this.executionEnabled) throw new ServiceUnavailableException('Execução de revisão desabilitada até o aceite integrado');
    return this.run(actorId, async client => {
      const result = await client.query<{ estado: string }>(
        'SELECT ambulatorio.revisao_finalizar_aprovada($1::bigint,$2::bigint,$3::text) AS estado',
        [dto.revisaoId,dto.autorizacaoId,dto.acao]);
      return { estado: result.rows[0].estado };
    });
  }

  private async run<T>(actorId: string, operation: (client: PoolClient) => Promise<T>,
    afterRollback?: (code: string) => Promise<void>): Promise<T> {
    if (!this.enabled || !this.pool) throw new ServiceUnavailableException('Revisão HTTP desabilitada neste ambiente');
    const client = await this.pool.connect();
    let discard: Error | undefined;
    let released = false;
    try {
      await client.query('BEGIN');
      // A identidade vem exclusivamente do JWT validado; o login técnico é dedicado a revisões.
      await client.query('SET LOCAL ROLE ambulatorio_servico_autenticado');
      await client.query('SELECT ambulatorio.auditoria_iniciar_aplicacao($1::bigint)', [actorId]);
      await client.query('SET LOCAL ROLE ambulatorio_revisao_servico');
      await client.query('SET LOCAL search_path TO ambulatorio, public');
      const value = await operation(client);
      await client.query('COMMIT');
      return value;
    } catch (error) {
      try { await client.query('ROLLBACK'); }
      catch (rollbackError) { discard = rollbackError instanceof Error ? rollbackError : new Error('transaction cleanup failed'); }
      const code = (error as { code?: string })?.code;
      // Libera a primeira conexão antes do diagnóstico em nova transação: sem
      // esgotar o pool quando múltiplos executores falham simultaneamente.
      client.release(discard); released = true;
      if (afterRollback && code && ['23514','23503','23502','23505','22P02','22003','22001',
        '40001','40P01','55P03','57014','08006','08003'].includes(code)) {
        try { await afterRollback(code); }
        catch { this.logger.warn(JSON.stringify({ event: 'revision_diagnostic', outcome: 'failure', code })); }
      }
      if (code === '42501' || (code === '23514'
        && (error as { message?: string }).message === 'revisao_autorizacao_invalida')) {
        throw new ForbiddenException('Autorização de revisão inválida ou insuficiente');
      }
      if (code === '23514' || code === '23503' || code === '23505') throw new ConflictException('Operação de revisão não permitida pelo estado atual');
      if (code === '22P02' || code === '22023') throw new BadRequestException('Parâmetros de revisão inválidos');
      if (error instanceof ForbiddenException || error instanceof ServiceUnavailableException || error instanceof ConflictException
        || error instanceof BadRequestException) throw error;
      throw new ServiceUnavailableException('Serviço de revisão indisponível');
    } finally {
      if (!released) client.release(discard);
    }
  }

  private async runManager<T>(actorId: string, operation: (client: PoolClient) => Promise<T>): Promise<T> {
    if (!this.managerEnabled || !this.managerPool) throw new ServiceUnavailableException('Gestão de revisão desabilitada neste ambiente');
    const client = await this.managerPool.connect();
    let discard: Error | undefined;
    try {
      await client.query('BEGIN');
      await client.query('SET LOCAL ROLE ambulatorio_servico_autenticado');
      await client.query('SELECT ambulatorio.auditoria_iniciar_aplicacao($1::bigint)', [actorId]);
      await client.query('SET LOCAL ROLE ambulatorio_revisao_gestor');
      await client.query('SET LOCAL search_path TO ambulatorio, public');
      const value = await operation(client);
      await client.query('COMMIT');
      return value;
    } catch (error) {
      try { await client.query('ROLLBACK'); }
      catch (rollbackError) { discard = rollbackError instanceof Error ? rollbackError : new Error('transaction cleanup failed'); }
      const code = (error as { code?: string })?.code;
      if (code === '42501') throw new ForbiddenException('Competência de gestão de revisão ausente ou insuficiente');
      if (code === '23514' || code === '23503' || code === '23505') throw new ConflictException('Operação de gestão não permitida pelo estado atual');
      if (code === '22P02' || code === '22023') throw new BadRequestException('Parâmetros de gestão inválidos');
      if (error instanceof ForbiddenException || error instanceof ServiceUnavailableException) throw error;
      throw new ServiceUnavailableException('Serviço de gestão de revisão indisponível');
    } finally {
      client.release(discard);
    }
  }
}
