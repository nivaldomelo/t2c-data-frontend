import { AlertTriangle, Sparkles, Table2 } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { Select } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { DonutChart, formatDateTime, MiniBarList, TrendChart } from "@/features/dashboard/components/shared";
import { cn } from "@/lib/cn";
import type {
  ExecutiveAppliedFilters,
  ExecutiveFilterOption,
  ExecutiveDashboardSummary,
  DashboardSummary,
  ExecutiveMaturityPanelItem,
} from "@/features/dashboard/types";

type BadgeTone = "success" | "accent" | "warning" | "danger" | "neutral";

type ExecutiveDashboardViewProps = {
  platformSummary: DashboardSummary | null;
  summary: ExecutiveDashboardSummary | null;
  loading: boolean;
  error: string;
  filters: ExecutiveAppliedFilters;
  sourceOptions: ExecutiveFilterOption[];
  sourcesLoading: boolean;
  onClearFilters: () => void;
  onFiltersChange: (patch: Partial<ExecutiveAppliedFilters>) => void;
  onRefresh: () => void;
};

type StatTone = BadgeTone;

type MetricCardData = {
  key: string;
  label: string;
  value: string;
  detail: string;
  tone: StatTone;
};

const STAT_TONES: Record<StatTone, string> = {
  success: "border-success-200 bg-success-50 text-success-800",
  accent: "border-brand-200 bg-brand-50 text-brand-800",
  warning: "border-warning-200 bg-warning-50 text-warning-800",
  danger: "border-danger-200 bg-danger-50 text-danger-800",
  neutral: "border-border bg-bg-subtle text-text-body",
};

function normalizeTone(tone?: string | null): BadgeTone {
  if (tone === "danger" || tone === "warning" || tone === "success" || tone === "accent") {
    return tone;
  }
  return "neutral";
}

function severityTone(severity?: string | null): BadgeTone {
  const value = severity?.toLowerCase() ?? "";
  if (value.includes("sev1") || value.includes("critical") || value.includes("critico") || value.includes("crítico")) {
    return "danger";
  }
  if (value.includes("high") || value.includes("sev2") || value.includes("warn")) {
    return "warning";
  }
  return "neutral";
}

function formatNumber(value: number): string {
  return new Intl.NumberFormat("pt-BR").format(value);
}

function percent(value: number): string {
  return `${new Intl.NumberFormat("pt-BR", { maximumFractionDigits: 1 }).format(value)}%`;
}

function findCoverageCount(summary: DashboardSummary | null, key: string): number {
  if (!summary) return 0;
  return summary.governance.coverage.find((item) => item.key === key)?.count ?? 0;
}

function findDocumentationCount(summary: DashboardSummary | null, key: string): number {
  if (!summary) return 0;
  return summary.documentation.coverage.find((item) => item.key === key)?.count ?? 0;
}

function findGapCount(summary: ExecutiveDashboardSummary | null, key: string): number {
  if (!summary) return 0;
  return summary.governance_gaps.items.find((item) => item.key === key)?.count ?? 0;
}

function findCampaignCount(summary: ExecutiveDashboardSummary | null, key: string): number {
  if (!summary) return 0;
  return summary.campaigns.find((item) => item.key === key)?.count ?? 0;
}

function findCertCount(summary: ExecutiveDashboardSummary | null, key: "certified" | "eligible_not_certified" | "not_eligible"): number {
  if (!summary) return 0;
  return summary.certification[key];
}

function asSafeCount(value: number): number {
  return Number.isFinite(value) ? Math.max(0, value) : 0;
}

function SectionHeader({
  icon: Icon,
  title,
  badge,
}: {
  icon: typeof Table2;
  title: string;
  badge?: string;
}) {
  return (
    <div className="flex items-center justify-between gap-3">
      <div className="flex items-center gap-2">
        <span className="rounded-lg border border-border bg-muted/40 p-2">
          <Icon className="h-4 w-4 text-primary" />
        </span>
        <h2 className="text-base font-semibold text-foreground">{title}</h2>
      </div>
      {badge ? <Badge tone="neutral">{badge}</Badge> : null}
    </div>
  );
}

