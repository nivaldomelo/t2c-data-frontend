import { Link } from "@/lib/next-shims";
import { useEffect, useMemo, useState, type ReactNode } from "react";
import {
  ArrowRight,
  BadgeCheck,
  BookOpen,
  CheckCircle2,
  Eye,
  Filter,
  RefreshCw,
  Sparkles,
  Tag,
  TriangleAlert,
  XCircle,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { DangerConfirmDialog } from "@/components/ui/danger-confirm-dialog";
import { EmptyState } from "@/components/ui/empty-state";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { InfoTooltip } from "@/components/ui/tooltip";
import { apiRequest } from "@/lib/client-api";
import { cn } from "@/lib/cn";
import type { CanonicalAssetContext } from "@/features/explorer/types";

import type {
  ClassificationReviewBatchPromoteResponse,
  ClassificationReviewFilters,
  ClassificationReviewItem,
  ClassificationReviewResponse,
  ClassificationReviewSignal,
  ClassificationReviewSummary,
  ClassificationReviewTag,
  ClassificationReviewTerm,
} from "./types";

type NoticeState = {
  tone: "success" | "warning" | "danger" | "neutral";
  text: string;
} | null;

const DEFAULT_FILTERS: ClassificationReviewFilters = {
  q: "",
  kind: "",
  entity_level: "",
  review_status: "",
  source: "",
  datasource: "",
  schema_name: "",
  domain: "",
  owner: "",
  tag: "",
  min_confidence: "",
  max_confidence: "",
  contains_pii: false,
  contains_sensitive: false,
  contains_critical: false,
  sort_by: "risk_desc",
};

const PAGE_SIZE = 25;

function badgeToneFromKind(kind: string): "neutral" | "accent" | "warning" | "success" | "danger" {
  if (kind === "suggestion") return "accent";
  if (kind === "gap") return "warning";
  if (kind === "conflict") return "danger";
  return "neutral";
}

function badgeToneFromStatus(status: string): "neutral" | "accent" | "warning" | "success" | "danger" {
  if (status === "pending_review" || status === "suggested") return "warning";
  if (status === "manual_applied") return "success";
  if (status === "blocked") return "neutral";
  if (status === "gap") return "warning";
  if (status === "conflict") return "danger";
  if (status === "applied") return "success";
  return "neutral";
}

function badgeToneFromRisk(riskScore: number): "neutral" | "accent" | "warning" | "success" | "danger" {
  if (riskScore >= 80) return "danger";
  if (riskScore >= 60) return "warning";
  if (riskScore >= 35) return "accent";
  return "neutral";
}

function badgeToneFromTrust(trustScore: number): "neutral" | "accent" | "warning" | "success" | "danger" {
  if (trustScore >= 85) return "success";
  if (trustScore >= 70) return "accent";
  if (trustScore >= 50) return "warning";
  return "danger";
}

function badgeToneFromSignal(tone?: string | null): "neutral" | "accent" | "warning" | "success" | "danger" {
  if (tone === "danger") return "danger";
  if (tone === "warning") return "warning";
  if (tone === "success") return "success";
  if (tone === "accent") return "accent";
  return "neutral";
}

function formatDateTime(value?: string | null): string {
  if (!value) return "-";
  return new Date(value).toLocaleString("pt-BR");
}

function formatPercent(value: number): string {
  return `${value}%`;
}

function buildQueryString(filters: ClassificationReviewFilters, page: number): string {
  const params = new URLSearchParams();
  Object.entries(filters).forEach(([key, value]) => {
    if (typeof value === "boolean") {
      if (value) params.set(key, "true");
      return;
    }
    if (typeof value === "string" && value.trim()) {
      params.set(key, value.trim());
    }
  });
  params.set("page", String(page));
  params.set("page_size", String(PAGE_SIZE));
  return params.toString();
}

function parseEventId(key: string): number | null {
  if (!key.startsWith("suggestion:")) return null;
  const value = Number(key.slice("suggestion:".length));
  return Number.isFinite(value) ? value : null;
}

function parseGapTableId(key: string): number | null {
  if (!key.startsWith("gap:")) return null;
  const value = Number(key.slice("gap:".length));
  return Number.isFinite(value) ? value : null;
}

function itemTitle(item: ClassificationReviewItem): string {
  return item.entity_level === "column" && item.column_name
    ? `${item.table_fqn} · ${item.column_name}`
    : item.table_fqn;
}

function itemSubtitle(item: ClassificationReviewItem): string {
  const parts = [item.datasource_name, item.database_name, item.schema_name];
  return parts.filter(Boolean).join(" · ");
}

function itemGroupLabel(item: ClassificationReviewItem): string {
  if (item.kind === "conflict") return "Conflito";
  if (item.kind === "gap") return "Lacuna";
  if (item.entity_level === "column") return "Coluna";
  return "Tabela";
}

function tagChipTone(tag: ClassificationReviewTag): "neutral" | "accent" | "warning" | "success" | "danger" {
  if (tag.review_status === "blocked") return "neutral";
  if (tag.review_status === "manual_applied") return "success";
  if (tag.review_status === "pending_review" || tag.review_status === "suggested") return "warning";
  if (tag.applied_automatically) return "accent";
  return "neutral";
}

function signalTone(signal: ClassificationReviewSignal): "neutral" | "accent" | "warning" | "success" | "danger" {
  return badgeToneFromSignal(signal.tone);
}

function badgeToneFromConfidence(confidenceScore: number): "neutral" | "accent" | "warning" | "success" | "danger" {
  if (confidenceScore >= 80) return "success";
  if (confidenceScore >= 60) return "accent";
  if (confidenceScore >= 40) return "warning";
  return "neutral";
}

function reviewStatusLabel(status: string): string {
  if (status === "pending_review" || status === "suggested") return "Pendente";
  if (status === "manual_applied") return "Aplicada manualmente";
  if (status === "blocked") return "Bloqueada";
  if (status === "gap") return "Lacuna";
  if (status === "conflict") return "Conflito";
  if (status === "applied") return "Aplicada";
  return status;
}

export function ClassificationReviewPage() {
  const [filters, setFilters] = useState<ClassificationReviewFilters>(DEFAULT_FILTERS);
  const [page, setPage] = useState(1);
  const [payload, setPayload] = useState<ClassificationReviewResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [reloadKey, setReloadKey] = useState(0);
  const [selectedKey, setSelectedKey] = useState<string | null>(null);
  const [selectedKeys, setSelectedKeys] = useState<string[]>([]);
  const [busyAction, setBusyAction] = useState<string | null>(null);
  const [notice, setNotice] = useState<NoticeState>(null);
  const [blockDialogOpen, setBlockDialogOpen] = useState(false);
  const [blockDialogIds, setBlockDialogIds] = useState<number[]>([]);
  const [promoteDialogOpen, setPromoteDialogOpen] = useState(false);
  const [promoteDialogTableIds, setPromoteDialogTableIds] = useState<number[]>([]);
  const [canonicalAsset, setCanonicalAsset] = useState<CanonicalAssetContext | null>(null);
  const [canonicalLoading, setCanonicalLoading] = useState(false);
  const [canonicalError, setCanonicalError] = useState("");

  const queryString = useMemo(() => buildQueryString(filters, page), [filters, page]);
  const totalPages = Math.max(1, Math.ceil((payload?.total || 0) / PAGE_SIZE));
  const selectedItem = useMemo(
    () => payload?.items.find((item) => item.key === selectedKey) ?? payload?.items[0] ?? null,
    [payload, selectedKey],
  );
  const visibleKeys = useMemo(() => (payload?.items || []).map((item) => item.key), [payload]);
  const selectedSuggestionIds = useMemo(
    () =>
      selectedKeys
        .map((key) => parseEventId(key))
        .filter((value): value is number => value !== null),
    [selectedKeys],
  );
  const selectedGapTableIds = useMemo(
    () =>
      selectedKeys
        .map((key) => parseGapTableId(key))
        .filter((value): value is number => value !== null),
    [selectedKeys],
  );
  const selectedSuggestionsCount = selectedSuggestionIds.length;
  const selectedGapCount = selectedGapTableIds.length;
  const allVisibleSelected = visibleKeys.length > 0 && selectedKeys.length === visibleKeys.length;

  useEffect(() => {
    if (!selectedItem) {
      setCanonicalAsset(null);
      setCanonicalLoading(false);
      setCanonicalError("");
      return;
    }
    let cancelled = false;
    setCanonicalLoading(true);
    setCanonicalError("");
    void (async () => {
      try {
        const route =
          selectedItem.entity_level === "column" && selectedItem.column_id
            ? `/v1/catalog/columns/${selectedItem.column_id}/canonical-context`
            : `/v1/catalog/tables/${selectedItem.table_id}/canonical-context`;
        const response = await apiRequest<CanonicalAssetContext>(route);
        if (cancelled) return;
        setCanonicalAsset(response);
      } catch (error) {
        if (cancelled) return;
        setCanonicalAsset(null);
        setCanonicalError(error instanceof Error ? error.message : "Falha ao carregar o núcleo canônico.");
      } finally {
        if (!cancelled) setCanonicalLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [selectedItem]);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      setLoading(true);
      setError("");
      try {
        const response = await apiRequest<ClassificationReviewResponse>(`/governance/classification-review?${queryString}`);
        if (cancelled) return;
        setPayload(response);
        setSelectedKey((current) => {
          if (!response.items.length) return null;
          if (current && response.items.some((item) => item.key === current)) return current;
          return response.items[0]?.key ?? null;
        });
        setSelectedKeys((current) => current.filter((value) => response.items.some((item) => item.key === value)));
      } catch (err) {
        if (cancelled) return;
        setError(err instanceof Error ? err.message : "Falha ao carregar a revisão de classificação.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => {
      cancelled = true;
    };
  }, [queryString, reloadKey]);

  const summary: ClassificationReviewSummary | null = payload?.summary ?? null;
  const items = payload?.items ?? [];

  function updateFilter<K extends keyof ClassificationReviewFilters>(key: K, value: ClassificationReviewFilters[K]) {
    setFilters((current) => ({ ...current, [key]: value }));
    setPage(1);
  }

  function resetFilters() {
    setFilters(DEFAULT_FILTERS);
    setPage(1);
  }

  function refresh() {
    setReloadKey((current) => current + 1);
  }

  async function mutateSuggestion(eventId: number, action: "apply" | "block") {
    setBusyAction(`${action}:${eventId}`);
    setNotice(null);
    try {
      await apiRequest(`/tags/intelligence/events/${eventId}/${action}`, { method: "POST" });
      setNotice({
        tone: action === "apply" ? "success" : "warning",
        text: action === "apply" ? "Sugestão aplicada com sucesso." : "Sugestão bloqueada com sucesso.",
      });
      refresh();
    } catch (err) {
      setNotice({
        tone: "danger",
        text: err instanceof Error ? err.message : "Falha ao processar a sugestão.",
      });
    } finally {
      setBusyAction(null);
    }
  }

  async function applySelected() {
    if (!selectedSuggestionIds.length) return;
    setBusyAction("apply-batch");
    setNotice(null);
    try {
      await apiRequest(`/tags/intelligence/events/apply-batch`, {
        method: "POST",
        body: JSON.stringify({ event_ids: selectedSuggestionIds }),
      });
      setNotice({ tone: "success", text: `${selectedSuggestionIds.length} sugestão(ões) aplicadas.` });
      setSelectedKeys((current) => current.filter((key) => !selectedSuggestionIds.includes(parseEventId(key) ?? -1)));
      refresh();
    } catch (err) {
      setNotice({
        tone: "danger",
        text: err instanceof Error ? err.message : "Falha ao aplicar lote de sugestões.",
      });
    } finally {
      setBusyAction(null);
    }
  }

  function openBlockDialog(eventIds: number[]) {
    if (!eventIds.length) return;
    setBlockDialogIds(eventIds);
    setBlockDialogOpen(true);
  }

  async function confirmBlock() {
    if (!blockDialogIds.length) return;
    const eventIds = blockDialogIds;
    setBusyAction("block-batch");
    setNotice(null);
    try {
      await apiRequest(`/tags/intelligence/events/block-batch`, {
        method: "POST",
        body: JSON.stringify({ event_ids: eventIds }),
      });
      setNotice({ tone: "warning", text: `${eventIds.length} sugestão(ões) bloqueadas.` });
      setSelectedKeys((current) => current.filter((key) => !eventIds.includes(parseEventId(key) ?? -1)));
      refresh();
      setBlockDialogOpen(false);
      setBlockDialogIds([]);
    } catch (err) {
      setNotice({
        tone: "danger",
        text: err instanceof Error ? err.message : "Falha ao bloquear lote de sugestões.",
      });
    } finally {
      setBusyAction(null);
    }
  }

  function openPromoteDialog(tableIds: number[]) {
    if (!tableIds.length) return;
    setPromoteDialogTableIds(tableIds);
    setPromoteDialogOpen(true);
  }

  async function confirmPromote() {
    if (!promoteDialogTableIds.length) return;
    const tableIds = promoteDialogTableIds;
    setBusyAction("promote-batch");
    setNotice(null);
    try {
      const response = await apiRequest<ClassificationReviewBatchPromoteResponse>(`/governance/classification-review/batch/promote`, {
        method: "POST",
        body: JSON.stringify({ table_ids: tableIds }),
      });
      setNotice({
        tone: "success",
        text: `${response.promoted_count} ativo(s) promovido(s) para a fila central.`,
      });
      setSelectedKeys((current) => current.filter((key) => !tableIds.includes(parseGapTableId(key) ?? -1)));
      refresh();
      setPromoteDialogOpen(false);
      setPromoteDialogTableIds([]);
    } catch (err) {
      setNotice({
        tone: "danger",
        text: err instanceof Error ? err.message : "Falha ao promover itens para a fila central.",
      });
    } finally {
      setBusyAction(null);
    }
  }

  const topKpis: Array<{
    label: string;
    value: number;
    hint: string;
    onClick?: () => void;
  }> = [
    {
      label: "Pendências",
      value: summary?.pending_reviews ?? 0,
      hint: "Sugestões aguardando decisão",
      onClick: () => updateFilter("review_status", "pending_review"),
    },
    { label: "Alta confiança", value: summary?.high_confidence_reviews ?? 0, hint: "Sugestões com maior precisão" },
    {
      label: "Provável PII",
      value: summary?.probable_pii ?? 0,
      hint: "Sinais pessoais no ativo",
      onClick: () => updateFilter("contains_pii", true),
    },
    {
      label: "Provável sensível",
      value: summary?.probable_sensitive ?? 0,
      hint: "Sinais de dados sensíveis",
      onClick: () => updateFilter("contains_sensitive", true),
    },
    {
      label: "Conflitos",
      value: summary?.conflicts ?? 0,
      hint: "Lacunas com conflito operacional",
      onClick: () => updateFilter("kind", "conflict"),
    },
    {
      label: "Colunas críticas",
      value: summary?.critical_columns ?? 0,
      hint: "Colunas críticas sem reforço",
      onClick: () => updateFilter("contains_critical", true),
    },
    { label: "Herança pendente", value: summary?.inheritance_pending ?? 0, hint: "Atributos de tabela por derivar" },
    { label: "Trust em risco", value: summary?.trust_at_risk ?? 0, hint: "Ativos com confiança abaixo do limite" },
    { label: "Revisadas 7d", value: summary?.reviewed_recently ?? 0, hint: "Decisões concluídas recentemente" },
  ];

  return (
    <div className="space-y-6 pb-6">
      <Card className="border-border bg-[linear-gradient(135deg,#ffffff_0%,#f8fafc_48%,#eef6ff_100%)] shadow-[0_18px_48px_rgba(15,23,42,0.06)]">
        <CardContent className="space-y-3 p-6">
          <div className="flex flex-wrap items-center gap-2">
            <Badge tone="accent">Governança</Badge>
            <Badge tone="neutral">Classificação inteligente</Badge>
            <Badge tone="neutral">{payload ? `${payload.total} itens` : "Fila central"}</Badge>
          </div>
          <h1 className="text-3xl font-semibold tracking-tight text-text">Revisão de classificação</h1>
          <p className="max-w-4xl text-sm leading-7 text-text-body">
            Centralize sinais de tags, termos, sensibilidade, PII, criticidade, DQ e certificação em uma única fila.
            A tela prioriza o que precisa revisão e permite aplicar ou bloquear sugestões sem alternar entre módulos.
          </p>
          <div className="flex flex-wrap gap-2">
            <Button asChild size="sm" variant="outline">
              <Link href="/governance/pending-center">
                Abrir pendências gerais
                <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>
            <Button asChild size="sm" variant="outline">
              <Link href="/tags">
                Ir para Tags
                <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>
            <Button onClick={refresh} size="sm" variant="outline">
              <RefreshCw className="mr-2 h-4 w-4" />
              Atualizar
            </Button>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {topKpis.map((kpi) => {
          if (kpi.onClick) {
            return (
              <button
                type="button"
                aria-label={`Filtrar por ${kpi.label}`}
                className="cursor-pointer rounded-card border border-border bg-surface text-left shadow-[0_12px_36px_rgba(15,23,42,0.05)] backdrop-blur-sm transition-colors hover:border-border-strong"
                key={kpi.label}
                onClick={kpi.onClick}
              >
                <CardContent className="space-y-1 p-5">
                  <p className="text-xs font-semibold uppercase tracking-[0.16em] text-muted">{kpi.label}</p>
                  <p className="text-2xl font-semibold text-text">{kpi.value}</p>
                  <p className="text-sm leading-6 text-text-body">{kpi.hint}</p>
                </CardContent>
              </button>
            );
          }
          return (
            <Card className="border-border bg-surface shadow-[0_12px_36px_rgba(15,23,42,0.05)]" key={kpi.label}>
              <CardContent className="space-y-1 p-5">
                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-muted">{kpi.label}</p>
                <p className="text-2xl font-semibold text-text">{kpi.value}</p>
                <p className="text-sm leading-6 text-text-body">{kpi.hint}</p>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <Card className="border-border bg-surface shadow-[0_12px_36px_rgba(15,23,42,0.05)]">
        <CardHeader className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-bg-subtle text-text-body">
              <Filter className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-base font-semibold text-text">Filtros avançados</h2>
              <p className="text-sm text-muted">Refine a fila por origem, confiança, sinais e status da revisão.</p>
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button onClick={resetFilters} size="sm" variant="outline">
              Limpar filtros
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
            <Input
              placeholder="Buscar por tabela, coluna, owner, termo ou tag..."
              value={filters.q}
              onChange={(event) => updateFilter("q", event.target.value)}
            />
            <Select value={filters.kind} onChange={(event) => updateFilter("kind", event.target.value)}>
              <option value="">Todos os tipos</option>
              {payload?.filters.kinds.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </Select>
            <Select value={filters.entity_level} onChange={(event) => updateFilter("entity_level", event.target.value)}>
              <option value="">Tabela e coluna</option>
              {payload?.filters.entity_levels.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </Select>
            <Select value={filters.review_status} onChange={(event) => updateFilter("review_status", event.target.value)}>
              <option value="">Todos os status</option>
              {payload?.filters.review_statuses.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </Select>
            <Select value={filters.source} onChange={(event) => updateFilter("source", event.target.value)}>
              <option value="">Todas as origens</option>
              {payload?.filters.sources.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </Select>
            <Select value={filters.datasource} onChange={(event) => updateFilter("datasource", event.target.value)}>
              <option value="">Todas as fontes</option>
              {payload?.filters.datasources.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </Select>
            <Select value={filters.schema_name} onChange={(event) => updateFilter("schema_name", event.target.value)}>
              <option value="">Todos os schemas</option>
              {payload?.filters.schemas.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </Select>
            <Select value={filters.domain} onChange={(event) => updateFilter("domain", event.target.value)}>
              <option value="">Todos os domínios</option>
              {payload?.filters.domains.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </Select>
            <Select value={filters.owner} onChange={(event) => updateFilter("owner", event.target.value)}>
              <option value="">Todos os owners</option>
              {payload?.filters.owners.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </Select>
            <Select value={filters.tag} onChange={(event) => updateFilter("tag", event.target.value)}>
              <option value="">Todas as tags</option>
              {payload?.filters.tags.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </Select>
            <Input
              placeholder="Confiança mínima"
              inputMode="numeric"
              value={filters.min_confidence}
              onChange={(event) => updateFilter("min_confidence", event.target.value)}
            />
            <Input
              placeholder="Confiança máxima"
              inputMode="numeric"
              value={filters.max_confidence}
              onChange={(event) => updateFilter("max_confidence", event.target.value)}
            />
            <Select value={filters.sort_by} onChange={(event) => updateFilter("sort_by", event.target.value)}>
              <option value="risk_desc">Maior risco primeiro</option>
              <option value="confidence_desc">Maior confiança primeiro</option>
              <option value="newest">Mais recentes</option>
              <option value="oldest">Mais antigas</option>
            </Select>
            <div className="grid gap-2 rounded-xl border border-border bg-bg-subtle p-3 text-sm text-text-body md:col-span-2 xl:col-span-4 xl:grid-cols-3">
              <label className="flex items-center gap-2">
                <input
                  checked={filters.contains_pii}
                  onChange={(event) => updateFilter("contains_pii", event.target.checked)}
                  type="checkbox"
                />
                Contém PII
              </label>
              <label className="flex items-center gap-2">
                <input
                  checked={filters.contains_sensitive}
                  onChange={(event) => updateFilter("contains_sensitive", event.target.checked)}
                  type="checkbox"
                />
                Contém sensível
              </label>
              <label className="flex items-center gap-2">
                <input
                  checked={filters.contains_critical}
                  onChange={(event) => updateFilter("contains_critical", event.target.checked)}
                  type="checkbox"
                />
                Contém coluna crítica
              </label>
            </div>
          </div>
        </CardContent>
      </Card>

      {notice ? (
        <Card
          className={cn(
            "border-border bg-surface shadow-sm",
            notice.tone === "success" && "border-success-200",
            notice.tone === "warning" && "border-warning-200",
            notice.tone === "danger" && "border-danger-200",
          )}
        >
          <CardContent className="py-3 text-sm text-text-body">{notice.text}</CardContent>
        </Card>
      ) : null}

      {error ? (
        <EmptyState
          title="Não foi possível carregar a revisão"
          description={error}
          icon={<TriangleAlert className="h-5 w-5" />}
          action={
            <Button onClick={refresh} variant="outline">
              <RefreshCw className="mr-2 h-4 w-4" />
              Tentar novamente
            </Button>
          }
        />
      ) : null}

      {!error ? (
        <div className="grid gap-6 xl:grid-cols-[1.25fr_0.85fr]">
          <Card className="border-border bg-surface shadow-[0_12px_36px_rgba(15,23,42,0.05)]">
            <CardHeader className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
              <div>
                <h2 className="text-base font-semibold text-text">Fila central</h2>
                <p className="text-sm text-muted">
                  {payload ? `${payload.total} item(ns) encontrados` : "Carregando fila central..."}
                </p>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <Button
                  disabled={!selectedSuggestionsCount || busyAction !== null}
                  onClick={applySelected}
                  size="sm"
                >
                  <CheckCircle2 className="mr-2 h-4 w-4" />
                  Aplicar selecionadas ({selectedSuggestionsCount})
                </Button>
                <Button
                  disabled={!selectedSuggestionsCount || busyAction !== null}
                  onClick={() => openBlockDialog(selectedSuggestionIds)}
                  size="sm"
                  variant="danger"
                >
                  <XCircle className="mr-2 h-4 w-4" />
                  Bloquear selecionadas
                </Button>
                <Button
                  disabled={!selectedGapCount || busyAction !== null}
                  onClick={() => openPromoteDialog(selectedGapTableIds)}
                  size="sm"
                  variant="outline"
                >
                  <Sparkles className="mr-2 h-4 w-4" />
                  Promover lacunas/conflitos ({selectedGapCount})
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {loading ? (
                <div className="space-y-3">
                  {Array.from({ length: 4 }).map((_, index) => (
                    <div className="h-28 animate-pulse rounded-2xl border border-border bg-bg-subtle" key={index} />
                  ))}
                </div>
              ) : items.length === 0 ? (
                <EmptyState
                  title="Nenhum item encontrado"
                  description="Os filtros atuais não retornaram sugestões ou lacunas para revisão."
                  icon={<Sparkles className="h-5 w-5" />}
                />
              ) : (
                <div className="space-y-3">
                  <div className="flex items-center justify-between gap-3 rounded-2xl border border-border bg-bg-subtle px-4 py-3 text-xs text-text-body">
                    <label className="flex items-center gap-2">
                      <input
                        checked={allVisibleSelected}
                        onChange={(event) => {
                          if (event.target.checked) {
                            setSelectedKeys((current) => Array.from(new Set([...current, ...visibleKeys])));
                            return;
                          }
                          setSelectedKeys((current) => current.filter((value) => !visibleKeys.includes(value)));
                        }}
                        type="checkbox"
                      />
                      Selecionar todas as linhas visíveis
                    </label>
                    <span>
                      {selectedSuggestionsCount} sugestão(ões) · {selectedGapCount} lacuna(s) selecionada(s)
                    </span>
                  </div>
                  {items.map((item) => {
                    const eventId = parseEventId(item.key);
                    const gapTableId = parseGapTableId(item.key);
                    const isSelected = selectedKey === item.key;
                    const isSelectable = eventId !== null || gapTableId !== null;
                    const isChecked = selectedKeys.includes(item.key);
                    return (
                      <div
                        className={cn(
                          "w-full rounded-2xl border bg-surface p-4 text-left shadow-sm transition-all hover:border-border-strong hover:shadow-md",
                          isSelected && "border-info-200 ring-1 ring-info-200/40",
                          item.kind === "conflict" && "border-danger-200",
                          item.kind === "gap" && "border-warning-200",
                        )}
                        onClick={() => setSelectedKey(item.key)}
                        onKeyDown={(event) => {
                          if (event.key === "Enter" || event.key === " ") {
                            event.preventDefault();
                            setSelectedKey(item.key);
                          }
                        }}
                        key={item.key}
                        role="button"
                        tabIndex={0}
                      >
                        <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
                          <div className="min-w-0 space-y-2">
                            <div className="flex flex-wrap items-center gap-2">
                              <label className="mr-1 flex items-center gap-2 text-xs text-muted">
                                <input
                                  checked={isChecked}
                                  disabled={!isSelectable}
                                  onChange={(event) => {
                                    event.stopPropagation();
                                    setSelectedKeys((current) =>
                                      event.target.checked
                                        ? Array.from(new Set([...current, item.key]))
                                        : current.filter((value) => value !== item.key),
                                    );
                                  }}
                                  onClick={(event) => event.stopPropagation()}
                                  type="checkbox"
                                />
                              </label>
                              <Badge tone={badgeToneFromKind(item.kind)}>{item.kind === "suggestion" ? "Sugestão" : item.kind === "gap" ? "Lacuna" : "Conflito"}</Badge>
                              <Badge tone="neutral">{item.entity_level === "column" ? "Coluna" : "Tabela"}</Badge>
                              <Badge tone={badgeToneFromStatus(item.review_status)}>{reviewStatusLabel(item.review_status)}</Badge>
                              <Badge tone={badgeToneFromRisk(item.risk_score)}>{`Risco ${item.risk_score}`}</Badge>
                              <InfoTooltip text="Risco estimado do item: combina sensibilidade do dado e confiança do sinal." />
                              {item.trust_score !== null && item.trust_score !== undefined ? (
                                <>
                                  <Badge tone={badgeToneFromTrust(item.trust_score)}>{`Trust ${item.trust_score}`}</Badge>
                                  <InfoTooltip text="Confiança consolidada no ativo (qualidade, certificação, incidentes, políticas)." />
                                </>
                              ) : null}
                              {item.applied_automatically ? <Badge tone="success">Automática</Badge> : null}
                            </div>
                            <h3 className="break-words text-lg font-semibold text-text">{itemTitle(item)}</h3>
                            <p className="break-words text-sm text-muted">{itemSubtitle(item)}</p>
                            <p className="text-sm leading-6 text-text-body">
                              {item.inference_reason || "A fila foi criada a partir de sinais consolidados do catálogo."}
                            </p>
                            <div className="flex flex-wrap gap-2">
                              {item.suggestion_tag_name ? <Badge tone="accent">{item.suggestion_tag_name}</Badge> : null}
                              {item.suggestion_tag_slug && item.suggestion_tag_slug !== item.suggestion_tag_name ? (
                                <Badge tone="neutral">{item.suggestion_tag_slug}</Badge>
                              ) : null}
                              {item.domain_name ? <Badge tone="neutral">{item.domain_name}</Badge> : null}
                              {item.owner_name ? <Badge tone="neutral">{item.owner_name}</Badge> : null}
                              {item.certification_status_label ? <Badge tone="neutral">{item.certification_status_label}</Badge> : null}
                            </div>
                            <div className="flex flex-wrap gap-2">
                              {(item.signals || []).slice(0, 3).map((signal) => (
                                <Badge key={signal.key} tone={signalTone(signal)}>
                                  {signal.label}: {signal.value || "-"}
                                </Badge>
                              ))}
                              {item.signals.length > 3 ? <Badge tone="neutral">+{item.signals.length - 3} sinais</Badge> : null}
                            </div>
                          </div>
                          <div className="flex shrink-0 flex-col items-start gap-2 xl:items-end">
                            {item.confidence_score !== null && item.confidence_score !== undefined ? (
                              <span className="inline-flex items-center gap-1">
                                <Badge tone={badgeToneFromConfidence(item.confidence_score)}>{`Confiança ${formatPercent(item.confidence_score)}`}</Badge>
                                <InfoTooltip text="Confiança do sinal automático que gerou a sugestão (quanto maior, mais provável que esteja correto)." />
                              </span>
                            ) : (
                              <Badge tone="neutral">Sem confiança</Badge>
                            )}
                            <p className="text-xs text-muted">{formatDateTime(item.created_at)}</p>
                            <div className="flex flex-wrap gap-2">
                              <Button asChild size="sm" variant="outline">
                                <Link href={item.links.explorer}>
                                  Abrir contexto
                                  <ArrowRight className="ml-2 h-4 w-4" />
                                </Link>
                              </Button>
                            </div>
                            {item.kind !== "suggestion" ? (
                              <Button
                                disabled={busyAction !== null}
                                onClick={() => openPromoteDialog([item.table_id])}
                                size="sm"
                                variant="outline"
                              >
                                <Sparkles className="mr-2 h-4 w-4" />
                                Promover
                              </Button>
                            ) : null}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

              {payload ? (
                <div className="flex flex-col gap-3 border-t border-border pt-4 md:flex-row md:items-center md:justify-between">
                  <p className="text-sm text-muted">
                    Página {payload.page} de {totalPages} · {payload.total} item(ns)
                  </p>
                  <div className="flex items-center gap-2">
                    <Button
                      disabled={payload.page <= 1 || loading}
                      onClick={() => setPage((current) => Math.max(1, current - 1))}
                      size="sm"
                      variant="outline"
                    >
                      Anterior
                    </Button>
                    <Button
                      disabled={payload.page >= totalPages || loading}
                      onClick={() => setPage((current) => current + 1)}
                      size="sm"
                      variant="outline"
                    >
                      Próxima
                    </Button>
                  </div>
                </div>
              ) : null}
            </CardContent>
          </Card>

          <Card className="sticky top-6 border-border bg-surface shadow-[0_12px_36px_rgba(15,23,42,0.05)]">
            <CardHeader className="space-y-2">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <h2 className="text-base font-semibold text-text">Detalhe expandido</h2>
                  <p className="text-sm text-muted">Contexto do ativo, sinais e ações rápidas.</p>
                </div>
                <Badge tone={badgeToneFromKind(selectedItem?.kind || "neutral")}>{selectedItem ? itemGroupLabel(selectedItem) : "Detalhe"}</Badge>
              </div>
            </CardHeader>
            <CardContent className="space-y-5">
              {!selectedItem ? (
                <EmptyState
                  title="Selecione um item"
                  description="Escolha uma linha da fila para ver contexto, sinais e ações."
                  icon={<Eye className="h-5 w-5" />}
                />
              ) : (
                <>
                  <div className="space-y-3 rounded-2xl border border-border bg-bg-subtle p-4">
                    <div className="flex flex-wrap items-center gap-2">
                      <Badge tone={badgeToneFromKind(selectedItem.kind)}>{selectedItem.kind === "suggestion" ? "Sugestão" : selectedItem.kind === "gap" ? "Lacuna" : "Conflito"}</Badge>
                      <Badge tone="neutral">{selectedItem.entity_level === "column" ? "Coluna" : "Tabela"}</Badge>
                      <Badge tone={badgeToneFromStatus(selectedItem.review_status)}>{reviewStatusLabel(selectedItem.review_status)}</Badge>
                      <Badge tone={badgeToneFromRisk(selectedItem.risk_score)}>{`Risco ${selectedItem.risk_score}`}</Badge>
                      {selectedItem.applied_automatically ? <Badge tone="success">Automática</Badge> : null}
                    </div>
                    <div>
                      <h3 className="break-words text-xl font-semibold text-text">{itemTitle(selectedItem)}</h3>
                      <p className="mt-1 break-words text-sm text-muted">{itemSubtitle(selectedItem)}</p>
                    </div>
                    <p className="text-sm leading-6 text-text-body">
                      {selectedItem.inference_reason || "A revisão foi criada a partir do contexto operacional do ativo."}
                    </p>
                  </div>

                  <div className="grid gap-3 md:grid-cols-2">
                    <MiniStat label="Owner" value={selectedItem.owner_name || "-"} />
                    <MiniStat label="Certificação" value={selectedItem.certification_status_label} />
                    <MiniStat label="Prontidão" value={`${selectedItem.readiness_score}%`} />
                    <MiniStat label="Governança" value={`${selectedItem.governance_score} · ${selectedItem.governance_label}`} />
                    <MiniStat label="DQ" value={selectedItem.dq_score !== null && selectedItem.dq_score !== undefined ? `${selectedItem.dq_score}%` : "-"} />
                    <MiniStat label="Incidentes críticos" value={String(selectedItem.critical_open_incidents)} />
                  </div>

                  {canonicalLoading ? <Skeleton className="h-56 w-full rounded-2xl" /> : null}
                  {!canonicalLoading && canonicalError ? (
                    <EmptyState
                      className="shadow-none"
                      description={canonicalError}
                      title="Não foi possível carregar o núcleo canônico"
                    />
                  ) : null}
                  {!canonicalLoading && !canonicalError && canonicalAsset ? (
                    <div className="space-y-3 rounded-2xl border border-warning-200/80 bg-gradient-to-br from-amber-50/80 via-white to-white p-4 shadow-[0_12px_36px_rgba(180,83,9,0.06)]">
                      <div className="flex flex-wrap items-start justify-between gap-3">
                        <div>
                          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-brand-600">Núcleo canônico</p>
                          <h4 className="mt-1 text-base font-semibold text-text">Ativo, pipeline, eventos e evidências</h4>
                        </div>
                        <div className="flex flex-wrap gap-2">
                          <Badge tone={canonicalAsset.classification.certification_status === "certified" ? "success" : "accent"}>
                            {canonicalAsset.classification.certification_status_label}
                          </Badge>
                          <Badge tone={canonicalAsset.evidence.active_dq_violation ? "warning" : "neutral"}>
                            {canonicalAsset.evidence.active_dq_violation ? "DQ ativa" : "DQ estável"}
                          </Badge>
                        </div>
                      </div>
                      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
                        <MiniStat label="Identidade" value={canonicalAsset.display_name} />
                        <MiniStat label="Fonte" value={canonicalAsset.source.datasource_name} />
                        <MiniStat label="Owner" value={canonicalAsset.owner.owner_name || "-"} />
                        <MiniStat label="Prontidão" value={`${canonicalAsset.classification.readiness_score}%`} />
                      </div>
                      {canonicalAsset.pipeline ? (
                        <div className="rounded-2xl border border-border bg-surface p-4">
                          <div className="flex flex-wrap items-start justify-between gap-3">
                            <div>
                              <p className="text-sm font-semibold text-text">Pipeline canônico</p>
                              <p className="mt-1 text-sm text-text-body">
                                {canonicalAsset.pipeline.message || "Pipeline operacional consolidado para este ativo."}
                              </p>
                            </div>
                            <div className="flex flex-wrap gap-2">
                              <Badge tone={canonicalAsset.pipeline.linked ? "success" : "warning"}>
                                {canonicalAsset.pipeline.linked ? "Vinculado" : "Não vinculado"}
                              </Badge>
                              {canonicalAsset.pipeline.primary_pipeline?.latest_status_label ? (
                                <Badge tone="accent">{canonicalAsset.pipeline.primary_pipeline.latest_status_label}</Badge>
                              ) : null}
                            </div>
                          </div>
                          <p className="mt-3 text-sm text-text-body">
                            {canonicalAsset.pipeline.primary_pipeline?.pipeline_name || "Pipeline sem nome"} ·{" "}
                            {canonicalAsset.pipeline.primary_pipeline?.dag_id || "-"} ·{" "}
                            {canonicalAsset.pipeline.stability
                              ? `${canonicalAsset.pipeline.stability.success_rate_pct}% de sucesso`
                              : "Sem estabilidade consolidada"}
                          </p>
                        </div>
                      ) : null}
                      {canonicalAsset.recent_events.length ? (
                        <div className="grid gap-2 md:grid-cols-2">
                          {canonicalAsset.recent_events.slice(0, 4).map((event) => (
                            <div className="rounded-2xl border border-border bg-surface p-3" key={event.id}>
                              <div className="flex flex-wrap items-center gap-2">
                                <Badge tone={event.category === "operation" ? "accent" : event.category === "classification" ? "success" : "neutral"}>
                                  {event.category === "operation" ? "Operação" : event.category === "classification" ? "Classificação" : "Auditoria"}
                                </Badge>
                                <p className="text-sm font-medium text-text">{event.label}</p>
                              </div>
                              <p className="mt-1 text-xs text-muted">
                                {event.source} · {formatDateTime(event.created_at)}
                              </p>
                              {event.detail ? <p className="mt-1 text-sm text-text-body">{event.detail}</p> : null}
                            </div>
                          ))}
                        </div>
                      ) : null}
                    </div>
                  ) : null}

                  <div className="grid gap-3 md:grid-cols-2">
                    <MiniStat label="Fonte" value={selectedItem.datasource_name} />
                    <MiniStat label="Banco" value={selectedItem.database_name} />
                    <MiniStat label="Schema" value={selectedItem.schema_name} />
                    <MiniStat label="Domínio" value={selectedItem.domain_name || "-"} />
                  </div>

                  <div className="space-y-3">
                    <SectionTitle title="Sinais encontrados" icon={<Sparkles className="h-4 w-4" />} />
                    <div className="grid gap-3 md:grid-cols-2">
                      {selectedItem.signals.map((signal) => (
                        <div className="rounded-2xl border border-border bg-surface p-4 shadow-sm" key={signal.key}>
                          <div className="flex items-start justify-between gap-3">
                            <div>
                              <p className="text-sm font-semibold text-text">{signal.label}</p>
                              <p className="mt-1 text-xs uppercase tracking-[0.14em] text-muted">{signal.key}</p>
                            </div>
                            <Badge tone={signalTone(signal)}>{signal.value || "-"}</Badge>
                          </div>
                          {signal.detail ? <p className="mt-3 text-sm leading-6 text-text-body">{signal.detail}</p> : null}
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="space-y-3">
                    <SectionTitle title="Tags e termos atuais" icon={<Tag className="h-4 w-4" />} />
                    <div className="space-y-3">
                      <TagGroup title="Tags atuais" items={selectedItem.current_tags} />
                      {selectedItem.entity_level === "column" ? (
                        <div className="grid gap-3 md:grid-cols-2">
                          <TagGroup title="Tags da coluna" items={selectedItem.column_tags} />
                          <TagGroup title="Tags derivadas da tabela" items={selectedItem.table_tags} />
                        </div>
                      ) : (
                        <TagGroup title="Tags da tabela" items={selectedItem.table_tags} />
                      )}
                      <TermGroup terms={selectedItem.current_terms} />
                    </div>
                  </div>

                  <div className="space-y-3">
                    <SectionTitle title="Ações rápidas" icon={<BadgeCheck className="h-4 w-4" />} />
                    <div className="flex flex-wrap gap-2">
                      {selectedItem.kind === "suggestion" && (selectedItem.review_status === "pending_review" || selectedItem.review_status === "suggested") && parseEventId(selectedItem.key) ? (
                        <>
                          <Button
                            disabled={busyAction !== null}
                            onClick={() => mutateSuggestion(parseEventId(selectedItem.key) as number, "apply")}
                            size="sm"
                          >
                            <CheckCircle2 className="mr-2 h-4 w-4" />
                            Aplicar sugestão
                          </Button>
                          <Button
                            disabled={busyAction !== null}
                            onClick={() => openBlockDialog([parseEventId(selectedItem.key) as number])}
                            size="sm"
                            variant="danger"
                          >
                            <XCircle className="mr-2 h-4 w-4" />
                            Bloquear sugestão
                          </Button>
                        </>
                      ) : null}
                      {selectedItem.kind !== "suggestion" ? (
                        <Button
                          disabled={busyAction !== null}
                          onClick={() => openPromoteDialog([selectedItem.table_id])}
                          size="sm"
                          variant="outline"
                        >
                          <Sparkles className="mr-2 h-4 w-4" />
                          Promover para fila central
                        </Button>
                      ) : null}
                      <Button asChild size="sm" variant="outline">
                        <Link href={selectedItem.links.explorer}>
                          Abrir no Explorer
                          <ArrowRight className="ml-2 h-4 w-4" />
                        </Link>
                      </Button>
                      <Button asChild size="sm" variant="outline">
                        <Link href={selectedItem.links.data_quality}>
                          Ver DQ
                          <ArrowRight className="ml-2 h-4 w-4" />
                        </Link>
                      </Button>
                      <Button asChild size="sm" variant="outline">
                        <Link href={selectedItem.links.certification}>
                          Ver certificação
                          <ArrowRight className="ml-2 h-4 w-4" />
                        </Link>
                      </Button>
                      <Button asChild size="sm" variant="outline">
                        <Link href="/tags">
                          Abrir Tags
                          <ArrowRight className="ml-2 h-4 w-4" />
                        </Link>
                      </Button>
                      <Button asChild size="sm" variant="outline">
                        <Link href="/glossary">
                          Abrir Glossário
                          <ArrowRight className="ml-2 h-4 w-4" />
                        </Link>
                      </Button>
                      <Button asChild size="sm" variant="outline">
                        <Link href={selectedItem.links.lineage}>
                          Ver linhagem
                          <ArrowRight className="ml-2 h-4 w-4" />
                        </Link>
                      </Button>
                    </div>
                    {selectedItem.recommended_actions.length > 0 ? (
                      <div className="flex flex-wrap gap-2">
                        {selectedItem.recommended_actions.map((action) => (
                          <Badge key={action} tone="neutral">
                            {action}
                          </Badge>
                        ))}
                      </div>
                    ) : null}
                  </div>

                  <div className="grid gap-3 md:grid-cols-2">
                    <MiniStat label="Criado em" value={formatDateTime(selectedItem.created_at)} />
                    <MiniStat label="Atualizado em" value={formatDateTime(selectedItem.updated_at)} />
                    <MiniStat label="Revisado em" value={formatDateTime(selectedItem.reviewed_at)} />
                    <MiniStat label="Classificação" value={selectedItem.classification_defined ? "Consolidada" : "Pendente"} />
                    <MiniStat label="Cobertura de colunas" value={`${selectedItem.classified_columns}/${selectedItem.total_columns}`} />
                    <MiniStat label="Cobertura %" value={formatPercent(selectedItem.classification_coverage_pct || 0)} />
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        </div>
      ) : null}

      <DangerConfirmDialog
        busy={busyAction === "block-batch"}
        cancelLabel="Cancelar"
        confirmLabel="Bloquear sugestão(ões)"
        confirmToken="BLOQUEAR"
        confirmTokenLabel="Digite BLOQUEAR para confirmar o bloqueio"
        description="Essa ação vai bloquear as sugestões selecionadas e registrá-las como revisadas manualmente."
        open={blockDialogOpen}
        title="Bloquear sugestões"
        onCancel={() => setBlockDialogOpen(false)}
        onConfirm={confirmBlock}
      />

      <DangerConfirmDialog
        busy={busyAction === "promote-batch"}
        cancelLabel="Cancelar"
        confirmLabel="Promover"
        confirmToken="PROMOVER"
        confirmTokenLabel="Digite PROMOVER para confirmar a promoção"
        description="Essa ação vai promover as lacunas ou conflitos selecionados para a fila central de revisão, preservando a trilha auditável."
        open={promoteDialogOpen}
        title="Promover lacunas e conflitos para a fila central"
        onCancel={() => setPromoteDialogOpen(false)}
        onConfirm={confirmPromote}
      />
    </div>
  );
}

function MiniStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-border bg-surface p-4 shadow-sm">
      <p className="text-xs uppercase tracking-[0.16em] text-muted">{label}</p>
      <p className="mt-2 break-words text-sm font-semibold text-text">{value}</p>
    </div>
  );
}

function SectionTitle({ title, icon }: { title: string; icon?: ReactNode }) {
  return (
    <div className="flex items-center gap-2">
      {icon ? <span className="text-text-body">{icon}</span> : null}
      <h4 className="text-sm font-semibold text-text">{title}</h4>
    </div>
  );
}

function TagGroup({ title, items }: { title: string; items: ClassificationReviewTag[] }) {
  return (
    <div className="space-y-2 rounded-2xl border border-border bg-surface p-4 shadow-sm">
      <SectionTitle title={title} icon={<Tag className="h-4 w-4" />} />
      {items.length === 0 ? (
        <p className="text-sm text-muted">Nenhuma tag associada.</p>
      ) : (
        <div className="flex flex-wrap gap-2">
          {items.map((tag) => (
            <Badge key={`${tag.id}-${tag.slug}`} tone={tagChipTone(tag)}>
              {tag.name}
            </Badge>
          ))}
        </div>
      )}
    </div>
  );
}

function TermGroup({ terms }: { terms: ClassificationReviewTerm[] }) {
  return (
    <div className="space-y-2 rounded-2xl border border-border bg-surface p-4 shadow-sm">
      <SectionTitle title="Termos vinculados" icon={<BookOpen className="h-4 w-4" />} />
      {terms.length === 0 ? (
        <p className="text-sm text-muted">Nenhum termo vinculado.</p>
      ) : (
        <div className="space-y-2">
          {terms.map((term) => (
            <div className="rounded-xl border border-border bg-bg-subtle px-4 py-3" key={term.id}>
              <div className="flex items-center justify-between gap-2">
                <p className="text-sm font-semibold text-text">{term.name}</p>
                {term.steward ? <Badge tone="neutral">{term.steward}</Badge> : null}
              </div>
              <p className="mt-1 text-sm leading-6 text-text-body">{term.definition}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
