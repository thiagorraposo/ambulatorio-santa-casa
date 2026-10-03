import React from "react";
import { useApp } from "../context";
import { Card, Badge, Breadcrumb, Button, RoleBadge } from "./ui";

export default function MyAccount() {
  const { currentUser, navigate, logout } = useApp();
  if (!currentUser) return null;

  return (
    <div className="p-6 max-w-xl mx-auto">
      <Breadcrumb items={[{ label: "Início", onClick: () => navigate("home") }, { label: "Minha conta" }]} />

      <h1 className="text-xl font-semibold mt-4 mb-5">Minha conta</h1>

      <Card>
        <div className="px-6 py-5 border-b border-border flex items-center gap-4">
          <div className="w-14 h-14 rounded-full bg-primary/10 flex items-center justify-center text-2xl font-semibold text-primary">
            {currentUser.name[0]}
          </div>
          <div>
            <h2 className="text-lg font-semibold">{currentUser.name}</h2>
            <div className="mt-1"><RoleBadge role={currentUser.role} /></div>
          </div>
        </div>

        <div className="px-6 py-5 grid grid-cols-2 gap-x-8 gap-y-4 text-sm">
          <div>
            <p className="text-xs text-muted-foreground">Nome</p>
            <p className="mt-0.5 font-medium">{currentUser.name}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Login</p>
            <p className="mt-0.5 font-mono text-sm">{currentUser.login}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Perfil</p>
            <div className="mt-1"><RoleBadge role={currentUser.role} /></div>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Status</p>
            <div className="mt-1">
              <Badge variant={currentUser.status === "ativo" ? "success" : "neutral"}>
                {currentUser.status === "ativo" ? "Ativo" : "Inativo"}
              </Badge>
            </div>
          </div>
        </div>

        <div className="px-6 py-4 border-t border-border bg-muted/30 rounded-b-lg">
          <p className="text-xs text-muted-foreground">
            Para alterar seu perfil ou redefinir senha, contate a Administração do sistema.
            Não é possível alterar o próprio perfil.
          </p>
        </div>
      </Card>

      <div className="flex justify-end mt-5">
        <Button variant="danger" onClick={logout}>Sair do sistema</Button>
      </div>
    </div>
  );
}
