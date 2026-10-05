import React, { useState } from "react";
import { useApp } from "../context";
import type { Page } from "../types";
import {
  IconHome, IconUser, IconClipboard, IconDatabase, IconBarChart,
  IconUsers, IconLogOut, IconSettings, IconChevronRight,
} from "./ui";
import { RoleBadge } from "./ui";

interface NavItem {
  label: string;
  page: Page;
  icon: React.ReactNode;
  adminOnly?: boolean;
}

const navItems: NavItem[] = [
  { label: "Início", page: "home", icon: <IconHome size={16} /> },
  { label: "Pacientes", page: "patients", icon: <IconUser size={16} /> },
  { label: "Pendências", page: "pendencies", icon: <IconClipboard size={16} /> },
  { label: "Importações", page: "imports", icon: <IconDatabase size={16} /> },
  { label: "Dashboard", page: "dashboard", icon: <IconBarChart size={16} /> },
  { label: "Usuários", page: "users", icon: <IconUsers size={16} />, adminOnly: true },
];

interface LayoutProps {
  children: React.ReactNode;
}

export default function Layout({ children }: LayoutProps) {
  const { currentUser, nav, navigate, logout } = useApp();
  const [userMenuOpen, setUserMenuOpen] = useState(false);

  if (!currentUser) return null;

  const isAdmin = currentUser.role === "administracao";

  return (
    <div className="flex h-screen bg-background overflow-hidden">
      {/* Sidebar */}
      <aside className="w-56 flex-shrink-0 bg-card border-r border-border flex flex-col h-full">
        {/* Logo */}
        <div className="px-5 py-5 border-b border-border flex-shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded bg-primary/10 flex items-center justify-center text-sm">🏥</div>
            <div>
              <p className="text-xs font-semibold text-foreground leading-tight">Ambulatório</p>
              <p className="text-[10px] text-muted-foreground leading-tight">Santa Casa</p>
            </div>
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 overflow-y-auto py-3 px-2.5">
          {navItems.map((item) => {
            if (item.adminOnly && !isAdmin) return null;
            const isActive = nav.page === item.page ||
              (item.page === "patients" && ["patient-record", "new-patient", "new-appointment"].includes(nav.page)) ||
              (item.page === "imports" && nav.page === "import-detail");
            return (
              <button
                key={item.page}
                onClick={() => navigate(item.page)}
                className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-md text-sm transition-colors mb-0.5
                  ${isActive
                    ? "bg-primary text-primary-foreground font-medium"
                    : "text-muted-foreground hover:text-foreground hover:bg-secondary"
                  }`}
              >
                <span className="flex-shrink-0">{item.icon}</span>
                <span>{item.label}</span>
              </button>
            );
          })}
        </nav>

        {/* Bottom */}
        <div className="border-t border-border p-2.5 flex-shrink-0">
          <div className="relative">
            <button
              onClick={() => setUserMenuOpen((o) => !o)}
              className="w-full flex items-center gap-2.5 px-3 py-2 rounded-md hover:bg-secondary transition-colors text-left"
            >
              <div className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                <span className="text-xs font-semibold text-primary">{currentUser.name[0]}</span>
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-medium text-foreground truncate">{currentUser.name}</p>
                <p className="text-[10px] text-muted-foreground capitalize">{currentUser.role}</p>
              </div>
              <IconChevronRight size={12} />
            </button>

            {userMenuOpen && (
              <>
                <div className="fixed inset-0 z-20" onClick={() => setUserMenuOpen(false)} />
                <div className="absolute bottom-full left-0 right-0 mb-1 bg-card border border-border rounded-lg shadow-lg z-30 overflow-hidden">
                  <div className="px-4 py-3 border-b border-border">
                    <p className="text-xs font-semibold text-foreground">{currentUser.name}</p>
                    <div className="mt-1"><RoleBadge role={currentUser.role} /></div>
                  </div>
                  <button
                    onClick={() => { setUserMenuOpen(false); navigate("my-account"); }}
                    className="w-full flex items-center gap-2 px-4 py-2.5 text-sm text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors"
                  >
                    <IconSettings size={14} /> Minha conta
                  </button>
                  <button
                    onClick={() => { setUserMenuOpen(false); logout(); }}
                    className="w-full flex items-center gap-2 px-4 py-2.5 text-sm text-red-600 hover:bg-red-50 transition-colors"
                  >
                    <IconLogOut size={14} /> Sair
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      </aside>

      {/* Main */}
      <main className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Top bar */}
        <header className="h-12 flex-shrink-0 bg-card border-b border-border flex items-center px-6 justify-between">
          <div className="text-xs text-muted-foreground">
            Centro de Pesquisa em Saúde — Hospital Santa Casa
          </div>
          <div className="flex items-center gap-3">
            <span className="text-xs text-muted-foreground">
              {currentUser.name}
            </span>
            <RoleBadge role={currentUser.role} />
          </div>
        </header>

        {/* Page content */}
        <div className="flex-1 overflow-y-auto">
          {children}
        </div>
      </main>
    </div>
  );
}
