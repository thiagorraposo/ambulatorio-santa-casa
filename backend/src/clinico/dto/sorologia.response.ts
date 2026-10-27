import type { SorologiaResult } from './sorologia.dto';

export interface SorologiaResponse {
  sorologiaId: string;
  diagnosticoChagasId: string;
  atendimentoId: string;
  metodoSorologico: string | null;
  dataSolicitacao: string | null;
  dataColeta: string | null;
  dataResultado: string | null;
  resultado: SorologiaResult | null;
  laboratorio: string | null;
  observacoes: string | null;
}

export interface SorologiaCriadaResponse {
  sorologiaId: string;
}
