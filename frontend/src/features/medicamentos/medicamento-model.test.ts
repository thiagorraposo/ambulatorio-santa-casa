import { describe, expect, it } from 'vitest';
import { medicamentoValue } from './medicamento-model';
describe('leitura literal de medicamentos', () => {
  it('distingue negativa, desconhecido, dose literal e data clínica sem fuso', () => {
    expect(medicamentoValue('usoAtual',false)).toBe('Não');
    expect(medicamentoValue('usoAtual',null)).toBe('Não informado');
    expect(medicamentoValue('prescritoNoAtendimento',true)).toBe('Sim');
    expect(medicamentoValue('dose','  texto sem conversão  ')).toBe('  texto sem conversão  ');
    expect(medicamentoValue('dataInicio','2026-02-01')).toBe('01/02/2026');
    expect(medicamentoValue('nomeMedicamentoLivre','')).toBe('Em branco');
  });
});
