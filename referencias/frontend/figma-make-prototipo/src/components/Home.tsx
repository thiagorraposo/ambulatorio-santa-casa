import React from "react";
import { useApp } from "../context";
import { Card, Badge, Button, formatDate, IconSearch, IconPlus, IconDatabase, IconClipboard } from "./ui";

export default function Home() {
  const { currentUser, patients, appointments, pendencies, importBatches, navigate } = useApp();
  const canEdit = currentUser?.role === "edicao" || currentUser?.role === "administracao";
  const canImport = currentUser?.role === "administracao";

  const openPendencies = pendencies.filter((p) => p.status !== "resolvida");
  const recentAppointments = [...appointments]
    .sort((a, b) => b.date.localeCompare(a.date))
    .slice(0, 5);

  const recentPendencies = [...openPendencies]
    .sort((a, b) => b.identifiedAt.localeCompare(a.identifiedAt))
    .slice(0, 4);

  const stats = [
    { label: "Pacientes cadastrados", value: patients.length, note: "A definir — KPIs em validação", color: "text-primary" },
    { label: "Atendimentos registrados", value: appointments.length, note: "A definir — KPIs em validação", color: "text-green-700" },
    { label: "Pendências abertas", value: openPendencies.length, note: "Aguardando revisão", color: "text-amber-700" },
    { label: "Importações realizadas", value: importBatches.length, note: "Histórico de lotes", color: "text-sky-700" },
  ];

  function getAppointmentPatient(patientId: string) {
    return patients.find((p) => p.id === patientId);
  }

  const statusVariant = (s: string) => s === "completo" ? "success" : "warning";
  const statusLabel = (s: string) => s === "completo" ? "Completo" : "Pendente";

  const pendencyStatusVariant = (s: string) => {
    if (s === "resolvida") return "success";
    if (s === "em-revisao") return "info";
    return "warning";
  };
  const pendencyStatusLabel = (s: string) => {
    if (s === "resolvida") return "Resolvida";
    if (s === "em-revisao") return "Em revisão";
    return "Pendente";
  };

  const originLabel = (o: string) => o === "importado" ? "Importado" : "Sistema";

  return (
    <div className="p-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-xl font-semibold text-foreground">
          Bom dia, {currentUser?.name.split(" ")[0]}
        </h1>
        <p className="text-sm text-muted-foreground mt-0.5">
          Resumo operacional do Ambulatório Santa Casa
        </p>
        <p className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded px-2 py-1 inline-block mt-2">
          ⚑ Indicadores exibidos como proposta inicial — KPIs definitivos pendentes de validação pela equipe
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-4 gap-4 mb-6">
        {stats.map((s, i) => (
          <Card key={i} className="p-5">
            <p className="text-xs text-muted-foreground uppercase tracking-wide mb-2">{s.label}</p>
            <p className={`text-3xl font-semibold ${s.color}`}>{s.value}</p>
            <p className="text-xs text-muted-foreground mt-1.5">{s.note}</p>
          </Card>
        ))}
      </div>

      {/* Quick actions */}
      <div className="flex flex-wrap gap-2 mb-6">
        <Button variant="primary" size="sm" icon={<IconSearch size={14} />} onClick={() => navigate("patients")}>
          Buscar paciente
        </Button>
        {canEdit && (
          <Button variant="outline" size="sm" icon={<IconPlus size={14} />} onClick={() => navigate("new-patient")}>
            Novo paciente
          </Button>
        )}
        {canEdit && (
          <Button variant="outline" size="sm" onClick={() => navigate("patients")}>
            Novo atendimento
          </Button>
        )}
        {canImport && (
          <Button variant="outline" size="sm" icon={<IconDatabase size={14} />} onClick={() => navigate("imports")}>
            Nova importação
          </Button>
        )}
        <Button variant="outline" size="sm" icon={<IconClipboard size={14} />} onClick={() => navigate("pendencies")}>
          Revisar pendências {openPendencies.length > 0 && `(${openPendencies.length})`}
        </Button>
      </div>

      {/* Two columns */}
      <div className="grid grid-cols-2 gap-5">
        {/* Recent appointments */}
        <Card>
          <div className="px-5 py-4 border-b border-border flex items-center justify-between">
            <h2 className="text-sm font-semibold text-foreground">Atendimentos recentes</h2>
            <button onClick={() => navigate("patients")} className="text-xs text-primary hover:underline">Ver todos</button>
          </div>
          <div className="divide-y divide-border/60">
            {recentAppointments.map((a) => {
              const patient = getAppointmentPatient(a.patientId);
              return (
                <div
                  key={a.id}
                  className="px-5 py-3 hover:bg-accent/30 transition-colors cursor-pointer"
                  onClick={() => navigate("patient-record", { patientId: a.patientId })}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-foreground truncate">{patient?.name || "—"}</p>
                      <p className="text-xs text-muted-foreground mt-0.5">{formatDate(a.date)} · {originLabel(a.originRecord)}</p>
                    </div>
                    <Badge variant={statusVariant(a.status)}>{statusLabel(a.status)}</Badge>
                  </div>
                </div>
              );
            })}
            {recentAppointments.length === 0 && (
              <p className="text-sm text-muted-foreground px-5 py-8 text-center">Nenhum atendimento registrado</p>
            )}
          </div>
        </Card>

        {/* Recent pendencies */}
        <Card>
          <div className="px-5 py-4 border-b border-border flex items-center justify-between">
            <h2 className="text-sm font-semibold text-foreground">Pendências recentes</h2>
            <button onClick={() => navigate("pendencies")} className="text-xs text-primary hover:underline">Ver todas</button>
          </div>
          <div className="divide-y divide-border/60">
            {recentPendencies.map((p) => (
              <div key={p.id} className="px-5 py-3 hover:bg-accent/30 transition-colors">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-medium text-amber-700">{p.type}</p>
                    <p className="text-sm text-foreground mt-0.5 truncate">{p.patientName}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">{formatDate(p.identifiedAt)}</p>
                  </div>
                  <div className="flex flex-col items-end gap-1.5">
                    <Badge variant={pendencyStatusVariant(p.status)}>{pendencyStatusLabel(p.status)}</Badge>
                    {canEdit && (
                      <button
                        onClick={() => navigate("pendencies")}
                        className="text-xs text-primary hover:underline"
                      >
                        Revisar
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ))}
            {recentPendencies.length === 0 && (
              <p className="text-sm text-muted-foreground px-5 py-8 text-center">Nenhuma pendência aberta</p>
            )}
          </div>
        </Card>
      </div>
    </div>
  );
}
