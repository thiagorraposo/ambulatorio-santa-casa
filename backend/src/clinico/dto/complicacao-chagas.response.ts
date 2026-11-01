import type { ComplicacaoChagasCreateDto } from './complicacao-chagas.dto';

export interface ComplicacaoChagasResponse extends Required<ComplicacaoChagasCreateDto> {
  complicacaoChagasId: string;
  atendimentoId: string;
}
export interface ComplicacaoChagasCriadaResponse { complicacaoChagasId: string }
