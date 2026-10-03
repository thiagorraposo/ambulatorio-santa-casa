import { csvCell } from '../../src/pacientes/csv-cell';

describe('CSV para planilhas', () => {
  it.each(['=1+1', '+1+1', '-1+1', '@SUM(1,1)', '\t=1+1', '\r=1+1', '\r\n=1+1', '  =1+1'])
    ('neutraliza prefixo executável %j', (value) => {
      expect(csvCell(value)).toBe(`"'${value.replace(/"/g, '""')}"`);
    });

  it.each(['Nome sintético', 'Sobrenome, "apelido"', 'valor - clinicamente legítimo'])
    ('preserva texto CSV não executável %j', (value) => {
      expect(csvCell(value)).toBe(`"${value.replace(/"/g, '""')}"`);
    });
});
