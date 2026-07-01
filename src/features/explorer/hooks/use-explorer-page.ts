import { useEffect, useRef, useState } from "react";
import { useSearchParams } from "@/lib/next-shims";
import { useExplorerCatalogTree } from "@/features/explorer/hooks/use-explorer-catalog-tree";
import { useExplorerDerivedState } from "@/features/explorer/hooks/use-explorer-derived-state";
import { useExplorerDictionaryImport } from "@/features/explorer/hooks/use-explorer-dictionary-import";
import { explorerDebugLog, useExplorerDebugLifecycle } from "@/features/explorer/debug";
import { useExplorerLineage } from "@/features/explorer/hooks/use-explorer-lineage";
import { useExplorerOwnerManagement } from "@/features/explorer/hooks/use-explorer-owner-management";
import { useExplorerTaxonomy } from "@/features/explorer/hooks/use-explorer-taxonomy";
import type { TimelineEvent } from "@/features/timeline/types";
import type { TimelineEpisode } from "@/features/timeline/types";
import type {
  DQLatest,
  DbType,
  GlossaryTermItem,
  MetabaseConsumptionSummary,
  NoticeState,
  TableColumn,
  TableColumnSummary,
  TableDetailInfo,
  TableIngestionDetail,
  TableIngestionExecutionLogs,
  TableIngestionLog,
  TableIngestionSummary,
  TableKind,
  TableCorrelationSummary,
  CanonicalAssetContext,
  TableOperationalContext,
  TableStewardshipRequest,
  TagItem,
  ExplorerSearchResult,
  DetailTab,
  MetabaseSyncRun,
} from "@/features/explorer/types";
import { normalizeDetailTab } from "@/features/explorer/observability";
import { ApiError, apiRequest } from "@/lib/client-api";

type UseExplorerPageOptions = {
  canEdit: boolean;
};

type ExplorerSummaryLoadersModule = typeof import("@/features/explorer/loaders/explorer-summary-loaders");
type ExplorerTabLoadersModule = typeof import("@/features/explorer/loaders/explorer-tab-loaders");

let explorerSummaryLoadersPromise: Promise<ExplorerSummaryLoadersModule> | null = null;
let explorerTabLoadersPromise: Promise<ExplorerTabLoadersModule> | null = null;

function getExplorerSummaryLoaders() {
  if (!explorerSummaryLoadersPromise) {
    explorerSummaryLoadersPromise = import("@/features/explorer/loaders/explorer-summary-loaders");
  }
  return explorerSummaryLoadersPromise;
}

function getExplorerTabLoaders() {
  if (!explorerTabLoadersPromise) {
    explorerTabLoadersPromise = import("@/features/explorer/loaders/explorer-tab-loaders");
  }
  return explorerTabLoadersPromise;
}

