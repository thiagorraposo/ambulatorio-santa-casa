import type { NotificationResponse, PendenciaResponse, ProjectResponse } from '../../api/contracts';

export type FollowupKind = 'bzn' | 'retorno-bzn' | 'projeto' | 'notificacao' | 'encaminhamento'
  | 'contrarreferencia' | 'retorno-anual' | 'ocorrencia-anual' | 'pendencia';
export type FollowupDraft = Record<string, string>;
export interface ReactionDraft {
  descricao: string;
  gravidade: string;
  dataReacao: string;
  consequencia: string;
  observacoes: string;
}
export interface CatalogOption { id: string; codigo: string; nome: string; ativo: boolean }

export const followupTitles: Record<FollowupKind, string> = {
  bzn: 'Registrar tratamento BZN', 'retorno-bzn': 'Registrar retorno BZN',
  projeto: 'Participação em projeto', notificacao: 'Notificação do paciente',
  encaminhamento: 'Registrar encaminhamento', contrarreferencia: 'Registrar contrarreferência',
  'retorno-anual': 'Registrar retorno anual', 'ocorrencia-anual': 'Registrar ano de comparecimento informado',
  pendencia: 'Pendências do paciente',
};
export const followupSections: Record<FollowupKind, string> = {
  bzn: 'bzn', 'retorno-bzn': 'bzn', projeto: 'projetos', notificacao: 'notificacao',
  encaminhamento: 'encaminhamentos', contrarreferencia: 'encaminhamentos',
  'retorno-anual': 'acompanhamento', 'ocorrencia-anual': 'acompanhamento', pendencia: 'pendencias',
};
export function isFollowupKind(value: string | null): value is FollowupKind {
  return value !== null && Object.hasOwn(followupTitles, value);
}

export const pendingStatuses = [
  ['aberta', 'Aberta'], ['em_andamento', 'Em andamento'], ['resolvida', 'Resolvida'],
  ['cancelada', 'Cancelada'], ['nao_informado', 'Não informado'],
] as const;
export const referralStatuses = [
  ['indicado', 'Indicado'], ['solicitado', 'Solicitado'], ['agendado', 'Agendado'], ['realizado', 'Realizado'],
  ['pendente', 'Pendente'], ['cancelado', 'Cancelado'], ['nao_compareceu', 'Não compareceu'], ['nao_informado', 'Não informado'],
] as const;
export const counterReferralStatuses = [
  ['programado', 'Programado'], ['em_andamento', 'Em andamento'], ['concluido', 'Concluído'],
  ['pendente', 'Pendente'], ['cancelado', 'Cancelado'], ['perdido_seguimento', 'Perdido seguimento'],
  ['nao_informado', 'Não informado'],
] as const;
export const referralOrigins = [
  ['ambulatorio', 'Ambulatório'], ['projeto_pesquisa', 'Projeto de pesquisa'], ['atencao_basica', 'Atenção básica'],
  ['servico_especializado', 'Serviço especializado'], ['hospital', 'Hospital'],
  ['demanda_espontanea', 'Demanda espontânea'], ['outro', 'Outro'], ['nao_informado', 'Não informado'],
] as const;
export const priorities = [
  ['baixa', 'Baixa'], ['media', 'Média'], ['alta', 'Alta'], ['urgente', 'Urgente'], ['nao_informado', 'Não informado'],
] as const;

