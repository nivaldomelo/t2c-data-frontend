import { FormEvent, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";

import { useAuth } from "@/lib/auth";

export function LoginPage() {
  const auth = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [mfaCode, setMfaCode] = useState("");
  const [needsMfa, setNeedsMfa] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    setLoading(true);
    setError("");
    try {
      await auth.login(email, password, mfaCode || undefined);
      const from = (location.state as { from?: string } | null)?.from;
      navigate(from && from !== "/login" ? from : auth.defaultRoute, { replace: true });
    } catch (err) {
      const message = err instanceof Error ? err.message : "Falha no login";
      if (/mfa/i.test(message)) setNeedsMfa(true);
      setError(message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="grid min-h-[100dvh] place-items-center bg-app-bg p-4">
      <form onSubmit={onSubmit} className="w-full max-w-sm space-y-4 rounded-2xl border border-border bg-surface p-6 shadow-card">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-brand-700">t2c_data</p>
          <h1 className="mt-1 text-xl font-semibold text-text">Entrar</h1>
        </div>
        <div>
          <label className="mb-1 block text-sm text-text-body">E-mail</label>
          <input
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm"
          />
        </div>
        <div>
          <label className="mb-1 block text-sm text-text-body">Senha</label>
          <input
            type="password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm"
          />
        </div>
        {needsMfa ? (
          <div>
            <label className="mb-1 block text-sm text-text-body">Código MFA</label>
            <input
              value={mfaCode}
              onChange={(e) => setMfaCode(e.target.value)}
              className="w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm"
            />
          </div>
        ) : null}
        {error ? <p className="text-sm text-danger-700">{error}</p> : null}
        <button
          type="submit"
          disabled={loading}
          className="w-full rounded-lg bg-brand-600 px-3 py-2 text-sm font-semibold text-white hover:bg-brand-700 disabled:opacity-60"
        >
          {loading ? "Entrando…" : "Entrar"}
        </button>
      </form>
    </div>
  );
}
