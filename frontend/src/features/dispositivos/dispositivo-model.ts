import type { DispositivoResponse } from '../../api/contracts';
export const dispositivoFields = [['tipoDispositivo','Tipo de dispositivo','tipo'],['possuiDispositivo','Presença do dispositivo','boolean'],['observacoes','Observações do dispositivo','textarea']] as const;
export type DispositivoField = typeof dispositivoFields[number][0];
export type DispositivoValues = Record<DispositivoField,string>;
export const dispositivoTypes = [['marcapasso','Marcapasso'],['cdi','CDI']] as const;
export const emptyDispositivo = ():DispositivoValues => ({ tipoDispositivo:'', possuiDispositivo:'', observacoes:'' });
export function dispositivoBody(v:DispositivoValues): Pick<DispositivoResponse,DispositivoField> {
 if(v.tipoDispositivo!=='marcapasso' && v.tipoDispositivo!=='cdi') throw new Error('Selecione Marcapasso ou CDI.');
 return { tipoDispositivo:v.tipoDispositivo, possuiDispositivo:v.possuiDispositivo===''?null:v.possuiDispositivo==='sim', observacoes:v.observacoes||null };
}
export function dispositivoValue(name:DispositivoField,value:string|boolean|null):string {
 if(value===null)return 'Desconhecido / não registrado'; if(typeof value==='boolean')return value?'Sim':'Não';
 return name==='tipoDispositivo'?dispositivoTypes.find(([key])=>key===value)?.[1]??String(value):String(value);
}
