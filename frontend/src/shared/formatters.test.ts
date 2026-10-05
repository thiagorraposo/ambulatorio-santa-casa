import { describe, expect, it } from 'vitest';
import { clinicalLabel, displayText, formatAge, formatClinicalDate, formatNumeric, triState } from './formatters';

describe('apresentação dos contratos clínicos', () => {
  it('mantém false, null, zero e texto em branco distintos', () => {
    expect(triState(true)).toBe('Sim');
    expect(triState(false)).toBe('Não');
    expect(triState(null)).toBe('Não informado');
    expect(displayText(0)).toBe('0');
    expect(displayText('')).toBe('Em branco');
    expect(displayText(null)).toBe('Não informado');
  });

  it('apresenta dias clínicos sem construir um instante ou deslocar o fuso', () => {
    expect(formatClinicalDate('1980-02-10')).toBe('10/02/1980');
    expect(formatClinicalDate('2024-02-29')).toBe('29/02/2024');
    expect(formatClinicalDate('data_legada')).toBe('data_legada');
    expect(formatClinicalDate(null)).toBe('Não informado');
  });

  it('preserva precisão e escala do NUMERIC do PostgreSQL', () => {
    expect(formatNumeric('9007199254740993.123456789000', 'kg')).toBe('9007199254740993,123456789000 kg');
    expect(formatNumeric('0.000000000001', 'cm')).toBe('0,000000000001 cm');
    expect(formatNumeric(0, 'bpm')).toBe('0 bpm');
    expect(formatNumeric(null, 'kg')).toBe('Não informado');
  });

  it('usa a idade e a referência retornadas pela API sem recalcular', () => {
    expect(formatAge(37, '2001-01-01')).toBe('37 anos · referência: 01/01/2001');
    expect(formatAge(1, '2025-10-03')).toBe('1 ano · referência: 03/10/2025');
    expect(formatAge(null, '2025-10-03')).toBe('Idade não informada · referência: 03/10/2025');
  });

  it('preserva códigos desconhecidos em vez de classificá-los por aproximação', () => {
    expect(clinicalLabel('legado_sintetico')).toBe('legado_sintetico');
    expect(clinicalLabel('__proto__')).toBe('__proto__');
    expect(clinicalLabel('nao_informado')).toBe('Não informado');
    expect(clinicalLabel('feminino')).toBe('Feminino');
  });
});
