import { useAuth } from "@/lib/auth";

// Placeholder de página protegida (F2). As telas reais são portadas em F3+.
export function HomePage() {
  const auth = useAuth();
  return (
    <div className="space-y-3">
      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-brand-600">Central</p>
      <h1 className="text-2xl font-semibold text-text">Bem-vindo(a), {auth.displayName || "usuário"}</h1>
      <p className="text-sm text-text-body">
        Perfil: <span className="font-medium">{auth.primaryRole}</span>. Núcleo do SPA (auth + RBAC + shell)
        migrado. As telas por módulo estão sendo portadas.
      </p>
    </div>
  );
}
