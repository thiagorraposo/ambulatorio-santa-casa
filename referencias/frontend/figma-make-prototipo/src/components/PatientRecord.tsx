import React, { useState } from "react";
import { useApp } from "../context";
import {
  Card, Badge, Button, Table, Tr, Td, AlertBox, PendingTag, Breadcrumb,
  formatDate, calcAge, originLabel, originVariant,
  IconPlus, IconEdit, IconChevronRight, IconChevronDown,
} from "./ui";
import type { Appointment, Exam } from "../types";

const TABS = [
  "Resumo", "Atendimentos", "Chagas e Sorologia", "Projetos",
  "Exames", "Tratamentos", "Avaliação Clínica", "Encaminhamentos", "Notificação",
];

export default function PatientRecord() {
  const { currentUser, patients, appointments, navigate, nav } = useApp();
  const [activeTab, setActiveTab] = useState("Resumo");

  const patient = patients.find((p) => p.id === nav.patientId);
  const canEdit = currentUser?.role === "edicao" || currentUser?.role === "administracao";

  if (!patient) {
    return (
      <div className="p-6">
        <AlertBox type="error">Paciente não encontrado.</AlertBox>
        <Button className="mt-4" variant="secondary" onClick={() => navigate("patients")}>Voltar</Button>
      </div>
    );
  }

  const patientAppointments = appointments
    .filter((a) => a.patientId === patient.id)
    .sort((a, b) => b.date.localeCompare(a.date));

  const allExams: Exam[] = patientAppointments.flatMap((a) => a.exams || []);
  const allReferrals = patientAppointments.flatMap((a) => a.referrals || []);
  const latestChagas = patientAppointments.find((a) => a.chagas)?.chagas;
  const latestBZN = patientAppointments.find((a) => a.bzn)?.bzn;
  const latestVitals = patientAppointments.find((a) => a.vitalSigns)?.vitalSigns;

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <Breadcrumb items={[
        { label: "Início", onClick: () => navigate("home") },
        { label: "Pacientes", onClick: () => navigate("patients") },
        { label: patient.name },
      ]} />

      {/* Patient header */}
      <div className="bg-card border border-border rounded-xl mt-4 p-5 mb-5">
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center text-lg font-semibold text-primary flex-shrink-0">
              {patient.name[0]}
            </div>
            <div>
              <h1 className="text-xl font-semibold text-foreground">{patient.name}</h1>
              <div className="flex flex-wrap items-center gap-3 mt-1.5">
                <span className="font-mono text-xs text-muted-foreground bg-muted border border-border px-2 py-0.5 rounded">{patient.code}</span>
                <span className="text-sm text-muted-foreground">{formatDate(patient.birthDate)} · {calcAge(patient.birthDate)}</span>
                <Badge variant={originVariant(patient.origin)}>{originLabel(patient.origin)}</Badge>
                {patient.importedFrom && (
                  <span className="text-xs text-muted-foreground">Importado: {patient.importedFrom}</span>
                )}
              </div>
              <div className="flex flex-wrap gap-1 mt-2">
                {patient.projects.map((pr) => (
                  <Badge key={pr} variant="info">{pr}</Badge>
                ))}
                {patient.projects.length === 0 && <span className="text-xs text-muted-foreground">Sem projetos associados</span>}
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2 flex-shrink-0">
            {canEdit && (
              <>
                <Button variant="outline" size="sm" icon={<IconEdit size={14} />}>
                  Editar paciente
                </Button>
                <Button
                  variant="primary" size="sm"
                  icon={<IconPlus size={14} />}
                  onClick={() => navigate("new-appointment", { patientId: patient.id })}
                >
                  Novo atendimento
                </Button>
              </>
            )}
            {!canEdit && (
              <div className="text-xs text-muted-foreground bg-muted border border-border rounded px-3 py-1.5">
                🔒 Somente consulta
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex overflow-x-auto border-b border-border mb-5 gap-0">
        {TABS.map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-4 py-2.5 text-sm whitespace-nowrap border-b-2 transition-colors
              ${activeTab === tab
                ? "border-primary text-primary font-medium"
                : "border-transparent text-muted-foreground hover:text-foreground"
              }`}
          >
            {tab}
          </button>
        ))}
      </div>

      {/* Tab content */}
      {activeTab === "Resumo" && (
        <TabResumo
          patient={patient}
          latestChagas={latestChagas}
          latestBZN={latestBZN}
          latestVitals={latestVitals}
          appointments={patientAppointments}
        />
      )}
      {activeTab === "Atendimentos" && (
        <TabAtendimentos
          appointments={patientAppointments}
          canEdit={canEdit}
          onNewAppointment={() => navigate("new-appointment", { patientId: patient.id })}
        />
      )}
      {activeTab === "Chagas e Sorologia" && (
        <TabChagas appointments={patientAppointments} canEdit={canEdit} />
      )}
      {activeTab === "Projetos" && (
        <TabProjetos patient={patient} canEdit={canEdit} />
      )}
      {activeTab === "Exames" && (
        <TabExames exams={allExams} canEdit={canEdit} />
      )}
      {activeTab === "Tratamentos" && (
        <TabTratamentos appointments={patientAppointments} canEdit={canEdit} />
      )}
      {activeTab === "Avaliação Clínica" && (
        <TabAvaliacaoClinica appointments={patientAppointments} />
      )}
      {activeTab === "Encaminhamentos" && (
        <TabEncaminhamentos referrals={allReferrals} canEdit={canEdit} />
      )}
      {activeTab === "Notificação" && (
        <TabNotificacao appointments={patientAppointments} canEdit={canEdit} />
      )}
    </div>
  );
}

function TabResumo({ patient, latestChagas, latestBZN, latestVitals, appointments }: {
  patient: ReturnType<typeof useApp>["patients"][0];
  latestChagas: any; latestBZN: any; latestVitals: any;
  appointments: Appointment[];
}) {
  const lastAppt = appointments[0];
  return (
    <div className="grid grid-cols-3 gap-4">
      <div className="col-span-2 flex flex-col gap-4">
        <Card>
          <div className="px-5 py-3.5 border-b border-border">
            <h3 className="text-sm font-semibold text-foreground uppercase tracking-wide">Identificação</h3>
          </div>
          <div className="grid grid-cols-2 gap-x-8 gap-y-3 px-5 py-4 text-sm">
            {[
              ["Nome", patient.name],
              ["Código", <span className="font-mono text-xs">{patient.code}</span>],
              ["Data de nascimento", formatDate(patient.birthDate)],
              ["Idade", calcAge(patient.birthDate)],
              ["Sexo", patient.sex],
              ["Raça/cor", patient.race],
              ["Telefone", patient.phone || "—"],
              ["Endereço", patient.address ? `${patient.address}, ${patient.city}` : "—"],
            ].map(([l, v]) => (
              <div key={String(l)}>
                <p className="text-xs text-muted-foreground">{l}</p>
                <p className="text-sm text-foreground mt-0.5">{v}</p>
              </div>
            ))}
            {patient.community?.belongs && (
              <div>
                <p className="text-xs text-muted-foreground">Comunidade tradicional</p>
                <p className="text-sm text-foreground mt-0.5 capitalize">{patient.community.type}</p>
              </div>
            )}
          </div>
        </Card>

        <Card>
          <div className="px-5 py-3.5 border-b border-border">
            <h3 className="text-sm font-semibold text-foreground uppercase tracking-wide">Diagnóstico de Chagas</h3>
          </div>
          <div className="px-5 py-4 text-sm">
            {latestChagas ? (
              <div className="grid grid-cols-2 gap-x-8 gap-y-3">
                <div>
                  <p className="text-xs text-muted-foreground">Possui diagnóstico</p>
                  <p className="mt-0.5">
                    {latestChagas.hasChagas === true ? (
                      <Badge variant="warning">Sim — Portador</Badge>
                    ) : latestChagas.hasChagas === false ? (
                      <Badge variant="success">Não confirmado</Badge>
                    ) : (
                      <PendingTag />
                    )}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Status</p>
                  <p className="text-foreground mt-0.5">{latestChagas.status || "—"}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Resultado final</p>
                  <p className="text-foreground mt-0.5">{latestChagas.finalResult || "—"}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Data do resultado</p>
                  <p className="text-foreground mt-0.5">{formatDate(latestChagas.resultDate)}</p>
                </div>
                <div className="col-span-2">
                  <p className="text-xs text-muted-foreground">Critério de confirmação</p>
                  <p className="text-foreground mt-0.5">{latestChagas.confirmationCriteria || "—"}</p>
                </div>
              </div>
            ) : (
              <p className="text-muted-foreground">Sem dados de diagnóstico registrados</p>
            )}
          </div>
        </Card>

        <Card>
          <div className="px-5 py-3.5 border-b border-border">
            <h3 className="text-sm font-semibold text-foreground uppercase tracking-wide">Tratamento com BZN</h3>
          </div>
          <div className="px-5 py-4 text-sm">
            {latestBZN ? (
              <div className="grid grid-cols-2 gap-x-8 gap-y-3">
                <div>
                  <p className="text-xs text-muted-foreground">Usou benzonidazol</p>
                  <p className="mt-0.5">
                    {latestBZN.used === true ? <Badge variant="success">Sim</Badge>
                    : latestBZN.used === false ? <Badge variant="neutral">Não</Badge>
                    : <PendingTag />}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Tratamento pelo ambulatório</p>
                  <p className="text-foreground mt-0.5">{latestBZN.byClinic != null ? (latestBZN.byClinic ? "Sim" : "Não") : "—"}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Duração</p>
                  <p className="text-foreground mt-0.5">{latestBZN.duration || "—"}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Ano de uso</p>
                  <p className="text-foreground mt-0.5">{latestBZN.year || "—"}</p>
                </div>
                {latestBZN.adverseReactions?.length > 0 && (
                  <div className="col-span-2">
                    <p className="text-xs text-muted-foreground">Reações adversas registradas</p>
                    <p className="mt-0.5"><Badge variant="warning">{latestBZN.adverseReactions.length} reação(ões)</Badge></p>
                  </div>
                )}
              </div>
            ) : (
              <p className="text-muted-foreground">Sem dados de BZN registrados</p>
            )}
          </div>
        </Card>
      </div>

      {/* Right column */}
      <div className="flex flex-col gap-4">
        <Card>
          <div className="px-5 py-3.5 border-b border-border">
            <h3 className="text-sm font-semibold text-foreground uppercase tracking-wide">Último atendimento</h3>
          </div>
          <div className="px-5 py-4 text-sm">
            {lastAppt ? (
              <div className="flex flex-col gap-2">
                <p className="font-medium">{formatDate(lastAppt.date)}</p>
                <Badge variant={lastAppt.status === "completo" ? "success" : "warning"}>
                  {lastAppt.status === "completo" ? "Completo" : "Pendente"}
                </Badge>
                <p className="text-xs text-muted-foreground">{lastAppt.context === "ambulatorio-projeto" ? "Ambulatório anexo ao projeto" : "Ambulatório"}</p>
                {lastAppt.pendencyNotes && (
                  <div className="mt-1"><PendingTag>{lastAppt.pendencyNotes}</PendingTag></div>
                )}
              </div>
            ) : (
              <p className="text-muted-foreground">Nenhum atendimento</p>
            )}
          </div>
        </Card>

        <Card>
          <div className="px-5 py-3.5 border-b border-border">
            <h3 className="text-sm font-semibold text-foreground uppercase tracking-wide">Sinais vitais recentes</h3>
          </div>
          <div className="px-5 py-4">
            {latestVitals ? (
              <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-xs">
                {latestVitals.weight && <div><span className="text-muted-foreground">Peso</span> <span className="font-medium">{latestVitals.weight} kg</span></div>}
                {latestVitals.height && <div><span className="text-muted-foreground">Altura</span> <span className="font-medium">{latestVitals.height} cm</span></div>}
                {latestVitals.heartRate && <div><span className="text-muted-foreground">FC</span> <span className="font-medium">{latestVitals.heartRate} bpm</span></div>}
                {latestVitals.saturation && <div><span className="text-muted-foreground">SpO₂</span> <span className="font-medium">{latestVitals.saturation}%</span></div>}
                {latestVitals.systolicBP && <div><span className="text-muted-foreground">PA</span> <span className="font-medium">{latestVitals.systolicBP}/{latestVitals.diastolicBP} mmHg</span></div>}
                {latestVitals.nyha && <div><span className="text-muted-foreground">NYHA</span> <span className="font-medium">{latestVitals.nyha}</span></div>}
              </div>
            ) : (
              <p className="text-xs text-muted-foreground">Sem dados disponíveis</p>
            )}
          </div>
        </Card>

        {/* Timeline */}
        <Card>
          <div className="px-5 py-3.5 border-b border-border">
            <h3 className="text-sm font-semibold text-foreground uppercase tracking-wide">Linha do tempo</h3>
          </div>
          <div className="px-5 py-4">
            <div className="relative">
              <div className="absolute left-3 top-0 bottom-0 w-px bg-border" />
              <div className="flex flex-col gap-3">
                {appointments.slice(0, 6).map((a) => (
                  <div key={a.id} className="flex items-start gap-3 pl-7 relative">
                    <div className="absolute left-2 top-1.5 w-2.5 h-2.5 rounded-full border-2 border-primary bg-card -translate-x-1/2" />
                    <div>
                      <p className="text-xs font-medium text-foreground">{new Date(a.date).getFullYear()} — Atendimento</p>
                      <p className="text-xs text-muted-foreground">{formatDate(a.date)}</p>
                    </div>
                  </div>
                ))}
                {appointments.length === 0 && (
                  <p className="text-xs text-muted-foreground pl-7">Sem registros</p>
                )}
              </div>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}

function TabAtendimentos({ appointments, canEdit, onNewAppointment }: {
  appointments: Appointment[]; canEdit: boolean; onNewAppointment: () => void;
}) {
  const [expandedId, setExpandedId] = useState<string | null>(null);

  return (
    <div>
      {canEdit && (
        <div className="flex justify-end mb-4">
          <Button variant="primary" size="sm" icon={<IconPlus size={14} />} onClick={onNewAppointment}>
            Novo atendimento
          </Button>
        </div>
      )}
      <Card>
        {appointments.length === 0 ? (
          <div className="py-12 text-center text-muted-foreground text-sm">Nenhum atendimento registrado</div>
        ) : (
          <div className="divide-y divide-border/60">
            {appointments.map((a) => (
              <div key={a.id}>
                <button
                  className="w-full flex items-center justify-between px-5 py-4 hover:bg-accent/30 transition-colors text-left"
                  onClick={() => setExpandedId(expandedId === a.id ? null : a.id)}
                >
                  <div className="flex items-center gap-4">
                    <div>
                      <p className="text-sm font-medium text-foreground">{formatDate(a.date)}</p>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {a.context === "ambulatorio-projeto" ? "Ambulatório anexo ao projeto" : "Ambulatório"} · {a.originRecord === "importado" ? "Importado" : "Sistema"}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    {a.status === "pendente" && <Badge variant="warning">Pendente</Badge>}
                    {a.status === "completo" && <Badge variant="success">Completo</Badge>}
                    <span className="text-muted-foreground">{expandedId === a.id ? <IconChevronDown size={16} /> : <IconChevronRight size={16} />}</span>
                  </div>
                </button>
                {expandedId === a.id && (
                  <div className="px-5 pb-5 bg-muted/30">
                    <div className="grid grid-cols-3 gap-4 text-sm py-4">
                      {a.observations && (
                        <div className="col-span-3">
                          <p className="text-xs text-muted-foreground">Observações</p>
                          <p className="text-foreground mt-1 text-sm">{a.observations}</p>
                        </div>
                      )}
                      {a.pendencyNotes && (
                        <div className="col-span-3">
                          <PendingTag>{a.pendencyNotes}</PendingTag>
                        </div>
                      )}
                      {a.vitalSigns && (
                        <div>
                          <p className="text-xs font-medium text-muted-foreground uppercase mb-1">Sinais vitais</p>
                          <div className="text-xs flex flex-col gap-0.5">
                            {a.vitalSigns.weight && <span>Peso: {a.vitalSigns.weight} kg</span>}
                            {a.vitalSigns.heartRate && <span>FC: {a.vitalSigns.heartRate} bpm</span>}
                            {a.vitalSigns.systolicBP && <span>PA: {a.vitalSigns.systolicBP}/{a.vitalSigns.diastolicBP} mmHg</span>}
                          </div>
                        </div>
                      )}
                      {a.exams && a.exams.length > 0 && (
                        <div>
                          <p className="text-xs font-medium text-muted-foreground uppercase mb-1">Exames</p>
                          <div className="text-xs flex flex-col gap-0.5">
                            {a.exams.map((e) => <span key={e.id}>• {e.type}</span>)}
                          </div>
                        </div>
                      )}
                      {a.projects && a.projects.length > 0 && (
                        <div>
                          <p className="text-xs font-medium text-muted-foreground uppercase mb-1">Projetos</p>
                          <div className="flex flex-wrap gap-1">
                            {a.projects.map((pr) => <Badge key={pr} variant="info">{pr}</Badge>)}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}

function TabChagas({ appointments, canEdit }: { appointments: Appointment[]; canEdit: boolean }) {
  const apptWithChagas = appointments.filter((a) => a.chagas);
  const latest = apptWithChagas[0]?.chagas;
  const allSorologias = apptWithChagas.flatMap((a) => a.chagas?.sorologias || []);

  return (
    <div className="flex flex-col gap-4">
      <Card>
        <div className="px-5 py-3.5 border-b border-border">
          <h3 className="text-sm font-semibold uppercase tracking-wide">Diagnóstico</h3>
        </div>
        <div className="px-5 py-4">
          {latest ? (
            <div className="grid grid-cols-2 gap-x-8 gap-y-3 text-sm">
              <div>
                <p className="text-xs text-muted-foreground">Possui diagnóstico de Chagas</p>
                <p className="mt-1">
                  {latest.hasChagas === true ? <Badge variant="warning">Sim — Portador</Badge>
                  : latest.hasChagas === false ? <Badge variant="success">Não confirmado</Badge>
                  : <PendingTag />}
                </p>
              </div>
              <div><p className="text-xs text-muted-foreground">Status</p><p className="mt-0.5">{latest.status || "—"}</p></div>
              <div><p className="text-xs text-muted-foreground">Resultado final</p><p className="mt-0.5">{latest.finalResult || "—"}</p></div>
              <div><p className="text-xs text-muted-foreground">Data do resultado</p><p className="mt-0.5">{formatDate(latest.resultDate)}</p></div>
              <div className="col-span-2"><p className="text-xs text-muted-foreground">Critério de confirmação</p><p className="mt-0.5">{latest.confirmationCriteria || "—"}</p></div>
              {latest.observations && (
                <div className="col-span-2"><p className="text-xs text-muted-foreground">Observações</p><p className="mt-0.5">{latest.observations}</p></div>
              )}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">Sem dados de diagnóstico registrados</p>
          )}
        </div>
      </Card>

      <Card>
        <div className="px-5 py-3.5 border-b border-border flex items-center justify-between">
          <h3 className="text-sm font-semibold uppercase tracking-wide">Sorologias</h3>
          {canEdit && (
            <Button variant="outline" size="sm" icon={<IconPlus size={13} />}>Adicionar sorologia</Button>
          )}
        </div>
        {allSorologias.length > 0 ? (
          <Table headers={["Método", "Data solicitação", "Data coleta", "Data resultado", "Resultado", "Laboratório"]}>
            {allSorologias.map((s) => (
              <Tr key={s.id}>
                <Td className="font-medium">{s.method}</Td>
                <Td>{formatDate(s.requestDate)}</Td>
                <Td>{formatDate(s.collectDate)}</Td>
                <Td>{formatDate(s.resultDate)}</Td>
                <Td>
                  <Badge variant={s.result.toLowerCase().includes("reagente") && !s.result.toLowerCase().includes("não") ? "warning" : s.result.toLowerCase().includes("não") ? "success" : "neutral"}>
                    {s.result}
                  </Badge>
                </Td>
                <Td>{s.lab || "—"}</Td>
              </Tr>
            ))}
          </Table>
        ) : (
          <div className="py-8 text-center text-sm text-muted-foreground">Nenhuma sorologia registrada</div>
        )}
      </Card>

      <Card>
        <div className="px-5 py-3.5 border-b border-border">
          <h3 className="text-sm font-semibold uppercase tracking-wide">Informações preservadas — revisão pendente</h3>
        </div>
        <div className="px-5 py-4">
          <PendingTag>Informações de autorrelato preservadas na importação — interpretação ainda não validada institucionalmente</PendingTag>
        </div>
      </Card>
    </div>
  );
}

function TabProjetos({ patient, canEdit }: { patient: ReturnType<typeof useApp>["patients"][0]; canEdit: boolean }) {
  const { appointments } = useApp();
  const patientAppts = appointments.filter((a) => a.patientId === patient.id);

  return (
    <Card>
      <div className="px-5 py-3.5 border-b border-border flex items-center justify-between">
        <h3 className="text-sm font-semibold uppercase tracking-wide">Projetos associados</h3>
        {canEdit && <Button variant="outline" size="sm" icon={<IconPlus size={13} />}>Associar projeto</Button>}
      </div>
      {patient.projects.length > 0 ? (
        <Table headers={["Projeto", "Participa", "Pendência", "Falha"]}>
          {patient.projects.map((proj) => {
            const apptWithProj = patientAppts.filter((a) => a.projects?.includes(proj));
            return (
              <Tr key={proj}>
                <Td className="font-medium">{proj}</Td>
                <Td><Badge variant="success">Sim</Badge></Td>
                <Td><span className="text-muted-foreground">—</span></Td>
                <Td><span className="text-muted-foreground">—</span></Td>
              </Tr>
            );
          })}
        </Table>
      ) : (
        <div className="py-8 text-center text-sm text-muted-foreground">Nenhum projeto associado a este paciente</div>
      )}
    </Card>
  );
}

function TabExames({ exams, canEdit }: { exams: Exam[]; canEdit: boolean }) {
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const brought = exams.filter((e) => e.origin === "brought");
  const requested = exams.filter((e) => e.origin === "requested");

  const statusVariant = (s: string) => {
    if (s === "resultado-disponivel") return "success";
    if (s === "realizado") return "info";
    return "warning";
  };
  const statusLabel = (s: string) => {
    if (s === "resultado-disponivel") return "Resultado disponível";
    if (s === "realizado") return "Realizado";
    return "Pendente";
  };

  return (
    <div className="flex flex-col gap-4">
      {canEdit && (
        <div className="flex justify-end">
          <Button variant="primary" size="sm" icon={<IconPlus size={14} />}>Adicionar exame</Button>
        </div>
      )}

      {[{ label: "Trazidos pelo paciente", data: brought }, { label: "Solicitados", data: requested }].map(({ label, data }) => (
        <Card key={label}>
          <div className="px-5 py-3.5 border-b border-border">
            <h3 className="text-sm font-semibold uppercase tracking-wide">{label}</h3>
          </div>
          {data.length > 0 ? (
            <div className="divide-y divide-border/60">
              {data.map((e) => (
                <div key={e.id}>
                  <button
                    className="w-full flex items-center justify-between px-5 py-3.5 hover:bg-accent/30 transition-colors text-left"
                    onClick={() => setExpandedId(expandedId === e.id ? null : e.id)}
                  >
                    <div className="flex items-center gap-3">
                      <div>
                        <p className="text-sm font-medium">{e.type}</p>
                        <p className="text-xs text-muted-foreground">{formatDate(e.date)}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant={statusVariant(e.status)}>{statusLabel(e.status)}</Badge>
                      <span className="text-muted-foreground">{expandedId === e.id ? <IconChevronDown size={14} /> : <IconChevronRight size={14} />}</span>
                    </div>
                  </button>
                  {expandedId === e.id && (
                    <div className="px-5 pb-4 bg-muted/20">
                      {e.resultSummary && (
                        <div className="mb-3">
                          <p className="text-xs text-muted-foreground mb-1">Resumo do resultado</p>
                          <p className="text-sm text-foreground">{e.resultSummary}</p>
                        </div>
                      )}
                      {e.results && e.results.length > 0 && (
                        <Table headers={["Parâmetro", "Valor", "Unidade", "Referência", "Interpretação"]}>
                          {e.results.map((r, i) => (
                            <Tr key={i}>
                              <Td className="font-medium">{r.name}</Td>
                              <Td>{r.value}</Td>
                              <Td>{r.unit || "—"}</Td>
                              <Td>{r.reference || "—"}</Td>
                              <Td>{r.interpretation || "—"}</Td>
                            </Tr>
                          ))}
                        </Table>
                      )}
                      {canEdit && (
                        <Button variant="outline" size="sm" className="mt-3" icon={<IconPlus size={13} />}>
                          Adicionar resultado
                        </Button>
                      )}
                      {e.observations && <p className="text-xs text-muted-foreground mt-2">{e.observations}</p>}
                    </div>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <div className="py-6 text-center text-sm text-muted-foreground">Nenhum exame nesta categoria</div>
          )}
        </Card>
      ))}
    </div>
  );
}

function TabTratamentos({ appointments, canEdit }: { appointments: Appointment[]; canEdit: boolean }) {
  const apptWithBZN = appointments.find((a) => a.bzn);
  const bzn = apptWithBZN?.bzn;
  const allMeds = appointments.flatMap((a) => a.medications || []);

  return (
    <div className="flex flex-col gap-4">
      <Card>
        <div className="px-5 py-3.5 border-b border-border flex items-center justify-between">
          <h3 className="text-sm font-semibold uppercase tracking-wide">Benzonidazol (BZN)</h3>
          {canEdit && <Button variant="outline" size="sm" icon={<IconEdit size={13} />}>Editar</Button>}
        </div>
        <div className="px-5 py-4">
          {bzn ? (
            <div>
              <div className="grid grid-cols-3 gap-x-8 gap-y-3 text-sm mb-4">
                <div><p className="text-xs text-muted-foreground">Usou BZN</p><p className="mt-0.5">{bzn.used === true ? <Badge variant="success">Sim</Badge> : bzn.used === false ? <Badge variant="neutral">Não</Badge> : <PendingTag />}</p></div>
                <div><p className="text-xs text-muted-foreground">Tratamento pelo ambulatório</p><p className="text-foreground mt-0.5">{bzn.byClinic != null ? (bzn.byClinic ? "Sim" : "Não") : "—"}</p></div>
                <div><p className="text-xs text-muted-foreground">Possui indicação</p><p className="text-foreground mt-0.5">{bzn.hasIndication != null ? (bzn.hasIndication ? "Sim" : "Não") : "—"}</p></div>
                <div><p className="text-xs text-muted-foreground">Tempo de uso</p><p className="text-foreground mt-0.5">{bzn.duration || "—"}</p></div>
                <div><p className="text-xs text-muted-foreground">Ano de uso</p><p className="text-foreground mt-0.5">{bzn.year || "—"}</p></div>
                <div><p className="text-xs text-muted-foreground">Data da prescrição</p><p className="text-foreground mt-0.5">{formatDate(bzn.prescriptionDate)}</p></div>
              </div>
              {bzn.adverseReactions && bzn.adverseReactions.length > 0 && (
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-xs font-medium text-muted-foreground uppercase">Reações adversas</p>
                    {canEdit && <Button variant="ghost" size="sm" icon={<IconPlus size={12} />}>Adicionar</Button>}
                  </div>
                  <Table headers={["Data", "Descrição", "Status"]}>
                    {bzn.adverseReactions.map((r) => (
                      <Tr key={r.id}>
                        <Td>{formatDate(r.date)}</Td>
                        <Td>{r.description}</Td>
                        <Td><Badge variant={r.status?.includes("Resolvido") ? "success" : "warning"}>{r.status || "—"}</Badge></Td>
                      </Tr>
                    ))}
                  </Table>
                </div>
              )}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">Sem dados de tratamento com BZN</p>
          )}
        </div>
      </Card>

      <Card>
        <div className="px-5 py-3.5 border-b border-border flex items-center justify-between">
          <h3 className="text-sm font-semibold uppercase tracking-wide">Medicamentos</h3>
          {canEdit && <Button variant="outline" size="sm" icon={<IconPlus size={13} />}>Adicionar</Button>}
        </div>
        {allMeds.length > 0 ? (
          <Table headers={["Medicamento", "Dose", "Via", "Frequência", "Início", "Uso atual", "Status"]}>
            {allMeds.map((m) => (
              <Tr key={m.id}>
                <Td className="font-medium">{m.name}</Td>
                <Td>{m.dose || "—"}</Td>
                <Td>{m.route || "—"}</Td>
                <Td>{m.frequency || "—"}</Td>
                <Td>{formatDate(m.startDate)}</Td>
                <Td>{m.currentUse ? <Badge variant="success">Sim</Badge> : <Badge variant="neutral">Não</Badge>}</Td>
                <Td><Badge variant="neutral">{m.status || "—"}</Badge></Td>
              </Tr>
            ))}
          </Table>
        ) : (
          <div className="py-8 text-center text-sm text-muted-foreground">Nenhum medicamento registrado</div>
        )}
      </Card>
    </div>
  );
}

function TabAvaliacaoClinica({ appointments }: { appointments: Appointment[] }) {
  const apptWithVitals = appointments.filter((a) => a.vitalSigns);

  return (
    <Card>
      <div className="px-5 py-3.5 border-b border-border">
        <h3 className="text-sm font-semibold uppercase tracking-wide">Histórico de avaliações clínicas</h3>
      </div>
      {apptWithVitals.length > 0 ? (
        <Table headers={["Data", "Peso (kg)", "Altura (cm)", "FC (bpm)", "SpO₂", "PA (mmHg)", "NYHA"]}>
          {apptWithVitals.map((a) => {
            const v = a.vitalSigns!;
            return (
              <Tr key={a.id}>
                <Td className="font-medium">{formatDate(a.date)}</Td>
                <Td>{v.weight || "—"}</Td>
                <Td>{v.height || "—"}</Td>
                <Td>{v.heartRate || "—"}</Td>
                <Td>{v.saturation ? `${v.saturation}%` : "—"}</Td>
                <Td>{v.systolicBP ? `${v.systolicBP}/${v.diastolicBP}` : "—"}</Td>
                <Td>{v.nyha || "—"}</Td>
              </Tr>
            );
          })}
        </Table>
      ) : (
        <div className="py-8 text-center text-sm text-muted-foreground">Sem avaliações clínicas registradas</div>
      )}
    </Card>
  );
}

function TabEncaminhamentos({ referrals, canEdit }: { referrals: ReturnType<typeof useApp>["appointments"][0]["referrals"]; canEdit: boolean }) {
  const safeReferrals = referrals || [];
  const statusVariant = (s: string) => {
    if (s === "Realizado") return "success";
    if (s === "Agendado") return "info";
    return "warning";
  };

  return (
    <Card>
      <div className="px-5 py-3.5 border-b border-border flex items-center justify-between">
        <h3 className="text-sm font-semibold uppercase tracking-wide">Encaminhamentos</h3>
        {canEdit && <Button variant="outline" size="sm" icon={<IconPlus size={13} />}>Adicionar encaminhamento</Button>}
      </div>
      {safeReferrals.length > 0 ? (
        <Table headers={["Tipo", "Especialidade", "Destino", "Data", "Status", "Prioridade"]}>
          {safeReferrals.map((r) => (
            <Tr key={r.id}>
              <Td className="font-medium">{r.type || "—"}</Td>
              <Td>{r.specialty || "—"}</Td>
              <Td>{r.destination || r.origin || "—"}</Td>
              <Td>{formatDate(r.referralDate || r.realizationDate)}</Td>
              <Td><Badge variant={statusVariant(r.status)}>{r.status}</Badge></Td>
              <Td>{r.priority || "—"}</Td>
            </Tr>
          ))}
        </Table>
      ) : (
        <div className="py-8 text-center text-sm text-muted-foreground">Nenhum encaminhamento registrado</div>
      )}
    </Card>
  );
}

function TabNotificacao({ appointments, canEdit }: { appointments: Appointment[]; canEdit: boolean }) {
  const apptWithNotif = appointments.find((a) => a.notification && a.notification.notified !== null);
  const notif = apptWithNotif?.notification;

  return (
    <Card>
      <div className="px-5 py-3.5 border-b border-border flex items-center justify-between">
        <h3 className="text-sm font-semibold uppercase tracking-wide">Notificação compulsória</h3>
        {canEdit && <Button variant="outline" size="sm" icon={<IconEdit size={13} />}>Editar</Button>}
      </div>
      <div className="px-5 py-4">
        {notif ? (
          <div className="flex flex-col gap-4 text-sm">
            <div>
              <p className="text-xs text-muted-foreground">Paciente notificado</p>
              <p className="mt-1">{notif.notified ? <Badge variant="success">Sim</Badge> : <Badge variant="warning">Não</Badge>}</p>
            </div>
            {notif.notified && notif.number && (
              <div>
                <p className="text-xs text-muted-foreground">Número da notificação</p>
                <p className="font-mono text-sm mt-0.5">{notif.number}</p>
              </div>
            )}
            {!notif.notified && notif.justification && (
              <div>
                <p className="text-xs text-muted-foreground">Justificativa</p>
                <p className="text-foreground mt-0.5">{notif.justification}</p>
              </div>
            )}
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">Sem dados de notificação registrados</p>
        )}
      </div>
    </Card>
  );
}
