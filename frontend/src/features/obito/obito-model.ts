import type { ObitoResponse } from '../../api/contracts';
import { formatClinicalDate } from '../../shared/formatters';
export const obitoFields = [['houveObito','Óbito informado','boolean'],['dataObito','Data completa do óbito','date'],['causaObito','Causa informada','textarea'],['observacoes','Observações do estado','textarea']] as const;
export type ObitoField = typeof obitoFields[number][0];
export type ObitoValues = Record<ObitoField,string>;
export const emptyObito = ():ObitoValues => ({houveObito:'',dataObito:'',causaObito:'',observacoes:''});
export function obitoBody(v:ObitoValues):Pick<ObitoResponse,ObitoField>{return {houveObito:v.houveObito===''?null:v.houveObito==='sim',dataObito:v.dataObito||null,causaObito:v.causaObito||null,observacoes:v.observacoes||null};}
export function obitoValue(name:ObitoField,v:string|boolean|null):string{if(v===null)return 'Desconhecido / não registrado';if(typeof v==='boolean')return v?'Sim':'Não';if(name==='dataObito')return formatClinicalDate(v);return v===''?'Texto vazio':String(v);}
