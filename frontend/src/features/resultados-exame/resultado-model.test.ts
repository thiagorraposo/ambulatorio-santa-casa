import {describe,expect,it} from 'vitest';
import {emptyResultado,resultadoBody,resultadoValue} from './resultado-model';
describe('parâmetro humano literal',()=>{
 it('não converte valor/unidade/interpretação e preserva null opcional',()=>{
  expect(resultadoBody({...emptyResultado(),nomeParametro:'  Campo  ',valorInformado:'001,2300 ± relato',
   unidadeInformada:'Unidade livre',interpretacaoInformada:'Texto humano'})).toEqual({nomeParametro:'  Campo  ',
   valorInformado:'001,2300 ± relato',unidadeInformada:'Unidade livre',interpretacaoInformada:'Texto humano',referenciaInformada:null,observacoes:null});
  expect(resultadoValue('valorInformado','001,2300')).toBe('001,2300');
  expect(resultadoValue('interpretacaoInformada',null)).toBe('Não informado');
 });
});
