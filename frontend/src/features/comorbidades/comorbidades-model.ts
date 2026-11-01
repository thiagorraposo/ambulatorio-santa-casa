import type { AvaliacaoComorbidadesBody } from '../../api/contracts';
export interface ItemDraft { id: string; nome: string; selected: boolean; presence: string; observacoes: string }
export interface Values { items: Record<string, ItemDraft>; familiar: string; descricao: string }
export const emptyValues = (): Values => ({ items: {}, familiar: '', descricao: '' });
export const presence = (value: string): boolean | null => value === 'sim' ? true : value === 'nao' ? false : null;
export const presenceLabel = (value: boolean | null): string => value === null ? 'Desconhecido (registrado)' : value ? 'Sim' : 'Não';
export function comorbidadesBody(values: Values): AvaliacaoComorbidadesBody {
  const items = Object.values(values.items).filter(item => item.selected);
  if (!items.length && !values.familiar) throw new Error('Selecione uma comorbidade ou avalie o histórico familiar.');
  if (items.length > 100) throw new Error('Avalie no máximo 100 comorbidades por atendimento.');
  return { ...(items.length ? { itens: items.map(item => ({ comorbidadeId: item.id,
    possuiComorbidade: presence(item.presence), observacoes: item.observacoes || null })) } : {}),
    ...(values.familiar ? { historicoFamiliar: { possuiDoenca: presence(values.familiar), descricao: values.descricao || null } } : {}) };
}
