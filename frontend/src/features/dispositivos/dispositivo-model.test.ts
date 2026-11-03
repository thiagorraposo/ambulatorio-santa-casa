import { describe,it,expect } from 'vitest';
import { dispositivoBody,emptyDispositivo } from './dispositivo-model';
describe('estado inicial de dispositivo',()=>{
 it('não fabrica tipo e preserva desconhecido/negativa/observação',()=>{
  expect(()=>dispositivoBody(emptyDispositivo())).toThrow('Selecione');
  expect(dispositivoBody({...emptyDispositivo(),tipoDispositivo:'cdi'})).toEqual({tipoDispositivo:'cdi',possuiDispositivo:null,observacoes:null});
  expect(dispositivoBody({...emptyDispositivo(),tipoDispositivo:'marcapasso',possuiDispositivo:'nao',observacoes:'  texto  '})).toEqual({tipoDispositivo:'marcapasso',possuiDispositivo:false,observacoes:'  texto  '});
 });
});
