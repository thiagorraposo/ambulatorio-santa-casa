export interface ProjectResponse {
  projetoId: string; codigo: string; nome: string; participa: boolean | null;
  possuiPendencia: boolean | null; descricaoPendencia: string | null;
  houveFalha: boolean | null; descricaoFalha: string | null; observacoes: string | null;
}

export interface NotificationResponse {
  notificacaoId: string; pacienteNotificado: boolean | null; numeroNotificacao: string | null;
  justificativaNaoNotificacao: string | null; observacoes: string | null;
}

export interface ReferralResponse {
  encaminhamentoId: string; atendimentoId: string; tipoEncaminhamentoId: string | null;
  projetoId: string | null; origem: string | null; destinoNome: string | null;
  destinoServico: string | null; especialidadeDestino: string | null;
  dataEncaminhamento: string | null; dataAgendamento: string | null; dataRealizacao: string | null;
  status: string | null; prioridade: string | null; documentoApresentado: boolean | null;
  motivo: string | null; condutaOrientada: string | null; observacoes: string | null;
}

export interface CounterReferralResponse {
  contrarreferenciaId: string; encaminhamentoId: string; atendimentoId: string;
  dataRealizada: string | null; status: string | null; resumo: string | null;
  conduta: string | null; observacoes: string | null;
}

export interface ClinicalEventResponse {
  eventoId: string; tipo: 'ultimo_comparecimento_ano_informado'; ano: number;
  precisao: 'ano';
}

export interface AnnualReturnResponse {
  retornoId: string; atendimentoId: string; dataRealizada: string;
  resumo: string | null;
}
