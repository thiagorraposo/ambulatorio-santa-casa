import React, { useState } from "react";
import { useApp } from "../context";
import type { Pendency } from "../types";
import {
  Card, Button, Badge, Table, Tr, Td, Modal, AlertBox, Breadcrumb,
  Select, formatDate,
} from "./ui";

export default function Pendencies() {
  const { pendencies, updatePendency, currentUser, navigate, showToast } = useApp();
  const [statusFilter, setStatusFilter] = useState("");
  const [originFilter, setOriginFilter] = useState("");
  const [selected, setSelected] = useState<Pendency | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [reviewNote, setReviewNote] = useState("");
  const [saving, setSaving] = useState(false);

  const canEdit = currentUser?.role === "edicao" || currentUser?.role === "administracao";

  const filtered = pendencies.filter((p) => {
    const matchStatus = !statusFilter || p.status === statusFilter;
    const matchOrigin = !originFilter || p.origin.toLowerCase().includes(originFilter.toLowerCase());
    return matchStatus && matchOrigin;
  });

  const statusVariant = (s: string) => {
    if (s === "resolvida") return "success";
    if (s === "em-revisao") return "info";
    return "warning";
  };
  const statusLabel = (s: string) => {
    if (s === "resolvida") return "Resolvida";
    if (s === "em-revisao") return "Em revisão";
    return "Pendente";
  };

  function openReview(p: Pendency) {
    setSelected(p);
    setReviewNote(p.observation || "");
    setModalOpen(true);
  }

  async function handleUpdate(newStatus: Pendency["status"]) {
    if (!selected) return;
    setSaving(true);
    await new Promise((r) => setTimeout(r, 600));
    updatePendency({
      ...selected,
      status: newStatus,
      observation: reviewNote || selected.observation,
      resolvedAt: newStatus === "resolvida" ? "2026-09-03" : selected.resolvedAt,
    });
    setSaving(false);
    setModalOpen(false);
    showToast("success", "Pendência atualizada com sucesso.");
  }

  const counts = { pendente: 0, "em-revisao": 0, resolvida: 0 };
  pendencies.forEach((p) => { counts[p.status]++; });

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <Breadcrumb items={[{ label: "Início", onClick: () => navigate("home") }, { label: "Pendências" }]} />

      <div className="flex items-start justify-between mt-4 mb-5">
        <div>
          <h1 className="text-xl font-semibold">Pendências</h1>
          <p className="text-sm text-muted-foreground mt-0.5">Registros que necessitam de revisão humana</p>
        </div>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-3 gap-3 mb-5">
        {[
          { label: "Pendentes", count: counts.pendente, variant: "warning" as const },
          { label: "Em revisão", count: counts["em-revisao"], variant: "info" as const },
          { label: "Resolvidas", count: counts.resolvida, variant: "success" as const },
        ].map(({ label, count, variant }) => (
          <Card key={label} className="flex items-center gap-3 px-4 py-3">
            <Badge variant={variant} className="text-base px-3 py-1">{count}</Badge>
            <span className="text-sm text-muted-foreground">{label}</span>
          </Card>
        ))}
      </div>

      {/* System message */}
      <AlertBox type="info">
        <strong>O sistema identifica a inconsistência; a decisão continua humana.</strong>{" "}
        Nenhuma correção é aplicada automaticamente.
      </AlertBox>

      <div className="mt-4" />

      {/* Filters */}
      <div className="flex gap-3 mb-4">
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="text-sm border border-border rounded bg-card px-3 py-2 focus:outline-none focus:ring-2 focus:ring-ring"
        >
          <option value="">Todos os status</option>
          <option value="pendente">Pendente</option>
          <option value="em-revisao">Em revisão</option>
          <option value="resolvida">Resolvida</option>
        </select>
        <input
          type="text"
          value={originFilter}
          onChange={(e) => setOriginFilter(e.target.value)}
          placeholder="Filtrar por origem..."
          className="text-sm border border-border rounded bg-card px-3 py-2 flex-1 focus:outline-none focus:ring-2 focus:ring-ring"
        />
        {(statusFilter || originFilter) && (
          <Button variant="ghost" size="sm" onClick={() => { setStatusFilter(""); setOriginFilter(""); }}>Limpar</Button>
        )}
      </div>

      <Card>
        {filtered.length === 0 ? (
          <div className="py-12 text-center text-sm text-muted-foreground">
            Nenhuma pendência encontrada com os filtros selecionados
          </div>
        ) : (
          <Table headers={["Tipo", "Paciente", "Origem", "Identificada em", "Status", "Ação"]}>
            {filtered.map((p) => (
              <Tr key={p.id}>
                <Td>
                  <p className="font-medium text-sm">{p.type}</p>
                  <p className="text-xs text-muted-foreground mt-0.5 max-w-xs truncate">{p.description}</p>
                </Td>
                <Td>{p.patientName || "—"}</Td>
                <Td>
                  <p className="text-sm">{p.origin}</p>
                </Td>
                <Td>{formatDate(p.identifiedAt)}</Td>
                <Td><Badge variant={statusVariant(p.status)}>{statusLabel(p.status)}</Badge></Td>
                <Td>
                  <Button variant="outline" size="sm" onClick={() => openReview(p)}>
                    Abrir revisão
                  </Button>
                </Td>
              </Tr>
            ))}
          </Table>
        )}
      </Card>

      {/* Review Modal */}
      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title="Revisão de pendência"
        size="lg"
      >
        {selected && (
          <div className="px-6 py-5 flex flex-col gap-5">
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <p className="text-xs text-muted-foreground">Tipo</p>
                <p className="font-medium mt-0.5">{selected.type}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Status</p>
                <div className="mt-0.5"><Badge variant={statusVariant(selected.status)}>{statusLabel(selected.status)}</Badge></div>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Paciente</p>
                <p className="mt-0.5">{selected.patientName || "—"}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Origem</p>
                <p className="mt-0.5">{selected.origin}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Identificada em</p>
                <p className="mt-0.5">{formatDate(selected.identifiedAt)}</p>
              </div>
              {selected.responsible && (
                <div>
                  <p className="text-xs text-muted-foreground">Responsável</p>
                  <p className="mt-0.5">{selected.responsible}</p>
                </div>
              )}
            </div>

            <div>
              <p className="text-xs text-muted-foreground mb-1">Descrição</p>
              <p className="text-sm text-foreground bg-muted/40 rounded px-3 py-2">{selected.description}</p>
            </div>

            {selected.status === "pendente" && selected.type.includes("importado") && (
              <AlertBox type="warning">
                Informação histórica preservada — o sistema detectou inconsistência ou valor sem interpretação clínica validada.{" "}
                <strong>A decisão sobre como tratar este dado é responsabilidade da equipe clínica.</strong>
              </AlertBox>
            )}

            {selected.type.includes("Conflito") && (
              <AlertBox type="warning">
                Conflito de identidade identificado. O sistema NÃO realiza fusão automática de registros.
                A decisão deve ser tomada por um responsável após verificação dos dados.
              </AlertBox>
            )}

            {selected.observation && (
              <div>
                <p className="text-xs text-muted-foreground mb-1">Observação anterior</p>
                <p className="text-sm text-foreground bg-muted/40 rounded px-3 py-2">{selected.observation}</p>
              </div>
            )}

            {canEdit && selected.status !== "resolvida" && (
              <div className="flex flex-col gap-2">
                <label className="text-sm font-medium">Observação de revisão</label>
                <textarea
                  value={reviewNote}
                  onChange={(e) => setReviewNote(e.target.value)}
                  className="w-full px-3 py-2 text-sm border border-border rounded focus:outline-none focus:ring-2 focus:ring-ring min-h-[80px]"
                  placeholder="Registre a decisão ou encaminhamento para esta pendência..."
                />
              </div>
            )}

            {!canEdit && (
              <AlertBox type="info">Seu perfil permite apenas visualizar pendências. Alterações requerem perfil de Edição ou Administração.</AlertBox>
            )}

            {canEdit && selected.status !== "resolvida" && (
              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setModalOpen(false)}>Fechar</Button>
                {selected.status === "pendente" && (
                  <Button variant="secondary" loading={saving} onClick={() => handleUpdate("em-revisao")}>
                    Marcar em revisão
                  </Button>
                )}
                <Button variant="primary" loading={saving} onClick={() => handleUpdate("resolvida")}>
                  Marcar como resolvida
                </Button>
              </div>
            )}

            {(selected.status === "resolvida" || !canEdit) && (
              <div className="flex justify-end">
                <Button variant="outline" onClick={() => setModalOpen(false)}>Fechar</Button>
              </div>
            )}
          </div>
        )}
      </Modal>
    </div>
  );
}
