import { useEffect, useMemo, useState, type ReactNode } from "react";
import {
  ArrowDownRight,
  ArrowUpRight,
  BarChart3,
  Clock3,
  ChevronDown,
  PanelRight,
  Database,
  RefreshCw,
  Sparkles,
  TriangleAlert,
  Waves,
  X,
} from "lucide-react";

import { ActiveFilterChip, CompactFilterBar, CompactFilterReset, CompactFilterToggle } from "@/components/control-plane/filter-toolbar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { Select } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/cn";

import {
  getObservabilityAssetById,
  listObservabilityAssets,
  listObservabilityDataSources,
  listObservabilitySchemas,
  listObservabilityTables,
} from "../service";
import type {
  ObservabilityAssetRecord,
  ObservabilityDataSourceOption,
  ObservabilityFilterOption,
  ObservabilityFiltersState,
  ObservabilityPageResult,
  ObservabilityTabKey,
  ObservabilitySchemaOption,
  ObservabilityTableOption,
} from "../types";
import type {
  AssetDetailModalProps,
  AssetsTableProps,
  BadgeProps,
  DetailFieldProps,
  DetailListProps,
  FiltersProps,
  MiniMetricProps,
  PriorityAlertsProps,
  RelatedSignalsPanelProps,
  ReliabilityDecisionCardProps,
  SignalListCardProps,
  SummaryCardsProps,
  TabCardProps,
  TimelineProps,
} from "./data-observability-types";
import {
  confidenceTone,
  decisionMeta,
  decisionReasons,
  formatDateTime,
  formatNumber,
  formatPercent,
  formatRowCount,
  historyMax,
  linkedByLabel,
  mainProblemMeta,
  observabilityAssetKey,
  observabilityAssetSignature,
  signalConfidence,
  sourceOriginMeta,
  statusMeta,
} from "./data-observability-helpers";

const PAGE_SIZE = 10;

const CRITICALITY_OPTIONS: ObservabilityFilterOption[] = [
  { value: "", label: "Todas as criticidades" },
  { value: "low", label: "Baixa" },
  { value: "medium", label: "Média" },
  { value: "high", label: "Alta" },
  { value: "critical", label: "Crítica" },
];

const STATUS_OPTIONS: ObservabilityFilterOption[] = [
  { value: "", label: "Todos os status" },
  { value: "healthy", label: "Saudável" },
  { value: "attention", label: "Atenção" },
  { value: "critical", label: "Crítico" },
  { value: "unreadable", label: "Sem leitura" },
  { value: "late", label: "Atrasado" },
  { value: "drift", label: "Drift" },
  { value: "blocked", label: "Bloqueado" },
];

const PERIOD_OPTIONS: ObservabilityFilterOption[] = [
  { value: "7d", label: "7 dias" },
  { value: "30d", label: "30 dias" },
  { value: "90d", label: "90 dias" },
  { value: "180d", label: "180 dias" },
];

const DEFAULT_FILTERS: ObservabilityFiltersState = {
  datasource_id: null,
  schema: "",
  table: "",
  domain: "",
  layer: "",
  criticality: "",
  status: "",
  period: "30d",
  only_critical: false,
  only_incidents: false,
  only_out_of_sla: false,
  page: 1,
};

