// Contratos públicos /v1. Espelham os DTOs de resposta do backend, sem
// importar código do servidor nem converter IDs/NUMERIC para Number.
export type Perfil = 'consulta' | 'edicao' | 'administracao';

export interface AuthUser {
  usuarioId: string;
  nome: string;
  perfil: Perfil;
  login?: string;
  ativo?: boolean;
  trocaObrigatoria?: boolean;
}

export interface LoginResponse {
  accessToken: string;
  tokenType: 'Bearer';
  expiresIn: number;
  trocaObrigatoria?: boolean;
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
    dataAtendimento: string | null;
    observacoes: string | null;
    versao: string;
  }>;
}

export interface AtendimentoResumoResponse {
  atendimentoId: string;
  dataAtendimento: string | null;
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

export type ImportacaoCodigoErro = 'falha_operacional' | 'campo_obrigatorio_ausente' | 'data_invalida'
  | 'booleano_invalido' | 'numero_invalido' | 'ano_invalido' | 'duracao_ambigua'
  | 'dominio_invalido' | 'identidade_ambigua' | 'dados_conflitantes'
  | 'catalogo_indisponivel' | 'proveniencia_ambigua' | 'dados_divergentes'
  | 'cadeia_reprocessamento_invalida' | 'linha_rejeitada' | 'pendencia_nao_promovida';

export type ImportacaoFinalidade = 'carga_inicial' | 'mesmo_conteudo' | 'revisao';

export interface ImportacaoRelatorioResponse {
  totalLinhas: number;
  linhasImportadas: number;
  linhasComPendencia: number;
  linhasRejeitadas: number;
  codigosErro: { codigo: ImportacaoCodigoErro; total: number }[];
}

export interface ImportacaoSubmitResponse {
  codigoLote: string;
  codigoLoteSolicitado: string;
  dryRun: boolean;
  loteId: string | null;
  status: string;
  relatorio: ImportacaoRelatorioResponse;
}

export interface ImportacaoLoteResponse {
  loteId: string; codigo: string; layout: string; status: string; reprocessadoDe: string | null;
  iniciadoEm: string | null; finalizadoEm: string | null; criadoEm: string; atualizadoEm: string;
  possuiErro: boolean; codigoErro: ImportacaoCodigoErro | null; totalLinhas: number;
  linhasImportadas: number; linhasComPendencia: number; linhasRejeitadas: number;
}

export interface ImportacaoLinhaResponse {
  linhaId: string; aba: string; abaOrdem: number; numero: number; status: string;
  possuiErro: boolean; codigoErro: ImportacaoCodigoErro | null; criadoEm: string; atualizadoEm: string;
}

export interface ImportacaoLoteDetalheResponse extends ImportacaoLoteResponse {
  paginacaoLinhas: ColecaoPaginaResponse; linhas: ImportacaoLinhaResponse[];
}

export interface AnnualReturnResponse {
  retornoId: string;
  atendimentoId: string;
  dataRealizada: string;
  resumo: string | null;
}

export type SorologiaResult = 'reagente' | 'nao_reagente' | 'inconclusivo' | 'indeterminado' | 'nao_informado';
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
export interface SorologiaCriadaResponse { sorologiaId: string }

export interface CondicaoChagasResponse {
  condicaoChagasId: string;
  atendimentoId: string;
  formaClinica: string | null;
  faseDoenca: string | null;
  classificacaoClinica: string | null;
  possuiSintomas: boolean | null;
  descricaoSintomas: string | null;
  observacoes: string | null;
}
export interface CondicaoChagasCriadaResponse { condicaoChagasId: string }

export interface ComplicacaoResponse {
  complicacaoChagasId: string;
  atendimentoId: string;
  tipoComplicacao: string | null;
  possuiComplicacao: boolean | null;
  descricao: string | null;
  gravidade: string | null;
}
export interface ComplicacaoCriadaResponse { complicacaoChagasId: string }

export interface ComorbidadeCatalogoResponse { id: string; nome: string; ativo: boolean }
export interface AvaliacaoComorbidadesBody {
  itens?: Array<{ comorbidadeId: string; possuiComorbidade: boolean | null; observacoes: string | null }>;
  historicoFamiliar?: { possuiDoenca: boolean | null; descricao: string | null };
}
export interface AvaliacaoComorbidadesResponse {
  avaliacaoComorbidadesId: string;
  atendimentoId: string;
  itens: Array<{ itemId: string; comorbidadeId: string; nomeComorbidade: string;
    possuiComorbidade: boolean | null; observacoes: string | null }>;
  historicoFamiliar: { possuiDoenca: boolean | null; descricao: string | null } | null;
}

export interface AvcResponse { eventoId: string; pacienteId: string; tipo: 'avc'; ocorreu: boolean | null; anoEvento: number | null; descricao: string | null; observacoes: string | null }
export interface AvcCriadoResponse { eventoId: string }

export interface DispositivoResponse { dispositivoId: string; pacienteId: string; tipoDispositivo: 'marcapasso' | 'cdi'; possuiDispositivo: boolean | null; observacoes: string | null }
export interface DispositivoCriadoResponse { dispositivoId: string }

export interface ObitoResponse { obitoId: string; pacienteId: string; houveObito: boolean | null; dataObito: string | null; causaObito: string | null; observacoes: string | null }
export interface ObitoCriadoResponse { obitoId: string }

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

export interface ReacaoBznOcorrenciaResponse {
  reacaoId:string; tratamentoId:string; descricao:string|null; gravidade:string|null;
  dataReacao:string|null; consequencia:string|null; observacoes:string|null;
}
export interface ReacaoBznCriadaResponse { reacaoId:string }

export interface ResultadoExameResponse {
  resultadoId:string;exameId:string;nomeParametro:string;valorInformado:string|null;unidadeInformada:string|null;
  referenciaInformada:string|null;interpretacaoInformada:string|null;observacoes:string|null;
}

export interface ResultadoExameCriadoResponse {resultadoId:string}

export interface UsuarioResumo {
  usuarioId: string; nome: string; perfil: 'consulta' | 'edicao' | 'administracao'; login: string; ativo: boolean; versao?: string;
}
