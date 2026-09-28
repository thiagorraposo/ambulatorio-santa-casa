import { BadRequestException, Injectable, ServiceUnavailableException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { execFile } from 'node:child_process';
import { promises as fs } from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';
import { promisify } from 'node:util';
import { DatabaseService } from '../common/database/database.service';
import { AppConfig } from '../config/app.config';

const execFileAsync = promisify(execFile);

interface LoteRow {
  importacao_lote_id: string; codigo_lote: string; layout_versao: string; status_lote: string;
  lote_reprocessado_de_id: string | null; iniciado_em: string | null; finalizado_em: string | null;
  criado_em: string; atualizado_em: string; possui_erro: boolean; total_linhas: string;
  linhas_importadas: string; linhas_com_pendencia: string; linhas_rejeitadas: string;
}

@Injectable()
export class ImportacoesService {
  constructor(private readonly database: DatabaseService, private readonly config: ConfigService<AppConfig, true>) {}

  async submit(file: { originalname: string; buffer: Buffer; size: number }, purpose: string,
    lotCode: string, dryRun: boolean): Promise<Record<string, unknown>> {
    const importer = this.config.get('importer', { infer: true });
    if (!importer.enabled) throw new ServiceUnavailableException('Importação HTTP desabilitada neste ambiente');
    if (!/^[a-z0-9][a-z0-9_-]{0,98}$/i.test(lotCode)) throw new BadRequestException('Código de lote inválido');
    if (!file.originalname.toLowerCase().endsWith('.xlsx') || file.size > 10 * 1024 * 1024) {
      throw new BadRequestException('Arquivo XLSX inválido ou excede o limite sintético');
    }
    const temporary = await fs.mkdtemp(path.join(os.tmpdir(), 'ambulatorio-import-'));
    const source = path.join(temporary, 'origem.xlsx');
    try {
      await fs.writeFile(source, file.buffer, { mode: 0o600 });
      const args = [path.resolve(__dirname, '../../../scripts/importar_planilha.py'), source,
        '--finalidade', purpose, '--codigo-lote', lotCode,
        '--db-host', importer.host!, '--db-port', String(importer.port), '--db-user', importer.user!,
        '--db-role', importer.role, '--db-name', importer.name!];
      if (dryRun) args.push('--dry-run');
      try {
        await execFileAsync('python3', args, { env: { ...process.env, PGPASSWORD: importer.password }, maxBuffer: 1024 * 1024 });
      } catch {
        throw new BadRequestException('Importação recusada; consulte o lote e os erros sanitizados');
      }
      const lot = await this.database.query<{ importacao_lote_id: string; status_lote: string }>(
        'SELECT importacao_lote_id::text,status_lote FROM importacao_lote_consulta WHERE codigo_lote=$1', [lotCode]);
      return { codigoLote: lotCode, dryRun, loteId: lot.rows[0]?.importacao_lote_id ?? null, status: lot.rows[0]?.status_lote ?? 'dry_run_concluido' };
    } finally {
      await fs.rm(temporary, { recursive: true, force: true });
    }
  }

  async list(limit: number, offset: number): Promise<Record<string, unknown>[]> {
    const result = await this.database.query<LoteRow>(`SELECT importacao_lote_id::text,codigo_lote,layout_versao,
      status_lote,lote_reprocessado_de_id::text,iniciado_em::text,finalizado_em::text,criado_em::text,
      atualizado_em::text,possui_erro,total_linhas::text,linhas_importadas::text,linhas_com_pendencia::text,
      linhas_rejeitadas::text FROM importacao_lote_consulta ORDER BY importacao_lote_id DESC LIMIT $1 OFFSET $2`, [limit, offset]);
    return result.rows.map((row) => ({ loteId: row.importacao_lote_id, codigo: row.codigo_lote,
      layout: row.layout_versao, status: row.status_lote, reprocessadoDe: row.lote_reprocessado_de_id,
      iniciadoEm: row.iniciado_em, finalizadoEm: row.finalizado_em, criadoEm: row.criado_em,
      atualizadoEm: row.atualizado_em, possuiErro: row.possui_erro, totalLinhas: Number(row.total_linhas),
      linhasImportadas: Number(row.linhas_importadas), linhasComPendencia: Number(row.linhas_com_pendencia),
      linhasRejeitadas: Number(row.linhas_rejeitadas) }));
  }

  async get(id: string): Promise<Record<string, unknown> | undefined> {
    const lot = await this.database.query<LoteRow>(`SELECT importacao_lote_id::text,codigo_lote,layout_versao,
      status_lote,lote_reprocessado_de_id::text,iniciado_em::text,finalizado_em::text,criado_em::text,
      atualizado_em::text,possui_erro,total_linhas::text,linhas_importadas::text,linhas_com_pendencia::text,
      linhas_rejeitadas::text FROM importacao_lote_consulta WHERE importacao_lote_id=$1`, [id]);
    if (!lot.rows[0]) return undefined;
    const lines = await this.database.query(`SELECT importacao_linha_id::text,aba_nome_original,aba_ordem,
      numero_linha,status_linha,possui_erro,criado_em::text,atualizado_em::text FROM importacao_linha_consulta
      WHERE importacao_lote_id=$1 ORDER BY aba_ordem,numero_linha`, [id]);
    const row = lot.rows[0];
    return { loteId: row.importacao_lote_id, codigo: row.codigo_lote, layout: row.layout_versao,
      status: row.status_lote, possuiErro: row.possui_erro, totalLinhas: Number(row.total_linhas),
      linhasImportadas: Number(row.linhas_importadas), linhasComPendencia: Number(row.linhas_com_pendencia),
      linhasRejeitadas: Number(row.linhas_rejeitadas), linhas: lines.rows.map((line: Record<string, unknown>) => ({
        linhaId: line.importacao_linha_id, aba: line.aba_nome_original, abaOrdem: line.aba_ordem,
        numero: line.numero_linha, status: line.status_linha, possuiErro: line.possui_erro,
        criadoEm: line.criado_em, atualizadoEm: line.atualizado_em })) };
  }
}
