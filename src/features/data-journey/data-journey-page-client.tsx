import { Link } from "@/lib/next-shims";
import { usePathname, useRouter, useSearchParams } from "@/lib/next-shims";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ArrowRight,
  ArrowUpRight,
  BadgeCheck,
  BarChart3,
  Fingerprint,
  Layers3,
  Loader2,
  Map,
  MessageSquareWarning,
  ShieldAlert,
  Sparkles,
  Table2,
  Workflow,
  X,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { ApiError, apiRequest } from "@/lib/client-api";
import { cn } from "@/lib/cn";
import { normalizePageItems, type PageResponse } from "@/lib/pagination";
import { UX_COPY } from "@/lib/presentation/status-copy";
import { useExplorerCatalogTree } from "@/features/explorer/hooks/use-explorer-catalog-tree";
import { fetchStewardshipRequests } from "@/features/explorer/loaders/explorer-summary-loaders";
import type {
  CanonicalAssetContext,
  DQLatest,
  DatasourceNode,
  MetabaseConsumptionSummary,
  RowCountMetrics,
  SchemaNode,
  TableCorrelationSummary,
  TableDetailInfo,
  TableLocator,
  TableStewardshipRequest,
  TableNode,
} from "@/features/explorer/types";
import type { SearchResultItem, SearchResultsResponse } from "@/features/search/types";
import {
  formatCompactNumber,
  formatDateTime,
  freshnessLabel,
  tableKindLabel,
} from "@/features/explorer/utils";
import { getDataLakeTableDetailById } from "@/features/integrations/sdk";
import type { DQRule } from "@/features/data-quality/types";
import { getJourneyStatusVisual } from "@/features/data-journey/journey-status-visual";
import { getSemanticProductForTable } from "@/features/semantic/sdk";
import type { SemanticProductDetail } from "@/features/semantic/types";
import type {
  JourneyPhaseKey,
  JourneySectionContent,
  JourneySummaryState,
  JourneyTone,
  TableVolumeMeasureResponse,
} from "./types";
import {
  assetKindLabel,
  buildJourneySectionContent,
  buildOverallStatus,
  buildPhaseStatus,
  buildRecommendedActions,
  getJourneyItemKey,
  parsePositiveInt,
  phaseLinks,
  phaseTitle,
  schemaLabel,
  sourceBadgeTone,
  sourceLabel,
  sourceSummary,
  tableLabel,
} from "./helpers";

const PHASE_ORDER: JourneyPhaseKey[] = [
  "identity",
  "governance",
  "dataQuality",
  "dqRules",
  "certification",
  "privacy",
  "incidents",
  "ingestion",
  "lineage",
  "consumption",
  "dataLake",
  "actions",
];

async function resolveSemanticProductForTable(tableId: number): Promise<SemanticProductDetail | null> {
  // Direct lookup (single request) instead of listing all products and fetching each detail.
  return getSemanticProductForTable(tableId);
}

function phaseIcon(key: JourneyPhaseKey) {
  switch (key) {
    case "identity":
      return Fingerprint;
    case "governance":
      return BadgeCheck;
    case "dataQuality":
      return BarChart3;
    case "dqRules":
      return BarChart3;
    case "certification":
      return ShieldAlert;
    case "privacy":
      return ShieldAlert;
    case "incidents":
      return MessageSquareWarning;
    case "ingestion":
      return Workflow;
    case "lineage":
      return Map;
    case "consumption":
      return Table2;
    case "dataLake":
      return Layers3;
    case "actions":
      return Sparkles;
    default:
      return Sparkles;
  }
}

const JOURNEY_INTERPRETATION_POINTS: Array<{ label: string; detail: string }> = [
  { label: "Identidade", detail: "o que é a tabela e como ela foi descrita no catálogo." },
  { label: "Governança", detail: "quem responde pelo ativo e qual contexto de negócio existe." },
  { label: "Qualidade", detail: "se há regras, execuções e falhas conhecidas." },
  { label: "Certificação", detail: "se o ativo pode ser tratado como fonte confiável." },
  { label: "Operação", detail: "se a atualização e o freshness estão coerentes." },
  { label: "Consumo", detail: "quem usa ou parece depender desse ativo." },
];

function SummaryChip({
  label,
  value,
  tone = "neutral",
  href,
}: {
  label: string;
  value: string;
  tone?: JourneyTone;
  href?: string | null;
}) {
  const content = (
    <div
      className={cn(
        "rounded-2xl border px-3 py-2 transition",
        tone === "success" && "border-success-200 bg-success-50/80",
        tone === "warning" && "border-warning-200 bg-warning-50/80",
        tone === "danger" && "border-danger-200 bg-danger-50/80",
        tone === "accent" && "border-info-200 bg-info-50/80",
        tone === "neutral" && "border-border bg-bg-subtle/80",
        href ? "cursor-pointer hover:border-border-strong hover:bg-surface" : "",
      )}
    >
      <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-brand-600">{label}</p>
      <p className="mt-1 text-sm font-semibold text-text">{value}</p>
    </div>
  );

  if (!href) return content;

  return (
    <Link className="block focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-400 focus-visible:ring-offset-2" href={href}>
      {content}
    </Link>
  );
}

