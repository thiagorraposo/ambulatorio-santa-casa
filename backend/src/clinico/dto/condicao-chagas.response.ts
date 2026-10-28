import type { FaseDoenca, FormaClinica } from './condicao-chagas.dto';

export interface CondicaoChagasResponse {
  condicaoChagasId: string;
  atendimentoId: string;
  formaClinica: FormaClinica | null;
  faseDoenca: FaseDoenca | null;
  classificacaoClinica: string | null;
  possuiSintomas: boolean | null;
  descricaoSintomas: string | null;
  observacoes: string | null;
}
export interface CondicaoChagasCriadaResponse {
  condicaoChagasId: string;
}
