import { FormEvent, useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate, useSearchParams } from "react-router-dom";
import { ArrowRight, Database, Loader2, ShieldCheck, ShieldQuestion } from "lucide-react";

import { Banner } from "@/components/ui/banner";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { defaultRouteForRoles } from "@/config/rbac";
import { useAuth } from "@/lib/auth";

type LoginStep = "credentials" | "mfa";

type LoginOutcome = { roles?: string[]; permissions?: string[] };

export function LoginPage() {
  const auth = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams] = useSearchParams();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [mfaCode, setMfaCode] = useState("");
  const [step, setStep] = useState<LoginStep>("credentials");
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  const sessionExpired = searchParams.get("reason") === "session-expired";

  useEffect(() => {
    if (step !== "mfa") return;
    window.setTimeout(() => document.getElementById("mfa-code")?.focus(), 0);
  }, [step]);

  const subtitle = useMemo(
    () =>
      sessionExpired
        ? "Sua sessão expirou. Faça login novamente para continuar."
        : "Acesse sua central de dados, governança, qualidade e operação.",
    [sessionExpired],
  );

  const supportCopy =
    step === "mfa"
      ? "Se sua conta estiver protegida por segundo fator, confirme o código temporário agora."
      : "Use suas credenciais corporativas para acessar catálogo, Data Quality, incidentes, integrações e painéis operacionais.";

  function finishLogin(result: LoginOutcome) {
    setPassword("");
    setMfaCode("");
    const from = (location.state as { from?: string } | null)?.from;
    // Rota calculada a partir do RESULTADO do login (o estado do provider ainda não
    // atualizou neste tick, então auth.defaultRoute estaria obsoleto = /login).
    const resolved = defaultRouteForRoles(result.roles ?? [], result.permissions ?? []);
    const target = from && from !== "/login" ? from : resolved === "/login" ? "/" : resolved;
    navigate(target, { replace: true });
  }

  async function handleCredentialsSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsLoading(true);
    setErrorMessage("");
    try {
      const result = await auth.login(email, password);
      finishLogin(result);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Falha ao processar o login.";
      // Conta com MFA ativo → avança para a etapa do código (sem tratar como erro).
      if (/mfa/i.test(message)) {
        setStep("mfa");
        setMfaCode("");
        setErrorMessage("");
      } else {
        setErrorMessage(message);
      }
    } finally {
      setIsLoading(false);
    }
  }

  async function handleMfaSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const code = mfaCode.replace(/\D/g, "");
    if (code.length !== 6) {
      setErrorMessage("Informe um código de 6 dígitos.");
      return;
    }
    setIsLoading(true);
    setErrorMessage("");
    try {
      const result = await auth.login(email, password, code);
      finishLogin(result);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Não foi possível concluir o login. Tente novamente.";
      setErrorMessage(
        /mfa/i.test(message)
          ? "Código inválido ou expirado. Abra o app autenticador e tente novamente com o código atual."
          : message,
      );
    } finally {
      setIsLoading(false);
    }
  }

  function goBackToCredentials() {
    setStep("credentials");
    setMfaCode("");
    setErrorMessage("");
  }

  return (
    <main className="relative min-h-screen overflow-hidden bg-[linear-gradient(180deg,#ffffff_0%,#f8fafc_55%,#eef2f7_100%)] text-text">
      <div className="absolute inset-0">
        <div className="absolute left-[-8rem] top-[-6rem] h-72 w-72 rounded-full bg-info-100/70 blur-3xl" />
        <div className="absolute right-[-4rem] top-[12%] h-80 w-80 rounded-full bg-slate-200/70 blur-3xl" />
        <div className="absolute bottom-[-8rem] left-[20%] h-72 w-72 rounded-full bg-bg-subtle blur-3xl" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(2,132,199,0.08),transparent_30%),radial-gradient(circle_at_bottom_right,rgba(15,23,42,0.06),transparent_28%)]" />
      </div>

      <div className="relative mx-auto grid min-h-screen w-full max-w-7xl items-center gap-8 px-6 py-8 sm:px-8 lg:grid-cols-[1.1fr_0.9fr] lg:px-12">
        <aside className="hidden flex-col justify-center gap-6 lg:flex">
          <div className="inline-flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-950 text-white shadow-[0_16px_30px_rgba(15,23,42,0.18)]">
              <Database className="h-5 w-5" />
            </div>
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-muted">t2c_data</p>
              <p className="mt-1 text-sm font-medium text-text-body">Catálogo, governança e operação de dados</p>
            </div>
          </div>

          <div className="max-w-xl space-y-4">
            <div className="inline-flex items-center gap-2 rounded-full border border-border bg-surface px-3 py-1 text-xs font-medium uppercase tracking-[0.18em] text-brand-600">
              <ShieldCheck className="h-3.5 w-3.5" />
              Executive cockpit
            </div>
            <h1 className="text-4xl font-semibold tracking-tight text-text">Entrar no t2c_data</h1>
            <p className="text-lg leading-8 text-text-body">{subtitle}</p>
            <p className="text-sm leading-6 text-muted">{supportCopy}</p>
          </div>

          <Card className="max-w-xl border-border/80 bg-surface/90 shadow-[0_30px_90px_rgba(15,23,42,0.1)] backdrop-blur">
            <CardContent className="space-y-3 p-6">
              <p className="text-xs uppercase tracking-[0.18em] text-brand-600">Suite de dados confiável</p>
              <p className="text-sm leading-6 text-text-body">
                Catálogo, Data Quality, privacidade, certificação, lineage, integrações e operação em um único ambiente.
              </p>
            </CardContent>
          </Card>
        </aside>

        <section className="mx-auto w-full max-w-md">
          <Card className="rounded-[36px] border border-border/80 bg-surface p-2 shadow-[0_30px_90px_rgba(15,23,42,0.1)]">
            <CardContent className="space-y-6 p-6 sm:p-8">
              <div className="space-y-3 text-center">
                <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-950 text-white shadow-[0_16px_30px_rgba(15,23,42,0.18)] lg:hidden">
                  <Database className="h-5 w-5" />
                </div>
                <div className="lg:hidden">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-muted">t2c_data</p>
                  <p className="mt-1 text-sm font-medium text-text-body">Catálogo, governança e operação de dados</p>
                </div>
                <h2 className="text-3xl font-semibold tracking-tight text-text">
                  {step === "mfa" ? "Confirme o segundo fator" : "Entrar no t2c_data"}
                </h2>
                <p className="text-sm leading-6 text-text-body">
                  {step === "mfa"
                    ? "Digite o código temporário do seu aplicativo autenticador para concluir o acesso."
                    : "Informe suas credenciais. Se sua conta tiver MFA ativo, solicitaremos o código temporário na próxima etapa."}
                </p>
              </div>

              {sessionExpired ? (
                <Banner description="Sua sessão expirou. Faça login novamente para continuar." tone="warning" title="Sessão expirada" />
              ) : null}

              {step === "credentials" ? (
                <form className="space-y-5" onSubmit={handleCredentialsSubmit}>
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-text-body" htmlFor="email">
                      E-mail corporativo
                    </label>
                    <Input
                      autoComplete="email"
                      className="h-12 rounded-2xl border-border bg-surface px-4 shadow-[0_8px_20px_rgba(15,23,42,0.04)] focus:border-border-strong focus:ring-slate-900/10"
                      id="email"
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="seu.email@empresa.com"
                      required
                      type="email"
                      value={email}
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-medium text-text-body" htmlFor="password">
                      Senha
                    </label>
                    <Input
                      autoComplete="current-password"
                      className="h-12 rounded-2xl border-border bg-surface px-4 shadow-[0_8px_20px_rgba(15,23,42,0.04)] focus:border-border-strong focus:ring-slate-900/10"
                      id="password"
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="Digite sua senha"
                      required
                      type="password"
                      value={password}
                    />
                  </div>

                  {errorMessage ? (
                    <div className="rounded-2xl border border-danger-200 bg-danger-50 px-4 py-3 text-sm leading-6 text-danger-700">{errorMessage}</div>
                  ) : (
                    <div className="rounded-2xl border border-border bg-bg-subtle/70 px-4 py-3 text-xs leading-5 text-text-body">
                      Informe suas credenciais. Se sua conta tiver MFA ativo, solicitaremos o código temporário na próxima etapa.
                    </div>
                  )}

                  <Button
                    className="group h-12 w-full rounded-2xl bg-slate-950 text-sm font-semibold text-white shadow-[0_18px_35px_rgba(15,23,42,0.18)] hover:bg-slate-900"
                    disabled={isLoading}
                    type="submit"
                  >
                    {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                    {isLoading ? "Validando credenciais..." : "Continuar"}
                    {!isLoading ? <ArrowRight className="ml-2 h-4 w-4 transition-transform group-hover:translate-x-0.5" /> : null}
                  </Button>
                </form>
              ) : (
                <form className="space-y-5" onSubmit={handleMfaSubmit}>
                  <div className="rounded-2xl border border-border bg-bg-subtle/70 px-4 py-3">
                    <p className="text-xs uppercase tracking-[0.18em] text-brand-600">Conta</p>
                    <p className="mt-1 text-sm font-medium text-text">{email}</p>
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-medium text-text-body" htmlFor="mfa-code">
                      Código de autenticação
                    </label>
                    <Input
                      autoComplete="one-time-code"
                      aria-invalid={Boolean(errorMessage)}
                      className="h-12 rounded-2xl border-border bg-surface px-4 text-center text-lg tracking-[0.35em] shadow-[0_8px_20px_rgba(15,23,42,0.04)] focus:border-border-strong focus:ring-slate-900/10"
                      id="mfa-code"
                      inputMode="numeric"
                      maxLength={6}
                      onChange={(e) => setMfaCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
                      placeholder="123456"
                      type="text"
                      value={mfaCode}
                    />
                    <p className="text-xs leading-5 text-muted">
                      Abra o Google Authenticator, Microsoft Authenticator, Authy ou outro app compatível e informe o código de 6 dígitos.
                    </p>
                  </div>

                  {errorMessage ? (
                    <div className="rounded-2xl border border-danger-200 bg-danger-50 px-4 py-3 text-sm leading-6 text-danger-700">{errorMessage}</div>
                  ) : null}

                  <Button
                    className="h-12 w-full rounded-2xl bg-slate-950 text-sm font-semibold text-white shadow-[0_18px_35px_rgba(15,23,42,0.18)] hover:bg-slate-900"
                    disabled={isLoading || mfaCode.length !== 6}
                    type="submit"
                  >
                    {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                    {isLoading ? "Confirmando código..." : "Confirmar código"}
                  </Button>

                  <div className="flex flex-wrap justify-between gap-2">
                    <Button disabled={isLoading} onClick={goBackToCredentials} type="button" variant="ghost">
                      Voltar
                    </Button>
                    <Button
                      disabled={isLoading}
                      onClick={() => {
                        setEmail("");
                        setPassword("");
                        setMfaCode("");
                        setStep("credentials");
                        setErrorMessage("");
                      }}
                      type="button"
                      variant="ghost"
                    >
                      Usar outra conta
                    </Button>
                  </div>
                </form>
              )}

              <div className="flex items-center justify-between border-t border-border pt-4 text-xs text-muted">
                <span>Protegido por autenticação corporativa</span>
                <span>Versão t2c_data</span>
              </div>
            </CardContent>
          </Card>

          <div className="mt-4 flex items-center gap-2 rounded-2xl border border-border bg-surface/80 px-4 py-3 text-xs leading-5 text-text-body shadow-[0_10px_28px_rgba(15,23,42,0.04)] lg:hidden">
            <ShieldQuestion className="h-4 w-4 text-muted" />
            <span>Suite de dados confiável com catálogo, qualidade, privacidade, certificação, lineage, integrações e operação.</span>
          </div>
        </section>
      </div>
    </main>
  );
}
