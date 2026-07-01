import { Link } from "@/lib/next-shims";
import { useEffect, useState } from "react";
import { CircleAlert, ShieldAlert, Sparkles, UserCircle2, X } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  CertificationStatusBadge,
  certificationStatusFrameClass,
  certificationStatusHeaderClass,
} from "@/components/certification/certification-badge";
import { Skeleton } from "@/components/ui/skeleton";
import { STATUS_TOKENS } from "@/config/status-tokens";
import { apiRequest } from "@/lib/client-api";
import { cn } from "@/lib/cn";
import { formatDateTime } from "@/features/dashboard/components/shared";
import { trackPlatformEvent } from "@/features/platform/client";
import type { ExecutiveDashboardAssetDetails } from "@/features/dashboard/types";

type Props = {
  open: boolean;
  tableId: number | null;
  onClose: () => void;
  onUpdated?: () => void;
};

function toneClasses(tone: string) {
  if (tone === "danger") return `${STATUS_TOKENS.danger.border} ${STATUS_TOKENS.danger.background} ${STATUS_TOKENS.danger.text}`;
  if (tone === "warning") return `${STATUS_TOKENS.warning.border} ${STATUS_TOKENS.warning.background} ${STATUS_TOKENS.warning.text}`;
  if (tone === "accent") return `${STATUS_TOKENS.accent.border} ${STATUS_TOKENS.accent.background} ${STATUS_TOKENS.accent.text}`;
  return `${STATUS_TOKENS.neutral.border} ${STATUS_TOKENS.neutral.background} ${STATUS_TOKENS.neutral.text}`;
}

