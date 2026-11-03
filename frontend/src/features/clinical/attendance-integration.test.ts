import { describe, expect, it } from 'vitest';
import { type IntegratedDraft, completeAttendanceReceipt, integratedBody, integratedFieldLabel } from './attendance-integration';
import { FieldValidationError } from '../../shared/field-validation';

describe('contrato do rascunho integrado', () => {
  it('omite campos ausentes e preserva negativo, desconhecido, texto e identificadores precisos', () => {
    expect(integratedBody({ condicaoChagas: [{ possuiSintomas: 'nao', descricaoSintomas: '  Texto sintético  ' }],
      comorbidades: [{ comorbidadeId: '9007199254740993', possuiComorbidade: 'desconhecido' }],
      avcs: [{ ocorreu: 'desconhecido', anoEvento: '0' }] })).toEqual({
      condicaoChagas: { possuiSintomas: false, descricaoSintomas: '  Texto sintético  ' },
      comorbidades: { itens: [{ comorbidadeId: '9007199254740993', possuiComorbidade: null }] },
      avcs: [{ ocorreu: null, anoEvento: 0 }],
    });
  });
  it('recusa avaliação sem presença explícita e linha vazia sem inferir negativo', () => {
    for (const draft of ([{ comorbidades: [{ comorbidadeId: '1' }] }, { condicaoChagas: [{}] }, { historicoFamiliar: [{ descricao: 'Sintético' }] }] as IntegratedDraft[])) {
      expect(() => integratedBody(draft)).toThrow(FieldValidationError);
    }
  });
  it('valida datas, opções e faixa de inteiros também nas seções inativas', () => {
    for (const draft of ([{ sorologias: [{ dataColeta: '2026-02-30' }] }, { avcs: [{ anoEvento: '10000' }] },
      { condicaoChagas: [{ possuiSintomas: 'talvez' }] }, { tratamentoBzn: [{ duracaoCumpridaDias: '0' }] }] as IntegratedDraft[])) {
      expect(() => integratedBody(draft)).toThrow(FieldValidationError);
    }
  });
  it('valida todos os IDs esperados antes de reconhecer uma confirmação integral', () => {
    const draft = { sorologias: [{ resultado: 'reagente' }, { resultado: 'nao_reagente' }], historicoFamiliar: [{ possuiDoenca: 'nao' }] };
    expect(completeAttendanceReceipt({ atendimentoId: '1' }, draft)).toBe(false);
    expect(completeAttendanceReceipt({ atendimentoId: '1', sorologia0Id: '2', sorologia1Id: '3', avaliacaoComorbidadesId: '4' }, draft)).toBe(true);
    expect(completeAttendanceReceipt({ atendimentoId: 1 })).toBe(false);
  });
  it('limita os caminhos públicos aos campos e índices conhecidos', () => {
    expect(integratedFieldLabel('sorologias.29.dataColeta')).toBe('Data da coleta 30');
    expect(integratedFieldLabel('sorologias.30.dataColeta')).toBeUndefined();
    expect(integratedFieldLabel('sorologias.0.seguroPrivado')).toBeUndefined();
  });
});