function MetricCard({ item }: { item: MetricCardData }) {
  return (
    <div className={cn("rounded-2xl border p-4 shadow-sm", STAT_TONES[item.tone])}>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] opacity-80">{item.label}</p>
          <p className="mt-2 text-3xl font-semibold tracking-tight text-text">{item.value}</p>
        </div>
      </div>
      <p className="mt-2 text-sm leading-6 opacity-90">{item.detail}</p>
    </div>
  );
}

function SchemaCard({ item }: { item: ExecutiveMaturityPanelItem }) {
  return (
    <div className="rounded-2xl border border-border/80 bg-surface p-4 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold text-text">{item.label}</p>
          <p className="mt-1 text-xs text-muted">
            {formatNumber(item.asset_count)} tabela(s) · {formatNumber(item.open_incidents)} incidente(s) aberto(s)
          </p>
        </div>
        <Badge tone={item.governance_tone === "success" ? "success" : item.governance_tone === "accent" ? "accent" : item.governance_tone === "warning" ? "warning" : "neutral"}>
          {item.governance_label}
        </Badge>
      </div>

      <div className="mt-3 space-y-2">
        <div className="flex items-center justify-between text-[11px] text-muted">
          <span>Governança média</span>
          <span>{item.governance_avg_score.toFixed(1)} pts</span>
        </div>
        <div className="h-2 overflow-hidden rounded-full bg-bg-subtle">
          <div className="h-full rounded-full bg-gradient-to-r from-brand-500 via-accent-500 to-emerald-500" style={{ width: `${Math.max(0, Math.min(100, item.governance_avg_score))}%` }} />
        </div>
      </div>

      <div className="mt-3 grid gap-2 text-xs text-text-body sm:grid-cols-2">
        <div className="rounded-xl bg-bg-subtle px-3 py-2">Owner {percent(item.owner_pct)}</div>
        <div className="rounded-xl bg-bg-subtle px-3 py-2">Descrição {percent(item.description_pct)}</div>
        <div className="rounded-xl bg-bg-subtle px-3 py-2">Tags {percent(item.tags_pct)}</div>
        <div className="rounded-xl bg-bg-subtle px-3 py-2">Glossário {percent(item.glossary_pct)}</div>
        <div className="rounded-xl bg-bg-subtle px-3 py-2">Pipeline {percent(item.pipeline_mapped_pct)}</div>
        <div className="rounded-xl bg-bg-subtle px-3 py-2">DQ {item.dq_avg_score.toFixed(1)}</div>
      </div>
    </div>
  );
}

function trendPointList(points: Array<{ bucket_date: string; avg_score: number }>) {
  return points.map((point) => ({
    label: point.bucket_date.slice(5),
    value: point.avg_score,
  }));
}

function compactSchemaLabel(label: string, sourceLabel?: string | null): string {
  if (sourceLabel && label.startsWith(`${sourceLabel} / `)) {
    return label.slice(sourceLabel.length + 3);
  }
  const parts = label.split(" / ");
  return parts.length > 1 ? parts.slice(1).join(" / ") : label;
}

function formatScopeLabel(
  filters: ExecutiveAppliedFilters,
  sources: ExecutiveFilterOption[],
  schemas: ExecutiveDashboardSummary["available_filters"]["schemas"],
): string {
  const sourceLabel = filters.data_source_id != null ? sources.find((item) => item.value === String(filters.data_source_id))?.label : null;
  const schemaLabel = filters.schema_key ? schemas.find((item) => item.value === filters.schema_key)?.label : null;
  if (sourceLabel && schemaLabel) return `Fonte: ${sourceLabel} · Schema: ${compactSchemaLabel(schemaLabel, sourceLabel)}`;
  if (sourceLabel) return `Fonte: ${sourceLabel}`;
  if (schemaLabel) return `Schema: ${schemaLabel}`;
  return "Escopo global";
}

