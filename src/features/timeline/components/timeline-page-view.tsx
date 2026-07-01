import { FormEvent, useEffect, useMemo, useState } from "react";
import { Link } from "@/lib/next-shims";
import { useSearchParams } from "@/lib/next-shims";
import {
  AlertTriangle,
  Clock3,
  Filter,
  ShieldAlert,
  Sparkles,
  Workflow,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { InfoTooltip } from "@/components/ui/tooltip";
import { apiRequest } from "@/lib/client-api";

import { TimelineFeed } from "./timeline-feed";
import { TimelineEpisodeFeed } from "./timeline-episode-feed";
import { buildTimelineQuery } from "../timeline-query.js";
import type { TimelineEpisodeActionInput, TimelinePage } from "../types";
import type { ComponentType } from "react";

type TimelineFilters = {
  q: string;
  source: string;
  datasource: string;
  schema_name: string;
  owner: string;
  certification_status: string;
  event_type: string;
  category: string;
  severity: string;
  manual_only: string;
  automatic_only: string;
  contains_pii: string;
  contains_sensitive: string;
  contains_critical: string;
  open_incidents: string;
  dq_recent: string;
  table_id: string;
  column_id: string;
  date_from: string;
  date_to: string;
  episode_status: string;
  episode_type: string;
  min_importance_score: string;
};

const DEFAULT_FILTERS: TimelineFilters = {
  q: "",
  source: "",
  datasource: "",
  schema_name: "",
  owner: "",
  certification_status: "",
  event_type: "",
  category: "",
  severity: "",
  manual_only: "",
  automatic_only: "",
  contains_pii: "",
  contains_sensitive: "",
  contains_critical: "",
  open_incidents: "",
  dq_recent: "",
  table_id: "",
  column_id: "",
  date_from: "",
  date_to: "",
  episode_status: "",
  episode_type: "",
  min_importance_score: "",
};

function parseBool(value: string) {
  if (value === "true") return true;
  if (value === "false") return false;
  return null;
}

function summaryCard({
  icon: Icon,
  label,
  value,
  tone,
}: {
  icon: ComponentType<{ className?: string }>;
  label: string;
  value: number;
  tone: "neutral" | "accent" | "success" | "warning" | "danger";
}) {
  const toneClasses: Record<"neutral" | "accent" | "success" | "warning" | "danger", string> = {
    neutral: "border-border bg-bg-subtle text-text-body",
    accent: "border-info-200 bg-info-50 text-info-700",
    success: "border-success-200 bg-success-50 text-success-700",
    warning: "border-warning-200 bg-warning-50 text-warning-700",
    danger: "border-danger-200 bg-danger-50 text-danger-700",
  };
  return (
    <Card className={toneClasses[tone]}>
      <CardContent className="flex items-center gap-3 p-4">
        <div className="flex h-10 w-10 items-center justify-center rounded-2xl border border-white/60 bg-surface/80 shadow-sm">
          <Icon className="h-4 w-4" />
        </div>
        <div className="min-w-0">
          <p className="text-xs font-semibold uppercase tracking-[0.16em] opacity-70">{label}</p>
          <p className="text-2xl font-semibold">{value}</p>
        </div>
      </CardContent>
    </Card>
  );
}

export function TimelinePageView() {
  const searchParams = useSearchParams();
  const [filters, setFilters] = useState<TimelineFilters>(DEFAULT_FILTERS);
  const [appliedFilters, setAppliedFilters] = useState<TimelineFilters>(DEFAULT_FILTERS);
  const [payload, setPayload] = useState<TimelinePage | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [viewMode, setViewMode] = useState<"episodes" | "events">("episodes");
  const [page, setPage] = useState(1);
  const [actionBusyKey, setActionBusyKey] = useState<string | null>(null);
  const pageSize = 12;

  useEffect(() => {
    const nextFilters: TimelineFilters = {
      ...DEFAULT_FILTERS,
      q: searchParams.get("q") || "",
      source: searchParams.get("source") || "",
      datasource: searchParams.get("datasource") || "",
      schema_name: searchParams.get("schema_name") || searchParams.get("schema") || "",
      owner: searchParams.get("owner") || "",
      certification_status: searchParams.get("certification_status") || "",
      event_type: searchParams.get("event_type") || "",
      category: searchParams.get("category") || "",
      severity: searchParams.get("severity") || "",
      manual_only: searchParams.get("manual_only") || "",
      automatic_only: searchParams.get("automatic_only") || "",
      contains_pii: searchParams.get("contains_pii") || "",
      contains_sensitive: searchParams.get("contains_sensitive") || "",
      contains_critical: searchParams.get("contains_critical") || "",
      open_incidents: searchParams.get("open_incidents") || "",
      dq_recent: searchParams.get("dq_recent") || "",
      table_id: searchParams.get("table_id") || searchParams.get("tableId") || "",
      column_id: searchParams.get("column_id") || searchParams.get("columnId") || "",
      date_from: searchParams.get("date_from") || "",
      date_to: searchParams.get("date_to") || "",
      episode_status: searchParams.get("episode_status") || "",
      episode_type: searchParams.get("episode_type") || "",
      min_importance_score: searchParams.get("min_importance_score") || "",
    };
    setFilters(nextFilters);
    setAppliedFilters(nextFilters);
    setPage(1);
  }, [searchParams]);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError("");
    void (async () => {
      try {
        const params = new URLSearchParams(buildTimelineQuery(appliedFilters, page, pageSize));
        params.set("episode_page", String(page));
        params.set("episode_page_size", String(pageSize));
        const payload = await apiRequest<TimelinePage>(`/v1/governance/timeline?${params.toString()}`);
        if (cancelled) return;
        setPayload(payload);
      } catch (err) {
        if (!cancelled) {
          setPayload(null);
          setError(err instanceof Error ? err.message : "Não foi possível carregar a timeline.");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [appliedFilters, page]);

  function onApply(event?: FormEvent) {
    event?.preventDefault();
    setAppliedFilters({ ...filters });
    setPage(1);
  }

  function onClear() {
    setFilters(DEFAULT_FILTERS);
    setAppliedFilters(DEFAULT_FILTERS);
    setPage(1);
  }

  function applyQuickPreset(preset: Partial<TimelineFilters>) {
    const nextFilters = {
      ...filters,
      ...preset,
    };
    setFilters(nextFilters);
    setAppliedFilters(nextFilters);
    setPage(1);
  }

  const activeFilters = useMemo(
    () => Object.values(appliedFilters).filter((value) => parseBool(value) !== null || value.trim().length > 0).length,
    [appliedFilters],
  );

  const summary = payload?.summary ?? {
    total: 0,
    governance: 0,
    operation: 0,
    quality: 0,
    incident: 0,
    audit: 0,
    manual: 0,
    automatic: 0,
    critical: 0,
  };
  const analytics = payload?.analytics ?? {
    total_episodes: 0,
    open_episodes: 0,
    acknowledged_episodes: 0,
    silenced_episodes: 0,
    resolved_episodes: 0,
    critical_episodes: 0,
    recurrent_episodes: 0,
    impacted_assets: 0,
    impacted_columns: 0,
    average_importance_score: 0,
    average_event_count: 0,
    top_episode_types: [],
    top_sources: [],
    top_statuses: [],
  };

  const totalPages = Math.max(1, Math.ceil(((viewMode === "episodes" ? payload?.episode_total : payload?.total) || 0) / pageSize));
  const rangeStart = payload && (viewMode === "episodes" ? payload.episode_total : payload.total) > 0 ? (page - 1) * pageSize + 1 : 0;
  const rangeEnd = payload ? Math.min(viewMode === "episodes" ? payload.episode_total : payload.total, page * pageSize) : 0;
  const visibleCount = viewMode === "episodes" ? payload?.episode_total || 0 : payload?.total || 0;

  async function reloadTimeline() {
    setLoading(true);
    setError("");
    try {
      const params = new URLSearchParams(buildTimelineQuery(appliedFilters, page, pageSize));
      params.set("episode_page", String(page));
      params.set("episode_page_size", String(pageSize));
      const nextPayload = await apiRequest<TimelinePage>(`/v1/governance/timeline?${params.toString()}`);
      setPayload(nextPayload);
    } catch (err) {
      setPayload(null);
      setError(err instanceof Error ? err.message : "Não foi possível carregar a timeline.");
    } finally {
      setLoading(false);
    }
  }

  async function submitEpisodeAction(episodeKey: string, actionType: "acknowledge" | "silence", silenceHours = 2) {
    const episode = payload?.episodes.find((item) => item.episode_key === episodeKey);
    if (!episode) return;
    const tableId = episode.impacted_table_ids[0] ?? episode.child_events.find((child) => child.table_id != null)?.table_id ?? payload?.table_id ?? null;
    const columnId = episode.child_events.find((child) => child.column_id != null)?.column_id ?? payload?.column_id ?? null;
    const actionPayload: TimelineEpisodeActionInput = {
      episode_key: episodeKey,
      action_type: actionType,
      table_id: tableId,
      column_id: columnId,
      reason: actionType === "silence" ? "Silenciado a partir da timeline" : "Reconhecido a partir da timeline",
      silent_until: actionType === "silence" ? new Date(Date.now() + silenceHours * 60 * 60 * 1000).toISOString() : null,
    };
    setActionBusyKey(episodeKey);
    try {
      await apiRequest("/v1/governance/timeline/episodes/actions", {
        method: "POST",
        body: JSON.stringify(actionPayload),
      });
      await reloadTimeline();
    } finally {
      setActionBusyKey(null);
    }
  }

  return (
    <div className="space-y-6 pb-6">
      <Card className="border-border bg-[linear-gradient(135deg,#ffffff_0%,#f8fafc_52%,#eef6ff_100%)] shadow-[0_18px_48px_rgba(15,23,42,0.06)]">
        <CardContent className="space-y-4 p-6">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div className="space-y-2">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-brand-600">Governança & rastreabilidade</p>
              <h1 className="text-3xl font-semibold tracking-tight text-text">Timeline de Governança</h1>
              <p className="max-w-4xl text-sm leading-7 text-text-body">
                Uma linha do tempo curada com eventos de governança, qualidade e operação para explicar o estado dos ativos sem precisar abrir várias telas.
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <Badge tone="neutral">{summary.total} evento(s)</Badge>
              <Badge tone="accent">{payload?.episode_total || 0} episódio(s)</Badge>
              <Badge tone="neutral">{activeFilters > 0 ? `${activeFilters} filtro(s)` : "Sem filtros"}</Badge>
              {payload?.table_fqn ? <Badge tone="accent">{payload.table_fqn}</Badge> : null}
              <Button asChild size="sm" variant="outline">
                <Link href="/governance">Voltar à governança</Link>
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {summaryCard({ icon: ShieldAlert, label: "Governança", value: summary.governance, tone: "accent" })}
        {summaryCard({ icon: Workflow, label: "Operação", value: summary.operation, tone: "neutral" })}
        {summaryCard({ icon: Sparkles, label: "Qualidade", value: summary.quality, tone: "success" })}
        {summaryCard({ icon: AlertTriangle, label: "Incidentes", value: summary.incident, tone: "warning" })}
        {summaryCard({ icon: Clock3, label: "Manuais", value: summary.manual, tone: "neutral" })}
        {summaryCard({ icon: Clock3, label: "Automáticos", value: summary.automatic, tone: "accent" })}
      </div>

      <Card className="border-border bg-surface shadow-[0_12px_40px_rgba(15,23,42,0.05)]">
        <CardHeader className="space-y-2 border-b border-border">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-brand-600">Painel analítico da timeline</p>
            <p className="mt-1 text-sm text-text-body">Resumo operacional dos episódios filtrados: recorrência, impacto e estado de tratamento.</p>
          </div>
        </CardHeader>
        <CardContent className="space-y-4 p-4 sm:p-5">
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            {summaryCard({ icon: Sparkles, label: "Total de episódios", value: analytics.total_episodes, tone: "accent" })}
            {summaryCard({ icon: AlertTriangle, label: "Críticos", value: analytics.critical_episodes, tone: "danger" })}
            {summaryCard({ icon: Workflow, label: "Recorrentes", value: analytics.recurrent_episodes, tone: "warning" })}
            {summaryCard({ icon: Clock3, label: "Silenciados", value: analytics.silenced_episodes, tone: "neutral" })}
          </div>
          <div className="grid gap-3 lg:grid-cols-3">
            <div className="rounded-2xl border border-border bg-bg-subtle/80 p-4">
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-muted">Impacto</p>
              <p className="mt-2 text-sm text-text-body">
                {analytics.impacted_assets} ativo(s) afetado(s) · {analytics.impacted_columns} coluna(s) envolvida(s)
              </p>
              <p className="mt-2 text-xs text-muted">
                Média de importância: {analytics.average_importance_score} · Média de eventos por episódio: {analytics.average_event_count}
              </p>
            </div>
            <div className="rounded-2xl border border-border bg-bg-subtle/80 p-4">
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-muted">Estados</p>
              <div className="mt-2 flex flex-wrap gap-2">
                <Badge tone="warning">Abertos {analytics.open_episodes}</Badge>
                <Badge tone="accent">Reconhecidos {analytics.acknowledged_episodes}</Badge>
                <Badge tone="neutral">Resolvidos {analytics.resolved_episodes}</Badge>
              </div>
            </div>
            <div className="rounded-2xl border border-border bg-bg-subtle/80 p-4">
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-muted">Tipos mais frequentes</p>
              <div className="mt-3 space-y-2">
                {analytics.top_episode_types.slice(0, 3).map((item) => (
                  <div className="flex items-center justify-between gap-3" key={item.label}>
                    <span className="text-sm text-text-body">{item.label}</span>
                    <Badge tone="neutral">{item.count}</Badge>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <form className="space-y-4 rounded-[28px] border border-border bg-surface p-5 shadow-soft" onSubmit={onApply}>
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-brand-600">Filtros da timeline</p>
            <p className="mt-1 text-sm text-text-body">
              Concentre a leitura por contexto, tipo de evento e sinais de governança relevantes.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button onClick={() => setShowAdvanced((value) => !value)} type="button" variant="outline">
              <Filter className="h-4 w-4" />
              {showAdvanced ? "Ocultar avançados" : "Mostrar avançados"}
            </Button>
            <Button type="button" variant="ghost" onClick={onClear}>
              Limpar filtros
            </Button>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2 rounded-2xl border border-border bg-bg-subtle/80 px-4 py-3">
          <span className="text-xs font-semibold uppercase tracking-[0.16em] text-muted">Atalhos rápidos</span>
          <Button
            onClick={() =>
              applyQuickPreset({
                category: "",
                manual_only: "",
                automatic_only: "",
                severity: "critical",
                episode_status: "",
                episode_type: "",
                min_importance_score: "",
              })
            }
            size="sm"
            type="button"
            variant="outline"
          >
            Eventos críticos
          </Button>
          <Button
            onClick={() =>
              applyQuickPreset({
                category: "",
                severity: "",
                manual_only: "",
                automatic_only: "true",
                episode_status: "",
                episode_type: "",
                min_importance_score: "",
              })
            }
            size="sm"
            type="button"
            variant="outline"
          >
            Somente automáticos
          </Button>
          <Button
            onClick={() =>
              applyQuickPreset({
                category: "",
                severity: "",
                manual_only: "",
                automatic_only: "",
                episode_status: "",
                episode_type: "governance_change",
                min_importance_score: "",
              })
            }
            size="sm"
            type="button"
            variant="outline"
          >
            Mudanças de governança
          </Button>
          <Button
            onClick={() =>
              applyQuickPreset({
                category: "",
                episode_status: "open",
                episode_type: "",
                min_importance_score: "",
              })
            }
            size="sm"
            type="button"
            variant="outline"
          >
            Episódios abertos
          </Button>
          <Button
            onClick={() =>
              applyQuickPreset({
                category: "",
                episode_status: "acknowledged",
                episode_type: "",
                min_importance_score: "",
              })
            }
            size="sm"
            type="button"
            variant="outline"
          >
            Reconhecidos
          </Button>
          <Button
            onClick={() =>
              applyQuickPreset({
                category: "",
                episode_status: "silenced",
                episode_type: "",
                min_importance_score: "",
              })
            }
            size="sm"
            type="button"
            variant="outline"
          >
            Silenciados
          </Button>
        </div>

        <div className="grid gap-3 lg:grid-cols-4">
          <Input placeholder="Buscar por ativo, evento ou detalhe" value={filters.q} onChange={(e) => setFilters((prev) => ({ ...prev, q: e.target.value }))} />
          <Input placeholder="Fonte" value={filters.source} onChange={(e) => setFilters((prev) => ({ ...prev, source: e.target.value }))} />
          <Input placeholder="Datasource" value={filters.datasource} onChange={(e) => setFilters((prev) => ({ ...prev, datasource: e.target.value }))} />
          <Input placeholder="Owner" value={filters.owner} onChange={(e) => setFilters((prev) => ({ ...prev, owner: e.target.value }))} />
        </div>

        {showAdvanced ? (
          <div className="grid gap-3 rounded-2xl border border-border bg-bg-subtle p-4 lg:grid-cols-4">
            <Input placeholder="Schema" value={filters.schema_name} onChange={(e) => setFilters((prev) => ({ ...prev, schema_name: e.target.value }))} />
            <Select value={filters.category} onChange={(e) => setFilters((prev) => ({ ...prev, category: e.target.value }))}>
              <option value="">Todas as categorias</option>
              <option value="governance">Governança</option>
              <option value="operation">Operação</option>
              <option value="quality">Qualidade</option>
              <option value="incident">Incidente</option>
              <option value="audit">Auditoria</option>
            </Select>
            <Select value={filters.event_type} onChange={(e) => setFilters((prev) => ({ ...prev, event_type: e.target.value }))}>
              <option value="">Todos os tipos</option>
              <option value="owner_changed">Owner</option>
              <option value="tag_applied">Tag aplicada</option>
              <option value="tag_suggestion">Sugestão de tag</option>
              <option value="term_changed">Termo</option>
              <option value="classification_changed">Classificação</option>
              <option value="certification_changed">Certificação</option>
              <option value="incident_opened">Incidente aberto</option>
              <option value="incident_closed">Incidente encerrado</option>
              <option value="dq_run_success">DQ sucesso</option>
              <option value="dq_run_failure">DQ falha</option>
              <option value="pipeline_success">Pipeline sucesso</option>
              <option value="pipeline_failure">Pipeline falha</option>
            </Select>
            <Select value={filters.severity} onChange={(e) => setFilters((prev) => ({ ...prev, severity: e.target.value }))}>
              <option value="">Toda severidade</option>
              <option value="low">Baixa</option>
              <option value="medium">Média</option>
              <option value="high">Alta</option>
              <option value="critical">Crítica</option>
            </Select>
            <Select value={filters.certification_status} onChange={(e) => setFilters((prev) => ({ ...prev, certification_status: e.target.value }))}>
              <option value="">Toda certificação</option>
              <option value="not_eligible">Não elegível</option>
              <option value="eligible">Elegível</option>
              <option value="certified">Certificada</option>
              <option value="revalidation_pending">Pendente de revalidação</option>
            </Select>
            <Select value={filters.manual_only} onChange={(e) => setFilters((prev) => ({ ...prev, manual_only: e.target.value }))}>
              <option value="">Manual e automático</option>
              <option value="true">Somente manual</option>
            </Select>
            <Select value={filters.automatic_only} onChange={(e) => setFilters((prev) => ({ ...prev, automatic_only: e.target.value }))}>
              <option value="">Manual e automático</option>
              <option value="true">Somente automático</option>
            </Select>
            <Select value={filters.contains_pii} onChange={(e) => setFilters((prev) => ({ ...prev, contains_pii: e.target.value }))}>
              <option value="">PII em aberto</option>
              <option value="true">Contém PII</option>
            </Select>
            <Select value={filters.contains_sensitive} onChange={(e) => setFilters((prev) => ({ ...prev, contains_sensitive: e.target.value }))}>
              <option value="">Sensibilidade</option>
              <option value="true">Contém dados sensíveis</option>
            </Select>
            <Select value={filters.contains_critical} onChange={(e) => setFilters((prev) => ({ ...prev, contains_critical: e.target.value }))}>
              <option value="">Criticidade</option>
              <option value="true">Contém coluna crítica</option>
            </Select>
            <Select value={filters.open_incidents} onChange={(e) => setFilters((prev) => ({ ...prev, open_incidents: e.target.value }))}>
              <option value="">Incidentes</option>
              <option value="true">Somente com incidentes abertos</option>
            </Select>
            <Select value={filters.dq_recent} onChange={(e) => setFilters((prev) => ({ ...prev, dq_recent: e.target.value }))}>
              <option value="">Qualidade</option>
              <option value="true">Somente com DQ recente</option>
            </Select>
            <Select value={filters.episode_status} onChange={(e) => setFilters((prev) => ({ ...prev, episode_status: e.target.value }))}>
              <option value="">Todos os episódios</option>
              <option value="open">Abertos</option>
              <option value="watching">Em observação</option>
              <option value="acknowledged">Reconhecidos</option>
              <option value="silenced">Silenciados</option>
              <option value="resolved">Resolvidos</option>
            </Select>
            <Select value={filters.episode_type} onChange={(e) => setFilters((prev) => ({ ...prev, episode_type: e.target.value }))}>
              <option value="">Todos os tipos de episódio</option>
              <option value="ingestion">Ingestão</option>
              <option value="quality">Qualidade</option>
              <option value="governance_change">Mudança de governança</option>
              <option value="trust">Confiança</option>
              <option value="incident">Incidente</option>
            </Select>
            <Input
              placeholder="Importância mínima"
              type="number"
              min="0"
              max="100"
              value={filters.min_importance_score}
              onChange={(e) => setFilters((prev) => ({ ...prev, min_importance_score: e.target.value }))}
            />
            <Input placeholder="table_id" value={filters.table_id} onChange={(e) => setFilters((prev) => ({ ...prev, table_id: e.target.value }))} />
            <Input placeholder="column_id" value={filters.column_id} onChange={(e) => setFilters((prev) => ({ ...prev, column_id: e.target.value }))} />
            <Input type="date" value={filters.date_from} onChange={(e) => setFilters((prev) => ({ ...prev, date_from: e.target.value }))} />
            <Input type="date" value={filters.date_to} onChange={(e) => setFilters((prev) => ({ ...prev, date_to: e.target.value }))} />
          </div>
        ) : null}

        <div className="flex justify-end">
          <Button type="submit">Aplicar filtros</Button>
        </div>
      </form>

      <Card className="border-border bg-surface shadow-[0_12px_40px_rgba(15,23,42,0.05)]">
        <CardHeader className="space-y-2 border-b border-border">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-brand-600">Linha do tempo curada</p>
              <p className="mt-1 text-sm text-text-body">
                {payload?.table_fqn ? `Timeline do ativo ${payload.table_fqn}` : "Eventos mais recentes do ecossistema de governança"}
              </p>
            </div>
            <div className="flex flex-wrap gap-2 text-xs text-muted">
              <span>
                {rangeStart} - {rangeEnd} de {visibleCount}
              </span>
              {payload?.table_fqn ? (
                <Link className="font-semibold text-info-700 hover:text-info-700" href={`/explorer?tableId=${payload.table_id}&tab=history`}>
                  Abrir no Explorer
                </Link>
              ) : null}
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button onClick={() => setViewMode("episodes")} size="sm" variant={viewMode === "episodes" ? "default" : "outline"} type="button">
              Episódios
            </Button>
            <InfoTooltip text="Um episódio agrupa eventos correlacionados do mesmo ativo, com 'o que mudou', 'por que importa' e 'próxima ação'." />
            <Button onClick={() => setViewMode("events")} size="sm" variant={viewMode === "events" ? "default" : "outline"} type="button">
              Eventos brutos
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-4 p-4 sm:p-5">
          {error ? <p className="text-sm text-danger-600">{error}</p> : null}
          {viewMode === "episodes" ? (
            <TimelineEpisodeFeed
              compact={false}
              emptyDescription="Nenhum episódio consolidado encontrado para os filtros selecionados."
              emptyTitle="Sem episódios na timeline"
              episodes={payload?.episodes || []}
              loading={loading}
              onAcknowledgeEpisode={(episodeKey) => void submitEpisodeAction(episodeKey, "acknowledge")}
              onSilenceEpisode={(episodeKey) => void submitEpisodeAction(episodeKey, "silence")}
              actionBusyKey={actionBusyKey}
              tableTimelineHref={payload?.table_id ? `/explorer?tableId=${payload.table_id}&tab=history` : null}
            />
          ) : (
            <TimelineFeed
              compact={false}
              emptyDescription="Nenhum evento curado encontrado para os filtros selecionados."
              emptyTitle="Sem eventos na timeline"
              events={payload?.items || []}
              loading={loading}
              tableTimelineHref={payload?.table_id ? `/explorer?tableId=${payload.table_id}&tab=history` : null}
            />
          )}
        </CardContent>
      </Card>

      <div className="flex items-center justify-between gap-3">
        <p className="text-sm text-muted">
          Página {payload?.page || page} de {totalPages}
        </p>
        <div className="flex gap-2">
          <Button disabled={page <= 1} onClick={() => setPage((value) => Math.max(1, value - 1))} variant="outline">
            Anterior
          </Button>
          <Button disabled={page >= totalPages} onClick={() => setPage((value) => value + 1)} variant="outline">
            Próxima
          </Button>
        </div>
      </div>
    </div>
  );
}
