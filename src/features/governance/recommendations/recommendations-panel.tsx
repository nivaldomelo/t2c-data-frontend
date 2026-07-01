import { Link } from "@/lib/next-shims";
import { useEffect, useMemo, useState } from "react";
import { ArrowRight, Ban, Check, Clock3, RefreshCcw, Sparkles, ShieldAlert, ShieldCheck } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/cn";

import { governanceSdk } from "../sdk";
import type {
  GovernanceRecommendationContextResponse,
  GovernanceRecommendationItem,
  GovernanceRecommendationListResponse,
} from "./types";

type RecommendationFilters = {
  q: string;
  status: string;
  severity: string;
  impact: string;
  source: string;
  datasource: string;
  domain: string;
  owner: string;
  minConfidence: string;
  maxConfidence: string;
  policyDriven: string;
};

const DEFAULT_FILTERS: RecommendationFilters = {
  q: "",
  status: "open",
  severity: "",
  impact: "",
  source: "",
  datasource: "",
  domain: "",
  owner: "",
  minConfidence: "",
  maxConfidence: "",
  policyDriven: "",
};

const EMPTY_RECOMMENDATION_ITEMS: GovernanceRecommendationItem[] = [];

function toneFromSeverity(severity: string): "danger" | "warning" | "accent" | "neutral" {
  if (severity === "critical") return "danger";
  if (severity === "high") return "warning";
  if (severity === "medium") return "accent";
  return "neutral";
}

function toneFromRisk(tone: string | null | undefined): "danger" | "warning" | "accent" | "neutral" {
  if (tone === "danger") return "danger";
  if (tone === "warning") return "warning";
  if (tone === "accent") return "accent";
  return "neutral";
}

function toneFromTrust(tone: string | null | undefined): "success" | "accent" | "warning" | "danger" | "neutral" {
  if (tone === "success") return "success";
  if (tone === "accent") return "accent";
  if (tone === "warning") return "warning";
  if (tone === "danger") return "danger";
  return "neutral";
}

function toneFromStatus(status: string): "success" | "warning" | "accent" | "neutral" {
  if (status === "applied" || status === "resolved") return "success";
  if (status === "dismissed") return "neutral";
  if (status === "snoozed") return "warning";
  return "accent";
}

function toneFromSource(source: string): "accent" | "neutral" | "warning" {
  if (source === "policy") return "accent";
  if (source === "assistant") return "warning";
  if (source === "quality" || source === "incidents") return "warning";
  return "neutral";
}

function formatDateTime(value?: string | null) {
  if (!value) return "Sem data";
  return new Date(value).toLocaleString("pt-BR");
}

function formatDate(value?: string | null) {
  if (!value) return "Sem histórico";
  return new Date(value).toLocaleDateString("pt-BR");
}

function toParams(filters: RecommendationFilters) {
  const params = new URLSearchParams();
  Object.entries(filters).forEach(([key, value]) => {
    if (!value.trim()) return;
    if (key === "policyDriven") {
      if (value === "policy") params.set("policy_driven", "true");
      if (value === "manual") params.set("policy_driven", "false");
      return;
    }
    if (key === "minConfidence") {
      params.set("min_confidence", value.trim());
      return;
    }
    if (key === "maxConfidence") {
      params.set("max_confidence", value.trim());
      return;
    }
    params.set(key, value.trim());
  });
  params.set("page", "1");
  params.set("page_size", "12");
  return params.toString();
}

function recommendationHeadline(item: GovernanceRecommendationItem) {
  return item.summary || item.action_label || item.recommendation_key;
}

function recommendationDetail(item: GovernanceRecommendationItem) {
  return item.reason || item.summary || item.action_label;
}

