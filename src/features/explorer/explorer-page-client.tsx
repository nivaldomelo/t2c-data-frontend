import { useEffect, useRef, useState, type Dispatch, type SetStateAction } from "react";
import { dynamic } from "@/lib/next-shims";
import { usePathname, useRouter, useSearchParams } from "@/lib/next-shims";
import { useTranslation } from "react-i18next";
import type { Edge, Node } from "reactflow";
import {
  Download,
  FileSpreadsheet,
  Upload,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import type { LineageFlowNodeData } from "@/components/lineage/lineage-flow-canvas";
import { EmptyState } from "@/components/ui/empty-state";
import { ChunkLoadBoundary } from "@/components/chunk-load-boundary";
import { AssetExplorerShell } from "@/features/asset-explorer-shell";
import { ExplorerSearchPanel } from "@/features/explorer/components/search-panel";
import {
  resolveExplorerDetailTabLayout,
  resolveExplorerSummaryConsumptionLayout,
} from "@/features/explorer/detail-tab-layout.js";
import { useExplorerPage } from "@/features/explorer/hooks/use-explorer-page";
import { DETAIL_TABS, detailTabLabel, normalizeDetailTab } from "@/features/explorer/observability";
import { explorerDebugEnabled, explorerDebugLog, useExplorerDebugLayout, useExplorerDebugLifecycle } from "@/features/explorer/debug";
import type { DetailTab } from "@/features/explorer/types";
import { trackPlatformEvent } from "@/features/platform/client";
import type { SearchFavoritePayload, SearchFavoriteStatusResponse } from "@/features/search/types";
import { apiRequest } from "@/lib/client-api";
import { cn } from "@/lib/cn";
import { useAuth } from "@/lib/auth";

const ExplorerColumnsTabContent = dynamic(
  () => import("@/features/explorer/components/columns-tab-content").then((mod) => mod.ExplorerColumnsTabContent),
  {
    loading: () => <div className="h-72 animate-pulse rounded-3xl bg-bg-subtle" />,
    ssr: false,
  },
);
const ExplorerFullHeader = dynamic(
  () => import("@/features/explorer/components/detail-headers").then((mod) => mod.ExplorerFullHeader),
  { ssr: false },
);
const ExplorerMinimalHeader = dynamic(
  () => import("@/features/explorer/components/detail-headers").then((mod) => mod.ExplorerMinimalHeader),
  { ssr: false },
);
const ExplorerDictionaryImportDialog = dynamic(
  () => import("@/features/explorer/components/dictionary-import-dialog").then((mod) => mod.ExplorerDictionaryImportDialog),
  { ssr: false },
);
const ExplorerGlossaryTabContent = dynamic(
  () => import("@/features/explorer/components/glossary-tab-content").then((mod) => mod.ExplorerGlossaryTabContent),
  {
    loading: () => <div className="h-72 animate-pulse rounded-3xl bg-bg-subtle" />,
    ssr: false,
  },
);
const ExplorerHistoryTabContent = dynamic(
  () => import("@/features/explorer/components/history-tab-content").then((mod) => mod.ExplorerHistoryTabContent),
  {
    loading: () => <div className="h-72 animate-pulse rounded-3xl bg-bg-subtle" />,
    ssr: false,
  },
);
const ExplorerIngestionLogsDialog = dynamic(
  () => import("@/features/explorer/components/ingestion-logs-dialog").then((mod) => mod.ExplorerIngestionLogsDialog),
  { ssr: false },
);
const ExplorerLineageEditorDrawer = dynamic(
  () => import("@/features/explorer/components/lineage-editor-drawer").then((mod) => mod.ExplorerLineageEditorDrawer),
  { ssr: false },
);
const ExplorerLineageTabContent = dynamic(
  () => import("@/features/explorer/components/lineage-tab-content").then((mod) => mod.ExplorerLineageTabContent),
  {
    loading: () => <div className="h-72 animate-pulse rounded-3xl bg-bg-subtle" />,
    ssr: false,
  },
);
const ExplorerOwnerEditorDrawer = dynamic(
  () => import("@/features/explorer/components/owner-editor-drawer").then((mod) => mod.ExplorerOwnerEditorDrawer),
  { ssr: false },
);
const AssistantDrawer = dynamic(
  () => import("@/features/assistant/components/assistant-drawer").then((mod) => mod.AssistantDrawer),
  { ssr: false },
);
const ExplorerSummaryTabContent = dynamic(
  () => import("@/features/explorer/components/summary-tab-content").then((mod) => mod.ExplorerSummaryTabContent),
  {
    loading: () => <div className="h-96 animate-pulse rounded-3xl bg-bg-subtle" />,
    ssr: false,
  },
);
const ExplorerTagsTabContent = dynamic(
  () => import("@/features/explorer/components/tags-tab-content").then((mod) => mod.ExplorerTagsTabContent),
  {
    loading: () => <div className="h-72 animate-pulse rounded-3xl bg-bg-subtle" />,
    ssr: false,
  },
);
const ExplorerTreePanel = dynamic(
  () => import("@/features/explorer/components/tree-panel").then((mod) => mod.ExplorerTreePanel),
  {
    loading: () => <div className="h-[40rem] animate-pulse rounded-3xl bg-bg-subtle" />,
    ssr: false,
  },
);

const ExplorerObservabilityTabContentLazy = dynamic(
  () => import("@/features/explorer/components/observability-tab-content").then((mod) => mod.ExplorerObservabilityTabContent),
  {
    loading: () => (
      <div className="space-y-4">
        {Array.from({ length: 5 }).map((_, idx) => (
          <div className="h-28 animate-pulse rounded-3xl bg-bg-subtle" key={idx} />
        ))}
      </div>
    ),
  },
);
const ExplorerConsumptionTabContentLazy = dynamic(
  () => import("@/features/explorer/components/consumption-tab-content").then((mod) => mod.ExplorerConsumptionTabContent),
  {
    loading: () => (
      <div className="space-y-4">
        {Array.from({ length: 4 }).map((_, idx) => (
          <div className="h-28 animate-pulse rounded-3xl bg-bg-subtle" key={idx} />
        ))}
      </div>
    ),
  },
);
export default function ExplorerPage() {
  const { t } = useTranslation();
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const auth = useAuth();
  const { canEdit } = auth;
  const canOpenStewardshipRequests = auth.canAction("write", "stewardship");
  // Owner/steward reassignment is allowed for admin/editor/data_owner; managing the
  // owner registry (create/edit/delete) stays with admin/editor.
  const canEditAssetOwner = auth.canAction("write", "assetOwner");
  const canManageOwners = auth.canAction("write", "dataOwners");
  const detailsCardRef = useRef<HTMLDivElement | null>(null);
  const summaryPanelRef = useRef<HTMLDivElement | null>(null);
  const consumptionPanelRef = useRef<HTMLDivElement | null>(null);
  const columnsPanelRef = useRef<HTMLDivElement | null>(null);
  const [summaryPanelHeight, setSummaryPanelHeight] = useState(0);
  const [consumptionPanelHeight, setConsumptionPanelHeight] = useState(0);
  const [summaryConsumptionShellHeight, setSummaryConsumptionShellHeight] = useState(0);
  const [columnsPanelHeight, setColumnsPanelHeight] = useState(0);
  const {
    activeTab,
    timelineError,
    timelineEvents,
    timelineEpisodes,
    timelineLoading,
    breadcrumb,
    columns,
    columnsLoading,
    columnsHasMore,
    columnsLoadingMore,
    columnsTotal,
    columnsError,
    columnSummary,
    columnCounts,
    loadMoreColumns,
    loadFullLineageGraph,
    confirmGovernanceReview,
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
    openOperationalIncident,
    operationalIncidentOpening,
    profilingRerunLoading,
    rerunSelectedTableProfiling,
    scanReprocessLoading,
    reprocessSelectedDatasourceScan,
    operationalContext,
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
    operationalError,
    operationalLoading,
    openIngestionLogs,
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
    reloadTimeline,
    syncMetabaseConsumption,
    setActiveTab,
    activateDetailTab,
    setGovernanceMaturity,
    setIngestionLogsOpen,
    setQuery,
    setTreeCollapsed,
    loadMoreSchemaTables,
    status,
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
  } = useExplorerPage({ canEdit });
  const explorerUrl = `${pathname}${searchParams.toString() ? `?${searchParams.toString()}` : ""}`;
  const [favoriteActive, setFavoriteActive] = useState(false);
  const [favoriteLoading, setFavoriteLoading] = useState(false);
  const [assistantOpen, setAssistantOpen] = useState(false);

  useEffect(() => {
    setAssistantOpen(false);
  }, [selectedTableId]);

  useExplorerDebugLifecycle("ExplorerPage", {
    activeTab,
    selectedTableId,
    selectedTableFullName,
    summaryPanelHeight,
    consumptionPanelHeight,
    summaryConsumptionShellHeight,
    columnsPanelHeight,
    timelineLoading,
    metabaseConsumptionLoading,
    columnsLoading,
    timelineError: timelineError || null,
    metabaseConsumptionError: metabaseConsumptionError || null,
  });
  useExplorerDebugLayout("ExplorerDetailCard", detailsCardRef, {
    activeTab,
    selectedTableId,
    summaryPanelHeight,
    consumptionPanelHeight,
    summaryConsumptionShellHeight,
    columnsPanelHeight,
  });
  useExplorerDebugLayout("ExplorerSummaryPanel", summaryPanelRef, {
    activeTab,
    selectedTableId,
    summaryPanelHeight,
  });
  useExplorerDebugLayout("ExplorerConsumptionPanel", consumptionPanelRef, {
    activeTab,
    selectedTableId,
    consumptionPanelHeight,
    metabaseConsumptionLoading,
    hasConsumptionPayload: Boolean(metabaseConsumption),
    metabaseConsumptionError: metabaseConsumptionError || null,
  });
  useExplorerDebugLayout("ExplorerColumnsPanel", columnsPanelRef, {
    activeTab,
    selectedTableId,
    columnsPanelHeight,
    columnsLoading,
    columnsError: columnsError || null,
  });

  function handleDetailTabChange(tab: DetailTab) {
    explorerDebugLog("ExplorerPage", "tab_click", {
      tab,
      activeTab,
      selectedTableId,
      scrollY: typeof window !== "undefined" ? Math.round(window.scrollY) : null,
      activeElement: typeof document !== "undefined" ? document.activeElement?.tagName || null : null,
    });
    void activateDetailTab(tab);
  }

  useEffect(() => {
    if (!selectedTableId) return;
    const currentTab = normalizeDetailTab(searchParams.get("tab")) || "summary";
    explorerDebugLog("ExplorerPage", "url_sync_snapshot", {
      activeTab,
      currentTab,
      selectedTableId,
      scrollY: typeof window !== "undefined" ? Math.round(window.scrollY) : null,
      activeElement: typeof document !== "undefined" ? document.activeElement?.tagName || null : null,
    });
    if (activeTab === "summary") {
      if (currentTab === "summary" && !searchParams.get("tab")) return;
      const params = new URLSearchParams(searchParams.toString());
      params.delete("tab");
      const nextUrl = `${pathname}${params.toString() ? `?${params.toString()}` : ""}`;
      const currentUrl = `${pathname}${searchParams.toString() ? `?${searchParams.toString()}` : ""}`;
      if (nextUrl !== currentUrl) {
        router.replace(nextUrl, { scroll: false });
      }
      return;
    }
    if (currentTab === activeTab) return;
    const params = new URLSearchParams(searchParams.toString());
    params.set("tab", activeTab);
    const nextUrl = `${pathname}?${params.toString()}`;
    const currentUrl = `${pathname}${searchParams.toString() ? `?${searchParams.toString()}` : ""}`;
    if (nextUrl !== currentUrl) {
      router.replace(nextUrl, { scroll: false });
    }
  }, [activeTab, pathname, router, searchParams, selectedTableId]);

  useEffect(() => {
    if (selectedTableId === null) {
      setSummaryPanelHeight(0);
      setConsumptionPanelHeight(0);
      setSummaryConsumptionShellHeight(0);
      setColumnsPanelHeight(0);
      return;
    }

    const measure = (node: HTMLDivElement | null, setHeight: Dispatch<SetStateAction<number>>) => {
      if (!node) return;
      const height = Math.ceil(node.getBoundingClientRect().height);
      if (height <= 0) return;
      setHeight((current) => (current === height ? current : height));
    };

    if (typeof ResizeObserver === "undefined") return;

    const observer = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const target = entry.target as HTMLDivElement;
        const height = Math.ceil(entry.contentRect.height);
        if (height <= 0) continue;
        // Only the active panel may update the shared shell height. Hidden panels keep
        // their cached height so async loads do not make the Explorer jump vertically.
        if (target === summaryPanelRef.current && activeTab === "summary") {
          setSummaryPanelHeight((current) => (current === height ? current : height));
        }
        if (target === consumptionPanelRef.current && activeTab === "consumption") {
          setConsumptionPanelHeight((current) => (current === height ? current : height));
        }
        if (target === columnsPanelRef.current) {
          setColumnsPanelHeight((current) => (current === height ? current : height));
        }
      }
    });

    if (summaryPanelRef.current) observer.observe(summaryPanelRef.current);
    if (consumptionPanelRef.current) observer.observe(consumptionPanelRef.current);
    if (columnsPanelRef.current) observer.observe(columnsPanelRef.current);

    if (activeTab === "summary") {
      measure(summaryPanelRef.current, setSummaryPanelHeight);
    } else if (activeTab === "consumption") {
      measure(consumptionPanelRef.current, setConsumptionPanelHeight);
    }
    measure(columnsPanelRef.current, setColumnsPanelHeight);

    return () => {
      observer.disconnect();
    };
  }, [activeTab, selectedTableId]);

  useEffect(() => {
    if (selectedTableId === null) {
      setSummaryConsumptionShellHeight(0);
      return;
    }
    setSummaryConsumptionShellHeight((current) => {
      const nextHeight = activeTab === "consumption" ? consumptionPanelHeight : summaryPanelHeight;
      if (!nextHeight || nextHeight <= 0) return current;
      return nextHeight === current ? current : nextHeight;
    });
  }, [activeTab, consumptionPanelHeight, selectedTableId, summaryPanelHeight]);

  useEffect(() => {
    if (!explorerDebugEnabled()) return;
    explorerDebugLog("ExplorerPage", "layout_snapshot", {
      activeTab,
      selectedTableId,
      scrollY: typeof window !== "undefined" ? Math.round(window.scrollY) : null,
      activeElement: typeof document !== "undefined" ? document.activeElement?.tagName || null : null,
      detailCardHeight: detailsCardRef.current ? Math.ceil(detailsCardRef.current.getBoundingClientRect().height) : null,
      summaryPanelHeight,
      consumptionPanelHeight,
      summaryConsumptionShellHeight,
      columnsPanelHeight,
    });
  }, [activeTab, selectedTableId, summaryPanelHeight, consumptionPanelHeight, summaryConsumptionShellHeight, columnsPanelHeight]);

  const detailPanelLayout = resolveExplorerDetailTabLayout({
    activeTab,
    columnsHeight: columnsPanelHeight,
    summaryHeight: summaryPanelHeight,
  });
  const summaryConsumptionLayout = resolveExplorerSummaryConsumptionLayout({
    activeTab: activeTab === "consumption" ? "consumption" : "summary",
    consumptionHeight: consumptionPanelHeight,
    summaryHeight: summaryPanelHeight,
    shellHeight: summaryConsumptionShellHeight,
  });

  const {
    owner,
    ownerArea,
    ownerEditorOpen,
    ownerEmail,
    ownerForm,
    ownerFormMode,
    ownerSaving,
    ownerSearch,
    pendingOwnerId,
    filteredOwnerOptions,
    beginCreateOwner,
    beginEditOwner,
    deleteOwnerRecord,
    saveOwnerAssociation,
    saveOwnerRecord,
    setOwnerEditorOpen,
    setOwnerForm,
    setOwnerFormMode,
    setOwnerSearch,
    setPendingOwnerId,
    tableDataOwnerId,
  } = ownerManagement;
  const {
    addDownstream,
    addUpstream,
    downstreams,
    lineageEditorOpen,
    lineageLoading,
    lineageNotes,
    lineageSaving,
    lineageSpec,
    lineageSummary,
    processDagId,
    processLabel,
    processTaskId,
    refreshAutomaticLineage,
    removeDownstream,
    removeUpstream,
    saveLineage,
    setLineageEditorOpen,
    setLineageLoading,
    setLineageNotes,
    setProcessDagId,
    setProcessLabel,
    setProcessTaskId,
    updateDownstream,
    updateUpstream,
    upstreams,
  } = lineageManagement;
  const {
    resetPendingChanges,
    saveActiveTabChanges,
    selectedTagIds,
    selectedTermIds,
    setTagSearch,
    setTermSearch,
    tableTags,
    tableTerms,
    tagMap,
    tagOptions,
    tagSearch,
    tagsLoading,
    tagsSaving,
    termMap,
    termOptions,
    termSearch,
    termsLoading,
    termsSaving,
    toggleTag,
    toggleTerm,
  } = taxonomyManagement;
  const {
    dictionaryImportFile,
    dictionaryImporting,
    dictionaryImportOpen,
    dictionaryImportResult,
    downloadDictionary,
    setDictionaryImportFile,
    setDictionaryImportOpen,
    submitDictionaryImport,
    closeDictionaryImport,
  } = dictionaryImport;

  useEffect(() => {
    void trackPlatformEvent({
      event_name: "page_view",
      module_name: "explorer",
      page_path: "/explorer",
      entity_type: selectedTableId ? "table" : undefined,
      entity_id: selectedTableId ?? undefined,
    });
  }, [selectedTableId]);

  useEffect(() => {
    if (!selectedTableId) {
      setFavoriteActive(false);
      setFavoriteLoading(false);
      return;
    }
    let cancelled = false;
    setFavoriteLoading(true);
    void apiRequest<SearchFavoriteStatusResponse>(`/v1/search/favorites/table/${selectedTableId}`)
      .then((payload) => {
        if (!cancelled) setFavoriteActive(Boolean(payload.favorite));
      })
      .catch(() => {
        if (!cancelled) setFavoriteActive(false);
      })
      .finally(() => {
        if (!cancelled) setFavoriteLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [selectedTableId]);

  async function toggleSelectedFavorite() {
    if (!selectedTableId) return;
    setFavoriteLoading(true);
    try {
      if (favoriteActive) {
        await apiRequest(`/v1/search/favorites/table/${selectedTableId}`, { method: "DELETE" });
        setFavoriteActive(false);
        return;
      }
      const payload: SearchFavoritePayload = {
        entity_type: "table",
        entity_id: selectedTableId,
        label: selectedTableFullName || selectedTableName || `Tabela ${selectedTableId}`,
        target_url: `/explorer?tableId=${selectedTableId}`,
        category: selectedTableKind || "Tabela",
        subtitle: [selectedDatabaseName, selectedSchemaName, selectedTableName].filter(Boolean).join(" · "),
        context_path: breadcrumb.filter(Boolean).join(" > "),
        metadata: {
          database: selectedDatabaseName || null,
          schema: selectedSchemaName || null,
          table: selectedTableName || null,
          db_type: selectedDbType || null,
        },
      };
      await apiRequest("/v1/search/favorites", {
        method: "PUT",
        body: JSON.stringify(payload),
      });
      setFavoriteActive(true);
    } finally {
      setFavoriteLoading(false);
    }
  }

  return (
    <div className="space-y-4">
      <ExplorerSearchPanel
        collectionRefreshKey={`${selectedTableId || "none"}-${favoriteActive ? "fav" : "plain"}`}
        onOpenSearchResult={(result) => void openSearchResult(result)}
        governanceMaturity={governanceMaturity}
        query={query}
        searchResults={searchResults}
        setGovernanceMaturity={setGovernanceMaturity}
        setQuery={setQuery}
        title={t("pages.explorer.title")}
      />

      {status ? <p className="text-sm text-danger-600">{status}</p> : null}

      <AssetExplorerShell
        sidebarCollapsed={treeCollapsed}
        sidebarCollapsedClassName="xl:w-[104px]"
        sidebarExpandedClassName="xl:w-[360px]"
        sidebar={
          <ExplorerTreePanel
            filteredTree={filteredTree}
            query={query}
            selectedTableCertificationStatus={tableInfo?.certification_status}
            selectedTableId={selectedTableId}
            selectTable={selectTable}
            setTreeCollapsed={setTreeCollapsed}
            status={status}
            toggleDatasource={toggleDatasource}
            toggleSchema={toggleSchema}
            loadMoreSchemaTables={loadMoreSchemaTables}
            treeCollapsed={treeCollapsed}
          />
        }
        detail={
          <div className="self-start" ref={detailsCardRef}>
            <Card className="border-border/80 shadow-[0_12px_40px_rgba(15,23,42,0.05)]" data-doc-anchor="explorer-details">
              <CardHeader className="space-y-3">
                {activeTab === "lineage" ? (
                  <ExplorerMinimalHeader
                    canEdit={canEdit}
                    favoriteActive={favoriteActive}
                    favoriteLoading={favoriteLoading}
                    hasSavedLineage={hasSavedLineage}
                    onOpenAssistant={selectedTableId !== null ? () => setAssistantOpen(true) : undefined}
                    onToggleFavorite={() => void toggleSelectedFavorite()}
                    selectedTableFullName={selectedTableFullName}
                    selectedTableId={selectedTableId}
                  />
                ) : (
                  <ExplorerFullHeader
                    breadcrumb={breadcrumb}
                    canEdit={canEdit}
                    canEditOwner={canEditAssetOwner}
                    favoriteActive={favoriteActive}
                    favoriteLoading={favoriteLoading}
                    onOpenAssistant={selectedTableId !== null ? () => setAssistantOpen(true) : undefined}
                    onToggleFavorite={() => void toggleSelectedFavorite()}
                    owner={owner}
                    ownerArea={ownerArea}
                    ownerEmail={ownerEmail}
                    selectedDatabaseName={selectedDatabaseName}
                    selectedDbType={selectedDbType}
                    selectedSchemaName={selectedSchemaName}
                    selectedTableFullName={selectedTableFullName}
                    selectedTableId={selectedTableId}
                    selectedTableKind={selectedTableKind}
                    selectedTableName={selectedTableName}
                    setOwnerEditorOpen={setOwnerEditorOpen}
                    setOwnerFormMode={setOwnerFormMode}
                    setOwnerSearch={setOwnerSearch}
                    setPendingOwnerId={setPendingOwnerId}
                    tableDataOwnerId={tableDataOwnerId}
                    tableInfo={tableInfo}
                    tableTags={tableTags}
                    tableTerms={tableTerms}
                  />
                )}
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div className="flex flex-wrap gap-2">
                    {DETAIL_TABS.map((tab) => (
                      <button
                        className={cn(
                          "rounded-full px-3 py-1.5 text-xs font-medium transition",
                          activeTab === tab
                            ? "bg-slate-900 text-white shadow-sm"
                            : "bg-bg-subtle text-text-body hover:bg-info-50 hover:text-info-700",
                        )}
                        key={tab}
                        onClick={() => handleDetailTabChange(tab)}
                        type="button"
                      >
                        {detailTabLabel(tab)}
                      </button>
                    ))}
                  </div>
                  {activeTab === "columns" && canEdit ? (
                    <div className="flex flex-wrap items-center gap-2">
                      <Button onClick={() => void downloadDictionary("template")} size="sm" variant="ghost">
                        <FileSpreadsheet className="h-4 w-4" />
                        Modelo
                      </Button>
                      <Button onClick={() => void downloadDictionary("export")} size="sm" variant="outline">
                        <Download className="h-4 w-4" />
                        Exportar dicionário
                      </Button>
                      <Button onClick={() => setDictionaryImportOpen(true)} size="sm">
                        <Upload className="h-4 w-4" />
                        Importar dicionário
                      </Button>
                    </div>
                  ) : null}
                </div>
                {notice ? (
                  <p
                    className={cn(
                      "text-sm",
                      notice.tone === "success" ? "text-success-700" : "text-danger-700",
                    )}
                  >
                    {notice.message}
                  </p>
                ) : null}
              </CardHeader>

              <CardContent className="space-y-4">
                <ChunkLoadBoundary path={explorerUrl} scope="explorer-detail-panels">
                  {selectedTableId === null ? (
                    <EmptyState
                      title="Nenhuma tabela selecionada"
                      description="Selecione uma tabela na árvore para visualizar os detalhes, colunas e governança."
                    />
                  ) : (
                    <>
                      {/* Keep detail panels in stable shells so switching tabs does not collapse the page height. */}
                      {activeTab === "summary" || activeTab === "consumption" ? (
                        <div className="relative" style={summaryConsumptionLayout.shellStyle}>
                          <div
                            aria-hidden={activeTab !== "summary"}
                            className={summaryConsumptionLayout.summaryPanelClassName}
                            ref={summaryPanelRef}
                          >
                            <ExplorerSummaryTabContent
                              canEdit={canEdit}
                              canOpenStewardshipRequests={canOpenStewardshipRequests}
                              columnCounts={columnCounts}
                              dictionaryCoveragePct={dictionaryCoveragePct}
                              dqLatest={dqLatest}
                              dqMessage={dqMessage}
                              dqState={dqState}
                              glossaryCoveragePct={glossaryCoveragePct}
                              ingestionError={ingestionError}
                              ingestionExecutions={ingestionExecutions}
                              ingestionLoading={ingestionLoading}
                              ingestionSummary={ingestionSummary}
                              onOpenIngestionLogs={(executionId) => void openIngestionLogs(executionId)}
                              onAutoOpenIncident={() => void openOperationalIncident("auto_if_missing")}
                              autoOpening={operationalIncidentOpening}
                              onRerunProfiling={() => void rerunSelectedTableProfiling()}
                              profilingRerunLoading={profilingRerunLoading}
                              onReprocessDatasourceScan={() => void reprocessSelectedDatasourceScan()}
                              scanReprocessLoading={scanReprocessLoading}
                              onConfirmOwnerReview={() => void confirmGovernanceReview("owner")}
                              onConfirmPrivacyReview={() => void confirmGovernanceReview("privacy")}
                              owner={owner}
                              ownerArea={ownerArea}
                              ownerEmail={ownerEmail}
                              correlationSummary={correlationSummary}
                              correlationLoading={correlationLoading}
                              correlationError={correlationError}
                              canonicalAsset={canonicalAsset}
                              canonicalAssetLoading={canonicalLoading}
                              canonicalAssetError={canonicalError}
                              operationalContext={operationalContext}
                              operationalError={operationalError}
                              operationalLoading={operationalLoading}
                              selectedDatabaseName={selectedDatabaseName}
                              selectedDbType={selectedDbType}
                              selectedSchemaName={selectedSchemaName}
                              selectedTableFullName={selectedTableFullName}
                              selectedTableKind={selectedTableKind}
                              summaryColumnsPreview={summaryColumnsPreview}
                              summaryStats={summaryStats}
                              onTableDescriptionSaved={() => void reloadSelectedTableMetadata()}
                              onStewardChanged={() => void reloadSelectedTableMetadata()}
                              stewardshipError={stewardshipError}
                              stewardshipLoading={stewardshipLoading}
                              stewardshipRequests={stewardshipRequests}
                              tableDescription={tableDescription}
                              tableInfo={tableInfo}
                              tableTags={tableTags}
                              tableTerms={tableTerms}
                            />
                          </div>
                          <div
                            aria-hidden={activeTab !== "consumption"}
                            className={summaryConsumptionLayout.consumptionPanelClassName}
                            ref={consumptionPanelRef}
                          >
                            <ExplorerConsumptionTabContentLazy
                              consumption={metabaseConsumption}
                              error={metabaseConsumptionError}
                              loading={metabaseConsumptionLoading}
                              syncError={metabaseSyncError}
                              syncLoading={metabaseSyncLoading}
                              canSync={canEdit}
                              onRetry={() => void reloadMetabaseConsumption()}
                              onSync={() => void syncMetabaseConsumption()}
                              selectedTableFullName={selectedTableFullName}
                              selectedTableId={selectedTableId}
                            />
                          </div>
                        </div>
                      ) : null}
                      {activeTab === "columns" ? (
                        <div className="relative" style={detailPanelLayout.shellStyle}>
                          <div
                            aria-hidden={activeTab !== "columns"}
                            className={detailPanelLayout.columnsPanelClassName}
                            ref={columnsPanelRef}
                          >
                            <ExplorerColumnsTabContent
                              canEdit={canEdit}
                              columns={columns}
                              columnsLoading={columnsLoading}
                              columnsError={columnsError}
                              columnsHasMore={columnsHasMore}
                              columnsLoadingMore={columnsLoadingMore}
                              columnsTotal={columnsTotal}
                              onLoadMore={() => void loadMoreColumns()}
                              highlightedColumnId={highlightedColumnId}
                              onOpenDictionaryImport={() => setDictionaryImportOpen(true)}
                              tableId={selectedTableId}
                            />
                          </div>
                        </div>
                      ) : null}
                      {activeTab === "tags" ? (
                        <ExplorerTagsTabContent
                          canEdit={canEdit}
                          hasUnsavedChanges={hasUnsavedChanges}
                          onResetPendingChanges={resetPendingChanges}
                          onSaveChanges={() => void saveActiveTabChanges()}
                          selectedTagIds={selectedTagIds}
                          setTagSearch={setTagSearch}
                          tagMap={tagMap}
                          tagOptions={tagOptions}
                          tagSearch={tagSearch}
                          tagsLoading={tagsLoading}
                          tagsSaving={tagsSaving}
                          termsSaving={termsSaving}
                          toggleTag={toggleTag}
                        />
                      ) : activeTab === "glossary" ? (
                        <ExplorerGlossaryTabContent
                          canEdit={canEdit}
                          hasUnsavedChanges={hasUnsavedChanges}
                          onResetPendingChanges={resetPendingChanges}
                          onSaveChanges={() => void saveActiveTabChanges()}
                          selectedTermIds={selectedTermIds}
                          setTermSearch={setTermSearch}
                          termMap={termMap}
                          termOptions={termOptions}
                          termSearch={termSearch}
                          tagsSaving={tagsSaving}
                          termsLoading={termsLoading}
                          termsSaving={termsSaving}
                          toggleTerm={toggleTerm}
                        />
                      ) : activeTab === "lineage" ? (
                        <ExplorerLineageTabContent
                          canEdit={canEdit}
                          flowEdges={flowEdges}
                          flowNodes={flowNodes as Node<LineageFlowNodeData>[]}
                          hasSavedLineage={hasSavedLineage}
                          lineageLoading={lineageLoading}
                          lineageSummary={lineageSummary}
                          onCreateRelation={() => {
                            if (selectedTableId === null) return;
                            window.location.assign(`/lineage?tableId=${selectedTableId}&openCreate=1`);
                          }}
                          onImportSpreadsheet={() => {
                            if (selectedTableId === null) return;
                            window.location.assign(`/lineage?tableId=${selectedTableId}&openImport=1`);
                          }}
                          onManageLineage={() => {
                            if (selectedTableId === null) return;
                            window.location.assign(`/lineage?tableId=${selectedTableId}`);
                          }}
                          onNodeActivate={(node) => {
                            const targetTableId = node.data.catalogTableId;
                            if (!targetTableId || targetTableId === selectedTableId) return;
                            window.location.assign(`/explorer?tableId=${targetTableId}&tab=lineage`);
                          }}
                          onOpenRelatedAsset={(href) => window.location.assign(href)}
                          onRefreshAutomaticLineage={() => void refreshAutomaticLineage()}
                          onLoadFullGraph={loadFullLineageGraph}
                        />
                      ) : activeTab === "history" ? (
                        <ExplorerHistoryTabContent
                          error={timelineError}
                          episodes={timelineEpisodes}
                          events={timelineEvents}
                          loading={timelineLoading}
                          selectedTableId={selectedTableId}
                          onRetry={() => void reloadTimeline()}
                        />
                      ) : activeTab === "observability" ? (
                        <ExplorerObservabilityTabContentLazy
                          canonicalAsset={canonicalAsset}
                          canonicalError={canonicalError}
                          canonicalLoading={canonicalLoading}
                          correlationError={correlationError}
                          correlationLoading={correlationLoading}
                          correlationSummary={correlationSummary}
                          operationalContext={operationalContext}
                          operationalError={operationalError}
                          operationalLoading={operationalLoading}
                          selectedTableFullName={selectedTableFullName}
                          selectedTableId={selectedTableId}
                          tableInfo={tableInfo}
                        />
                      ) : null}
                    </>
                  )}
                </ChunkLoadBoundary>
              </CardContent>
            </Card>
          </div>
        }
      />

      <ExplorerDictionaryImportDialog
        dictionaryImportFile={dictionaryImportFile}
        dictionaryImporting={dictionaryImporting}
        dictionaryImportResult={dictionaryImportResult}
        onClose={closeDictionaryImport}
        onDownloadDictionary={(kind) => void downloadDictionary(kind)}
        onFileChange={setDictionaryImportFile}
        onSubmit={() => void submitDictionaryImport()}
        open={dictionaryImportOpen}
      />

      <ExplorerOwnerEditorDrawer
        beginCreateOwner={beginCreateOwner}
        beginEditOwner={beginEditOwner}
        canEdit={canEditAssetOwner}
        canManageOwners={canManageOwners}
        filteredOwnerOptions={filteredOwnerOptions}
        notice={notice}
        onClose={() => setOwnerEditorOpen(false)}
        onDeleteOwnerRecord={() => void deleteOwnerRecord()}
        onSaveOwnerAssociation={() => void saveOwnerAssociation(pendingOwnerId)}
        onSaveOwnerRecord={() => void saveOwnerRecord()}
        open={ownerEditorOpen && selectedTableId !== null}
        ownerForm={ownerForm}
        ownerFormMode={ownerFormMode}
        ownerSaving={ownerSaving}
        ownerSearch={ownerSearch}
        pendingOwnerId={pendingOwnerId}
        selectedTableFullName={selectedTableFullName}
        setOwnerForm={setOwnerForm}
        setOwnerFormMode={setOwnerFormMode}
        setOwnerSearch={setOwnerSearch}
        setPendingOwnerId={setPendingOwnerId}
        tableDataOwnerId={tableDataOwnerId}
      />

      <ExplorerLineageEditorDrawer
        addDownstream={addDownstream}
        addUpstream={addUpstream}
        canEdit={canEdit}
        datasources={datasources}
        downstreams={downstreams}
        hasSavedLineage={hasSavedLineage}
        lineageEditorOpen={lineageEditorOpen && selectedTableId !== null}
        lineageNotes={lineageNotes}
        lineageSaving={lineageSaving}
        onClose={() => setLineageEditorOpen(false)}
        onSave={() => void saveLineage()}
        processDagId={processDagId}
        processLabel={processLabel}
        processTaskId={processTaskId}
        removeDownstream={removeDownstream}
        removeUpstream={removeUpstream}
        selectedTableFullName={selectedTableFullName}
        setLineageNotes={setLineageNotes}
        setProcessDagId={setProcessDagId}
        setProcessLabel={setProcessLabel}
        setProcessTaskId={setProcessTaskId}
        updateDownstream={updateDownstream}
        updateUpstream={updateUpstream}
        upstreams={upstreams}
      />

      <AssistantDrawer
        assetLabel={selectedTableFullName || tableInfo?.owner || "Ativo"}
        assetRef={selectedTableId !== null ? `table:${selectedTableId}` : null}
        onActionCompleted={() => void reloadSelectedTableMetadata()}
        onClose={() => setAssistantOpen(false)}
        open={assistantOpen && selectedTableId !== null}
      />

      <ExplorerIngestionLogsDialog
        error={ingestionLogsError}
        executionId={ingestionLogsExecutionId}
        loading={ingestionLogsLoading}
        logs={ingestionLogs}
        onClose={() => setIngestionLogsOpen(false)}
        open={ingestionLogsOpen}
      />
    </div>
  );
}