export function ExecutiveDashboardDetailDrawer({ open, tableId, onClose, onUpdated }: Props) {
  const [details, setDetails] = useState<ExecutiveDashboardAssetDetails | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  async function loadDetails(currentTableId: number) {
    const data = await apiRequest<ExecutiveDashboardAssetDetails>(`/v1/dashboard/executive/asset/${currentTableId}/details`);
    setDetails(data);
  }

  useEffect(() => {
    if (!open || tableId === null) return;
    let cancelled = false;
    setLoading(true);
    setError("");
    setDetails(null);

    void (async () => {
      try {
        await loadDetails(tableId);
      } catch (err) {
        if (!cancelled) setError((err as Error).message);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [open, tableId]);

  useEffect(() => {
    if (!open) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [open, onClose]);

  if (!open) return null;

  async function confirmReview(reviewType: "owner" | "privacy") {
    if (tableId === null) return;
    try {
      await apiRequest(`/v1/governance/tables/${tableId}/${reviewType}-review`, { method: "POST" });
      void trackPlatformEvent({
        event_name: "review_confirmed",
        module_name: "dashboard",
        page_path: "/dashboard",
        entity_type: "table",
        entity_id: tableId,
        metadata: { review_type: reviewType, source: "drawer" },
      });
      await loadDetails(tableId);
      setNotice(reviewType === "owner" ? "Revisão de owner confirmada." : "Revisão de privacidade confirmada.");
      onUpdated?.();
    } catch (err) {
      setNotice((err as Error).message);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/55 p-3 backdrop-blur-md md:p-6">
      <button aria-label="Fechar detalhe" className="absolute inset-0 cursor-default" onClick={onClose} type="button" />
      <div className="relative flex max-h-[92dvh] w-full max-w-6xl flex-col overflow-hidden rounded-3xl border border-border/80 bg-[linear-gradient(180deg,#ffffff_0%,#f8fafc_100%)] shadow-card">
        <div className="sticky top-0 z-10 border-b border-border/60 bg-surface/90 backdrop-blur-xl">
          <div className="flex items-start justify-between gap-4 px-4 py-4 sm:px-6">
            <div className="min-w-0 space-y-1">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-brand-600">Detalhe do ativo</p>
              <h3 className="break-words text-xl font-semibold tracking-[-0.02em] text-text sm:text-2xl">{details?.asset.table_name || "Carregando ativo"}</h3>
              {details?.asset.table_fqn ? <p className="break-words text-sm text-muted">{details.asset.table_fqn}</p> : null}
            </div>
            <Button className="h-10 w-10 shrink-0 px-0" onClick={onClose} variant="outline">
              <X className="h-4 w-4" />
            </Button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto px-4 py-5 sm:px-6 lg:px-8">
          {loading ? (
            <div className="space-y-4">
              <Skeleton className="h-36 w-full" />
              <Skeleton className="h-28 w-full" />
              <Skeleton className="h-64 w-full" />
            </div>
          ) : null}

          {!loading && error ? <p className="text-sm text-danger-700">{error}</p> : null}

          {!loading && !error && details ? (
            <div className="space-y-6">
              {notice ? <p className="text-sm text-brand-700">{notice}</p> : null}
              <Card
                className={cn(
                  "border-border/80 bg-surface shadow-card",
                  certificationStatusFrameClass(details.asset.certification_status),
                  certificationStatusHeaderClass(details.asset.certification_status),
                )}
              >
                <CardContent className="space-y-6 p-5 sm:p-6">
                  <div className="grid gap-5 xl:grid-cols-[1.2fr_0.8fr]">
                    <div className="min-w-0 space-y-3">
                      <div className="flex flex-wrap items-center gap-2">
                        <Badge className={cn("border", toneClasses(details.asset.criticality_tone))} tone="neutral">
                          {details.asset.criticality_label} · {details.asset.criticality_score} pts
                        </Badge>
                        <Badge tone={details.asset.governance_score.tone === "success" ? "success" : details.asset.governance_score.tone === "accent" ? "accent" : details.asset.governance_score.tone === "warning" ? "warning" : "neutral"}>
                          Governança {details.asset.governance_score.score} pts
                        </Badge>
                        <Badge tone="neutral">Responsável: {details.asset.owner_name}</Badge>
                        {details.asset.data_owner_is_active === false ? <Badge tone="warning">Owner inativo</Badge> : null}
                      </div>
                      <div className="flex flex-wrap gap-2">
                        <Badge tone="neutral">Qualidade de dados: {details.asset.dq_status_label}</Badge>
                        <CertificationStatusBadge status={details.asset.certification_status} />
                        {details.asset.owner_review_due ? <Badge tone="warning">Revisão de responsável vencida</Badge> : null}
                        {details.asset.privacy_review_due ? <Badge tone="warning">Privacidade vencida</Badge> : null}
                        {details.asset.certification_review_due ? <Badge tone="warning">Revalidação pendente</Badge> : null}
                      </div>
                      <div className="space-y-1 text-sm text-text-body">
                        <p className="break-words">{details.asset.table_fqn}</p>
                        <p className="break-words">
                          {details.asset.database_name}.{details.asset.schema_name}
                        </p>
                      </div>
                    </div>
                    <div className="grid gap-3 rounded-2xl border border-border/80 bg-bg-subtle/80 p-4 text-sm text-text-body shadow-sm">
                      <div className="space-y-1">
                        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-muted">Fonte</p>
                        <p className="break-words font-medium text-text">{details.asset.datasource_name}</p>
                      </div>
                      <div className="space-y-1">
                        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-muted">Banco / schema</p>
                        <p className="break-words font-medium text-text">
                          {details.asset.database_name}.{details.asset.schema_name}
                        </p>
                      </div>
                      <div className="space-y-1">
                        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-muted">Sensibilidade</p>
                        <p className="break-words font-medium text-text">{details.asset.sensitivity_label}</p>
                      </div>
                    </div>
                  </div>

                  {(details.asset.owner_review_due || details.asset.privacy_review_due || details.asset.data_owner_is_active === false) ? (
                    <div className="flex flex-wrap gap-2 rounded-2xl border border-border/80 bg-bg-subtle/80 p-3 shadow-sm">
                      {details.asset.owner_review_due ? (
                        <Button onClick={() => void confirmReview("owner")} size="sm" variant="outline">
                          Confirmar revisão de owner
                        </Button>
                      ) : null}
                      {details.asset.privacy_review_due ? (
                        <Button onClick={() => void confirmReview("privacy")} size="sm" variant="outline">
                          Confirmar revisão de privacidade
                        </Button>
                      ) : null}
                      {details.asset.data_owner_is_active === false ? (
                        <Button asChild size="sm" variant="outline">
                          <Link href="/data-owners">Reatribuir owner</Link>
                        </Button>
                      ) : null}
                    </div>
                  ) : null}

                  <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
                    <div className="min-w-0 rounded-2xl border border-border/80 bg-bg-subtle/80 p-4 shadow-sm">
                      <p className="text-xs uppercase tracking-[0.16em] text-muted">Governança</p>
                      <p className="mt-2 text-2xl font-semibold text-text">{details.asset.governance_score.score}</p>
                      <p className="mt-1 text-sm text-text-body">{details.asset.governance_score.label}</p>
                    </div>
                    <div className="min-w-0 rounded-2xl border border-border/80 bg-bg-subtle/80 p-4 shadow-sm">
                      <p className="text-xs uppercase tracking-[0.16em] text-muted">Incidentes abertos</p>
                      <p className="mt-2 text-2xl font-semibold text-text">{details.asset.open_incidents}</p>
                    </div>
                    <div className="min-w-0 rounded-2xl border border-border/80 bg-bg-subtle/80 p-4 shadow-sm">
                      <p className="text-xs uppercase tracking-[0.16em] text-muted">Tags</p>
                      <p className="mt-2 text-2xl font-semibold text-text">{details.asset.tags_count}</p>
                    </div>
                    <div className="min-w-0 rounded-2xl border border-border/80 bg-bg-subtle/80 p-4 shadow-sm">
                      <p className="text-xs uppercase tracking-[0.16em] text-muted">Termos</p>
                      <p className="mt-2 text-2xl font-semibold text-text">{details.asset.terms_count}</p>
                    </div>
                    <div className="min-w-0 rounded-2xl border border-border/80 bg-bg-subtle/80 p-4 shadow-sm">
                      <p className="text-xs uppercase tracking-[0.16em] text-muted">Última revisão</p>
                      <p className="mt-2 text-sm font-semibold text-text">{details.asset.last_review_at ? formatDateTime(details.asset.last_review_at) : "Não avaliado"}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <div className="grid gap-6 xl:grid-cols-[1.08fr_0.92fr]">
                <Card className="border-border/80 bg-surface shadow-card">
                  <CardContent className="space-y-5 p-5 sm:p-6">
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-brand-600">Decomposição do score</p>
                      <h4 className="mt-2 text-lg font-semibold text-text">Por que este ativo entrou na fila prioritária</h4>
                    </div>
                    <div className="space-y-3">
                      {details.asset.score_factors.map((factor) => (
                        <div className={cn("rounded-2xl border p-4 shadow-sm", factor.applied ? "border-danger-200 bg-danger-50/70" : "border-border/80 bg-bg-subtle/80")} key={factor.key}>
                          <div className="flex items-start justify-between gap-3">
                            <div className="min-w-0">
                              <p className="break-words text-sm font-semibold text-text">{factor.label}</p>
                              <p className="mt-1 break-words text-sm leading-6 text-text-body">{factor.detail}</p>
                            </div>
                            <span className={cn("rounded-full px-2.5 py-1 text-xs font-semibold", factor.applied ? "bg-danger-100 text-danger-700" : "bg-slate-200 text-text-body")}>
                              {factor.applied ? `+${factor.points}` : "0"}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>

                <div className="space-y-6">
                  <Card className="border-border/80 bg-surface shadow-card">
                    <CardContent className="space-y-4 p-5">
                      <div>
                        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-brand-600">Próximas ações recomendadas</p>
                        <h4 className="mt-2 text-lg font-semibold text-text">O que fazer agora</h4>
                      </div>
                      {details.next_actions.length ? (
                        <div className="space-y-2">
                          {details.asset.actions.length ? details.asset.actions.map((action) => (
                            <div className="rounded-2xl border border-border/80 bg-bg-subtle/80 p-3 text-sm text-text-body shadow-sm" key={action.key}>
                              <div className="flex items-start gap-3">
                                <Sparkles className="mt-0.5 h-4 w-4 text-brand-600" />
                                <div>
                                  <p className="font-medium text-text">{action.label}</p>
                                  <p className="mt-1 text-text-body">{action.description}</p>
                                </div>
                              </div>
                              <div className="mt-3 pl-7">
                                <Button asChild size="sm" variant="outline">
                                  <Link href={action.href}>Abrir ação</Link>
                                </Button>
                              </div>
                            </div>
                          )) : details.next_actions.map((action) => (
                            <div className="flex items-start gap-3 rounded-2xl border border-border/80 bg-bg-subtle/80 p-3 text-sm text-text-body shadow-sm" key={action}>
                              <Sparkles className="mt-0.5 h-4 w-4 text-brand-600" />
                              <span>{action}</span>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div className="rounded-2xl border border-success-200 bg-success-50 p-4 text-sm text-success-700">
                          Nenhuma ação adicional foi sugerida para este ativo no recorte atual.
                        </div>
                      )}
                    </CardContent>
                  </Card>

                  <Card className="border-border/80 bg-surface shadow-card">
                    <CardContent className="space-y-4 p-5">
                      <div>
                        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-brand-600">Atalhos</p>
                        <h4 className="mt-2 text-lg font-semibold text-text">Navegação integrada</h4>
                      </div>
                      <div className="grid gap-2 sm:grid-cols-2">
                        <Button asChild variant="outline"><Link href={details.asset.links.explorer}>Abrir Explorer</Link></Button>
                        <Button asChild variant="outline"><Link href={details.asset.links.lineage}>Abrir Linhagem</Link></Button>
                        <Button asChild variant="outline"><Link href={details.asset.links.data_quality}>Abrir Qualidade de dados</Link></Button>
                        <Button asChild variant="outline"><Link href={details.asset.links.certification}>Abrir Certificação</Link></Button>
                        <Button asChild variant="outline"><Link href={details.asset.links.privacy}>Abrir Privacidade</Link></Button>
                        <Button asChild variant="outline"><Link href={details.asset.links.incidents}>Abrir Incidentes</Link></Button>
                        <Button asChild variant="outline"><Link href={details.asset.links.owners}>Abrir Owners</Link></Button>
                        <Button asChild variant="outline"><Link href={details.asset.links.audit}>Abrir Histórico</Link></Button>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              </div>

              <Card className="border-border/80 bg-surface shadow-card">
                <CardContent className="space-y-5 p-5 sm:p-6">
                  <div className="flex items-center gap-2">
                    <ShieldAlert className="h-4 w-4 text-muted" />
                    <p className="text-xs font-semibold uppercase tracking-[0.18em] text-brand-600">Incidentes relacionados</p>
                  </div>
                  {details.incidents.length ? (
                    <div className="space-y-3">
                      {details.incidents.map((incident) => (
                        <div className="rounded-2xl border border-border/80 bg-bg-subtle/80 p-4 shadow-sm" key={incident.id}>
                          <div className="flex flex-wrap items-start justify-between gap-3">
                            <div className="min-w-0">
                              <p className="break-words font-medium text-text">{incident.title}</p>
                              <p className="mt-1 break-words text-sm text-text-body">
                                {incident.detected_at ? formatDateTime(incident.detected_at) : "Sem data"} · {incident.occurrences} ocorrência(s)
                              </p>
                            </div>
                            <div className="flex gap-2">
                              <Badge tone="warning">{incident.severity.toUpperCase()}</Badge>
                              <Badge tone="neutral">{incident.status}</Badge>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="rounded-2xl border border-border/80 bg-bg-subtle/80 p-4 text-sm text-text-body shadow-sm">
                      Nenhum incidente relacionado encontrado para este ativo.
                    </div>
                  )}
                </CardContent>
              </Card>

              <Card className="border-border/80 bg-surface shadow-card">
                <CardContent className="grid gap-4 p-5 sm:grid-cols-2 xl:grid-cols-3 sm:p-6">
                  <div className="rounded-2xl border border-border/80 bg-bg-subtle/80 p-4 shadow-sm">
                    <div className="flex items-center gap-2 text-muted">
                      <CircleAlert className="h-4 w-4" />
                      <p className="text-xs font-semibold uppercase tracking-[0.16em]">Domínio</p>
                    </div>
                    <p className="mt-2 break-words text-sm font-medium text-text">{details.data_notes.domain}</p>
                  </div>
                  <div className="rounded-2xl border border-border/80 bg-bg-subtle/80 p-4 shadow-sm">
                    <div className="flex items-center gap-2 text-muted">
                      <Sparkles className="h-4 w-4" />
                      <p className="text-xs font-semibold uppercase tracking-[0.16em]">DQ</p>
                    </div>
                    <p className="mt-2 break-words text-sm font-medium text-text">{details.data_notes.dq_status}</p>
                  </div>
                  <div className="rounded-2xl border border-border/80 bg-bg-subtle/80 p-4 shadow-sm">
                    <div className="flex items-center gap-2 text-muted">
                      <UserCircle2 className="h-4 w-4" />
                      <p className="text-xs font-semibold uppercase tracking-[0.16em]">Elegibilidade</p>
                    </div>
                    <p className="mt-2 break-words text-sm font-medium text-text">{details.data_notes.eligibility}</p>
                  </div>
                </CardContent>
              </Card>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}
