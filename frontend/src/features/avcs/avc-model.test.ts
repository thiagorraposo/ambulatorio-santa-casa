import { describe, it, expect } from 'vitest';
import { avcBody, avcReturn, emptyAvc } from './avc-model';
describe('AVC longitudinal', () => {
  it('ano não infere ocorrência e preserva negativa e texto literal', () => {
    expect(avcBody({ ...emptyAvc(), anoEvento: '0', descricao: '  relato  ' })).toEqual({ ocorreu: null, anoEvento: 0, descricao: '  relato  ', observacoes: null });
    expect(avcBody({ ...emptyAvc(), ocorreu: 'nao', anoEvento: '9999' }).ocorreu).toBe(false);
  });
  it('retorno não aceita origem externa ou outro paciente', () => {
    const p = '/pacientes/123';
    expect(avcReturn(p, p + '/atendimentos/456?limit=10')).toBe(p + '/atendimentos/456?limit=10');
    for (const bad of ['//evil.invalid', '/pacientes/124', p + '/avcs', '/pacientes/1234/atendimentos/1']) expect(avcReturn(p, bad)).toBe(p);
  });
});
