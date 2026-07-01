import { Navigate, useLocation } from "react-router-dom";

import { useAuth } from "@/lib/auth";

// Guard de rota client-side (porta a lógica do proxy.ts do Next):
// não autenticado -> /login; sem acesso ao path (RBAC) -> rota default do perfil.
export function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const auth = useAuth();
  const location = useLocation();

  if (auth.isLoading) {
    return (
      <div className="grid min-h-[100dvh] place-items-center text-sm text-muted">Carregando…</div>
    );
  }
  if (!auth.isAuthenticated) {
    return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  }
  if (!auth.canAccessPath(location.pathname)) {
    return <Navigate to={auth.defaultRoute} replace />;
  }
  return <>{children}</>;
}
