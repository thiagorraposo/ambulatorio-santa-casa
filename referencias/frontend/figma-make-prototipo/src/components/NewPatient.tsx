import React, { useState } from "react";
import { useApp } from "../context";
import type { Patient } from "../types";
import {
  Card, Button, Input, Select, RadioGroup, Checkbox, AlertBox, Breadcrumb,
  Badge, formatDate, calcAge, originVariant, originLabel,
  IconSearch, IconPlus, IconUser,
} from "./ui";

type Step = "check" | "results" | "form";

export default function NewPatient() {
  const { patients, addPatient, navigate, showToast } = useApp();
  const [step, setStep] = useState<Step>("check");

  // Dedup check state
  const [checkName, setCheckName] = useState("");
  const [checkBirth, setCheckBirth] = useState("");
  const [checkResults, setCheckResults] = useState<Patient[]>([]);
  const [checked, setChecked] = useState(false);

  // Form state
  const [form, setForm] = useState({
    name: "", birthDate: "", sex: "", race: "", phone: "", address: "", city: "",
    origin: "system" as Patient["origin"],
    communityBelongs: "nao" as "sim" | "nao" | "nao-informado",
    communityType: "" as "indigena" | "quilombola" | "",
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);

  function doCheck() {
    if (!checkName.trim() && !checkBirth.trim()) return;
    const q = checkName.toLowerCase().trim();
    const results = patients.filter((p) => {
      const matchName = q && p.name.toLowerCase().includes(q);
      const matchBirth = checkBirth && p.birthDate === checkBirth;
      return matchName || matchBirth;
    });
    setCheckResults(results);
    setChecked(true);
    setStep("results");
  }

  function proceedToForm() {
    setForm((f) => ({ ...f, name: checkName, birthDate: checkBirth }));
    setStep("form");
  }

  function validate() {
    const e: Record<string, string> = {};
    if (!form.name.trim()) e.name = "Nome é obrigatório";
    if (!form.birthDate) e.birthDate = "Data de nascimento é obrigatória";
    if (!form.sex) e.sex = "Sexo é obrigatório";
    return e;
  }

  async function handleSave() {
    const e = validate();
    if (Object.keys(e).length > 0) { setErrors(e); return; }
    setSaving(true);
    await new Promise((r) => setTimeout(r, 800));

    const newPatient: Patient = {
      id: `p-new-${Date.now()}`,
      code: `PAC-SINT-${String(patients.length + 1).padStart(4, "0")}`,
      name: form.name.trim(),
      birthDate: form.birthDate,
      sex: form.sex,
      race: form.race || "Não informado",
      phone: form.phone || undefined,
      address: form.address || undefined,
      city: form.city || undefined,
      origin: form.origin,
      projects: [],
      community: form.communityBelongs === "sim"
        ? { belongs: true, type: form.communityType as "indigena" | "quilombola" || undefined }
        : form.communityBelongs === "nao"
        ? { belongs: false }
        : undefined,
      createdAt: "2026-09-03",
    };

    addPatient(newPatient);
    setSaving(false);
    showToast("success", "Paciente cadastrado com sucesso.");
    navigate("patient-record", { patientId: newPatient.id });
  }

  function setField(key: string, value: string) {
    setForm((f) => ({ ...f, [key]: value }));
    setErrors((e) => { const ne = { ...e }; delete ne[key]; return ne; });
  }

  return (
    <div className="p-6 max-w-3xl mx-auto">
      <Breadcrumb items={[
        { label: "Início", onClick: () => navigate("home") },
        { label: "Pacientes", onClick: () => navigate("patients") },
        { label: "Novo paciente" },
      ]} />

      <h1 className="text-xl font-semibold mt-4 mb-5">Novo paciente</h1>

      {/* Step 1: Check */}
      {step === "check" && (
        <Card>
          <div className="px-6 py-5 border-b border-border">
            <h2 className="text-base font-semibold">Verificar se o paciente já existe</h2>
            <p className="text-sm text-muted-foreground mt-1">
              Antes de criar um novo cadastro, verifique se o paciente já está registrado no sistema.
              Isso evita duplicidades.
            </p>
          </div>
          <div className="px-6 py-5 flex flex-col gap-4">
            <AlertBox type="info">
              A busca deve ser realizada antes do cadastro para reduzir a ocorrência de registros duplicados.
            </AlertBox>
            <div className="grid grid-cols-2 gap-4">
              <Input
                label="Nome do paciente"
                value={checkName}
                onChange={(e) => setCheckName(e.target.value)}
                placeholder="Nome completo ou parcial"
                onKeyDown={(e) => e.key === "Enter" && doCheck()}
              />
              <Input
                label="Data de nascimento"
                type="date"
                value={checkBirth}
                onChange={(e) => setCheckBirth(e.target.value)}
              />
            </div>
            <div className="flex gap-2">
              <Button variant="primary" icon={<IconSearch size={14} />} onClick={doCheck} disabled={!checkName && !checkBirth}>
                Buscar
              </Button>
              <Button variant="ghost" onClick={() => navigate("patients")}>Cancelar</Button>
            </div>
          </div>
        </Card>
      )}

      {/* Step 2: Results */}
      {step === "results" && (
        <div className="flex flex-col gap-4">
          <Card>
            <div className="px-6 py-5 border-b border-border">
              <h2 className="text-base font-semibold">Possíveis correspondências encontradas</h2>
              <p className="text-sm text-muted-foreground mt-1">
                {checkResults.length > 0
                  ? `${checkResults.length} paciente(s) encontrado(s). Verifique se o paciente que deseja cadastrar já consta na lista.`
                  : "Nenhum paciente encontrado para os dados informados."}
              </p>
            </div>

            {checkResults.length > 0 ? (
              <div className="divide-y divide-border/60">
                {checkResults.map((p) => (
                  <div key={p.id} className="px-6 py-4 flex items-start justify-between gap-4">
                    <div className="flex items-start gap-3">
                      <div className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center text-sm font-medium text-primary flex-shrink-0">
                        {p.name[0]}
                      </div>
                      <div>
                        <p className="text-sm font-medium text-foreground">{p.name}</p>
                        <p className="text-xs text-muted-foreground mt-0.5">
                          {formatDate(p.birthDate)} · {calcAge(p.birthDate)} · {p.code}
                        </p>
                        <div className="flex items-center gap-2 mt-1">
                          <Badge variant={originVariant(p.origin)}>{originLabel(p.origin)}</Badge>
                        </div>
                      </div>
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => navigate("patient-record", { patientId: p.id })}
                    >
                      Abrir paciente
                    </Button>
                  </div>
                ))}
              </div>
            ) : (
              <div className="px-6 py-8 text-center">
                <div className="text-4xl mb-3">🔍</div>
                <p className="text-sm text-muted-foreground">Nenhum paciente encontrado para os dados informados</p>
              </div>
            )}

            <div className="px-6 py-4 border-t border-border bg-muted/30">
              <div className="flex items-center justify-between">
                <p className="text-sm text-muted-foreground">
                  Nenhum destes é o paciente que deseja cadastrar?
                </p>
                <div className="flex gap-2">
                  <Button variant="ghost" size="sm" onClick={() => setStep("check")}>← Voltar</Button>
                  <Button variant="primary" size="sm" icon={<IconPlus size={14} />} onClick={proceedToForm}>
                    Nenhum destes — cadastrar novo
                  </Button>
                </div>
              </div>
              {checkResults.length > 0 && (
                <p className="text-xs text-amber-700 mt-2">
                  ⚑ Se houver possível duplicidade, a decisão de mesclar registros deve ser feita por um responsável. O sistema não realiza fusão automática.
                </p>
              )}
            </div>
          </Card>
        </div>
      )}

      {/* Step 3: Form */}
      {step === "form" && (
        <div className="flex flex-col gap-4">
          <AlertBox type="info">
            Nenhum paciente correspondente encontrado. Preencha os dados abaixo para criar um novo cadastro.
          </AlertBox>

          {/* Identificação */}
          <Card>
            <div className="px-5 py-3.5 border-b border-border">
              <h3 className="text-sm font-semibold uppercase tracking-wide">Identificação</h3>
            </div>
            <div className="px-5 py-4 grid grid-cols-2 gap-4">
              <div className="col-span-2">
                <Input
                  label="Nome completo"
                  required
                  value={form.name}
                  onChange={(e) => setField("name", e.target.value)}
                  error={errors.name}
                  placeholder="Nome do paciente"
                />
              </div>
              <Input
                label="Data de nascimento"
                type="date"
                required
                value={form.birthDate}
                onChange={(e) => setField("birthDate", e.target.value)}
                error={errors.birthDate}
              />
              <div className="flex items-end gap-2">
                {form.birthDate && (
                  <div className="flex-1 flex flex-col gap-1.5">
                    <label className="text-sm font-medium text-muted-foreground">Idade (calculada)</label>
                    <div className="h-9 flex items-center px-3 text-sm text-muted-foreground bg-muted border border-border rounded">
                      {calcAge(form.birthDate)} — apenas informativo
                    </div>
                  </div>
                )}
              </div>
              <Select
                label="Sexo"
                required
                value={form.sex}
                onChange={(e) => setField("sex", e.target.value)}
                error={errors.sex}
                options={[
                  { value: "M", label: "Masculino" },
                  { value: "F", label: "Feminino" },
                  { value: "Outro", label: "Outro" },
                  { value: "Não informado", label: "Não informado" },
                ]}
                placeholder="Selecione..."
              />
              <Select
                label="Raça/cor"
                value={form.race}
                onChange={(e) => setField("race", e.target.value)}
                options={[
                  { value: "Branca", label: "Branca" },
                  { value: "Preta", label: "Preta" },
                  { value: "Parda", label: "Parda" },
                  { value: "Amarela", label: "Amarela" },
                  { value: "Indígena", label: "Indígena" },
                  { value: "Não informado", label: "Não informado" },
                ]}
                placeholder="Selecione..."
              />
            </div>
          </Card>

          {/* Comunidade */}
          <Card>
            <div className="px-5 py-3.5 border-b border-border">
              <h3 className="text-sm font-semibold uppercase tracking-wide">Comunidade tradicional</h3>
            </div>
            <div className="px-5 py-4 flex flex-col gap-4">
              <RadioGroup
                label="Pertence a comunidade tradicional?"
                value={form.communityBelongs}
                onChange={(v) => setField("communityBelongs", v)}
                options={[
                  { value: "sim", label: "Sim" },
                  { value: "nao", label: "Não" },
                  { value: "nao-informado", label: "Não informado" },
                ]}
              />
              {form.communityBelongs === "sim" && (
                <RadioGroup
                  label="Tipo de comunidade"
                  value={form.communityType}
                  onChange={(v) => setField("communityType", v)}
                  options={[
                    { value: "indigena", label: "Indígena" },
                    { value: "quilombola", label: "Quilombola" },
                  ]}
                />
              )}
            </div>
          </Card>

          {/* Contato */}
          <Card>
            <div className="px-5 py-3.5 border-b border-border">
              <h3 className="text-sm font-semibold uppercase tracking-wide">Contato e endereço</h3>
            </div>
            <div className="px-5 py-4 grid grid-cols-2 gap-4">
              <div className="col-span-2">
                <Input label="Telefone" value={form.phone} onChange={(e) => setField("phone", e.target.value)} placeholder="(XX) X XXXX-XXXX" />
              </div>
              <div className="col-span-2">
                <Input label="Endereço" value={form.address} onChange={(e) => setField("address", e.target.value)} placeholder="Rua, número, complemento" />
              </div>
              <Input label="Cidade" value={form.city} onChange={(e) => setField("city", e.target.value)} placeholder="Cidade" />
            </div>
          </Card>

          {/* Origem */}
          <Card>
            <div className="px-5 py-3.5 border-b border-border">
              <h3 className="text-sm font-semibold uppercase tracking-wide">Origem</h3>
            </div>
            <div className="px-5 py-4">
              <RadioGroup
                value={form.origin}
                onChange={(v) => setField("origin", v)}
                options={[
                  { value: "dc", label: "Portador de DC" },
                  { value: "non-dc", label: "Não portador de DC" },
                  { value: "system", label: "Cadastro pelo sistema" },
                ]}
              />
            </div>
          </Card>

          {/* Actions */}
          <div className="flex items-center justify-between py-2">
            <Button variant="ghost" onClick={() => navigate("patients")}>Cancelar</Button>
            <Button variant="primary" size="lg" loading={saving} onClick={handleSave} icon={<IconUser size={15} />}>
              {saving ? "Salvando..." : "Salvar paciente"}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
