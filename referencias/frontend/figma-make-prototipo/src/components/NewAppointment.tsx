import React, { useState } from "react";
import { useApp } from "../context";
import type { Appointment } from "../types";
import {
  Card, Button, Input, Select, Textarea, RadioGroup, AlertBox, Breadcrumb,
  Badge, PendingTag, formatDate,
  IconCheck, IconChevronRight, IconPlus, IconX,
} from "./ui";
import { PROJECTS } from "../data";

const SECTIONS = [
  "Atendimento", "Chagas e Sorologia", "Condição Clínica", "Comorbidades",
  "Avaliação Clínica", "Eventos e Dispositivos", "Projetos",
  "Exames", "Medicamentos e BZN", "Encaminhamentos", "Notificação", "Observações",
];

const COMORBIDITY_OPTIONS = [
  "Doenças cardiovasculares", "Hipertensão arterial", "Diabetes",
  "Doença renal", "Doenças respiratórias", "Doenças digestórias",
  "Doenças endócrinas", "Doenças do sistema nervoso", "Doenças psicológicas", "Outras",
];

export default function NewAppointment() {
  const { patients, addAppointment, appointments: existingAppts, navigate, nav, showToast } = useApp();
  const patient = patients.find((p) => p.id === nav.patientId);

  const [currentSection, setCurrentSection] = useState(0);
  const [saving, setSaving] = useState(false);
  const [reviewing, setReviewing] = useState(false);

  // Section 1: Atendimento
  const [date, setDate] = useState("");
  const [prontuario, setProntuario] = useState("");
  const [context, setContext] = useState<"ambulatorio" | "ambulatorio-projeto">("ambulatorio");
  const [observationsMain, setObservationsMain] = useState("");

  // Section 2: Chagas
  const [hasChagas, setHasChagas] = useState("");
  const [chagasStatus, setChagasStatus] = useState("");
  const [finalResult, setFinalResult] = useState("");
  const [resultDate, setResultDate] = useState("");
  const [confirmCriteria, setConfirmCriteria] = useState("");
  const [sorologiaMethod, setSorologiaMethod] = useState("");
  const [sorologiaResult, setSorologiaResult] = useState("");
  const [sorologias, setSorologias] = useState<Array<{ id: string; method: string; result: string; resultDate?: string; lab?: string }>>([]);

  // Section 3: Condição Clínica
  const [formaClinica, setFormaClinica] = useState("");
  const [faseDoenca, setFaseDoenca] = useState("");
  const [possuiSintomas, setPossuiSintomas] = useState("");
  const [descSintomas, setDescSintomas] = useState("");

  // Section 4: Comorbidades
  const [selectedComorbidities, setSelectedComorbidities] = useState<string[]>([]);
  const [outrasDetail, setOutrasDetail] = useState("");

  // Section 5: Avaliação Clínica
  const [altura, setAltura] = useState("");
  const [peso, setPeso] = useState("");
  const [ca, setCa] = useState("");
  const [fc, setFc] = useState("");
  const [sat, setSat] = useState("");
  const [pas, setPas] = useState("");
  const [pad, setPad] = useState("");
  const [nyha, setNyha] = useState("");

  // Section 6: Eventos
  const [avc, setAvc] = useState("");
  const [avcAno, setAvcAno] = useState("");
  const [marcapasso, setMarcapasso] = useState("");
  const [cdi, setCdi] = useState("");
  const [obito, setObito] = useState("");
  const [obitoData, setObitoData] = useState("");
  const [obitoCausa, setObitoCausa] = useState("");

  // Section 7: Projetos
  const [selectedProjects, setSelectedProjects] = useState<string[]>([]);

  // Section 8: Exames
  const [exames, setExames] = useState<Array<{ id: string; type: string; origin: "brought" | "requested"; date: string; status: string; resultSummary?: string }>>([]);
  const [examType, setExamType] = useState("");
  const [examOrigin, setExamOrigin] = useState<"brought" | "requested">("requested");

  // Section 9: BZN
  const [bznUsed, setBznUsed] = useState("");
  const [bznByClinic, setBznByClinic] = useState("");
  const [bznDuration, setBznDuration] = useState("");
  const [bznYear, setBznYear] = useState("");
  const [bznIndication, setBznIndication] = useState("");
  const [bznPrescDate, setBznPrescDate] = useState("");

  // Section 10: Encaminhamentos
  const [encTipo, setEncTipo] = useState("");
  const [encEspecialidade, setEncEspecialidade] = useState("");
  const [encDestino, setEncDestino] = useState("");
  const [encData, setEncData] = useState("");
  const [encStatus, setEncStatus] = useState("");

  // Section 11: Notificação
  const [notificado, setNotificado] = useState("");
  const [notifNum, setNotifNum] = useState("");
  const [notifJust, setNotifJust] = useState("");

  // Section 12: Observações
  const [observacoes, setObservacoes] = useState("");
  const [pendenciaNotes, setPendenciaNotes] = useState("");

  const [errors, setErrors] = useState<Record<string, string>>({});

  if (!patient) {
    return (
      <div className="p-6">
        <AlertBox type="error">Paciente não encontrado.</AlertBox>
        <Button className="mt-4" variant="secondary" onClick={() => navigate("patients")}>Voltar</Button>
      </div>
    );
  }

  const safePatient = patient;

  function addSorologia() {
    if (!sorologiaMethod || !sorologiaResult) return;
    setSorologias((s) => [...s, { id: Date.now().toString(), method: sorologiaMethod, result: sorologiaResult }]);
    setSorologiaMethod(""); setSorologiaResult("");
  }

  function addExam() {
    if (!examType) return;
    setExames((e) => [...e, { id: Date.now().toString(), type: examType, origin: examOrigin, date: "", status: "pendente" }]);
    setExamType("");
  }

  function toggleComorbidity(c: string) {
    setSelectedComorbidities((s) => s.includes(c) ? s.filter((x) => x !== c) : [...s, c]);
  }

  function toggleProject(p: string) {
    setSelectedProjects((s) => s.includes(p) ? s.filter((x) => x !== p) : [...s, p]);
  }

  function validateSection(idx: number): boolean {
    if (idx === 0 && !date) {
      setErrors({ date: "Data do atendimento é obrigatória" });
      return false;
    }
    setErrors({});
    return true;
  }

  function goToSection(idx: number) {
    if (idx > currentSection && !validateSection(currentSection)) return;
    setCurrentSection(idx);
  }

  async function handleSave() {
    if (!date) { setErrors({ date: "Data do atendimento é obrigatória" }); setCurrentSection(0); return; }
    setSaving(true);
    await new Promise((r) => setTimeout(r, 1000));

    const appointment: Appointment = {
      id: `a-new-${Date.now()}`,
      patientId: safePatient.id,
      date,
      prontuarioLocation: prontuario || undefined,
      context,
      originRecord: "sistema",
      observations: observacoes || observationsMain || undefined,
      pendencyNotes: pendenciaNotes || undefined,
      status: "completo",
      chagas: hasChagas ? {
        hasChagas: hasChagas === "sim",
        status: chagasStatus || undefined,
        finalResult: finalResult || undefined,
        resultDate: resultDate || undefined,
        confirmationCriteria: confirmCriteria || undefined,
        sorologias: sorologias.length > 0 ? sorologias.map((s) => ({ ...s, requestDate: undefined, collectDate: undefined, lab: undefined, observations: undefined })) : [],
      } : undefined,
      vitalSigns: (altura || peso || fc || sat || pas) ? {
        height: altura ? Number(altura) : undefined,
        weight: peso ? Number(peso) : undefined,
        abdominalCircumference: ca ? Number(ca) : undefined,
        heartRate: fc ? Number(fc) : undefined,
        saturation: sat ? Number(sat) : undefined,
        systolicBP: pas ? Number(pas) : undefined,
        diastolicBP: pad ? Number(pad) : undefined,
        nyha: nyha || undefined,
      } : undefined,
      comorbidities: selectedComorbidities.map((c) => ({ type: c, present: true, detail: c === "Outras" ? outrasDetail : undefined })),
      exams: exames.map((e) => ({ ...e, results: [] })) as Appointment["exams"],
      bzn: bznUsed ? {
        used: bznUsed === "sim",
        byClinic: bznByClinic === "sim" ? true : bznByClinic === "nao" ? false : undefined,
        duration: bznDuration || undefined,
        year: bznYear || undefined,
        hasIndication: bznIndication === "sim" ? true : bznIndication === "nao" ? false : undefined,
        prescriptionDate: bznPrescDate || undefined,
        adverseReactions: [],
      } : undefined,
      referrals: encTipo ? [{
        id: `ref-new-${Date.now()}`,
        documentPresented: false,
        type: encTipo,
        specialty: encEspecialidade || undefined,
        destination: encDestino || undefined,
        referralDate: encData || undefined,
        status: encStatus || "Pendente",
      }] : undefined,
      notification: notificado ? {
        notified: notificado === "sim",
        number: notificado === "sim" ? notifNum : undefined,
        justification: notificado === "nao" ? notifJust : undefined,
      } : undefined,
      projects: selectedProjects.length > 0 ? selectedProjects : undefined,
    };

    addAppointment(appointment);
    setSaving(false);
    showToast("success", "Atendimento salvo com sucesso.");
    navigate("patient-record", { patientId: safePatient.id });
  }

  const sectionComponents = [
    <SectionAtendimento key="1" date={date} setDate={setDate} prontuario={prontuario} setProntuario={setProntuario} context={context} setContext={setContext} observations={observationsMain} setObservations={setObservationsMain} errors={errors} />,
    <SectionChagas key="2" hasChagas={hasChagas} setHasChagas={setHasChagas} chagasStatus={chagasStatus} setChagasStatus={setChagasStatus} finalResult={finalResult} setFinalResult={setFinalResult} resultDate={resultDate} setResultDate={setResultDate} confirmCriteria={confirmCriteria} setConfirmCriteria={setConfirmCriteria} sorologiaMethod={sorologiaMethod} setSorologiaMethod={setSorologiaMethod} sorologiaResult={sorologiaResult} setSorologiaResult={setSorologiaResult} sorologias={sorologias} addSorologia={addSorologia} removeSorologia={(id: string) => setSorologias((s) => s.filter((x) => x.id !== id))} />,
    <SectionCondicaoClinica key="3" formaClinica={formaClinica} setFormaClinica={setFormaClinica} faseDoenca={faseDoenca} setFaseDoenca={setFaseDoenca} possuiSintomas={possuiSintomas} setPossuiSintomas={setPossuiSintomas} descSintomas={descSintomas} setDescSintomas={setDescSintomas} />,
    <SectionComorbidades key="4" selected={selectedComorbidities} toggle={toggleComorbidity} outrasDetail={outrasDetail} setOutrasDetail={setOutrasDetail} />,
    <SectionAvaliacaoClinica key="5" altura={altura} setAltura={setAltura} peso={peso} setPeso={setPeso} ca={ca} setCa={setCa} fc={fc} setFc={setFc} sat={sat} setSat={setSat} pas={pas} setPas={setPas} pad={pad} setPad={setPad} nyha={nyha} setNyha={setNyha} />,
    <SectionEventos key="6" avc={avc} setAvc={setAvc} avcAno={avcAno} setAvcAno={setAvcAno} marcapasso={marcapasso} setMarcapasso={setMarcapasso} cdi={cdi} setCdi={setCdi} obito={obito} setObito={setObito} obitoData={obitoData} setObitoData={setObitoData} obitoCausa={obitoCausa} setObitoCausa={setObitoCausa} />,
    <SectionProjetos key="7" selected={selectedProjects} toggle={toggleProject} />,
    <SectionExames key="8" exames={exames} examType={examType} setExamType={setExamType} examOrigin={examOrigin} setExamOrigin={setExamOrigin} addExam={addExam} removeExam={(id: string) => setExames((e) => e.filter((x) => x.id !== id))} />,
    <SectionBZN key="9" bznUsed={bznUsed} setBznUsed={setBznUsed} bznByClinic={bznByClinic} setBznByClinic={setBznByClinic} bznDuration={bznDuration} setBznDuration={setBznDuration} bznYear={bznYear} setBznYear={setBznYear} bznIndication={bznIndication} setBznIndication={setBznIndication} bznPrescDate={bznPrescDate} setBznPrescDate={setBznPrescDate} />,
    <SectionEncaminhamentos key="10" encTipo={encTipo} setEncTipo={setEncTipo} encEspecialidade={encEspecialidade} setEncEspecialidade={setEncEspecialidade} encDestino={encDestino} setEncDestino={setEncDestino} encData={encData} setEncData={setEncData} encStatus={encStatus} setEncStatus={setEncStatus} />,
    <SectionNotificacao key="11" notificado={notificado} setNotificado={setNotificado} notifNum={notifNum} setNotifNum={setNotifNum} notifJust={notifJust} setNotifJust={setNotifJust} />,
    <SectionObservacoes key="12" observacoes={observacoes} setObservacoes={setObservacoes} pendenciaNotes={pendenciaNotes} setPendenciaNotes={setPendenciaNotes} />,
  ];

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <Breadcrumb items={[
        { label: "Início", onClick: () => navigate("home") },
        { label: "Pacientes", onClick: () => navigate("patients") },
        { label: patient.name, onClick: () => navigate("patient-record", { patientId: patient.id }) },
        { label: "Novo atendimento" },
      ]} />

      {/* Patient header */}
      <div className="mt-4 mb-5 flex items-center gap-3 bg-card border border-border rounded-lg px-4 py-3">
        <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-sm font-semibold text-primary">
          {patient.name[0]}
        </div>
        <div>
          <p className="text-sm font-semibold text-foreground">{patient.name}</p>
          <p className="text-xs text-muted-foreground">{patient.code} · {formatDate(patient.birthDate)}</p>
        </div>
        <div className="ml-auto">
          <h1 className="text-sm font-medium text-primary">Novo atendimento</h1>
        </div>
      </div>

      <div className="grid grid-cols-4 gap-5">
        {/* Left nav */}
        <div className="col-span-1">
          <Card className="sticky top-4">
            <div className="px-3 py-2 border-b border-border">
              <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Seções</p>
            </div>
            <nav className="py-2">
              {SECTIONS.map((s, i) => (
                <button
                  key={s}
                  onClick={() => goToSection(i)}
                  className={`w-full flex items-center gap-2 px-3 py-2 text-sm transition-colors text-left
                    ${currentSection === i ? "bg-primary/10 text-primary font-medium" : "text-muted-foreground hover:text-foreground hover:bg-secondary"}`}
                >
                  <span className={`w-5 h-5 rounded-full flex items-center justify-center text-xs flex-shrink-0 ${currentSection === i ? "bg-primary text-white" : "bg-muted text-muted-foreground"}`}>
                    {i + 1}
                  </span>
                  <span className="text-xs leading-tight">{s}</span>
                </button>
              ))}
            </nav>
          </Card>
        </div>

        {/* Content */}
        <div className="col-span-3 flex flex-col gap-4">
          <Card>
            <div className="px-5 py-3.5 border-b border-border flex items-center justify-between">
              <h2 className="text-sm font-semibold">{SECTIONS[currentSection]}</h2>
              <span className="text-xs text-muted-foreground">{currentSection + 1} de {SECTIONS.length}</span>
            </div>
            <div className="px-5 py-5">
              {sectionComponents[currentSection]}
            </div>
          </Card>

          {/* Navigation */}
          <div className="flex items-center justify-between">
            <div className="flex gap-2">
              <Button variant="ghost" onClick={() => navigate("patient-record", { patientId: patient.id })}>
                Cancelar
              </Button>
              {currentSection > 0 && (
                <Button variant="outline" size="sm" onClick={() => setCurrentSection((c) => c - 1)}>← Anterior</Button>
              )}
            </div>
            <div className="flex gap-2">
              {currentSection < SECTIONS.length - 1 ? (
                <Button variant="primary" size="sm" onClick={() => { if (validateSection(currentSection)) setCurrentSection((c) => c + 1); }}>
                  Próxima <IconChevronRight size={14} />
                </Button>
              ) : (
                <div className="flex gap-2">
                  <Button variant="outline" onClick={() => setReviewing(true)}>
                    Revisar dados
                  </Button>
                  <Button variant="primary" loading={saving} onClick={handleSave}>
                    {saving ? "Salvando..." : "Salvar atendimento"}
                  </Button>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Review modal */}
      {reviewing && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/40" onClick={() => setReviewing(false)} />
          <div className="relative bg-card border border-border rounded-xl shadow-2xl w-full max-w-lg mx-4 max-h-[80vh] flex flex-col">
            <div className="flex items-center justify-between px-5 py-4 border-b border-border">
              <h2 className="text-base font-semibold">Revisão do atendimento</h2>
              <button onClick={() => setReviewing(false)} className="text-muted-foreground hover:text-foreground">✕</button>
            </div>
            <div className="overflow-y-auto flex-1 px-5 py-4 flex flex-col gap-3 text-sm">
              <div className="grid grid-cols-2 gap-3">
                <div><p className="text-xs text-muted-foreground">Data</p><p>{date ? formatDate(date) : <span className="text-red-600">Não preenchido *</span>}</p></div>
                <div><p className="text-xs text-muted-foreground">Contexto</p><p>{context === "ambulatorio-projeto" ? "Ambulatório anexo ao projeto" : "Ambulatório"}</p></div>
                <div><p className="text-xs text-muted-foreground">Chagas</p><p>{hasChagas || "—"}</p></div>
                <div><p className="text-xs text-muted-foreground">Projetos</p><p>{selectedProjects.length > 0 ? selectedProjects.join(", ") : "—"}</p></div>
                <div><p className="text-xs text-muted-foreground">Exames</p><p>{exames.length > 0 ? `${exames.length} exame(s)` : "—"}</p></div>
                <div><p className="text-xs text-muted-foreground">Comorbidades</p><p>{selectedComorbidities.length > 0 ? selectedComorbidities.join(", ") : "—"}</p></div>
                <div><p className="text-xs text-muted-foreground">Notificado</p><p>{notificado || "—"}</p></div>
                <div><p className="text-xs text-muted-foreground">BZN</p><p>{bznUsed || "—"}</p></div>
              </div>
              {!date && <AlertBox type="error">Data do atendimento é obrigatória.</AlertBox>}
            </div>
            <div className="flex gap-2 justify-end px-5 py-4 border-t border-border">
              <Button variant="outline" onClick={() => setReviewing(false)}>Voltar e editar</Button>
              <Button variant="primary" loading={saving} onClick={() => { setReviewing(false); handleSave(); }}>
                Confirmar e salvar
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// --- Section sub-components ---

function SectionAtendimento({ date, setDate, prontuario, setProntuario, context, setContext, observations, setObservations, errors }: any) {
  return (
    <div className="flex flex-col gap-4">
      <Input label="Data do atendimento" type="date" required value={date} onChange={(e: any) => setDate(e.target.value)} error={errors.date} />
      <Input label="Localização do prontuário" value={prontuario} onChange={(e: any) => setProntuario(e.target.value)} placeholder="Ex.: Arquivo A - Caixa 03" />
      <RadioGroup
        label="Contexto do atendimento"
        required
        value={context}
        onChange={setContext}
        options={[
          { value: "ambulatorio", label: "Ambulatório unicamente" },
          { value: "ambulatorio-projeto", label: "Ambulatório anexo ao projeto" },
        ]}
      />
      <Textarea label="Observações gerais" value={observations} onChange={(e: any) => setObservations(e.target.value)} placeholder="Informações adicionais sobre este atendimento" />
    </div>
  );
}

function SectionChagas({ hasChagas, setHasChagas, chagasStatus, setChagasStatus, finalResult, setFinalResult, resultDate, setResultDate, confirmCriteria, setConfirmCriteria, sorologiaMethod, setSorologiaMethod, sorologiaResult, setSorologiaResult, sorologias, addSorologia, removeSorologia }: any) {
  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-col gap-2">
        <PendingTag>Regra de autorrelato não validada — não preencher campos com significado clínico indefinido</PendingTag>
      </div>
      <RadioGroup label="Possui diagnóstico de Chagas?" value={hasChagas} onChange={setHasChagas}
        options={[{ value: "sim", label: "Sim" }, { value: "nao", label: "Não" }, { value: "", label: "Não informado" }]} />
      {hasChagas === "sim" && (
        <div className="grid grid-cols-2 gap-4">
          <Select label="Status do diagnóstico" value={chagasStatus} onChange={(e: any) => setChagasStatus(e.target.value)}
            options={[{ value: "confirmado", label: "Confirmado" }, { value: "em-acompanhamento", label: "Em acompanhamento" }, { value: "suspeito", label: "Suspeito" }]}
            placeholder="Selecione..." />
          <Input label="Resultado final" value={finalResult} onChange={(e: any) => setFinalResult(e.target.value)} placeholder="Ex.: Positivo" />
          <Input label="Data do resultado" type="date" value={resultDate} onChange={(e: any) => setResultDate(e.target.value)} />
          <Input label="Critério de confirmação" value={confirmCriteria} onChange={(e: any) => setConfirmCriteria(e.target.value)} placeholder="Ex.: Duas sorologias reagentes" />
        </div>
      )}
      <div>
        <p className="text-sm font-medium mb-3">Sorologias</p>
        <div className="flex gap-2 mb-3">
          <Input placeholder="Método" value={sorologiaMethod} onChange={(e: any) => setSorologiaMethod(e.target.value)} className="flex-1" />
          <Input placeholder="Resultado" value={sorologiaResult} onChange={(e: any) => setSorologiaResult(e.target.value)} className="flex-1" />
          <Button variant="outline" size="sm" onClick={addSorologia} icon={<IconPlus size={13} />}>Adicionar</Button>
        </div>
        {sorologias.length > 0 && (
          <div className="flex flex-col gap-1">
            {sorologias.map((s: any) => (
              <div key={s.id} className="flex items-center justify-between bg-muted/40 rounded px-3 py-2 text-sm">
                <span>{s.method} — <Badge variant={s.result.toLowerCase().includes("não") ? "success" : "warning"}>{s.result}</Badge></span>
                <button onClick={() => removeSorologia(s.id)} className="text-muted-foreground hover:text-red-600"><IconX size={13} /></button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function SectionCondicaoClinica({ formaClinica, setFormaClinica, faseDoenca, setFaseDoenca, possuiSintomas, setPossuiSintomas, descSintomas, setDescSintomas }: any) {
  return (
    <div className="flex flex-col gap-4">
      <Select label="Forma clínica" value={formaClinica} onChange={(e: any) => setFormaClinica(e.target.value)}
        options={[{ value: "indeterminada", label: "Indeterminada" }, { value: "cardiaca", label: "Cardíaca" }, { value: "digestiva", label: "Digestiva" }, { value: "cardiodigestiva", label: "Cardiodigestiva" }]}
        placeholder="Selecione..." />
      <Select label="Fase da doença" value={faseDoenca} onChange={(e: any) => setFaseDoenca(e.target.value)}
        options={[{ value: "aguda", label: "Aguda" }, { value: "cronica", label: "Crônica" }]}
        placeholder="Selecione..." />
      <RadioGroup label="Possui sintomas?" value={possuiSintomas} onChange={setPossuiSintomas}
        options={[{ value: "sim", label: "Sim" }, { value: "nao", label: "Não" }, { value: "nao-informado", label: "Não informado" }]} />
      {possuiSintomas === "sim" && (
        <Textarea label="Descrição dos sintomas" value={descSintomas} onChange={(e: any) => setDescSintomas(e.target.value)} />
      )}
    </div>
  );
}

function SectionComorbidades({ selected, toggle, outrasDetail, setOutrasDetail }: any) {
  return (
    <div className="flex flex-col gap-3">
      <p className="text-sm text-muted-foreground">Selecione todas as comorbidades presentes:</p>
      <div className="grid grid-cols-2 gap-2">
        {COMORBIDITY_OPTIONS.map((c) => (
          <label key={c} className="flex items-center gap-2 cursor-pointer text-sm p-2 rounded hover:bg-muted/40 transition-colors">
            <input type="checkbox" checked={selected.includes(c)} onChange={() => toggle(c)} className="accent-primary" />
            {c}
          </label>
        ))}
      </div>
      {selected.includes("Outras") && (
        <Input label="Detalhar outras comorbidades" value={outrasDetail} onChange={(e: any) => setOutrasDetail(e.target.value)} placeholder="Descreva as demais comorbidades" />
      )}
    </div>
  );
}

function SectionAvaliacaoClinica({ altura, setAltura, peso, setPeso, ca, setCa, fc, setFc, sat, setSat, pas, setPas, pad, setPad, nyha, setNyha }: any) {
  return (
    <div className="grid grid-cols-2 gap-4">
      <Input label="Altura (cm)" type="number" value={altura} onChange={(e: any) => setAltura(e.target.value)} placeholder="Ex.: 172" />
      <Input label="Peso (kg)" type="number" value={peso} onChange={(e: any) => setPeso(e.target.value)} placeholder="Ex.: 78" />
      <Input label="Circunferência abdominal (cm)" type="number" value={ca} onChange={(e: any) => setCa(e.target.value)} placeholder="Ex.: 92" />
      <Input label="Frequência cardíaca (bpm)" type="number" value={fc} onChange={(e: any) => setFc(e.target.value)} placeholder="Ex.: 72" />
      <Input label="Saturação (%)" type="number" value={sat} onChange={(e: any) => setSat(e.target.value)} placeholder="Ex.: 97" />
      <div className="grid grid-cols-2 gap-2">
        <Input label="PA sistólica (mmHg)" type="number" value={pas} onChange={(e: any) => setPas(e.target.value)} placeholder="Ex.: 120" />
        <Input label="PA diastólica" type="number" value={pad} onChange={(e: any) => setPad(e.target.value)} placeholder="Ex.: 80" />
      </div>
      <Select label="NYHA" value={nyha} onChange={(e: any) => setNyha(e.target.value)}
        options={[{ value: "I", label: "I" }, { value: "II", label: "II" }, { value: "III", label: "III" }, { value: "IV", label: "IV" }]}
        placeholder="Classe..." />
      <AlertBox type="info">Não são calculados diagnósticos ou riscos automaticamente. Validação clínica é responsabilidade do profissional.</AlertBox>
    </div>
  );
}

function SectionEventos({ avc, setAvc, avcAno, setAvcAno, marcapasso, setMarcapasso, cdi, setCdi, obito, setObito, obitoData, setObitoData, obitoCausa, setObitoCausa }: any) {
  const opts3 = [{ value: "sim", label: "Sim" }, { value: "nao", label: "Não" }, { value: "nao-informado", label: "Não informado" }];
  return (
    <div className="flex flex-col gap-5">
      <div>
        <p className="text-sm font-medium mb-3 text-muted-foreground uppercase text-xs tracking-wide">Eventos</p>
        <div className="grid grid-cols-2 gap-4">
          <RadioGroup label="AVC" value={avc} onChange={setAvc} options={opts3} />
          {avc === "sim" && <Input label="Ano do último AVC" value={avcAno} onChange={(e: any) => setAvcAno(e.target.value)} placeholder="AAAA" />}
        </div>
      </div>
      <div>
        <p className="text-sm font-medium mb-3 text-muted-foreground uppercase text-xs tracking-wide">Dispositivos</p>
        <div className="grid grid-cols-2 gap-4">
          <RadioGroup label="Marcapasso" value={marcapasso} onChange={setMarcapasso} options={opts3} />
          <RadioGroup label="CDI" value={cdi} onChange={setCdi} options={opts3} />
        </div>
      </div>
      <div>
        <p className="text-sm font-medium mb-3 text-muted-foreground uppercase text-xs tracking-wide">Óbito</p>
        <RadioGroup label="Óbito registrado?" value={obito} onChange={setObito} options={opts3} />
        {obito === "sim" && (
          <div className="grid grid-cols-2 gap-4 mt-3">
            <Input label="Data do óbito" type="date" value={obitoData} onChange={(e: any) => setObitoData(e.target.value)} />
            <Input label="Causa" value={obitoCausa} onChange={(e: any) => setObitoCausa(e.target.value)} />
          </div>
        )}
      </div>
    </div>
  );
}

function SectionProjetos({ selected, toggle }: any) {
  return (
    <div className="flex flex-col gap-3">
      <p className="text-sm text-muted-foreground">Selecione os projetos vinculados a este atendimento:</p>
      <div className="grid grid-cols-2 gap-2">
        {PROJECTS.map((p) => (
          <label key={p} className="flex items-center gap-2 cursor-pointer text-sm p-2 rounded hover:bg-muted/40 transition-colors">
            <input type="checkbox" checked={selected.includes(p)} onChange={() => toggle(p)} className="accent-primary" />
            {p}
          </label>
        ))}
      </div>
      <AlertBox type="info">Não é criado fluxo específico para o protocolo AIM3 neste MVP.</AlertBox>
    </div>
  );
}

function SectionExames({ exames, examType, setExamType, examOrigin, setExamOrigin, addExam, removeExam }: any) {
  return (
    <div className="flex flex-col gap-4">
      <div className="flex gap-2">
        <Select value={examType} onChange={(e: any) => setExamType(e.target.value)}
          options={[
            { value: "ECG", label: "ECG" }, { value: "Ecocardiograma", label: "Ecocardiograma" },
            { value: "Holter", label: "Holter" }, { value: "Teste ergométrico", label: "Teste ergométrico" },
            { value: "MAPA", label: "MAPA" }, { value: "Radiografia", label: "Radiografia" },
            { value: "Tomografia", label: "Tomografia" }, { value: "Ressonância", label: "Ressonância" },
            { value: "Exames laboratoriais", label: "Exames laboratoriais" }, { value: "Outros", label: "Outros" },
          ]}
          placeholder="Selecione o tipo de exame..." className="flex-1" />
        <select value={examOrigin} onChange={(e: any) => setExamOrigin(e.target.value)}
          className="text-sm border border-border rounded bg-card px-3 focus:outline-none focus:ring-2 focus:ring-ring">
          <option value="requested">Solicitado</option>
          <option value="brought">Trazido pelo paciente</option>
        </select>
        <Button variant="outline" size="sm" onClick={addExam} icon={<IconPlus size={13} />} disabled={!examType}>Adicionar</Button>
      </div>
      {exames.length > 0 && (
        <div className="flex flex-col gap-1">
          {exames.map((e: any) => (
            <div key={e.id} className="flex items-center justify-between bg-muted/40 rounded px-3 py-2 text-sm">
              <span>{e.type} — <Badge variant="neutral">{e.origin === "brought" ? "Trazido" : "Solicitado"}</Badge></span>
              <button onClick={() => removeExam(e.id)} className="text-muted-foreground hover:text-red-600"><IconX size={13} /></button>
            </div>
          ))}
        </div>
      )}
      <AlertBox type="pending">
        Os indicadores gerais "Paciente trouxe exames" e "Solicitou exames complementares" têm semântica clínica ainda em validação. Não foram incluídos como campos automáticos neste protótipo.
      </AlertBox>
    </div>
  );
}

function SectionBZN({ bznUsed, setBznUsed, bznByClinic, setBznByClinic, bznDuration, setBznDuration, bznYear, setBznYear, bznIndication, setBznIndication, bznPrescDate, setBznPrescDate }: any) {
  const opts3 = [{ value: "sim", label: "Sim" }, { value: "nao", label: "Não" }, { value: "", label: "Não informado" }];
  return (
    <div className="flex flex-col gap-4">
      <RadioGroup label="Usou benzonidazol?" value={bznUsed} onChange={setBznUsed} options={opts3} />
      {bznUsed === "sim" && (
        <>
          <RadioGroup label="Tratamento pelo ambulatório?" value={bznByClinic} onChange={setBznByClinic} options={opts3} />
          <RadioGroup label="Possui indicação?" value={bznIndication} onChange={setBznIndication} options={opts3} />
          <div className="grid grid-cols-2 gap-4">
            <Input label="Tempo de uso" value={bznDuration} onChange={(e: any) => setBznDuration(e.target.value)} placeholder="Ex.: 60 dias" />
            <Input label="Ano de uso" value={bznYear} onChange={(e: any) => setBznYear(e.target.value)} placeholder="AAAA" />
            <Input label="Data da prescrição" type="date" value={bznPrescDate} onChange={(e: any) => setBznPrescDate(e.target.value)} />
          </div>
        </>
      )}
      <AlertBox type="pending">
        Retornos de 30 dias, retorno final e retorno anual têm semântica clínica em validação. Esses dados não estão estruturados neste formulário.
      </AlertBox>
    </div>
  );
}

function SectionEncaminhamentos({ encTipo, setEncTipo, encEspecialidade, setEncEspecialidade, encDestino, setEncDestino, encData, setEncData, encStatus, setEncStatus }: any) {
  return (
    <div className="flex flex-col gap-4">
      <p className="text-sm text-muted-foreground">Registre encaminhamentos realizados neste atendimento.</p>
      <div className="grid grid-cols-2 gap-4">
        <Select label="Tipo" value={encTipo} onChange={(e: any) => setEncTipo(e.target.value)}
          options={[{ value: "Encaminhamento externo", label: "Encaminhamento externo" }, { value: "Contrarreferência", label: "Contrarreferência" }, { value: "Interconsulta", label: "Interconsulta" }]}
          placeholder="Selecione..." />
        <Input label="Especialidade" value={encEspecialidade} onChange={(e: any) => setEncEspecialidade(e.target.value)} placeholder="Ex.: Cardiologia" />
        <Input label="Destino / Serviço" value={encDestino} onChange={(e: any) => setEncDestino(e.target.value)} placeholder="Hospital ou serviço de destino" />
        <Input label="Data do encaminhamento" type="date" value={encData} onChange={(e: any) => setEncData(e.target.value)} />
        <Select label="Status" value={encStatus} onChange={(e: any) => setEncStatus(e.target.value)}
          options={[{ value: "Pendente", label: "Pendente" }, { value: "Agendado", label: "Agendado" }, { value: "Realizado", label: "Realizado" }]}
          placeholder="Selecione..." />
      </div>
      <AlertBox type="info">Múltiplas contrarreferências ainda não estão definidas neste MVP.</AlertBox>
    </div>
  );
}

function SectionNotificacao({ notificado, setNotificado, notifNum, setNotifNum, notifJust, setNotifJust }: any) {
  return (
    <div className="flex flex-col gap-4">
      <RadioGroup label="Paciente notificado?" value={notificado} onChange={setNotificado}
        options={[{ value: "sim", label: "Sim" }, { value: "nao", label: "Não" }, { value: "", label: "Não informado" }]} />
      {notificado === "sim" && (
        <Input label="Número da notificação" value={notifNum} onChange={(e: any) => setNotifNum(e.target.value)} placeholder="NOT-XXXX-XXXX-XXX" />
      )}
      {notificado === "nao" && (
        <Textarea label="Justificativa" value={notifJust} onChange={(e: any) => setNotifJust(e.target.value)} placeholder="Informe o motivo da não notificação" />
      )}
    </div>
  );
}

function SectionObservacoes({ observacoes, setObservacoes, pendenciaNotes, setPendenciaNotes }: any) {
  return (
    <div className="flex flex-col gap-4">
      <Textarea label="Observações do atendimento" value={observacoes} onChange={(e: any) => setObservacoes(e.target.value)} placeholder="Informações complementares sobre este atendimento" className="min-h-[120px]" />
      <Textarea label="Pendência (proposta de interface — a separar de observação)" value={pendenciaNotes} onChange={(e: any) => setPendenciaNotes(e.target.value)} placeholder="Descreva pendências identificadas neste atendimento" />
      <AlertBox type="pending">
        A separação definitiva entre "Pendência" e "Observação" ainda precisa ser validada pela equipe clínica. Este formulário apresenta dois campos como proposta de interface.
      </AlertBox>
    </div>
  );
}