function ResultRow({
  item,
  onClick,
}: {
  item: SearchResultItem;
  onClick: () => void;
}) {
  return (
    <button
      className="w-full rounded-2xl border border-border bg-surface/90 p-4 text-left shadow-[0_10px_24px_rgba(15,23,42,0.04)] transition hover:border-brand-200 hover:bg-brand-50/40"
      onClick={onClick}
      type="button"
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="space-y-1">
          <p className="font-semibold text-text">{item.title}</p>
          <p className="text-sm text-text-body">{item.subtitle || item.metadata.table_fqn || item.description || "Tabela do catálogo"}</p>
        </div>
        <Badge tone={item.metadata.certification_status === "certified" ? "success" : item.metadata.owner_defined ? "accent" : "neutral"}>
          {item.metadata.certification_status || "Tabela"}
        </Badge>
      </div>
      <div className="mt-3 flex flex-wrap gap-2 text-xs font-medium text-text-body">
        {item.metadata.owner ? <Badge tone="neutral">{item.metadata.owner}</Badge> : null}
        {item.metadata.domain ? <Badge tone="neutral">{item.metadata.domain}</Badge> : null}
        {item.metadata.schema ? <Badge tone="neutral">{item.metadata.schema}</Badge> : null}
        {item.metadata.source ? <Badge tone="neutral">{item.metadata.source}</Badge> : null}
        {item.metadata.database ? <Badge tone="neutral">{item.metadata.database}</Badge> : null}
      </div>
    </button>
  );
}

