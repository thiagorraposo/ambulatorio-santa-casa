import React, { useState } from "react";
import { useApp } from "../context";
import {
  Card, Button, Badge, Table, Tr, Td, EmptyState, Spinner, Breadcrumb,
  IconSearch, IconPlus, IconEye, IconEdit,
  formatDate, calcAge, originLabel, originVariant,
} from "./ui";

export default function Patients() {
  const { patients, appointments, currentUser, navigate } = useApp();
  const [search, setSearch] = useState("");
  const [filterOrigin, setFilterOrigin] = useState("");
  const [isLoading] = useState(false);

  const canEdit = currentUser?.role === "edicao" || currentUser?.role === "administracao";

  const filtered = patients.filter((p) => {
    const q = search.toLowerCase();
    const matchSearch =
      !q ||
      p.name.toLowerCase().includes(q) ||
      p.code.toLowerCase().includes(q) ||
      (p.birthDate && p.birthDate.includes(q));
    const matchOrigin = !filterOrigin || p.origin === filterOrigin;
    return matchSearch && matchOrigin;
  });

  function getLastAppointment(patientId: string) {
    const appts = appointments
      .filter((a) => a.patientId === patientId)
      .sort((a, b) => b.date.localeCompare(a.date));
    return appts[0];
  }

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <Breadcrumb items={[{ label: "Início", onClick: () => navigate("home") }, { label: "Pacientes" }]} />

      <div className="flex items-start justify-between mt-4 mb-5">
        <div>
          <h1 className="text-xl font-semibold text-foreground">Pacientes</h1>
          <p className="text-sm text-muted-foreground mt-0.5">{patients.length} pacientes cadastrados</p>
        </div>
        {canEdit && (
          <Button variant="primary" size="sm" icon={<IconPlus size={14} />} onClick={() => navigate("new-patient")}>
            Novo paciente
          </Button>
        )}
      </div>

      {/* Search bar */}
      <Card className="p-4 mb-4">
        <div className="flex gap-3 flex-wrap">
          <div className="relative flex-1 min-w-64">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none">
              <IconSearch size={16} />
            </span>
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar por nome, código ou data de nascimento (AAAA-MM-DD)..."
              className="w-full pl-9 pr-4 py-2 text-sm border border-border rounded bg-card focus:outline-none focus:ring-2 focus:ring-ring focus:border-ring hover:border-gray-400 transition-colors"
            />
          </div>
          <select
            value={filterOrigin}
            onChange={(e) => setFilterOrigin(e.target.value)}
            className="text-sm border border-border rounded bg-card px-3 py-2 focus:outline-none focus:ring-2 focus:ring-ring hover:border-gray-400 transition-colors"
          >
            <option value="">Todas as origens</option>
            <option value="dc">Portador de DC</option>
            <option value="non-dc">Não portador de DC</option>
            <option value="system">Cadastro pelo sistema</option>
          </select>
          {(search || filterOrigin) && (
            <Button variant="ghost" size="sm" onClick={() => { setSearch(""); setFilterOrigin(""); }}>
              Limpar
            </Button>
          )}
        </div>
      </Card>

      {/* Results */}
      <Card>
        {isLoading ? (
          <div className="flex items-center justify-center py-16 gap-3 text-muted-foreground">
            <Spinner /> Carregando pacientes...
          </div>
        ) : filtered.length === 0 ? (
          <EmptyState
            icon="🔍"
            title={search ? "Nenhum paciente encontrado" : "Nenhum paciente cadastrado"}
            description={search ? `Não há resultados para "${search}". Verifique os dados ou cadastre um novo paciente.` : "Utilize o botão acima para cadastrar o primeiro paciente."}
            action={canEdit && search ? (
              <Button variant="primary" size="sm" icon={<IconPlus size={14} />} onClick={() => navigate("new-patient")}>
                Cadastrar novo paciente
              </Button>
            ) : undefined}
          />
        ) : (
          <>
            <Table headers={["Paciente", "Código", "Nascimento / Idade", "Origem", "Último atendimento", "Projetos", "Ações"]}>
              {filtered.map((p) => {
                const lastAppt = getLastAppointment(p.id);
                return (
                  <Tr key={p.id} onClick={() => navigate("patient-record", { patientId: p.id })}>
                    <Td>
                      <div>
                        <p className="font-medium text-foreground">{p.name}</p>
                        {p.importedFrom && (
                          <p className="text-xs text-muted-foreground mt-0.5 font-mono">{p.importedFrom}</p>
                        )}
                      </div>
                    </Td>
                    <Td mono>{p.code}</Td>
                    <Td>
                      <p>{formatDate(p.birthDate)}</p>
                      <p className="text-xs text-muted-foreground">{calcAge(p.birthDate)}</p>
                    </Td>
                    <Td><Badge variant={originVariant(p.origin)}>{originLabel(p.origin)}</Badge></Td>
                    <Td>
                      {lastAppt ? (
                        <div>
                          <p>{formatDate(lastAppt.date)}</p>
                          <Badge variant={lastAppt.status === "completo" ? "success" : "warning"} className="mt-0.5">
                            {lastAppt.status === "completo" ? "Completo" : "Pendente"}
                          </Badge>
                        </div>
                      ) : (
                        <span className="text-muted-foreground">—</span>
                      )}
                    </Td>
                    <Td>
                      <div className="flex flex-wrap gap-1">
                        {p.projects.slice(0, 2).map((proj) => (
                          <Badge key={proj} variant="neutral" className="text-[10px]">{proj}</Badge>
                        ))}
                        {p.projects.length > 2 && (
                          <Badge variant="neutral" className="text-[10px]">+{p.projects.length - 2}</Badge>
                        )}
                        {p.projects.length === 0 && <span className="text-xs text-muted-foreground">—</span>}
                      </div>
                    </Td>
                    <Td>
                      <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
                        <Button
                          variant="ghost"
                          size="sm"
                          icon={<IconEye size={14} />}
                          onClick={() => navigate("patient-record", { patientId: p.id })}
                        >
                          Ver ficha
                        </Button>
                        {canEdit && (
                          <Button
                            variant="ghost"
                            size="sm"
                            icon={<IconEdit size={14} />}
                            onClick={() => navigate("patient-record", { patientId: p.id })}
                          >
                            Editar
                          </Button>
                        )}
                      </div>
                    </Td>
                  </Tr>
                );
              })}
            </Table>
            <div className="px-4 py-3 border-t border-border flex items-center justify-between">
              <p className="text-xs text-muted-foreground">
                {filtered.length} de {patients.length} pacientes
              </p>
              <div className="flex items-center gap-2">
                <Button variant="outline" size="sm" disabled>← Anterior</Button>
                <span className="text-xs text-muted-foreground px-2">Página 1 de 1</span>
                <Button variant="outline" size="sm" disabled>Próxima →</Button>
              </div>
            </div>
          </>
        )}
      </Card>
    </div>
  );
}
