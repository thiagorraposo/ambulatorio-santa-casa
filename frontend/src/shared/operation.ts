import { ApiClient, ApiError } from '../api/client';

export interface ClinicalIntention {
  operacaoId: string;
  metodo: 'POST' | 'PATCH' | 'PUT';
  caminho: string;
  corpoHash: string;
}
export interface ClinicalOutcome extends ClinicalIntention {
  estado: 'confirmada' | 'nao_aplicada' | 'em_curso' | 'indeterminavel';
  expiraEm: string;
  resultado?: Record<string, unknown>;
  motivo?: 'falha' | 'expirada' | 'encerrada';
}

function ordered(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(ordered);
  if (value !== null && typeof value === 'object') {
    const object = value as Record<string, unknown>;
    return Object.fromEntries(Object.keys(object).sort().map(key => [key, ordered(object[key])]));
  }
  return value;
}

/** Hash exactly the JSON that will travel over HTTP, including nulls and array order. */
export async function clinicalHash(body: unknown): Promise<string> {
  const normalized: unknown = JSON.parse(JSON.stringify(body));
  const bytes = new TextEncoder().encode(JSON.stringify(ordered(normalized)));
  const hash = await crypto.subtle.digest('SHA-256', bytes);
  return [...new Uint8Array(hash)].map(byte => byte.toString(16).padStart(2, '0')).join('');
}

function sameIntention(value: ClinicalIntention, intention: ClinicalIntention): boolean {
  return value.operacaoId === intention.operacaoId && value.metodo === intention.metodo
    && value.caminho === intention.caminho && value.corpoHash === intention.corpoHash;
}

export async function registerIntention(client: ApiClient, intention: ClinicalIntention): Promise<void> {
  const value = await client.request<ClinicalIntention & { estado: string; expiraEm: string }>('/operacoes', {
    method: 'POST', body: intention,
  });
  if (!value || value.operacaoId !== intention.operacaoId || value.estado !== 'registrada'
    || typeof value.expiraEm !== 'string') throw new ApiError(502);
}

export async function verifyIntention(client: ApiClient, intention: ClinicalIntention, close = false): Promise<ClinicalOutcome> {
  const path = `/operacoes/${encodeURIComponent(intention.operacaoId)}${close ? '/encerrar' : ''}`;
  const value = await client.request<ClinicalOutcome>(path, { method: close ? 'POST' : 'GET' });
  if (!value || !sameIntention(value, intention) || typeof value.expiraEm !== 'string'
    || !['confirmada', 'nao_aplicada', 'em_curso', 'indeterminavel'].includes(value.estado)) throw new ApiError(502);
  return value;
}