export function ObservabilitySummaryCards({ data, loading, onQuickFilter }: SummaryCardsProps) {
  const cards = [
    {
      key: "all" as const,
      label: "Ativos monitorados",
      value: data?.summary.total ?? 0,
      hint: "Escopo atual da consulta",
      action: "Ver tudo",
      icon: Database,
      tone: "neutral" as const,
    },
    {
      key: "critical" as const,
      label: "Críticos",
      value: data?.summary.critical ?? 0,
      hint: "Exigem ação antes do consumo",
      action: "Ver críticas",
      icon: TriangleAlert,
      tone: "danger" as const,
    },
    {
      key: "sla" as const,
      label: "Fora do SLA",
      value: data?.summary.out_of_sla ?? 0,
      hint: "Atualização ou ingestão atrasada",
      action: "Ver fora do SLA",
      icon: Clock3,
      tone: "warning" as const,
    },
    {
      key: "drift" as const,
      label: "Schema drift",
      value: data?.summary.schema_drift ?? 0,
      hint: "Estrutura mudou no caminho",
      action: "Ver drift",
      icon: Waves,
      tone: "warning" as const,
    },
    {
      key: "volume" as const,
      label: "Volume anômalo",
      value: data?.summary.volume_anomaly ?? 0,
      hint: "Picos ou quedas incomuns",
      action: "Ver volume",
      icon: BarChart3,
      tone: "warning" as const,
    },
    {
      key: "pipeline" as const,
      label: "Pipelines com falha",
      value: data?.summary.pipeline_failures ?? 0,
      hint: "Execução precisa de revisão",
      action: "Ver falhas",
      icon: Sparkles,
      tone: "danger" as const,
    },
  ];

  return (
    <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
      {cards.map((card) => {
        const Icon = card.icon;
        return (
          <Card className="border-border/80 bg-surface/90 shadow-card" key={card.label}>
            <CardContent className="space-y-3 p-4">
              <div className="flex items-start gap-4">
              <div
                className={cn(
                  "flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border",
                  card.tone === "warning" && "border-warning-200 bg-warning-50 text-warning-700",
                  card.tone === "danger" && "border-danger-200 bg-danger-50 text-danger-700",
                  card.tone === "neutral" && "border-border bg-bg-subtle text-text-body",
                )}
              >
                <Icon className="h-5 w-5" />
              </div>
                <div className="min-w-0 flex-1">
                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-muted">{card.label}</p>
                <p className="mt-1 text-2xl font-semibold text-text">{loading ? "—" : formatNumber(card.value)}</p>
                  <p className="mt-1 text-sm text-text-body">{card.hint}</p>
              </div>
              </div>
              <div className="flex items-center justify-between gap-2">
                <Badge tone={card.tone}>{card.action}</Badge>
                {onQuickFilter ? (
                  <Button className="h-8 px-3 text-xs" onClick={() => onQuickFilter(card.key)} size="sm" variant="outline">
                    Aplicar
                  </Button>
                ) : null}
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}

export function ObservabilityPriorityAlerts({ data, loading, onQuickFilter }: PriorityAlertsProps) {
  const alerts = useMemo(() => {
    const summary = data?.summary;
    if (!summary) return [];

    const items = [
      {
        key: "critical" as const,
        label: "Críticos",
        value: summary.critical,
        tone: "danger" as const,
        hint: "Prioridade máxima",
      },
      {
        key: "pipeline" as const,
        label: "Falhas de pipeline",
        value: summary.pipeline_failures,
        tone: "danger" as const,
        hint: "Pode interromper a cadeia",
      },
      {
        key: "sla" as const,
        label: "Fora do SLA",
        value: summary.out_of_sla,
        tone: "warning" as const,
        hint: "Atualização atrasada",
      },
      {
        key: "drift" as const,
        label: "Schema drift",
        value: summary.schema_drift,
        tone: "warning" as const,
        hint: "Mudança estrutural",
      },
      {
        key: "volume" as const,
        label: "Volume anômalo",
        value: summary.volume_anomaly,
        tone: "warning" as const,
        hint: "Oscilação fora do padrão",
      },
    ];

    return items.filter((item) => item.value > 0).slice(0, 5);
  }, [data?.summary]);

  return (
    <Card className="border-border/80 bg-surface/95 shadow-card" data-testid="observability-priority-alerts">
      <CardHeader>
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-brand-600">Alertas prioritários</p>
            <p className="mt-2 text-sm leading-6 text-text-body">
              Os alertas abaixo resumem os pontos que exigem ação imediata. O detalhamento completo fica no painel lateral.
            </p>
          </div>
          <Badge tone="neutral">{loading ? "—" : `${formatNumber(alerts.length)} itens`}</Badge>
        </div>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            {Array.from({ length: 3 }).map((_, index) => (
              <Skeleton className="h-24 w-full" key={index} />
            ))}
          </div>
        ) : alerts.length ? (
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            {alerts.map((alert) => (
              <div className="rounded-2xl border border-border bg-bg-subtle/80 p-4" key={alert.key}>
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-sm font-semibold text-text">{alert.label}</p>
                    <p className="mt-1 text-xs text-muted">{alert.hint}</p>
                  </div>
                  <Badge tone={alert.tone}>{formatNumber(alert.value)}</Badge>
                </div>
                {onQuickFilter ? (
                  <Button className="mt-3 h-8 px-3 text-xs" onClick={() => onQuickFilter(alert.key)} size="sm" variant="outline">
                    Ver detalhes
                  </Button>
                ) : null}
              </div>
            ))}
          </div>
        ) : (
          <div className="rounded-2xl border border-dashed border-border bg-bg-subtle/80 p-4 text-sm text-text-body">
            Nenhum alerta prioritário encontrado para o recorte atual.
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export function ObservabilityFilters({
  filters,
  dataSources,
  schemaOptions,
  tableOptions,
  filterOptions,
  selectedDataSource,
  dataSourcesLoading,
  schemasLoading,
  tablesLoading,
  loading,
  total,
  onPatch,
  onReset,
  onRefresh,
}: FiltersProps) {
  const activeChips = useMemo(() => {
    const chips: Array<{ key: string; label: string; onRemove: () => void }> = [];
    if (filters.datasource_id !== null) {
      chips.push({
        key: "datasource_id",
        label: `Data Source: ${selectedDataSource?.name ?? `#${filters.datasource_id}`}`,
        onRemove: () => onPatch({ datasource_id: null, schema: "", table: "", page: 1 }),
      });
    }
    if (filters.schema) chips.push({ key: "schema", label: `Schema: ${filters.schema}`, onRemove: () => onPatch({ schema: "", table: "", page: 1 }) });
    if (filters.table) chips.push({ key: "table", label: `Tabela: ${filters.table}`, onRemove: () => onPatch({ table: "", page: 1 }) });
    if (filters.domain) chips.push({ key: "domain", label: `Domínio: ${filters.domain}`, onRemove: () => onPatch({ domain: "", page: 1 }) });
    if (filters.layer) chips.push({ key: "layer", label: `Camada: ${filters.layer}`, onRemove: () => onPatch({ layer: "", page: 1 }) });
    if (filters.criticality) {
      const item = CRITICALITY_OPTIONS.find((option) => option.value === filters.criticality);
      chips.push({ key: "criticality", label: `Criticidade: ${item?.label || filters.criticality}`, onRemove: () => onPatch({ criticality: "", page: 1 }) });
    }
    if (filters.status) {
      const item = STATUS_OPTIONS.find((option) => option.value === filters.status);
      chips.push({ key: "status", label: `Status: ${item?.label || filters.status}`, onRemove: () => onPatch({ status: "", page: 1 }) });
    }
    if (filters.period !== "30d") {
      const item = PERIOD_OPTIONS.find((option) => option.value === filters.period);
      chips.push({ key: "period", label: `Período: ${item?.label || filters.period}`, onRemove: () => onPatch({ period: "30d", page: 1 }) });
    }
    if (filters.only_critical) chips.push({ key: "only_critical", label: "Apenas tabelas críticas", onRemove: () => onPatch({ only_critical: false, page: 1 }) });
    if (filters.only_incidents) chips.push({ key: "only_incidents", label: "Apenas com incidentes", onRemove: () => onPatch({ only_incidents: false, page: 1 }) });
    if (filters.only_out_of_sla) chips.push({ key: "only_out_of_sla", label: "Apenas fora do SLA", onRemove: () => onPatch({ only_out_of_sla: false, page: 1 }) });
    return chips;
  }, [filters, onPatch, selectedDataSource]);

  return (
    <CompactFilterBar
      actions={
        <div className="flex flex-wrap items-center gap-2">
          <Button className="h-8 px-3 text-xs" onClick={onRefresh} size="sm" variant="outline">
            <RefreshCw className={cn("h-3.5 w-3.5", loading && "animate-spin")} />
            Atualizar
          </Button>
          <CompactFilterReset onClick={onReset}>Limpar filtros</CompactFilterReset>
        </div>
      }
      chips={
        activeChips.length ? (
          <>
            {activeChips.map((chip) => (
              <ActiveFilterChip key={chip.key} onRemove={chip.onRemove}>
                {chip.label}
              </ActiveFilterChip>
            ))}
          </>
        ) : null
      }
      defaultExpanded={false}
      description="Explore ativos críticos com filtros rápidos e deixe os demais critérios no modo avançado."
      meta={
        dataSourcesLoading
          ? "Carregando Data Sources..."
          : filters.datasource_id === null
            ? "Selecione um Data Source para iniciar."
            : loading
              ? "Carregando observabilidade..."
              : `${formatNumber(total)} tabelas monitoradas`
      }
      moreFiltersLabel="Mais filtros"
      title="Filtros de observabilidade"
      primary={
        <div className="grid gap-2 lg:grid-cols-5">
          <Select
            disabled={dataSourcesLoading}
            value={filters.datasource_id === null ? "" : String(filters.datasource_id)}
            onChange={(event) => {
              const value = event.target.value ? Number(event.target.value) : null;
              onPatch({ datasource_id: value, schema: "", table: "", page: 1 });
            }}
          >
            <option value="">{dataSourcesLoading ? "Carregando Data Sources..." : "Selecione um Data Source"}</option>
            {dataSources.map((item) => (
              <option key={item.id} value={item.id}>
                {item.name}
              </option>
            ))}
          </Select>
          <Select
            disabled={filters.datasource_id === null || schemasLoading}
            value={filters.schema}
            onChange={(event) => onPatch({ schema: event.target.value, table: "", page: 1 })}
          >
            <option value="">
              {filters.datasource_id === null
                ? "Selecione um Data Source"
                : schemasLoading
                  ? "Carregando schemas..."
                  : "Todos os schemas do Data Source"}
            </option>
            {schemaOptions.map((item) => (
              <option key={item.id} value={item.name}>
                {item.name}
              </option>
            ))}
          </Select>
          <Select
            disabled={filters.datasource_id === null || !filters.schema || tablesLoading}
            value={filters.table}
            onChange={(event) => onPatch({ table: event.target.value, page: 1 })}
          >
            <option value="">
              {filters.datasource_id === null
                ? "Selecione um Data Source"
                : !filters.schema
                  ? "Selecione um schema"
                  : tablesLoading
                    ? "Carregando tabelas..."
                    : "Todas as tabelas do schema"}
            </option>
            {tableOptions.map((item) => (
              <option key={item.id} value={item.name}>
                {item.name}
              </option>
            ))}
          </Select>
          <Select value={filters.period} onChange={(event) => onPatch({ period: event.target.value as ObservabilityFiltersState["period"], page: 1 })}>
            {PERIOD_OPTIONS.map((item) => (
              <option key={item.label} value={item.value}>
                {item.label}
              </option>
            ))}
          </Select>
          <Select value={filters.status} onChange={(event) => onPatch({ status: event.target.value as ObservabilityFiltersState["status"], page: 1 })}>
            {STATUS_OPTIONS.map((item) => (
              <option key={item.label} value={item.value}>
                {item.label}
              </option>
            ))}
          </Select>
        </div>
      }
      secondary={
        <div className="grid gap-2 lg:grid-cols-3">
          <Select value={filters.layer} onChange={(event) => onPatch({ layer: event.target.value, page: 1 })}>
            <option value="">Todas as camadas</option>
            {(filterOptions?.layers ?? []).map((item) => (
              <option key={item} value={item}>
                {item}
              </option>
            ))}
          </Select>
          <Select value={filters.criticality} onChange={(event) => onPatch({ criticality: event.target.value as ObservabilityFiltersState["criticality"], page: 1 })}>
            {CRITICALITY_OPTIONS.map((item) => (
              <option key={item.label} value={item.value}>
                {item.label}
              </option>
            ))}
          </Select>
          <Select value={filters.domain} onChange={(event) => onPatch({ domain: event.target.value, page: 1 })}>
            <option value="">Todos os domínios</option>
            {(filterOptions?.domains ?? []).map((item) => (
              <option key={item} value={item}>
                {item}
              </option>
            ))}
          </Select>
          <div className="flex flex-wrap gap-2">
            <CompactFilterToggle active={filters.only_critical} onClick={() => onPatch({ only_critical: !filters.only_critical, page: 1 })}>
              Apenas tabelas críticas
            </CompactFilterToggle>
            <CompactFilterToggle active={filters.only_incidents} onClick={() => onPatch({ only_incidents: !filters.only_incidents, page: 1 })}>
              Apenas com incidentes
            </CompactFilterToggle>
            <CompactFilterToggle active={filters.only_out_of_sla} onClick={() => onPatch({ only_out_of_sla: !filters.only_out_of_sla, page: 1 })}>
              Apenas fora do SLA
            </CompactFilterToggle>
          </div>
        </div>
      }
    />
  );
}

export function ObservabilityAssetsTable({ data, loading, onOpenDetail, onPageChange }: AssetsTableProps) {
  const totalPages = Math.max(1, Math.ceil((data?.total || 0) / PAGE_SIZE));
  const page = data?.page || 1;
  const items = data?.items || [];
  const context = data?.context;

  return (
    <Card className="overflow-hidden border-border/80 bg-surface/95 shadow-card" data-testid="observability-main-assets-table">
      <CardHeader className="flex items-center justify-between gap-3">
        <div>
          <h3 className="text-base font-semibold text-text">Ativos do Data Source selecionado</h3>
          <p className="text-sm text-text-body">
            {context?.scope === "datasource"
              ? `Mostrando apenas ativos do contexto ${context.datasource_name}. Sinais de outras origens aparecem nas seções abaixo.`
              : "Mostrando os ativos principais do catálogo. Sinais de outras origens aparecem nas seções abaixo."}
          </p>
        </div>
        <Badge tone="neutral">{loading ? "Carregando..." : `${formatNumber(data?.total)} registros`}</Badge>
      </CardHeader>
      <CardContent className="p-0">
        {loading ? (
          <div className="space-y-3 p-4">
            {Array.from({ length: 6 }).map((_, index) => (
              <Skeleton className="h-16 w-full" key={index} />
            ))}
          </div>
        ) : items.length === 0 ? (
          <EmptyState
            title="Nenhuma tabela encontrada"
            description="Ajuste os filtros para localizar ativos monitorados com sinais de observabilidade."
            className="border-0 shadow-none"
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full border-separate border-spacing-0">
              <thead>
                <tr className="bg-bg-subtle/90 text-left text-[11px] font-semibold uppercase tracking-[0.18em] text-brand-600">
                  <th className="border-b border-border px-4 py-3">Ativo</th>
                  <th className="border-b border-border px-4 py-3">Domínio / camada</th>
                  <th className="border-b border-border px-4 py-3">Status geral</th>
                  <th className="border-b border-border px-4 py-3">Principal problema</th>
                  <th className="border-b border-border px-4 py-3">Score</th>
                  <th className="border-b border-border px-4 py-3">Última atualização</th>
                  <th className="border-b border-border px-4 py-3">Ação</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border bg-surface">
                {items.map((asset, index) => (
                  <tr
                    className="cursor-pointer transition hover:bg-bg-subtle/80"
                    key={observabilityAssetKey(asset, index)}
                    onClick={() => onOpenDetail(asset)}
                    onKeyDown={(event) => {
                      if (event.key === "Enter" || event.key === " ") {
                        event.preventDefault();
                        onOpenDetail(asset);
                      }
                    }}
                    role="button"
                    tabIndex={0}
                  >
                    <td className="px-4 py-4">
                      <div className="min-w-0">
                        <p className="font-medium text-text">{asset.table_name}</p>
                        <p className="mt-1 text-xs text-muted line-clamp-2">{asset.summary}</p>
                        <div className="mt-2 flex flex-wrap gap-1.5">
                          <Badge tone={sourceOriginMeta(asset.source_origin).tone}>{sourceOriginMeta(asset.source_origin).label}</Badge>
                          <Badge tone={confidenceTone(signalConfidence(asset))}>
                            Confiança {formatPercent(signalConfidence(asset))}
                          </Badge>
                          {asset.context_state !== "selected" ? <Badge tone="warning">{asset.context_state}</Badge> : null}
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-4 text-sm text-text-body">
                      <div className="space-y-1">
                        <p className="font-medium text-text">{asset.domain}</p>
                        <p className="text-xs text-muted">{asset.layer}</p>
                      </div>
                    </td>
                    <td className="px-4 py-4">
                      <Badge tone={decisionMeta(asset).tone}>{decisionMeta(asset).label}</Badge>
                    </td>
                    <td className="px-4 py-4">
                      <Badge tone={mainProblemMeta(asset).tone}>{mainProblemMeta(asset).label}</Badge>
                    </td>
                    <td className="px-4 py-4">
                      <div className="flex flex-col">
                        <span className="text-sm font-semibold text-text">{asset.observability_score}</span>
                        <span className="text-xs text-muted">qualidade + observabilidade</span>
                      </div>
                    </td>
                    <td className="px-4 py-4 text-sm text-text-body">{formatDateTime(asset.last_updated_at)}</td>
                    <td className="px-4 py-4">
                      <Button onClick={(event) => { event.stopPropagation(); onOpenDetail(asset); }} size="sm" variant="outline">
                        Ver detalhes
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border px-4 py-3 text-sm text-text-body">
          <div>
            Página <span className="font-medium text-text">{page}</span> de <span className="font-medium text-text">{totalPages}</span> · {formatNumber(data?.total)} itens
          </div>
          <div className="flex items-center gap-2">
            <Button disabled={page <= 1 || loading} onClick={() => onPageChange(page - 1)} size="sm" variant="outline">
              <ArrowDownRight className="h-3.5 w-3.5 rotate-90" />
              Anterior
            </Button>
            <Button disabled={page >= totalPages || loading} onClick={() => onPageChange(page + 1)} size="sm" variant="outline">
              Próxima
              <ArrowUpRight className="h-3.5 w-3.5 -rotate-90" />
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export function ObservabilityBadge({ status }: BadgeProps) {
  const meta = statusMeta(status);
  return <Badge tone={meta.tone}>{meta.label}</Badge>;
}

export function ReliabilityDecisionCard({ asset }: ReliabilityDecisionCardProps) {
  const decision = decisionMeta(asset);

  return (
    <Card className="h-full border-border/80 bg-surface/95 shadow-card">
      <CardHeader>
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-brand-600">Decisão final</p>
        <div className="mt-2 flex items-center gap-2">
          <Badge tone={decision.tone}>{decision.label}</Badge>
          {asset.certification_valid ? <Badge tone="success">Certificação válida</Badge> : <Badge tone="warning">Sem certificação válida</Badge>}
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-sm leading-6 text-text-body">
          {asset.summary}
        </p>
        <div className="space-y-2">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-brand-600">Motivos</p>
          <ul className="space-y-2 text-sm text-text-body">
            {decisionReasons(asset).map((reason) => (
              <li className="flex gap-2" key={reason}>
                <span className="mt-1 h-2 w-2 shrink-0 rounded-full bg-slate-300" />
                <span>{reason}</span>
              </li>
            ))}
          </ul>
        </div>
        <div className="rounded-2xl border border-border bg-bg-subtle p-4">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-brand-600">Ação recomendada</p>
          <p className="mt-2 text-sm leading-6 text-text-body">{asset.recommendation}</p>
        </div>
      </CardContent>
    </Card>
  );
}

function SignalListCard({ description, emptyLabel, items, testId, title }: SignalListCardProps) {
  function itemKey(item: ObservabilityAssetRecord, index: number) {
    return [
      item.source_origin,
      item.linked_by,
      item.datasource_id,
      item.table_id,
      item.scan_run_id ?? "no-scan",
      index,
    ].join(":");
  }

  return (
    <Card className="border-border/80 bg-surface/95 shadow-card" data-testid={testId}>
      <CardHeader>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-brand-600">{title}</p>
            <p className="mt-2 text-sm leading-6 text-text-body">{description}</p>
          </div>
          <Badge tone="neutral">{formatNumber(items.length)}</Badge>
        </div>
      </CardHeader>
      <CardContent>
        {!items.length ? (
          <p className="rounded-2xl border border-dashed border-border bg-bg-subtle/80 p-4 text-sm text-text-body">{emptyLabel}</p>
        ) : (
          <div className="space-y-3">
            {items.map((item, index) => (
              <div key={itemKey(item, index)} className="rounded-2xl border border-border bg-bg-subtle/70 p-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="font-medium text-text">{item.table_name}</p>
                    <p className="mt-1 text-xs leading-5 text-text-body">{item.summary}</p>
                  </div>
                  <Badge tone={confidenceTone(signalConfidence(item))}>Confiança {formatPercent(signalConfidence(item))}</Badge>
                </div>
                <div className="mt-3 flex flex-wrap gap-1.5">
                  <Badge tone={sourceOriginMeta(item.source_origin).tone}>{sourceOriginMeta(item.source_origin).label}</Badge>
                  <Badge tone="neutral">Vínculo: {linkedByLabel(item.linked_by)}</Badge>
                  <Badge tone={item.context_state === "stale" || item.context_state === "unlinked" ? "danger" : "warning"}>{item.context_state}</Badge>
                  <Badge tone="neutral">{item.data_source}</Badge>
                </div>
                <div className="mt-3 grid gap-2 text-xs text-text-body sm:grid-cols-2 xl:grid-cols-4">
                  <span>scan_run_id: {item.scan_run_id ?? "—"}</span>
                  <span>last_seen_at: {formatDateTime(item.last_seen_at)}</span>
                  <span>Última atualização: {formatDateTime(item.last_updated_at)}</span>
                  <span>Score: {item.observability_score}</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function ObservabilityRelatedSignalsPanel({ data, loading }: RelatedSignalsPanelProps) {
  const [expanded, setExpanded] = useState(false);

  if (loading) {
    return (
      <div className="grid gap-4 xl:grid-cols-2">
        <Skeleton className="h-56 w-full" />
        <Skeleton className="h-56 w-full" />
      </div>
    );
  }

  const related = data?.related_signals;

  if (!data || !related) return null;

  const totalRelated = data.diagnostics.related_signals;
  const totalUnlinked = data.diagnostics.unlinked_signals + (data.out_of_scope_assets || []).length;

  return (
    <div className="space-y-4" data-testid="observability-related-panel">
      <Card className="border-border/80 bg-bg-subtle/80 shadow-sm">
        <CardHeader className="space-y-3">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-brand-600">Rastreabilidade compacta</p>
              <p className="mt-2 text-sm leading-6 text-text-body">
                A lista principal mostra apenas o resumo. A rastreabilidade completa fica sob demanda para reduzir ruído e custo visual.
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <Badge tone="neutral">{formatNumber(totalRelated)} sinais relacionados</Badge>
              <Badge tone={totalUnlinked > 0 ? "warning" : "success"}>{formatNumber(totalUnlinked)} não vinculados</Badge>
              <Button className="h-8 px-3 text-xs" onClick={() => setExpanded((current) => !current)} size="sm" variant="outline">
                {expanded ? "Ocultar rastreabilidade" : "Ver rastreabilidade"}
                <ChevronDown className={cn("h-3.5 w-3.5 transition-transform", expanded ? "rotate-180" : "")} />
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <MiniMetric label="Ativos principais" value={formatNumber(data.diagnostics.selected_assets)} />
            <MiniMetric label="Fora do escopo" value={formatNumber(data.diagnostics.out_of_scope_assets)} />
            <MiniMetric label="Sinais relacionados" value={formatNumber(totalRelated)} />
            <MiniMetric label="Não vinculados" value={formatNumber(data.diagnostics.unlinked_signals)} />
          </div>
        </CardContent>
      </Card>

      {expanded ? (
        <div className="grid gap-4 xl:grid-cols-2">
          <SignalListCard
            description="Exibe sinais operacionais vinculados ao ativo, como DAGs, ingestão e avaliações DQ."
            emptyLabel="Nenhum sinal operacional vinculado foi encontrado para o contexto atual."
            items={[...related.airflow, ...related.ingestion, ...related.dq, ...related.datasource_scan, ...related.incident, ...related.certification, ...related.privacy]}
            testId="observability-ops-related"
            title="Sinais operacionais vinculados"
          />
          <SignalListCard
            description="Mostra o consumo analítico rastreado, como dashboards e consultas do Metabase."
            emptyLabel="Nenhum sinal de consumo analítico foi encontrado para o contexto atual."
            items={related.metabase}
            testId="observability-metabase-related"
            title="Consumo analítico relacionado"
          />
          <SignalListCard
            description="Traz os ativos físicos do Data Lake ligados ao contexto selecionado."
            emptyLabel="Nenhum sinal do Data Lake foi encontrado para o contexto atual."
            items={related.data_lake}
            testId="observability-datalake-related"
            title="Data Lake relacionado"
          />
          <SignalListCard
            description="Expõe sinais sem vínculo confiável ou leitura recente suficiente para entrar no total principal."
            emptyLabel="Nenhum sinal não vinculado foi encontrado para o contexto atual."
            items={[
              ...related.stale_scan,
              ...related.unknown,
              ...(data.out_of_scope_assets || []),
              ...data.unlinked_signals,
            ].filter((item, index, array) => array.findIndex((candidate) => observabilityAssetSignature(candidate) === observabilityAssetSignature(item)) === index)}
            testId="observability-unlinked"
            title="Sinais fora do escopo ou não vinculados"
          />
        </div>
      ) : null}
    </div>
  );
}

export function ObservabilityTimeline({ events }: TimelineProps) {
  return (
    <div className="space-y-3">
      {events.map((event) => (
        <div className="flex gap-3" key={event.id}>
          <div className="flex flex-col items-center">
            <span className="h-3 w-3 rounded-full bg-brand-500" />
            <span className="mt-1 h-full w-px bg-slate-200" />
          </div>
          <Card className="flex-1 border-border/80 bg-surface/95 shadow-sm">
            <CardContent className="space-y-2 p-4">
              <div className="flex flex-wrap items-center gap-2">
                <Badge tone="neutral">{event.label}</Badge>
                <span className="text-xs text-muted">{formatDateTime(event.at)}</span>
              </div>
              <p className="text-sm leading-6 text-text-body">{event.description}</p>
            </CardContent>
          </Card>
        </div>
      ))}
    </div>
  );
}

export function ObservabilityAssetDetailModal({ asset, error, loading, open, onClose }: AssetDetailModalProps) {
  const [tab, setTab] = useState<ObservabilityTabKey>("summary");

  useEffect(() => {
    if (open) setTab("summary");
  }, [open, asset?.table_id]);

  useEffect(() => {
    if (!open) return;
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") onClose();
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onClose, open]);

  if (!open) return null;

  const tabs: Array<{ key: ObservabilityTabKey; label: string }> = [
    { key: "summary", label: "Resumo" },
    { key: "arrival", label: "Chegada" },
    { key: "volume", label: "Volume" },
    { key: "schema", label: "Schema" },
    { key: "pipeline", label: "Pipeline" },
    { key: "reliability", label: "Confiabilidade" },
    { key: "timeline", label: "Timeline" },
  ];

  let content: ReactNode = null;

  if (loading) {
    content = (
      <div className="space-y-4">
        <div className="grid gap-4 xl:grid-cols-2">
          <Skeleton className="h-40 w-full" />
          <Skeleton className="h-40 w-full" />
        </div>
        <Skeleton className="h-72 w-full" />
      </div>
    );
  } else if (error && !asset) {
    content = (
      <EmptyState
        title="Não foi possível carregar o detalhe"
        description={error || "O detalhe da tabela não pôde ser carregado neste momento."}
        action={<Button onClick={onClose}>Fechar</Button>}
      />
    );
  } else if (asset) {
    content = (
      <div className="space-y-5">
        {tab === "summary" ? (
          <div className="space-y-4">
            <div className="grid gap-4 xl:grid-cols-[1.3fr_0.7fr]">
              <Card className="border-border/80 bg-surface/95 shadow-card">
                <CardHeader>
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge tone="neutral">{asset.domain}</Badge>
                    <Badge tone="neutral">{asset.layer}</Badge>
                    <Badge tone={sourceOriginMeta(asset.source_origin).tone}>{sourceOriginMeta(asset.source_origin).label}</Badge>
                    <Badge tone="neutral">Vínculo: {linkedByLabel(asset.linked_by)}</Badge>
                    <Badge tone={confidenceTone(signalConfidence(asset))}>Confiança {formatPercent(signalConfidence(asset))}</Badge>
                    <Badge tone={asset.criticality === "critical" || asset.criticality === "high" ? "warning" : "neutral"}>
                      {asset.criticality === "low" ? "Baixa" : asset.criticality === "medium" ? "Média" : asset.criticality === "high" ? "Alta" : "Crítica"}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent>
                  <dl className="grid gap-4 sm:grid-cols-2">
                    <DetailField label="Datasource ID" value={String(asset.datasource_id)} />
                    <DetailField label="Origem" value={sourceOriginMeta(asset.source_origin).label} />
                    <DetailField label="Vinculado por" value={linkedByLabel(asset.linked_by)} />
                    <DetailField label="Confiança do vínculo" value={formatPercent(signalConfidence(asset))} />
                    <DetailField label="Contexto" value={asset.context_state} />
                    <DetailField label="Último scan" value={asset.scan_run_id ? `#${asset.scan_run_id}` : "—"} />
                    <DetailField label="Última leitura" value={formatDateTime(asset.last_seen_at)} />
                    <DetailField label="Score de observabilidade" value={String(asset.observability_score)} />
                    <DetailField label="Score de qualidade" value={asset.quality_score !== null && asset.quality_score !== undefined ? String(asset.quality_score) : "—"} />
                    <DetailField label="Última chegada" value={formatDateTime(asset.last_arrival_at)} />
                    <DetailField label="Última carga Silver" value={formatDateTime(asset.last_silver_load_at)} />
                    <DetailField label="Última carga Gold" value={formatDateTime(asset.last_gold_load_at)} />
                    <DetailField label="Última atualização no DW" value={formatDateTime(asset.last_dw_load_at)} />
                    <DetailField label="Incidentes abertos" value={String(asset.open_incidents_total)} />
                    <DetailField label="Incidentes bloqueantes" value={String(asset.blocking_incidents_total)} />
                    <DetailField label="Status final" value={decisionMeta(asset).label} />
                    <DetailField label="Recomendação operacional" value={asset.recommendation} />
                  </dl>
                </CardContent>
              </Card>
              <ReliabilityDecisionCard asset={asset} />
            </div>
            <Card className="border-border/80 bg-bg-subtle/70 shadow-sm">
              <CardHeader>
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-brand-600">Resumo executivo</p>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="text-sm leading-6 text-text-body">{asset.summary}</p>
                <div className="grid gap-3 md:grid-cols-3">
                  <MiniMetric
                    label="Confiável"
                    value={
                      asset.reliability_status === "reliable"
                        ? "Sim"
                        : asset.reliability_status === "reliable_with_reservations"
                          ? "Com ressalvas"
                          : "Não"
                    }
                  />
                  <MiniMetric label="Gold mais recente que Silver" value={asset.gold_newer_than_silver ? "Sim" : "Não"} />
                  <MiniMetric label="Silver validada antes do Gold" value={asset.silver_validated_before_gold ? "Sim" : "Não"} />
                </div>
              </CardContent>
            </Card>
          </div>
        ) : null}

        {tab === "arrival" ? (
          <TabCard title="Chegada" microcopy="Verifica se os dados chegaram dentro do SLA esperado, considerando origem, Data Lake, camadas tratadas e tabela final.">
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              <DetailField label="Último arquivo no S3" value={asset.last_file_path || "—"} />
              <DetailField label="Última partição" value={asset.last_partition || "—"} />
              <DetailField label="Última linha pela coluna de data" value={formatDateTime(asset.last_source_row_at)} />
              <DetailField label="Última carga na Silver" value={formatDateTime(asset.last_silver_load_at)} />
              <DetailField label="Última carga na Gold" value={formatDateTime(asset.last_gold_load_at)} />
              <DetailField label="Última carga no DW" value={formatDateTime(asset.last_dw_load_at)} />
              <DetailField label="Freshness" value={statusMeta(asset.freshness_status).label} />
              <DetailField label="SLA" value={asset.freshness_status === "late" || asset.pipeline_status === "late" ? "Descumprido" : "Dentro do SLA"} />
              <DetailField label="Diferença entre origem e destino" value={formatPercent(((asset.current_row_count - asset.expected_row_count) / Math.max(asset.expected_row_count, 1)) * 100)} />
            </div>
          </TabCard>
        ) : null}

        {tab === "volume" ? (
          <TabCard title="Volume" microcopy="Compara o volume atual com o histórico da tabela para detectar quedas, picos ou ausência inesperada de registros.">
            <div className="grid gap-4 xl:grid-cols-3">
              <DetailField label="Volume atual" value={formatRowCount(asset.current_row_count)} />
              <DetailField label="Média histórica" value={formatRowCount(asset.historical_avg_row_count)} />
              <DetailField label="Média do mesmo dia da semana" value={formatRowCount(asset.same_weekday_avg_row_count)} />
              <DetailField label="Variação percentual" value={formatPercent(asset.volume_change_pct)} />
              <DetailField label="Mínimo e máximo esperados" value={`${formatRowCount(Math.round(asset.expected_row_count * 0.9))} - ${formatRowCount(Math.round(asset.expected_row_count * 1.1))}`} />
              <DetailField label="Zero inesperado" value={asset.current_row_count === 0 ? "Sim" : "Não"} />
              <DetailField label="Pico fora do padrão" value={asset.volume_status === "attention" || asset.volume_status === "critical" ? "Sim" : "Não"} />
              <DetailField label="Queda brusca" value={asset.volume_change_pct <= -20 ? "Sim" : "Não"} />
            </div>
            <div className="mt-5 rounded-2xl border border-border/80 bg-surface p-4">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-brand-600">Histórico de volumes</p>
              <div className="mt-4 flex h-44 items-end gap-3">
                {asset.volume_history.map((point) => {
                  const height = (point.value / historyMax(asset.volume_history)) * 100;
                  return (
                    <div className="flex flex-1 flex-col items-center gap-2" key={`${point.label}-${point.value}`}>
                      <div className="flex h-32 w-full items-end rounded-2xl bg-bg-subtle px-2">
                        <div className="w-full rounded-xl bg-gradient-to-t from-brand-500 to-accent-400" style={{ height: `${height}%` }} />
                      </div>
                      <span className="text-[11px] text-muted">{point.label}</span>
                      <span className="text-xs font-semibold text-text">{formatRowCount(point.value)}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          </TabCard>
        ) : null}

        {tab === "schema" ? (
          <TabCard title="Schema" microcopy="Detecta mudanças estruturais que podem quebrar cargas, transformações ou dashboards consumidores.">
            <div className="grid gap-4 xl:grid-cols-2">
              <DetailList
                title="Mudanças detectadas"
                items={[
                  `Novas colunas: ${asset.new_columns.length ? asset.new_columns.join(", ") : "Nenhuma"}`,
                  `Colunas removidas: ${asset.removed_columns.length ? asset.removed_columns.join(", ") : "Nenhuma"}`,
                  `Tipos alterados: ${asset.altered_columns.length ? asset.altered_columns.join(", ") : "Nenhum"}`,
                  `Colunas que passaram a vir nulas: ${asset.nulled_columns.length ? asset.nulled_columns.join(", ") : "Nenhuma"}`,
                ]}
              />
              <DetailList
                title="Efeitos por camada"
                items={[
                  `Mudanças em parquet: ${asset.parquet_changes.length ? asset.parquet_changes.join(" ") : "Não identificadas"}`,
                  `Mudanças em tabela relacional: ${asset.relational_changes.length ? asset.relational_changes.join(" ") : "Não identificadas"}`,
                  `Severidade do drift: ${asset.drift_severity}`,
                  `Impacto downstream: ${asset.downstream_impact}`,
                ]}
              />
            </div>
          </TabCard>
        ) : null}

        {tab === "pipeline" ? (
          <TabCard title="Pipeline" microcopy="Consolida sinais de execução de DAGs, jobs Spark e cargas para identificar falhas completas ou parciais.">
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
              <DetailField label="DAG relacionada" value={asset.dag_name || "—"} />
              <DetailField label="Última execução" value={formatDateTime(asset.last_pipeline_run_at)} />
              <DetailField label="Status" value={asset.last_pipeline_status || "—"} />
              <DetailField label="Duração" value={asset.pipeline_duration_ms ? `${formatNumber(asset.pipeline_duration_ms)} ms` : "—"} />
              <DetailField label="Tentativas" value={String(asset.pipeline_attempts)} />
              <DetailField label="Falhas parciais" value={String(asset.partial_failure_detected ? 1 : 0)} />
              <DetailField label="Reprocessamentos" value={String(asset.reprocess_count)} />
              <DetailField label="Backfills" value={String(asset.backfill_count)} />
              <DetailField label="Jobs Spark lentos" value={String(asset.slow_spark_jobs_count)} />
              <DetailField label="Falhas de escrita no Gold" value={String(asset.gold_write_failures_count)} />
              <DetailField label="Última mensagem de erro" value={asset.last_error_message || "—"} />
            </div>
            <div className="mt-5 grid gap-4 xl:grid-cols-2">
              <DetailList title="Tempo por etapa" items={asset.stage_durations.map((stage) => `${stage.stage}: ${stage.duration_ms} ms`)} />
              <DetailList
                title="Erros por camada"
                items={asset.layer_errors.length ? asset.layer_errors.map((item) => `${item.layer}: ${item.message}`) : ["Nenhum erro registrado por camada."]}
              />
            </div>
          </TabCard>
        ) : null}

        {tab === "reliability" ? (
          <TabCard title="Confiabilidade" microcopy="Resume se o dado final está seguro para consumo analítico, operacional ou regulatório.">
            <div className="grid gap-4 xl:grid-cols-[0.95fr_1.05fr]">
              <Card className="border-border/80 bg-surface shadow-sm">
                <CardHeader>
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge tone={decisionMeta(asset).tone}>{decisionMeta(asset).label}</Badge>
                    <Badge tone={asset.certification_valid ? "success" : "warning"}>{asset.certification_valid ? "Certificação válida" : "Certificação pendente"}</Badge>
                  </div>
                </CardHeader>
                <CardContent className="space-y-3">
                  <DetailField label="Gold mais recente que Silver" value={asset.gold_newer_than_silver ? "Sim" : "Não"} />
                  <DetailField label="Silver validada antes do Gold" value={asset.silver_validated_before_gold ? "Sim" : "Não"} />
                  <DetailField label="Regras críticas passaram" value={`${asset.critical_rules_passed}/${asset.critical_rules_total}`} />
                  <DetailField label="Score mínimo atingido" value={asset.observability_score >= 70 ? "Sim" : "Não"} />
                  <DetailField label="Incidentes bloqueantes" value={String(asset.blocking_incidents_total)} />
                  <DetailField label="Certificação válida" value={asset.certification_valid ? "Sim" : "Não"} />
                </CardContent>
              </Card>
              <ReliabilityDecisionCard asset={asset} />
            </div>
          </TabCard>
        ) : null}

        {tab === "timeline" ? (
          <TabCard title="Timeline" microcopy="Linha do tempo dos principais eventos: chegada de arquivo, execução da DAG, profiling, validação, incidente, alerta, reprocessamento e certificação.">
            <ObservabilityTimeline events={asset.timeline_events} />
          </TabCard>
        ) : null}
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-[80] bg-slate-950/60 backdrop-blur-md">
      <div className="flex h-full w-full justify-end">
        <div className="flex h-full w-full max-w-[1120px] flex-col overflow-hidden bg-surface shadow-2xl md:rounded-l-[28px]">
          <div className="flex items-start justify-between gap-4 border-b border-border/70 bg-[linear-gradient(135deg,#ffffff_0%,#f8fafc_58%,#eef6ff_100%)] px-6 py-5">
            <div className="min-w-0 space-y-2">
              <div className="flex flex-wrap items-center gap-2">
                <Badge tone="accent">
                  <PanelRight className="h-3.5 w-3.5" />
                  Painel lateral
                </Badge>
                {asset ? <Badge tone={decisionMeta(asset).tone}>{decisionMeta(asset).label}</Badge> : null}
                {asset ? <Badge tone={confidenceTone(signalConfidence(asset))}>Confiança {formatPercent(signalConfidence(asset))}</Badge> : null}
                {asset ? (
                  <Badge tone={asset.criticality === "critical" || asset.criticality === "high" ? "warning" : "neutral"}>
                    {asset.criticality === "low" ? "Baixa" : asset.criticality === "medium" ? "Média" : asset.criticality === "high" ? "Alta" : "Crítica"}
                  </Badge>
                ) : null}
              </div>
              <h3 className="truncate text-lg font-semibold text-text">{asset?.table_name || "Carregando tabela..."}</h3>
              <p className="text-sm text-text-body">
                {asset ? `${asset.data_source} · ${asset.domain} · ${asset.layer} · datasource #${asset.datasource_id}` : "Carregando detalhes do ativo..."}
              </p>
            </div>
            <button
              aria-label="Fechar observabilidade"
              className="rounded-full border border-border/70 p-2 text-muted transition hover:border-border-strong hover:bg-bg-subtle hover:text-text"
              onClick={onClose}
              type="button"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          <div className="border-b border-border/70 px-6 py-3">
            <div className="flex flex-wrap gap-2 overflow-x-auto">
              {tabs.map((item) => (
                <Button
                  className={cn("h-9 shrink-0 rounded-full px-4 text-xs", tab === item.key ? "bg-slate-900 text-white hover:bg-slate-900" : "")}
                  key={item.key}
                  onClick={() => setTab(item.key)}
                  size="sm"
                  variant={tab === item.key ? "default" : "outline"}
                >
                  {item.label}
                </Button>
              ))}
            </div>
          </div>

          <div className="min-h-0 flex-1 overflow-y-auto px-6 py-5">{content}</div>

          <div className="flex items-center justify-end gap-2 border-t border-border/70 bg-surface/95 px-6 py-4">
            <Button onClick={onClose} type="button" variant="outline">
              Fechar
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

function TabCard({ children, microcopy, title }: TabCardProps) {
  return (
    <Card className="border-border/80 bg-surface/95 shadow-card">
      <CardHeader>
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-brand-600">{title}</p>
        <p className="mt-2 text-sm leading-6 text-text-body">{microcopy}</p>
      </CardHeader>
      <CardContent className="space-y-4">{children}</CardContent>
    </Card>
  );
}

function DetailField({ label, value }: DetailFieldProps) {
  return (
    <div className="rounded-2xl border border-border bg-bg-subtle/80 p-4">
      <p className="text-xs font-semibold uppercase tracking-[0.16em] text-muted">{label}</p>
      <p className="mt-2 text-sm leading-6 text-text-body">{value}</p>
    </div>
  );
}

function DetailList({ items, title }: DetailListProps) {
  return (
    <Card className="border-border/80 bg-surface shadow-sm">
      <CardHeader>
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-brand-600">{title}</p>
      </CardHeader>
      <CardContent>
        <ul className="space-y-2 text-sm text-text-body">
          {items.map((item) => (
            <li className="flex gap-2" key={item}>
              <span className="mt-1 h-2 w-2 shrink-0 rounded-full bg-brand-500" />
              <span>{item}</span>
            </li>
          ))}
        </ul>
      </CardContent>
    </Card>
  );
}

function MiniMetric({ label, value }: MiniMetricProps) {
  return (
    <div className="rounded-2xl border border-border bg-surface p-4">
      <p className="text-xs font-semibold uppercase tracking-[0.16em] text-muted">{label}</p>
      <p className="mt-2 text-sm font-semibold text-text">{value}</p>
    </div>
  );
}

export function DataObservabilityPage() {
  const [filters, setFilters] = useState<ObservabilityFiltersState>(DEFAULT_FILTERS);
  const [dataSources, setDataSources] = useState<ObservabilityDataSourceOption[]>([]);
  const [dataSourcesLoading, setDataSourcesLoading] = useState(true);
  const [dataSourcesError, setDataSourcesError] = useState("");
  const [schemaOptions, setSchemaOptions] = useState<ObservabilitySchemaOption[]>([]);
  const [tableOptions, setTableOptions] = useState<ObservabilityTableOption[]>([]);
  const [schemasLoading, setSchemasLoading] = useState(false);
  const [tablesLoading, setTablesLoading] = useState(false);
  const [pageData, setPageData] = useState<ObservabilityPageResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [refreshToken, setRefreshToken] = useState(0);
  const [selectedAsset, setSelectedAsset] = useState<ObservabilityAssetRecord | null>(null);
  const [selectedAssetLoading, setSelectedAssetLoading] = useState(false);
  const [selectedAssetError, setSelectedAssetError] = useState("");
  const [detailOpen, setDetailOpen] = useState(false);
  const selectedDataSource = useMemo(
    () => dataSources.find((item) => item.id === filters.datasource_id) ?? null,
    [dataSources, filters.datasource_id],
  );

  function patchFilters(patch: Partial<ObservabilityFiltersState>) {
    setFilters((current) => ({
      ...current,
      ...patch,
    }));
  }

  async function refreshPage() {
    setRefreshToken((value) => value + 1);
  }

  useEffect(() => {
    let cancelled = false;
    setDataSourcesLoading(true);
    setDataSourcesError("");
    void (async () => {
      try {
        const sources = await listObservabilityDataSources();
        if (!cancelled) setDataSources(sources);
      } catch (err) {
        if (!cancelled) {
          setDataSourcesError((err as Error).message || "Não foi possível carregar os Data Sources.");
          setDataSources([]);
        }
      } finally {
        if (!cancelled) setDataSourcesLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [refreshToken]);

  useEffect(() => {
    const datasourceId = filters.datasource_id;
    if (datasourceId === null) {
      setSchemaOptions([]);
      setTableOptions([]);
      setSchemasLoading(false);
      setTablesLoading(false);
      return;
    }
    let cancelled = false;
    setSchemasLoading(true);
    void (async () => {
      try {
        const options = await listObservabilitySchemas(datasourceId);
        if (!cancelled) setSchemaOptions(options);
      } catch {
        if (!cancelled) {
          setSchemaOptions([]);
        }
      } finally {
        if (!cancelled) setSchemasLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [filters.datasource_id, refreshToken]);

  useEffect(() => {
    const datasourceId = filters.datasource_id;
    if (datasourceId === null || !filters.schema) {
      setTableOptions([]);
      setTablesLoading(false);
      return;
    }
    let cancelled = false;
    setTablesLoading(true);
    void (async () => {
      try {
        const options = await listObservabilityTables(datasourceId, filters.schema);
        if (!cancelled) setTableOptions(options);
      } catch {
        if (!cancelled) setTableOptions([]);
      } finally {
        if (!cancelled) setTablesLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [filters.datasource_id, filters.schema, refreshToken]);

  useEffect(() => {
    const datasourceId = filters.datasource_id;
    if (datasourceId === null) {
      setLoading(false);
      setError("");
      setPageData(null);
      return;
    }
    let cancelled = false;
    setLoading(true);
    setError("");
    setPageData(null);
    void (async () => {
      try {
        const data = await listObservabilityAssets({ ...filters, datasource_id: datasourceId });
        if (!cancelled) setPageData(data);
      } catch (err) {
        if (!cancelled) setError((err as Error).message || "Não foi possível carregar a observabilidade de dados.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [filters, refreshToken]);

  async function openDetail(asset: ObservabilityAssetRecord) {
    setDetailOpen(true);
    setSelectedAssetLoading(true);
    setSelectedAssetError("");
    setSelectedAsset(null);
    try {
      const detail = await getObservabilityAssetById(asset.table_id);
      setSelectedAsset(detail);
    } catch (err) {
      setSelectedAssetError((err as Error).message || "Não foi possível carregar o detalhe.");
      setSelectedAsset(asset);
    } finally {
      setSelectedAssetLoading(false);
    }
  }

  function closeDetail() {
    setDetailOpen(false);
    setSelectedAsset(null);
    setSelectedAssetError("");
    setSelectedAssetLoading(false);
  }

  function applyQuickFilter(key: "all" | "critical" | "sla" | "drift" | "volume" | "pipeline") {
    if (key === "all") {
      setFilters(DEFAULT_FILTERS);
      return;
    }

    const patch: Partial<ObservabilityFiltersState> = { page: 1 };

    if (key === "critical") {
      patch.only_critical = true;
      patch.criticality = "critical";
      patch.status = "critical";
    }

    if (key === "sla") {
      patch.only_out_of_sla = true;
      patch.status = "late";
    }

    if (key === "drift") {
      patch.status = "drift";
    }

    if (key === "volume") {
      patch.status = "attention";
    }

    if (key === "pipeline") {
      patch.only_incidents = true;
      patch.status = "blocked";
    }

    patchFilters(patch);
  }

  const totalPages = useMemo(() => Math.max(1, Math.ceil((pageData?.total || 0) / PAGE_SIZE)), [pageData?.total]);
  const hasDatasourceSelection = filters.datasource_id !== null;
  const noDataSourcesAvailable = !dataSourcesLoading && dataSources.length === 0;
  const showNoScopeState = !hasDatasourceSelection && !dataSourcesError;
  const showNoTablesState = hasDatasourceSelection && !loading && !error && (pageData?.total ?? 0) === 0;

  return (
    <div className="space-y-5">
      <div className="relative overflow-hidden rounded-[28px] border border-border/80 bg-[linear-gradient(135deg,rgba(255,255,255,0.95)_0%,rgba(239,246,255,0.92)_52%,rgba(236,253,245,0.75)_100%)] p-6 shadow-card">
        <div className="absolute right-0 top-0 h-40 w-40 rounded-full bg-brand-500/10 blur-3xl" />
        <div className="relative space-y-2">
          <Badge tone="accent">Central de observabilidade</Badge>
          <h1 className="text-3xl font-semibold tracking-[-0.03em] text-text">Observabilidade de Dados</h1>
          <p className="max-w-3xl text-sm leading-6 text-text-body">
            Monitore chegada, volume, schema, pipelines e confiabilidade final dos dados críticos.
          </p>
        </div>
      </div>

      <ObservabilityFilters
        filters={filters}
        dataSources={dataSources}
        schemaOptions={schemaOptions}
        tableOptions={tableOptions}
        filterOptions={pageData?.filter_options ?? null}
        selectedDataSource={selectedDataSource}
        dataSourcesLoading={dataSourcesLoading}
        schemasLoading={schemasLoading}
        tablesLoading={tablesLoading}
        loading={loading}
        total={pageData?.total ?? 0}
        onPatch={patchFilters}
        onRefresh={refreshPage}
        onReset={() => setFilters(DEFAULT_FILTERS)}
      />

      {dataSourcesError ? (
        <EmptyState
          title="Não foi possível carregar os Data Sources"
          description={dataSourcesError}
          action={<Button onClick={refreshPage}>Tentar novamente</Button>}
        />
      ) : null}

      {showNoScopeState ? (
        <EmptyState
          title={dataSourcesLoading ? "Carregando Data Sources..." : noDataSourcesAvailable ? "Nenhum Data Source cadastrado" : "Selecione um Data Source para iniciar a Observabilidade."}
          description={
            dataSourcesLoading
              ? "Aguarde enquanto buscamos os Data Sources reais cadastrados no catálogo."
              : noDataSourcesAvailable
                ? "Nenhum Data Source foi encontrado. Crie um Data Source e execute um scan para iniciar a Observabilidade."
                : "Selecione um Data Source para carregar schemas, tabelas e sinais reais da observabilidade."
          }
          action={dataSourcesLoading ? undefined : noDataSourcesAvailable ? <Button onClick={refreshPage}>Tentar novamente</Button> : undefined}
        />
      ) : null}

      {error && hasDatasourceSelection ? (
        <EmptyState
          title="Falha ao carregar observabilidade"
          description={error}
          action={<Button onClick={refreshPage}>Tentar novamente</Button>}
        />
      ) : null}

      {hasDatasourceSelection && !error && !showNoTablesState ? (
        <>
          <ObservabilitySummaryCards data={pageData} loading={loading} onQuickFilter={applyQuickFilter} />
          <ObservabilityPriorityAlerts data={pageData} loading={loading} onQuickFilter={applyQuickFilter} />

          <ObservabilityAssetsTable
            data={pageData}
            loading={loading}
            onOpenDetail={openDetail}
            onPageChange={(page) => patchFilters({ page })}
          />

          {pageData && pageData.total > 0 ? <ObservabilityRelatedSignalsPanel data={pageData} loading={loading} /> : null}
        </>
      ) : null}

      {showNoTablesState ? (
        <EmptyState
          title="Nenhuma tabela monitorada encontrada para este Data Source."
          description="Execute um scan do Data Source ou ajuste os filtros para carregar apenas ativos reais do catálogo."
          action={<Button onClick={refreshPage}>Tentar novamente</Button>}
        />
      ) : null}

      <ObservabilityAssetDetailModal
        asset={selectedAsset}
        error={selectedAssetError}
        loading={selectedAssetLoading}
        open={detailOpen}
        onClose={closeDetail}
      />
    </div>
  );
}