export function ExecutiveDashboardView({
  platformSummary,
  summary,
  loading,
  error,
  filters,
  sourceOptions,
  sourcesLoading,
  onClearFilters,
  onFiltersChange,
  onRefresh,
}: ExecutiveDashboardViewProps) {
  if (loading && !summary) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-16 w-full rounded-2xl" />
        <Skeleton className="h-72 w-full rounded-2xl" />
        <Skeleton className="h-36 w-full rounded-2xl" />
      </div>
    );
  }

  if (!summary) {
    return (
      <EmptyState
        title="Dashboard indisponível"
        description={error || "Não foi possível carregar o resumo executivo."}
        action={
          <Button size="sm" onClick={onRefresh}>
            Tentar novamente
          </Button>
        }
      />
    );
  }

  const totalTables = asSafeCount(
    platformSummary?.sources.distribution.total_tables ??
      platformSummary?.kpis.find((item) => item.key === "assets")?.value ??
      summary.kpis.find((item) => item.key === "total_assets")?.value ??
      0,
  );
  const totalSources = asSafeCount(platformSummary?.sources.distribution.total_sources ?? platformSummary?.kpis.find((item) => item.key === "datasources")?.value ?? 0);
  const totalSchemas = asSafeCount(platformSummary?.sources.distribution.total_schemas ?? summary.available_filters.schemas.length);
  const certified = asSafeCount(platformSummary?.certification.by_status.find((item) => item.key === "certified")?.value ?? findCertCount(summary, "certified"));
  const eligibleNotCertified = findCertCount(summary, "eligible_not_certified");
  const eligibleTables = asSafeCount(platformSummary?.certification.eligible_tables ?? certified + eligibleNotCertified);
  const pendingTables = asSafeCount(totalTables - certified);
  const ownerCount = platformSummary ? findCoverageCount(platformSummary, "owner") : asSafeCount(totalTables - findGapCount(summary, "no_owner"));
  const dictionaryCount = platformSummary ? findCoverageCount(platformSummary, "dictionary") : asSafeCount(totalTables - findGapCount(summary, "no_dictionary"));
  const tagsCount = platformSummary ? findCoverageCount(platformSummary, "tags") : asSafeCount(totalTables - findGapCount(summary, "no_tags"));
  const classificationCount = platformSummary ? findCoverageCount(platformSummary, "classification") : asSafeCount(totalTables - findCampaignCount(summary, "no_classification"));
  const descriptionCount = platformSummary ? findDocumentationCount(platformSummary, "description") : 0;
  const monitoredCount = platformSummary ? asSafeCount(totalTables - platformSummary.dq.without_metrics) : asSafeCount(totalTables - summary.dq.not_evaluated);
  const pendingCritical = platformSummary?.certification.pending_critical ?? summary.certification.eligible_not_certified + summary.certification.not_eligible;
  const dqBelowMinimum = platformSummary?.dq.below_minimum ?? 0;
  const dqWithoutMetrics = platformSummary?.dq.without_metrics ?? summary.dq.not_evaluated;
  const activeFilters = Object.entries(filters).filter(([, value]) => Boolean(value));
  const selectedSourceId = filters.data_source_id != null ? String(filters.data_source_id) : "";
  const selectedSchemaKey = filters.schema_key ?? "";
  const allSchemaOptions = summary.available_filters.schemas;
  const schemaOptions = selectedSourceId
    ? allSchemaOptions.filter((item) => String(item.datasource_id ?? "") === selectedSourceId)
    : allSchemaOptions;
  const selectedSource = sourceOptions.find((item) => item.value === selectedSourceId);
  const selectedSchema = allSchemaOptions.find((item) => item.value === selectedSchemaKey);
  const scopeLabel = formatScopeLabel(filters, sourceOptions, allSchemaOptions);
  const governanceTrendPoints = trendPointList(summary.governance_trend.history);
  const dqTrendPoints = summary.dq.trend;
  const schemaVolumeBars = [...summary.maturity_panels.by_schema]
    .sort((a, b) => b.asset_count - a.asset_count)
    .slice(0, 8)
    .map((item) => ({
      key: item.key,
      label: item.label,
      value: item.asset_count,
      tone: null,
    }));
  const schemaRiskBars = [...summary.risk.by_schema]
    .sort((a, b) => b.avg_score - a.avg_score)
    .slice(0, 8)
    .map((item) => ({
      key: item.label,
      label: item.label,
      value: Math.round(item.avg_score),
      tone: null,
    }));

  const volumeCards: MetricCardData[] = [
    {
      key: "sources",
      label: "Fontes de dados",
      value: formatNumber(totalSources),
      detail: "No recorte atual",
      tone: "accent",
    },
    {
      key: "schemas",
      label: "Schemas",
      value: formatNumber(totalSchemas),
      detail: selectedSourceId ? "Na fonte selecionada" : "No recorte atual",
      tone: "neutral",
    },
    {
      key: "tables",
      label: "Tabelas catalogadas",
      value: formatNumber(totalTables),
      detail: "Ativos catalogados",
      tone: "neutral",
    },
    {
      key: "served",
      label: "Tabelas atendidas",
      value: formatNumber(eligibleTables),
      detail: `${percent((eligibleTables / Math.max(1, totalTables)) * 100)} do recorte`,
      tone: "success",
    },
    {
      key: "certified",
      label: "Tabelas certificadas",
      value: formatNumber(certified),
      detail: `${percent((certified / Math.max(1, totalTables)) * 100)} do recorte`,
      tone: "success",
    },
    {
      key: "pending",
      label: "Tabelas pendentes",
      value: formatNumber(pendingTables),
      detail: `${percent((pendingTables / Math.max(1, totalTables)) * 100)} do recorte`,
      tone: "warning",
    },
  ];

  const coverageBars = [
    {
      key: "owner",
      label: "Com owner",
      count: ownerCount,
      total: totalTables,
      tone: "accent" as const,
    },
    {
      key: "dictionary",
      label: "Com dicionário",
      count: dictionaryCount,
      total: totalTables,
      tone: "accent" as const,
    },
    {
      key: "tags",
      label: "Com tags",
      count: tagsCount,
      total: totalTables,
      tone: "warning" as const,
    },
    {
      key: "classification",
      label: "Classificadas",
      count: classificationCount,
      total: totalTables,
      tone: "danger" as const,
    },
    {
      key: "description",
      label: "Com descrição",
      count: descriptionCount,
      total: totalTables,
      tone: "neutral" as const,
    },
    {
      key: "quality",
      label: "Qualidade monitorada",
      count: monitoredCount,
      total: totalTables,
      tone: dqBelowMinimum > 0 || dqWithoutMetrics > 0 ? ("warning" as const) : ("success" as const),
    },
  ];

  return (
    <div className="space-y-4">
      {error ? (
        <Card className="border-warning/30 bg-warning/10">
          <CardContent className="flex items-center gap-2 p-3 text-sm text-warning">
            <AlertTriangle className="h-4 w-4 shrink-0" />
            {error}
          </CardContent>
        </Card>
      ) : null}

      <Card className="border-border/70 bg-card/95 shadow-sm">
        <CardContent className="space-y-4 p-4 md:p-5">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
            <div className="space-y-1">
              <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-brand-600">Escopo executivo</p>
              <h3 className="text-lg font-semibold tracking-tight text-text">Filtros globais</h3>
              <p className="text-sm leading-6 text-text-body">Todos os indicadores abaixo respeitam este recorte.</p>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button disabled={!activeFilters.length} onClick={onClearFilters} size="sm" variant="outline">
                Limpar
              </Button>
              <Button onClick={onRefresh} size="sm">
                Atualizar
              </Button>
            </div>
          </div>

          <div className="grid gap-3 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,1.3fr)] xl:grid-cols-[minmax(0,0.95fr)_minmax(0,1.25fr)_minmax(0,0.8fr)]">
            <div className="space-y-2">
              <p className="text-xs font-medium uppercase tracking-[0.16em] text-muted">Data Source</p>
              <Select
                disabled={sourcesLoading && !sourceOptions.length}
                onChange={(event) => {
                  const nextSourceId = event.target.value ? Number(event.target.value) : null;
                  const nextSchemaOptions = nextSourceId === null ? allSchemaOptions : allSchemaOptions.filter((item) => item.datasource_id === nextSourceId);
                  const nextSchemaKey = nextSchemaOptions.some((item) => item.value === selectedSchemaKey) ? selectedSchemaKey : null;
                  onFiltersChange({ data_source_id: nextSourceId, schema_key: nextSchemaKey, source: null, schema: null });
                }}
                value={selectedSourceId}
              >
                <option value="">Todas as fontes</option>
                {sourceOptions.map((item) => (
                  <option key={item.value} value={item.value}>
                    {item.label}
                  </option>
                ))}
              </Select>
            </div>

            <div className="space-y-2">
              <p className="text-xs font-medium uppercase tracking-[0.16em] text-muted">Schema</p>
              <Select disabled={!schemaOptions.length} onChange={(event) => onFiltersChange({ schema_key: event.target.value || null, schema: null })} value={selectedSchemaKey}>
                <option value="">Todos os schemas</option>
                {schemaOptions.map((item) => (
                  <option key={item.value} value={item.value}>
                    {item.label}
                  </option>
                ))}
              </Select>
              <p className="text-xs text-muted">
                {selectedSource
                  ? schemaOptions.length
                    ? `Schemas da fonte selecionada: ${selectedSource.label}.`
                    : `Esta fonte ainda não possui schemas catalogados.`
                  : "Selecione uma fonte para restringir o recorte."}
              </p>
            </div>

            <div className="space-y-2 lg:col-span-2 xl:col-span-1">
              <p className="text-xs font-medium uppercase tracking-[0.16em] text-muted">Escopo ativo</p>
              <div className="rounded-2xl border border-border/80 bg-surface px-4 py-3 text-sm text-text-body shadow-sm">
                <p className="font-medium text-text">{scopeLabel}</p>
                <p className="mt-1 text-xs leading-5 text-muted">
                  {selectedSource && selectedSchema
                    ? "Todos os blocos executivos respeitam a combinação fonte + schema."
                    : selectedSource
                      ? "Todos os blocos executivos respeitam a fonte selecionada."
                      : "Todos os blocos executivos refletem a visão global."}
              </p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="border-border/70 bg-card/95 shadow-sm">
        <CardContent className="space-y-4 p-4 md:p-5">
          <SectionHeader icon={Table2} title="Cards principais de volume" badge={`${formatNumber(totalTables)} tabelas`} />
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
            {volumeCards.map((item) => (
              <MetricCard item={item} key={item.key} />
            ))}
          </div>
        </CardContent>
      </Card>

      <Card className="border-border/70 bg-card/95 shadow-sm">
        <CardContent className="space-y-4 p-4 md:p-5">
          <SectionHeader icon={Sparkles} title="Governança e cobertura" badge={`${formatNumber(ownerCount)}/${formatNumber(totalTables)}`} />
          <div className="space-y-3">
            {coverageBars.map((item) => (
              <div className="rounded-2xl border border-border/70 bg-surface p-4 shadow-sm" key={item.key}>
                <div className="flex flex-wrap items-end justify-between gap-3">
                  <div>
                    <p className="text-sm font-semibold text-text">{item.label}</p>
                    <p className="mt-1 text-xs text-muted">
                      {formatNumber(item.count)} de {formatNumber(item.total)} ativos
                    </p>
                  </div>
                  <p className="text-sm font-semibold text-text">{percent((item.count / Math.max(1, item.total)) * 100)}</p>
                </div>
                <div className="mt-3 h-2 overflow-hidden rounded-full bg-bg-subtle">
                  <div
                    className={cn(
                      "h-full rounded-full",
                      item.tone === "danger"
                        ? "bg-gradient-to-r from-danger-500 to-rose-500"
                        : item.tone === "warning"
                          ? "bg-gradient-to-r from-warning-500 to-amber-500"
                          : item.tone === "success"
                            ? "bg-gradient-to-r from-success-500 to-emerald-500"
                            : item.tone === "accent"
                              ? "bg-gradient-to-r from-brand-500 to-accent-500"
                              : "bg-gradient-to-r from-slate-400 to-slate-500",
                    )}
                    style={{ width: `${Math.max(0, Math.min(100, (item.count / Math.max(1, item.total)) * 100))}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-4 xl:grid-cols-[1.1fr_0.9fr]">
        <Card className="border-border/70 bg-card/95 shadow-sm">
          <CardContent className="space-y-4 p-4 md:p-5">
            <SectionHeader icon={Sparkles} title="Certificação dos ativos" badge={`${formatNumber(certified)}/${formatNumber(totalTables)}`} />
            {platformSummary ? <Badge tone="neutral">Pendências críticas: {formatNumber(pendingCritical)}</Badge> : null}
            {platformSummary ? <DonutChart centerLabel="Tabelas" items={platformSummary.certification.by_status} /> : null}
            <p className="text-sm leading-6 text-text-body">Distribuição de certificação no recorte atual.</p>
            <div className="grid gap-3 md:grid-cols-2">
              <MetricCard
                item={{
                  key: "certified-rate",
                  label: "Certificadas",
                  value: `${percent(summary.certification.certified_pct)}`,
                  detail: "Tabelas já aprovadas e prontas para uso confiável.",
                  tone: "success",
                }}
              />
              <MetricCard
                item={{
                  key: "eligible-rate",
                  label: "Elegíveis não certificadas",
                  value: `${percent(summary.certification.eligible_not_certified_pct)}`,
                  detail: "Ativos com cobertura suficiente, mas ainda fora da decisão formal.",
                  tone: "accent",
                }}
              />
              <MetricCard
                item={{
                  key: "not-eligible",
                  label: "Ainda não elegíveis",
                  value: `${percent(summary.certification.not_eligible_pct)}`,
                  detail: "Tabelas que ainda precisam fechar requisitos básicos de confiança.",
                  tone: "warning",
                }}
              />
              <MetricCard
                item={{
                  key: "critical-pending",
                  label: "Críticas pendentes",
                  value: formatNumber(pendingCritical),
                  detail: "Ativos ainda não certificados com incidente crítico em aberto.",
                  tone: "danger",
                }}
              />
            </div>
          </CardContent>
        </Card>

        <Card className="border-border/70 bg-card/95 shadow-sm">
          <CardContent className="space-y-4 p-4 md:p-5">
            <SectionHeader icon={Sparkles} title="Schemas com maior pendência" badge={`${summary.maturity_panels.by_schema.length}`} />
            <p className="text-sm leading-6 text-text-body">Ranking visual dos schemas com menor score de governança no recorte atual.</p>
            <div className="space-y-3">
              {summary.maturity_panels.by_schema.length ? (
                summary.maturity_panels.by_schema.slice(0, 6).map((item) => <SchemaCard item={item} key={item.key} />)
              ) : (
                <EmptyState
                  title="Sem leitura por schema"
                  description="Ainda não há dados suficientes para ranquear os schemas neste recorte. Revise os filtros ou aguarde a próxima atualização das leituras."
                />
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 xl:grid-cols-2">
        <Card className="border-border/70 bg-card/95 shadow-sm">
          <CardContent className="space-y-4 p-4 md:p-5">
            <SectionHeader icon={Table2} title="Tabelas por schema" badge={`${schemaVolumeBars.length}`} />
            <p className="text-sm leading-6 text-text-body">
              Distribuição do volume por schema no recorte atual. Ajuda a localizar onde o catálogo concentra mais ativos.
            </p>
            <MiniBarList items={schemaVolumeBars} />
          </CardContent>
        </Card>

        <Card className="border-border/70 bg-card/95 shadow-sm">
          <CardContent className="space-y-4 p-4 md:p-5">
            <SectionHeader icon={Sparkles} title="Schemas com maior risco médio" badge={`${schemaRiskBars.length}`} />
            <p className="text-sm leading-6 text-text-body">
              Ranking dos schemas com maior score médio de risco. Quanto maior o valor, maior a prioridade de investigação.
            </p>
            <MiniBarList items={schemaRiskBars} />
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 xl:grid-cols-2">
        <Card className="border-border/70 bg-card/95 shadow-sm">
          <CardContent className="space-y-4 p-4 md:p-5">
            <SectionHeader icon={Sparkles} title="Evolução da governança" badge={summary.governance_trend.direction ?? "estável"} />
            <p className="text-sm leading-6 text-text-body">
              Tendência do score médio de governança no período recente. Use esta linha para enxergar se a plataforma está avançando ou perdendo fôlego.
            </p>
            {governanceTrendPoints.length ? (
              <TrendChart points={governanceTrendPoints} />
            ) : (
              <EmptyState title="Sem tendência de governança" description="Ainda não há histórico suficiente para desenhar a evolução. Esse estado é esperado em bases recém sincronizadas." />
            )}
          </CardContent>
        </Card>

        <Card className="border-border/70 bg-card/95 shadow-sm">
          <CardContent className="space-y-4 p-4 md:p-5">
            <SectionHeader icon={Sparkles} title="Evolução da Qualidade de dados" badge={`${formatNumber(dqTrendPoints.length)}`}/>
            <p className="text-sm leading-6 text-text-body">
              Leitura do score médio de Qualidade de dados entre os ativos avaliados. O objetivo é separar melhora contínua de oscilações pontuais.
            </p>
            {dqTrendPoints.length ? (
              <TrendChart points={dqTrendPoints} />
            ) : (
              <EmptyState title="Sem tendência de qualidade" description="Ainda não há série suficiente para mostrar a evolução. Quando novas medições chegarem, o histórico aparecerá aqui." />
            )}
          </CardContent>
        </Card>
      </div>

    </div>
  );
}