export function GovernanceRecommendationsPanel() {
  const [filters, setFilters] = useState<RecommendationFilters>(DEFAULT_FILTERS);
  const [payload, setPayload] = useState<GovernanceRecommendationListResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [reloadKey, setReloadKey] = useState(0);
  const [selectedIds, setSelectedIds] = useState<number[]>([]);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [selectedRecommendationRef, setSelectedRecommendationRef] = useState<string | null>(null);
  const [contextPayload, setContextPayload] = useState<GovernanceRecommendationContextResponse | null>(null);
  const [contextLoading, setContextLoading] = useState(false);
  const [contextError, setContextError] = useState("");
  const [resolutionNote, setResolutionNote] = useState("");
  const [batchSaving, setBatchSaving] = useState(false);
  const [assistantNote, setAssistantNote] = useState("");
  const [assistantActionKey, setAssistantActionKey] = useState<string | null>(null);

  const queryString = useMemo(() => toParams(filters), [filters]);
  const items = useMemo(() => payload?.items ?? EMPTY_RECOMMENDATION_ITEMS, [payload]);
  const selectedItem = useMemo(
    () =>
      (selectedRecommendationRef ? items.find((item) => item.key === selectedRecommendationRef) : null) ||
      items.find((item) => item.id === selectedId) ||
      items[0] ||
      null,
    [items, selectedId, selectedRecommendationRef],
  );
  const selectedIdsResolved = useMemo(
    () => (selectedIds.length > 0 ? selectedIds : selectedId ? [selectedId] : []),
    [selectedIds, selectedId],
  );
  const selectedItems = useMemo(() => items.filter((item) => selectedIdsResolved.includes(item.id)), [items, selectedIdsResolved]);
  const selectedPolicyIds = useMemo(
    () => selectedItems.filter((item) => item.policy_rule_key).map((item) => item.id),
    [selectedItems],
  );

  useEffect(() => {
    const controller = new AbortController();
    const timer = window.setTimeout(() => {
      setLoading(true);
      setError("");
      void (async () => {
        try {
          const response = await governanceSdk.listGovernanceRecommendations(
            `/v1/governance/recommendations?${queryString}`,
            { signal: controller.signal },
          );
          setPayload(response);
        } catch (err) {
          if ((err as Error).name === "AbortError") return;
          setError((err as Error).message);
        } finally {
          setLoading(false);
        }
      })();
    }, filters.q ? 250 : 0);

    return () => {
      controller.abort();
      window.clearTimeout(timer);
    };
  }, [queryString, filters.q, reloadKey]);

  useEffect(() => {
    const selectedRef = selectedItem?.key ?? null;
    if (!selectedItem || !selectedRef) {
      setContextPayload(null);
      setContextError("");
      setContextLoading(false);
      return;
    }
    const controller = new AbortController();
    let active = true;
    setContextLoading(true);
    setContextError("");
    void (async () => {
      try {
        const response = await governanceSdk.getGovernanceRecommendationContext(selectedRef, {
          signal: controller.signal,
        });
        if (!active) return;
        setContextPayload(response);
      } catch (err) {
        if (!active) return;
        const message = (err as Error).message;
        if (message.toLowerCase().includes("not found")) {
          setContextError("A recomendação selecionada não está mais disponível. Atualize a fila para carregar o contexto mais recente.");
        } else {
          setContextError(message);
        }
      } finally {
        if (active) setContextLoading(false);
      }
    })();
    return () => {
      active = false;
      controller.abort();
    };
  }, [selectedItem?.key, reloadKey]);

  useEffect(() => {
    if (!items.length) {
      setSelectedId((current) => (current === null ? current : null));
      setSelectedRecommendationRef((current) => (current === null ? current : null));
      setSelectedIds((current) => (current.length === 0 ? current : []));
      return;
    }
    setSelectedIds((current) => {
      const next = current.filter((itemId) => items.some((item) => item.id === itemId));
      if (next.length === current.length && next.every((itemId, index) => itemId === current[index])) {
        return current;
      }
      return next;
    });
    const currentItem =
      (selectedRecommendationRef ? items.find((item) => item.key === selectedRecommendationRef) : null) ||
      (selectedId ? items.find((item) => item.id === selectedId) : null);
    const nextItem = currentItem || items[0];
    if (nextItem) {
      setSelectedId((current) => (current === nextItem.id ? current : nextItem.id));
      setSelectedRecommendationRef((current) => (current === nextItem.key ? current : nextItem.key));
    }
  }, [items, selectedId, selectedRecommendationRef]);

  function updateFilter<K extends keyof RecommendationFilters>(key: K, value: string) {
    setFilters((current) => ({ ...current, [key]: value }));
  }

  function toggleSelection(itemId: number) {
    setSelectedIds((current) => {
      if (current.includes(itemId)) {
        return current.filter((value) => value !== itemId);
      }
      return [...current, itemId];
    });
  }

  function selectAllVisible() {
    setSelectedIds(items.map((item) => item.id));
  }

  function clearSelection() {
    setSelectedIds([]);
  }

  async function refreshRecommendations() {
    setReloadKey((current) => current + 1);
  }

  async function resolveBatch(action: "applied" | "dismissed" | "snoozed") {
    if (!selectedIdsResolved.length) return;
    setBatchSaving(true);
    try {
      await governanceSdk.resolveGovernanceRecommendations({
        recommendation_ids: selectedIdsResolved,
        resolution_action: action,
        resolution_note: resolutionNote.trim() || null,
      });
      clearSelection();
      setResolutionNote("");
      await refreshRecommendations();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBatchSaving(false);
    }
  }

  async function applyPolicyBatch() {
    if (!selectedPolicyIds.length) return;
    setBatchSaving(true);
    try {
      await governanceSdk.applyGovernancePolicyRecommendations({
        recommendation_ids: selectedPolicyIds,
        resolution_action: "policy_applied",
        resolution_note: resolutionNote.trim() || null,
      });
      clearSelection();
      setResolutionNote("");
      await refreshRecommendations();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBatchSaving(false);
    }
  }

  async function submitRecommendationFeedback(feedback_rating: "helpful" | "not_helpful") {
    const ref = contextPayload?.recommendation.key ?? selectedRecommendationRef;
    if (!ref) return;
    setAssistantActionKey(`feedback:${feedback_rating}`);
    try {
      await governanceSdk.submitGovernanceRecommendationFeedback(ref, {
        feedback_rating,
        feedback_note: assistantNote.trim() || null,
      });
      setAssistantNote("");
      await refreshRecommendations();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setAssistantActionKey(null);
    }
  }

  async function executeAssistantTool(toolKey: string, confirmationRequired: boolean, confirmationHint?: string | null) {
    const ref = contextPayload?.recommendation.key ?? selectedRecommendationRef;
    if (!ref) return;
    if (confirmationRequired) {
      const confirmed = window.confirm(confirmationHint || "Confirmar ação assistida?");
      if (!confirmed) return;
    }
    setAssistantActionKey(toolKey);
    try {
      await governanceSdk.executeGovernanceAssistantAction(ref, {
        tool_key: toolKey,
        confirm: true,
        resolution_note: assistantNote.trim() || null,
      });
      setAssistantNote("");
      await refreshRecommendations();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setAssistantActionKey(null);
    }
  }

  const summary = payload?.summary ?? null;
  const hasFilters = Object.values(filters).some((value) => value.trim());
  const assistantBusy = assistantActionKey !== null;

  return (
    <Card className="border-border bg-surface shadow-[0_12px_36px_rgba(15,23,42,0.05)]">
      <CardHeader className="space-y-4 pb-3">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="space-y-2">
            <div className="flex flex-wrap items-center gap-2">
              <Badge tone="accent">
                <Sparkles className="mr-1 h-3.5 w-3.5" />
                Fila principal de ação
              </Badge>
              <Badge tone="neutral">{payload ? `${payload.total} item(ns)` : "Calculando..."}</Badge>
            </div>
            <p className="text-sm leading-6 text-text-body">
              Recomendações priorizadas por risco, trust, SLA, incidentes e políticas. Cada item abre o ativo no Explorer
              para revisar evidência, contexto e próximos passos antes da decisão.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button onClick={() => void refreshRecommendations()} size="sm" variant="outline">
              <RefreshCcw className="mr-2 h-4 w-4" />
              Atualizar
            </Button>
          </div>
        </div>

        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
          <div className="xl:col-span-2">
            <Input
              onChange={(event) => updateFilter("q", event.target.value)}
              placeholder="Buscar por ativo, justificativa ou ação sugerida"
              value={filters.q}
            />
          </div>
          <Select onChange={(event) => updateFilter("status", event.target.value)} value={filters.status}>
            <option value="">Todos os status</option>
            {payload?.filters.statuses.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </Select>
          <Select onChange={(event) => updateFilter("severity", event.target.value)} value={filters.severity}>
            <option value="">Todas as severidades</option>
            {payload?.filters.severities.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </Select>
          <Select onChange={(event) => updateFilter("source", event.target.value)} value={filters.source}>
            <option value="">Todas as origens</option>
            {payload?.filters.sources.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </Select>
          <Select onChange={(event) => updateFilter("impact", event.target.value)} value={filters.impact}>
            <option value="">Todos os impactos</option>
            {payload?.filters.impacts.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </Select>
          <Select onChange={(event) => updateFilter("policyDriven", event.target.value)} value={filters.policyDriven}>
            <option value="">Todas as recomendações</option>
            <option value="policy">Somente políticas</option>
            <option value="manual">Sem política</option>
          </Select>
          <div className="xl:col-span-2">
            <Input
              onChange={(event) => updateFilter("owner", event.target.value)}
              placeholder="Filtrar por owner"
              value={filters.owner}
            />
          </div>
          <div>
            <Input
              onChange={(event) => updateFilter("domain", event.target.value)}
              placeholder="Filtrar por domínio"
              value={filters.domain}
            />
          </div>
          <div>
            <Input
              onChange={(event) => updateFilter("datasource", event.target.value)}
              placeholder="Filtrar por fonte"
              value={filters.datasource}
            />
          </div>
          <div>
            <Input
              onChange={(event) => updateFilter("minConfidence", event.target.value)}
              placeholder="Confiança mínima"
              type="number"
              value={filters.minConfidence}
            />
          </div>
          <div>
            <Input
              onChange={(event) => updateFilter("maxConfidence", event.target.value)}
              placeholder="Confiança máxima"
              type="number"
              value={filters.maxConfidence}
            />
          </div>
        </div>

        {summary ? (
          <div className="grid gap-3 md:grid-cols-3 xl:grid-cols-6">
            <div className="rounded-2xl border border-border bg-bg-subtle px-4 py-3">
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-muted">Abertas</p>
              <p className="mt-2 text-2xl font-semibold text-text">{summary.open_recommendations}</p>
            </div>
            <div className="rounded-2xl border border-border bg-bg-subtle px-4 py-3">
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-muted">Alta confiança</p>
              <p className="mt-2 text-2xl font-semibold text-text">{summary.high_confidence}</p>
            </div>
            <div className="rounded-2xl border border-border bg-bg-subtle px-4 py-3">
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-muted">Vencem logo</p>
              <p className="mt-2 text-2xl font-semibold text-text">{summary.due_soon}</p>
            </div>
            <div className="rounded-2xl border border-border bg-bg-subtle px-4 py-3">
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-muted">Por política</p>
              <p className="mt-2 text-2xl font-semibold text-text">{summary.policy_driven}</p>
            </div>
            <div className="rounded-2xl border border-border bg-bg-subtle px-4 py-3">
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-muted">Aplicadas recentes</p>
              <p className="mt-2 text-2xl font-semibold text-text">{summary.applied_recently}</p>
            </div>
            <div className="rounded-2xl border border-border bg-bg-subtle px-4 py-3">
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-muted">Dispensadas recentes</p>
              <p className="mt-2 text-2xl font-semibold text-text">{summary.dismissed_recently}</p>
            </div>
          </div>
        ) : null}

        <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-dashed border-border bg-bg-subtle/70 px-4 py-3">
          <div className="space-y-1 text-sm text-text-body">
            <p className="font-medium text-text">
              {selectedIdsResolved.length.toLocaleString("pt-BR")} selecionada(s)
            </p>
            <p>{hasFilters ? "Filtros ativos na fila de recomendações." : "Fila completa sem filtros adicionais."}</p>
            <p className="text-xs text-muted">
              {selectedPolicyIds.length.toLocaleString("pt-BR")} seleção(ões) pronta(s) para aplicação de políticas.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Button disabled={!items.length} onClick={selectAllVisible} size="sm" variant="outline">
              Selecionar visíveis
            </Button>
            <Button disabled={!selectedIdsResolved.length || batchSaving} onClick={() => void resolveBatch("applied")} size="sm">
              <Check className="mr-2 h-4 w-4" />
              Aprovar
            </Button>
            <Button
              disabled={!selectedIdsResolved.length || batchSaving}
              onClick={() => void resolveBatch("dismissed")}
              size="sm"
              variant="outline"
            >
              <Ban className="mr-2 h-4 w-4" />
              Rejeitar
            </Button>
            <Button
              disabled={!selectedPolicyIds.length || batchSaving}
              onClick={() => void applyPolicyBatch()}
              size="sm"
              variant="outline"
            >
              <Sparkles className="mr-2 h-4 w-4" />
              Aplicar políticas {selectedPolicyIds.length ? `(${selectedPolicyIds.length})` : ""}
            </Button>
            <Button
              disabled={!selectedIdsResolved.length || batchSaving}
              onClick={() => void resolveBatch("snoozed")}
              size="sm"
              variant="ghost"
            >
              <Clock3 className="mr-2 h-4 w-4" />
              Adiar
            </Button>
          </div>
        </div>

        <label className="space-y-2">
          <span className="text-sm font-medium text-text-body">Observação da decisão em lote</span>
          <Textarea
            className="min-h-[88px]"
            onChange={(event) => setResolutionNote(event.target.value)}
            placeholder="Opcional: registre por que a fila foi aprovada, dispensada ou adiada."
            value={resolutionNote}
          />
        </label>
      </CardHeader>

      <CardContent className="space-y-6">
        {loading ? (
          <div className="rounded-2xl border border-border bg-bg-subtle px-4 py-6 text-sm text-muted">
            Carregando recomendações...
          </div>
        ) : error ? (
          <EmptyState title="Não foi possível carregar recomendações" description={error} />
        ) : !payload || payload.items.length === 0 ? (
          <EmptyState
            title="Nenhuma recomendação encontrada"
            description="Ajuste os filtros ou espere a recomputação da governança para ver novos itens."
          />
        ) : (
          <div className="grid gap-4 xl:grid-cols-[1.25fr,0.95fr]">
            <div className="space-y-4">
              {items.map((item) => {
                const isSelected = item.id === selectedId;
                const isBatchSelected = selectedIds.includes(item.id);
                return (
                  <div
                    className={cn(
                      "w-full rounded-3xl border p-4 text-left transition",
                      isSelected
                        ? "border-info-200 bg-info-50 shadow-[0_10px_28px_rgba(14,165,233,0.09)]"
                        : "border-border bg-bg-subtle/80 hover:border-border-strong",
                    )}
                    key={item.id}
                    onClick={() => {
                      setSelectedId(item.id);
                      setSelectedRecommendationRef(item.key);
                    }}
                    onKeyDown={(event) => {
                      if (event.key === "Enter" || event.key === " ") {
                        event.preventDefault();
                        setSelectedId(item.id);
                        setSelectedRecommendationRef(item.key);
                      }
                    }}
                    role="button"
                    tabIndex={0}
                  >
                    <div className="flex items-start gap-3">
                      <input
                        checked={isBatchSelected}
                        className="mt-1 h-4 w-4 rounded border-border-strong text-info-600 focus:ring-info-500"
                        onChange={(event) => {
                          event.stopPropagation();
                          toggleSelection(item.id);
                        }}
                        onClick={(event) => event.stopPropagation()}
                        type="checkbox"
                      />
                      <div className="min-w-0 flex-1 space-y-3">
                        <div className="flex flex-wrap items-center gap-2">
                          <Badge tone={toneFromSeverity(item.severity)}>{item.severity_label}</Badge>
                          <Badge tone={toneFromSource(item.source_kind)}>{item.source_label}</Badge>
                          <Badge tone={toneFromStatus(item.status)}>{item.status_label}</Badge>
                          <Badge tone={toneFromRisk(item.risk_tone)}>{item.risk_label}</Badge>
                          <Badge tone={toneFromTrust(item.trust_tone)}>Trust {item.trust_score}</Badge>
                          <Badge tone="neutral">Confiança {item.confidence_score}%</Badge>
                        </div>
                        <div className="space-y-1">
                          <p className="text-base font-semibold text-text">{recommendationHeadline(item)}</p>
                          <p className="text-sm leading-6 text-text-body">{recommendationDetail(item)}</p>
                          <p className="text-xs text-muted">
                            Aging {item.aging_days.toLocaleString("pt-BR")} dia(s)
                            {item.due_at ? ` • Prazo ${formatDateTime(item.due_at)}` : ""}
                          </p>
                        </div>
                        <div className="flex flex-wrap items-center justify-between gap-3">
                          <div className="space-y-1">
                            <p className="text-xs font-medium text-muted">{item.table_fqn}</p>
                            <p className="text-xs text-muted">
                              {item.datasource_name} • {item.database_name} • {item.schema_name}
                              {item.domain_name ? ` • ${item.domain_name}` : ""}
                            </p>
                          </div>
                          <div className="flex flex-wrap items-center gap-2">
                            <Button asChild size="sm">
                              <Link href={item.links.explorer}>
                                Abrir ativo no Explorer
                                <ArrowRight className="ml-2 h-4 w-4" />
                              </Link>
                            </Button>
                            <Button asChild size="sm" variant="outline">
                              <Link href={item.links.change_management}>Mudanças e SLA</Link>
                            </Button>
                            <Button asChild size="sm" variant="ghost">
                              <Link href={item.links.certification}>Contexto</Link>
                            </Button>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="space-y-4">
              <Card className="border-border bg-surface shadow-none">
                <CardHeader className="pb-3">
                  <div className="flex items-center gap-2 text-sm font-semibold text-text-body">
                    <ShieldAlert className="h-4 w-4 text-success-600" />
                    Detalhe e explicação
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  {contextLoading ? (
                    <p className="text-sm text-muted">Carregando contexto do ativo...</p>
                  ) : contextError ? (
                    <p className="text-sm text-danger-600">{contextError}</p>
                  ) : contextPayload ? (
                    <>
                      <div className="space-y-2">
                        <div className="flex flex-wrap items-center gap-2">
                          <Badge tone={toneFromSeverity(contextPayload.recommendation.severity)}>
                            {contextPayload.recommendation.severity_label}
                          </Badge>
                          <Badge tone={toneFromRisk(contextPayload.recommendation.risk_tone)}>
                            {contextPayload.recommendation.risk_label}
                          </Badge>
                          <Badge tone={toneFromTrust(contextPayload.recommendation.trust_tone)}>
                            Trust {contextPayload.recommendation.trust_score}
                          </Badge>
                        </div>
                        <p className="text-base font-semibold text-text">
                          {recommendationHeadline(contextPayload.recommendation)}
                        </p>
                        <p className="text-sm leading-6 text-text-body">{contextPayload.assistant_summary}</p>
                        <Button asChild size="sm">
                          <Link href={contextPayload.recommendation.links.explorer}>
                            Abrir ativo no Explorer
                            <ArrowRight className="ml-2 h-4 w-4" />
                          </Link>
                        </Button>
                      </div>

                      {contextPayload.canonical_asset ? (
                        <div className="rounded-2xl border border-border bg-bg-subtle p-4">
                          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-muted">Núcleo canônico</p>
                          <p className="mt-2 text-sm font-medium text-text">
                            {String(contextPayload.canonical_asset.table_fqn || contextPayload.recommendation.table_fqn)}
                          </p>
                          <p className="mt-1 text-xs leading-5 text-muted">
                            {String(contextPayload.canonical_asset.domain_name || "Domínio não informado")}
                          </p>
                        </div>
                      ) : null}

                      {contextPayload.policy_matches.length > 0 ? (
                        <div className="space-y-2">
                          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-muted">Políticas aplicáveis</p>
                          <div className="space-y-2">
                            {contextPayload.policy_matches.slice(0, 4).map((match, index) => (
                              <div className="rounded-2xl border border-border bg-bg-subtle p-3 text-sm text-text-body" key={`${String(match.key || "policy")}-${index}`}>
                                <p className="font-medium text-text">{String(match.name || match.key || "Política")}</p>
                                <p className="mt-1 text-xs leading-5 text-muted">{String(match.description || "Política aplicada ao contexto do ativo.")}</p>
                              </div>
                            ))}
                          </div>
                        </div>
                      ) : null}

                      {contextPayload.playbooks.length > 0 ? (
                        <div className="space-y-2">
                          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-muted">Playbooks aplicáveis</p>
                          <div className="space-y-2">
                            {contextPayload.playbooks.slice(0, 3).map((playbook, index) => (
                              <div className="rounded-2xl border border-border bg-bg-subtle p-3 text-sm text-text-body" key={`${String(playbook.key || "playbook")}-${index}`}>
                                <div className="flex flex-wrap items-center justify-between gap-2">
                                  <p className="font-medium text-text">{String(playbook.title || playbook.key || "Playbook")}</p>
                                  <Badge tone="accent">{String(playbook.action_label || "Ação")}</Badge>
                                </div>
                                <p className="mt-1 text-xs leading-5 text-muted">
                                  {String(playbook.description || playbook.recommendation_detail || "Playbook derivado de política configurada.")}
                                </p>
                                <p className="mt-2 text-xs text-muted">
                                  Gatilho {String(playbook.trigger_key || "—")} • Prioridade {String(playbook.priority || 0)}
                                </p>
                              </div>
                            ))}
                          </div>
                        </div>
                      ) : null}

                      {contextPayload.trust_history.length > 0 ? (
                        <div className="space-y-2">
                          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-muted">Histórico de trust</p>
                          <div className="space-y-2">
                            {contextPayload.trust_history.slice(-5).map((entry, index) => (
                              <div className="flex items-center justify-between rounded-2xl border border-border bg-bg-subtle px-3 py-2 text-sm" key={`${String(entry.bucket_date)}-${index}`}>
                                <div>
                                  <p className="font-medium text-text">{formatDate(String(entry.bucket_date || ""))}</p>
                                  <p className="text-xs text-muted">{String(entry.label || "Trust")}</p>
                                </div>
                                <Badge tone="neutral">{String(entry.score || 0)}</Badge>
                              </div>
                            ))}
                          </div>
                        </div>
                      ) : null}

                      {contextPayload.recent_events.length > 0 ? (
                        <div className="space-y-2">
                          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-muted">Eventos recentes</p>
                          <div className="space-y-2">
                            {contextPayload.recent_events.slice(0, 5).map((event, index) => (
                              <div className="rounded-2xl border border-border bg-surface p-3" key={`${String(event.id || index)}`}>
                                <div className="flex items-center justify-between gap-2">
                                  <p className="text-sm font-medium text-text">{String(event.title || event.event_type || "Evento")}</p>
                                  <Badge tone="neutral">{String(event.category || "audit")}</Badge>
                                </div>
                                <p className="mt-1 text-xs leading-5 text-muted">
                                  {formatDateTime(String(event.occurred_at || ""))} • {String(event.source_label || "Sistema")}
                                </p>
                                {event.detail ? (
                                  <p className="mt-2 text-xs leading-5 text-text-body">{String(event.detail)}</p>
                                ) : null}
                              </div>
                            ))}
                          </div>
                        </div>
                      ) : null}

                      <div className="space-y-3 rounded-2xl border border-border bg-surface p-4">
                        <div className="flex flex-wrap items-start justify-between gap-3">
                          <div>
                            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-muted">Ações assistidas</p>
                            <p className="mt-1 text-sm leading-6 text-text-body">
                              A confirmação acontece antes da execução. Feedback ajuda a priorizar próximas recomendações.
                            </p>
                          </div>
                          {contextPayload.recommendation.feedback_label ? (
                            <Badge tone={toneFromTrust(contextPayload.recommendation.feedback_tone)}>
                              {contextPayload.recommendation.feedback_label}
                            </Badge>
                          ) : null}
                        </div>
                        <label className="space-y-2">
                          <span className="text-xs font-semibold uppercase tracking-[0.16em] text-muted">Observação opcional</span>
                          <Textarea
                            className="min-h-[84px]"
                            onChange={(event) => setAssistantNote(event.target.value)}
                            placeholder="Opcional: contexto para confirmação, feedback ou execução assistida."
                            value={assistantNote}
                          />
                        </label>
                        <div className="flex flex-wrap gap-2">
                          <Button
                            disabled={assistantBusy}
                            onClick={() => void submitRecommendationFeedback("helpful")}
                            size="sm"
                            variant="outline"
                          >
                            {assistantActionKey === "feedback:helpful" ? "Registrando..." : "Útil"}
                          </Button>
                          <Button
                            disabled={assistantBusy}
                            onClick={() => void submitRecommendationFeedback("not_helpful")}
                            size="sm"
                            variant="outline"
                          >
                            {assistantActionKey === "feedback:not_helpful" ? "Registrando..." : "Não útil"}
                          </Button>
                        </div>
                        {contextPayload.assistant_tools.length > 0 ? (
                          <div className="space-y-2">
                            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-muted">Ferramentas disponíveis</p>
                            <div className="grid gap-2">
                              {contextPayload.assistant_tools.map((tool) => (
                                <button
                                  className={cn(
                                    "rounded-2xl border px-4 py-3 text-left transition",
                                    assistantBusy && assistantActionKey !== tool.key
                                      ? "cursor-not-allowed border-border bg-bg-subtle opacity-60"
                                      : "border-border bg-bg-subtle hover:border-info-200 hover:bg-info-50",
                                  )}
                                  disabled={assistantBusy}
                                  key={tool.key}
                                  onClick={() => void executeAssistantTool(tool.key, tool.confirmation_required, tool.confirmation_hint)}
                                  type="button"
                                >
                                  <div className="flex flex-wrap items-start justify-between gap-3">
                                    <div>
                                      <p className="text-sm font-semibold text-text">{tool.label}</p>
                                      <p className="mt-1 text-xs leading-5 text-muted">{tool.description}</p>
                                    </div>
                                    <Badge tone={tool.kind === "feedback" ? "neutral" : "accent"}>
                                      {tool.kind}
                                    </Badge>
                                  </div>
                                </button>
                              ))}
                            </div>
                          </div>
                        ) : null}
                      </div>
                    </>
                  ) : (
                    <p className="text-sm text-muted">Selecione uma recomendação para ver explicação, políticas e contexto.</p>
                  )}
                </CardContent>
              </Card>

              <Card className="border-border bg-bg-subtle/80 shadow-none">
                <CardHeader className="pb-3">
                  <div className="flex items-center gap-2 text-sm font-semibold text-text-body">
                    <ShieldCheck className="h-4 w-4 text-info-600" />
                    Ação assistida
                  </div>
                </CardHeader>
                <CardContent className="space-y-3 text-sm text-text-body">
                  <p>
                    Esta fila é o fluxo contínuo de governança: revisar o ativo no Explorer, decidir em lote e registrar
                    aplicação, dispensa ou adiamento com nota contextual e trilha auditável.
                  </p>
                  <p>
                    O mesmo payload alimenta timeline, trust history e a explicação do ativo para preparar a camada de IA
                    assistida nas próximas fases.
                  </p>
                </CardContent>
              </Card>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