const idPattern = /^[1-9]\d{0,18}$/;
const datePattern = /^\d{4}-\d{2}-\d{2}$/;
export function clinicalId(value: string | undefined, label: string, required = true): string | null {
  if (!value && !required) return null;
  if (!value || !idPattern.test(value)) throw new Error(`Selecione ${label}.`);
  // IDs bigint are never parsed as Number.
  return value;
}
function clinicalDate(value: string | undefined, label: string, required = false): string | null {
  if (!value && !required) return null;
  if (!value || !datePattern.test(value)) throw new Error(`Informe ${label} com dia, mês e ano.`);
  const parsed = new Date(`${value}T12:00:00Z`);
  if (value.startsWith('0000-') || Number.isNaN(parsed.getTime()) || parsed.toISOString().slice(0, 10) !== value) {
    throw new Error(`Revise ${label}; a data não é válida.`);
  }
  return value;
}
function effectiveDate(value: string | undefined): string {
  const result = clinicalDate(value, 'a data efetiva do comparecimento', true)!;
  const now = new Date();
  const today = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
  if (result > today) throw new Error('Comparecimento efetivo não pode usar uma data futura. Registre a data em que o paciente compareceu.');
  return result;
}
function integer(value: string | undefined, label: string, maximum: number, required = false): number | null {
  if (!value && !required) return null;
  if (!value || !/^\d+$/.test(value)) throw new Error(`${label} deve ser um número inteiro positivo.`);
  const result = Number(value);
  if (!Number.isSafeInteger(result) || result < 1 || result > maximum) throw new Error(`Revise ${label}.`);
  return result;
}
function text(value: string | undefined, label: string, maximum = 10000, required = false): string | null {
  if (!value && !required) return null;
  if (!value || (required && !value.trim())) throw new Error(`Preencha ${label}.`);
  if (value.length > maximum) throw new Error(`${label} permite até ${maximum} caracteres.`);
  return value;
}
export function booleanInput(value: boolean | null | undefined): string {
  return value === true ? 'true' : value === false ? 'false' : '';
}
function booleanValue(value: string | undefined): boolean | null {
  if (!value) return null;
  if (value === 'true') return true;
  if (value === 'false') return false;
  throw new Error('Revise o indicador: escolha sim, não ou desconhecido.');
}
function state(value: string | undefined, options: readonly (readonly [string, string])[], label: string): string | null {
  if (!value) return null;
  if (!options.some(([key]) => key === value)) throw new Error(`Escolha um valor disponível para ${label}.`);
  return value;
}

export function notificationDraft(existing: NotificationResponse | null): FollowupDraft {
  return { pacienteNotificado: booleanInput(existing?.pacienteNotificado),
    numeroNotificacao: existing?.numeroNotificacao ?? '',
    justificativaNaoNotificacao: existing?.justificativaNaoNotificacao ?? '', observacoes: existing?.observacoes ?? '' };
}
export function projectDraft(existing: ProjectResponse | undefined): FollowupDraft {
  return { participa: booleanInput(existing?.participa), possuiPendencia: booleanInput(existing?.possuiPendencia),
    descricaoPendencia: existing?.descricaoPendencia ?? '', houveFalha: booleanInput(existing?.houveFalha),
    descricaoFalha: existing?.descricaoFalha ?? '', observacoes: existing?.observacoes ?? '' };
}
export function pendingDraft(existing: PendenciaResponse): FollowupDraft {
  return { status: existing.status ?? '', dataResolucao: existing.dataResolucao ?? '' };
}
function changed(body: Record<string, unknown>, draft: FollowupDraft, original?: FollowupDraft): Record<string, unknown> {
  if (!original) return body;
  return Object.fromEntries(Object.entries(body).filter(([key]) => draft[key] !== original[key]));
}

