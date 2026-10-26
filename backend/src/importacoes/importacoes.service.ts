import { BadRequestException, ForbiddenException, Injectable, ServiceUnavailableException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { execFile } from 'node:child_process';
import { promises as fs } from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';
import { promisify } from 'node:util';
import { DatabaseService } from '../common/database/database.service';
import { ClinicalAccessService } from '../common/security/clinical-access.service';
import { AuthenticatedUser } from '../auth/auth.types';
import { AppConfig } from '../config/app.config';
import { ImportacaoFinalidade, ImportacaoLoteDetalheResponse, ImportacaoLoteResponse,
  ImportacaoLinhaResponse, ImportacaoLinhaRow, ImportacaoSubmitResponse } from './dto/importacao.response';

const execFileAsync = promisify(execFile);

interface LoteRow {
  importacao_lote_id: string; codigo_lote: string; layout_versao: string; status_lote: string;
  lote_reprocessado_de_id: string | null; iniciado_em: string | null; finalizado_em: string | null;
  criado_em: string; atualizado_em: string; possui_erro: boolean; total_linhas: string;
  linhas_importadas: string; linhas_com_pendencia: string; linhas_rejeitadas: string; codigo_erro: string | null;
}
interface LoteDetailRow extends LoteRow { autorizado: boolean; linhas: ImportacaoLinhaRow[] }

@Injectable()
export class ImportacoesService {
  constructor(private readonly database: DatabaseService, private readonly config: ConfigService<AppConfig, true>,
    private readonly access: ClinicalAccessService) {}

  async submit(file: { originalname: string; buffer: Buffer; size: number }, purpose: ImportacaoFinalidade,
    lotCode: string, dryRun: boolean): Promise<ImportacaoSubmitResponse> {
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
      let executedLotId: string | null = null;
      try {
        const { stderr } = await execFileAsync('python3', args, { env: {
          PATH: process.env.PATH, LANG: process.env.LANG, LC_ALL: process.env.LC_ALL,
          PGPASSWORD: importer.password,
        }, maxBuffer: 1024 * 1024 });
        // Only the worker's technical completion events identify the effective lot.
        // The requested code can differ on an idempotent no-op of the same content.
        for (const line of stderr.split('\n')) {
          try {
            const event: { event?: string; lot_id?: unknown } = JSON.parse(line);
            const id = String(event.lot_id ?? '');
            if (['import_finished', 'import_idempotent_noop'].includes(event.event ?? '') && /^[1-9]\d{0,18}$/.test(id)) executedLotId = id;
          } catch { /* Ignore non-event diagnostics; never expose worker output. */ }
        }
      } catch {
        throw new BadRequestException('Importação recusada; consulte o lote e os erros sanitizados');
      }
      const lot = await this.database.query<{ importacao_lote_id: string; codigo_lote: string; status_lote: string }>(
        'SELECT importacao_lote_id::text,codigo_lote,status_lote FROM importacao_lote_consulta WHERE importacao_lote_id=$1::bigint', [executedLotId]);
      if (!dryRun && !lot.rows[0]) throw new ServiceUnavailableException('Resultado da importação indisponível');
      return { codigoLote: lot.rows[0]?.codigo_lote ?? lotCode, codigoLoteSolicitado: lotCode, dryRun,
        loteId: lot.rows[0]?.importacao_lote_id ?? null, status: lot.rows[0]?.status_lote ?? 'dry_run_concluido' };
    } finally {
      await fs.rm(temporary, { recursive: true, force: true });
    }
  }

  async list(limit: number, offset: number, user: AuthenticatedUser): Promise<ImportacaoLoteResponse[]> {
    this.access.requireEnabled();
    return this.database.transaction(async (tx) => {
      await this.access.identity(tx, user);
      const result = await tx.query<LoteRow>(`SELECT importacao_lote_id::text,codigo_lote,layout_versao,
        status_lote,lote_reprocessado_de_id::text,iniciado_em::text,finalizado_em::text,criado_em::text,
        atualizado_em::text,possui_erro,total_linhas::text,linhas_importadas::text,linhas_com_pendencia::text,
        linhas_rejeitadas::text,codigo_erro FROM importacao_lote_consulta l
        WHERE ambulatorio.importacao_lote_pode_consultar(importacao_lote_id)
        ORDER BY l.importacao_lote_id DESC LIMIT $1 OFFSET $2`, [limit, offset]);
      return result.rows.map((row): ImportacaoLoteResponse => this.loteResponse(row));
    }, user.usuarioId);
  }

  async get(user: AuthenticatedUser, id: string, limit = 20, offset = 0,
    apenasComErro = false): Promise<ImportacaoLoteDetalheResponse | undefined> {
    this.access.requireEnabled();
    return this.database.transaction(async (tx) => {
      await this.access.identity(tx, user);
      const result = await tx.query<LoteDetailRow>(`SELECT l.importacao_lote_id::text,l.codigo_lote,l.layout_versao,
        l.status_lote,l.lote_reprocessado_de_id::text,l.iniciado_em::text,l.finalizado_em::text,l.criado_em::text,
        l.atualizado_em::text,l.possui_erro,l.total_linhas::text,l.linhas_importadas::text,l.linhas_com_pendencia::text,
        l.linhas_rejeitadas::text,l.codigo_erro,
        ambulatorio.importacao_lote_pode_consultar(l.importacao_lote_id) AS autorizado,
        COALESCE((SELECT jsonb_agg(jsonb_build_object(
          'importacao_linha_id',q.importacao_linha_id,'aba_nome_original',q.aba_nome_original,'aba_ordem',q.aba_ordem,
          'numero_linha',q.numero_linha,'status_linha',q.status_linha,'possui_erro',q.possui_erro,
          'codigo_erro',q.codigo_erro,'criado_em',q.criado_em,'atualizado_em',q.atualizado_em)
          ORDER BY q.aba_ordem,q.numero_linha,q.importacao_linha_id)
          FROM (SELECT i.importacao_linha_id::text,i.aba_nome_original,i.aba_ordem,i.numero_linha,i.status_linha,
              i.possui_erro,i.codigo_erro,i.criado_em::text,i.atualizado_em::text
            FROM importacao_linha_consulta i WHERE i.importacao_lote_id=l.importacao_lote_id
              AND (NOT $4::boolean OR i.possui_erro)
            ORDER BY i.aba_ordem,i.numero_linha,i.importacao_linha_id LIMIT $2 OFFSET $3) q),'[]'::jsonb) AS linhas
        FROM importacao_lote_consulta l WHERE l.importacao_lote_id=$1::bigint`,
      [id, limit, offset, apenasComErro]);
      const row = result.rows[0];
      if (!row) return undefined;
      if (!row.autorizado) throw new ForbiddenException('Recurso não autorizado');
      return { ...this.loteResponse(row), paginacaoLinhas: { limit, offset },
        linhas: row.linhas.map((line): ImportacaoLinhaResponse => ({ linhaId: line.importacao_linha_id,
          aba: line.aba_nome_original, abaOrdem: line.aba_ordem, numero: line.numero_linha,
          status: line.status_linha, possuiErro: line.possui_erro, codigoErro: line.codigo_erro,
          criadoEm: line.criado_em, atualizadoEm: line.atualizado_em })) };
    }, user.usuarioId);
  }

  private loteResponse(row: LoteRow): ImportacaoLoteResponse {
    return { loteId: row.importacao_lote_id, codigo: row.codigo_lote, layout: row.layout_versao,
      status: row.status_lote, reprocessadoDe: row.lote_reprocessado_de_id,
      iniciadoEm: row.iniciado_em, finalizadoEm: row.finalizado_em, criadoEm: row.criado_em,
      atualizadoEm: row.atualizado_em, possuiErro: row.possui_erro,
      codigoErro: row.codigo_erro as ImportacaoLoteResponse['codigoErro'], totalLinhas: Number(row.total_linhas),
      linhasImportadas: Number(row.linhas_importadas), linhasComPendencia: Number(row.linhas_com_pendencia),
      linhasRejeitadas: Number(row.linhas_rejeitadas) };
  }
}
