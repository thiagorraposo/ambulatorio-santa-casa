import { describe,it,expect } from 'vitest';
import { obitoBody,emptyObito,obitoValue } from './obito-model';
describe('estado inicial de óbito',()=>{
 it('não infere indicador da data/causa e mantém os campos independentes',()=>{
  expect(obitoBody(emptyObito())).toEqual({houveObito:null,dataObito:null,causaObito:null,observacoes:null});
  expect(obitoBody({...emptyObito(),houveObito:'nao',dataObito:'2026-02-01',causaObito:'  literal  '})).toEqual({houveObito:false,dataObito:'2026-02-01',causaObito:'  literal  ',observacoes:null});
  expect(obitoValue('dataObito','2026-02-01')).toBe('01/02/2026');
 });
});
