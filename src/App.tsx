import { Route, Routes } from "react-router-dom";

// Scaffold F1 — estrutura mínima buildável. As rotas/telas reais serão portadas do
// app Next.js nos incrementos seguintes (F2+): client-api (VITE_API_URL + Bearer),
// guard de rota client-side, layout/app-shell e features por módulo.

function Placeholder() {
  return (
    <main style={{ display: "grid", placeItems: "center", minHeight: "100dvh" }}>
      <div style={{ textAlign: "center", maxWidth: 560, padding: 24 }}>
        <p style={{ letterSpacing: "0.18em", textTransform: "uppercase", color: "#0f766e", fontWeight: 700 }}>
          t2c_data
        </p>
        <h1 style={{ fontSize: 28, margin: "8px 0" }}>Frontend (Vite SPA) — scaffold</h1>
        <p style={{ color: "#475569" }}>
          Base Vite + React Router pronta. Migração das telas do Next.js em andamento.
        </p>
        <p style={{ color: "#94a3b8", marginTop: 16, fontSize: 13 }}>
          API: {import.meta.env.VITE_API_URL || "(defina VITE_API_URL)"}
        </p>
      </div>
    </main>
  );
}

export function App() {
  return (
    <Routes>
      <Route path="*" element={<Placeholder />} />
    </Routes>
  );
}
