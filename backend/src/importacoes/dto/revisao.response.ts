export type RevisaoResultado = 'apta' | 'sem_aplicacao' | 'bloqueada' | 'conflito' | 'obsoleta' | 'ja_aplicada';

export interface RevisaoPropostaLinhaResponse {
  numeroLinha: number;
  resultado: RevisaoResultado;
  codigo: string;
  camposAlterados: number;
  alvosNovos: number;
  snapshotSha256: string;
}

export interface RevisaoPropostaSimulacaoResponse {
  resultado: RevisaoResultado;
  codigo: string;
  fonteId: string;
  loteBaseId: string;
  versaoFonte: string;
  manifestoSha256: string;
  transformacoesSha256: string;
  quantidadeLinhas: number;
  aptas: number;
  bloqueadas: number;
  conflitos: number;
  obsoletas: number;
  linhas: RevisaoPropostaLinhaResponse[];
}

export interface RevisaoDecisaoSimulacaoResponse {
  decisaoId: string;
  planoSha256: string;
  quantidadeCampos: number;
  quantidadeAlteracoes: number;
  quantidadeAlvosNovos: number;
  aplicacaoId: string | null;
  resultado: RevisaoResultado;
  codigo: string;
  aplicacao?: RevisaoAplicacaoResponse;
}

export interface RevisaoAplicacaoResponse {
  aplicacaoId: string | null;
  resultado: string;
  codigo: string;
}

export interface RevisaoRecebimentoResponse {
  revisaoId: string;
  loteRevisadoId: string;
  reutilizada: boolean;
  linhas: Array<{ linhaId: string; abaOrdem: number; numeroLinha: number }>;
}
