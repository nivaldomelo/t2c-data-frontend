import { useEffect } from "react";
import { Database, Mail, ShieldCheck, X } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

// Versão/ambiente/build vêm de variáveis de build do Vite (import.meta.env.VITE_*), com
// fallback seguro. Nenhum segredo é exposto — só metadados públicos de versão.
const APP_VERSION = (import.meta.env.VITE_APP_VERSION as string | undefined) || "v1.0.0";
const APP_DEPLOYED_AT = (import.meta.env.VITE_APP_DEPLOYED_AT as string | undefined) || "Julho de 2026";
const APP_COMMIT = (import.meta.env.VITE_APP_COMMIT as string | undefined) || "";
const RAW_ENV = (import.meta.env.VITE_APP_ENV as string | undefined) || "";

function envLabel(value: string): string | null {
  const v = value.trim().toLowerCase();
  if (!v) return null;
  if (["prd", "prod", "producao", "production"].includes(v)) return "Produção";
  if (["apc", "apice", "hml", "homologacao", "homologação", "staging"].includes(v)) return "Homologação";
  if (["dev", "development", "local", "desenvolvimento"].includes(v)) return "Desenvolvimento";
  return value;
}

const MODULES = [
  "Dashboard Executivo",
  "Explorer de Ativos",
  "Explorer de Data Lake",
  "Data Sources",
  "Data Quality",
  "Observabilidade",
  "Certificação",
  "Privacidade & Acesso",
  "Owners",
  "Domínios",
  "Produtos de Dados",
  "Inbox/Pendências",
  "Notificações",
  "Cockpit Operacional",
  "Governança",
  "Centro de Inteligência",
  "Linhagem",
  "Integrações e API Keys",
];

function InfoRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-0.5 sm:flex-row sm:items-baseline sm:gap-2">
      <span className="w-40 shrink-0 text-xs font-medium uppercase tracking-[0.14em] text-muted">{label}</span>
      <span className="text-sm text-text-body">{children}</span>
    </div>
  );
}

export function AboutDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  useEffect(() => {
    if (!open) return;
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") onClose();
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [open, onClose]);

  if (!open) return null;

  const environment = envLabel(RAW_ENV);

  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center bg-slate-950/60 p-4 backdrop-blur-md">
      <button aria-label="Fechar" className="absolute inset-0 cursor-default" onClick={onClose} type="button" />
      <div
        aria-labelledby="about-dialog-title"
        aria-modal="true"
        className="relative flex max-h-[88vh] w-full max-w-2xl flex-col overflow-hidden rounded-3xl border border-border/80 bg-surface shadow-card"
        role="dialog"
      >
        {/* Header */}
        <div className="border-b border-border/70 bg-[linear-gradient(135deg,#f8fafc_0%,#ffffff_50%,#eef2f7_100%)] px-6 py-5">
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-950 text-white shadow-[0_16px_30px_rgba(15,23,42,0.18)]">
                <Database className="h-5 w-5" />
              </div>
              <div>
                <h2 className="text-xl font-semibold tracking-tight text-text" id="about-dialog-title">
                  Sobre o t2c_data
                </h2>
                <p className="mt-0.5 text-sm text-text-body">Plataforma de Governança e Operação de Dados</p>
              </div>
            </div>
            <Button aria-label="Fechar" className="h-10 w-10 shrink-0 px-0" onClick={onClose} variant="ghost">
              <X className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* Body (scroll) */}
        <div className="space-y-6 overflow-y-auto px-6 py-5">
          <p className="text-sm leading-6 text-text-body">
            O t2c_data centraliza catálogo, governança, qualidade, observabilidade, certificação, privacidade, linhagem e
            operação de dados em uma única experiência, apoiando empresas na gestão e na confiança dos seus ativos de dados.
          </p>

          {/* Informações do sistema */}
          <section className="rounded-2xl border border-border/70 bg-bg-subtle/50 p-4">
            <h3 className="mb-3 text-xs font-semibold uppercase tracking-[0.18em] text-brand-600">Informações do sistema</h3>
            <div className="space-y-2">
              <InfoRow label="Nome">t2c_data</InfoRow>
              <InfoRow label="Tipo">Plataforma de Governança e Operação de Dados</InfoRow>
              <InfoRow label="Versão">{APP_VERSION}</InfoRow>
              <InfoRow label="Implantação">{APP_DEPLOYED_AT}</InfoRow>
              <InfoRow label="Criado por">Nivaldo Oliveira de Melo</InfoRow>
              <InfoRow label="E-mail">
                <a className="text-brand-600 underline hover:text-brand-700" href="mailto:nivaldo.melo@turn2c.com">
                  nivaldo.melo@turn2c.com
                </a>
              </InfoRow>
              <InfoRow label="Empresa">Turn2C</InfoRow>
              {environment ? <InfoRow label="Ambiente">{environment}</InfoRow> : null}
              {APP_COMMIT ? <InfoRow label="Build/Commit">{APP_COMMIT}</InfoRow> : null}
            </div>
          </section>

          {/* Módulos principais */}
          <section>
            <h3 className="mb-3 text-xs font-semibold uppercase tracking-[0.18em] text-brand-600">Módulos principais</h3>
            <div className="flex flex-wrap gap-2">
              {MODULES.map((module) => (
                <Badge key={module} tone="neutral">
                  {module}
                </Badge>
              ))}
            </div>
          </section>

          {/* Finalidade */}
          <section className="rounded-2xl border border-border/70 bg-surface p-4">
            <h3 className="mb-2 text-xs font-semibold uppercase tracking-[0.18em] text-brand-600">Finalidade</h3>
            <p className="text-sm leading-6 text-text-body">
              Centralizar informações de dados, reduzir riscos operacionais, aumentar a rastreabilidade, apoiar processos de
              governança, melhorar a confiança nos dados e facilitar a atuação de administradores, stewards, data owners,
              analistas e consumidores de dados.
            </p>
          </section>

          {/* Aviso */}
          <section className="flex items-start gap-2 rounded-2xl border border-border/70 bg-bg-subtle/60 p-4">
            <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-muted" />
            <p className="text-xs leading-5 text-text-body">
              Software de uso interno. Deve ser utilizado conforme as políticas de segurança, governança e privacidade da
              organização. O acesso às funcionalidades pode variar de acordo com o perfil e as permissões do usuário.
            </p>
          </section>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between gap-3 border-t border-border/70 bg-bg-subtle/80 px-6 py-4">
          <span className="inline-flex items-center gap-1.5 text-xs text-muted">
            <Mail className="h-3.5 w-3.5" /> nivaldo.melo@turn2c.com
          </span>
          <Button onClick={onClose}>Fechar</Button>
        </div>
      </div>
    </div>
  );
}