function JourneySectionCard({
  phase,
  summary,
  content,
  onMeasureVolume,
  measureActionLoading,
}: {
  phase: JourneyPhaseKey;
  summary: JourneySummaryState;
  content: JourneySectionContent;
  onMeasureVolume?: () => void;
  measureActionLoading?: boolean;
}) {
  const Icon = phaseIcon(phase);
  const status = buildPhaseStatus({ key: phase, summary });
  const visual = getJourneyStatusVisual({ label: status.label, tone: status.tone });
  const StatusIcon = visual.Icon;
  const visibleRows = content.rows;
  const visibleItems = phase === "actions" ? content.items.slice(0, 5) : content.items.slice(0, 3);

  return (
    <Card
      className={cn(
        "relative overflow-hidden rounded-3xl border shadow-sm",
        visual.cardClassName,
      )}
    >
      <div className={cn("absolute inset-y-0 left-0 w-1.5", visual.accentClassName)} />
      <CardContent className="space-y-5 p-6 pl-7">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="space-y-4">
            <div className="flex items-start gap-3">
              <div
                className={cn(
                  "flex h-12 w-12 items-center justify-center rounded-2xl border",
                  visual.iconWrapClassName,
                )}
              >
                <Icon className="h-5 w-5" />
              </div>
              <div className="space-y-1.5">
                <div className="flex items-center gap-2">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-brand-600">{phaseTitle(phase)}</p>
                </div>
                <h3 className="text-xl font-semibold tracking-tight text-text">{content.title}</h3>
                <p className="max-w-3xl text-sm leading-6 text-text-body">{content.intro}</p>
              </div>
            </div>
          </div>
          <div className="flex flex-wrap items-center justify-end gap-2">
            <Badge className="gap-1.5" tone={visual.badgeTone}>
              <StatusIcon className={cn("h-3.5 w-3.5", visual.iconClassName)} />
              {status.label}
            </Badge>
            <Badge className={cn("shadow-none", visual.metricBadgeClassName)} tone="neutral">
              {status.metric}
            </Badge>
          </div>
        </div>

        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {visibleRows.map((item) => (
            <SummaryChip key={`${phase}-${item.label}`} href={item.href} label={item.label} value={item.value} tone={item.tone} />
          ))}
        </div>

        {content.items.length ? (
          <div className="space-y-3">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-brand-600">{content.itemsTitle || "Principais itens"}</p>
            <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
              {visibleItems.map((item, index) => (
                item.href ? (
                  <Link
                    className="block rounded-2xl focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-400 focus-visible:ring-offset-2"
                    href={item.href}
                    key={getJourneyItemKey(item, phase, index)}
                  >
                    <div className={cn("rounded-2xl border p-4 transition hover:bg-surface", visual.borderClassName, visual.backgroundClassName, "hover:border-border-strong")}>
                      <div className="flex items-start justify-between gap-3">
                        <div className="space-y-1">
                          <p className="text-sm font-semibold text-text">{item.title}</p>
                          <p className="text-sm leading-6 text-text-body">{item.detail}</p>
                        </div>
                        {item.tone ? <Badge tone={item.tone}>{item.meta || "Item"}</Badge> : null}
                      </div>
                      {!item.tone && item.meta ? <p className="mt-3 text-xs text-muted">{item.meta}</p> : null}
                    </div>
                  </Link>
                ) : (
                  <div className={cn("rounded-2xl border p-4", visual.borderClassName, visual.backgroundClassName)} key={getJourneyItemKey(item, phase, index)}>
                    <div className="flex items-start justify-between gap-3">
                      <div className="space-y-1">
                        <p className="text-sm font-semibold text-text">{item.title}</p>
                        <p className="text-sm leading-6 text-text-body">{item.detail}</p>
                      </div>
                      {item.tone ? <Badge tone={item.tone}>{item.meta || "Item"}</Badge> : null}
                    </div>
                    {!item.tone && item.meta ? <p className="mt-3 text-xs text-muted">{item.meta}</p> : null}
                  </div>
                )
              ))}
            </div>
          </div>
        ) : content.emptyTitle ? (
          <EmptyState
            className={cn("shadow-none", visual.borderClassName, visual.backgroundClassName)}
            description={content.emptyDescription || "Não há dados suficientes para esta caixa."}
            title={content.emptyTitle}
          />
        ) : null}

        {(content.measureActionLabel || content.primaryActionHref || content.secondaryActionHref) && (
          <div className="flex flex-wrap gap-2">
            {content.measureActionLabel && onMeasureVolume ? (
              <Button disabled={measureActionLoading} onClick={onMeasureVolume} size="sm" variant="outline">
                {measureActionLoading ? "Medindo..." : content.measureActionLabel}
              </Button>
            ) : null}
            {content.primaryActionHref ? (
              <Button asChild size="sm">
                <Link href={content.primaryActionHref}>{content.primaryActionLabel || "Abrir módulo"}</Link>
              </Button>
            ) : null}
            {content.secondaryActionHref ? (
              <Button asChild size="sm" variant="outline">
                <Link href={content.secondaryActionHref}>{content.secondaryActionLabel || "Ver mais"}</Link>
              </Button>
            ) : null}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export default function DataJourneyPageClient() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const handleCatalogTreeError = useMemo(() => () => undefined, []);

  const initialDatasourceId = parsePositiveInt(searchParams.get("datasourceId"));
  const initialSchemaId = parsePositiveInt(searchParams.get("schemaId"));
  const initialTableId = parsePositiveInt(searchParams.get("tableId"));

  const [selectedDatasourceId, setSelectedDatasourceId] = useState<number | null>(initialDatasourceId);
  const [selectedSchemaId, setSelectedSchemaId] = useState<number | null>(initialSchemaId);
  const [selectedTableId, setSelectedTableId] = useState<number | null>(initialTableId);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<SearchResultItem[]>([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const [searchError, setSearchError] = useState("");
  const [journeyLoading, setJourneyLoading] = useState(false);
  const [volumeMeasureLoading, setVolumeMeasureLoading] = useState(false);
  const [pageError, setPageError] = useState("");
  const [summary, setSummary] = useState<JourneySummaryState>({
    locator: null,
    tableDetail: null,
    canonical: null,
    correlation: null,
    dq: null,
    dqRules: [],
    metabase: null,
    dataLake: null,
    stewardshipRequests: [],
    semanticProduct: null,
    locatorError: null,
    tableDetailError: null,
    canonicalError: null,
    correlationError: null,
    dqError: null,
    metabaseError: null,
    dataLakeError: null,
  });
  const [locatorLoading, setLocatorLoading] = useState(false);
  const [journeyReloadToken, setJourneyReloadToken] = useState(0);
  const loadSeqRef = useRef(0);

  const { datasources, ensureDatasourceLoaded, ensureSchemaLoaded } = useExplorerCatalogTree({
    onError: handleCatalogTreeError,
  });

  const selectedDatasource = useMemo(
    () => datasources.find((datasource) => datasource.id === selectedDatasourceId) ?? null,
    [datasources, selectedDatasourceId],
  );
  const selectedSchema = useMemo(
    () => selectedDatasource?.schemas?.find((schema) => schema.id === selectedSchemaId) ?? null,
    [selectedDatasource, selectedSchemaId],
  );
  const selectedTable = useMemo(
    () => selectedSchema?.tables?.find((table) => table.id === selectedTableId) ?? null,
    [selectedSchema, selectedTableId],
  );
  const datasourceOptions = datasources;
  const schemaOptions = selectedDatasource?.schemas ?? [];
  const tableOptions = selectedSchema?.tables ?? [];
  const links = phaseLinks(selectedTableId, summary.canonical);
  const overallStatus = buildOverallStatus(summary);
  const recommendedActions = useMemo(() => buildRecommendedActions(summary), [summary]);

  useEffect(() => {
    const tableId = parsePositiveInt(searchParams.get("tableId"));
    const datasourceId = parsePositiveInt(searchParams.get("datasourceId"));
    const schemaId = parsePositiveInt(searchParams.get("schemaId"));
    if (tableId !== selectedTableId) setSelectedTableId(tableId);
    if (datasourceId !== selectedDatasourceId) setSelectedDatasourceId(datasourceId);
    if (schemaId !== selectedSchemaId) setSelectedSchemaId(schemaId);
  }, [searchParams, selectedTableId, selectedDatasourceId, selectedSchemaId]);

  useEffect(() => {
    if (!selectedDatasourceId) return;

    if (!selectedDatasource || selectedDatasource.schemas === null) {
      void ensureDatasourceLoaded(selectedDatasourceId).catch(() => undefined);
      return;
    }

    if (!selectedSchemaId) return;

    if (!selectedSchema || selectedSchema.tables === null) {
      void ensureSchemaLoaded(selectedDatasourceId, selectedSchemaId).catch(() => undefined);
    }
  }, [
    ensureDatasourceLoaded,
    ensureSchemaLoaded,
    selectedDatasource,
    selectedDatasourceId,
    selectedSchema,
    selectedSchemaId,
  ]);

  useEffect(() => {
    const query = searchQuery.trim();
    if (query.length < 2) {
      setSearchResults([]);
      setSearchLoading(false);
      setSearchError("");
      return;
    }

    let cancelled = false;
    const timeout = window.setTimeout(() => {
      setSearchLoading(true);
      setSearchError("");
      void (async () => {
        try {
          const payload = await apiRequest<SearchResultsResponse>(
            `/v1/search/results?q=${encodeURIComponent(query)}&type=table&limit=8`,
          );
          if (cancelled) return;
          setSearchResults(payload.items || []);
        } catch (error) {
          if (cancelled) return;
          setSearchResults([]);
          setSearchError(error instanceof Error ? error.message : "Não foi possível buscar tabelas.");
        } finally {
          if (!cancelled) setSearchLoading(false);
        }
      })();
    }, 220);

    return () => {
      cancelled = true;
      window.clearTimeout(timeout);
    };
  }, [searchQuery]);

  useEffect(() => {
    if (!selectedTableId) {
      setSummary({
        locator: null,
        tableDetail: null,
        canonical: null,
        correlation: null,
        dq: null,
        dqRules: [],
        metabase: null,
        dataLake: null,
        stewardshipRequests: [],
        semanticProduct: null,
        locatorError: null,
        tableDetailError: null,
        canonicalError: null,
        correlationError: null,
        dqError: null,
        metabaseError: null,
        dataLakeError: null,
      });
      setJourneyLoading(false);
      setPageError("");
      setLocatorLoading(false);
      return;
    }

    const controller = new AbortController();
    let cancelled = false;
    const nextSeq = loadSeqRef.current + 1;
    loadSeqRef.current = nextSeq;

    setJourneyLoading(true);
    setPageError("");
    setLocatorLoading(true);
    setSummary({
      locator: null,
      tableDetail: null,
      canonical: null,
      correlation: null,
      dq: null,
      dqRules: [],
      metabase: null,
      dataLake: null,
      stewardshipRequests: [],
      semanticProduct: null,
      locatorError: null,
      tableDetailError: null,
      canonicalError: null,
      correlationError: null,
      dqError: null,
      metabaseError: null,
      dataLakeError: null,
    });

    void (async () => {
      try {
        const [
          locatorResult,
          detailResult,
          canonicalResult,
          correlationResult,
          dqResult,
          dqRulesResult,
          metabaseResult,
          dataLakeResult,
          stewardshipRequestsResult,
          semanticProductResult,
        ] =
          await Promise.allSettled([
            apiRequest<TableLocator>(`/v1/catalog/tables/${selectedTableId}/locator`, { signal: controller.signal }),
            apiRequest<TableDetailInfo>(`/v1/catalog/tables/${selectedTableId}`, { signal: controller.signal }),
            apiRequest<CanonicalAssetContext>(`/v1/catalog/tables/${selectedTableId}/canonical-summary`, {
              signal: controller.signal,
            }),
            apiRequest<TableCorrelationSummary>(`/v1/catalog/tables/${selectedTableId}/correlation-summary`, {
              signal: controller.signal,
            }),
            apiRequest<DQLatest>(`/v1/dq/tables/id/${selectedTableId}/latest?history_runs=14`, {
              signal: controller.signal,
            }),
            apiRequest<DQRule[] | PageResponse<DQRule>>(
              `/v1/dq/rules?table_id=${selectedTableId}&is_active=true&page=1&page_size=100`,
              {
              signal: controller.signal,
              },
            ),
            apiRequest<MetabaseConsumptionSummary>(`/v1/catalog/tables/${selectedTableId}/metabase-consumption`, {
              signal: controller.signal,
            }),
            getDataLakeTableDetailById(selectedTableId),
            fetchStewardshipRequests(selectedTableId),
            resolveSemanticProductForTable(selectedTableId),
          ]);

        if (cancelled || loadSeqRef.current !== nextSeq) return;

        if (detailResult.status === "rejected") {
          const error = detailResult.reason;
          const message =
            error instanceof ApiError
              ? error.status === 404
                ? "Tabela não encontrada."
                : error.message
              : error instanceof Error
                ? error.message
                : "Não foi possível carregar a tabela.";
          setPageError(message);
          setJourneyLoading(false);
          setLocatorLoading(false);
          setSummary({
            locator: null,
            tableDetail: null,
            canonical: null,
            correlation: null,
            dq: null,
            dqRules: [],
            metabase: null,
            dataLake: null,
            stewardshipRequests: [],
            semanticProduct: null,
            locatorError: null,
            tableDetailError: message,
            canonicalError: null,
            correlationError: null,
            dqError: null,
            metabaseError: null,
            dataLakeError: null,
          });
          return;
        }

        const locator = locatorResult.status === "fulfilled" ? locatorResult.value : null;
        const canonical = canonicalResult.status === "fulfilled" ? canonicalResult.value : null;
        const correlation = correlationResult.status === "fulfilled" ? correlationResult.value : null;
        const dq = dqResult.status === "fulfilled" ? dqResult.value : null;
        const dqRules = dqRulesResult.status === "fulfilled" ? normalizePageItems(dqRulesResult.value) : [];
        const metabase = metabaseResult.status === "fulfilled" ? metabaseResult.value : null;
        const dataLake = dataLakeResult.status === "fulfilled" ? dataLakeResult.value : null;
        const stewardshipRequests = stewardshipRequestsResult.status === "fulfilled" ? stewardshipRequestsResult.value : [];
        const semanticProduct = semanticProductResult.status === "fulfilled" ? semanticProductResult.value : null;

        if (locator) {
          setSummary((current) => ({ ...current, locator }));
          if (!selectedDatasourceId) setSelectedDatasourceId(locator.datasource_id);
          if (!selectedSchemaId) setSelectedSchemaId(locator.schema_id);
        }

        if (!selectedDatasourceId && locator?.datasource_id) {
          void ensureDatasourceLoaded(locator.datasource_id).catch(() => undefined);
        }
        if (locator?.datasource_id && locator?.schema_id) {
          void ensureSchemaLoaded(locator.datasource_id, locator.schema_id).catch(() => undefined);
        }

        setSummary({
          locator,
          tableDetail: detailResult.value,
          canonical,
          correlation,
          dq,
          dqRules,
          metabase,
          dataLake,
          stewardshipRequests,
          semanticProduct,
          locatorError: locatorResult.status === "rejected" ? "Não foi possível carregar o locador da tabela." : null,
          tableDetailError: null,
          canonicalError: canonicalResult.status === "rejected" ? "Resumo canônico indisponível." : null,
          correlationError: correlationResult.status === "rejected" ? "Resumo correlacionado indisponível." : null,
          dqError: dqResult.status === "rejected" ? "Data Quality indisponível." : null,
          metabaseError: metabaseResult.status === "rejected" ? "Consumo analítico indisponível." : null,
          dataLakeError: dataLakeResult.status === "rejected" ? "Data Lake indisponível para esta tabela." : null,
        });
        setPageError("");
      } catch (error) {
        if (!cancelled && loadSeqRef.current === nextSeq) {
          setPageError(error instanceof Error ? error.message : "Não foi possível carregar a jornada do ativo.");
        }
      } finally {
        if (!cancelled && loadSeqRef.current === nextSeq) {
          setJourneyLoading(false);
          setLocatorLoading(false);
        }
      }
    })();

    return () => {
      cancelled = true;
      controller.abort();
    };
  }, [selectedTableId, journeyReloadToken]);

  function updateSelectionUrl(next: { datasourceId: number | null; schemaId: number | null; tableId: number | null }) {
    const params = new URLSearchParams();
    if (next.datasourceId) params.set("datasourceId", String(next.datasourceId));
    if (next.schemaId) params.set("schemaId", String(next.schemaId));
    if (next.tableId) params.set("tableId", String(next.tableId));
    const nextUrl = params.toString() ? `${pathname}?${params.toString()}` : pathname;
    router.replace(nextUrl, { scroll: false });
  }

  async function handleDatasourceChange(value: string) {
    const nextDatasourceId = parsePositiveInt(value);
    setSelectedDatasourceId(nextDatasourceId);
    setSelectedSchemaId(null);
    setSelectedTableId(null);
    updateSelectionUrl({ datasourceId: nextDatasourceId, schemaId: null, tableId: null });
    if (nextDatasourceId) await ensureDatasourceLoaded(nextDatasourceId).catch(() => undefined);
  }

  async function handleSchemaChange(value: string) {
    const nextSchemaId = parsePositiveInt(value);
    setSelectedSchemaId(nextSchemaId);
    setSelectedTableId(null);
    updateSelectionUrl({ datasourceId: selectedDatasourceId, schemaId: nextSchemaId, tableId: null });
    if (selectedDatasourceId && nextSchemaId) await ensureSchemaLoaded(selectedDatasourceId, nextSchemaId).catch(() => undefined);
  }

  function handleTableChange(value: string) {
    const nextTableId = parsePositiveInt(value);
    setSelectedTableId(nextTableId);
    updateSelectionUrl({ datasourceId: selectedDatasourceId, schemaId: selectedSchemaId, tableId: nextTableId });
  }

  const handleMeasureVolumeNow = useCallback(async () => {
    if (!selectedTableId) return;
    setVolumeMeasureLoading(true);
    setPageError("");
    try {
      const response = await apiRequest<TableVolumeMeasureResponse>(`/v1/catalog/tables/${selectedTableId}/volume/measure`, {
        method: "POST",
      });
      if (!response || (response.status && response.status.toLowerCase() !== "success")) {
        throw new Error(response?.error_message || "Não foi possível medir o volume desta tabela.");
      }
      setJourneyReloadToken((current) => current + 1);
    } catch (error) {
      const message =
        error instanceof ApiError
          ? error.message
          : error instanceof Error
            ? error.message
            : "Não foi possível medir o volume da tabela.";
      setPageError(message);
    } finally {
      setVolumeMeasureLoading(false);
    }
  }, [selectedTableId]);

  function handleClearSelection() {
    setSelectedDatasourceId(null);
    setSelectedSchemaId(null);
    setSelectedTableId(null);
    setSearchQuery("");
    setSearchResults([]);
    setSearchError("");
    setPageError("");
    updateSelectionUrl({ datasourceId: null, schemaId: null, tableId: null });
  }

  async function handleSelectSearchResult(item: SearchResultItem) {
    const nextDatasourceId = item.metadata.datasource_id ?? null;
    const nextSchemaId = item.metadata.schema_id ?? null;
    const nextTableId = item.metadata.table_id ?? item.entity_id ?? null;
    if (nextDatasourceId) {
      await ensureDatasourceLoaded(nextDatasourceId).catch(() => undefined);
    }
    if (nextDatasourceId && nextSchemaId) {
      await ensureSchemaLoaded(nextDatasourceId, nextSchemaId).catch(() => undefined);
    }
    setSelectedDatasourceId(nextDatasourceId);
    setSelectedSchemaId(nextSchemaId);
    setSelectedTableId(nextTableId);
    setSearchResults([]);
    setSearchError("");
    updateSelectionUrl({ datasourceId: nextDatasourceId, schemaId: nextSchemaId, tableId: nextTableId });
  }

  const sectionCards = useMemo(
    () =>
      PHASE_ORDER.map((phase) => ({
        phase,
        status: buildPhaseStatus({ key: phase, summary }),
        content: buildJourneySectionContent({ phase, summary, recommendedActions, links }),
        onMeasureVolume: phase === "identity" ? handleMeasureVolumeNow : undefined,
        measureActionLoading: phase === "identity" ? volumeMeasureLoading : false,
      })),
    [handleMeasureVolumeNow, links, recommendedActions, summary, volumeMeasureLoading],
  );
  const selectedTableName =
    summary.canonical?.display_name || summary.canonical?.table_fqn || selectedTable?.name || summary.locator?.table_name || "Selecione um ativo";
  const selectedTableFqn = summary.canonical?.table_fqn || (summary.locator ? `${summary.locator.schema_name}.${summary.locator.table_name}` : UX_COPY.notAvailable);
  const selectedTableType = assetKindLabel(summary.tableDetail, summary.locator);
  const selectedOwner = summary.canonical?.owner.owner_name || summary.tableDetail?.owner || `${UX_COPY.notDefined} — o ativo ainda não possui responsável formal.`;
  const selectedDomain = summary.semanticProduct?.domain_name || `${UX_COPY.noLink} — ainda não há vínculo semântico confirmado.`;
  const selectedCriticality =
    summary.canonical?.classification.certification_criticality ||
    summary.tableDetail?.certification_criticality ||
    `${UX_COPY.notDefined} — a importância operacional ainda não foi classificada.`;
  const selectedUpdatedAt = summary.tableDetail?.updated_at || summary.canonical?.generated_at || null;
  const isEmpty = !selectedTableId;

  return (
    <div className="space-y-6 pb-8">
      <Card className="overflow-hidden border-border bg-[radial-gradient(circle_at_top_left,_rgba(56,189,248,0.14),_transparent_38%),linear-gradient(135deg,#ffffff_0%,#f8fbff_52%,#eef6ff_100%)] shadow-[0_18px_48px_rgba(15,23,42,0.08)]">
        <CardContent className="space-y-5 p-6">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
            <div className="max-w-3xl space-y-3">
              <div className="flex flex-wrap items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.18em] text-brand-600">
                <span className="rounded-full border border-info-200 bg-info-50 px-2.5 py-1 text-info-700">Visão integrada</span>
                <span className="rounded-full border border-border bg-surface/90 px-2.5 py-1">Governança</span>
                <span className="rounded-full border border-border bg-surface/90 px-2.5 py-1">Operação</span>
                <span className="rounded-full border border-border bg-surface/90 px-2.5 py-1">Consumo</span>
              </div>
              <p className="text-sm font-medium text-text-body md:text-base">Catálogo do ativo</p>
              <h1 className="text-3xl font-semibold tracking-tight text-text md:text-4xl">Visão integrada do ativo</h1>
              <p className="max-w-4xl text-sm leading-6 text-text-body">
                Escolha uma fonte, schema e tabela para acompanhar a vida completa de um ativo de dados: identidade, governança, qualidade, certificação, privacidade, incidentes, ingestão, linhagem e consumo analítico.
              </p>
              <p className="max-w-4xl text-xs leading-5 text-muted">
                Como usar: selecione fonte, schema e tabela, revise o status geral e percorra os cards de cima para baixo para entender contexto, risco e próximos passos.
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2 lg:pt-2">
              <div className="space-y-1">
                <div className="text-xs font-semibold uppercase tracking-[0.18em] text-brand-600">Status geral</div>
                <Badge tone={overallStatus.tone}>{overallStatus.label}</Badge>
              </div>
              {selectedTableId ? (
                <Button onClick={handleClearSelection} size="sm" variant="outline">
                  Limpar seleção
                  <X className="ml-2 h-4 w-4" />
                </Button>
              ) : null}
            </div>
          </div>

          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
            <div className="space-y-2">
              <label className="text-sm font-medium text-text-body" htmlFor="journey-datasource">
                Fonte
              </label>
              <Select id="journey-datasource" onChange={(event) => void handleDatasourceChange(event.target.value)} value={selectedDatasourceId ?? ""}>
                <option value="">Selecione uma fonte</option>
                {datasourceOptions.map((datasource) => (
                  <option key={datasource.id} value={datasource.id}>
                    {sourceLabel(datasource)}
                  </option>
                ))}
              </Select>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-text-body" htmlFor="journey-schema">
                Schema
              </label>
              <Select
                disabled={!selectedDatasourceId}
                id="journey-schema"
                onChange={(event) => void handleSchemaChange(event.target.value)}
                value={selectedSchemaId ?? ""}
              >
                <option value="">Selecione um schema</option>
                {schemaOptions.map((schema) => (
                  <option key={schema.id} value={schema.id}>
                    {schemaLabel(schema)}
                  </option>
                ))}
              </Select>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-text-body" htmlFor="journey-table">
                Tabela
              </label>
              <Select
                disabled={!selectedSchemaId}
                id="journey-table"
                onChange={(event) => void handleTableChange(event.target.value)}
                value={selectedTableId ?? ""}
              >
                <option value="">Selecione uma tabela</option>
                {tableOptions.map((table) => (
                  <option key={table.id} value={table.id}>
                    {tableLabel(table)}
                  </option>
                ))}
              </Select>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-text-body" htmlFor="journey-search">
                Busca rápida
              </label>
              <Input
                id="journey-search"
                onChange={(event) => setSearchQuery(event.target.value)}
                placeholder="Buscar tabela, FQN, owner ou domínio"
                value={searchQuery}
              />
              <p className="text-xs leading-5 text-muted">Use quando já souber o nome do ativo.</p>
            </div>
          </div>

          {locatorLoading || searchLoading ? (
            <div className="flex items-center gap-2 rounded-2xl border border-border bg-bg-subtle px-3 py-2 text-sm text-text-body">
              <Loader2 className="h-4 w-4 animate-spin" />
              Carregando opções...
            </div>
          ) : null}

          {searchError ? <div className="rounded-2xl border border-danger-200 bg-danger-50 px-3 py-2 text-sm text-danger-700">{searchError}</div> : null}

          {!selectedTableId && searchResults.length > 0 ? (
            <div className="space-y-3">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-brand-600">Resultados</p>
              <div className="space-y-3">
                {searchResults.map((item) => (
                  <ResultRow key={`${item.entity_type}-${item.entity_id}`} item={item} onClick={() => void handleSelectSearchResult(item)} />
                ))}
              </div>
            </div>
          ) : null}

          {!selectedTableId && !searchLoading && searchQuery.trim().length >= 2 && searchResults.length === 0 && !searchError ? (
            <EmptyState
              className="border-border bg-bg-subtle/80 shadow-none"
              title="Nenhuma tabela encontrada"
              description="Tente refinar o nome da tabela, schema, owner ou domínio."
            />
          ) : null}
        </CardContent>
      </Card>

      <div className="space-y-4">
        {pageError ? (
          <div className="rounded-2xl border border-danger-200 bg-danger-50 px-4 py-3 text-sm text-danger-700">
            {pageError}
          </div>
        ) : null}

        {isEmpty ? (
          <EmptyState
            action={<Button onClick={() => setSearchQuery("")} size="sm" variant="outline">Explorar fontes</Button>}
            description="Escolha uma fonte, schema e tabela para ver a visão integrada de governança, qualidade, certificação, privacidade, incidentes, ingestão, linhagem e consumo analítico."
            title="Selecione um ativo para iniciar a jornada"
          />
        ) : null}

        {selectedTableId && summary.tableDetail ? (
          <>
            <div className="rounded-3xl border border-border bg-[linear-gradient(135deg,rgba(248,250,252,0.95)_0%,rgba(255,255,255,0.96)_100%)] p-5 shadow-[0_14px_38px_rgba(15,23,42,0.05)]">
              <div className="space-y-5">
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div className="space-y-3">
                    <div className="flex flex-wrap items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.18em] text-brand-600">
                      <span className="rounded-full border border-info-200 bg-info-50 px-2.5 py-1 text-info-700">Ativo selecionado</span>
                      <span className="rounded-full border border-border bg-surface/90 px-2.5 py-1">Resumo executivo</span>
                    </div>

                    <div className="flex flex-wrap items-center gap-2">
                      <Badge tone={overallStatus.tone}>{overallStatus.label}</Badge>
                      <Badge tone={sourceBadgeTone(summary.canonical, summary.locator)}>{sourceSummary(summary.locator, summary.canonical)}</Badge>
                      <Badge tone="neutral">{selectedTableType}</Badge>
                    </div>

                    <div className="space-y-1">
                      <h2 className="text-2xl font-semibold tracking-tight text-text">{selectedTableName}</h2>
                      <p className="text-sm leading-6 text-text-body">{selectedTableFqn}</p>
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-2">
                    <Button asChild size="sm" variant="outline">
                      <Link href={links.explorer}>
                        Explorer
                        <ArrowUpRight className="ml-2 h-4 w-4" />
                      </Link>
                    </Button>
                    <Button asChild size="sm" variant="outline">
                      <Link href={links.dataQuality}>
                        Data Quality
                        <ArrowUpRight className="ml-2 h-4 w-4" />
                      </Link>
                    </Button>
                    <Button asChild size="sm" variant="outline">
                      <Link href={links.incidents}>
                        Incidentes
                        <ArrowUpRight className="ml-2 h-4 w-4" />
                      </Link>
                    </Button>
                    <Button asChild size="sm" variant="outline">
                      <Link href={links.lineage}>
                        Linhagem
                        <ArrowUpRight className="ml-2 h-4 w-4" />
                      </Link>
                    </Button>
                  </div>
                </div>

                <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                  <SummaryChip label="Fonte" value={sourceSummary(summary.locator, summary.canonical)} tone="accent" />
                  <SummaryChip label="Owner" value={selectedOwner} tone="neutral" />
                  <SummaryChip label="Domínio" value={selectedDomain} tone="neutral" />
                  <SummaryChip label="Criticidade" value={selectedCriticality} tone="neutral" />
                  <SummaryChip label="Atualização" value={selectedUpdatedAt ? formatDateTime(selectedUpdatedAt) : "Não disponível"} tone="neutral" />
                  <SummaryChip label="Status geral" value={overallStatus.label} tone={overallStatus.tone} />
                </div>
                <p className="text-sm leading-6 text-text-body">
                  Este é o resumo executivo do ativo selecionado. Use este bloco para confirmar a tabela correta, sua localização no catálogo, owner, domínio, criticidade e status geral.
                </p>
              </div>
            </div>

            <div className="rounded-3xl border border-border bg-surface/90 p-5 shadow-[0_14px_34px_rgba(15,23,42,0.04)]">
              <div className="space-y-4">
                <div className="space-y-2">
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-brand-600">Como interpretar esta jornada</p>
                  <p className="text-sm leading-6 text-text-body">
                    Cada card mostra uma dimensão da saúde do ativo. A leitura começa pela identidade e governança, passa por qualidade, certificação e privacidade, e termina com operação, linhagem, consumo e ações recomendadas.
                  </p>
                </div>
                <div className="grid gap-2 md:grid-cols-2 xl:grid-cols-3">
                  {JOURNEY_INTERPRETATION_POINTS.map((point) => (
                    <div key={point.label} className="rounded-2xl border border-border bg-bg-subtle/80 px-3 py-2">
                      <div className="text-sm font-semibold text-text">{point.label}</div>
                      <div className="text-sm leading-5 text-text-body">{point.detail}</div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="space-y-4">
              {sectionCards.map(({ phase, content, onMeasureVolume, measureActionLoading }) => (
                <JourneySectionCard
                  content={content}
                  key={phase}
                  measureActionLoading={measureActionLoading}
                  onMeasureVolume={onMeasureVolume}
                  phase={phase}
                  summary={summary}
                />
              ))}
            </div>
          </>
        ) : journeyLoading ? (
          <div className="space-y-4">
            <Skeleton className="h-40 w-full rounded-3xl" />
            <div className="space-y-4">
              <Skeleton className="h-[28rem] w-full rounded-3xl" />
              <Skeleton className="h-[28rem] w-full rounded-3xl" />
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}
