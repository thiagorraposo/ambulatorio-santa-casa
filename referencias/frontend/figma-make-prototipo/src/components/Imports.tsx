import React, { useState } from "react";
import { useApp } from "../context";
import type { ImportBatch, ImportLine } from "../types";
import {
  Card, Button, Badge, Table, Tr, Td, AlertBox, Breadcrumb, Modal, Spinner,
  formatDate, IconUpload, IconRefresh, IconEye, IconPlus,
} from "./ui";

type ImportStep = "list" | "new" | "validating" | "report" | "confirmed";

export default function Imports() {
  const { importBatches, addImportBatch, currentUser, navigate, showToast, nav } = useApp();
  const [step, setStep] = useState<ImportStep>("list");
  const [detailBatch, setDetailBatch] = useState<ImportBatch | null>(null);
  const [conflictLine, setConflictLine] = useState<ImportLine | null>(null);
  const [fileName, setFileName] = useState("");
  const [validationLog, setValidationLog] = useState<string[]>([]);
  const [currentLog, setCurrentLog] = useState(0);
  const [reprocessTarget, setReprocessTarget] = useState<ImportBatch | null>(null);
  const [reprocessModal, setReprocessModal] = useState(false);

  const isAdmin = currentUser?.role === "administracao";

  // Check if we should jump to detail from nav
  React.useEffect(() => {
    if (nav.importId) {
      const b = importBatches.find((b) => b.id === nav.importId);
      if (b) setDetailBatch(b);
    }
  }, [nav.importId]);

  const statusVariant = (s: string) => {
    if (s === "concluido") return "success";
    if (s === "parcial") return "warning";
    if (s === "rejeitado") return "error";
    return "info";
  };
  const statusLabel = (s: string) => {
    if (s === "concluido") return "Concluído";
    if (s === "parcial") return "Parcial";
    if (s === "rejeitado") return "Rejeitado";
    return "Em andamento";
  };

  const lineStatusVariant = (s: string) => {
    if (s === "importada") return "success";
    if (s === "importada-pendencia") return "warning";
    if (s === "rejeitada") return "error";
    return "info";
  };
  const lineStatusLabel = (s: string) => {
    if (s === "importada") return "Importada";
    if (s === "importada-pendencia") return "Com pendência";
    if (s === "rejeitada") return "Rejeitada";
    return "Conflito";
  };

  async function startValidation() {
    setStep("validating");
    const logs = [
      "Validando arquivo...",
      "Validando abas disponíveis...",
      "Analisando cabeçalhos...",
      "Conciliando pacientes...",
      "Validando registros linha a linha...",
      "Gerando relatório de qualidade...",
    ];
    for (let i = 0; i < logs.length; i++) {
      await new Promise((r) => setTimeout(r, 600));
      setCurrentLog(i);
      setValidationLog((l) => [...l, logs[i]]);
    }
    await new Promise((r) => setTimeout(r, 400));
    setStep("report");
  }

  async function confirmImport() {
    const newBatch: ImportBatch = {
      id: `imp-new-${Date.now()}`,
      lotCode: `IMP-SINT-2026-${String(importBatches.length + 1).padStart(3, "0")}`,
      fileName: fileName || "arquivo-sintético.xlsx",
      hash: `sha256:${Math.random().toString(36).substring(2, 14)}...`,
      date: "2026-09-03",
      status: "concluido",
      totalLines: 502,
      imported: 491,
      withPendency: 7,
      rejected: 4,
      conflicts: 2,
      layoutVersion: "v2.5",
      manifestVersion: "v1.3",
      importerVersion: "v0.9.0",
      systemRevision: "r51",
      lines: [
        { line: 1, tab: "Pacientes portadores de DC", status: "importada", reconciledPatient: "PAC-SINT-NOVO-001" },
        { line: 127, tab: "Pacientes não portadores de DC", status: "conflito", reason: "Dois pacientes possíveis" },
        { line: 203, tab: "Pacientes portadores de DC", status: "rejeitada", reason: "Data de nascimento inválida" },
        { line: 280, tab: "Pacientes não portadores de DC", status: "importada-pendencia", reason: "Autorrelato sem interpretação validada" },
      ],
    };
    addImportBatch(newBatch);
    setStep("confirmed");
    showToast("success", `Importação ${newBatch.lotCode} concluída com sucesso.`);
  }

  async function createReprocess() {
    if (!reprocessTarget) return;
    const newBatch: ImportBatch = {
      id: `imp-reproc-${Date.now()}`,
      lotCode: `IMP-SINT-REPR-${Date.now().toString().slice(-3)}`,
      fileName: reprocessTarget.fileName,
      hash: `sha256:${Math.random().toString(36).substring(2, 14)}...`,
      date: "2026-09-03",
      status: "concluido",
      totalLines: reprocessTarget.totalLines,
      imported: reprocessTarget.imported + 2,
      withPendency: Math.max(0, reprocessTarget.withPendency - 1),
      rejected: Math.max(0, reprocessTarget.rejected - 1),
      conflicts: reprocessTarget.conflicts,
      layoutVersion: reprocessTarget.layoutVersion,
      manifestVersion: reprocessTarget.manifestVersion,
      importerVersion: "v0.9.1",
      systemRevision: "r52",
      parentBatchId: reprocessTarget.id,
      lines: reprocessTarget.lines,
    };
    addImportBatch(newBatch);
    setReprocessModal(false);
    setDetailBatch(newBatch);
    showToast("success", `Reprocessamento ${newBatch.lotCode} criado com sucesso.`);
  }

  // Detail view
  if (detailBatch) {
    const parent = detailBatch.parentBatchId ? importBatches.find((b) => b.id === detailBatch.parentBatchId) : null;
    const children = importBatches.filter((b) => b.parentBatchId === detailBatch.id);

    return (
      <div className="p-6 max-w-7xl mx-auto">
        <Breadcrumb items={[
          { label: "Início", onClick: () => navigate("home") },
          { label: "Importações", onClick: () => setDetailBatch(null) },
          { label: detailBatch.lotCode },
        ]} />

        <div className="flex items-center justify-between mt-4 mb-5">
          <div>
            <h1 className="text-xl font-semibold">{detailBatch.lotCode}</h1>
            <p className="text-sm text-muted-foreground mt-0.5">{detailBatch.fileName}</p>
          </div>
          <div className="flex gap-2">
            {isAdmin && (
              <Button variant="outline" size="sm" icon={<IconRefresh size={14} />} onClick={() => { setReprocessTarget(detailBatch); setReprocessModal(true); }}>
                Criar reprocessamento
              </Button>
            )}
            <Button variant="secondary" size="sm" onClick={() => setDetailBatch(null)}>← Voltar</Button>
          </div>
        </div>

        {/* Metadata */}
        <Card className="mb-4">
          <div className="px-5 py-3.5 border-b border-border">
            <h3 className="text-sm font-semibold uppercase tracking-wide">Metadados do lote</h3>
          </div>
          <div className="grid grid-cols-4 gap-x-8 gap-y-3 px-5 py-4 text-sm">
            {[
              ["ID do lote", <span className="font-mono text-xs">{detailBatch.lotCode}</span>],
              ["Arquivo", detailBatch.fileName],
              ["Hash", <span className="font-mono text-xs">{detailBatch.hash}</span>],
              ["Data", formatDate(detailBatch.date)],
              ["Status", <Badge variant={statusVariant(detailBatch.status)}>{statusLabel(detailBatch.status)}</Badge>],
              ["Versão do layout", detailBatch.layoutVersion],
              ["Versão do manifesto", detailBatch.manifestVersion],
              ["Versão do importador", detailBatch.importerVersion],
              ["Revisão do sistema", detailBatch.systemRevision],
              ["Total de linhas", detailBatch.totalLines],
              ["Importadas", detailBatch.imported],
              ["Com pendência", detailBatch.withPendency],
              ["Rejeitadas", detailBatch.rejected],
              ["Conflitos", detailBatch.conflicts],
            ].map(([l, v]) => (
              <div key={String(l)}>
                <p className="text-xs text-muted-foreground">{l}</p>
                <p className="mt-0.5">{v}</p>
              </div>
            ))}
          </div>
        </Card>

        {/* Parent/child chain */}
        {(parent || children.length > 0) && (
          <Card className="mb-4">
            <div className="px-5 py-3.5 border-b border-border">
              <h3 className="text-sm font-semibold uppercase tracking-wide">Histórico de reprocessamento</h3>
            </div>
            <div className="px-5 py-4">
              <div className="flex flex-col gap-2">
                {parent && (
                  <div className="flex items-center gap-2">
                    <button onClick={() => setDetailBatch(parent)} className="text-sm text-primary hover:underline font-mono">{parent.lotCode}</button>
                    <span className="text-muted-foreground text-xs">(origem)</span>
                  </div>
                )}
                <div className="flex items-center gap-2 font-medium">
                  <span className="text-sm font-mono">{detailBatch.lotCode}</span>
                  <Badge variant={statusVariant(detailBatch.status)}>{statusLabel(detailBatch.status)}</Badge>
                  <span className="text-xs text-muted-foreground">(atual)</span>
                </div>
                {children.map((c) => (
                  <div key={c.id} className="flex items-center gap-2 pl-4">
                    <span className="text-muted-foreground text-xs">↳</span>
                    <button onClick={() => setDetailBatch(c)} className="text-sm text-primary hover:underline font-mono">{c.lotCode}</button>
                    <Badge variant={statusVariant(c.status)}>{statusLabel(c.status)}</Badge>
                  </div>
                ))}
              </div>
            </div>
          </Card>
        )}

        {/* Lines */}
        <Card>
          <div className="px-5 py-3.5 border-b border-border">
            <h3 className="text-sm font-semibold uppercase tracking-wide">Linhas do lote</h3>
          </div>
          {detailBatch.lines.length > 0 ? (
            <Table headers={["Linha", "Aba", "Status", "Motivo", "Paciente conciliado", "Ação"]}>
              {detailBatch.lines.map((l) => (
                <Tr key={l.line}>
                  <Td mono>{l.line}</Td>
                  <Td>{l.tab}</Td>
                  <Td><Badge variant={lineStatusVariant(l.status)}>{lineStatusLabel(l.status)}</Badge></Td>
                  <Td>
                    <p className="text-sm text-foreground">{l.reason || "—"}</p>
                  </Td>
                  <Td mono>{l.reconciledPatient || "—"}</Td>
                  <Td>
                    {l.status === "conflito" && (
                      <Button variant="outline" size="sm" onClick={() => setConflictLine(l)}>Ver conflito</Button>
                    )}
                  </Td>
                </Tr>
              ))}
            </Table>
          ) : (
            <div className="py-8 text-center text-sm text-muted-foreground">Detalhes de linhas não disponíveis</div>
          )}
          <div className="px-5 py-3 border-t border-border">
            <p className="text-xs text-muted-foreground">
              Conteúdo original de cada linha armazenado em área restrita. Apenas metadados são exibidos.
            </p>
          </div>
        </Card>

        {/* Conflict modal */}
        <Modal open={!!conflictLine} onClose={() => setConflictLine(null)} title="Conflito de identidade" size="md">
          {conflictLine && (
            <div className="px-6 py-5 flex flex-col gap-4">
              <AlertBox type="warning">
                <strong>Linha {conflictLine.line}</strong> — Possível correspondência com dois pacientes distintos.
                O sistema não realiza fusão automática. A decisão deve ser tomada manualmente.
              </AlertBox>
              <p className="text-sm font-medium">Dados disponíveis para comparação:</p>
              <div className="grid grid-cols-2 gap-3">
                <Card className="p-4">
                  <p className="text-xs text-muted-foreground mb-2">Paciente A</p>
                  <p className="text-sm font-medium">Paciente Sintético 008</p>
                  <p className="text-xs text-muted-foreground mt-1">Nasc.: 03/12/1961 · PAC-SINT-0008</p>
                  <Button variant="outline" size="sm" className="mt-3 w-full" onClick={() => navigate("patient-record", { patientId: "p8" })}>
                    Abrir paciente A
                  </Button>
                </Card>
                <Card className="p-4">
                  <p className="text-xs text-muted-foreground mb-2">Paciente B</p>
                  <p className="text-sm font-medium">Paciente Sintética 008-B</p>
                  <p className="text-xs text-muted-foreground mt-1">Nasc.: 03/12/1962 · PAC-SINT-0008B</p>
                  <Button variant="outline" size="sm" className="mt-3 w-full" disabled>
                    Abrir paciente B
                  </Button>
                </Card>
              </div>
              <div className="flex justify-end gap-2">
                <Button variant="secondary" onClick={() => setConflictLine(null)}>Manter conflito para revisão</Button>
              </div>
            </div>
          )}
        </Modal>

        {/* Reprocess modal */}
        <Modal open={reprocessModal} onClose={() => setReprocessModal(false)} title="Criar reprocessamento" size="sm">
          <div className="px-6 py-5 flex flex-col gap-4">
            <AlertBox type="info">
              O reprocessamento cria uma nova execução relacionada ao lote anterior.
              O lote original não é substituído e continua acessível no histórico.
            </AlertBox>
            <div className="text-sm flex flex-col gap-1">
              <p className="text-muted-foreground">Lote de origem:</p>
              <p className="font-mono font-medium">{reprocessTarget?.lotCode}</p>
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setReprocessModal(false)}>Cancelar</Button>
              <Button variant="primary" onClick={createReprocess}>Confirmar reprocessamento</Button>
            </div>
          </div>
        </Modal>
      </div>
    );
  }

  // New import flow
  if (step !== "list") {
    return (
      <div className="p-6 max-w-3xl mx-auto">
        <Breadcrumb items={[
          { label: "Início", onClick: () => navigate("home") },
          { label: "Importações", onClick: () => setStep("list") },
          { label: "Nova importação" },
        ]} />

        <h1 className="text-xl font-semibold mt-4 mb-5">Nova importação</h1>

        {/* Step indicator */}
        <div className="flex items-center gap-0 mb-6 overflow-x-auto">
          {["Selecionar arquivo", "Validar estrutura", "Simulação", "Relatório", "Confirmação", "Resultado"].map((s, i) => {
            const stepIdx = ["", "new", "validating", "report", "", "confirmed"].indexOf(step);
            const isDone = i < stepIdx;
            const isActive = i === stepIdx;
            return (
              <React.Fragment key={s}>
                <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded text-xs whitespace-nowrap ${isActive ? "bg-primary/10 text-primary font-medium" : isDone ? "text-green-700" : "text-muted-foreground"}`}>
                  {isDone ? "✓" : `${i + 1}.`} {s}
                </div>
                {i < 5 && <span className="text-border mx-1">›</span>}
              </React.Fragment>
            );
          })}
        </div>

        {/* Step: Select file */}
        {step === "new" && (
          <Card>
            <div className="px-5 py-3.5 border-b border-border">
              <h3 className="text-sm font-semibold">1. Selecionar arquivo</h3>
            </div>
            <div className="px-5 py-6 flex flex-col gap-5">
              <AlertBox type="info">
                O MVP processa apenas as abas: <strong>Pacientes portadores de DC</strong> e <strong>Pacientes não portadores de DC</strong>.
                As abas <em>P Digitar</em> e <em>AIM3</em> estão fora do escopo deste ciclo.
              </AlertBox>
              <div
                className="border-2 border-dashed border-border rounded-xl px-6 py-10 text-center cursor-pointer hover:border-primary/50 hover:bg-accent/30 transition-colors"
                onClick={() => setFileName("ambulatorio_historico_sintetico.xlsx")}
              >
                <div className="text-4xl mb-3">📊</div>
                {fileName ? (
                  <div>
                    <p className="text-sm font-medium text-green-700">✓ {fileName}</p>
                    <p className="text-xs text-muted-foreground mt-1">Clique para trocar o arquivo</p>
                  </div>
                ) : (
                  <div>
                    <p className="text-sm font-medium text-foreground">Clique para selecionar o arquivo</p>
                    <p className="text-xs text-muted-foreground mt-1">Formato aceito: .xlsx</p>
                  </div>
                )}
              </div>
              <div className="flex gap-2 justify-end">
                <Button variant="ghost" onClick={() => setStep("list")}>Cancelar</Button>
                <Button variant="primary" disabled={!fileName} onClick={startValidation} icon={<IconUpload size={14} />}>
                  Validar e simular
                </Button>
              </div>
            </div>
          </Card>
        )}

        {/* Step: Validating */}
        {step === "validating" && (
          <Card>
            <div className="px-5 py-3.5 border-b border-border">
              <h3 className="text-sm font-semibold">2–3. Validando e simulando importação...</h3>
            </div>
            <div className="px-5 py-6 flex flex-col gap-4">
              <div className="flex items-center gap-3 text-muted-foreground">
                <Spinner size="md" />
                <span className="text-sm">Processando arquivo sintético...</span>
              </div>
              <div className="bg-muted/40 rounded px-4 py-3 font-mono text-xs flex flex-col gap-1.5">
                {validationLog.map((l, i) => (
                  <div key={i} className="flex items-center gap-2 text-green-700">
                    <span>✓</span> {l}
                  </div>
                ))}
                {validationLog.length < 6 && (
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <Spinner size="sm" />
                    <span>...</span>
                  </div>
                )}
              </div>
              <AlertBox type="info">
                <strong>Nenhuma alteração está sendo persistida durante esta simulação.</strong>{" "}
                O dry-run analisa a estrutura do arquivo sem gravar dados no sistema.
              </AlertBox>
            </div>
          </Card>
        )}

        {/* Step: Report */}
        {step === "report" && (
          <Card>
            <div className="px-5 py-3.5 border-b border-border">
              <h3 className="text-sm font-semibold">4. Relatório de qualidade</h3>
            </div>
            <div className="px-5 py-5 flex flex-col gap-5">
              <AlertBox type="info">
                <strong>Nenhuma alteração foi persistida durante esta simulação.</strong>
              </AlertBox>

              <div className="grid grid-cols-3 gap-3">
                {[
                  { label: "Total de linhas", value: 502, color: "text-foreground" },
                  { label: "Importáveis", value: 491, color: "text-green-700" },
                  { label: "Com pendência", value: 7, color: "text-amber-700" },
                  { label: "Rejeitadas", value: 4, color: "text-red-700" },
                  { label: "Conflitos de identidade", value: 2, color: "text-amber-700" },
                  { label: "Valores inválidos", value: 3, color: "text-red-700" },
                ].map(({ label, value, color }) => (
                  <Card key={label} className="p-3 text-center">
                    <p className={`text-2xl font-semibold ${color}`}>{value}</p>
                    <p className="text-xs text-muted-foreground mt-1">{label}</p>
                  </Card>
                ))}
              </div>

              <div className="bg-muted/40 rounded px-4 py-3 font-mono text-xs flex flex-col gap-1">
                <div className="text-green-700">✓ Abas identificadas: Pacientes portadores de DC, Pacientes não portadores de DC</div>
                <div className="text-amber-700">⚑ Abas ignoradas: P Digitar (fora do escopo do MVP)</div>
                <div className="text-amber-700">⚑ 7 linhas com campos de semântica ainda não validada (preservadas)</div>
                <div className="text-red-700">✗ 2 conflitos de identidade identificados — necessitam decisão humana</div>
                <div className="text-red-700">✗ 4 linhas rejeitadas — dados inválidos ou incompletos</div>
              </div>

              <div className="flex gap-2 justify-end">
                <Button variant="ghost" onClick={() => setStep("new")}>← Voltar</Button>
                {isAdmin ? (
                  <Button variant="primary" onClick={confirmImport}>Confirmar importação</Button>
                ) : (
                  <div>
                    <Button variant="primary" disabled>Confirmar importação</Button>
                    <p className="text-xs text-muted-foreground mt-1 text-center">Seu perfil não permite confirmar importações</p>
                  </div>
                )}
              </div>
            </div>
          </Card>
        )}

        {/* Step: Confirmed */}
        {step === "confirmed" && (
          <Card>
            <div className="px-5 py-8 flex flex-col items-center gap-4 text-center">
              <div className="w-14 h-14 rounded-full bg-green-100 flex items-center justify-center text-2xl">✓</div>
              <h2 className="text-lg font-semibold text-green-700">Importação concluída com sucesso</h2>
              <p className="text-sm text-muted-foreground max-w-sm">
                O lote foi importado e os registros estão disponíveis no sistema.
                Pendências identificadas foram encaminhadas para revisão.
              </p>
              <div className="flex gap-2 mt-2">
                <Button variant="primary" onClick={() => setStep("list")}>Ver histórico de importações</Button>
              </div>
            </div>
          </Card>
        )}
      </div>
    );
  }

  // List
  return (
    <div className="p-6 max-w-7xl mx-auto">
      <Breadcrumb items={[{ label: "Início", onClick: () => navigate("home") }, { label: "Importações" }]} />

      <div className="flex items-start justify-between mt-4 mb-5">
        <div>
          <h1 className="text-xl font-semibold">Importações</h1>
          <p className="text-sm text-muted-foreground mt-0.5">Histórico de lotes importados da planilha histórica</p>
        </div>
        {isAdmin && (
          <Button variant="primary" size="sm" icon={<IconUpload size={14} />} onClick={() => { setStep("new"); setFileName(""); setValidationLog([]); setCurrentLog(0); }}>
            Nova importação
          </Button>
        )}
      </div>

      <AlertBox type="info">
        A importação é uma ponte para trazer o histórico da planilha. Não é a interface diária de cadastro.
        Somente usuários com perfil de Administração podem confirmar novas importações.
      </AlertBox>

      <div className="mt-4" />

      <Card>
        <Table headers={["Lote", "Arquivo", "Data", "Status", "Linhas", "Importadas", "Pendências", "Rejeitadas", "Ação"]}>
          {[...importBatches].sort((a, b) => b.date.localeCompare(a.date)).map((b) => (
            <Tr key={b.id}>
              <Td mono className="font-medium">{b.lotCode}</Td>
              <Td>
                <p className="text-sm max-w-[180px] truncate">{b.fileName}</p>
                {b.parentBatchId && <p className="text-xs text-muted-foreground">Reprocessamento</p>}
              </Td>
              <Td>{formatDate(b.date)}</Td>
              <Td><Badge variant={statusVariant(b.status)}>{statusLabel(b.status)}</Badge></Td>
              <Td>{b.totalLines}</Td>
              <Td className="text-green-700 font-medium">{b.imported}</Td>
              <Td className="text-amber-700">{b.withPendency}</Td>
              <Td className="text-red-700">{b.rejected}</Td>
              <Td>
                <Button variant="outline" size="sm" icon={<IconEye size={13} />} onClick={() => setDetailBatch(b)}>
                  Detalhes
                </Button>
              </Td>
            </Tr>
          ))}
        </Table>
      </Card>
    </div>
  );
}
