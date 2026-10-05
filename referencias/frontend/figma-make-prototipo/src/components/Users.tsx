import React, { useState } from "react";
import { useApp } from "../context";
import type { User, UserRole } from "../types";
import {
  Card, Button, Badge, Table, Tr, Td, Modal, AlertBox, Breadcrumb, RoleBadge,
  IconEdit,
} from "./ui";

export default function Users() {
  const { currentUser, users, updateUser, navigate, showToast } = useApp();

  const [editUser, setEditUser] = useState<User | null>(null);
  const [editModal, setEditModal] = useState(false);
  const [inactivateModal, setInactivateModal] = useState(false);
  const [targetUser, setTargetUser] = useState<User | null>(null);
  const [newRole, setNewRole] = useState<UserRole>("consulta");
  const [saving, setSaving] = useState(false);

  if (currentUser?.role !== "administracao") {
    return (
      <div className="p-6 max-w-2xl mx-auto">
        <div className="bg-red-50 border border-red-200 rounded-xl p-8 text-center flex flex-col items-center gap-3">
          <div className="text-4xl">🔒</div>
          <h2 className="text-lg font-semibold text-red-800">Acesso restrito</h2>
          <p className="text-sm text-red-700">Você não possui permissão para acessar o gerenciamento de usuários.</p>
          <p className="text-xs text-red-600">Esta área é exclusiva para o perfil de Administração.</p>
          <Button variant="secondary" className="mt-2" onClick={() => navigate("home")}>Voltar ao início</Button>
        </div>
      </div>
    );
  }

  function openEdit(u: User) {
    setEditUser(u);
    setNewRole(u.role);
    setEditModal(true);
  }

  function openInactivate(u: User) {
    setTargetUser(u);
    setInactivateModal(true);
  }

  async function confirmRoleChange() {
    if (!editUser) return;
    setSaving(true);
    await new Promise((r) => setTimeout(r, 600));
    updateUser({ ...editUser, role: newRole });
    setSaving(false);
    setEditModal(false);
    showToast("success", `Perfil de ${editUser.name} atualizado para ${roleLabel(newRole)}.`);
  }

  async function confirmInactivate() {
    if (!targetUser) return;
    setSaving(true);
    await new Promise((r) => setTimeout(r, 600));
    const newStatus = targetUser.status === "ativo" ? "inativo" : "ativo";
    updateUser({ ...targetUser, status: newStatus });
    setSaving(false);
    setInactivateModal(false);
    showToast("success", `Usuário ${targetUser.name} ${newStatus === "inativo" ? "inativado" : "ativado"}.`);
  }

  function roleLabel(r: string) {
    return { consulta: "Consulta", edicao: "Edição", administracao: "Administração" }[r] || r;
  }

  return (
    <div className="p-6 max-w-5xl mx-auto">
      <Breadcrumb items={[{ label: "Início", onClick: () => navigate("home") }, { label: "Usuários" }]} />

      <div className="mt-4 mb-5">
        <h1 className="text-xl font-semibold">Gerenciamento de usuários</h1>
        <p className="text-sm text-muted-foreground mt-0.5">
          {users.length} usuários cadastrados — área exclusiva de Administração
        </p>
      </div>

      <AlertBox type="info">
        Neste protótipo é possível alterar perfis e ativar/inativar usuários.
        Exclusão definitiva de usuário não está disponível.
        Autenticação multifator (MFA), SSO e recuperação avançada de conta não estão definidos neste MVP.
      </AlertBox>

      <div className="mt-4" />

      <Card>
        <Table headers={["Usuário", "Login", "Perfil", "Status", "Ações"]}>
          {users.map((u) => (
            <Tr key={u.id}>
              <Td>
                <div className="flex items-center gap-2.5">
                  <div className="w-7 h-7 rounded-full bg-primary/10 flex items-center justify-center text-xs font-semibold text-primary flex-shrink-0">
                    {u.name[0]}
                  </div>
                  <div>
                    <p className="text-sm font-medium">{u.name}</p>
                    {u.id === currentUser.id && (
                      <p className="text-xs text-muted-foreground">(você)</p>
                    )}
                  </div>
                </div>
              </Td>
              <Td mono>{u.login}</Td>
              <Td><RoleBadge role={u.role} /></Td>
              <Td>
                <Badge variant={u.status === "ativo" ? "success" : "neutral"}>
                  {u.status === "ativo" ? "Ativo" : "Inativo"}
                </Badge>
              </Td>
              <Td>
                <div className="flex items-center gap-1">
                  <Button
                    variant="ghost"
                    size="sm"
                    icon={<IconEdit size={13} />}
                    onClick={() => openEdit(u)}
                    disabled={u.id === currentUser.id}
                    title={u.id === currentUser.id ? "Não é possível editar seu próprio perfil" : "Alterar perfil"}
                  >
                    Perfil
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => openInactivate(u)}
                    disabled={u.id === currentUser.id}
                    className={u.status === "ativo" ? "text-amber-700 hover:bg-amber-50" : "text-green-700 hover:bg-green-50"}
                  >
                    {u.status === "ativo" ? "Inativar" : "Ativar"}
                  </Button>
                </div>
              </Td>
            </Tr>
          ))}
        </Table>
      </Card>

      {/* Edit role modal */}
      <Modal open={editModal} onClose={() => setEditModal(false)} title="Alterar perfil do usuário" size="sm">
        {editUser && (
          <div className="px-6 py-5 flex flex-col gap-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-base font-semibold text-primary">
                {editUser.name[0]}
              </div>
              <div>
                <p className="text-sm font-semibold">{editUser.name}</p>
                <p className="text-xs text-muted-foreground font-mono">{editUser.login}</p>
              </div>
            </div>

            <div className="flex flex-col gap-2">
              <p className="text-sm font-medium">Selecione o novo perfil:</p>
              {(["consulta", "edicao", "administracao"] as UserRole[]).map((r) => (
                <label key={r} className={`flex items-center justify-between gap-3 px-4 py-3 rounded-lg border cursor-pointer transition-colors
                  ${newRole === r ? "border-primary bg-primary/5" : "border-border hover:bg-secondary"}`}>
                  <div className="flex items-center gap-2">
                    <input type="radio" value={r} checked={newRole === r} onChange={() => setNewRole(r)} className="accent-primary" />
                    <RoleBadge role={r} />
                  </div>
                  <span className="text-xs text-muted-foreground">
                    {r === "consulta" ? "Somente visualização" : r === "edicao" ? "Consulta + edição" : "Acesso completo"}
                  </span>
                </label>
              ))}
            </div>

            {newRole !== editUser.role && (
              <AlertBox type="warning">
                O perfil de <strong>{editUser.name}</strong> será alterado de <strong>{roleLabel(editUser.role)}</strong> para <strong>{roleLabel(newRole)}</strong>.
                Esta mudança afeta imediatamente o acesso do usuário.
              </AlertBox>
            )}

            <div className="flex gap-2 justify-end">
              <Button variant="outline" onClick={() => setEditModal(false)}>Cancelar</Button>
              <Button variant="primary" loading={saving} disabled={newRole === editUser.role} onClick={confirmRoleChange}>
                Confirmar alteração
              </Button>
            </div>
          </div>
        )}
      </Modal>

      {/* Inactivate modal */}
      <Modal open={inactivateModal} onClose={() => setInactivateModal(false)} title={targetUser?.status === "ativo" ? "Inativar usuário" : "Ativar usuário"} size="sm">
        {targetUser && (
          <div className="px-6 py-5 flex flex-col gap-4">
            {targetUser.status === "ativo" ? (
              <AlertBox type="warning">
                Ao inativar <strong>{targetUser.name}</strong>, o usuário perderá acesso imediato ao sistema.
                O registro será mantido e pode ser reativado a qualquer momento.
              </AlertBox>
            ) : (
              <AlertBox type="info">
                Ao ativar <strong>{targetUser.name}</strong>, o usuário voltará a ter acesso ao sistema com o perfil <strong>{roleLabel(targetUser.role)}</strong>.
              </AlertBox>
            )}
            <div className="flex gap-2 justify-end">
              <Button variant="outline" onClick={() => setInactivateModal(false)}>Cancelar</Button>
              <Button
                variant={targetUser.status === "ativo" ? "danger" : "primary"}
                loading={saving}
                onClick={confirmInactivate}
              >
                {targetUser.status === "ativo" ? "Confirmar inativação" : "Confirmar ativação"}
              </Button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
