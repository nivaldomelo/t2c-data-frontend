import { useEffect, useState } from "react";
import { Link } from "@/lib/next-shims";
import {
  ArrowRight,
  CheckCircle2,
  RefreshCcw,
  ShieldAlert,
  Sparkles,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/cn";

import { assistantSdk } from "../sdk";
import type {
  AssistantActionOption,
  AssistantDataOwnerOption,
  AssistantExplainResponse,
  AssistantRecommendation,
} from "../types";

type AssistantConfirmDialogProps = {
  busy?: boolean;
  confirmLabel: string;
  description: string;
  open: boolean;
  title: string;
  onCancel: () => void;
  onConfirm: () => void;
};

function AssistantConfirmDialog({
  busy = false,
  confirmLabel,
  description,
  open,
  title,
  onCancel,
  onConfirm,
}: AssistantConfirmDialogProps) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center bg-slate-950/60 p-4 backdrop-blur-md">
      <button aria-label="Fechar confirmação" className="absolute inset-0 cursor-default" onClick={onCancel} type="button" />
      <div
        aria-labelledby="assistant-confirm-title"
        aria-modal="true"
        className="relative w-full max-w-lg overflow-hidden rounded-3xl border border-border/80 bg-surface shadow-card"
        role="dialog"
      >
        <div className="border-b border-border/70 bg-[linear-gradient(135deg,#f8fafc_0%,#ffffff_48%,#f8fafc_100%)] px-6 py-5">
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <div className="flex h-10 w-10 items-center justify-center rounded-2xl border border-border bg-surface text-text-body shadow-sm">
                  <ShieldAlert className="h-5 w-5" />
                </div>
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-text-body">Confirmação necessária</p>
                  <h3 className="mt-1 text-xl font-semibold text-text" id="assistant-confirm-title">
                    {title}
                  </h3>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="space-y-4 px-6 py-5">
          <p className="text-sm leading-6 text-text-body">{description}</p>
        </div>

        <div className="border-t border-border/70 bg-bg-subtle/80 px-6 py-4">
          <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <Button onClick={onCancel} variant="outline">
              Cancelar
            </Button>
            <Button className={cn("bg-slate-950 text-white hover:bg-slate-900", busy && "opacity-80")} disabled={busy} onClick={onConfirm}>
              {busy ? "Processando..." : confirmLabel}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

type AssistantSidePanelProps = {
  assetLabel: string;
  assetRef: string | null;
  className?: string;
  onActionCompleted?: () => void;
  onPayloadChange?: (state: { payload: AssistantExplainResponse | null; loading: boolean; error: string }) => void;
};

type AssistantResultState = {
  detail: string;
  followUpHref: string | null;
  title: string;
};

type PendingAction = {
  action: AssistantActionOption;
  title: string;
  description: string;
  confirmLabel: string;
};

type AssistantAssetSignal = {
  type: string;
  severity: string;
};

type AssistantAssetIntelligence = {
  risk_score?: number;
  priority_score?: number;
  trust_score?: number;
  signals?: AssistantAssetSignal[];
  impact?: {
    dashboards?: number;
    users?: number;
  };
  recommended_actions?: string[];
};

function impactTone(tone?: string | null): "success" | "accent" | "warning" | "danger" | "neutral" {
  if (tone === "success") return "success";
  if (tone === "accent") return "accent";
  if (tone === "warning") return "warning";
  if (tone === "danger") return "danger";
  return "neutral";
}

function actionVariant(action: AssistantActionOption): "default" | "outline" | "danger" {
  if (action.destructive) return "danger";
  if (action.recommended) return "default";
  return "outline";
}

function recommendationTone(recommendation: AssistantRecommendation): "danger" | "warning" | "accent" | "neutral" {
  if (recommendation.destructive) return "danger";
  if ((recommendation.tone || "").toLowerCase() === "warning") return "warning";
  if ((recommendation.tone || "").toLowerCase() === "accent") return "accent";
  if ((recommendation.tone || "").toLowerCase() === "danger") return "danger";
  return "neutral";
}

function actionTone(action: AssistantActionOption): "danger" | "warning" | "accent" | "neutral" {
  if (action.destructive) return "danger";
  if (action.recommended) return "warning";
  if ((action.tone || "").toLowerCase() === "warning") return "warning";
  if ((action.tone || "").toLowerCase() === "accent") return "accent";
  if ((action.tone || "").toLowerCase() === "danger") return "danger";
  return "neutral";
}

function problemTone(severity?: string | null): "danger" | "warning" | "accent" | "neutral" {
  if (severity === "critical") return "danger";
  if (severity === "high") return "warning";
  if (severity === "warning") return "accent";
  return "neutral";
}

function signalTone(severity?: string | null): "danger" | "warning" | "accent" | "neutral" {
  if (severity === "critical") return "danger";
  if (severity === "high") return "warning";
  if (severity === "medium") return "accent";
  return "neutral";
}

function assetIntelligenceFromContext(context: Record<string, unknown> | undefined): AssistantAssetIntelligence | null {
  const value = context?.asset_intelligence;
  if (!value || typeof value !== "object") return null;
  return value as AssistantAssetIntelligence;
}

function formatOwnerLabel(owner: AssistantDataOwnerOption): string {
  const pieces = [owner.name, owner.email, owner.area].filter(Boolean);
  return pieces.join(" · ");
}

function describeEvidenceValue(value: unknown): string {
  if (value === null || value === undefined) return "n/d";
  if (typeof value === "string") return value;
  if (typeof value === "number" || typeof value === "boolean") return String(value);
  if (Array.isArray(value)) {
    const preview = value.slice(0, 3).map((item) => describeEvidenceValue(item)).filter(Boolean);
    return preview.length ? preview.join(", ") : "lista vazia";
  }
  if (typeof value === "object") {
    const record = value as Record<string, unknown>;
    const preferredKeys = ["label", "name", "title", "value", "id"];
    for (const key of preferredKeys) {
      const nested = record[key];
      if (nested !== null && nested !== undefined && nested !== "") {
        return `${key}: ${describeEvidenceValue(nested)}`;
      }
    }
    return "detalhe estruturado";
  }
  return String(value);
}

function summarizeEvidenceEntries(value: Record<string, unknown> | undefined, limit = 4) {
  return Object.entries(value ?? {})
    .filter(([, entryValue]) => entryValue !== null && entryValue !== undefined && entryValue !== "")
    .slice(0, limit)
    .map(([key, entryValue]) => ({
      key,
      value: describeEvidenceValue(entryValue),
    }));
}

export function AssistantSidePanel({ assetLabel, assetRef, className, onActionCompleted, onPayloadChange }: AssistantSidePanelProps) {
  const [payload, setPayload] = useState<AssistantExplainResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [reloadKey, setReloadKey] = useState(0);
  const [owners, setOwners] = useState<AssistantDataOwnerOption[]>([]);
  const [ownersLoading, setOwnersLoading] = useState(false);
  const [ownersError, setOwnersError] = useState("");
  const [selectedOwnerId, setSelectedOwnerId] = useState("");
  const [resolutionNote, setResolutionNote] = useState("");
  const [actionBusyKey, setActionBusyKey] = useState<string | null>(null);
  const [actionError, setActionError] = useState("");
  const [actionResult, setActionResult] = useState<AssistantResultState | null>(null);
  const [pendingAction, setPendingAction] = useState<PendingAction | null>(null);

  useEffect(() => {
    if (!assetRef) {
      setPayload(null);
      setError("");
      setLoading(false);
      return;
    }

    const controller = new AbortController();
    let active = true;
    setLoading(true);
    setError("");
    setActionError("");
    setActionResult(null);

    void (async () => {
      try {
        const response = await assistantSdk.explainAssistantAsset(assetRef, { signal: controller.signal });
        if (!active) return;
        setPayload(response);
      } catch (err) {
        if (!active || (err as Error).name === "AbortError") return;
        setError((err as Error).message);
      } finally {
        if (active) setLoading(false);
      }
    })();

    return () => {
      active = false;
      controller.abort();
    };
  }, [assetRef, reloadKey]);

  useEffect(() => {
    if (!assetRef) return;

    const controller = new AbortController();
    let active = true;
    setOwnersLoading(true);
    setOwnersError("");

    void (async () => {
      try {
        const response = await assistantSdk.listAssistantDataOwners({ signal: controller.signal });
        if (!active) return;
        setOwners(response);
        if (!selectedOwnerId && response.length === 1) {
          setSelectedOwnerId(String(response[0].id));
        }
      } catch (err) {
        if (!active || (err as Error).name === "AbortError") return;
        setOwnersError((err as Error).message);
      } finally {
        if (active) setOwnersLoading(false);
      }
    })();

    return () => {
      active = false;
      controller.abort();
    };
  }, [assetRef]);

  useEffect(() => {
    setSelectedOwnerId("");
    setResolutionNote("");
    setActionError("");
    setActionResult(null);
    setPendingAction(null);
    setOwners([]);
    setOwnersError("");
    setOwnersLoading(false);
  }, [assetRef]);

  const recommendedAction = payload?.recommendation ?? null;
  const actions = payload?.actions ?? [];
  const assetIntelligence = assetIntelligenceFromContext(payload?.context);
  const assetSignals = assetIntelligence?.signals ?? [];
  const hasInsightSections = Boolean(payload && (payload.problems.length > 0 || payload.impact.length > 0 || actions.length > 0));

  async function runAction(action: AssistantActionOption, confirm = false) {
    if (!assetRef || !payload) return;

    if (action.requires_owner_id && !selectedOwnerId) {
      setActionError("Selecione um owner para criar a solicitação.");
      return;
    }

    if (action.confirmation_required && !confirm) {
      setPendingAction({
        action,
        title: action.destructive ? `Confirmar ${action.label.toLowerCase()}` : action.label,
        description: action.confirmation_hint || "Essa ação será registrada e precisa de confirmação explícita antes de seguir.",
        confirmLabel:
          action.key === "reprocess_pipeline" ? "Reprocessar" : action.key === "open_incident" ? "Abrir incidente" : "Confirmar",
      });
      return;
    }

    setActionBusyKey(action.key);
    setActionError("");
    setActionResult(null);

    try {
      const response = await assistantSdk.executeAssistantAction(assetRef, {
        action_key: action.key,
        confirm: action.confirmation_required || confirm,
        data_owner_id: action.requires_owner_id ? Number(selectedOwnerId) : null,
        resolution_note: resolutionNote.trim() || null,
      });
      setActionResult({
        title: response.message,
        detail: response.result?.message ? String(response.result.message) : "A ação foi registrada com sucesso.",
        followUpHref: response.follow_up_href ?? null,
      });
      setReloadKey((current) => current + 1);
      onActionCompleted?.();
    } catch (err) {
      setActionError((err as Error).message);
    } finally {
      setActionBusyKey(null);
      setPendingAction(null);
    }
  }

  const canShowContent = Boolean(assetRef && payload);

  useEffect(() => {
    onPayloadChange?.({ payload, loading, error });
  }, [error, loading, onPayloadChange, payload]);

  return (
    <>
      <Card className={cn("overflow-hidden border-border/80 bg-surface shadow-card", className)}>
        <CardContent className="space-y-4 p-4">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <div className="flex h-9 w-9 items-center justify-center rounded-2xl border border-brand-200 bg-brand-50 text-brand-700 shadow-sm">
                  <Sparkles className="h-4 w-4" />
                </div>
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-brand-600">Assistente inteligente</p>
                  <h3 className="mt-1 text-base font-semibold text-text">O que está errado?</h3>
                </div>
              </div>
              <p className="mt-2 text-xs text-muted">Análise explicável baseada nos sinais já consolidados no Explorer.</p>
            </div>
            <Button className="h-8 shrink-0 px-3 text-xs" onClick={() => setReloadKey((current) => current + 1)} size="sm" variant="ghost">
              <RefreshCcw className="h-3.5 w-3.5" />
              Recarregar
            </Button>
          </div>

          <div className="rounded-2xl border border-border/80 bg-bg-subtle/70 px-3 py-2">
            <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-muted">Ativo analisado</p>
            <p className="mt-1 text-sm font-semibold text-text">{assetLabel}</p>
            <p className="mt-1 break-all text-xs text-muted">{assetRef || "Selecione uma tabela para obter uma leitura assistida."}</p>
          </div>

          {loading ? (
            <div className="space-y-3">
              <div className="h-24 animate-pulse rounded-2xl bg-bg-subtle" />
              <div className="h-24 animate-pulse rounded-2xl bg-bg-subtle" />
            </div>
          ) : null}

          {!loading && error ? (
            <EmptyState
              action={
                <Button onClick={() => setReloadKey((current) => current + 1)} size="sm" variant="outline">
                  <RefreshCcw className="h-3.5 w-3.5" />
                  Tentar novamente
                </Button>
              }
              className="shadow-none"
              title="Não foi possível carregar a explicação"
              description={error}
            />
          ) : null}

          {actionError ? (
            <div className="rounded-2xl border border-danger-200 bg-danger-50 px-3 py-2 text-sm text-danger-900">{actionError}</div>
          ) : null}

          {actionResult ? (
            <div className="space-y-2 rounded-2xl border border-success-200 bg-success-50 px-3 py-3">
              <div className="flex items-start gap-2">
                <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-success-700" />
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-emerald-950">{actionResult.title}</p>
                  <p className="mt-1 text-sm text-success-700">{actionResult.detail}</p>
                </div>
              </div>
              {actionResult.followUpHref ? (
                <Button asChild className="h-8 px-3 text-xs" size="sm" variant="outline">
                  <Link href={actionResult.followUpHref}>Abrir próximo passo</Link>
                </Button>
              ) : null}
            </div>
          ) : null}

          {canShowContent && payload ? (
            <div className="space-y-4">
              <div className="flex flex-wrap gap-2">
                <Badge tone={payload.asset_owner_defined ? "success" : "warning"}>{payload.asset_owner_defined ? "Owner definido" : "Owner pendente"}</Badge>
                <Badge tone={payload.sla_defined ? "accent" : "warning"}>{payload.sla_defined ? "SLA ativo" : "SLA ausente"}</Badge>
                <Badge tone={recommendedAction?.tone === "danger" ? "danger" : recommendedAction?.tone === "warning" ? "warning" : "neutral"}>
                  {recommendedAction?.label || "Monitorar"}
                </Badge>
              </div>

              <div className="space-y-2 rounded-2xl border border-border/80 bg-surface p-4 shadow-sm">
                <p className="text-sm font-semibold text-text">Resumo</p>
                <p className="text-sm font-semibold text-text">{payload.summary}</p>
                <div className="flex flex-wrap gap-2 text-xs text-muted">
                  <span className="rounded-full border border-border bg-bg-subtle px-2.5 py-1">Owner: {payload.asset_owner_name || "não definido"}</span>
                  <span className="rounded-full border border-border bg-bg-subtle px-2.5 py-1">
                    SLA: {payload.sla_defined ? `${payload.sla_hours ?? "?"}h` : "indisponível"}
                  </span>
                  {assetIntelligence ? (
                    <>
                      <span className="rounded-full border border-border bg-bg-subtle px-2.5 py-1">
                        Risco: {assetIntelligence.risk_score ?? 0}/100
                      </span>
                      <span className="rounded-full border border-border bg-bg-subtle px-2.5 py-1">
                        Prioridade: {assetIntelligence.priority_score ?? 0}/100
                      </span>
                    </>
                  ) : null}
                </div>
              </div>

              {hasInsightSections ? (
                <>
                  <details className="rounded-2xl border border-border/80 bg-surface p-4 shadow-sm" open>
                <summary className="flex cursor-pointer list-none items-center justify-between gap-3">
                  <div>
                    <p className="text-sm font-semibold text-text">Problemas encontrados</p>
                    <p className="mt-1 text-xs text-muted">Problemas explicados a partir dos sinais reais do ativo.</p>
                  </div>
                  <Badge tone="neutral">{payload.problems.length} problema(s)</Badge>
                </summary>
                <div className="mt-3 space-y-3">
                  {assetSignals.length ? (
                    <div className="flex flex-wrap gap-2">
                      {assetSignals.slice(0, 8).map((signal) => (
                        <Badge key={`${signal.type}-${signal.severity}`} tone={signalTone(signal.severity)}>
                          {signal.type}
                        </Badge>
                      ))}
                    </div>
                  ) : null}
                  {payload.problems.length ? (
                    <div className="max-h-64 space-y-2 overflow-y-auto pr-1">
                      {payload.problems.map((problem) => (
                        <div className="rounded-2xl border border-border/70 bg-bg-subtle/80 px-3 py-2" key={problem.key}>
                          <div className="flex items-start justify-between gap-3">
                            <div>
                              <p className="text-sm font-medium text-text">{problem.label}</p>
                              <p className="mt-1 text-sm text-text-body">{problem.detail}</p>
                              {problem.action_hint ? <p className="mt-1 text-xs text-muted">{problem.action_hint}</p> : null}
                            </div>
                            <Badge tone={problemTone(problem.severity)}>{problem.severity}</Badge>
                          </div>
                          {problem.href ? (
                            <Button asChild className="mt-2 h-8 px-3 text-xs" size="sm" variant="ghost">
                              <Link href={problem.href}>Abrir evidência</Link>
                            </Button>
                          ) : null}
                          {summarizeEvidenceEntries(problem.evidence).length ? (
                            <div className="mt-3 rounded-2xl border border-border/70 bg-surface px-3 py-2">
                              <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-muted">Evidências</p>
                              <div className="mt-2 flex flex-wrap gap-2">
                                {summarizeEvidenceEntries(problem.evidence).map((item) => (
                                  <span className="rounded-full border border-border/70 bg-bg-subtle px-2.5 py-1 text-[11px] text-text-body" key={`${problem.key}-${item.key}`}>
                                    {item.key}: {item.value}
                                  </span>
                                ))}
                              </div>
                            </div>
                          ) : null}
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm text-text-body">Nenhum problema consolidado para este ativo.</p>
                  )}
                </div>
                  </details>

                  <details className="rounded-2xl border border-border/80 bg-surface p-4 shadow-sm">
                <summary className="flex cursor-pointer list-none items-center justify-between gap-3">
                  <div>
                    <p className="text-sm font-semibold text-text">Impacto</p>
                    <p className="mt-1 text-xs text-muted">Como esse estado afeta uso, confiança e operação.</p>
                  </div>
                  <Badge tone="neutral">{payload.impact.length} impacto(s)</Badge>
                </summary>
                <div className="mt-3">
                  {payload.impact.length ? (
                    <div className="max-h-56 space-y-2 overflow-y-auto pr-1">
                      {payload.impact.map((item) => (
                        <div className="rounded-2xl border border-border/70 bg-bg-subtle/80 px-3 py-2" key={item.key}>
                          <div className="flex items-start justify-between gap-3">
                            <div>
                              <p className="text-sm font-medium text-text">{item.label}</p>
                              <p className="mt-1 text-sm text-text-body">{item.detail}</p>
                            </div>
                            <Badge tone={impactTone(item.tone)}>{item.tone || "neutral"}</Badge>
                          </div>
                          {summarizeEvidenceEntries(item.evidence).length ? (
                            <div className="mt-3 rounded-2xl border border-border/70 bg-surface px-3 py-2">
                              <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-muted">Evidências</p>
                              <div className="mt-2 flex flex-wrap gap-2">
                                {summarizeEvidenceEntries(item.evidence).map((entry) => (
                                  <span className="rounded-full border border-border/70 bg-bg-subtle px-2.5 py-1 text-[11px] text-text-body" key={`${item.key}-${entry.key}`}>
                                    {entry.key}: {entry.value}
                                  </span>
                                ))}
                              </div>
                            </div>
                          ) : null}
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm text-text-body">Nenhum impacto adicional foi consolidado para este ativo.</p>
                  )}
                </div>
                  </details>

                  <details className="rounded-2xl border border-border/80 bg-surface p-4 shadow-sm" open>
                <summary className="flex cursor-pointer list-none items-center justify-between gap-3">
                  <div>
                    <p className="text-sm font-semibold text-text">Ações recomendadas</p>
                    <p className="mt-1 text-xs text-muted">Ações assistidas, auditáveis e com confirmação onde necessário.</p>
                  </div>
                  {recommendedAction ? <Badge tone={recommendationTone(recommendedAction)}>{recommendedAction.action_label}</Badge> : null}
                </summary>

                <div className="mt-3 space-y-3">
                  {recommendedAction ? (
                    <div className="rounded-2xl border border-border/70 bg-bg-subtle/80 px-3 py-3">
                      <p className="text-sm font-semibold text-text">{recommendedAction.label}</p>
                      <p className="mt-1 text-sm text-text-body">{recommendedAction.detail}</p>
                      {recommendedAction.href ? (
                        <Button asChild className="mt-3 h-8 px-3 text-xs" size="sm" variant="outline">
                          <Link href={recommendedAction.href}>
                            Abrir contexto
                            <ArrowRight className="h-3.5 w-3.5" />
                          </Link>
                        </Button>
                      ) : null}
                    </div>
                  ) : null}

                  {actions.length ? (
                    <div className="max-h-80 space-y-2 overflow-y-auto pr-1">
                    {actions.map((action) => {
                      const active = action.key === recommendedAction?.action_key;
                      const busy = actionBusyKey === action.key;
                      const disabled = Boolean(action.can_execute === false) || busy;
                      const buttonLabel = busy
                        ? "Processando..."
                        : action.recommended
                          ? action.label
                          : action.destructive
                            ? `Executar ${action.label.toLowerCase()}`
                            : action.label;

                      return (
                        <div className="rounded-2xl border border-border/70 bg-bg-subtle/80 px-3 py-3" key={action.key}>
                          <div className="flex items-start justify-between gap-3">
                            <div className="min-w-0">
                              <div className="flex flex-wrap items-center gap-2">
                                <p className="text-sm font-medium text-text">{action.label}</p>
                                {active ? <Badge tone="accent">Recomendado</Badge> : null}
                                {action.destructive ? <Badge tone="danger">Requer confirmação</Badge> : null}
                              </div>
                              <p className="mt-1 text-sm text-text-body">{action.description}</p>
                              {action.disabled_reason ? <p className="mt-1 text-xs text-muted">{action.disabled_reason}</p> : null}
                            </div>
                          </div>

                          {action.key === "define_owner" ? (
                            <div className="mt-3 space-y-2">
                              <Select
                                className="h-9"
                                disabled={ownersLoading || disabled}
                                onChange={(event) => setSelectedOwnerId(event.target.value)}
                                value={selectedOwnerId}
                              >
                                <option value="">{ownersLoading ? "Carregando owners..." : "Selecione um owner"}</option>
                                {owners.map((owner) => (
                                  <option key={owner.id} value={owner.id}>
                                    {formatOwnerLabel(owner)}
                                  </option>
                                ))}
                              </Select>
                              {ownersError ? <p className="text-xs text-danger-700">{ownersError}</p> : null}
                              <Textarea
                                className="min-h-[84px]"
                                onChange={(event) => setResolutionNote(event.target.value)}
                                placeholder="Observação opcional para a solicitação de change management"
                                value={resolutionNote}
                              />
                              <div className="flex flex-wrap gap-2">
                                <Button
                                  disabled={disabled || !selectedOwnerId}
                                  onClick={() => void runAction(action)}
                                  size="sm"
                                  variant={active ? "default" : "outline"}
                                >
                                  {buttonLabel}
                                </Button>
                                {action.href ? (
                                  <Button asChild size="sm" variant="ghost">
                                    <Link href={action.href}>Abrir mudança</Link>
                                  </Button>
                                ) : null}
                              </div>
                            </div>
                          ) : (
                            <div className="mt-3 flex flex-wrap gap-2">
                              <Button
                                disabled={disabled || action.can_execute === false}
                                onClick={() => void runAction(action)}
                                size="sm"
                                variant={actionVariant(action)}
                              >
                                {buttonLabel}
                              </Button>
                              {action.href ? (
                                <Button asChild size="sm" variant="ghost">
                                  <Link href={action.href}>Abrir contexto</Link>
                                </Button>
                              ) : null}
                            </div>
                          )}
                        </div>
                      );
                    })}
                    </div>
                  ) : null}
                </div>
                  </details>

                  <details className="rounded-2xl border border-border/80 bg-surface p-4 shadow-sm">
                    <summary className="flex cursor-pointer list-none items-center justify-between gap-3">
                      <div>
                        <p className="text-sm font-semibold text-text">Evidências</p>
                        <p className="mt-1 text-xs text-muted">Trechos de contexto e sinais consolidados usados na leitura.</p>
                      </div>
                      <Badge tone="neutral">{summarizeEvidenceEntries(payload.context).length} campo(s)</Badge>
                    </summary>
                    <div className="mt-3 space-y-3">
                      {summarizeEvidenceEntries(payload.context).length ? (
                        <div className="flex flex-wrap gap-2">
                          {summarizeEvidenceEntries(payload.context).map((entry) => (
                            <span className="rounded-full border border-border/70 bg-bg-subtle px-2.5 py-1 text-xs text-text-body" key={`context-${entry.key}`}>
                              {entry.key}: {entry.value}
                            </span>
                          ))}
                        </div>
                      ) : (
                        <p className="text-sm text-text-body">Nenhuma evidência adicional consolidada.</p>
                      )}
                    </div>
                  </details>
                </>
              ) : (
                <EmptyState
                  className="shadow-none"
                  title="Nenhum insight crítico encontrado para este ativo."
                  description="O assistente não consolidou problemas, impactos ou ações relevantes neste momento."
                />
              )}
            </div>
          ) : null}

          {!loading && !error && !assetRef ? (
            <EmptyState
              className="shadow-none"
              title="Selecione uma tabela para usar o assistente"
              description="O painel assistido aparece quando o Explorer estiver com uma tabela carregada."
            />
          ) : null}
        </CardContent>
      </Card>

      <AssistantConfirmDialog
        busy={actionBusyKey !== null}
        confirmLabel={pendingAction?.confirmLabel || "Confirmar"}
        description={pendingAction?.description || ""}
        open={pendingAction !== null}
        title={pendingAction?.title || "Confirmar ação"}
        onCancel={() => setPendingAction(null)}
        onConfirm={() => {
          if (!pendingAction) return;
          void runAction(pendingAction.action, true);
        }}
      />
    </>
  );
}
