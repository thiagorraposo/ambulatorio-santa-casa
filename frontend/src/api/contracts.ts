// Contratos públicos /v1. Espelham os DTOs de resposta do backend, sem
// importar código do servidor nem converter IDs/NUMERIC para Number.
export type Perfil = 'consulta' | 'edicao' | 'administracao';

export interface AuthUser {
  usuarioId: string;
  nome: string;
  perfil: Perfil;
}

export interface LoginResponse {
  accessToken: string;
  tokenType: 'Bearer';
  expiresIn: number;
}

export interface ColecaoPaginaResponse { limit: number; offset: number }
export interface PacienteResponse { pacienteId: string; nome: string }
export interface PacienteCapacidadesResponse { podeCadastrar: boolean }

export interface PacienteDetalheResponse {
  pacienteId: string;
  nome: string;
  dataNascimento: string | null;
  sexo: string | null;
  idade: number | null;
  dataReferenciaIdade: string;
  raca: string | null;
  pertenceComunidadeTradicional: boolean | null;
  tipoComunidadeTradicional: string | null;
  versao: string;
  endereco: { endereco: string | null; cidade: string | null } | null;
  telefones: Array<string | null>;
  paginacaoColecoes: ColecaoPaginaResponse;
  atendimentos: Array<{
    atendimentoId: string;
    dataAtendimento: string;
    observacoes: string | null;
    versao: string;
  }>;
}

export interface AtendimentoResumoResponse {
  atendimentoId: string;
  dataAtendimento: string;
  localizacaoProntuario: string | null;
  ambulatorioUnicamente: boolean | null;
  ambulatorioAnexoProjeto: boolean | null;
  observacoes: string | null;
  versao: string;
}

export interface DadosClinicosResponse {
  alturaCm: string | null;
  pesoKg: string | null;
  circunferenciaAbdominalCm: string | null;
  frequenciaCardiacaBpm: number | null;
  saturacaoPercentual: string | null;
  paSistolicaMmhg: number | null;
  paDiastolicaMmhg: number | null;
  nyha: string | null;
  observacoes: string | null;
}

export interface DiagnosticoChagasResponse {
  possuiDiagnosticoChagas: boolean | null;
  statusDiagnostico: string | null;
  resultadoFinal: string | null;
  dataResultadoFinal: string | null;
  dataDescobertaAutorelato: string | null;
  criterioConfirmacao: string | null;
  observacoes: string | null;
}

export interface ExameResponse {
  exameId: string;
  atendimentoId: string | null;
  bloco: string;
  identificacao: string | null;
  resultado: string | null;
  observacoes: string | null;
  codigoExame: string;
  nomeExame: string;
}

export interface PendenciaAtendimentoResponse {
  pendenciaId: string;
  descricao: string | null;
  status: string | null;
  dataIdentificacao: string | null;
  dataResolucao: string | null;
}

export interface FamiliarExaminadoResponse {
  resultadoId: string;
  rastreioFamiliarId: string;
  identificacaoFamiliar: string;
  resultadoSorologia: string;
}

export interface RastreioFamiliarResponse {
  rastreioFamiliarId: string;
  familiaresExaminados: boolean | null;
  familiares: FamiliarExaminadoResponse[];
  paginacaoFamiliares: ColecaoPaginaResponse;
}

export interface AtendimentoDetalheResponse extends AtendimentoResumoResponse {
  dadosClinicos: DadosClinicosResponse | null;
  diagnosticoChagas: DiagnosticoChagasResponse | null;
  exames: ExameResponse[];
  pendencias: PendenciaAtendimentoResponse[];
  rastreioFamiliar: RastreioFamiliarResponse | null;
  rastreiosFamiliares: RastreioFamiliarResponse[];
  paginacaoColecoes: ColecaoPaginaResponse;
}

export interface RetornoBznResponse {
  retornoId: string;
  atendimentoId: string;
  dataRealizada: string | null;
  tipo: string;
  resumo: string | null;
  status: string | null;
}

export interface ReacaoBznResponse {
  reacaoId: string;
  descricao: string;
  gravidade: string | null;
  dataReacao: string | null;
  consequencia: string | null;
  observacoes: string | null;
}

export interface TratamentoBznResponse {
  tratamentoId: string;
  atendimentoId: string | null;
  temIndicacao: boolean | null;
  iniciado: boolean | null;
  tratamentoPeloAmbulatorio: boolean | null;
  duracaoCumpridaDias: number | null;
  anoUsoAproximado: number | null;
  dataPrescricao: string | null;
  motivoNaoIndicacao: string | null;
  motivoNaoInicio: string | null;
  teveReacaoAdversa: boolean | null;
  observacoes: string | null;
  reacoes: ReacaoBznResponse[];
}

export interface ProjectResponse {
  projetoId: string;
  codigo: string;
  nome: string;
  participa: boolean | null;
  possuiPendencia: boolean | null;
  descricaoPendencia: string | null;
  houveFalha: boolean | null;
  descricaoFalha: string | null;
  observacoes: string | null;
}

export interface NotificationResponse {
  notificacaoId: string;
  pacienteNotificado: boolean | null;
  numeroNotificacao: string | null;
  justificativaNaoNotificacao: string | null;
  observacoes: string | null;
}

export interface ReferralResponse {
  encaminhamentoId: string;
  atendimentoId: string;
  tipoEncaminhamentoId: string | null;
  projetoId: string | null;
  origem: string | null;
  destinoNome: string | null;
  destinoServico: string | null;
  especialidadeDestino: string | null;
  dataEncaminhamento: string | null;
  dataAgendamento: string | null;
  dataRealizacao: string | null;
  status: string | null;
  prioridade: string | null;
  documentoApresentado: boolean | null;
  motivo: string | null;
  condutaOrientada: string | null;
  observacoes: string | null;
}

export interface CounterReferralResponse {
  contrarreferenciaId: string;
  encaminhamentoId: string;
  atendimentoId: string;
  dataRealizada: string | null;
  status: string | null;
  resumo: string | null;
  conduta: string | null;
  observacoes: string | null;
}

export interface PendenciaResponse {
  pendenciaId: string;
  atendimentoId: string;
  descricao: string;
  status: string | null;
  dataIdentificacao: string | null;
  dataResolucao: string | null;
}

export interface ClinicalEventResponse {
  eventoId: string;
  tipo: 'ultimo_comparecimento_ano_informado';
  ano: number;
  precisao: 'ano';
}

export interface AnnualReturnResponse {
  retornoId: string;
  atendimentoId: string;
  dataRealizada: string;
  resumo: string | null;
}
