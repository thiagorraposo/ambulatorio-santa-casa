/** Consulta literal SQL09; não constitui prescrição ou histórico de catálogo. */
export interface MedicamentoResponse {
  atendimentoMedicamentoId: string;
  atendimentoId: string;
  medicamentoId: string | null;
  codigoMedicamento: string | null;
  nomeMedicamento: string | null;
  principioAtivo: string | null;
  classeMedicamento: string | null;
  nomeMedicamentoLivre: string | null;
  tipoRegistro: string | null;
  finalidadeUso: string | null;
  dose: string | null;
  viaAdministracao: string | null;
  frequencia: string | null;
  dataInicio: string | null;
  dataFim: string | null;
  usoAtual: boolean | null;
  prescritoNoAtendimento: boolean | null;
  statusUso: string | null;
  motivo: string | null;
  observacoes: string | null;
}
