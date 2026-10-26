import { BadRequestException } from '@nestjs/common';
import { canonicalJson, clinicalRoute, operationReceipt, payloadHash } from '../../src/operacoes/operacoes.contract';

describe('Correlação de operações: contrato', () => {
  it('normaliza chaves recursivas, omissões JSON e números mantendo ordem dos filhos', () => {
    const left = { z: undefined, nome: 'Sintético ç', filhos: [{ b: null, a: 2 }], flag: false };
    const right = { flag: false, filhos: [{ a: 2.0, b: null }], nome: 'Sintético ç' };
    expect(canonicalJson(left)).toBe('{"filhos":[{"a":2,"b":null}],"flag":false,"nome":"Sintético ç"}');
    expect(payloadHash(left)).toBe(payloadHash(right));
    expect(payloadHash({ a: [1,2] })).not.toBe(payloadHash({ a: [2,1] }));
    expect(payloadHash({ valor: null })).not.toBe(payloadHash({}));
  });

  it.each([
    ['POST','/v1/pacientes','pacienteId'], ['PATCH','/v1/pacientes/9007199254740993','pacienteId'],
    ['POST','/v1/pacientes/1/atendimentos','atendimentoId'], ['PATCH','/v1/pacientes/1/atendimentos/2','atendimentoId'],
    ['POST','/v1/pacientes/1/tratamento-bzn','tratamentoId'], ['POST','/v1/pacientes/1/retornos-bzn','retornoId'],
    ['PUT','/v1/pacientes/1/projetos','projetoId'], ['PUT','/v1/pacientes/1/notificacao','notificacaoId'],
    ['POST','/v1/pacientes/1/encaminhamentos','encaminhamentoId'],
    ['POST','/v1/pacientes/1/encaminhamentos/2/contrarreferencias','contrarreferenciaId'],
    ['POST','/v1/pacientes/1/ocorrencias-anuais','eventoId'], ['POST','/v1/pacientes/1/retornos-anuais','retornoId'],
    ['POST','/v1/pacientes/1/pendencias','pendenciaId'], ['PATCH','/v1/pacientes/1/pendencias/2','pendenciaId'],
  ])('reconhece somente a mutação %s %s e seu recibo', (method, path, receiptId) => {
    expect(clinicalRoute(method,path).receiptId).toBe(receiptId);
  });

  it.each([
    ['GET','/v1/pacientes/1'], ['POST','/v1/pacientes/0/atendimentos'],
    ['POST','/v1/pacientes/1/atendimentos?offset=0'], ['POST','/v1/pacientes/1/atendimentos/'],
    ['PUT','/v1/pacientes/1/acesso/2'], ['POST','/v1/importacoes'],
    ['POST','/v1/pacientes/1/encaminhamentos/2/contrarreferencias/3'],
    ['POST','/v1/pacientes/9223372036854775808/atendimentos'],
    ['PATCH','/v1/pacientes/1/atendimentos/9999999999999999999'],
  ])('recusa rota sem contrato %s %s', (method,path) => {
    expect(() => clinicalRoute(method,path)).toThrow(BadRequestException);
  });

  it('preserva o limite de bigint como texto sem arredondar o identificador', () => {
    expect(clinicalRoute('PATCH','/v1/pacientes/9223372036854775807'))
      .toMatchObject({ patientId: '9223372036854775807' });
  });

  it('filtra texto clínico e impõe ID e versão textual no recibo', () => {
    expect(operationReceipt(clinicalRoute('PATCH','/v1/pacientes/1'), {
      pacienteId: '9007199254740993', versao: '2', nome: 'Não guardar', observacoes: 'Não guardar',
    })).toEqual({ pacienteId: '9007199254740993', versao: '2' });
    expect(() => operationReceipt(clinicalRoute('POST','/v1/pacientes'), { pacienteId: 1 })).toThrow();
    expect(() => operationReceipt(clinicalRoute('PATCH','/v1/pacientes/1'), { pacienteId: '1' })).toThrow();
    expect(operationReceipt(clinicalRoute('PATCH','/v1/pacientes/1/pendencias/2'), {
      pendenciaId: '2', status: null, descricao: 'Não guardar',
    })).toEqual({ pendenciaId: '2', status: null });
  });
});
