import { BadRequestException } from '@nestjs/common';
import { createHash } from 'node:crypto';
import { ClinicalIdPipe } from '../clinico/clinical-validation';

export type ClinicalMethod = 'POST' | 'PATCH' | 'PUT';
export type OperationReceipt = Record<string, string | null>;
export interface OperationResponse {
  operacaoId: string;
  metodo: ClinicalMethod;
  caminho: string;
  corpoHash: string;
  estado: 'registrada' | 'confirmada' | 'nao_aplicada' | 'em_curso' | 'indeterminavel';
  expiraEm: string;
  resultado?: OperationReceipt;
  motivo?: 'falha' | 'expirada' | 'encerrada';
}

export interface ClinicalRoute {
  patientId?: string;
  receiptId: string;
  version?: boolean;
  pendingStatus?: boolean;
}

const id = '([1-9]\\d{0,18})';
const routes: Array<[ClinicalMethod, RegExp, Omit<ClinicalRoute, 'patientId'>]> = [
  ['POST', /^\/v1\/pacientes$/, { receiptId: 'pacienteId' }],
  ['PATCH', new RegExp(`^/v1/pacientes/${id}$`), { receiptId: 'pacienteId', version: true }],
  ['POST', new RegExp(`^/v1/pacientes/${id}/atendimentos$`), { receiptId: 'atendimentoId' }],
  ['PATCH', new RegExp(`^/v1/pacientes/${id}/atendimentos/${id}$`), { receiptId: 'atendimentoId', version: true }],
  ['POST', new RegExp(`^/v1/pacientes/${id}/atendimentos/${id}/sorologias$`), { receiptId: 'sorologiaId' }],
  ['POST', new RegExp(`^/v1/pacientes/${id}/tratamento-bzn$`), { receiptId: 'tratamentoId' }],
  ['POST', new RegExp(`^/v1/pacientes/${id}/retornos-bzn$`), { receiptId: 'retornoId' }],
  ['PUT', new RegExp(`^/v1/pacientes/${id}/projetos$`), { receiptId: 'projetoId' }],
  ['PUT', new RegExp(`^/v1/pacientes/${id}/notificacao$`), { receiptId: 'notificacaoId' }],
  ['POST', new RegExp(`^/v1/pacientes/${id}/encaminhamentos$`), { receiptId: 'encaminhamentoId' }],
  ['POST', new RegExp(`^/v1/pacientes/${id}/encaminhamentos/${id}/contrarreferencias$`), { receiptId: 'contrarreferenciaId' }],
  ['POST', new RegExp(`^/v1/pacientes/${id}/ocorrencias-anuais$`), { receiptId: 'eventoId' }],
  ['POST', new RegExp(`^/v1/pacientes/${id}/retornos-anuais$`), { receiptId: 'retornoId' }],
  ['POST', new RegExp(`^/v1/pacientes/${id}/pendencias$`), { receiptId: 'pendenciaId' }],
  ['PATCH', new RegExp(`^/v1/pacientes/${id}/pendencias/${id}$`), { receiptId: 'pendenciaId', pendingStatus: true }],
];

export function clinicalRoute(method: string, path: string): ClinicalRoute {
  for (const [candidate, pattern, receipt] of routes) {
    const match = method === candidate && pattern.exec(path);
    if (match) {
      for (const value of match.slice(1)) new ClinicalIdPipe().transform(value);
      return { ...receipt, ...(match[1] ? { patientId: match[1] } : {}) };
    }
  }
  throw new BadRequestException('Método/caminho não suportado para correlação clínica');
}

/** JSON serialization first applies the same omissions/conversions as the wire. */
export function canonicalJson(value: unknown): string {
  const plain = JSON.parse(JSON.stringify(value)) as unknown;
  const ordered = (item: unknown): unknown => {
    if (Array.isArray(item)) return item.map(ordered);
    if (typeof item === 'object' && item !== null) {
      return Object.fromEntries(Object.keys(item).sort().map(key => [key, ordered((item as Record<string, unknown>)[key])]));
    }
    return item;
  };
  return JSON.stringify(ordered(plain));
}

export function payloadHash(value: unknown): string {
  return createHash('sha256').update(canonicalJson(value)).digest('hex');
}

export function operationReceipt(route: ClinicalRoute, value: unknown): OperationReceipt {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) throw new Error('Recibo clínico inválido');
  const source = value as Record<string, unknown>;
  const receipt: OperationReceipt = {};
  for (const key of [route.receiptId, ...(route.version ? ['versao'] : [])]) {
    if (typeof source[key] !== 'string' || !/^[1-9]\d{0,18}$/.test(source[key])) throw new Error('ID/versão ausente no recibo clínico');
    receipt[key] = source[key];
  }
  if (route.pendingStatus) {
    if (source.status !== null && !['aberta','em_andamento','resolvida','cancelada','nao_informado'].includes(String(source.status))) {
      throw new Error('Estado ausente no recibo de pendência');
    }
    receipt.status = source.status as string | null;
  }
  return receipt;
}
