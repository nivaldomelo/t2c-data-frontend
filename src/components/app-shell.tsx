import { NavLink, Outlet } from "react-router-dom";
import { Eye, GitBranch, LayoutDashboard, LogOut, ShieldCheck, Sparkles } from "lucide-react";

import { useAuth } from "@/lib/auth";
import { cn } from "@/lib/cn";

// Shell mínimo (F2). O app-shell completo (todas as seções/itens) é portado em incremento posterior.
const NAV = [
  { to: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { to: "/explorer", label: "Explorer", icon: Eye },
  { to: "/lineage", label: "Linhagem", icon: GitBranch },
  { to: "/governance", label: "Governança", icon: ShieldCheck },
  { to: "/governance/intelligence", label: "Central de Decisão", icon: Sparkles },
];

export function AppShell() {
  const auth = useAuth();
  return (
    <div className="flex min-h-[100dvh] bg-app-bg text-text">
      <aside className="flex w-60 flex-col border-r border-border bg-surface">
        <div className="border-b border-border px-4 py-4">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-brand-700">t2c_data</p>
        </div>
        <nav className="flex-1 space-y-1 p-2">
          {NAV.map(({ to, label, icon: Icon }) => (
            <NavLink
              key={to}
              to={to}
              className={({ isActive }) =>
                cn(
                  "flex items-center gap-2 rounded-lg px-3 py-2 text-sm",
                  isActive ? "bg-bg-subtle font-medium text-brand-700" : "text-text-body hover:bg-bg-subtle",
                )
              }
            >
              <Icon className="h-4 w-4" />
              {label}
            </NavLink>
          ))}
        </nav>
      </aside>
      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex items-center justify-between border-b border-border bg-surface px-6 py-3">
          <div className="h-[3px] w-24 rounded bg-gradient-to-r from-brand-600 via-accent-500 to-brand-600" />
          <div className="flex items-center gap-3 text-sm">
            <span className="text-text-body">{auth.displayName}</span>
            <button
              type="button"
              onClick={() => void auth.logout()}
              className="inline-flex items-center gap-1 rounded-lg border border-border px-2.5 py-1.5 text-text-body hover:bg-bg-subtle"
            >
              <LogOut className="h-4 w-4" />
              Sair
            </button>
          </div>
        </header>
        <main className="min-w-0 flex-1 overflow-y-auto p-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
