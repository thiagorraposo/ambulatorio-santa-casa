import { useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router';
import type { AtendimentoDetalheResponse, PacienteDetalheResponse } from '../../api/contracts';
import { useApiQuery } from '../../api/useApiQuery';
import { ApiErrorState, Card, PageHeading } from '../../shared/ui';
import { DraftQueryState, EditingGate, MutationForm, useClinicalDraft, type CatalogItem } from '../../shared/writing';
import { booleanOptions, FormSection, InputField, SelectField, TextAreaField } from './CoreFields';
import { attendanceBody, attendanceInitial, clinicalNumbers, dirtyFields, type AttendanceDraft } from './core-contracts';
import { VersionComparison } from './VersionComparison';

function AttendanceForm({ pacienteId, data }: { pacienteId: string; data?: AtendimentoDetalheResponse }) {
  const navigate = useNavigate();
  const initial = attendanceInitial(data);
  const [draft, setDraft, clearDraft] = useClinicalDraft<AttendanceDraft>(`attendance:${pacienteId}:${data?.atendimentoId ?? 'new'}`, {
    values: initial, initial, original: data, clinical: {}, diagnosis: {}, exams: [], families: [], familyStatus: '', pending: [], operationKey: crypto.randomUUID(),
  });
  const [catalogOffset, setCatalogOffset] = useState(0);
  const catalog = useApiQuery<CatalogItem[]>(`/catalogos/exames?limit=100&offset=${catalogOffset}`, !data && draft.exams.length > 0);
  const field = (key: string, value: string) => setDraft(previous => ({ ...previous, values: { ...previous.values, [key]: value } }));
  const sectionField = (section: 'clinical' | 'diagnosis', key: string, value: string) => setDraft(previous => ({ ...previous, [section]: { ...previous[section], [key]: value } }));
  const dirty = dirtyFields(draft.values, draft.initial) || Object.values(draft.clinical).some(Boolean)
    || Object.values(draft.diagnosis).some(Boolean) || draft.exams.length > 0 || draft.families.length > 0
    || draft.familyStatus !== '' || draft.pending.length > 0;
  const patientPath = `/pacientes/${encodeURIComponent(pacienteId)}`;
  const path = data ? `${patientPath}/atendimentos/${data.atendimentoId}` : `${patientPath}/atendimentos`;
  const updateExam = (index: number, next: Partial<AttendanceDraft['exams'][number]>) => setDraft(previous => ({
    ...previous, exams: previous.exams.map((exam, i) => i === index ? { ...exam, ...next } : exam),
  }));
  return <Card>
    {data && <p className="notice">Esta edição altera os dados básicos do atendimento. Medidas, diagnóstico, exames, familiares e pendências já salvos são preservados; sua edição não está disponível neste formulário.</p>}
    <MutationForm title={data ? 'Editar atendimento' : 'Novo atendimento'} path={path} method={data ? 'PATCH' : 'POST'}
      dirty={dirty} submitLabel="Salvar atendimento" buildBody={() => attendanceBody(draft)}
      operationKey={draft.operationKey}
      responseId="atendimentoId" expectedId={data?.atendimentoId}
      conflictReview={data ? abandon => <VersionComparison<AtendimentoDetalheResponse> path={path}
        originalVersion={draft.original!.versao} original={draft.initial} draft={draft.values} valuesOf={attendanceInitial}
        fields={[
          ['dataAtendimento', 'Data do atendimento'], ['localizacaoProntuario', 'Localização do prontuário'],
          ['ambulatorioUnicamente', 'Somente ambulatório'], ['ambulatorioAnexoProjeto', 'Ambulatório anexo a projeto'],
          ['observacoes', 'Observações do atendimento'],
        ]} onLoadCurrent={current => {
          abandon();
          const next = attendanceInitial(current);
          setDraft({ values: next, initial: next, original: current, clinical: {}, diagnosis: {}, exams: [], families: [],
            familyStatus: '', pending: [], operationKey: crypto.randomUUID() });
        }} /> : undefined}
      verificationPath={data ? path : `${patientPath}?aba=atendimentos`}
      onSaved={(response: { atendimentoId: string }) => { clearDraft(); navigate(`${patientPath}/atendimentos/${response.atendimentoId}`, {
        state: { saved: 'Atendimento salvo. Tratamento, retornos e encaminhamentos têm confirmação própria.' },
      }); }}>
      <FormSection title="Dados básicos do atendimento">
        <InputField label="Data do atendimento" type="date" value={draft.values.dataAtendimento!} required={!draft.original || draft.original.dataAtendimento !== null} onChange={value => field('dataAtendimento', value)} />
        {draft.original?.dataAtendimento === null && <p className="muted">A data deste atendimento legado é desconhecida.
          Você pode corrigir os outros dados mantendo a data em branco, sem estimar uma data.</p>}
        <InputField label="Localização do prontuário" value={draft.values.localizacaoProntuario!} maxLength={120} onChange={value => field('localizacaoProntuario', value)} />
        <SelectField label="Somente ambulatório" value={draft.values.ambulatorioUnicamente!} options={booleanOptions} onChange={value => field('ambulatorioUnicamente', value)} />
        <SelectField label="Ambulatório anexo a projeto" value={draft.values.ambulatorioAnexoProjeto!} options={booleanOptions} onChange={value => field('ambulatorioAnexoProjeto', value)} />
        <TextAreaField label="Observações do atendimento" value={draft.values.observacoes!} onChange={value => field('observacoes', value)} />
      </FormSection>
      {!data && <>
        <FormSection title="Avaliação clínica">
          {clinicalNumbers.map(([key, label, integer]) => <InputField key={key} label={label} type="number"
            step={integer ? '1' : '0.01'} value={draft.clinical[key] ?? ''} onChange={value => sectionField('clinical', key, value)} />)}
          <InputField label="NYHA" value={draft.clinical.nyha ?? ''} maxLength={20} onChange={value => sectionField('clinical', 'nyha', value)} />
          <TextAreaField label="Observações clínicas" value={draft.clinical.observacoes ?? ''} onChange={value => sectionField('clinical', 'observacoes', value)} />
        </FormSection>
        <FormSection title="Diagnóstico e descoberta de Chagas">
          <SelectField label="Possui diagnóstico de Chagas" value={draft.diagnosis.possuiDiagnosticoChagas ?? ''} options={booleanOptions}
            onChange={value => sectionField('diagnosis', 'possuiDiagnosticoChagas', value)} />
          <SelectField label="Status do diagnóstico" value={draft.diagnosis.statusDiagnostico ?? ''}
            options={[["confirmado", "Confirmado"], ["descartado", "Descartado"], ["inconclusivo", "Inconclusivo"], ["suspeito", "Suspeito"], ["nao_informado", "Não informado (registrado)"]]}
            onChange={value => sectionField('diagnosis', 'statusDiagnostico', value)} />
          <SelectField label="Resultado final" value={draft.diagnosis.resultadoFinal ?? ''}
            options={[["positivo", "Positivo"], ["negativo", "Negativo"], ["inconclusivo", "Inconclusivo"], ["indeterminado", "Indeterminado"], ["nao_informado", "Não informado (registrado)"]]}
            onChange={value => sectionField('diagnosis', 'resultadoFinal', value)} />
          <InputField label="Data do resultado final" type="date" value={draft.diagnosis.dataResultadoFinal ?? ''} onChange={value => sectionField('diagnosis', 'dataResultadoFinal', value)} />
          <InputField label="Data de descoberta por autorrelato" type="date" value={draft.diagnosis.dataDescobertaAutorelato ?? ''} onChange={value => sectionField('diagnosis', 'dataDescobertaAutorelato', value)} />
          <InputField label="Critério de confirmação" value={draft.diagnosis.criterioConfirmacao ?? ''} maxLength={80} onChange={value => sectionField('diagnosis', 'criterioConfirmacao', value)} />
          <TextAreaField label="Observações do diagnóstico" value={draft.diagnosis.observacoes ?? ''} onChange={value => sectionField('diagnosis', 'observacoes', value)} />
        </FormSection>
        <p className="muted">Descoberta por autorrelato e resultado final são informações distintas. Sorologias detalhadas, comorbidades, medicamentos e eventos clínicos ainda não estão disponíveis para registro aqui.</p>
        <fieldset className="form-section"><legend>Exames trazidos e solicitados</legend>
          <p>Um exame solicitado pode ser registrado sem resultado. Identifique os exames de categorias genéricas.</p>
          {draft.exams.length > 0 && <>
            {catalog.isError && <ApiErrorState error={catalog.error} retry={() => { void catalog.refetch(); }} />}
            {catalog.isFetching && <p role="status">Carregando tipos de exame…</p>}
            <div className="form-actions"><button type="button" className="button button-secondary" disabled={catalogOffset === 0 || catalog.isFetching}
              onClick={() => setCatalogOffset(previous => Math.max(0, previous - 100))}>Página anterior de tipos de exame</button>
              <button type="button" className="button button-secondary" disabled={catalog.isFetching || !catalog.isSuccess || catalog.data.length < 100 || catalogOffset >= 100000}
                onClick={() => setCatalogOffset(previous => previous + 100)}>Próxima página de tipos de exame</button></div>
          </>}
          {draft.exams.map((exam, index) => <fieldset key={index} className="form-section"><legend>Exame {index + 1}</legend>
            <div className="form-grid">
              <SelectField label={`Tipo de exame ${index + 1}`} required blank="Selecione um tipo ativo" value={exam.tipoExameId}
                options={(catalog.isSuccess ? catalog.data : []).map(item => [item.id, item.nome])}
                onChange={value => updateExam(index, { tipoExameId: value, catalog: catalog.data?.find(item => item.id === value) })} />
              {exam.catalog && <p className="muted">Selecionado: {exam.catalog.nome} ({exam.catalog.codigo})</p>}
              <SelectField label={`Origem do exame ${index + 1}`} required value={exam.bloco} options={[["trazido", "Trazido"], ["solicitado", "Solicitado"]]}
                onChange={value => updateExam(index, { bloco: value })} />
              <InputField label={`Identificação do exame ${index + 1}`} value={exam.identificacao} maxLength={1000}
                required={['laboratoriais', 'imagem', 'outro', 'nao_informado'].includes(exam.catalog?.codigo ?? '')} onChange={value => updateExam(index, { identificacao: value })} />
              <TextAreaField label={`Resultado do exame ${index + 1}`} value={exam.resultado} onChange={value => updateExam(index, { resultado: value })} />
              <TextAreaField label={`Observações do exame ${index + 1}`} value={exam.observacoes} onChange={value => updateExam(index, { observacoes: value })} />
            </div>
            <button type="button" className="button button-secondary" onClick={() => setDraft(previous => ({ ...previous, exams: previous.exams.filter((_, i) => i !== index) }))}>Remover exame {index + 1}</button>
          </fieldset>)}
          <button type="button" className="button button-secondary" disabled={draft.exams.length >= 30}
            onClick={() => setDraft(previous => ({ ...previous, exams: [...previous.exams, { tipoExameId: '', bloco: 'solicitado', identificacao: '', resultado: '', observacoes: '' }] }))}>Adicionar exame</button>
        </fieldset>
        <fieldset className="form-section"><legend>Rastreio familiar</legend>
          <p>Identificação do familiar e resultado do exame; este registro não representa histórico de doença familiar.</p>
          <SelectField label="Familiares examinados" value={draft.familyStatus} blank="Sem registro de rastreio"
            options={[["sim", "Sim"], ["nao", "Não"], ["desconhecido", "Desconhecido (registrar)"]]}
            onChange={value => setDraft(previous => ({ ...previous, familyStatus: value }))} />
          {draft.families.map((family, index) => <fieldset key={index} className="form-section"><legend>Familiar {index + 1}</legend>
            <div className="form-grid"><InputField label={`Identificação do familiar ${index + 1}`} value={family.familiar} required maxLength={1000}
              onChange={value => setDraft(previous => ({ ...previous, families: previous.families.map((item, i) => i === index ? { ...item, familiar: value } : item) }))} />
              <TextAreaField label={`Resultado do familiar ${index + 1}`} value={family.resultado}
                onChange={value => setDraft(previous => ({ ...previous, families: previous.families.map((item, i) => i === index ? { ...item, resultado: value } : item) }))} /></div>
            <button type="button" className="button button-secondary" onClick={() => setDraft(previous => ({ ...previous, families: previous.families.filter((_, i) => i !== index) }))}>Remover familiar {index + 1}</button>
          </fieldset>)}
          <button type="button" className="button button-secondary" disabled={draft.families.length >= 50}
            onClick={() => setDraft(previous => ({ ...previous, families: [...previous.families, { familiar: '', resultado: '' }] }))}>Adicionar familiar examinado</button>
        </fieldset>
        <fieldset className="form-section"><legend>Pendências na criação</legend>
          <p>Pendência resolvida exige a data de resolução informada. A criação de cada pendência faz parte da mesma gravação do atendimento.</p>
          {draft.pending.map((pending, index) => <fieldset key={index} className="form-section"><legend>Pendência {index + 1}</legend>
            <TextAreaField label={`Descrição da pendência ${index + 1}`} value={pending.descricao}
              onChange={value => setDraft(previous => ({ ...previous, pending: previous.pending.map((item, i) => i === index ? { ...item, descricao: value } : item) }))} />
            <SelectField label={`Status da pendência ${index + 1}`} value={pending.status} blank="Desconhecido"
              options={[["aberta", "Aberta"], ["em_andamento", "Em andamento"], ["resolvida", "Resolvida"], ["cancelada", "Cancelada"], ["nao_informado", "Não informado"]]}
              onChange={value => setDraft(previous => ({ ...previous, pending: previous.pending.map((item, i) => i === index ? { ...item, status: value } : item) }))} />
            <InputField label={`Data de resolução da pendência ${index + 1}`} type="date" value={pending.dataResolucao ?? ''}
              required={pending.status === 'resolvida'} onChange={value => setDraft(previous => ({ ...previous,
                pending: previous.pending.map((item, i) => i === index ? { ...item, dataResolucao: value } : item) }))} />
            <button type="button" className="button button-secondary" onClick={() => setDraft(previous => ({ ...previous, pending: previous.pending.filter((_, i) => i !== index) }))}>Remover pendência {index + 1}</button>
          </fieldset>)}
          <button type="button" className="button button-secondary" disabled={draft.pending.length >= 30}
            onClick={() => setDraft(previous => ({ ...previous, pending: [...previous.pending, { descricao: '', status: 'aberta' }] }))}>Adicionar pendência</button>
        </fieldset>
      </>}
    </MutationForm>
  </Card>;
}

function ExistingAttendanceForm({ pacienteId, atendimentoId }: { pacienteId: string; atendimentoId: string }) {
  const query = useApiQuery<AtendimentoDetalheResponse>(`/pacientes/${encodeURIComponent(pacienteId)}/atendimentos/${encodeURIComponent(atendimentoId)}`);
  return <DraftQueryState query={query}>{data => <AttendanceForm key={data.atendimentoId} pacienteId={pacienteId} data={data} />}</DraftQueryState>;
}

export default function AttendanceFormPage() {
  const { pacienteId = '', atendimentoId } = useParams<{ pacienteId: string; atendimentoId: string }>();
  const patientQuery = useApiQuery<PacienteDetalheResponse>(`/pacientes/${encodeURIComponent(pacienteId)}`);
  return <>
    <nav className="breadcrumb" aria-label="Caminho da página"><Link to={`/pacientes/${pacienteId}`}>Ficha do paciente</Link>
      {atendimentoId && <Link to={`/pacientes/${pacienteId}/atendimentos/${atendimentoId}`}>Atendimento</Link>}</nav>
    <PageHeading title={atendimentoId ? 'Editar atendimento' : 'Novo atendimento'} />
    <EditingGate><DraftQueryState query={patientQuery}>{patient => <><p>Paciente: {patient.nome} · ID {patient.pacienteId}</p>
      {atendimentoId ? <ExistingAttendanceForm pacienteId={pacienteId} atendimentoId={atendimentoId} />
        : <AttendanceForm key={pacienteId} pacienteId={pacienteId} />}</>}</DraftQueryState></EditingGate>
  </>;
}
