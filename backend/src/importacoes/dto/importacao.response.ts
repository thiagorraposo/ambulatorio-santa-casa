export type ImportacaoFinalidade = 'carga_inicial' | 'mesmo_conteudo' | 'revisao';
export type ImportacaoCodigoErro = 'falha_operacional' | 'campo_obrigatorio_ausente' | 'data_invalida'
  | 'booleano_invalido' | 'numero_invalido' | 'ano_invalido' | 'duracao_ambigua'
  | 'dominio_invalido' | 'identidade_ambigua' | 'dados_conflitantes'
  | 'catalogo_indisponivel' | 'proveniencia_ambigua' | 'dados_divergentes'
  | 'cadeia_reprocessamento_invalida' | 'linha_rejeitada' | 'pendencia_nao_promovida';

export interface ImportacaoSubmitResponse {
  codigoLote: string;
  codigoLoteSolicitado: string;
  dryRun: boolean;
  loteId: string | null;
  status: string;
}

export interface ImportacaoLoteResponse {
  loteId: string;
  codigo: string;
  layout: string;
  status: string;
  reprocessadoDe: string | null;
  iniciadoEm: string | null;
  finalizadoEm: string | null;
  criadoEm: string;
  atualizadoEm: string;
  possuiErro: boolean;
  codigoErro: ImportacaoCodigoErro | null;
  totalLinhas: number;
  linhasImportadas: number;
  linhasComPendencia: number;
  linhasRejeitadas: number;
}

export interface ImportacaoLinhaResponse {
  linhaId: string;
  aba: string;
  abaOrdem: number;
  numero: number;
  status: string;
  possuiErro: boolean;
  codigoErro: ImportacaoCodigoErro | null;
  criadoEm: string;
  atualizadoEm: string;
}

export interface ImportacaoLinhaRow {
  importacao_linha_id: string;
  aba_nome_original: string;
  aba_ordem: number;
  numero_linha: number;
  status_linha: string;
  possui_erro: boolean;
  codigo_erro: ImportacaoCodigoErro | null;
  criado_em: string;
  atualizado_em: string;
}

export interface ImportacaoLoteDetalheResponse extends ImportacaoLoteResponse {
  paginacaoLinhas: { limit: number; offset: number };
  linhas: ImportacaoLinhaResponse[];
}