export function useExplorerPage({ canEdit }: UseExplorerPageOptions) {
  const searchParams = useSearchParams();
  const [selectedTableId, setSelectedTableId] = useState<number | null>(null);
  const [selectedTableName, setSelectedTableName] = useState<string>("");
  const [selectedTableKind, setSelectedTableKind] = useState<TableKind | null>(null);
  const [selectedDbType, setSelectedDbType] = useState<DbType | null>(null);
  const [selectedDatasourceId, setSelectedDatasourceId] = useState<number | null>(null);
  const [tableInfo, setTableInfo] = useState<TableDetailInfo | null>(null);
  const [columns, setColumns] = useState<TableColumn[]>([]);
  const [columnsLoading, setColumnsLoading] = useState(false);
  const [columnsLoadingMore, setColumnsLoadingMore] = useState(false);
  const [columnsPage, setColumnsPage] = useState(0);
  const [columnsHasMore, setColumnsHasMore] = useState(false);
  const [columnsTotal, setColumnsTotal] = useState(0);
  const [columnsError, setColumnsError] = useState("");
  const [columnSummary, setColumnSummary] = useState<TableColumnSummary | null>(null);
  const [treeCollapsed, setTreeCollapsed] = useState(false);

  const [query, setQuery] = useState("");
  const [governanceMaturity, setGovernanceMaturity] = useState("");
  const [searchResults, setSearchResults] = useState<ExplorerSearchResult[]>([]);
  const [status, setStatus] = useState("");
  const [activeTab, setActiveTab] = useState<DetailTab>("summary");
  const [breadcrumb, setBreadcrumb] = useState<string[]>([]);
  const [notice, setNotice] = useState<NoticeState>(null);
  const [dqLatest, setDqLatest] = useState<DQLatest | null>(null);
  const [dqState, setDqState] = useState<"idle" | "loading" | "ready" | "empty" | "error">("idle");
  const [dqMessage, setDqMessage] = useState("");
  const [lineageGraphLimit, setLineageGraphLimit] = useState<number | null>(200);
  const [timelineEvents, setTimelineEvents] = useState<TimelineEvent[]>([]);
  const [timelineEpisodes, setTimelineEpisodes] = useState<TimelineEpisode[]>([]);
  const [timelineLoading, setTimelineLoading] = useState(false);
  const [timelineError, setTimelineError] = useState("");
  const [metabaseConsumption, setMetabaseConsumption] = useState<MetabaseConsumptionSummary | null>(null);
  const [metabaseConsumptionLoading, setMetabaseConsumptionLoading] = useState(false);
  const [metabaseConsumptionError, setMetabaseConsumptionError] = useState("");
  const [metabaseSyncLoading, setMetabaseSyncLoading] = useState(false);
  const [metabaseSyncError, setMetabaseSyncError] = useState("");
  const [metabaseSyncRun, setMetabaseSyncRun] = useState<MetabaseSyncRun | null>(null);
  const [operationalContext, setOperationalContext] = useState<TableOperationalContext | null>(null);
  const [operationalLoading, setOperationalLoading] = useState(false);
  const [operationalError, setOperationalError] = useState("");
  const [canonicalAsset, setCanonicalAsset] = useState<CanonicalAssetContext | null>(null);
  const [canonicalLoading, setCanonicalLoading] = useState(false);
  const [canonicalError, setCanonicalError] = useState("");
  const [correlationSummary, setCorrelationSummary] = useState<TableCorrelationSummary | null>(null);
  const [correlationLoading, setCorrelationLoading] = useState(false);
  const [correlationError, setCorrelationError] = useState("");
  const [operationalIncidentOpening, setOperationalIncidentOpening] = useState(false);
  const [profilingRerunLoading, setProfilingRerunLoading] = useState(false);
  const [scanReprocessLoading, setScanReprocessLoading] = useState(false);
  const [ingestionSummary, setIngestionSummary] = useState<TableIngestionSummary | null>(null);
  const [ingestionLoading, setIngestionLoading] = useState(false);
  const [ingestionError, setIngestionError] = useState("");
  const [ingestionLogs, setIngestionLogs] = useState<TableIngestionLog[]>([]);
  const [ingestionLogsExecutionId, setIngestionLogsExecutionId] = useState<string | null>(null);
  const [ingestionLogsOpen, setIngestionLogsOpen] = useState(false);
  const [ingestionLogsLoading, setIngestionLogsLoading] = useState(false);
  const [ingestionLogsError, setIngestionLogsError] = useState("");
  const [ingestionExecutions, setIngestionExecutions] = useState<TableIngestionDetail["executions"] | null>(null);
  const [stewardshipRequests, setStewardshipRequests] = useState<TableStewardshipRequest[]>([]);
  const [stewardshipLoading, setStewardshipLoading] = useState(false);
  const [stewardshipError, setStewardshipError] = useState("");
  const selectedTableIdRef = useRef<number | null>(null);
  const dqRequestIdRef = useRef(0);
  const deepLinkHandledRef = useRef(false);
  const summaryLoadedTableIdRef = useRef<number | null>(null);
  const historyLoadedTableIdRef = useRef<number | null>(null);
  const columnsLoadedTableIdRef = useRef<number | null>(null);
  const lineageLoadedTableIdRef = useRef<number | null>(null);
  const highlightedColumnId = Number(searchParams.get("columnId") || "") || null;

  useExplorerDebugLifecycle("useExplorerPage", {
    activeTab,
    selectedTableId,
    columnsLoading,
    columnsPage,
    metabaseConsumptionError: metabaseConsumptionError || null,
    metabaseConsumptionLoading,
    metabaseSyncError: metabaseSyncError || null,
    metabaseSyncLoading,
    timelineError: timelineError || null,
    timelineLoading,
    urlTab: normalizeDetailTab(searchParams.get("tab")) || "summary",
  });

  async function loadOperationalContext(tableId: number) {
    const { fetchOperationalContext } = await getExplorerSummaryLoaders();
    const payload = await fetchOperationalContext(tableId);
    if (selectedTableIdRef.current !== tableId) return;
    setOperationalContext(payload);
  }

  async function loadCorrelationSummary(tableId: number) {
    const { fetchCorrelationSummary } = await getExplorerSummaryLoaders();
    const payload = await fetchCorrelationSummary(tableId);
    if (selectedTableIdRef.current !== tableId) return;
    setCorrelationSummary(payload);
  }

  const { datasources, ensureDatasourceLoaded, ensureSchemaLoaded, loadMoreSchemaTables, toggleDatasource, toggleSchema } =
    useExplorerCatalogTree({
      onError: setStatus,
    });
  const ownerManagement = useExplorerOwnerManagement({
    selectedTableId,
    onNotice: setNotice,
  });
  const lineageManagement = useExplorerLineage({
    selectedTableId,
    onNotice: setNotice,
  });
  const taxonomyManagement = useExplorerTaxonomy({
    activeTab,
    selectedTableId,
    onNotice: setNotice,
  });
  const dictionaryImport = useExplorerDictionaryImport({
    onNotice: setNotice,
    reloadSelectedTableMetadata: async () => {
      if (!selectedTableIdRef.current) return;
      setColumnsLoading(true);
      try {
        await loadTableMetadata(selectedTableIdRef.current);
        if (activeTab === "columns") {
          await loadColumnsPage(selectedTableIdRef.current, 1, false);
        }
      } finally {
        setColumnsLoading(false);
      }
    },
  });

  useEffect(() => {
    selectedTableIdRef.current = selectedTableId;
  }, [selectedTableId]);

  useEffect(() => {
    explorerDebugLog("useExplorerPage", "deep_link_probe", {
      deepLinkHandled: deepLinkHandledRef.current,
      datasourcesLength: datasources.length,
      tableIdParam: searchParams.get("tableId"),
      datasourceIdParam: searchParams.get("datasourceId"),
      schemaIdParam: searchParams.get("schemaId"),
    });
    if (deepLinkHandledRef.current || datasources.length === 0) return;
    const tableIdParam = searchParams.get("tableId");
    const datasourceIdParam = searchParams.get("datasourceId");
    const schemaIdParam = searchParams.get("schemaId");
    if (!tableIdParam) {
      explorerDebugLog("useExplorerPage", "deep_link_skip", {
        reason: "missing_table_id",
      });
      if (!datasourceIdParam) {
        deepLinkHandledRef.current = true;
        return;
      }
      const datasourceId = Number(datasourceIdParam);
      const schemaId = Number(schemaIdParam || "");
      if (!Number.isFinite(datasourceId)) {
        explorerDebugLog("useExplorerPage", "deep_link_skip", {
          reason: "invalid_datasource_id",
          datasourceIdParam,
        });
        deepLinkHandledRef.current = true;
        return;
      }
      deepLinkHandledRef.current = true;
      void (async () => {
        try {
          await ensureDatasourceLoaded(datasourceId);
          if (Number.isFinite(schemaId)) {
            await ensureSchemaLoaded(datasourceId, schemaId);
          }
        } catch (error) {
          setNotice({ tone: "error", message: (error as Error).message });
        }
      })();
      return;
    }
    const tableId = Number(tableIdParam);
    if (!Number.isFinite(tableId)) {
      explorerDebugLog("useExplorerPage", "deep_link_skip", {
        reason: "invalid_table_id",
        tableIdParam,
      });
      deepLinkHandledRef.current = true;
      return;
    }
    deepLinkHandledRef.current = true;
    explorerDebugLog("useExplorerPage", "deep_link_resolve_start", {
      tableId,
    });
    void (async () => {
      try {
        const { fetchTableLocator } = await getExplorerTabLoaders();
        const locator = await fetchTableLocator(tableId);
        explorerDebugLog("useExplorerPage", "deep_link_locator", locator);
        await ensureDatasourceLoaded(locator.datasource_id);
        await ensureSchemaLoaded(locator.datasource_id, locator.schema_id);
        explorerDebugLog("useExplorerPage", "deep_link_select_table", {
          tableId: locator.table_id,
          tab: normalizeDetailTab(searchParams.get("tab")) || "summary",
          datasourceId: locator.datasource_id,
          schemaId: locator.schema_id,
        });
        await selectTable(
          locator.table_id,
          locator.table_name,
          [locator.datasource_name, locator.database_name, locator.schema_name, locator.table_name],
          locator.kind,
          locator.db_type,
          locator.datasource_id,
          normalizeDetailTab(searchParams.get("tab")) || "summary",
        );
      } catch (error) {
        explorerDebugLog("useExplorerPage", "deep_link_error", {
          error: error instanceof Error ? error.message : "unknown_error",
        });
        setNotice({ tone: "error", message: (error as Error).message });
      }
    })();
  }, [datasources.length, searchParams, ensureDatasourceLoaded, ensureSchemaLoaded]);

  useEffect(() => {
    if (!query.trim()) {
      setSearchResults([]);
      return;
    }
    const timer = window.setTimeout(() => {
      void (async () => {
        try {
          const params = new URLSearchParams({ q: query, limit: "30" });
          if (governanceMaturity.trim()) params.set("governance_maturity", governanceMaturity.trim());
          const results = await apiRequest<ExplorerSearchResult[]>(
            `/v1/catalog/tree/search?${params.toString()}`,
          );
          setSearchResults(results);
        } catch {
          setSearchResults([]);
        }
      })();
    }, 200);
    return () => window.clearTimeout(timer);
  }, [query, governanceMaturity]);

  useEffect(() => {
    if (selectedTableId === null) {
      setTableInfo(null);
      ownerManagement.resetOwnerState();
      taxonomyManagement.resetTaxonomyState();
      lineageManagement.resetLineageState();
      setDqLatest(null);
      setDqState("idle");
      setDqMessage("");
      setSelectedDatasourceId(null);
      setLineageGraphLimit(200);
      setColumnSummary(null);
      setTimelineEpisodes([]);
      setColumnsTotal(0);
      setColumnsPage(0);
      setColumnsHasMore(false);
      setColumnsLoadingMore(false);
      setTimelineEvents([]);
      setTimelineError("");
      setMetabaseConsumption(null);
      setMetabaseConsumptionLoading(false);
      setMetabaseConsumptionError("");
      setMetabaseSyncRun(null);
      setMetabaseSyncLoading(false);
      setMetabaseSyncError("");
      setOperationalContext(null);
      setOperationalError("");
      setOperationalLoading(false);
      setCanonicalAsset(null);
      setCanonicalLoading(false);
      setCanonicalError("");
      setCorrelationSummary(null);
      setCorrelationError("");
      setIngestionSummary(null);
      setIngestionExecutions(null);
      setIngestionError("");
      setIngestionLogs([]);
      setIngestionLogsExecutionId(null);
      setIngestionLogsOpen(false);
      setIngestionLogsError("");
      setStewardshipRequests([]);
      setStewardshipError("");
      summaryLoadedTableIdRef.current = null;
      historyLoadedTableIdRef.current = null;
      columnsLoadedTableIdRef.current = null;
      lineageLoadedTableIdRef.current = null;
      return;
    }

    const tableId = selectedTableId;
    let cancelled = false;
    void (async () => {
      try {
        taxonomyManagement.setTagsLoading(true);
        taxonomyManagement.setTermsLoading(true);
        const [tags, terms] = await Promise.all([
          apiRequest<TagItem[]>(`/v1/catalog/tables/${tableId}/tags`),
          apiRequest<GlossaryTermItem[]>(`/v1/catalog/tables/${tableId}/glossary-terms`),
        ]);
        if (cancelled || selectedTableIdRef.current !== tableId) return;
        taxonomyManagement.applyLoadedTaxonomy(tags, terms);
        setNotice(null);
      } catch (error) {
        if (cancelled || selectedTableIdRef.current !== tableId) return;
        setNotice({ tone: "error", message: (error as Error).message });
      } finally {
        if (cancelled || selectedTableIdRef.current !== tableId) return;
        taxonomyManagement.setTagsLoading(false);
        taxonomyManagement.setTermsLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [selectedTableId]);

  useEffect(() => {
    if (selectedTableId === null || activeTab !== "lineage") return;
    if (lineageLoadedTableIdRef.current === selectedTableId) return;
    const tableId = selectedTableId;
    let cancelled = false;
    lineageManagement.setLineageLoading(true);
    void (async () => {
      try {
        const { fetchLineageSummary } = await getExplorerSummaryLoaders();
        const { lineage, lineageSummary } = await fetchLineageSummary(tableId, lineageGraphLimit);
        if (cancelled || selectedTableIdRef.current !== tableId) return;
        lineageManagement.applyLoadedLineage(lineage, lineageSummary);
        lineageLoadedTableIdRef.current = tableId;
      } catch (error) {
        if (cancelled || selectedTableIdRef.current !== tableId) return;
        setNotice({ tone: "error", message: (error as Error).message });
      } finally {
        if (cancelled || selectedTableIdRef.current !== tableId) return;
        lineageManagement.setLineageLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [activeTab, lineageGraphLimit, selectedTableId]);

  useEffect(() => {
    if (selectedTableId === null || activeTab !== "columns") return;
    if (columnsLoadedTableIdRef.current === selectedTableId) return;
    if (columnsPage > 0 || columnsLoading) return;
    const tableId = selectedTableId;
    let cancelled = false;
    void (async () => {
      try {
        await loadColumnsForCurrentTable(tableId);
        columnsLoadedTableIdRef.current = tableId;
      } catch (error) {
        if (!cancelled) {
          setNotice({ tone: "error", message: (error as Error).message });
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [activeTab, columnsPage, columnsLoading, selectedTableId]);

  useEffect(() => {
    if (selectedTableId === null) return;
    if (activeTab !== "summary" && activeTab !== "observability") return;
    if (summaryLoadedTableIdRef.current === selectedTableId) return;
    const tableId = selectedTableId;
    let cancelled = false;
    setStewardshipLoading(true);
    setStewardshipError("");
    setIngestionLoading(true);
    setIngestionError("");
    setCorrelationLoading(true);
    setCorrelationError("");
    setOperationalLoading(true);
    setOperationalError("");
    setCanonicalLoading(true);
    setCanonicalError("");
    setDqState("loading");
    setDqMessage("");
    void (async () => {
      try {
        const loaders = await getExplorerSummaryLoaders();
        const [operationalResult, canonicalResult, correlationResult, stewardshipResult, ingestionResult, dqResult] =
          await Promise.allSettled([
            loaders.fetchOperationalContext(tableId),
            loaders.fetchCanonicalAsset(tableId),
            loaders.fetchCorrelationSummary(tableId),
            loaders.fetchStewardshipRequests(tableId),
            loaders.fetchIngestionDetail(tableId),
            loaders.fetchDQLatest(tableId),
          ]);
        if (cancelled || selectedTableIdRef.current !== tableId) return;
        if (operationalResult.status === "fulfilled") {
          setOperationalContext(operationalResult.value);
          setOperationalError("");
        } else {
          setOperationalContext(null);
          setOperationalError(
            operationalResult.reason instanceof Error
              ? operationalResult.reason.message
              : "Não foi possível carregar o contexto operacional.",
          );
        }
        if (canonicalResult.status === "fulfilled") {
          setCanonicalAsset(canonicalResult.value);
          setCanonicalError("");
        } else {
          setCanonicalAsset(null);
          setCanonicalError(
            canonicalResult.reason instanceof Error
              ? canonicalResult.reason.message
              : "Não foi possível carregar o contexto canônico.",
          );
        }
        if (correlationResult.status === "fulfilled") {
          setCorrelationSummary(correlationResult.value);
          setCorrelationError("");
        } else {
          setCorrelationSummary(null);
          setCorrelationError(
            correlationResult.reason instanceof Error ? correlationResult.reason.message : "Não foi possível carregar a correlação do ativo.",
          );
        }
        if (stewardshipResult.status === "fulfilled") {
          setStewardshipRequests(stewardshipResult.value);
          setStewardshipError("");
        } else {
          setStewardshipRequests([]);
          setStewardshipError(
            stewardshipResult.reason instanceof Error
              ? stewardshipResult.reason.message
              : "Não foi possível carregar o histórico de stewardship.",
          );
        }
        if (ingestionResult.status === "fulfilled") {
          setIngestionSummary(ingestionResult.value.summary);
          setIngestionExecutions(ingestionResult.value.executions);
          setIngestionError("");
        } else {
          setIngestionSummary(null);
          setIngestionExecutions(null);
          setIngestionError(
            ingestionResult.reason instanceof Error
              ? ingestionResult.reason.message
              : "Não foi possível carregar a ingestão operacional.",
          );
        }
        if (dqResult.status === "fulfilled") {
          setDqLatest(dqResult.value);
          setDqState("ready");
        } else if (
          dqResult.reason instanceof ApiError &&
          dqResult.reason.status === 404 &&
          dqResult.reason.message === "No DQ metrics for table"
        ) {
          setDqLatest(null);
          setDqState("empty");
        } else {
          setDqLatest(null);
          setDqState("error");
          setDqMessage(dqResult.reason instanceof Error ? dqResult.reason.message : "Não foi possível carregar o DQ.");
        }
        summaryLoadedTableIdRef.current = tableId;
      } finally {
        if (!cancelled && selectedTableIdRef.current === tableId) {
          setStewardshipLoading(false);
          setIngestionLoading(false);
          setCorrelationLoading(false);
          setOperationalLoading(false);
          setCanonicalLoading(false);
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [activeTab, selectedTableId]);

  async function loadTimeline(tableId: number) {
    explorerDebugLog("useExplorerPage", "timeline_fetch_start", {
      tableId,
      activeTab,
    });
    setTimelineLoading(true);
    setTimelineError("");
    try {
      const { fetchTimeline } = await getExplorerTabLoaders();
      const payload = await fetchTimeline(tableId);
      if (selectedTableIdRef.current !== tableId) return;
      setTimelineEvents(payload.items || []);
      setTimelineEpisodes(payload.episodes || []);
      explorerDebugLog("useExplorerPage", "timeline_fetch_success", {
        tableId,
        episodes: payload.episodes?.length || 0,
        events: payload.items?.length || 0,
      });
    } catch (error) {
      if (selectedTableIdRef.current !== tableId) return;
      setTimelineEvents([]);
      setTimelineEpisodes([]);
      setTimelineError(error instanceof Error ? error.message : "Não foi possível carregar a timeline deste ativo.");
      explorerDebugLog("useExplorerPage", "timeline_fetch_error", {
        tableId,
        error: error instanceof Error ? error.message : "unknown_error",
      });
    } finally {
      if (selectedTableIdRef.current === tableId) setTimelineLoading(false);
    }
  }

  async function loadMetabaseConsumption(tableId: number) {
    explorerDebugLog("useExplorerPage", "metabase_consumption_fetch_start", {
      tableId,
      activeTab,
      hasCachedPayload: Boolean(metabaseConsumption),
      loading: metabaseConsumptionLoading,
      error: metabaseConsumptionError || null,
    });
    setMetabaseConsumptionLoading(true);
    setMetabaseConsumptionError("");
    try {
      const { fetchMetabaseConsumption } = await getExplorerTabLoaders();
      const payload = await fetchMetabaseConsumption(tableId);
      if (selectedTableIdRef.current !== tableId) return;
      setMetabaseConsumption(payload);
      explorerDebugLog("useExplorerPage", "metabase_consumption_fetch_success", {
        tableId,
        available: payload.available,
        enabled: payload.enabled,
        dashboards: payload.dashboards_count,
        questions: payload.questions_count,
        collections: payload.collections_count,
      });
    } catch (error) {
      if (selectedTableIdRef.current !== tableId) return;
      setMetabaseConsumption(null);
      setMetabaseConsumptionError(error instanceof Error ? error.message : "Não foi possível carregar o consumo analítico deste ativo.");
      explorerDebugLog("useExplorerPage", "metabase_consumption_fetch_error", {
        tableId,
        error: error instanceof Error ? error.message : "unknown_error",
      });
    } finally {
      if (selectedTableIdRef.current === tableId) {
        setMetabaseConsumptionLoading(false);
      }
    }
  }

  useEffect(() => {
    if (selectedTableId === null || activeTab !== "history") return;
    if (historyLoadedTableIdRef.current === selectedTableId) return;
    const tableId = selectedTableId;
    let cancelled = false;
    void (async () => {
      try {
        await loadTimeline(tableId);
        historyLoadedTableIdRef.current = tableId;
      } finally {
        if (cancelled || selectedTableIdRef.current !== tableId) return;
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [activeTab, selectedTableId]);

  useEffect(() => {
    if (selectedTableId === null || activeTab !== "consumption") return;
    if (metabaseConsumption || metabaseConsumptionLoading || metabaseConsumptionError) return;
    void loadMetabaseConsumption(selectedTableId);
  }, [activeTab, metabaseConsumption, metabaseConsumptionError, metabaseConsumptionLoading, selectedTableId]);

  async function loadTableMetadata(tableId: number) {
    const { fetchTableMetadata } = await getExplorerSummaryLoaders();
    const { summary, tableInfo: nextTableInfo } = await fetchTableMetadata(tableId);
    if (selectedTableIdRef.current !== tableId) return;
    setTableInfo(nextTableInfo);
    setColumnSummary(summary);
    setColumnsTotal(summary.total);
    setColumns([]);
    setColumnsPage(0);
    setColumnsHasMore(false);
    setColumnsError("");
    ownerManagement.applyTableInfo(nextTableInfo);
  }

  async function loadColumnsPage(tableId: number, page: number, append: boolean) {
    const { fetchColumnsPage } = await getExplorerTabLoaders();
    const response = await fetchColumnsPage(tableId, page);
    if (selectedTableIdRef.current !== tableId) return;
    setColumns((prev) => (append ? [...prev, ...response.items] : response.items));
    setColumnsPage(response.page);
    setColumnsHasMore(response.has_more);
    setColumnsTotal(response.total);
  }

  async function loadColumnsForCurrentTable(tableId: number) {
    if (columnsPage > 0 || columnsLoading) return;
    setColumnsLoading(true);
    setColumnsError("");
    try {
      await loadColumnsPage(tableId, 1, false);
    } catch (error) {
      if (selectedTableIdRef.current !== tableId) return;
      setColumnsError(error instanceof Error ? error.message : "Não foi possível carregar as colunas da tabela.");
      throw error;
    } finally {
      if (selectedTableIdRef.current === tableId) {
        setColumnsLoading(false);
      }
    }
  }

  async function loadMoreColumns() {
    if (!selectedTableIdRef.current || columnsLoadingMore || !columnsHasMore) return;
    const tableId = selectedTableIdRef.current;
    setColumnsLoadingMore(true);
    try {
      await loadColumnsPage(tableId, columnsPage + 1, true);
    } finally {
      if (selectedTableIdRef.current === tableId) {
        setColumnsLoadingMore(false);
      }
    }
  }

  async function activateDetailTab(tab: DetailTab) {
    explorerDebugLog("useExplorerPage", "activate_detail_tab", {
      tab,
      activeTab,
      selectedTableId: selectedTableIdRef.current,
      columnsLoading,
      columnsPage,
      metabaseConsumptionLoading,
      metabaseConsumptionError: metabaseConsumptionError || null,
    });
    setActiveTab(tab);
  }

  async function reloadMetabaseConsumption() {
    if (!selectedTableIdRef.current) return;
    explorerDebugLog("useExplorerPage", "metabase_consumption_reload", {
      tableId: selectedTableIdRef.current,
      activeTab,
    });
    await loadMetabaseConsumption(selectedTableIdRef.current);
  }

  async function syncMetabaseConsumption() {
    if (!selectedTableIdRef.current) return;
    const tableId = selectedTableIdRef.current;
    const instanceId = metabaseConsumption?.instance_id;
    if (!instanceId) {
      setMetabaseSyncError("Nenhuma instância do Metabase configurada para sincronizar.");
      return;
    }
    explorerDebugLog("useExplorerPage", "metabase_consumption_sync_start", {
      tableId,
      instanceId,
      activeTab,
    });
    setMetabaseSyncLoading(true);
    setMetabaseSyncError("");
    try {
      const run = await apiRequest<MetabaseSyncRun>(`/v1/metabase/instances/${instanceId}/sync`, { method: "POST" });
      if (selectedTableIdRef.current !== tableId) return;
      setMetabaseSyncRun(run);
      explorerDebugLog("useExplorerPage", "metabase_consumption_sync_success", {
        tableId,
        instanceId,
        status: run.status,
        dashboards: run.dashboards_count,
        questions: run.questions_count,
        collections: run.collections_count,
        links: run.links_count,
      });
      await loadMetabaseConsumption(tableId);
      setNotice({
        tone: "success",
        message:
          run.status === "queued" || run.status === "running"
            ? "Sincronização do Metabase iniciada. O histórico será atualizado conforme a execução avançar."
            : `Sincronização do Metabase concluída: ${run.dashboards_count} dashboard(s), ${run.questions_count} question(s) e ${run.collections_count} collection(s).`,
      });
    } catch (error) {
      if (selectedTableIdRef.current !== tableId) return;
      const message = error instanceof Error ? error.message : "Não foi possível sincronizar o Metabase.";
      setMetabaseSyncError(message);
      setNotice({ tone: "error", message });
      explorerDebugLog("useExplorerPage", "metabase_consumption_sync_error", {
        tableId,
        instanceId,
        error: message,
      });
    } finally {
      if (selectedTableIdRef.current === tableId) {
        setMetabaseSyncLoading(false);
      }
    }
  }

  async function reloadSelectedTableMetadata() {
    if (!selectedTableIdRef.current) return;
    const tableId = selectedTableIdRef.current;
    setColumnsLoading(true);
    setColumnsError("");
    setOperationalLoading(true);
    setOperationalError("");
    setCanonicalLoading(true);
    setCanonicalError("");
    try {
      await loadTableMetadata(tableId);
      if (activeTab === "summary" || activeTab === "observability") {
        setStewardshipLoading(true);
        setStewardshipError("");
        setIngestionLoading(true);
        setIngestionError("");
        setCorrelationLoading(true);
        setCorrelationError("");
        setDqState("loading");
        setDqMessage("");
        const loaders = await getExplorerSummaryLoaders();
        const [operationalResult, canonicalResult, correlationResult, stewardshipResult, ingestionResult, dqResult] =
          await Promise.allSettled([
            loaders.fetchOperationalContext(tableId),
            loaders.fetchCanonicalAsset(tableId),
            loaders.fetchCorrelationSummary(tableId),
            loaders.fetchStewardshipRequests(tableId),
            loaders.fetchIngestionDetail(tableId),
            loaders.fetchDQLatest(tableId),
          ]);
        if (operationalResult.status === "fulfilled") {
          setOperationalContext(operationalResult.value);
          setOperationalError("");
        } else {
          setOperationalContext(null);
          setOperationalError(
            operationalResult.reason instanceof Error
              ? operationalResult.reason.message
              : "Não foi possível carregar o contexto operacional.",
          );
        }
        if (canonicalResult.status === "fulfilled") {
          setCanonicalAsset(canonicalResult.value);
          setCanonicalError("");
        } else {
          setCanonicalAsset(null);
          setCanonicalError(
            canonicalResult.reason instanceof Error
              ? canonicalResult.reason.message
              : "Não foi possível carregar o contexto canônico.",
          );
        }
        if (correlationResult.status === "fulfilled") {
          setCorrelationSummary(correlationResult.value);
          setCorrelationError("");
        } else {
          setCorrelationSummary(null);
          setCorrelationError(
            correlationResult.reason instanceof Error ? correlationResult.reason.message : "Não foi possível carregar a correlação do ativo.",
          );
        }
        if (stewardshipResult.status === "fulfilled") {
          setStewardshipRequests(stewardshipResult.value);
          setStewardshipError("");
        } else {
          setStewardshipRequests([]);
          setStewardshipError(
            stewardshipResult.reason instanceof Error
              ? stewardshipResult.reason.message
              : "Não foi possível carregar o histórico de stewardship.",
          );
        }
        if (ingestionResult.status === "fulfilled") {
          setIngestionSummary(ingestionResult.value.summary);
          setIngestionExecutions(ingestionResult.value.executions);
          setIngestionError("");
        } else {
          setIngestionSummary(null);
          setIngestionExecutions(null);
          setIngestionError(
            ingestionResult.reason instanceof Error
              ? ingestionResult.reason.message
              : "Não foi possível carregar a ingestão operacional.",
          );
        }
        if (dqResult.status === "fulfilled") {
          setDqLatest(dqResult.value);
          setDqState("ready");
        } else if (
          dqResult.reason instanceof ApiError &&
          dqResult.reason.status === 404 &&
          dqResult.reason.message === "No DQ metrics for table"
        ) {
          setDqLatest(null);
          setDqState("empty");
        } else {
          setDqLatest(null);
          setDqState("error");
          setDqMessage(dqResult.reason instanceof Error ? dqResult.reason.message : "Não foi possível carregar o DQ.");
        }
        summaryLoadedTableIdRef.current = tableId;
        setStewardshipLoading(false);
        setIngestionLoading(false);
        setCorrelationLoading(false);
        setOperationalLoading(false);
        setCanonicalLoading(false);
      }
      if (activeTab === "columns") {
        await loadColumnsPage(tableId, 1, false);
      }
      if (activeTab === "consumption") {
        await loadMetabaseConsumption(tableId);
      }
      if (activeTab === "history") {
        await loadTimeline(tableId);
      }
      setNotice({ tone: "success", message: "Revisão confirmada com sucesso." });
    } catch (error) {
      setNotice({ tone: "error", message: (error as Error).message });
    } finally {
      if (selectedTableIdRef.current === tableId) {
        setColumnsLoading(false);
        setOperationalLoading(false);
        setCanonicalLoading(false);
      }
    }
  }

  async function confirmGovernanceReview(reviewType: "owner" | "privacy") {
    if (!selectedTableIdRef.current) return;
    const tableId = selectedTableIdRef.current;
    try {
      await apiRequest(`/v1/governance/tables/${tableId}/${reviewType}-review`, {
        method: "POST",
      });
      await reloadSelectedTableMetadata();
    } catch (error) {
      setNotice({ tone: "error", message: (error as Error).message });
    }
  }

  async function openIngestionLogs(executionId: string) {
    setIngestionLogsOpen(true);
    setIngestionLogsExecutionId(executionId);
    setIngestionLogsLoading(true);
    setIngestionLogsError("");
    try {
      const payload = await apiRequest<TableIngestionExecutionLogs>(
        `/v1/ingestion/logs?execucao_id=${encodeURIComponent(executionId)}&page=1&page_size=500`,
      );
      setIngestionLogs(payload.items || []);
    } catch (error) {
      setIngestionLogs([]);
      setIngestionLogsError(error instanceof Error ? error.message : "Não foi possível carregar os logs da execução.");
    } finally {
      setIngestionLogsLoading(false);
    }
  }

  async function openOperationalIncident(mode: "manual" | "auto_if_missing" = "manual") {
    if (!selectedTableIdRef.current) return;
    const tableId = selectedTableIdRef.current;
    setOperationalIncidentOpening(true);
    try {
      await apiRequest(`/v1/platform/actions/tables/${tableId}/incidents/open?mode=${mode}`, { method: "POST" });
      setNotice({
        tone: "success",
        message:
          mode === "auto_if_missing"
            ? "Incidente operacional aberto automaticamente a partir da correlação do ativo."
            : "Incidente operacional aberto com sucesso.",
      });
      try {
        await Promise.all([loadOperationalContext(tableId), loadCorrelationSummary(tableId)]);
      } catch {
        // Preserve the optimistic feedback even if secondary refresh fails.
      }
    } finally {
      setOperationalIncidentOpening(false);
    }
  }

  async function rerunSelectedTableProfiling() {
    if (!selectedTableIdRef.current) return;
    const tableId = selectedTableIdRef.current;
    setProfilingRerunLoading(true);
    try {
      const result = await apiRequest<{ ok: boolean; message: string; target_id: number | null }>(
        `/v1/platform/actions/tables/${tableId}/profiling/rerun`,
        { method: "POST" },
      );
      setNotice({ tone: "success", message: result.message || "Profiling reenfileirado com sucesso." });
      try {
        const loaders = await getExplorerSummaryLoaders();
        const [dqResult] = await Promise.allSettled([
          loaders.fetchDQLatest(tableId),
          loadCorrelationSummary(tableId),
        ]);
        if (dqResult.status === "fulfilled") {
          setDqLatest(dqResult.value);
          setDqState("ready");
          setDqMessage("");
        }
      } catch {
        // The action feedback is enough; secondary refresh is best effort.
      }
    } catch (error) {
      setNotice({ tone: "error", message: error instanceof Error ? error.message : "Não foi possível reexecutar o profiling." });
    } finally {
      setProfilingRerunLoading(false);
    }
  }

  async function reprocessSelectedDatasourceScan() {
    const datasourceId = selectedDatasourceId ?? operationalContext?.datasource_id ?? null;
    if (!datasourceId) return;
    setScanReprocessLoading(true);
    try {
      const result = await apiRequest<{ ok: boolean; message: string; target_id: number | null }>(
        `/v1/platform/actions/datasources/${datasourceId}/scan/reprocess`,
        { method: "POST" },
      );
      setNotice({ tone: "success", message: result.message || "Scan da fonte reenfileirado com sucesso." });
    } catch (error) {
      setNotice({ tone: "error", message: error instanceof Error ? error.message : "Não foi possível reprocessar o scan da fonte." });
    } finally {
      setScanReprocessLoading(false);
    }
  }

  function loadFullLineageGraph() {
    if (lineageGraphLimit === null) return;
    lineageLoadedTableIdRef.current = null;
    setLineageGraphLimit(null);
  }

  async function selectTable(
    tableId: number,
    tableName: string,
    path: string[],
    kind?: TableKind,
    dbType?: DbType,
    datasourceId?: number,
    tab: DetailTab = "summary",
  ) {
    explorerDebugLog("useExplorerPage", "select_table", {
      tableId,
      tab,
      datasourceId: datasourceId ?? null,
      kind: kind ?? null,
      dbType: dbType ?? null,
    });
    setSelectedTableId(tableId);
    setSelectedTableName(tableName);
    setSelectedTableKind(kind ?? null);
    setSelectedDbType(dbType ?? null);
    setSelectedDatasourceId(datasourceId ?? null);
    setLineageGraphLimit(200);
    setActiveTab(tab);
    setBreadcrumb(path);
    setMetabaseConsumption(null);
    setMetabaseConsumptionError("");
    setMetabaseConsumptionLoading(false);
    setMetabaseSyncRun(null);
    setMetabaseSyncLoading(false);
    setMetabaseSyncError("");
    ownerManagement.resetOwnerState();
    lineageManagement.resetLineageState();
    if (typeof window !== "undefined" && window.matchMedia("(min-width: 1280px)").matches) {
      setTreeCollapsed(true);
    }
    setColumnsLoading(true);
    setColumnsError("");
    try {
      await loadTableMetadata(tableId);
      setNotice(null);
    } catch (error) {
      if (selectedTableIdRef.current === tableId) {
        setColumns([]);
        setColumnsError(error instanceof Error ? error.message : "Não foi possível carregar as colunas da tabela.");
        setNotice({ tone: "error", message: (error as Error).message });
      }
    } finally {
      if (selectedTableIdRef.current === tableId) {
        setColumnsLoading(false);
      }
    }
  }

  async function openSearchResult(result: ExplorerSearchResult): Promise<void> {
    setStatus("");
    try {
      await ensureDatasourceLoaded(result.datasource_id);
      if (result.schema_id !== null) {
        await ensureSchemaLoaded(result.datasource_id, result.schema_id);
      }
      if (result.table_id !== null) {
        const ds = datasources.find((d) => d.id === result.datasource_id);
        const schema = ds?.schemas?.find((s) => s.id === result.schema_id) || null;
        const path = [
          ds?.name || "datasource",
          ds?.database_name || "database",
          schema?.name || "schema",
          result.name,
        ];
        await selectTable(result.table_id, result.name, path, undefined, ds?.db_type, result.datasource_id);
      }
    } catch (error) {
      setStatus((error as Error).message);
    }
  }

  const {
    columnCounts,
    dictionaryCoveragePct,
    extraTags,
    extraTerms,
    filteredTree,
    flowEdges,
    flowNodes,
    glossaryCoveragePct,
    hasLineageProcess,
    hasSavedLineage,
    hasUnsavedChanges,
    headerTags,
    headerTerms,
    selectedDatabaseName,
    selectedSchemaName,
    selectedTableFullName,
    summaryColumnsPreview,
    summaryStats,
    tableDescription,
  } = useExplorerDerivedState({
    breadcrumb,
    columns,
    columnSummary,
    datasources,
    dqLatest,
    dqState,
    query,
    selectedDbType,
    selectedTableName,
    tableInfo,
    taxonomyManagement,
    lineageManagement,
  });

  return {
    activeTab,
    timelineError,
    timelineEvents,
    timelineEpisodes,
    timelineLoading,
    breadcrumb,
    canEdit,
    columns,
    columnsLoading,
    columnsHasMore,
    columnsLoadingMore,
    columnsTotal,
    columnsError,
    columnSummary,
    columnCounts,
    datasources,
    dictionaryCoveragePct,
    dictionaryImport,
    dqLatest,
    dqMessage,
    dqState,
    extraTags,
    extraTerms,
    filteredTree,
    flowEdges,
    flowNodes,
    glossaryCoveragePct,
    highlightedColumnId,
    hasLineageProcess,
    hasSavedLineage,
    hasUnsavedChanges,
    headerTags,
    headerTerms,
    ingestionError,
    ingestionExecutions,
    ingestionLoading,
    ingestionLogs,
    ingestionLogsError,
    ingestionLogsExecutionId,
    ingestionLogsLoading,
    ingestionLogsOpen,
    ingestionSummary,
    lineageManagement,
    notice,
    openSearchResult,
    operationalContext,
    operationalIncidentOpening,
    correlationSummary,
    correlationLoading,
    correlationError,
    canonicalAsset,
    canonicalLoading,
    canonicalError,
    metabaseConsumption,
    metabaseConsumptionError,
    metabaseConsumptionLoading,
    metabaseSyncError,
    metabaseSyncLoading,
    metabaseSyncRun,
    operationalError,
    operationalLoading,
    openIngestionLogs,
    openOperationalIncident,
    profilingRerunLoading,
    rerunSelectedTableProfiling,
    scanReprocessLoading,
    reprocessSelectedDatasourceScan,
    ownerManagement,
    query,
    governanceMaturity,
    searchResults,
    selectedDatabaseName,
    selectedDbType,
    selectedSchemaName,
    selectedTableFullName,
    selectedTableId,
    selectedTableKind,
    selectedTableName,
    reloadSelectedTableMetadata,
    reloadMetabaseConsumption,
    syncMetabaseConsumption,
    reloadTimeline: () => {
      if (selectedTableIdRef.current === null) return;
      void loadTimeline(selectedTableIdRef.current);
    },
    setActiveTab,
    activateDetailTab,
    setNotice,
    setQuery,
    setGovernanceMaturity,
    setTreeCollapsed,
    setIngestionLogsOpen,
    status,
    loadMoreColumns,
    loadMoreSchemaTables,
    loadFullLineageGraph,
    summaryColumnsPreview,
    summaryStats,
    stewardshipRequests,
    stewardshipLoading,
    stewardshipError,
    tableDescription,
    tableInfo,
    taxonomyManagement,
    toggleDatasource,
    toggleSchema,
    treeCollapsed,
    selectTable,
    confirmGovernanceReview,
  };
}
