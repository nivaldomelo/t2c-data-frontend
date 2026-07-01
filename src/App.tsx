import { Navigate, Route, Routes } from "react-router-dom";

import { AppShell } from "@/components/app-shell";
import { ProtectedRoute } from "@/components/protected-route";
import { AuthProvider } from "@/lib/auth";
import { HomePage } from "@/pages/home";
import { LoginPage } from "@/pages/login";

// F2 — núcleo: auth + RBAC + shell. Rotas por módulo (Explorer, DQ, Governança, Centro de
// Decisão, etc.) são adicionadas em F3+ substituindo os placeholders abaixo.
export function App() {
  return (
    <AuthProvider>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route
          element={
            <ProtectedRoute>
              <AppShell />
            </ProtectedRoute>
          }
        >
          <Route index element={<Navigate to="/dashboard" replace />} />
          <Route path="/dashboard" element={<HomePage />} />
          <Route path="/explorer" element={<HomePage />} />
          <Route path="/lineage" element={<HomePage />} />
          <Route path="/governance" element={<HomePage />} />
          <Route path="/governance/intelligence" element={<HomePage />} />
          <Route path="*" element={<HomePage />} />
        </Route>
      </Routes>
    </AuthProvider>
  );
}
