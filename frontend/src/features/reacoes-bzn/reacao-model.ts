import type { ReacaoBznOcorrenciaResponse } from '../../api/contracts';
import { displayText, formatClinicalDate } from '../../shared/formatters';
export const reacaoFields = [['descricao','Descrição da reação','textarea'],['gravidade','Gravidade informada','textarea'],
  ['dataReacao','Data completa da reação','date'],['consequencia','Consequência informada','textarea'],
  ['observacoes','Observações da reação','textarea']] as const;
export type ReacaoField=typeof reacaoFields[number][0];
export type ReacaoValues=Record<ReacaoField,string>;
export const emptyReacao=():ReacaoValues=>({descricao:'',gravidade:'',dataReacao:'',consequencia:'',observacoes:''});
export function reacaoBody(values:ReacaoValues):Pick<ReacaoBznOcorrenciaResponse,ReacaoField>{
  return {descricao:values.descricao,gravidade:values.gravidade||null,dataReacao:values.dataReacao||null,
    consequencia:values.consequencia||null,observacoes:values.observacoes||null};
}
export function reacaoValue(name:ReacaoField,value:string|null):string {
  return name==='dataReacao'?formatClinicalDate(value):displayText(value);
}
