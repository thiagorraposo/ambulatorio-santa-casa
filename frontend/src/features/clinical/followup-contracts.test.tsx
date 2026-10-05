import { describe, expect, it } from 'vitest';
import { followupBody, notificationDraft, pendingDraft, projectDraft } from './followup-contracts';

const BIG_ID = '9007199254740993';

describe('semântica dos registros de acompanhamento', () => {
  it('preserva IDs texto, indicadores independentes e reações sem inferir início ou comparecimento', () => {
    const body = followupBody('bzn', {
      atendimentoId: BIG_ID, temIndicacao: 'false', iniciado: '', tratamentoPeloAmbulatorio: 'false',
      teveReacaoAdversa: '', duracaoCumpridaDias: '60', anoUsoAproximado: '2014', dataPrescricao: '',
      motivoNaoIndicacao: 'Relato sintético preservado', motivoNaoInicio: 'Motivo distinto', observacoes: 'Texto livre',
    }, { reactions: [{ descricao: 'Descrição sintética', gravidade: 'Texto de gravidade', dataReacao: '2014-02-28',
      consequencia: 'Consequência informada', observacoes: 'Não classificar automaticamente' }] });
    expect(body.atendimentoId).toBe(BIG_ID);
    expect(body).toMatchObject({ temIndicacao: false, iniciado: null, tratamentoPeloAmbulatorio: false,
      teveReacaoAdversa: null, duracaoCumpridaDias: 60, anoUsoAproximado: 2014, dataPrescricao: null,
      motivoNaoIndicacao: 'Relato sintético preservado', motivoNaoInicio: 'Motivo distinto', observacoes: 'Texto livre' });
    expect(body.reacoes).toEqual([{ descricao: 'Descrição sintética', gravidade: 'Texto de gravidade',
      dataReacao: '2014-02-28', consequencia: 'Consequência informada', observacoes: 'Não classificar automaticamente' }]);
    expect(body).not.toHaveProperty('dataAtendimento');
    expect(body).not.toHaveProperty('retornoProgramado');
  });

  it.each(['retorno_bzn_30_dias', 'retorno_bzn_final'])('registra a data efetiva de %s sem cálculo de 30/60 dias', tipo => {
    expect(followupBody('retorno-bzn', {
      atendimentoId: BIG_ID, tipo, dataRealizada: '2024-02-29', resumo: 'Comparecimento sintético',
    })).toEqual({ atendimentoId: BIG_ID, tipo, dataRealizada: '2024-02-29', resumo: 'Comparecimento sintético' });
  });

  it('separa fato de precisão anual de retorno anual efetivo', () => {
    expect(followupBody('ocorrencia-anual', { ano: '2023' })).toEqual({ ano: 2023 });
    expect(() => followupBody('ocorrencia-anual', { ano: String(new Date().getFullYear() + 1) })).toThrow(/Ano de comparecimento informado/);
    expect(followupBody('retorno-anual', { atendimentoId: BIG_ID, dataRealizada: '2024-10-04', resumo: '' }))
      .toEqual({ atendimentoId: BIG_ID, dataRealizada: '2024-10-04', resumo: null });
    expect(() => followupBody('retorno-anual', { atendimentoId: BIG_ID, dataRealizada: '2024' })).toThrow(/dia, mês e ano/);
    expect(() => followupBody('retorno-bzn', { atendimentoId: BIG_ID, tipo: 'retorno_bzn_30_dias', dataRealizada: '9999-01-01' }))
      .toThrow(/data futura/);
  });

  it('edita somente os campos alterados de uma notificação e preserva false e textos independentes', () => {
    const original = notificationDraft({ notificacaoId: BIG_ID, pacienteNotificado: false,
      numeroNotificacao: 'SINTETICO-001', justificativaNaoNotificacao: 'Justificativa anterior', observacoes: null });
    expect(followupBody('notificacao', { ...original, observacoes: 'Nova observação' }, { original }))
      .toEqual({ observacoes: 'Nova observação' });
    expect(followupBody('notificacao', { ...original, pacienteNotificado: '' }, { original }))
      .toEqual({ pacienteNotificado: null });
    expect(followupBody('notificacao', original)).toMatchObject({ pacienteNotificado: false,
      numeroNotificacao: 'SINTETICO-001', justificativaNaoNotificacao: 'Justificativa anterior' });
  });

  it('não apaga estados ou textos de projeto que o usuário não alterou', () => {
    const original = projectDraft({ projetoId: BIG_ID, codigo: 'SINTETICO', nome: 'Projeto sintético',
      participa: false, possuiPendencia: null, descricaoPendencia: 'Texto preservado', houveFalha: false,
      descricaoFalha: 'Descrição independente', observacoes: 'Observação anterior' });
    const result = followupBody('projeto', { ...original, participa: '' }, { original, projectId: BIG_ID });
    expect(result).toEqual({ projetoId: BIG_ID, participa: null });
  });

  it('encaminhamento leva todos os campos preenchidos e mantém os indicadores desconhecidos', () => {
    const result = followupBody('encaminhamento', { atendimentoId: BIG_ID, tipoEncaminhamentoId: '12', projetoId: '13',
      origem: 'ambulatorio', destinoNome: 'Nome sintético', destinoServico: 'Serviço sintético', especialidadeDestino: 'Especialidade',
      dataEncaminhamento: '2024-02-29', dataAgendamento: '2024-03-10', dataRealizacao: '', status: 'agendado',
      prioridade: 'media', documentoApresentado: '', motivo: 'Motivo informado', condutaOrientada: 'Conduta informada', observacoes: 'Observação' });
    expect(result).toMatchObject({ atendimentoId: BIG_ID, tipoEncaminhamentoId: '12', projetoId: '13',
      origem: 'ambulatorio', destinoNome: 'Nome sintético', destinoServico: 'Serviço sintético', especialidadeDestino: 'Especialidade',
      dataEncaminhamento: '2024-02-29', dataAgendamento: '2024-03-10', dataRealizacao: null, status: 'agendado',
      prioridade: 'media', documentoApresentado: null, motivo: 'Motivo informado', condutaOrientada: 'Conduta informada', observacoes: 'Observação' });
  });

  it('contrarreferência simples não atribui atendimento ou novo encaminhamento no corpo', () => {
    const result = followupBody('contrarreferencia', { dataRealizada: '2024-03-01', status: '',
      resumo: 'Episódio 1', conduta: 'Conduta sintética', observacoes: 'Observação própria' });
    expect(result).toEqual({ dataRealizada: '2024-03-01', status: null, resumo: 'Episódio 1',
      conduta: 'Conduta sintética', observacoes: 'Observação própria' });
    expect(result).not.toHaveProperty('atendimentoId');
    expect(result).not.toHaveProperty('encaminhamentoId');
  });

  it('exige data na resolução e remoção explícita da data ao reabrir', () => {
    expect(() => followupBody('pendencia', { status: 'resolvida', dataResolucao: '' }, { updatePending: true }))
      .toThrow(/data da resolução/);
    expect(() => followupBody('pendencia', { status: 'aberta', dataResolucao: '2024-03-01' }, { updatePending: true }))
      .toThrow(/Data de resolução exige status resolvida/);
    expect(followupBody('pendencia', { status: 'resolvida', dataResolucao: '2024-03-01' }, { updatePending: true }))
      .toEqual({ status: 'resolvida', dataResolucao: '2024-03-01' });
    expect(followupBody('pendencia', { status: 'aberta', dataResolucao: '' }, { updatePending: true }))
      .toEqual({ status: 'aberta', dataResolucao: null });
    expect(() => followupBody('pendencia', { atendimentoId: BIG_ID, descricao: 'Pendência sintética', status: 'resolvida' }))
      .toThrow(/data da resolução/);
    expect(followupBody('pendencia', { atendimentoId: BIG_ID, descricao: 'Pendência sintética', status: 'resolvida',
      dataIdentificacao: '2024-01-01', dataResolucao: '2024-03-01' }))
      .toEqual({ atendimentoId: BIG_ID, descricao: 'Pendência sintética', status: 'resolvida',
        dataIdentificacao: '2024-01-01', dataResolucao: '2024-03-01' });
  });

  it('carrega data de resolução e status não reconhecido sem traduzir para aberta', () => {
    expect(pendingDraft({ pendenciaId: BIG_ID, atendimentoId: '20', descricao: 'Texto sintético',
      dataIdentificacao: '2024-01-01', status: 'legado_sintetico', dataResolucao: '2024-02-29' }))
      .toEqual({ status: 'legado_sintetico', dataResolucao: '2024-02-29' });
  });

  it('recusa datas impossíveis, IDs convertidos e duração livre sem interpretação automática', () => {
    expect(() => followupBody('bzn', { duracaoCumpridaDias: '2 meses' })).toThrow(/número inteiro/);
    expect(() => followupBody('bzn', { dataPrescricao: '2024-02-30' })).toThrow(/data não é válida/);
    expect(() => followupBody('bzn', { dataPrescricao: '0000-01-01' })).toThrow(/data não é válida/);
    expect(() => followupBody('bzn', { temIndicacao: 'sim' })).toThrow(/indicador/);
    expect(() => followupBody('retorno-anual', { atendimentoId: '9.007199254740993e15', dataRealizada: '2024-01-01' }))
      .toThrow(/atendimento/);
    expect(() => followupBody('bzn', {}, { reactions: [{ descricao: '  ', gravidade: '', dataReacao: '', consequencia: '', observacoes: '' }] }))
      .toThrow(/descrição da reação/);
  });
});
