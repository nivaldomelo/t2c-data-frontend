import { lazy, Suspense, type ComponentType } from "react";
import { Navigate, Outlet, Route, Routes } from "react-router-dom";

import { AppShell } from "@/components/layout/app-shell";
import { ProtectedRoute } from "@/components/protected-route";
import { AuthProvider } from "@/lib/auth";
import { LoginPage } from "@/pages/login";

// Auto-registra todas as páginas portadas (src/pages/**/page.tsx) como rotas, com code-splitting.
// [id]/[slug] -> :id/:slug; .../page.tsx -> path; pages/page.tsx -> "/".
const pageModules = import.meta.glob("./pages/**/page.tsx");

function toRoutePath(file: string): string {
  const path = file
    .replace(/^\.\/pages/, "")
    .replace(/\/page\.tsx$/, "")
    .replace(/\[([^\]]+)\]/g, ":$1");
  return path === "" ? "/" : path;
}

const generatedRoutes = Object.entries(pageModules).map(([file, loader]) => ({
  path: toRoutePath(file),
  Component: lazy(loader as () => Promise<{ default: ComponentType }>),
}));

function AppLayout() {
  return (
    <ProtectedRoute>
      <AppShell>
        <Suspense fallback={<div className="p-6 text-sm text-muted">Carregando…</div>}>
          <Outlet />
        </Suspense>
      </AppShell>
    </ProtectedRoute>
  );
}

export function App() {
  return (
    <AuthProvider>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route element={<AppLayout />}>
          {generatedRoutes.map(({ path, Component }) => (
            <Route key={path} path={path} element={<Component />} />
          ))}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Route>
      </Routes>
    </AuthProvider>
  );
}
