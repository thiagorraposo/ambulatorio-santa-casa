import React, { useState } from "react";
import { useApp } from "../context";
import {
  Card, Button, Badge, AlertBox, Breadcrumb, formatDate,
  IconDownload, IconLock,
} from "./ui";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend, LineChart, Line, CartesianGrid,
} from "recharts";

const COLORS = ["#1a4fa0", "#3b6fd4", "#64a0e8", "#93c5fd", "#bfdbfe", "#dbeafe", "#e0e7ff", "#a5b4fc", "#818cf8"];

export default function Dashboard() {
  const { patients, appointments, pendencies, importBatches, currentUser, navigate, showToast } = useApp();
  const [period, setPeriod] = useState("2026");
  const [exportConfirm, setExportConfirm] = useState(false);
  const [exportDone, setExportDone] = useState(false);
  const isAdmin = currentUser?.role === "administracao";
  const canExport = isAdmin;

  // Appointments by month
  const apptByMonth = (() => {
    const months: Record<string, number> = {};
    appointments
      .filter((a) => a.date.startsWith(period))
      .forEach((a) => {
        const m = a.date.slice(0, 7);
        months[m] = (months[m] || 0) + 1;
      });
    return Object.entries(months).sort().map(([m, count]) => ({
      month: m.slice(5) + "/" + m.slice(2, 4),
      atendimentos: count,
    }));
  })();

  // Patients by origin
  const originData = [
    { name: "Portador de DC", value: patients.filter((p) => p.origin === "dc").length },
    { name: "Não portador de DC", value: patients.filter((p) => p.origin === "non-dc").length },
    { name: "Sistema", value: patients.filter((p) => p.origin === "system").length },
  ];

  // Projects distribution
  const projectData = (() => {
    const counts: Record<string, number> = {};
    patients.forEach((p) => p.projects.forEach((proj) => { counts[proj] = (counts[proj] || 0) + 1; }));
    return Object.entries(counts).sort((a, b) => b[1] - a[1]).map(([name, value]) => ({ name, value }));
  })();

  const openPendencies = pendencies.filter((p) => p.status !== "resolvida").length;

  async function doExport() {
    await new Promise((r) => setTimeout(r, 600));
    setExportConfirm(false);
    setExportDone(true);
    showToast("success", "Exportação concluída. Arquivo sintético gerado.");
    setTimeout(() => setExportDone(false), 4000);
  }

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <Breadcrumb items={[{ label: "Início", onClick: () => navigate("home") }, { label: "Dashboard" }]} />

      <div className="flex items-start justify-between mt-4 mb-2">
        <div>
          <h1 className="text-xl font-semibold">Dashboard</h1>
          <p className="text-sm text-muted-foreground mt-0.5">Métricas operacionais — proposta inicial para validação</p>
        </div>
        <div className="flex gap-2">
          <select
            value={period}
            onChange={(e) => setPeriod(e.target.value)}
            className="text-sm border border-border rounded bg-card px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-ring"
          >
            <option value="2026">2026</option>
            <option value="2025">2025</option>
            <option value="2024">2024</option>
          </select>
          {canExport ? (
            <Button variant="outline" size="sm" icon={<IconDownload size={14} />} onClick={() => setExportConfirm(true)}>
              Exportar CSV
            </Button>
          ) : (
            <Button variant="outline" size="sm" icon={<IconLock size={14} />} disabled title="Você não possui permissão para exportar estes dados.">
              Exportar CSV
            </Button>
          )}
        </div>
      </div>

      <div className="mb-4">
        <AlertBox type="pending">
          Indicadores apresentados como proposta inicial — KPIs clínicos e operacionais definitivos precisam ser validados pela equipe.
          Não são calculados prognósticos, scores clínicos ou recomendações automáticas.
        </AlertBox>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-4 gap-4 mb-6">
        {[
          { label: "Pacientes cadastrados", value: patients.length, color: "text-primary", note: "Total no sistema" },
          { label: "Atendimentos no período", value: appointments.filter((a) => a.date.startsWith(period)).length, color: "text-green-700", note: period },
          { label: "Pendências abertas", value: openPendencies, color: "text-amber-700", note: "Aguardando revisão" },
          { label: "Importações realizadas", value: importBatches.length, color: "text-sky-700", note: "Lotes processados" },
        ].map(({ label, value, color, note }) => (
          <Card key={label} className="p-5">
            <p className="text-xs text-muted-foreground uppercase tracking-wide mb-1.5">{label}</p>
            <p className={`text-3xl font-semibold ${color}`}>{value}</p>
            <p className="text-xs text-muted-foreground mt-1.5">{note}</p>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-2 gap-5 mb-5">
        {/* Appointments over time */}
        <Card>
          <div className="px-5 py-4 border-b border-border">
            <h3 className="text-sm font-semibold">Atendimentos por período</h3>
          </div>
          <div className="px-5 py-4">
            {apptByMonth.length > 0 ? (
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={apptByMonth} margin={{ top: 0, right: 0, bottom: 0, left: -20 }}>
                  <XAxis dataKey="month" tick={{ fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 11 }} allowDecimals={false} />
                  <Tooltip contentStyle={{ fontSize: 12, borderRadius: 6 }} />
                  <Bar dataKey="atendimentos" fill="#1a4fa0" radius={[3, 3, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-[200px] flex items-center justify-center text-sm text-muted-foreground">
                Sem atendimentos no período selecionado
              </div>
            )}
          </div>
        </Card>

        {/* Patients by origin */}
        <Card>
          <div className="px-5 py-4 border-b border-border">
            <h3 className="text-sm font-semibold">Pacientes por origem</h3>
          </div>
          <div className="px-5 py-4">
            <ResponsiveContainer width="100%" height={200}>
              <PieChart>
                <Pie data={originData} cx="50%" cy="50%" innerRadius={50} outerRadius={80} paddingAngle={3} dataKey="value">
                  {originData.map((_, i) => (
                    <Cell key={i} fill={COLORS[i]} />
                  ))}
                </Pie>
                <Tooltip contentStyle={{ fontSize: 12, borderRadius: 6 }} />
                <Legend iconSize={10} wrapperStyle={{ fontSize: 12 }} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </Card>
      </div>

      {/* Projects distribution */}
      <Card>
        <div className="px-5 py-4 border-b border-border">
          <h3 className="text-sm font-semibold">Distribuição por projetos</h3>
        </div>
        <div className="px-5 py-4">
          {projectData.length > 0 ? (
            <ResponsiveContainer width="100%" height={180}>
              <BarChart data={projectData} layout="vertical" margin={{ top: 0, right: 20, bottom: 0, left: 80 }}>
                <XAxis type="number" tick={{ fontSize: 11 }} allowDecimals={false} />
                <YAxis dataKey="name" type="category" tick={{ fontSize: 11 }} width={120} />
                <Tooltip contentStyle={{ fontSize: 12, borderRadius: 6 }} />
                <Bar dataKey="value" fill="#3b6fd4" radius={[0, 3, 3, 0]} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <p className="text-sm text-muted-foreground text-center py-8">Sem dados de projetos disponíveis</p>
          )}
        </div>
      </Card>

      {/* Export confirm modal */}
      {exportConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/40" onClick={() => setExportConfirm(false)} />
          <div className="relative bg-card border border-border rounded-xl shadow-2xl w-full max-w-sm mx-4 p-6 flex flex-col gap-4">
            <h2 className="text-base font-semibold">Confirmar exportação</h2>
            <div className="text-sm text-muted-foreground flex flex-col gap-2">
              <p>Escopo da exportação: <strong>dados operacionais sintéticos</strong></p>
              <p className="text-xs">Formato: CSV · Apenas dados anonimizados de demonstração</p>
            </div>
            <AlertBox type="pending">
              A política definitiva sobre quais dados podem ser exportados e por quais perfis ainda está em definição institucional.
            </AlertBox>
            <div className="flex gap-2 justify-end">
              <Button variant="outline" onClick={() => setExportConfirm(false)}>Cancelar</Button>
              <Button variant="primary" icon={<IconDownload size={14} />} onClick={doExport}>
                Confirmar exportação
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Export not authorized */}
      {!canExport && (
        <div className="mt-4">
          <AlertBox type="warning">
            Exportação de dados: seu perfil atual não possui permissão para esta operação.
            Entre em contato com a Administração do sistema.
          </AlertBox>
        </div>
      )}
    </div>
  );
}
