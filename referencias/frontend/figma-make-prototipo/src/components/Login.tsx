import React, { useState } from "react";
import { useApp } from "../context";
import { Button, Input, AlertBox, IconLock } from "./ui";

export default function Login() {
  const { login } = useApp();
  const [loginVal, setLoginVal] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!loginVal || !password) {
      setError("Preencha o login e a senha.");
      return;
    }
    setLoading(true);
    await new Promise((r) => setTimeout(r, 800));
    const result = login(loginVal.trim(), password);
    setLoading(false);
    if (result === "invalid") setError("Login ou senha incorretos. Verifique os dados informados.");
    else if (result === "inactive") setError("Usuário inativo. Entre em contato com a administração do sistema.");
    else if (result === "locked") setError("Acesso temporariamente bloqueado. Aguarde e tente novamente ou contate o administrador.");
  }

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center px-4">
      <div className="w-full max-w-sm">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-primary/10 mb-4">
            <span className="text-2xl">🏥</span>
          </div>
          <h1 className="text-xl font-semibold text-foreground">Centro de Pesquisa em Saúde</h1>
          <p className="text-base text-primary font-medium mt-0.5">Ambulatório Santa Casa</p>
          <p className="text-xs text-muted-foreground mt-2">Sistema de Gestão Ambulatorial</p>
        </div>

        {/* Card */}
        <div className="bg-card border border-border rounded-xl shadow-sm p-6">
          <h2 className="text-base font-semibold text-foreground mb-5">Acesso ao sistema</h2>
          <form onSubmit={handleSubmit} className="flex flex-col gap-4" noValidate>
            <Input
              label="Login"
              type="text"
              value={loginVal}
              onChange={(e) => setLoginVal(e.target.value)}
              autoComplete="username"
              autoFocus
              placeholder="seu.login"
            />
            <Input
              label="Senha"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="current-password"
              placeholder="••••••••"
            />
            {error && <AlertBox type="error">{error}</AlertBox>}
            <Button variant="primary" size="lg" type="submit" loading={loading} className="w-full mt-1">
              {loading ? "Verificando..." : "Entrar"}
            </Button>
          </form>
        </div>

        {/* Demo credentials hint */}
        <div className="mt-5 bg-muted/60 border border-border rounded-lg p-4">
          <p className="text-xs font-medium text-muted-foreground mb-2 flex items-center gap-1.5"><IconLock size={12} /> Acesso de demonstração</p>
          <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs text-muted-foreground">
            <div><span className="font-mono bg-card border border-border rounded px-1">admin</span> / <span className="font-mono">admin123</span></div>
            <div>Administração</div>
            <div><span className="font-mono bg-card border border-border rounded px-1">carlos.editor</span> / <span className="font-mono">editor123</span></div>
            <div>Edição</div>
            <div><span className="font-mono bg-card border border-border rounded px-1">fernanda.consulta</span> / <span className="font-mono">consulta123</span></div>
            <div>Consulta</div>
          </div>
        </div>

        <p className="text-center text-xs text-muted-foreground mt-6">
          Sistema em desenvolvimento — protótipo funcional do MVP
        </p>
      </div>
    </div>
  );
}
