import { useId, type ReactNode } from 'react';
import { useClinicalDraft } from '../../shared/writing';
import type { FollowupDraft, ReactionDraft } from './followup-contracts';

export interface FollowupDraftModel {
  values: FollowupDraft;
  original: FollowupDraft;
  reactions: Array<{ key: string; value: ReactionDraft }>;
}

export function useFollowupDraft(key: string, initial: FollowupDraft) {
  const [model, setModel, clearDraft] = useClinicalDraft<FollowupDraftModel>(key, {
    values: initial, original: initial, reactions: [],
  });
  const dirty = JSON.stringify(model.values) !== JSON.stringify(model.original) || model.reactions.length > 0;
  function setField(name: string, value: string) {
    setModel(previous => ({ ...previous, values: { ...previous.values, [name]: value } }));
  }
  return { model, setModel, setField, clearDraft, dirty };
}

export function FollowupField({ label, children, hint }: { label: string; children: (id: string) => ReactNode; hint?: string }) {
  const id = useId();
  return <div className="form-field"><label htmlFor={id}>{label}</label>{children(id)}
    {hint && <small className="muted">{hint}</small>}</div>;
}

export function FollowupText({ label, value, onChange, type = 'text', required = false, maximum = 10000,
  min, max, hint, multiline = false }: {
  label: string; value: string; onChange: (value: string) => void;
  type?: 'text' | 'date' | 'number'; required?: boolean; maximum?: number;
  min?: number; max?: number; hint?: string; multiline?: boolean;
}) {
  return <FollowupField label={label} hint={hint}>{id => multiline
    ? <textarea id={id} value={value} maxLength={maximum} required={required} rows={3}
      onChange={event => onChange(event.target.value)} />
    : <input id={id} type={type} value={value} required={required} maxLength={type === 'text' ? maximum : undefined}
      min={min} max={max} step={type === 'number' ? 1 : undefined} onChange={event => onChange(event.target.value)} />
  }</FollowupField>;
}

export function FollowupSelect({ label, value, onChange, options, required = false,
  emptyLabel, children }: {
  label: string; value: string; onChange: (value: string) => void;
  options: readonly (readonly [string, string])[]; required?: boolean; emptyLabel?: string; children?: ReactNode;
}) {
  const known = options.some(([key]) => key === value);
  return <FollowupField label={label}>{id => <><select id={id} value={value} required={required}
    onChange={event => onChange(event.target.value)}>
    <option value="">{emptyLabel ?? (required ? 'Selecione uma opção' : 'Desconhecido / não registrado')}</option>
    {value !== '' && !known && <option value={value} disabled>{value} (valor preservado)</option>}
    {options.map(([key, text]) => <option key={key} value={key}>{text}</option>)}
  </select>{children}</>}</FollowupField>;
}

export function FollowupBoolean(props: { label: string; value: string; onChange: (value: string) => void }) {
  return <FollowupSelect {...props} options={[["true", "Sim"], ["false", "Não"]]} />;
}
