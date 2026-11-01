import {describe,expect,it} from 'vitest';
import {emptyReacao,reacaoBody,reacaoValue} from './reacao-model';
describe('reação BZN literal',()=>{
  it('preserva descrição/gravidade sem escala, null opcional e dia sem fuso',()=>{
    expect(reacaoBody({...emptyReacao(),descricao:'  Relato  ',gravidade:'Sem escala'})).toEqual({
      descricao:'  Relato  ',gravidade:'Sem escala',dataReacao:null,consequencia:null,observacoes:null});
    expect(reacaoValue('dataReacao','2026-02-01')).toBe('01/02/2026');
    expect(reacaoValue('gravidade','gravidade livre')).toBe('gravidade livre');
  });
});
