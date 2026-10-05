export interface ColecaoPaginaResponse { limit: number; offset: number }

export interface PacienteCriadoResponse { pacienteId: string }
export interface PacienteAtualizadoResponse { pacienteId: string; versao: string }
export interface AtendimentoCriadoResponse { atendimentoId: string }
export interface RetornoBznCriadoResponse { retornoId: string }

export interface PacienteDetalheResponse {
  pacienteId: string; nome: string; dataNascimento: string | null; sexo: string | null;
  idade: number | null; dataReferenciaIdade: string; raca: string | null;
  pertenceComunidadeTradicional: boolean | null; tipoComunidadeTradicional: string | null;
  versao: string; endereco: { endereco: string | null; cidade: string | null } | null;
  telefones: Array<string | null>; paginacaoColecoes: ColecaoPaginaResponse;
  atendimentos: Array<{ atendimentoId: string; dataAtendimento: string; observacoes: string | null; versao: string }>;
}

export interface AtendimentoResumoResponse {
  atendimentoId: string; dataAtendimento: string; localizacaoProntuario: string | null;
  ambulatorioUnicamente: boolean | null; ambulatorioAnexoProjeto: boolean | null;
  observacoes: string | null; versao: string;
}

export interface DadosClinicosResponse {
  // PostgreSQL entrega NUMERIC como texto, preservando a precisão decimal.
  alturaCm: string | null; pesoKg: string | null; circunferenciaAbdominalCm: string | null;
  frequenciaCardiacaBpm: number | null; saturacaoPercentual: string | null;
  paSistolicaMmhg: number | null; paDiastolicaMmhg: number | null;
  nyha: string | null; observacoes: string | null;
}

export interface DiagnosticoChagasResponse {
  possuiDiagnosticoChagas: boolean | null; statusDiagnostico: string | null;
  resultadoFinal: string | null; dataResultadoFinal: string | null;
  dataDescobertaAutorelato: string | null; criterioConfirmacao: string | null;
  observacoes: string | null;
}

export interface ExameResponse {
  exameId: string; atendimentoId: string | null; bloco: string;
  identificacao: string | null; resultado: string | null; observacoes: string | null;
  codigoExame: string; nomeExame: string;
}

export interface PendenciaAtendimentoResponse {
  pendenciaId: string; descricao: string | null; status: string | null;
  dataIdentificacao: string | null;
  dataResolucao: string | null;
}

export interface FamiliarExaminadoResponse {
  rastreioFamiliarId: string; identificacaoFamiliar: string; resultadoSorologia: string;
}

export interface RastreioFamiliarResponse {
  rastreioFamiliarId: string; familiaresExaminados: boolean | null;
  familiares: FamiliarExaminadoResponse[];
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
  retornoId: string; atendimentoId: string; dataRealizada: string | null;
  tipo: string; resumo: string | null; status: string | null;
}

export interface ReacaoBznResponse {
  reacaoId: string; descricao: string; gravidade: string | null;
  dataReacao: string | null; consequencia: string | null; observacoes: string | null;
}

export interface TratamentoBznResponse {
  tratamentoId: string; atendimentoId: string | null; temIndicacao: boolean | null;
  iniciado: boolean | null; tratamentoPeloAmbulatorio: boolean | null;
  duracaoCumpridaDias: number | null; anoUsoAproximado: number | null;
  dataPrescricao: string | null; motivoNaoIndicacao: string | null;
  motivoNaoInicio: string | null; teveReacaoAdversa: boolean | null;
  observacoes: string | null; reacoes: ReacaoBznResponse[];
}
