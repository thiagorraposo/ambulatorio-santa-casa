import { useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router';
import type { PacienteDetalheResponse, PacienteResponse } from '../../api/contracts';
import { useApiQuery } from '../../api/useApiQuery';
import { Card, EmptyState, PageHeading, QueryState } from '../../shared/ui';
import { DraftQueryState, EditingGate, MutationForm, useClinicalDraft } from '../../shared/writing';
import { formatAge } from '../../shared/formatters';
import { booleanOptions, FormSection, InputField, SelectField } from './CoreFields';
import { dirtyFields, patientBody, patientInitial } from './core-contracts';
import { PatientCreateGate } from './PatientCreateGate';
import { VersionComparison } from './VersionComparison';

function PriorSearch({ onSearch, onNoMatchConfirmed }: { onSearch: () => void; onNoMatchConfirmed: () => void }) {
  const [name, setName] = useState('');
  const [search, setSearch] = useState('');
  const query = useApiQuery<PacienteResponse[]>(`/pacientes?nome=${encodeURIComponent(search)}&limit=20&offset=0`, !!search);
  const showingCurrentSearch = search !== '' && name.trim() === search;
  return <Card><h2>Busque antes de cadastrar</h2>
    <p>Confira possíveis cadastros pelo nome. Os resultados dependem do seu acesso e da página consultada.</p>
    <form className="filters" aria-label="Busca prévia de pacientes" onSubmit={event => {
      event.preventDefault();
      const normalized = name.trim();
      if (!normalized) return;
      onSearch();
      setSearch(normalized);
    }}><InputField label="Nome para busca prévia" type="search" value={name} maxLength={120} required onChange={setName} />
      <button type="submit" className="button button-secondary" disabled={!name.trim()}>Consultar possíveis cadastros</button></form>
    {showingCurrentSearch && <QueryState query={query}>{rows => <>
      {rows.length ? <>
        <ul>{rows.map(row => <li key={row.pacienteId}><Link to={`/pacientes/${row.pacienteId}`}>{row.nome} · ID {row.pacienteId}</Link></li>)}</ul>
        <p>Revise as correspondências. Para ampliar a consulta, confira também as outras páginas antes de prosseguir.</p>
        <p><Link to={`/pacientes?nome=${encodeURIComponent(search)}`}>Consultar outras páginas da busca</Link></p>
      </> : <EmptyState>Nenhum paciente nesta página. Isso não comprova ausência de cadastro.</EmptyState>}
      <button type="button" className="button button-secondary" onClick={onNoMatchConfirmed}>
        Nenhuma correspondência serve — continuar para cadastro
      </button>
    </>}</QueryState>}
  </Card>;
}

function PatientForm({ data }: { data?: PacienteDetalheResponse }) {
  const navigate = useNavigate();
  const initial = patientInitial(data);
  const [draft, setDraft, clearDraft] = useClinicalDraft(`patient:${data?.pacienteId ?? 'new'}`, {
    values: initial, original: data, initial, phones: [] as string[], operationKey: crypto.randomUUID(),
  });
  const field = (key: string, value: string) => setDraft(previous => ({ ...previous, values: { ...previous.values, [key]: value } }));
  const dirty = dirtyFields(draft.values, draft.initial) || draft.phones.length > 0;
  const path = data ? `/pacientes/${data.pacienteId}` : '/pacientes';
  return <Card>
    <h2>{data ? 'Dados cadastrais' : 'Novo cadastro'}</h2>
    {data ? <p>{formatAge(draft.original!.idade, draft.original!.dataReferenciaIdade)}. A idade será recalculada pelo serviço após salvar.</p>
      : <p>A idade é calculada pelo serviço a partir do nascimento; informe somente os dados conhecidos.</p>}
    <MutationForm title={data ? 'Editar paciente' : 'Cadastrar paciente'} path={path} method={data ? 'PATCH' : 'POST'}
      dirty={dirty} buildBody={() => patientBody(draft.values, draft.phones, draft.original)}
      operationKey={draft.operationKey}
      responseId="pacienteId" expectedId={data?.pacienteId}
      conflictReview={data ? abandon => <VersionComparison<PacienteDetalheResponse> path={path}
        originalVersion={draft.original!.versao} original={draft.initial} draft={draft.values} valuesOf={patientInitial}
        fields={[
          ['nome', 'Nome completo'], ['dataNascimento', 'Data de nascimento'], ['sexo', 'Sexo'], ['raca', 'Raça'],
          ['pertenceComunidadeTradicional', 'Comunidade tradicional'], ['tipoComunidadeTradicional', 'Tipo de comunidade'],
          ['endereco', 'Endereço'], ['cidade', 'Cidade'],
        ]} onLoadCurrent={current => {
          abandon();
          const next = patientInitial(current);
          setDraft({ values: next, initial: next, original: current, phones: [], operationKey: crypto.randomUUID() });
        }} /> : undefined}
      submitLabel={data ? 'Salvar paciente' : 'Cadastrar paciente'}
      verificationPath={data ? path : '/pacientes'} verificationLabel={data ? 'Verificar registro salvo' : 'Verificar na busca de pacientes'}
      onSaved={(response: { pacienteId: string }) => { clearDraft(); navigate(`/pacientes/${encodeURIComponent(response.pacienteId)}`, { state: { saved: 'Paciente salvo.' } }); }}>
      <FormSection title="Identificação">
        <InputField label="Nome completo" value={draft.values.nome!} required maxLength={255} onChange={value => field('nome', value)} />
        <InputField label="Data de nascimento" type="date" value={draft.values.dataNascimento!} onChange={value => field('dataNascimento', value)} />
        <SelectField label="Sexo" value={draft.values.sexo!} onChange={value => field('sexo', value)}
          options={[["feminino", "Feminino"], ["masculino", "Masculino"], ["outro", "Outro"], ["nao_informado", "Não informado (registrado)"]]} />
        <InputField label="Raça" value={draft.values.raca!} maxLength={50} onChange={value => field('raca', value)} />
        <SelectField label="Comunidade tradicional" value={draft.values.pertenceComunidadeTradicional!} options={booleanOptions}
          onChange={value => field('pertenceComunidadeTradicional', value)} />
        <SelectField label="Tipo de comunidade" value={draft.values.tipoComunidadeTradicional!}
          options={[["indigena", "Indígena"], ["quilombola", "Quilombola"]]} onChange={value => field('tipoComunidadeTradicional', value)} />
      </FormSection>
      <FormSection title="Endereço">
        <InputField label="Endereço" value={draft.values.endereco!} maxLength={2000} onChange={value => field('endereco', value)} />
        <InputField label="Cidade" value={draft.values.cidade!} maxLength={120} onChange={value => field('cidade', value)} />
      </FormSection>
      <fieldset className="form-section"><legend>Contatos</legend>
        {data && <><p>Os contatos anteriores são preservados. Nesta página:</p><ul>{data.telefones.map((phone, index) => <li key={index}>{phone ?? 'Não informado'}</li>)}</ul></>}
        {draft.phones.map((phone, index) => <div key={index} className="repeat-row">
          <InputField label={index === 0 ? 'Novo telefone' : `Novo telefone ${index + 1}`} type="tel" required maxLength={30}
            value={phone} onChange={value => setDraft(previous => ({ ...previous, phones: previous.phones.map((item, i) => i === index ? value : item) }))} />
          <button type="button" className="button button-secondary" aria-label={`Remover novo telefone ${index + 1}`}
            onClick={() => setDraft(previous => ({ ...previous, phones: previous.phones.filter((_, i) => i !== index) }))}>Remover</button>
        </div>)}
        <button type="button" className="button button-secondary" disabled={draft.phones.length >= 10}
          onClick={() => setDraft(previous => ({ ...previous, phones: [...previous.phones, ''] }))}>Adicionar telefone</button>
      </fieldset>
    </MutationForm>
  </Card>;
}

function ExistingPatientForm({ id }: { id: string }) {
  const query = useApiQuery<PacienteDetalheResponse>(`/pacientes/${encodeURIComponent(id)}`);
  return <DraftQueryState query={query}>{data => <PatientForm key={data.pacienteId} data={data} />}</DraftQueryState>;
}

export default function PatientFormPage() {
  const { pacienteId } = useParams<{ pacienteId: string }>();
  const [createAfterSearch, setCreateAfterSearch] = useState(false);
  return <>
    <nav className="breadcrumb" aria-label="Caminho da página"><Link to="/pacientes">Pacientes</Link>
      {pacienteId && <Link to={`/pacientes/${pacienteId}`}>Ficha do paciente</Link>}</nav>
    <PageHeading title={pacienteId ? 'Editar paciente' : 'Cadastrar paciente'} />
    <EditingGate>{pacienteId ? <ExistingPatientForm id={pacienteId} /> : <PatientCreateGate>
      <PriorSearch onSearch={() => setCreateAfterSearch(false)} onNoMatchConfirmed={() => setCreateAfterSearch(true)} />
      {createAfterSearch && <>
        <p role="status">Cadastro autorizado após sua revisão. Prosseguir não funde registros; nomes iguais podem pertencer a pessoas diferentes.</p>
        <button type="button" className="button button-secondary" onClick={() => setCreateAfterSearch(false)}>Voltar à busca</button>
        <PatientForm key="new" />
      </>}
    </PatientCreateGate>}</EditingGate>
  </>;
}
