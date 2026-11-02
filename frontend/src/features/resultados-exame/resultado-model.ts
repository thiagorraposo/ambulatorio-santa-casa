import type {ResultadoExameResponse} from '../../api/contracts';
import {displayText} from '../../shared/formatters';
export const resultadoFields=[['nomeParametro','Nome do parâmetro'],['valorInformado','Valor informado'],
  ['unidadeInformada','Unidade informada'],['referenciaInformada','Referência informada'],
  ['interpretacaoInformada','Interpretação informada'],['observacoes','Observações do parâmetro']] as const;
export type ResultadoField=typeof resultadoFields[number][0];
export type ResultadoValues=Record<ResultadoField,string>;
export const emptyResultado=():ResultadoValues=>({nomeParametro:'',valorInformado:'',unidadeInformada:'',referenciaInformada:'',interpretacaoInformada:'',observacoes:''});
export function resultadoBody(v:ResultadoValues):Pick<ResultadoExameResponse,ResultadoField>{
 return {nomeParametro:v.nomeParametro,valorInformado:v.valorInformado||null,unidadeInformada:v.unidadeInformada||null,
  referenciaInformada:v.referenciaInformada||null,interpretacaoInformada:v.interpretacaoInformada||null,observacoes:v.observacoes||null};
}
export const resultadoValue=(_name:ResultadoField,value:string|null):string=>displayText(value);
