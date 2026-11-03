import { useRef } from 'react';
import type { Fields } from './core-contracts';
import { booleanOptions, InputField, SelectField, TextAreaField } from './CoreFields';
import { FollowupChoice, useFollowupAll } from './FollowupChoices';
import { useApiQuery } from '../../api/useApiQuery';
import { ApiErrorState } from '../../shared/ui';
import { clinicalLabel } from '../../shared/formatters';
import type { CatalogItem } from '../../shared/writing';
import { integratedPath, integratedResources, type IntegratedDraft, type IntegratedResource } from './attendance-integration';

const existingLabels: Record<string, string> = { pacienteId: 'Paciente', atendimentoId: 'Atendimento de registro',
  nome: 'Nome', codigo: 'Código', tipo: 'Tipo', reacoes: 'Reações', descricao: 'Descrição', gravidade: 'Gravidade', dataReacao: 'Data da reação',
  consequencia: 'Consequência', observacoes: 'Observações' };
function existingLabel(key: string): string { return existingLabels[key] ?? (key.endsWith('Id') ? 'Identificador do registro' : key.replace(/([a-z])([A-Z])/g, '$1 $2')); }
function readable(value: unknown): string {
  if (value === null || value === undefined || value === '') return 'Desconhecido';
  if (typeof value === 'boolean') return value ? 'Sim' : 'Não';
  if (Array.isArray(value)) return value.map(readable).join(' · ');
  if (typeof value === 'object') return Object.entries(value).map(([key, item]) => `${existingLabel(key)}: ${readable(item)}`).join(' · ');
  return clinicalLabel(String(value));
}
function ExistingRecords({ resource, rows }: { resource: IntegratedResource; rows: Array<Record<string, unknown>> }) {
  return <section aria-label={`Histórico de ${resource.title}`}><h3>Informação existente do paciente</h3>
    <p>Estes registros longitudinais permanecem no histórico. Não serão copiados nem associados ao atendimento atual.</p>
    {rows.length === 0 ? <p>Nenhum registro existente de {resource.title}.</p> : rows.map((row, index) => <details key={index}>
      <summary>{resource.title} existente {index + 1}{row.nome ? ` · ${row.nome}` : ''}</summary>
      <dl>{Object.entries(row).map(([key, value]) => <div key={key}><dt>{resource.fields.find(field => field.name === key)?.label ?? existingLabel(key)}</dt><dd>{readable(value)}</dd></div>)}</dl>
    </details>)}
    {rows.length > 0 && <p>Alterações destes registros e acompanhamentos continuam disponíveis nas áreas específicas da ficha.</p>}
  </section>;
}
function ResourceFields({ resource, rows, onChange, existing = [], available = true }: {
  resource: IntegratedResource; rows: Fields[]; onChange: (rows: Fields[]) => void;
  existing?: Array<Record<string, unknown>>; available?: boolean;
}) {
  const addButton = useRef<HTMLButtonElement>(null);
  const edit = (index: number, name: string, value: string) => onChange(rows.map((row, i) => i === index ? { ...row, [name]: value } : row));
  return <section className="form-section" aria-label={`Preencher ${resource.title}`}>
    <h3>{resource.title.charAt(0).toUpperCase() + resource.title.slice(1)}</h3>
    <p>{resource.longitudinal ? 'Novo registro longitudinal do paciente' : 'Novo registro deste atendimento'} · Só será gravado após revisar e confirmar o atendimento.</p>
    {rows.map((row, index) => <fieldset className="form-section" key={index}><legend>Informação nova: {resource.title} {index + 1}</legend>
      <div className="form-grid">{resource.fields.map(field => {
        const label = `${field.label} ${index + 1}`;
        const fieldPath = integratedPath(resource, index, field.name);
        const props = { label, fieldPath, value: row[field.name] ?? '', onChange: (value: string) => edit(index, field.name, value) };
        if (field.catalog) return <FollowupChoice<CatalogItem> key={field.name} {...props} required={field.required}
          path={`/catalogos/${field.catalog}`} idOf={item => item.id} labelOf={item => item.nome}
          filter={item => item.ativo && !(resource.key === 'projetos' && existing.some(record => record.projetoId === item.id))}
          onChange={value => { if (!value) edit(index, field.name, ''); }}
          onRecord={item => onChange(rows.map((entry, i) => i === index ? { ...entry, [field.name]: item.id, [`${field.name}Label`]: item.nome } : entry))} />;
        if (field.options || field.type === 'boolean') return <SelectField key={field.name} {...props} required={field.required}
          blank="Não preenchido" options={field.options ?? [...booleanOptions, ['desconhecido', 'Desconhecido (registrar)']]} />;
        if (field.type === 'textarea') return <TextAreaField key={field.name} {...props} maxLength={field.max} />;
        return <InputField key={field.name} {...props} required={field.required} type={field.type ?? 'text'}
          maxLength={field.max} step={field.type === 'number' ? 1 : undefined} max={field.type === 'number' ? field.max : undefined}
          min={field.type === 'number' ? field.name === 'anoEvento' ? 0 : 1 : undefined} />;
      })}</div>
      <button type="button" className="button button-secondary" onClick={() => {
        onChange(rows.filter((_, i) => i !== index)); requestAnimationFrame(() => addButton.current?.focus());
      }}>Remover {resource.title} {index + 1}</button>
    </fieldset>)}
    {resource.singleton && existing.length > 0 ? <p className="notice">Já existe registro de {resource.title}. Nenhuma cópia será criada nesta confirmação.</p>
      : <button ref={addButton} type="button" className="button button-secondary" disabled={!available || rows.length >= (resource.multiple ? resource.limit ?? 30 : 1)}
        onClick={() => onChange([...rows, {}])}>Adicionar {resource.title}</button>}
  </section>;
}
function LongitudinalResource(props: { patientPath: string; resource: IntegratedResource; rows: Fields[]; onChange: (rows: Fields[]) => void }) {
  const path = `${props.patientPath}/${props.resource.longitudinal}`;
  return props.resource.singleton ? <SingletonResource {...props} path={path} /> : <CollectionResource {...props} path={path} />;
}
function SingletonResource(props: { path: string; resource: IntegratedResource; rows: Fields[]; onChange: (rows: Fields[]) => void }) {
  const query = useApiQuery<Record<string, unknown> | null>(props.path);
  const existing = query.data ? [query.data] : [];
  return <>{query.isFetching && <p role="status">Consultando histórico de {props.resource.title}…</p>}
    {query.isError && <ApiErrorState error={query.error} retry={() => { void query.refetch(); }} />}
    {query.isSuccess && !query.isFetching && <ExistingRecords resource={props.resource} rows={existing} />}
    <ResourceFields {...props} existing={existing} available={query.isSuccess && !query.isFetching} /></>;
}
function CollectionResource(props: { path: string; resource: IntegratedResource; rows: Fields[]; onChange: (rows: Fields[]) => void }) {
  const query = useFollowupAll<Record<string, unknown>>(props.path);
  return <>{query.isFetching && <p role="status">Consultando histórico de {props.resource.title}…</p>}
    {query.isError && <ApiErrorState error={query.error} retry={() => { void query.refetch(); }} />}
    {query.isSuccess && !query.isFetching && <ExistingRecords resource={props.resource} rows={query.data} />}
    <ResourceFields {...props} existing={query.data ?? []} available={query.isSuccess && !query.isFetching} /></>;
}
export function AttendanceIntegratedFields({ section, patientPath, draft = {}, onChange }: {
  section: number; patientPath: string; draft?: IntegratedDraft; onChange: (draft: IntegratedDraft) => void;
}) {
  return <>{integratedResources.filter(resource => resource.section === section).map(resource => {
    const props = { resource, rows: draft[resource.key] ?? [], onChange: (rows: Fields[]) => onChange({ ...draft, [resource.key]: rows }) };
    return resource.longitudinal ? <LongitudinalResource key={resource.key} patientPath={patientPath} {...props} />
      : <ResourceFields key={resource.key} {...props} />;
  })}
    {section === 8 && <p className="notice">Prescrição de medicamentos não disponível. A lista de medicamentos permanece consultável no detalhe do atendimento salvo. Reações e retornos de BZN usam os registros específicos do tratamento existente.</p>}
  </>;
}
export function AttendanceIntegratedReview({ draft = {} }: { draft?: IntegratedDraft }) {
  return <>{integratedResources.map(resource => (draft[resource.key] ?? []).map((row, index) => <section className="form-section" key={`${resource.key}-${index}`}>
    <h3>Informação nova: {resource.title} {index + 1}</h3>
    <p>{resource.longitudinal ? 'Histórico longitudinal do paciente; sem vínculo artificial ao atendimento.' : 'Vinculado ao novo atendimento.'}</p>
    <dl>{resource.fields.map(field => <div key={field.name}><dt>{field.label}</dt>
      <dd>{row[field.name] === undefined || row[field.name] === '' ? 'Não preenchido (não será enviado)'
        : row[`${field.name}Label`] ?? (row[field.name] === 'desconhecido' ? 'Desconhecido (registrar)' : readable(row[field.name]))}</dd></div>)}</dl>
  </section>))}</>;
}
function receiptLabel(key: string): string {
  const labels: Record<string, string> = { atendimentoId: 'Atendimento', condicaoChagasId: 'Condição de Chagas',
    avaliacaoComorbidadesId: 'Avaliação de comorbidades', obitoId: 'Óbito', tratamentoId: 'Tratamento BZN', notificacaoId: 'Notificação' };
  if (labels[key]) return labels[key];
  const match = /^(sorologia|complicacao|avc|dispositivo|projeto|encaminhamento)(\d+)Id$/.exec(key);
  if (!match) return key;
  const names: Record<string, string> = { sorologia: 'Sorologia', complicacao: 'Complicação de Chagas', avc: 'AVC', dispositivo: 'Dispositivo', projeto: 'Projeto', encaminhamento: 'Encaminhamento' };
  return `${names[match[1]!]} ${Number(match[2]) + 1}`;
}
export function AttendanceReceipt({ receipt }: { receipt: Record<string, unknown> }) {
  return <section className="notice" role="status"><h2>Confirmação concluída</h2>
    <p>Todos os registros abaixo foram confirmados na mesma transação. Nenhuma operação ficou pendente neste envio.</p>
    <dl>{Object.entries(receipt).map(([key, value]) => <div key={key}><dt>{receiptLabel(key)}</dt><dd>ID {String(value)}</dd></div>)}</dl>
  </section>;
}