/** Every editable field has a public /v1 destination. No value is inferred from another field. */
export function followupBody(kind: FollowupKind, draft: FollowupDraft, options: {
  reactions?: ReactionDraft[]; original?: FollowupDraft; updatePending?: boolean; projectId?: string;
} = {}): Record<string, unknown> {
  switch (kind) {
    case 'bzn': {
      const attendance = clinicalId(draft.atendimentoId, 'o atendimento', false);
      const reactions = options.reactions ?? [];
      if (reactions.length > 30) throw new Error('É possível registrar até 30 reações na criação do tratamento.');
      return {
        ...(attendance ? { atendimentoId: attendance } : {}),
        temIndicacao: booleanValue(draft.temIndicacao), iniciado: booleanValue(draft.iniciado),
        tratamentoPeloAmbulatorio: booleanValue(draft.tratamentoPeloAmbulatorio),
        duracaoCumpridaDias: integer(draft.duracaoCumpridaDias, 'Duração cumprida em dias', 2147483647),
        anoUsoAproximado: integer(draft.anoUsoAproximado, 'Ano aproximado de uso', 9999),
        dataPrescricao: clinicalDate(draft.dataPrescricao, 'a data da prescrição'),
        motivoNaoIndicacao: text(draft.motivoNaoIndicacao, 'Motivo de não indicação'),
        motivoNaoInicio: text(draft.motivoNaoInicio, 'Motivo de não início'),
        teveReacaoAdversa: booleanValue(draft.teveReacaoAdversa), observacoes: text(draft.observacoes, 'Observações'),
        reacoes: reactions.map((reaction, index) => ({
          descricao: text(reaction.descricao, `a descrição da reação ${index + 1}`, 10000, true),
          gravidade: text(reaction.gravidade, 'Gravidade', 1000),
          dataReacao: clinicalDate(reaction.dataReacao, 'a data da reação'),
          consequencia: text(reaction.consequencia, 'Consequência'), observacoes: text(reaction.observacoes, 'Observações da reação'),
        })),
      };
    }
    case 'retorno-bzn':
      if (!['retorno_bzn_30_dias', 'retorno_bzn_final'].includes(draft.tipo)) throw new Error('Selecione o tipo de retorno BZN.');
      return { atendimentoId: clinicalId(draft.atendimentoId, 'o atendimento'), tipo: draft.tipo,
        dataRealizada: effectiveDate(draft.dataRealizada),
        ...(draft.resumo ? { resumo: text(draft.resumo, 'Resumo') } : {}) };
    case 'retorno-anual':
      return { atendimentoId: clinicalId(draft.atendimentoId, 'o atendimento'),
        dataRealizada: effectiveDate(draft.dataRealizada), resumo: text(draft.resumo, 'Resumo') };
    case 'ocorrencia-anual':
      return { ano: integer(draft.ano, 'Ano de comparecimento informado', new Date().getFullYear(), true) };
    case 'notificacao':
      return changed({ pacienteNotificado: booleanValue(draft.pacienteNotificado),
        numeroNotificacao: text(draft.numeroNotificacao, 'Número da notificação', 100),
        justificativaNaoNotificacao: text(draft.justificativaNaoNotificacao, 'Justificativa de não notificação'),
        observacoes: text(draft.observacoes, 'Observações') }, draft, options.original);
    case 'projeto':
      return { projetoId: clinicalId(options.projectId, 'o projeto'), ...changed({
        participa: booleanValue(draft.participa), possuiPendencia: booleanValue(draft.possuiPendencia),
        descricaoPendencia: text(draft.descricaoPendencia, 'Descrição da pendência'), houveFalha: booleanValue(draft.houveFalha),
        descricaoFalha: text(draft.descricaoFalha, 'Descrição da falha'), observacoes: text(draft.observacoes, 'Observações'),
      }, draft, options.original) };
    case 'encaminhamento':
      return { atendimentoId: clinicalId(draft.atendimentoId, 'o atendimento'),
        tipoEncaminhamentoId: clinicalId(draft.tipoEncaminhamentoId, 'o tipo de encaminhamento', false),
        projetoId: clinicalId(draft.projetoId, 'o projeto', false), origem: state(draft.origem, referralOrigins, 'origem'),
        destinoNome: text(draft.destinoNome, 'Nome do destino', 180), destinoServico: text(draft.destinoServico, 'Serviço de destino', 180),
        especialidadeDestino: text(draft.especialidadeDestino, 'Especialidade de destino', 120),
        dataEncaminhamento: clinicalDate(draft.dataEncaminhamento, 'a data do encaminhamento'),
        dataAgendamento: clinicalDate(draft.dataAgendamento, 'a data do agendamento'),
        dataRealizacao: clinicalDate(draft.dataRealizacao, 'a data da realização'),
        status: state(draft.status, referralStatuses, 'status'), prioridade: state(draft.prioridade, priorities, 'prioridade'),
        documentoApresentado: booleanValue(draft.documentoApresentado), motivo: text(draft.motivo, 'Motivo'),
        condutaOrientada: text(draft.condutaOrientada, 'Conduta orientada'), observacoes: text(draft.observacoes, 'Observações') };
    case 'contrarreferencia':
      return { dataRealizada: clinicalDate(draft.dataRealizada, 'a data de realização'),
        status: state(draft.status, counterReferralStatuses, 'status'), resumo: text(draft.resumo, 'Resumo'),
        conduta: text(draft.conduta, 'Conduta'), observacoes: text(draft.observacoes, 'Observações') };
    case 'pendencia': {
      const status = state(draft.status, pendingStatuses, 'status')
        ?? (!options.updatePending && draft.status === undefined ? 'aberta' : null);
      if (!status) throw new Error('Escolha o status da pendência.');
      const date = clinicalDate(draft.dataResolucao, 'a data da resolução', status === 'resolvida');
      if (date && status !== 'resolvida') throw new Error('Data de resolução exige status resolvida. Revise os dois campos.');
      if (options.updatePending) return { status, dataResolucao: date };
      return { atendimentoId: clinicalId(draft.atendimentoId, 'o atendimento'),
        descricao: text(draft.descricao, 'a descrição da pendência', 10000, true),
        status, dataResolucao: date,
        dataIdentificacao: clinicalDate(draft.dataIdentificacao, 'a data da identificação') };
    }
  }
}
