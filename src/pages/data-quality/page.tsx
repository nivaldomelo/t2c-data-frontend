import { Link } from "@/lib/next-shims";
import { dynamic } from "@/lib/next-shims";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "@/lib/next-shims";
import {
  AlertTriangle,
  ArrowDownRight,
  ArrowUpRight,
  BarChart3,
  Clock3,
  Droplets,
  ShieldCheck,
  Sparkles,
  TrendingUp,
  X,
} from "lucide-react";
import { useTranslation } from "react-i18next";

import {
  CertificationCriticalityBadge,
  CertificationStatusBadge,
  CertificationUsageBadge,
  certificationStatusFrameClass,
  certificationStatusHeaderClass,
} from "@/components/certification/certification-badge";
import { DQSubnav } from "@/components/data-quality/dq-subnav";
import { DatabaseTechLogo } from "@/components/database-tech-logo";
import { AccessRoleBadges, PrivacySummaryStrip } from "@/components/privacy/privacy-badge";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { Skeleton } from "@/components/ui/skeleton";
import { ChunkLoadBoundary } from "@/components/chunk-load-boundary";
import { MetricCard, ScoreRing, Sparkline } from "@/features/data-quality/components/analytics";
import { DQPlatformScorecard } from "@/features/data-quality/components/platform-scorecard";
import { CatalogTreePanel } from "@/features/data-quality/components/catalog-tree-panel";
import { ProfilingRunModal } from "@/features/data-quality/components/profiling-run-modal";
import { normalizePageItems, type PageResponse } from "@/lib/pagination";
import { ProfilingRunDrawer } from "@/features/data-quality/components/profiling-run-drawer";
import { SchemaRunProgress } from "@/features/data-quality/components/schema-run-progress";
import { ProfilingRunStatus } from "@/features/data-quality/components/profiling-run-status";
import { ProfilingScheduleModal } from "@/features/data-quality/components/profiling-schedule-modal";
import profilingStatus from "@/features/data-quality/profiling-status";
import { useDQCatalogTree } from "@/features/data-quality/hooks/use-dq-catalog-tree";
import { useDQLatest } from "@/features/data-quality/hooks/use-dq-latest";
import { useContractImpactSummary } from "@/features/data-quality/hooks/use-contract-impact";
import { useDqPlatformScorecard } from "@/features/data-quality/hooks/use-dq-platform-scorecard";
import { useDQProfilingRun } from "@/features/data-quality/hooks/use-dq-profiling-run";
import {
  buildDataQualityDetailTabHref,
  normalizeDataQualityDetailTab,
} from "@/features/data-quality/detail-tabs";
import { buildOperationalIncidentCreateHref } from "@/features/incidents/prefill";
import type {
  AnalyticTone,
  DQJobRun,
  DQHistoricalArtifactSet,
  DQRule,
  DQProfilingSchedule,
  DQProfilingScheduleForm,
} from "@/features/data-quality/types";
import type {
  CanonicalAssetContext,
  TableCorrelationSummary,
  TableDetailInfo as ExplorerTableDetailInfo,
  TableIngestionSummary,
  TableOperationalContext,
} from "@/features/explorer/types";
import { ANALYTIC_TONES, deltaState, freshnessStatus, heatTone, humanAge, pctDelta, pctStatus } from "@/features/data-quality/utils";
import { ApiError, apiRequest } from "@/lib/client-api";
import { useAuth } from "@/lib/auth";
import { cn } from "@/lib/cn";
import { dbEngineMeta } from "@/lib/database-engine";
import {
  createDefaultProfilingScheduleForm,
  profilingScheduleToForm,
  formatProfilingScheduleSummary,
  formatExecutionTimestamp,
  formatDurationMs,
  profilingRunStatusMeta,
  executionOriginLabel,
  tableRuleExecutionLabel,
  tableRuleExecutionTone,
  ruleSeverityLabel,
  ruleTypeLabel,
} from "@/features/data-quality/page-helpers";

const ExplorerObservabilityTabContent = dynamic(
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

export default function DataQualityPage() {
  const { t } = useTranslation();
  const auth = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [treeCollapsed, setTreeCollapsed] = useState(false);
  const [status, setStatus] = useState("");
  const [ingestionSummary, setIngestionSummary] = useState<TableIngestionSummary | null>(null);
  const [ingestionLoading, setIngestionLoading] = useState(false);
  const [ingestionError, setIngestionError] = useState("");
  const [profilingScheduleLoading, setProfilingScheduleLoading] = useState(false);
  const [profilingScheduleError, setProfilingScheduleError] = useState("");
  const [profilingScheduleTable, setProfilingScheduleTable] = useState<DQProfilingSchedule | null>(null);
  const [profilingScheduleSchema, setProfilingScheduleSchema] = useState<DQProfilingSchedule | null>(null);
  const [profilingScheduleModalOpen, setProfilingScheduleModalOpen] = useState(false);
  const [profilingScheduleSaving, setProfilingScheduleSaving] = useState(false);
  const [profilingScheduleForm, setProfilingScheduleForm] = useState<DQProfilingScheduleForm>(
    createDefaultProfilingScheduleForm("table"),
  );
  const [canonicalAsset, setCanonicalAsset] = useState<CanonicalAssetContext | null>(null);
  const [canonicalLoading, setCanonicalLoading] = useState(false);
  const [canonicalError, setCanonicalError] = useState("");
  const [correlationSummary, setCorrelationSummary] = useState<TableCorrelationSummary | null>(null);
  const [correlationSummaryLoading, setCorrelationSummaryLoading] = useState(false);
  const [correlationSummaryError, setCorrelationSummaryError] = useState("");
  const [operationalContext, setOperationalContext] = useState<TableOperationalContext | null>(null);
  const [operationalContextLoading, setOperationalContextLoading] = useState(false);
  const [operationalContextError, setOperationalContextError] = useState("");
  const [historyView, setHistoryView] = useState<"all" | "baseline" | "event" | "evidence">("all");
  const [historicalDrilldown, setHistoricalDrilldown] = useState<DQHistoricalArtifactSet | null>(null);
  const [historicalDrilldownLoading, setHistoricalDrilldownLoading] = useState(false);
  const [historicalDrilldownError, setHistoricalDrilldownError] = useState("");
  const [historyRunIdFilter, setHistoryRunIdFilter] = useState<number | null>(null);
  const [profilingRunDrawerOpen, setProfilingRunDrawerOpen] = useState(false);
  const [selectedProfilingRunId, setSelectedProfilingRunId] = useState<number | null>(null);
  const [profilingRunDetail, setProfilingRunDetail] = useState<DQJobRun | null>(null);
  const [profilingRunDetailArtifacts, setProfilingRunDetailArtifacts] = useState<DQHistoricalArtifactSet | null>(null);
  const [profilingRunDetailLoading, setProfilingRunDetailLoading] = useState(false);
  const [profilingRunDetailError, setProfilingRunDetailError] = useState("");
  const [selectedTableRules, setSelectedTableRules] = useState<DQRule[]>([]);
  const [selectedTableRulesLoading, setSelectedTableRulesLoading] = useState(false);
  const [selectedTableRulesError, setSelectedTableRulesError] = useState("");
  const lastLoadedTableIdRef = useRef<number | null>(null);
  const observabilityPath = pathname.startsWith("/") ? pathname : "/data-quality";
  const { summary: platformScorecard, loading: platformScorecardLoading, error: platformScorecardError } = useDqPlatformScorecard();

  const canRun = auth.canAction("write", "dataQuality");
  const { allSchemaOptions, nodes, toggleDatasource, toggleSchema } = useDQCatalogTree({
    onError: setStatus,
  });
  const {
    latest,
    latestState,
    latestStateMessage,
    incidentSignals,
    incidentSignalsError,
    loadLatest,
    loadingLatest,
    selectedColumn,
    selectedDatabaseName,
    selectedDatasourceId,
    selectedDatasourceName,
    selectedDbType,
    selectedSchemaName,
    selectedTableId,
    selectedTableInfo,
    selectedTableName,
    setSelectedColumn,
  } = useDQLatest({
    onWideScreenSelection: () => setTreeCollapsed(true),
  });
  const activeDetailTab = normalizeDataQualityDetailTab(searchParams.get("tab")) || "data-quality";
  const isObservabilityTab = activeDetailTab === "confiabilidade-acao";
  const {
    runLoading,
    profilingBusy,
    profilingBusyReason,
    runModalOpen,
    runScope,
    runSchemaDatasourceId,
    runSchemaName,
    runSchemaLimit,
    runSchemaConcurrency,
    runSchemaIncludeCsv,
    runSchemaExcludeCsv,
    runExecutionEngine,
    schemaRunProgress,
    schemaRunItems,
    setRunModalOpen,
    setRunScope,
    setRunExecutionEngine,
    setRunSchemaDatasourceId,
    setRunSchemaName,
    setRunSchemaLimit,
    setRunSchemaConcurrency,
    setRunSchemaIncludeCsv,
    setRunSchemaExcludeCsv,
    runProfile,
    currentTableRun,
    profilingHistory,
    profilingHistoryLoading,
    profilingHistoryError,
    refreshProfilingHistory,
  } = useDQProfilingRun({
    allSchemaOptions,
    nodes,
    onMessage: setStatus,
    onTableProfiled: async () => {
      if (selectedTableId) {
        await loadLatest(selectedTableId, selectedTableName);
      }
    },
    selectedTableId,
    selectedTableName,
  });

  const selectedTableSchemaName = useMemo(() => {
    if (!selectedTableName) return "";
    if (selectedTableName.includes(".")) {
      return selectedTableName;
    }
    return selectedSchemaName ? `${selectedSchemaName}.${selectedTableName}` : selectedTableName;
  }, [selectedSchemaName, selectedTableName]);

  const selectedTableFqn = useMemo(() => {
    if (!selectedDatasourceName || !selectedTableSchemaName) return "";
    return `${selectedDatasourceName}.${selectedTableSchemaName}`;
  }, [selectedDatasourceName, selectedTableSchemaName]);

  const loadProfilingSchedules = useCallback(async () => {
    if (!selectedTableId) {
      setProfilingScheduleTable(null);
      setProfilingScheduleSchema(null);
      return;
    }
    setProfilingScheduleError("");
    const tableRequest = apiRequest<DQProfilingSchedule[]>(
      `/v1/dq/profiling/schedules?scope=table&table_id=${selectedTableId}`,
    );
    const schemaRequest =
      selectedDatasourceId && selectedSchemaName
        ? apiRequest<DQProfilingSchedule[]>(
            `/v1/dq/profiling/schedules?scope=schema&datasource_id=${selectedDatasourceId}&schema_name=${encodeURIComponent(selectedSchemaName)}`,
          )
        : Promise.resolve([] as DQProfilingSchedule[]);
    const [tableResult, schemaResult] = await Promise.allSettled([tableRequest, schemaRequest]);
    setProfilingScheduleTable(tableResult.status === "fulfilled" ? tableResult.value[0] ?? null : null);
    setProfilingScheduleSchema(schemaResult.status === "fulfilled" ? schemaResult.value[0] ?? null : null);
    if (tableResult.status === "rejected" || schemaResult.status === "rejected") {
      setProfilingScheduleError("Não foi possível carregar o agendamento de perfilamento agora.");
    }
  }, [selectedDatasourceId, selectedSchemaName, selectedTableId]);

  useEffect(() => {
    const tableIdParam = Number(searchParams.get("tableId") || "");
    if (!Number.isFinite(tableIdParam) || tableIdParam <= 0) return;
    if (lastLoadedTableIdRef.current === tableIdParam) return;
    lastLoadedTableIdRef.current = tableIdParam;
    void (async () => {
      try {
        const locator = await apiRequest<{
          table_id: number;
          datasource_id: number;
          datasource_name: string;
          database_name: string;
          schema_name: string;
          table_name: string;
          db_type: string;
        }>(`/v1/catalog/tables/${tableIdParam}/locator`);
        await loadLatest(locator.table_id, locator.table_name, {
          datasourceId: locator.datasource_id,
          datasourceName: locator.datasource_name,
          databaseName: locator.database_name,
          schemaName: locator.schema_name,
          dbType: (locator.db_type as typeof selectedDbType) || "postgres",
        });
      } catch (error) {
        setStatus((error as Error).message);
      }
    })();
  }, [loadLatest, searchParams, selectedDbType]);

  useEffect(() => {
    if (!selectedTableId) {
      setProfilingScheduleTable(null);
      setProfilingScheduleSchema(null);
      setProfilingScheduleError("");
      setProfilingScheduleLoading(false);
      return;
    }
    let cancelled = false;
    setProfilingScheduleLoading(true);
    setProfilingScheduleError("");
    void (async () => {
      try {
        if (cancelled) return;
        await loadProfilingSchedules();
      } catch (error) {
        if (!cancelled) {
          setProfilingScheduleError((error as Error).message || "Não foi possível carregar o agendamento de perfilamento agora.");
        }
      } finally {
        if (!cancelled) setProfilingScheduleLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [loadProfilingSchedules, selectedDatasourceId, selectedSchemaName, selectedTableId]);

  useEffect(() => {
    if (!selectedTableId || !selectedTableFqn) {
      setSelectedTableRules([]);
      setSelectedTableRulesError("");
      setSelectedTableRulesLoading(false);
      return;
    }
    let cancelled = false;
    setSelectedTableRules([]);
    setSelectedTableRulesLoading(true);
    setSelectedTableRulesError("");
    void (async () => {
      try {
        const payload = await apiRequest<DQRule[] | PageResponse<DQRule>>(
          `/v1/dq/rules?table_fqn=${encodeURIComponent(selectedTableFqn)}&page=1&page_size=100`,
        );
        if (!cancelled) {
          setSelectedTableRules(normalizePageItems(payload));
        }
      } catch (error) {
        if (!cancelled) {
          setSelectedTableRules([]);
          setSelectedTableRulesError((error as Error).message || "Não foi possível carregar as regras desta tabela agora.");
        }
      } finally {
        if (!cancelled) {
          setSelectedTableRulesLoading(false);
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [selectedTableFqn, selectedTableId]);

  useEffect(() => {
    if (!selectedTableId) {
      setIngestionSummary(null);
      setIngestionError("");
      setIngestionLoading(false);
      return;
    }
    if (!isObservabilityTab) {
      setIngestionSummary(null);
      setIngestionError("");
      setIngestionLoading(false);
      return;
    }
    let cancelled = false;
    setIngestionLoading(true);
    setIngestionError("");
    void (async () => {
      try {
        const payload = await apiRequest<TableIngestionSummary>(`/v1/ingestion/tables/${selectedTableId}/summary`);
        if (!cancelled) {
          setIngestionSummary(payload);
        }
      } catch (error) {
        if (!cancelled) {
          setIngestionSummary(null);
          if (error instanceof ApiError && error.status === 503) {
            setIngestionError(
              error.message ||
                "Serviço de autenticação indisponível no momento. Verifique a conexão com o banco principal.",
            );
          } else {
            setIngestionError((error as Error).message);
          }
        }
      } finally {
        if (!cancelled) {
          setIngestionLoading(false);
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [isObservabilityTab, selectedTableId]);

  useEffect(() => {
    if (!selectedTableId) {
      setCanonicalAsset(null);
      setCanonicalLoading(false);
      setCanonicalError("");
      setCorrelationSummary(null);
      setCorrelationSummaryLoading(false);
      setCorrelationSummaryError("");
      setOperationalContext(null);
      setOperationalContextLoading(false);
      setOperationalContextError("");
      return;
    }
    if (!isObservabilityTab) {
      setCanonicalAsset(null);
      setCanonicalLoading(false);
      setCanonicalError("");
      setCorrelationSummary(null);
      setCorrelationSummaryLoading(false);
      setCorrelationSummaryError("");
      setOperationalContext(null);
      setOperationalContextLoading(false);
      setOperationalContextError("");
      return;
    }
    let cancelled = false;
    setCanonicalLoading(true);
    setCanonicalError("");
    setCorrelationSummaryLoading(true);
    setCorrelationSummaryError("");
    setOperationalContextLoading(true);
    setOperationalContextError("");
    void (async () => {
      try {
        const [canonicalResult, correlationResult, operationalResult] = await Promise.allSettled([
          apiRequest<CanonicalAssetContext>(`/v1/catalog/tables/${selectedTableId}/canonical-context`),
          apiRequest<TableCorrelationSummary>(`/v1/catalog/tables/${selectedTableId}/correlation-summary`),
          apiRequest<TableOperationalContext>(`/v1/catalog/tables/${selectedTableId}/operational-context`),
        ]);
        if (!cancelled) {
          setCanonicalAsset(canonicalResult.status === "fulfilled" ? canonicalResult.value : null);
          setCanonicalError(canonicalResult.status === "rejected" ? (canonicalResult.reason as Error).message : "");
          setCorrelationSummary(correlationResult.status === "fulfilled" ? correlationResult.value : null);
          setCorrelationSummaryError(correlationResult.status === "rejected" ? (correlationResult.reason as Error).message : "");
          setOperationalContext(operationalResult.status === "fulfilled" ? operationalResult.value : null);
          setOperationalContextError(operationalResult.status === "rejected" ? (operationalResult.reason as Error).message : "");
        }
      } catch (error) {
        if (!cancelled) {
          setCanonicalAsset(null);
          setCanonicalError(error instanceof Error ? error.message : "Não foi possível carregar o núcleo canônico.");
          setCorrelationSummary(null);
          setCorrelationSummaryError(error instanceof Error ? error.message : "Não foi possível carregar a correlação do ativo.");
          setOperationalContext(null);
          setOperationalContextError(error instanceof Error ? error.message : "Não foi possível carregar o contexto operacional.");
        }
      } finally {
        if (!cancelled) {
          setCanonicalLoading(false);
          setCorrelationSummaryLoading(false);
          setOperationalContextLoading(false);
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [isObservabilityTab, selectedTableId]);

  useEffect(() => {
    if (!selectedTableId) {
      setHistoricalDrilldown(null);
      setHistoricalDrilldownLoading(false);
      setHistoricalDrilldownError("");
      return;
    }
    let cancelled = false;
    setHistoricalDrilldownLoading(true);
    setHistoricalDrilldownError("");
    void (async () => {
      try {
        const params = new URLSearchParams({
          artifact_type: historyView,
          limit: historyView === "evidence" ? "6" : "10",
        });
        if (historyRunIdFilter !== null) {
          params.set("dq_run_id", String(historyRunIdFilter));
        }
        if (selectedColumn?.column_name && historyView !== "all") {
          params.set("column_name", selectedColumn.column_name);
        }
        const payload = await apiRequest<DQHistoricalArtifactSet>(
          `/v1/dq/tables/id/${selectedTableId}/observability/history?${params.toString()}`,
        );
        if (!cancelled) {
          setHistoricalDrilldown(payload);
        }
      } catch (error) {
        if (!cancelled) {
          setHistoricalDrilldown(null);
          setHistoricalDrilldownError(error instanceof Error ? error.message : "Não foi possível carregar o histórico filtrado.");
        }
      } finally {
        if (!cancelled) {
          setHistoricalDrilldownLoading(false);
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [historyRunIdFilter, historyView, selectedColumn?.column_name, selectedTableId]);

  useEffect(() => {
    if (!selectedTableId) {
      setHistoryRunIdFilter(null);
    }
  }, [selectedTableId]);

  useEffect(() => {
    if (!profilingRunDrawerOpen || !selectedProfilingRunId) {
      setProfilingRunDetail(null);
      setProfilingRunDetailArtifacts(null);
      setProfilingRunDetailLoading(false);
      setProfilingRunDetailError("");
      return;
    }
    let cancelled = false;
    setProfilingRunDetailLoading(true);
    setProfilingRunDetailError("");
    void (async () => {
      try {
        const detail = await apiRequest<DQJobRun>(`/v1/dq/runs/${selectedProfilingRunId}`);
        if (cancelled) return;
        setProfilingRunDetail(detail);
        if (selectedTableId && detail.dq_run_id) {
          const params = new URLSearchParams({
            artifact_type: "all",
            limit: "10",
            dq_run_id: String(detail.dq_run_id),
          });
          const artifacts = await apiRequest<DQHistoricalArtifactSet>(
            `/v1/dq/tables/id/${selectedTableId}/observability/history?${params.toString()}`,
          );
          if (!cancelled) {
            setProfilingRunDetailArtifacts(artifacts);
          }
        } else if (!cancelled) {
          setProfilingRunDetailArtifacts(null);
        }
      } catch (error) {
        if (!cancelled) {
          setProfilingRunDetail(null);
          setProfilingRunDetailArtifacts(null);
          setProfilingRunDetailError(error instanceof Error ? error.message : "Não foi possível carregar o detalhe da execução.");
        }
      } finally {
        if (!cancelled) {
          setProfilingRunDetailLoading(false);
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [profilingRunDrawerOpen, selectedProfilingRunId, selectedTableId]);

  const current = latest?.current ?? null;
  const previous = latest?.previous ?? null;
  const history = latest?.history ?? [];
  const observability = latest?.observability ?? current?.observability ?? null;
  const assessmentState = observability?.assessment_state ?? null;
  const primaryPipeline = ingestionSummary?.primary_pipeline ?? null;
  const currentScore = assessmentState?.score ?? current?.effective_dq_score ?? current?.dq_score ?? null;
  const previousScore = previous?.effective_dq_score ?? previous?.dq_score;
  const dqAttention = Boolean(
    current && ((assessmentState?.code && assessmentState.code !== "healthy") || (currentScore !== null && currentScore < 90) || current.failed_rules > 0),
  );
  const operationalAttention = Boolean(primaryPipeline && (primaryPipeline.latest_status_label === "Falha" || primaryPipeline.last_error));
  const contextualIncidentHref = selectedTableId
    ? buildOperationalIncidentCreateHref({
        tableId: selectedTableId,
        schemaName: selectedSchemaName,
        tableName: selectedTableName,
        pipelineName: primaryPipeline?.pipeline_name,
        dagId: primaryPipeline?.dag_id,
        taskName: primaryPipeline?.task_name,
        latestStatusLabel: primaryPipeline?.latest_status_label,
        lastError: primaryPipeline?.last_error,
        lastSuccessAt: primaryPipeline?.last_success_at,
        dqScore: current?.effective_dq_score ?? current?.dq_score ?? null,
        failedRules: current?.failed_rules ?? null,
        sourceType: "platform_ops",
        sourceRefId: selectedTableId,
        origin: "dq_operational_context",
        recurrentDegradation: (incidentSignals?.open_incidents || 0) > 0,
      })
    : null;
  const contextualIncidentsHref = selectedTableId ? `/incidents/tickets?tableId=${selectedTableId}` : null;
  const setDetailTab = useCallback(
    (tab: "data-quality" | "confiabilidade-acao") => {
      router.replace(buildDataQualityDetailTabHref(pathname, searchParams, tab), { scroll: false });
    },
    [pathname, router, searchParams],
  );

  const dqSeries = history.map((h) => h.dq_score);
  const completenessSeries = history.map((h) => h.completeness_pct_avg);
  const freshnessSeries = history.map((h) => h.freshness_seconds / 3600);
  const volumeSeries = history.map((h) => h.row_count);

  const topIssues = useMemo(() => {
    if (!current) return [];
    const previousByColumn = new Map((previous?.columns ?? []).map((col) => [col.column_name, col]));
    return [...current.columns]
      .sort((a, b) => b.null_pct - a.null_pct)
      .slice(0, 5)
      .map((col) => ({
        ...col,
        delta: col.null_pct - (previousByColumn.get(col.column_name)?.null_pct ?? 0),
      }));
  }, [current, previous]);

  const dqDelta =
    currentScore === null
      ? { label: "Sem cálculo", className: "text-muted", icon: TrendingUp }
      : deltaState(currentScore, previousScore);
  const completenessDelta =
    current?.row_count !== undefined && current.row_count <= 0
      ? { label: "Sem cálculo", className: "text-muted", icon: TrendingUp }
      : deltaState(current?.completeness_pct_avg ?? 0, previous?.completeness_pct_avg);
  const volumeDelta = current
    ? current.row_count - (previous?.row_count ?? current.row_count)
    : 0;
  const dimensionRows = observability?.dimensions ?? [];
  const tableObservability = observability?.table ?? null;
  const qualityCoverage = observability?.quality_coverage ?? null;
  const profilingProfileSummary = observability?.profile_summary ?? null;
  const profilingIntelligence = observability?.profiling_intelligence ?? null;
  const { summary: contractImpactSummary, loading: contractImpactLoading, error: contractImpactError } = useContractImpactSummary(selectedTableId);
  const columnObservability = observability?.columns ?? [];
  const historicalObservability = observability?.historical ?? null;
  const historicalViewData = historicalDrilldown ?? historicalObservability;
  const historicalBaselines = historicalViewData?.baselines ?? [];
  const historicalEvents = historicalViewData?.events ?? [];
  const historicalEvidence = historicalViewData?.evidence_samples ?? [];
  const scoreValue = currentScore ?? 0;
  const scoreBadgeTone = currentScore === null ? "neutral" : pctStatus(scoreValue).tone;
  const scoreBadgeLabel = currentScore === null ? "Não calculável" : pctStatus(scoreValue).label;
  const selectedTableRulesStats = useMemo(() => {
    const active = selectedTableRules.filter((rule) => rule.is_active);
    const inactive = selectedTableRules.length - active.length;
    const passed = selectedTableRules.filter(
      (rule) =>
        rule.is_active &&
        rule.last_run_id !== null &&
        rule.last_run_status === "success" &&
        rule.last_violations_count <= 0 &&
        !rule.last_error_message,
    );
    const violated = selectedTableRules.filter(
      (rule) => rule.is_active && rule.last_run_id !== null && rule.last_violations_count > 0 && !rule.last_error_message,
    );
    const technicalErrors = selectedTableRules.filter(
      (rule) => rule.is_active && (rule.last_run_status === "failed" || Boolean(rule.last_error_message)),
    );
    const notExecuted = selectedTableRules.filter((rule) => !rule.last_run_id || rule.last_run_status === null);
    const running = selectedTableRules.filter((rule) => rule.last_run_status === "running" || rule.last_run_status === "queued");
    return {
      total: selectedTableRules.length,
      active: active.length,
      inactive,
      passed: passed.length,
      violated: violated.length,
      technicalErrors: technicalErrors.length,
      notExecuted: notExecuted.length,
      running: running.length,
    };
  }, [selectedTableRules]);

  const tableOpenIncidents = incidentSignals?.open_incidents ?? (tableObservability?.incident?.status === "open" ? 1 : 0);
  const tableCriticalIncidents =
    tableOpenIncidents > 0 && /sev1|critical/i.test(tableObservability?.incident?.severity || "")
      ? tableOpenIncidents
      : 0;

  const selectedProfilingSchedule = profilingScheduleForm.scope === "schema" ? profilingScheduleSchema : profilingScheduleTable;
  const profilingHistoryRows = useMemo(() => {
    const rows = [...profilingHistory];
    if (currentTableRun && !rows.some((item) => item.id === currentTableRun.id)) {
      rows.unshift(currentTableRun);
    }
    return rows;
  }, [currentTableRun, profilingHistory]);
  const latestProfilingRun = profilingHistoryRows[0] ?? null;
  const activeProfilingRun = profilingHistoryRows.find((item) => item.status === "queued" || item.status === "running") ?? null;
  const currentProfilingRun = activeProfilingRun ?? latestProfilingRun;
  const currentProfilingMeta = profilingRunStatusMeta(currentProfilingRun?.status);
  const profilingRunStatus = profilingStatus.buildProfilingStatus({
    runLoading,
    currentRun: currentProfilingRun,
    hasActiveRun: activeProfilingRun !== null,
  });
  const selectedTableSummaryCards = [
    {
      key: "score",
      title: "Score da tabela",
      value: currentScore === null ? "—" : `${scoreValue.toFixed(0)}`,
      subtitle:
        currentScore === null
          ? "Ainda não há leitura consolidada desta tabela."
          : assessmentState?.label || scoreBadgeLabel,
      detail:
        currentScore === null
          ? "Execute o perfilamento para calcular a confiança atual do ativo."
          : current?.operational_penalty_applied
            ? "Score ajustado pela política operacional vigente."
            : "Pontuação consolidada da última execução da tabela.",
      tone: ANALYTIC_TONES.score,
      badge: currentScore === null ? "Sem cálculo" : scoreBadgeLabel,
      icon: ShieldCheck,
    },
    {
      key: "rules",
      title: "Regras ativas",
      value: `${selectedTableRulesStats.active}`,
      subtitle: `${selectedTableRulesStats.total} total · ${selectedTableRulesStats.inactive} inativas`,
      detail:
        selectedTableRulesLoading
          ? "Carregando regras vinculadas ao ativo."
          : selectedTableRulesError
            ? selectedTableRulesError
            : "Validações configuradas para esta tabela e seu contexto operacional.",
      tone: ANALYTIC_TONES.column,
      badge: selectedTableRulesStats.running > 0 ? `${selectedTableRulesStats.running} em execução` : "Tabela monitorada",
      icon: Sparkles,
    },
    {
      key: "results",
      title: "Resultado das regras",
      value: selectedTableRulesStats.total > 0 ? `${selectedTableRulesStats.passed}/${selectedTableRulesStats.total}` : "—",
      subtitle: `${selectedTableRulesStats.violated} violadas · ${selectedTableRulesStats.technicalErrors} erro(s) técnico(s)`,
      detail: "Separação entre regra violada e falha técnica para evitar leitura ambígua do monitoramento.",
      tone: selectedTableRulesStats.violated > 0 || selectedTableRulesStats.technicalErrors > 0 ? ANALYTIC_TONES.issues : ANALYTIC_TONES.completeness,
      badge:
        selectedTableRulesStats.violated > 0
          ? "Há falhas"
          : selectedTableRulesStats.technicalErrors > 0
            ? "Erros técnicos"
            : "Sem falhas",
      icon: AlertTriangle,
    },
    {
      key: "incidents",
      title: "Incidentes da tabela",
      value: `${tableOpenIncidents}`,
      subtitle: `${tableCriticalIncidents} crítico(s) · ${incidentSignals?.suggestions?.length ?? 0} alerta(s)`,
      detail:
        tableOpenIncidents > 0
          ? "Existe acompanhamento operacional em aberto para este ativo."
          : "Não há incidentes abertos associados à tabela selecionada.",
      tone: tableOpenIncidents > 0 ? ANALYTIC_TONES.issues : ANALYTIC_TONES.completeness,
      badge: tableCriticalIncidents > 0 ? "Crítico" : "Sem crítico",
      icon: AlertTriangle,
    },
    {
      key: "freshness",
      title: "Freshness",
      value: current ? humanAge(current.freshness_seconds) : "—",
      subtitle: current ? freshnessStatus(current.freshness_seconds).label : "Sem leitura",
      detail:
        current && current.row_count > 0
          ? tableObservability?.freshness?.within_sla
            ? "Os dados foram atualizados dentro do SLA esperado."
            : "A atualização está fora do prazo esperado e pede verificação."
          : "A tabela ainda não possui leitura suficiente para avaliar atualização.",
      tone: current ? (tableObservability?.freshness?.within_sla ? ANALYTIC_TONES.freshness : ANALYTIC_TONES.issues) : ANALYTIC_TONES.column,
      badge: current ? (tableObservability?.freshness?.within_sla ? "Dentro do SLA" : "Fora do SLA") : "Sem dados",
      icon: Clock3,
    },
    {
      key: "volume",
      title: "Volume analisado",
      value: current ? current.row_count.toLocaleString() : "—",
      subtitle: current ? `${volumeDelta >= 0 ? "+" : ""}${volumeDelta.toLocaleString()} vs anterior` : "Sem leitura",
      detail:
        current && current.row_count > 0
          ? "Quantidade de linhas considerada na última execução de qualidade."
          : "Sem volume suficiente para comparar a evolução do ativo.",
      tone: current ? (volumeDelta >= 0 ? ANALYTIC_TONES.volume : ANALYTIC_TONES.issues) : ANALYTIC_TONES.column,
      badge: current ? "Última execução" : "Sem dados",
      icon: BarChart3,
    },
    {
      key: "execution",
      title: "Última execução",
      value: currentProfilingRun ? `#${currentProfilingRun.id}` : "—",
      subtitle: currentProfilingRun ? currentProfilingMeta.label : "Sem execução recente",
      detail:
        currentProfilingRun
          ? `${formatExecutionTimestamp(currentProfilingRun.started_at || currentProfilingRun.queued_at)} · ${formatDurationMs(currentProfilingRun.duration_ms)}`
          : "Ainda não há execução recente para a tabela selecionada.",
      tone: currentProfilingRun ? ANALYTIC_TONES.score : ANALYTIC_TONES.column,
      badge: currentProfilingRun?.execution_engine ? (currentProfilingRun.execution_engine === "spark" ? "Spark cluster" : "Histórico legado") : "Sem motor",
      icon: TrendingUp,
    },
  ] as const;
  const runButtonLabel = !selectedTableId
    ? "Selecione uma tabela"
    : profilingBusy
      ? profilingBusyReason === "table"
        ? currentProfilingRun?.status === "running"
          ? "Executando..."
          : currentProfilingRun?.status === "queued"
            ? "Na fila..."
            : "Processando..."
        : profilingBusyReason === "schema"
          ? "Schema em execução..."
          : "Solicitando..."
      : currentProfilingRun?.status === "success"
        ? "Executar novamente"
        : "Executar perfilamento";
  const openProfilingRunDetail = useCallback((run: DQJobRun) => {
    setSelectedProfilingRunId(run.id);
    setProfilingRunDrawerOpen(true);
  }, []);
  const closeProfilingRunDetail = useCallback(() => {
    setProfilingRunDrawerOpen(false);
    setSelectedProfilingRunId(null);
    setProfilingRunDetail(null);
    setProfilingRunDetailArtifacts(null);
    setProfilingRunDetailError("");
  }, []);
  const goToProfilingTroubleshooting = useCallback(() => {
    if (!profilingRunDetail) return;
    setHistoryRunIdFilter(profilingRunDetail.dq_run_id ?? profilingRunDetail.id);
    setHistoryView("event");
    closeProfilingRunDetail();
    window.setTimeout(() => {
      document.getElementById("dq-historico")?.scrollIntoView({ behavior: "smooth", block: "start" });
    }, 100);
  }, [closeProfilingRunDetail, profilingRunDetail]);

  useEffect(() => {
    if (!runModalOpen) return;
    const engine = runScope === "schema" ? profilingScheduleSchema?.execution_engine : profilingScheduleTable?.execution_engine;
    setRunExecutionEngine("spark");
  }, [profilingScheduleSchema?.execution_engine, profilingScheduleTable?.execution_engine, runModalOpen, runScope, setRunExecutionEngine]);

  function openProfilingScheduleModal(scope: "table" | "schema") {
    const schedule = scope === "table" ? profilingScheduleTable : profilingScheduleSchema;
    setProfilingScheduleForm(profilingScheduleToForm(schedule, scope));
    setProfilingScheduleModalOpen(true);
  }

  async function saveProfilingSchedule() {
    if (!selectedTableId) return;
    const scope = profilingScheduleForm.scope;
    if (scope === "schema" && (!selectedDatasourceId || !selectedSchemaName.trim())) {
      setProfilingScheduleError("Selecione um schema válido antes de salvar o agendamento.");
      return;
    }
    setProfilingScheduleSaving(true);
    setProfilingScheduleError("");
    try {
      await apiRequest<DQProfilingSchedule>("/v1/dq/profiling/schedules", {
        method: "POST",
        body: JSON.stringify({
          scope,
          table_id: scope === "table" ? selectedTableId : null,
          datasource_id: scope === "schema" ? selectedDatasourceId : null,
          schema_name: scope === "schema" ? selectedSchemaName : null,
          execution_engine: profilingScheduleForm.execution_engine,
          schedule_mode: profilingScheduleForm.schedule_mode,
          schedule_enabled: profilingScheduleForm.schedule_enabled,
          schedule_every_minutes: profilingScheduleForm.schedule_every_minutes,
          schedule_time: profilingScheduleForm.schedule_time || null,
          schedule_day_of_week: profilingScheduleForm.schedule_day_of_week,
          schedule_day_of_month: profilingScheduleForm.schedule_day_of_month,
          schedule_anchor_date: profilingScheduleForm.schedule_anchor_date
            ? new Date(`${profilingScheduleForm.schedule_anchor_date}T00:00:00Z`).toISOString()
            : null,
          recipient_user_ids: profilingScheduleForm.recipient_user_ids,
        }),
      });
      setStatus("Agendamento de perfilamento salvo com sucesso.");
      setProfilingScheduleModalOpen(false);
      await loadProfilingSchedules();
    } catch (error) {
      setProfilingScheduleError((error as Error).message || "Não foi possível salvar o agendamento.");
    } finally {
      setProfilingScheduleSaving(false);
    }
  }

  async function deleteProfilingSchedule() {
    if (!selectedProfilingSchedule) return;
    setProfilingScheduleSaving(true);
    setProfilingScheduleError("");
    try {
      await apiRequest(`/v1/dq/profiling/schedules/${selectedProfilingSchedule.id}`, { method: "DELETE" });
      setStatus("Agendamento de perfilamento removido.");
      setProfilingScheduleModalOpen(false);
      await loadProfilingSchedules();
    } catch (error) {
      setProfilingScheduleError((error as Error).message || "Não foi possível excluir o agendamento.");
    } finally {
      setProfilingScheduleSaving(false);
    }
  }

  function updateProfilingScheduleForm(patch: Partial<DQProfilingScheduleForm>) {
    setProfilingScheduleForm((current) => ({
      ...current,
      ...patch,
    }));
  }

  return (
    <>
      <div className="mb-4 flex items-center justify-between gap-3">
        <DQSubnav />
      </div>
      <div
        className={cn(
          "grid items-start gap-4 transition-[grid-template-columns] duration-300 ease-[cubic-bezier(0.22,1,0.36,1)]",
          treeCollapsed ? "xl:grid-cols-[104px_1fr]" : "xl:grid-cols-[360px_1fr]",
        )}
      >
        <CatalogTreePanel
          nodes={nodes}
          treeCollapsed={treeCollapsed}
          selectedTableId={selectedTableId}
          onToggleCollapsed={() => setTreeCollapsed((current) => !current)}
          onToggleDatasource={(index) => void toggleDatasource(index)}
          onToggleSchema={(datasourceIndex, schemaIndex) => void toggleSchema(datasourceIndex, schemaIndex)}
          onSelectTable={(tableId, tableName, context) => {
            void loadLatest(tableId, tableName, context);
          }}
        />

        <Card className="overflow-hidden border-border/80 shadow-[0_12px_40px_rgba(15,23,42,0.05)]" data-doc-anchor="dq-tree" id="dq-contexto">
          <CardHeader className="flex flex-row items-center justify-between gap-3">
            <div>
              <h2 className="text-base font-semibold">{t("pages.dataQuality.title")}</h2>
              <p className="text-sm text-text-body">{selectedTableName || "Nenhuma tabela selecionada"}</p>
              <h3 className="mt-2 text-sm font-semibold uppercase tracking-[0.18em] text-brand-600">
                {selectedTableId ? "Diagnóstico de qualidade do ativo" : "Visão geral de Data Quality"}
              </h3>
              <p className="mt-1 max-w-3xl text-sm text-text-body">
                {selectedTableId
                  ? "Você está vendo a leitura individual da tabela selecionada. O resumo transversal da plataforma continua abaixo apenas como contexto."
                  : "Nenhuma tabela está selecionada. Esta visão mostra a saúde geral da plataforma e ajuda a priorizar onde investigar primeiro."}
              </p>
              <p className="mt-1 max-w-3xl text-xs leading-5 text-muted">
                {selectedTableId
                  ? "Selecione uma tabela na árvore lateral sempre que quiser detalhar score, regras aplicadas, falhas, tendência e recomendações do ativo."
                  : "Selecione uma tabela na árvore lateral para abrir o diagnóstico detalhado do ativo, com score individual, histórico e sinais operacionais."}
              </p>
              {selectedTableId ? (
                <div
                  className={cn(
                    "mt-4 flex flex-wrap items-center gap-3 rounded-2xl border border-border bg-gradient-to-r from-white via-slate-50 to-accent-50 p-3 shadow-sm",
                    certificationStatusFrameClass(selectedTableInfo?.certification_status),
                    certificationStatusHeaderClass(selectedTableInfo?.certification_status),
                  )}
                >
                  <div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-border bg-surface shadow-sm">
                    <DatabaseTechLogo engine={selectedDbType} variant="default" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="truncate text-2xl font-semibold tracking-tight text-text">{selectedTableName || "Tabela"}</p>
                      <CertificationStatusBadge status={selectedTableInfo?.certification_status} />
                      {selectedTableInfo?.certification_criticality ? (
                        <CertificationCriticalityBadge criticality={selectedTableInfo.certification_criticality} />
                      ) : null}
                      {(selectedTableInfo?.certification_badges || []).map((badge) => (
                        <CertificationUsageBadge badge={badge} key={badge} />
                      ))}
                      <PrivacySummaryStrip
                        privacy={{
                          sensitivity_level: selectedTableInfo?.sensitivity_level,
                          has_personal_data: selectedTableInfo?.has_personal_data,
                          has_sensitive_personal_data: selectedTableInfo?.has_sensitive_personal_data,
                          is_masked: selectedTableInfo?.is_masked,
                          external_sharing: selectedTableInfo?.external_sharing,
                          access_scope: selectedTableInfo?.access_scope,
                        }}
                      />
                      <span className={`rounded-full border px-2.5 py-0.5 text-xs font-medium ${dbEngineMeta(selectedDbType).chipClassName}`}>
                        {dbEngineMeta(selectedDbType).label}
                      </span>
                    </div>
                    <p className="mt-1 text-sm text-text-body">
                      Conexão <span className="font-medium text-text-body">{selectedDatasourceName || "-"}</span> • Banco{" "}
                      <span className="font-medium text-text-body">{selectedDatabaseName || "-"}</span> • Schema{" "}
                      <span className="font-medium text-text-body">{selectedSchemaName || "-"}</span>
                    </p>
                    {selectedTableInfo ? (
                      <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-text-body">
                        <span>Base legal: {selectedTableInfo.legal_basis || "Não informada"}</span>
                        <span>•</span>
                        <span>Retenção: {selectedTableInfo.retention_policy || "Não informada"}</span>
                      </div>
                    ) : null}
                    {!isObservabilityTab && selectedTableId ? (
                      <div className="mt-4 flex flex-wrap gap-2">
                        <Button asChild size="sm" variant="outline">
                          <Link href={`/explorer?tableId=${selectedTableId}`}>Abrir no Explorer</Link>
                        </Button>
                        <Button asChild size="sm" variant="outline">
                          <Link href={contextualIncidentsHref || `/incidents/tickets?tableId=${selectedTableId}`}>Ver incidentes</Link>
                        </Button>
                        {primaryPipeline?.pipeline_history_href ? (
                          <Button asChild size="sm" variant="outline">
                            <Link href={primaryPipeline.pipeline_history_href}>Ver histórico operacional</Link>
                          </Button>
                        ) : null}
                      </div>
                    ) : null}
                    {selectedTableId ? (
                      <div className="mt-4 flex flex-wrap gap-2">
                        {[
                          { key: "data-quality" as const, label: "Data Quality" },
                          { key: "confiabilidade-acao" as const, label: "Confiabilidade & Ação" },
                        ].map((tab) => (
                          <button
                            className={cn(
                              "rounded-full px-3 py-1.5 text-xs font-medium transition",
                              activeDetailTab === tab.key
                                ? "bg-slate-900 text-white shadow-sm"
                                : "bg-bg-subtle text-text-body hover:bg-info-50 hover:text-info-700",
                            )}
                            key={tab.key}
                            onClick={() => setDetailTab(tab.key)}
                            type="button"
                          >
                            {tab.label}
                          </button>
                        ))}
                      </div>
                    ) : null}
                  </div>
                  <div className="flex flex-wrap gap-2 text-xs">
                    <span className="rounded-full border border-border bg-surface px-2.5 py-1 text-text-body">
                      {selectedDatabaseName || "Banco"}
                    </span>
                    <span className="rounded-full border border-info-200 bg-info-50 px-2.5 py-1 text-info-700">
                      {selectedSchemaName || "Schema"}
                    </span>
                    <span className="rounded-full border border-border bg-bg-subtle px-2.5 py-1 font-medium text-text-body">
                      {selectedTableName || "Tabela"}
                    </span>
                  </div>
                </div>
              ) : null}
            </div>
            {!isObservabilityTab && canRun ? (
              <div className="flex flex-col items-end gap-2">
                <Button disabled={profilingBusy || !selectedTableId} onClick={() => setRunModalOpen(true)}>
                  {runButtonLabel}
                </Button>
                {selectedTableId ? <ProfilingRunStatus className="w-full max-w-sm" status={profilingRunStatus} /> : null}
              </div>
            ) : null}
          </CardHeader>
          <CardContent className="space-y-6">
            {!selectedTableId ? (
              <DQPlatformScorecard
                compact
                description="Resumo transversal da cobertura de regras, contratos validados e ativos que precisam de atenção agora."
                error={platformScorecardError}
                loading={platformScorecardLoading}
                summary={platformScorecard}
                title="Scorecard da plataforma"
              />
            ) : null}
            {selectedTableId ? (
              <Card className="border-border/80 bg-surface shadow-[0_12px_32px_rgba(15,23,42,0.05)]">
                <CardContent className="space-y-4 p-5">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-brand-600">Mudança e contrato</p>
                      <h3 className="mt-1 text-base font-semibold text-text">Impacto de schema, contrato e consumidores</h3>
                      <p className="mt-1 text-sm text-text-body">
                        {contractImpactLoading
                          ? "Calculando como a mudança estrutural pode afetar contrato, linhagem e consumo."
                          : contractImpactSummary?.recommendation || "Leitura estrutural do contrato, da linhagem e dos consumidores impactados."}
                      </p>
                    </div>
                    <Badge tone={contractImpactSummary?.schema_state === "breaking" ? "danger" : contractImpactSummary?.schema_state === "warning" ? "warning" : "success"}>
                      {contractImpactSummary?.schema_label || "Sem leitura"}
                    </Badge>
                  </div>
                  {contractImpactError ? <p className="text-sm text-danger-700">{contractImpactError}</p> : null}
                  {contractImpactSummary ? (
                    <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
                      <div className="rounded-2xl border border-border bg-bg-subtle/80 p-4">
                        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-muted">Quebras</p>
                        <p className="mt-2 text-2xl font-semibold text-text">{contractImpactSummary.breaking_changes_count}</p>
                        <p className="mt-1 text-sm text-text-body">Mudanças que pedem revisão antes de publicar ou consumir o ativo</p>
                      </div>
                      <div className="rounded-2xl border border-border bg-bg-subtle/80 p-4">
                        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-muted">Avisos</p>
                        <p className="mt-2 text-2xl font-semibold text-text">{contractImpactSummary.warning_changes_count}</p>
                        <p className="mt-1 text-sm text-text-body">Ajustes que não quebram agora, mas merecem validação</p>
                      </div>
                      <div className="rounded-2xl border border-border bg-bg-subtle/80 p-4">
                        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-muted">Dashboards</p>
                        <p className="mt-2 text-2xl font-semibold text-text">{contractImpactSummary.lineage.dashboard_count}</p>
                        <p className="mt-1 text-sm text-text-body">Consumo analítico diretamente relacionado e potencialmente afetado</p>
                      </div>
                      <div className="rounded-2xl border border-border bg-bg-subtle/80 p-4">
                        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-muted">Downstreams</p>
                        <p className="mt-2 text-2xl font-semibold text-text">{contractImpactSummary.lineage.downstream_count}</p>
                        <p className="mt-1 text-sm text-text-body">Dependências que precisam ser avisadas antes da mudança</p>
                      </div>
                    </div>
                  ) : contractImpactLoading ? (
                    <Skeleton className="h-32 w-full" />
                  ) : null}
                  {contractImpactSummary?.changes?.length ? (
                    <div className="space-y-2">
                      <p className="text-sm font-semibold text-text">Mudanças detectadas no schema</p>
                      <div className="grid gap-2 xl:grid-cols-2">
                        {contractImpactSummary.changes.slice(0, 4).map((change) => (
                          <div className="rounded-2xl border border-border bg-surface p-3" key={`${change.kind}-${change.column_name || "schema"}`}>
                            <div className="flex items-start justify-between gap-3">
                              <div>
                                <p className="text-sm font-medium text-text">{change.column_name || "Schema"}</p>
                                <p className="mt-0.5 text-xs text-muted">{change.kind.replaceAll("_", " ")}</p>
                              </div>
                              <Badge tone={change.breaking ? "danger" : "warning"}>{change.breaking ? "Quebra" : "Aviso"}</Badge>
                            </div>
                            {change.detail ? <p className="mt-2 text-xs text-text-body">{change.detail}</p> : null}
                          </div>
                        ))}
                      </div>
                    </div>
                  ) : null}
                </CardContent>
              </Card>
            ) : null}
            {isObservabilityTab ? (
              <ChunkLoadBoundary
                buttonLabel="Recarregar observabilidade"
                description="O painel de observabilidade tentou carregar um chunk desatualizado enquanto o ambiente recompilava. A página vai recarregar uma vez automaticamente; se persistir, use o botão abaixo."
                path={observabilityPath}
                scope="data-quality-observability"
                title="Observabilidade temporariamente indisponível"
              >
                <ExplorerObservabilityTabContent
                  canonicalAsset={canonicalAsset}
                  canonicalError={canonicalError}
                  canonicalLoading={canonicalLoading}
                  correlationError={correlationSummaryError}
                  correlationLoading={correlationSummaryLoading}
                  correlationSummary={correlationSummary}
                  operationalContext={operationalContext}
                  operationalError={operationalContextError}
                  operationalLoading={operationalContextLoading}
                  selectedTableFullName={
                    [selectedDatasourceName, selectedDatabaseName, selectedSchemaName, selectedTableName].filter(Boolean).join(".") || "Tabela"
                  }
                  selectedTableId={selectedTableId}
                  tableInfo={selectedTableInfo as unknown as ExplorerTableDetailInfo | null}
                />
              </ChunkLoadBoundary>
            ) : (
              <>
            {status ? <p className="text-sm text-text-body">{status}</p> : null}
            {selectedTableId ? (
              <section className="space-y-5 scroll-mt-24" id="dq-resumo-ativo">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <h3 className="text-sm font-semibold uppercase tracking-[0.18em] text-brand-600">Diagnóstico do ativo</h3>
                    <p className="mt-1 text-sm text-text-body">Leitura rápida da tabela em foco, com prioridade para score, regras, incidentes, freshness, volume e execução.</p>
                  </div>
                  <Badge tone="neutral">{selectedTableRulesStats.total} regra(s)</Badge>
                </div>
                <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                  {selectedTableSummaryCards.map((card) => (
                    <MetricCard
                      badge={<Badge tone={card.tone === ANALYTIC_TONES.issues ? "warning" : card.tone === ANALYTIC_TONES.freshness ? "accent" : "success"}>{card.badge}</Badge>}
                      icon={<card.icon className="h-5 w-5" />}
                      key={card.key}
                      subtitle={card.subtitle}
                      tone={card.tone}
                      title={card.title}
                      value={card.value}
                    >
                      <p className="text-sm leading-6 text-text-body">{card.detail}</p>
                    </MetricCard>
                  ))}
                </div>
              </section>
            ) : null}
            {selectedTableId ? (
              <section className="space-y-4 scroll-mt-24" id="dq-regras-ativo">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <h3 className="text-sm font-semibold uppercase tracking-[0.18em] text-brand-600">Regras aplicadas</h3>
                    <p className="mt-1 text-sm text-text-body">Validações ativas, resultado da última execução e o que já foi testado neste ativo.</p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <Badge tone={selectedTableRulesStats.active > 0 ? "success" : "neutral"}>{selectedTableRulesStats.active} ativas</Badge>
                    <Badge tone={selectedTableRulesStats.violated > 0 ? "warning" : "success"}>{selectedTableRulesStats.violated} violadas</Badge>
                    <Badge tone={selectedTableRulesStats.technicalErrors > 0 ? "danger" : "success"}>{selectedTableRulesStats.technicalErrors} erro(s) técnico(s)</Badge>
                  </div>
                </div>

                <Card className="border-border/80 bg-surface shadow-[0_10px_30px_rgba(15,23,42,0.04)]">
                  <CardContent className="space-y-4 p-5">
                    <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
                      <div className="rounded-2xl border border-border bg-bg-subtle/80 p-4">
                        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-muted">Total de regras</p>
                        <p className="mt-2 text-2xl font-semibold text-text">{selectedTableRulesStats.total}</p>
                        <p className="mt-1 text-sm text-text-body">Regras cadastradas para o ativo em foco.</p>
                      </div>
                      <div className="rounded-2xl border border-border bg-bg-subtle/80 p-4">
                        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-muted">Passaram</p>
                        <p className="mt-2 text-2xl font-semibold text-text">{selectedTableRulesStats.passed}</p>
                        <p className="mt-1 text-sm text-text-body">Regras que executaram e não encontraram violação.</p>
                      </div>
                      <div className="rounded-2xl border border-border bg-bg-subtle/80 p-4">
                        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-muted">Não executadas</p>
                        <p className="mt-2 text-2xl font-semibold text-text">{selectedTableRulesStats.notExecuted}</p>
                        <p className="mt-1 text-sm text-text-body">Regras que ainda não foram avaliadas no ciclo atual.</p>
                      </div>
                      <div className="rounded-2xl border border-border bg-bg-subtle/80 p-4">
                        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-muted">Em fila / execução</p>
                        <p className="mt-2 text-2xl font-semibold text-text">{selectedTableRulesStats.running}</p>
                        <p className="mt-1 text-sm text-text-body">Regras aguardando processamento ou em andamento.</p>
                      </div>
                    </div>

                    {selectedTableRulesLoading ? (
                      <Skeleton className="h-36 w-full" />
                    ) : selectedTableRulesError ? (
                      <p className="text-sm text-danger-700">{selectedTableRulesError}</p>
                    ) : selectedTableRules.length ? (
                      <div className="overflow-x-auto rounded-2xl border border-border">
                        <table className="min-w-full text-sm">
                          <thead className="bg-bg-subtle/80 text-left text-xs uppercase tracking-[0.12em] text-muted">
                            <tr>
                              <th className="px-3 py-2">Nome da regra</th>
                              <th className="px-3 py-2">Pilar</th>
                              <th className="px-3 py-2">Severidade</th>
                              <th className="px-3 py-2">Status</th>
                              <th className="px-3 py-2">Resultado</th>
                              <th className="px-3 py-2">Última execução</th>
                              <th className="px-3 py-2">Ação</th>
                            </tr>
                          </thead>
                          <tbody>
                            {selectedTableRules.map((rule) => (
                              <tr className="border-t border-border odd:bg-surface even:bg-bg-subtle/40" key={rule.id}>
                                <td className="px-3 py-3">
                                  <div className="font-medium text-text">{rule.name}</div>
                                  <div className="mt-0.5 text-xs text-muted">{rule.description || "Sem descrição"}</div>
                                </td>
                                <td className="px-3 py-3 text-text-body">{ruleTypeLabel(rule.rule_type)}</td>
                                <td className="px-3 py-3">
                                  <Badge tone={rule.severity === "critical" || rule.severity === "high" ? "warning" : rule.severity === "medium" ? "neutral" : "success"}>
                                    {ruleSeverityLabel(rule.severity)}
                                  </Badge>
                                </td>
                                <td className="px-3 py-3">
                                  <Badge tone={rule.is_active ? "success" : "neutral"}>{rule.is_active ? "Ativa" : "Inativa"}</Badge>
                                </td>
                                <td className="px-3 py-3">
                                  <Badge
                                    tone={
                                      tableRuleExecutionTone(rule) === "success"
                                        ? "success"
                                        : tableRuleExecutionTone(rule) === "warning"
                                          ? "warning"
                                          : tableRuleExecutionTone(rule) === "danger"
                                            ? "danger"
                                            : "neutral"
                                    }
                                  >
                                    {tableRuleExecutionLabel(rule)}
                                  </Badge>
                                </td>
                                <td className="px-3 py-3 text-text-body">
                                  {rule.last_run_at ? new Date(rule.last_run_at).toLocaleString("pt-BR") : "Sem execução"}
                                </td>
                                <td className="px-3 py-3">
                                  <Button asChild size="sm" variant="ghost">
                                    <Link href={`/data-quality/rules?rule_id=${rule.id}`}>Abrir regra</Link>
                                  </Button>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    ) : (
                      <EmptyState
                        title="Nenhuma regra ativa para esta tabela"
                        description="Esta tabela ainda não possui validações suficientes para medir qualidade com confiança. Sem regras, problemas como nulos indevidos, duplicidades ou atrasos podem passar despercebidos."
                      />
                    )}
                  </CardContent>
                </Card>
              </section>
            ) : null}
            {selectedTableId ? (
              <section className="space-y-4 scroll-mt-24" id="dq-profiling-inteligente">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <h3 className="text-sm font-semibold uppercase tracking-[0.18em] text-brand-600">Profiling inteligente</h3>
                    <p className="mt-1 text-sm text-text-body">
                      Leitura observada por tabela com score consolidado, cobertura formal e sugestões automáticas de regra.
                    </p>
                  </div>
                  <Badge tone={profilingIntelligence?.consolidated_score !== null && profilingIntelligence?.consolidated_score !== undefined ? "success" : "neutral"}>
                    {profilingIntelligence?.weight_profile || "perfil padrão"}
                  </Badge>
                </div>
                <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                  <Card className="border-border/80 bg-surface shadow-[0_10px_30px_rgba(15,23,42,0.04)]">
                    <CardContent className="p-5">
                      <p className="text-xs uppercase tracking-[0.18em] text-brand-600">Score observado</p>
                      <p className="mt-2 text-3xl font-semibold text-text">
                        {profilingIntelligence?.observed_score !== null && profilingIntelligence?.observed_score !== undefined
                          ? profilingIntelligence.observed_score.toFixed(1)
                          : "—"}
                      </p>
                      <p className="mt-2 text-sm text-text-body">Medição baseada em profiling automático e sinais operacionais.</p>
                    </CardContent>
                  </Card>
                  <Card className="border-border/80 bg-surface shadow-[0_10px_30px_rgba(15,23,42,0.04)]">
                    <CardContent className="p-5">
                      <p className="text-xs uppercase tracking-[0.18em] text-brand-600">Score formal</p>
                      <p className="mt-2 text-3xl font-semibold text-text">
                        {profilingIntelligence?.formal_score !== null && profilingIntelligence?.formal_score !== undefined
                          ? profilingIntelligence.formal_score.toFixed(1)
                          : "—"}
                      </p>
                      <p className="mt-2 text-sm text-text-body">Baseado nas regras configuradas para esta tabela.</p>
                    </CardContent>
                  </Card>
                  <Card className="border-border/80 bg-surface shadow-[0_10px_30px_rgba(15,23,42,0.04)]">
                    <CardContent className="p-5">
                      <p className="text-xs uppercase tracking-[0.18em] text-brand-600">Cobertura</p>
                      <p className="mt-2 text-3xl font-semibold text-text">
                        {profilingIntelligence?.coverage_score !== null && profilingIntelligence?.coverage_score !== undefined
                          ? `${profilingIntelligence.coverage_score.toFixed(1)}%`
                          : "—"}
                      </p>
                      <p className="mt-2 text-sm text-text-body">Quantas dimensões já possuem evidência e quantas ainda precisam de regra formal.</p>
                    </CardContent>
                  </Card>
                  <Card className="border-border/80 bg-surface shadow-[0_10px_30px_rgba(15,23,42,0.04)]">
                    <CardContent className="p-5">
                      <p className="text-xs uppercase tracking-[0.18em] text-brand-600">Qualidade consolidada</p>
                      <p className="mt-2 text-3xl font-semibold text-text">
                        {profilingIntelligence?.consolidated_score !== null && profilingIntelligence?.consolidated_score !== undefined
                          ? profilingIntelligence.consolidated_score.toFixed(1)
                          : "—"}
                      </p>
                      <p className="mt-2 text-sm text-text-body">{profilingIntelligence?.quality_message || "Sem mensagem de qualidade disponível."}</p>
                    </CardContent>
                  </Card>
                </div>
                <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
                  <Card className="border-border/80 bg-surface shadow-[0_10px_30px_rgba(15,23,42,0.04)]">
                    <CardContent className="space-y-3 p-5">
                      <div>
                        <p className="text-sm font-semibold text-text">Resumo do profiling</p>
                        <p className="text-sm text-text-body">Métricas principais da última execução automática para a tabela selecionada.</p>
                      </div>
                      {profilingProfileSummary ? (
                        <div className="grid gap-3 md:grid-cols-2">
                          <div className="rounded-2xl border border-border bg-bg-subtle/80 p-3">
                            <p className="text-xs text-muted">Linhas</p>
                            <p className="mt-1 text-lg font-semibold text-text">{profilingProfileSummary.row_count?.toLocaleString() || "—"}</p>
                          </div>
                          <div className="rounded-2xl border border-border bg-bg-subtle/80 p-3">
                            <p className="text-xs text-muted">Colunas</p>
                            <p className="mt-1 text-lg font-semibold text-text">{profilingProfileSummary.column_count ?? "—"}</p>
                          </div>
                          <div className="rounded-2xl border border-border bg-bg-subtle/80 p-3">
                            <p className="text-xs text-muted">Freshness</p>
                            <p className="mt-1 text-lg font-semibold text-text">
                              {profilingProfileSummary.freshness_seconds !== null && profilingProfileSummary.freshness_seconds !== undefined
                                ? humanAge(profilingProfileSummary.freshness_seconds)
                                : "—"}
                            </p>
                          </div>
                          <div className="rounded-2xl border border-border bg-bg-subtle/80 p-3">
                            <p className="text-xs text-muted">Chave de negócio</p>
                            <p className="mt-1 text-lg font-semibold text-text">
                              {profilingProfileSummary.duplicate_business_key_count !== null &&
                              profilingProfileSummary.duplicate_business_key_count !== undefined
                                ? profilingProfileSummary.duplicate_business_key_count.toLocaleString()
                                : "—"}
                            </p>
                          </div>
                        </div>
                      ) : (
                        <EmptyState
                          title="Sem resumo de profiling"
                          description="A execução mais recente ainda não gerou um resumo consolidado de profiling."
                        />
                      )}
                    </CardContent>
                  </Card>
                  <Card className="border-border/80 bg-surface shadow-[0_10px_30px_rgba(15,23,42,0.04)]">
                    <CardContent className="space-y-3 p-5">
                      <div>
                        <p className="text-sm font-semibold text-text">Sugestões automáticas</p>
                        <p className="text-sm text-text-body">Regras sugeridas a partir do profiling e do padrão dos dados.</p>
                      </div>
                      {profilingIntelligence?.rule_suggestions?.length ? (
                        <div className="space-y-2">
                          {(profilingIntelligence.rule_suggestions as Array<Record<string, unknown>>).slice(0, 4).map((suggestion, index) => {
                            const reason = typeof suggestion.reason === "string" ? suggestion.reason : null;
                            const ruleType = typeof suggestion.suggested_rule_type === "string" ? suggestion.suggested_rule_type : "rule";
                            const dimension = typeof suggestion.dimension === "string" ? suggestion.dimension : null;
                            const confidence = typeof suggestion.confidence_score === "number" ? suggestion.confidence_score : null;
                            return (
                              <div className="rounded-2xl border border-border bg-bg-subtle/80 p-3" key={`${ruleType}-${dimension}-${index}`}>
                                <div className="flex items-start justify-between gap-3">
                                  <div>
                                    <p className="text-sm font-medium text-text">{ruleType.replaceAll("_", " ")}</p>
                                    <p className="mt-0.5 text-xs text-muted">{reason || "Sugestão automática baseada em profiling."}</p>
                                  </div>
                                  <Badge tone={confidence !== null && confidence >= 0.85 ? "success" : confidence !== null && confidence >= 0.7 ? "warning" : "neutral"}>
                                    {confidence !== null ? `${(confidence * 100).toFixed(0)}%` : "—"}
                                  </Badge>
                                </div>
                                {dimension ? <p className="mt-2 text-xs text-muted">Dimensão: {dimension}</p> : null}
                              </div>
                            );
                          })}
                        </div>
                      ) : (
                        <EmptyState
                          title="Nenhuma sugestão disponível"
                          description="O profiling mais recente não trouxe indícios suficientes para sugerir regras automáticas."
                        />
                      )}
                    </CardContent>
                  </Card>
                </div>
              </section>
            ) : null}
            {selectedTableId ? (
              <section className="space-y-4 scroll-mt-24" id="dq-incidentes-ativos">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <h3 className="text-sm font-semibold uppercase tracking-[0.18em] text-brand-600">Incidentes e alertas</h3>
                    <p className="mt-1 text-sm text-text-body">Problemas abertos ou sugeridos para a tabela selecionada.</p>
                  </div>
                  <Badge tone={tableOpenIncidents > 0 ? "warning" : "success"}>{tableOpenIncidents} aberto(s)</Badge>
                </div>
                <div className="grid gap-4 xl:grid-cols-2">
                  <Card className="border-border/80 bg-surface shadow-[0_10px_30px_rgba(15,23,42,0.04)]">
                    <CardContent className="space-y-3 p-5">
                      <div className="flex flex-wrap gap-2">
                        <Badge tone={tableOpenIncidents > 0 ? "warning" : "success"}>{tableOpenIncidents > 0 ? "Com atenção" : "Sem incidentes"}</Badge>
                        <Badge tone={tableCriticalIncidents > 0 ? "danger" : "neutral"}>{tableCriticalIncidents} crítico(s)</Badge>
                      </div>
                      <p className="text-sm text-text-body">
                        {tableOpenIncidents > 0
                          ? "Existe acompanhamento operacional aberto para esta tabela e ele deve ser revisado antes de ampliar o uso."
                          : "Não há incidentes ativos associados ao ativo selecionado neste momento."}
                      </p>
                      {incidentSignals?.suggestions?.length ? (
                        <div className="space-y-2">
                          {incidentSignals.suggestions.slice(0, 4).map((suggestion) => (
                            <div className="rounded-2xl border border-border bg-bg-subtle/80 p-3" key={suggestion.key}>
                              <div className="flex items-start justify-between gap-3">
                                <div>
                                  <p className="text-sm font-medium text-text">{suggestion.title}</p>
                                  <p className="mt-0.5 text-xs text-muted">{suggestion.detail}</p>
                                </div>
                                <Badge tone={suggestion.severity === "sev1" ? "danger" : suggestion.severity === "sev2" ? "warning" : "neutral"}>
                                  {suggestion.severity_label}
                                </Badge>
                              </div>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <EmptyState
                          title="Nenhum incidente aberto para esta tabela"
                          description="Continue acompanhando freshness, regras críticas e histórico de execuções para detectar novos riscos."
                        />
                      )}
                    </CardContent>
                  </Card>
                  <Card className="border-border/80 bg-surface shadow-[0_10px_30px_rgba(15,23,42,0.04)]">
                    <CardContent className="space-y-3 p-5">
                      <div className="space-y-1">
                        <p className="text-sm font-semibold text-text">Dimensões de qualidade</p>
                        <p className="text-sm text-text-body">Leitura por tipo de risco monitorado nesta tabela.</p>
                        {qualityCoverage ? (
                          <p className="text-xs text-muted">
                            Cobertura: {qualityCoverage.summary}
                            {qualityCoverage.formal_summary ? ` · Regras formais: ${qualityCoverage.formal_summary}` : ""}
                          </p>
                        ) : null}
                        {qualityCoverage ? (
                          <p className="text-[11px] text-muted">
                            Evidência automática não substitui regra formal para tabelas críticas.
                          </p>
                        ) : null}
                      </div>
                      {dimensionRows.length ? (
                        <div className="grid gap-3 sm:grid-cols-2">
                          {dimensionRows.map((dimension) => (
                            <div className="rounded-2xl border border-border bg-bg-subtle/80 p-3" key={dimension.key}>
                              <div className="flex items-start justify-between gap-3">
                                <div>
                                  <p className="text-sm font-medium text-text">{dimension.label}</p>
                                  <p className="mt-0.5 text-xs text-muted">{dimension.summary || dimension.detail || dimension.status_label}</p>
                                </div>
                                <Badge tone={(dimension.evaluation_tone || dimension.tone) as "neutral" | "accent" | "success" | "warning" | "danger"}>
                                  {dimension.evaluation_label || dimension.status_label}
                                </Badge>
                              </div>
                              <div className="mt-3 space-y-1 text-xs text-text-body">
                                <div className="flex flex-wrap items-center gap-2">
                                  <span>
                                    {dimension.status !== "not_evaluated" && dimension.evidence_level && dimension.evidence_level !== "formal_rule"
                                      ? "Score observado"
                                      : "Score"}
                                    : {dimension.score !== null ? dimension.score.toFixed(0) : "—"}
                                  </span>
                                  <span>•</span>
                                  <span>{dimension.coverage_label || "Cobertura: N/D"}</span>
                                </div>
                                <div className="flex flex-wrap items-center gap-2">
                                  <span>Regras formais: {dimension.formal_rules_count ?? dimension.configured_rules_count ?? dimension.rules_count ?? 0}</span>
                                  <span>•</span>
                                  {dimension.status !== "not_evaluated" ? (
                                    <span>Tendência: {dimension.trend?.label || "Sem histórico"}</span>
                                  ) : (
                                    <span>Tendência: Sem histórico</span>
                                  )}
                                </div>
                                {dimension.metric_label || dimension.metric_value !== null ? (
                                  <p className="text-[11px] text-muted">
                                    {dimension.metric_label || (dimension.metric_value !== null ? String(dimension.metric_value) : null)}
                                  </p>
                                ) : null}
                                {dimension.metric_label ? (
                                  <p className="text-[11px] leading-5 text-muted">{dimension.explanation}</p>
                                ) : null}
                                {dimension.recommended_action ? (
                                  <div className="pt-1">
                                    <Button asChild size="sm" variant="ghost" className="h-8 px-2 text-xs">
                                      <Link href="/data-quality/rules">{dimension.recommended_action}</Link>
                                    </Button>
                                  </div>
                                ) : null}
                              </div>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <EmptyState
                          title="Sem dimensões suficientes para esta tabela"
                          description="Ainda não há leitura consolidada suficiente para detalhar completude, validade, consistência e outras dimensões."
                        />
                      )}
                    </CardContent>
                  </Card>
                </div>
              </section>
            ) : null}
            {selectedTableId ? (
              <section className="grid gap-4 xl:grid-cols-[1.2fr_0.8fr]">
                <div className="rounded-3xl border border-border/80 bg-[linear-gradient(180deg,#ffffff_0%,#fbfdff_100%)] p-4 shadow-[0_12px_32px_rgba(15,23,42,0.05)]">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-[0.16em] text-muted">Execução de perfilamento</p>
                      <h3 className="mt-1 text-base font-semibold text-text">
                        {currentProfilingRun ? `Execução #${currentProfilingRun.id}` : "Nenhuma execução recente"}
                      </h3>
                      <p className="mt-1 text-sm text-text-body">
                        {currentProfilingRun
                        ? currentProfilingMeta.detail
                          : "Execute o perfilamento para acompanhar fila, motor, duração e resultado em tempo quase real."}
                      </p>
                    </div>
                    <Badge tone={currentProfilingMeta.tone}>{currentProfilingMeta.label}</Badge>
                  </div>

                  <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                    <div className="rounded-2xl border border-border bg-surface px-3 py-2">
                      <p className="text-xs text-muted">Motor de execução</p>
                      <p className="mt-1 text-sm font-medium text-text">
                        {currentProfilingRun?.execution_engine === "spark"
                          ? "Spark cluster"
                          : currentProfilingRun?.execution_engine === "python"
                            ? "Histórico legado"
                            : "—"}
                      </p>
                    </div>
                    <div className="rounded-2xl border border-border bg-surface px-3 py-2">
                      <p className="text-xs text-muted">Como foi disparada</p>
                      <p className="mt-1 text-sm font-medium text-text">{executionOriginLabel(currentProfilingRun?.trigger_source)}</p>
                    </div>
                    <div className="rounded-2xl border border-border bg-surface px-3 py-2">
                      <p className="text-xs text-muted">Horário de início</p>
                      <p className="mt-1 text-sm font-medium text-text">{formatExecutionTimestamp(currentProfilingRun?.started_at || currentProfilingRun?.queued_at)}</p>
                    </div>
                    <div className="rounded-2xl border border-border bg-surface px-3 py-2">
                      <p className="text-xs text-muted">Tempo total</p>
                      <p className="mt-1 text-sm font-medium text-text">{formatDurationMs(currentProfilingRun?.duration_ms)}</p>
                    </div>
                  </div>

                  <div className="mt-4 flex flex-wrap items-center gap-2 text-sm text-text-body">
                    <span className="rounded-full border border-border bg-surface px-2.5 py-1">
                      Última atualização: {formatExecutionTimestamp(currentProfilingRun?.finished_at || currentProfilingRun?.started_at || currentProfilingRun?.queued_at)}
                    </span>
                    <span className="rounded-full border border-border bg-surface px-2.5 py-1">
                      Tabela analisada: {selectedTableName || "—"}
                    </span>
                    {currentProfilingRun?.requested_by_user_name ? (
                      <span className="rounded-full border border-border bg-surface px-2.5 py-1">
                        Solicitado por: {currentProfilingRun.requested_by_user_name}
                      </span>
                    ) : null}
                  </div>

                  {currentProfilingRun?.error_message ? (
                    <div className="mt-4 rounded-2xl border border-danger-200 bg-danger-50/70 p-3 text-sm text-danger-700">
                      <p className="font-medium">Resumo do erro</p>
                      <p className="mt-1">{currentProfilingRun.error_message}</p>
                    </div>
                  ) : null}

                  <div className="mt-4 flex flex-wrap gap-2">
                    <Button
                      disabled={profilingBusy || !selectedTableId}
                      onClick={() => setRunModalOpen(true)}
                      size="sm"
                      variant="outline"
                    >
                      {runButtonLabel}
                    </Button>
                    <Button disabled={profilingHistoryLoading} onClick={() => void refreshProfilingHistory()} size="sm" variant="ghost">
                      {profilingHistoryLoading ? "Atualizando..." : "Atualizar histórico"}
                    </Button>
                  </div>
                  {selectedTableId ? <ProfilingRunStatus className="mt-2 max-w-xl" status={profilingRunStatus} /> : null}
                </div>

                <div className="rounded-3xl border border-border/80 bg-surface p-4 shadow-[0_12px_32px_rgba(15,23,42,0.05)]">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-[0.16em] text-muted">Histórico recente</p>
                      <h3 className="text-base font-semibold text-text">Últimas execuções</h3>
                      <p className="mt-1 text-xs text-muted">Compare tendência, recorrência e desfecho das últimas execuções de perfilamento.</p>
                    </div>
                    <Badge tone="neutral">{profilingHistoryRows.length}</Badge>
                  </div>
                  {profilingHistoryError ? <p className="mt-3 text-sm text-danger-700">{profilingHistoryError}</p> : null}
                  {profilingHistoryLoading ? <Skeleton className="mt-4 h-40 w-full" /> : null}
                  {!profilingHistoryLoading && profilingHistoryRows.length ? (
                    <div className="mt-4 max-h-80 overflow-auto rounded-2xl border border-border/80">
                      <table className="min-w-full text-sm">
                        <thead className="bg-bg-subtle/80 text-left text-xs uppercase tracking-[0.12em] text-muted">
                          <tr>
                            <th className="px-3 py-2">Execução</th>
                            <th className="px-3 py-2">Status</th>
                            <th className="px-3 py-2">Motor</th>
                            <th className="px-3 py-2">Disparo</th>
                            <th className="px-3 py-2">Início</th>
                            <th className="px-3 py-2">Tempo</th>
                          </tr>
                        </thead>
                        <tbody>
                          {profilingHistoryRows.map((run) => {
                            const meta = profilingRunStatusMeta(run.status);
                            return (
                              <tr className={cn("border-t border-border/60", run.id === currentProfilingRun?.id && "bg-info-50/60")} key={run.id}>
                                <td className="px-3 py-2">
                                  <div className="font-medium text-text">#{run.id}</div>
                                  <div className="text-xs text-muted">{run.requested_by_user_name || run.requested_by_user_email || "Sistema"}</div>
                                  <Button className="mt-2 h-7 px-2.5 text-xs" onClick={() => openProfilingRunDetail(run)} size="sm" variant="ghost">
                                    Ver detalhe
                                  </Button>
                                </td>
                                <td className="px-3 py-2">
                                  <Badge tone={meta.tone}>{meta.label}</Badge>
                                  {run.error_message ? <p className="mt-1 max-w-[240px] truncate text-xs text-danger-700">{run.error_message}</p> : null}
                                </td>
                                <td className="px-3 py-2 text-text-body">{run.execution_engine}</td>
                                <td className="px-3 py-2 text-text-body">{executionOriginLabel(run.trigger_source)}</td>
                                <td className="px-3 py-2 text-text-body">{formatExecutionTimestamp(run.started_at || run.queued_at)}</td>
                                <td className="px-3 py-2 text-text-body">{formatDurationMs(run.duration_ms)}</td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  ) : (
                    !profilingHistoryLoading && (
                      <EmptyState
                        title="Sem histórico de perfilamento"
                        description="Ainda não há execuções recentes para esta tabela. Após novas execuções, aqui você acompanha tendência, falhas e recorrência."
                      />
                    )
                  )}
                </div>
              </section>
            ) : null}
            {!selectedTableId ? <EmptyState title="Sem tabela selecionada" description="Escolha uma tabela para ver score, tendência, histórico e sinais operacionais." /> : null}
            {selectedTableId && loadingLatest ? <Skeleton className="h-48 w-full" /> : null}
            {selectedTableId && !loadingLatest && latestState === "empty" ? (
              <Card
                className={cn(
                  "border-dashed border-border-strong bg-bg-subtle/70",
                  certificationStatusFrameClass(selectedTableInfo?.certification_status),
                  certificationStatusHeaderClass(selectedTableInfo?.certification_status),
                )}
              >
                <CardContent className="py-10 text-center">
                  <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-info-100 text-info-600">
                    <AlertTriangle className="h-5 w-5" />
                  </div>
                  <h3 className="mt-4 text-base font-semibold text-text">Sem métricas detalhadas</h3>
                  <p className="mx-auto mt-2 max-w-xl text-sm text-text-body">{latestStateMessage}</p>
                  {selectedTableInfo ? (
                    <div className="mt-4 flex flex-wrap items-center justify-center gap-2">
                      <CertificationStatusBadge status={selectedTableInfo.certification_status} />
                      {selectedTableInfo.certification_criticality ? (
                        <CertificationCriticalityBadge criticality={selectedTableInfo.certification_criticality} />
                      ) : null}
                      {(selectedTableInfo.certification_badges || []).map((badge) => (
                        <CertificationUsageBadge badge={badge} key={badge} />
                      ))}
                      <PrivacySummaryStrip
                        compact
                        privacy={{
                          sensitivity_level: selectedTableInfo.sensitivity_level,
                          has_personal_data: selectedTableInfo.has_personal_data,
                          has_sensitive_personal_data: selectedTableInfo.has_sensitive_personal_data,
                          is_masked: selectedTableInfo.is_masked,
                          external_sharing: selectedTableInfo.external_sharing,
                          access_scope: selectedTableInfo.access_scope,
                        }}
                      />
                      <AccessRoleBadges className="justify-center" roles={selectedTableInfo.access_roles || []} />
                    </div>
                  ) : null}
                  {canRun ? (
                    <div className="mt-5 flex flex-col items-center gap-2">
                      <Button disabled={profilingBusy || !selectedTableId} onClick={() => setRunModalOpen(true)}>
                        {runButtonLabel}
                      </Button>
                      {selectedTableId ? <ProfilingRunStatus className="w-full max-w-sm" status={profilingRunStatus} /> : null}
                    </div>
                  ) : null}
              </CardContent>
            </Card>
          ) : null}
            {selectedTableId && !loadingLatest && latestState === "error" ? (
              <Card className="border-danger-200 bg-danger-50/60">
                <CardContent className="py-10 text-center">
                  <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-danger-100 text-danger-600">
                    <AlertTriangle className="h-5 w-5" />
                  </div>
                  <h3 className="mt-4 text-base font-semibold text-text">Não foi possível carregar os detalhes</h3>
                  <p className="mx-auto mt-2 max-w-xl text-sm text-text-body">{latestStateMessage}</p>
                  <div className="mt-5">
                    <Button onClick={() => void loadLatest(selectedTableId, selectedTableName)} variant="outline">
                      Tentar novamente
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ) : null}
            {schemaRunProgress ? <SchemaRunProgress items={schemaRunItems} progress={schemaRunProgress} /> : null}
            {selectedTableId ? (
              <Card className="border-border/80 bg-surface shadow-[0_12px_40px_rgba(15,23,42,0.05)]" id="dq-agendamento">
                <CardHeader className="flex flex-row items-center justify-between gap-3">
                  <div>
                    <h3 className="text-sm font-semibold text-text">Agendamento de perfilamento</h3>
                    <p className="mt-1 text-sm text-text-body">Defina quando a tabela ou o schema serão perfilados e como a equipe será avisada em caso de falha.</p>
                  </div>
                  <Badge tone="neutral">{profilingScheduleTable || profilingScheduleSchema ? "Configurado" : "Sem agendamento"}</Badge>
                </CardHeader>
                <CardContent className="space-y-4">
                  {profilingScheduleLoading ? <Skeleton className="h-24 w-full" /> : null}
                  {profilingScheduleError ? <p className="text-sm text-danger-700">{profilingScheduleError}</p> : null}
                  {!profilingScheduleLoading ? (
                    <div className="grid gap-3 xl:grid-cols-2">
                      <div className="rounded-2xl border border-border bg-surface/80 p-4 shadow-sm">
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <p className="text-sm font-semibold text-text">Agendamento da tabela</p>
                            <p className="text-xs text-muted">Execução individual para a tabela selecionada, com ciclo próprio de validação.</p>
                          </div>
                          <Badge tone={profilingScheduleTable ? "success" : "neutral"}>{profilingScheduleTable ? "Configurado" : "Sem agendamento"}</Badge>
                        </div>
                        <p className="mt-2 text-xs text-muted">
                          Motor atual: {profilingScheduleTable ? (profilingScheduleTable.execution_engine === "spark" ? "Spark cluster" : "Histórico legado") : "Spark cluster"}.
                        </p>
                        <p className="mt-3 text-sm text-text-body">{formatProfilingScheduleSummary(profilingScheduleTable)}</p>
                        <div className="mt-3 flex flex-wrap gap-2 text-xs text-muted">
                          <span>Última execução: {profilingScheduleTable?.schedule_last_run_at ? new Date(profilingScheduleTable.schedule_last_run_at).toLocaleString("pt-BR") : "Sem registros"}</span>
                          <span>•</span>
                          <span>Próxima: {profilingScheduleTable?.schedule_next_run_at ? new Date(profilingScheduleTable.schedule_next_run_at).toLocaleString("pt-BR") : "Aguardando configuração"}</span>
                        </div>
                        <div className="mt-4 flex flex-wrap gap-2">
                          <Button onClick={() => openProfilingScheduleModal("table")} size="sm" variant="outline">
                            {profilingScheduleTable ? "Editar agendamento da tabela" : "Configurar agendamento da tabela"}
                          </Button>
                        </div>
                      </div>
                      <div className="rounded-2xl border border-border bg-surface/80 p-4 shadow-sm">
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <p className="text-sm font-semibold text-text">Agendamento do schema</p>
                            <p className="text-xs text-muted">Recorrência compartilhada para o schema atual, útil quando várias tabelas seguem a mesma rotina.</p>
                          </div>
                          <Badge tone={profilingScheduleSchema ? "success" : "neutral"}>{profilingScheduleSchema ? "Configurado" : "Sem agendamento"}</Badge>
                        </div>
                        <p className="mt-2 text-xs text-muted">
                          Motor atual: {profilingScheduleSchema ? (profilingScheduleSchema.execution_engine === "spark" ? "Spark cluster" : "Histórico legado") : "Spark cluster"}.
                        </p>
                        <p className="mt-3 text-sm text-text-body">{formatProfilingScheduleSummary(profilingScheduleSchema)}</p>
                        <div className="mt-3 flex flex-wrap gap-2 text-xs text-muted">
                          <span>Última execução: {profilingScheduleSchema?.schedule_last_run_at ? new Date(profilingScheduleSchema.schedule_last_run_at).toLocaleString("pt-BR") : "Sem registros"}</span>
                          <span>•</span>
                          <span>Próxima: {profilingScheduleSchema?.schedule_next_run_at ? new Date(profilingScheduleSchema.schedule_next_run_at).toLocaleString("pt-BR") : "Aguardando configuração"}</span>
                        </div>
                        <div className="mt-4 flex flex-wrap gap-2">
                          <Button
                            disabled={!selectedDatasourceId || !selectedSchemaName}
                            onClick={() => openProfilingScheduleModal("schema")}
                            size="sm"
                            variant="outline"
                          >
                            {profilingScheduleSchema ? "Editar agendamento do schema" : "Configurar agendamento do schema"}
                          </Button>
                        </div>
                      </div>
                    </div>
                  ) : null}
                </CardContent>
              </Card>
            ) : null}

            {latestState === "ready" && latest && current ? (
              <>
                <section className="space-y-4 scroll-mt-24" data-doc-anchor="dq-overview" id="dq-qualidade">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <h3 className="text-sm font-semibold uppercase tracking-[0.18em] text-brand-600">Qualidade consolidada</h3>
                      <p className="mt-1 text-sm text-text-body">As métricas abaixo ajudam a separar problema real de leitura, atraso de carga e variação de volume.</p>
                    </div>
                    <div className="hidden items-center gap-2 rounded-full border border-border bg-surface px-3 py-1 text-xs text-muted shadow-sm md:flex">
                      <Sparkles className="h-3.5 w-3.5 text-violet-600" />
                      Última execução #{current.run_id}
                    </div>
                  </div>
                  <div className="grid gap-4 xl:grid-cols-2">
                    <MetricCard
                      badge={<Badge tone={scoreBadgeTone}>{scoreBadgeLabel}</Badge>}
                      delta={
                        <div className={`inline-flex items-center gap-1 text-xs font-medium ${dqDelta.className}`}>
                          <dqDelta.icon className="h-3.5 w-3.5" />
                          {dqDelta.label}
                        </div>
                      }
                      icon={<ShieldCheck className="h-5 w-5" />}
                      subtitle={
                        current.operational_penalty_applied
                          ? "Pontuação ajustada pela política operacional vigente. Quedas pedem revisão das regras e sinais envolvidos."
                          : "Pontuação consolidada da última execução. Use para comparar confiança entre tabelas e ao longo do tempo."
                      }
                      title="Pontuação de qualidade"
                      tone={ANALYTIC_TONES.score}
                      value={currentScore === null ? "—" : scoreValue.toFixed(0)}
                    >
                      <div className="flex items-end justify-between gap-3">
                        <ScoreRing score={currentScore} />
                        <div className="flex-1 rounded-xl border border-white/70 bg-surface/70 p-3 backdrop-blur-sm">
                          <p className="text-xs font-medium text-muted">Tendência recente</p>
                          <Sparkline color={ANALYTIC_TONES.score.spark} values={dqSeries} />
                        </div>
                      </div>
                    </MetricCard>

                    <MetricCard
                      delta={
                        <div className={`inline-flex items-center gap-1 text-xs font-medium ${completenessDelta.className}`}>
                          <completenessDelta.icon className="h-3.5 w-3.5" />
                          {completenessDelta.label}
                        </div>
                      }
                      icon={<Droplets className="h-5 w-5" />}
                      subtitle="Média de preenchimento entre as colunas monitoradas. Baixa completude pode afetar métricas, filtros e regras."
                      title="Completude"
                      tone={ANALYTIC_TONES.completeness}
                      value={current.row_count <= 0 ? "—" : `${current.completeness_pct_avg.toFixed(1)}%`}
                    >
                      <div className="space-y-3">
                        <div className="h-2.5 overflow-hidden rounded-full bg-surface/80 shadow-inner">
                          <div
                            className="h-full rounded-full bg-gradient-to-r from-emerald-500 via-teal-500 to-cyan-500"
                            style={{ width: `${current.row_count <= 0 ? 0 : Math.max(0, Math.min(100, current.completeness_pct_avg))}%` }}
                          />
                        </div>
                        <Sparkline color={ANALYTIC_TONES.completeness.spark} values={completenessSeries} />
                      </div>
                    </MetricCard>

                    <MetricCard
                      badge={
                        <Badge tone={current.row_count <= 0 ? "neutral" : freshnessStatus(current.freshness_seconds).tone}>
                          {current.row_count <= 0 ? "Sem dados" : freshnessStatus(current.freshness_seconds).label}
                        </Badge>
                      }
                      delta={<span className="text-xs font-medium text-muted">Atualizado em {new Date(current.run_at).toLocaleString("pt-BR")}</span>}
                      icon={<Clock3 className="h-5 w-5" />}
                      subtitle="Quanto tempo se passou desde a última atualização detectada. Atraso indica risco de dado desatualizado."
                      title="Atualização"
                      tone={ANALYTIC_TONES.freshness}
                      value={current.row_count <= 0 ? "Sem dados" : humanAge(current.freshness_seconds)}
                    >
                      <Sparkline color={ANALYTIC_TONES.freshness.spark} values={freshnessSeries} />
                    </MetricCard>

                    <MetricCard
                      delta={
                        <div className={`inline-flex items-center gap-1 text-xs font-medium ${volumeDelta >= 0 ? "text-blue-700" : "text-danger-700"}`}>
                          {volumeDelta >= 0 ? <ArrowUpRight className="h-3.5 w-3.5" /> : <ArrowDownRight className="h-3.5 w-3.5" />}
                          Δ {volumeDelta.toLocaleString()} vs anterior
                        </div>
                      }
                      icon={<BarChart3 className="h-5 w-5" />}
                      subtitle="Total de registros considerados na última execução. Variações bruscas merecem revisão de ingestão ou duplicidade."
                      title="Volume"
                      tone={ANALYTIC_TONES.volume}
                      value={current.row_count.toLocaleString()}
                    >
                      <Sparkline color={ANALYTIC_TONES.volume.spark} values={volumeSeries} />
                    </MetricCard>
                  </div>
                </section>

                <section className="space-y-4 scroll-mt-24" id="dq-historico" data-doc-anchor="dq-heatmap">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <h3 className="text-sm font-semibold uppercase tracking-[0.18em] text-brand-600">Colunas com maior risco</h3>
                      <p className="mt-1 text-sm text-text-body">As colunas abaixo concentram mais nulidade ou piora em relação à execução anterior.</p>
                    </div>
                    <div className="rounded-full border border-danger-200 bg-danger-50 px-3 py-1 text-xs font-medium text-danger-700">
                      {topIssues.length} ponto(s) de atenção
                    </div>
                  </div>
                  {topIssues.length === 0 ? (
                    <EmptyState
                      title="Sem problemas críticos"
                      description="Não há colunas com nulidade relevante no recorte atual. Isso não exclui outros tipos de falha, como atraso, duplicidade ou schema inconsistente."
                    />
                  ) : (
                    <div className="grid gap-3 lg:grid-cols-2">
                      {topIssues.map((issue) => (
                        <div className="rounded-2xl border border-danger-200/80 bg-gradient-to-br from-rose-50 via-orange-50 to-white p-4 shadow-[0_10px_30px_rgba(244,63,94,0.08)]" key={issue.column_name}>
                          <div className="flex items-start justify-between gap-3">
                            <div className="flex items-start gap-3">
                              <div className="mt-0.5 flex h-10 w-10 items-center justify-center rounded-2xl bg-danger-100 text-danger-700">
                                <AlertTriangle className="h-4 w-4" />
                              </div>
                              <div>
                                <p className="text-sm font-semibold text-text">{issue.column_name}</p>
                                <p className="mt-1 text-xs text-muted">{issue.data_type}</p>
                              </div>
                            </div>
                            <Badge tone={issue.null_pct >= 30 ? "neutral" : "warning"}>
                              {issue.null_pct >= 30 ? "Crítico" : "Atenção"}
                            </Badge>
                          </div>
                          <div className="mt-4 grid gap-3 sm:grid-cols-2">
                            <div>
                              <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-brand-600">Nulos %</p>
                              <p className="mt-1 text-2xl font-semibold text-text">{issue.null_pct.toFixed(2)}%</p>
                            </div>
                            <div className="text-right">
                              <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-brand-600">Variação</p>
                              <p className={`mt-1 inline-flex items-center gap-1 text-sm font-medium ${issue.delta > 0 ? "text-danger-700" : issue.delta < 0 ? "text-success-700" : "text-muted"}`}>
                                {issue.delta > 0 ? <ArrowUpRight className="h-3.5 w-3.5" /> : issue.delta < 0 ? <ArrowDownRight className="h-3.5 w-3.5" /> : <TrendingUp className="h-3.5 w-3.5" />}
                                {issue.delta > 0 ? "+" : ""}
                                {issue.delta.toFixed(2)} pp
                              </p>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </section>

                <section className="space-y-4">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <h3 className="text-sm font-semibold uppercase tracking-[0.18em] text-brand-600">Qualidade por coluna</h3>
                      <p className="mt-1 text-sm text-text-body">Cada card combina nulidade, tipo de dado e sinal operacional para ajudar a priorizar a investigação.</p>
                    </div>
                    <div className="rounded-full border border-border bg-surface px-3 py-1 text-xs font-medium text-muted shadow-sm">
                      Clique em uma coluna para ver a tendência histórica
                    </div>
                  </div>
                  <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                    {current.columns.map((col) => {
                      const columnState = columnObservability.find((item) => item.column_name === col.column_name);
                      return (
                      <button
                        className={`rounded-2xl border p-4 text-left transition duration-200 hover:-translate-y-0.5 hover:shadow-lg ${heatTone(col.null_pct)}`}
                        key={col.column_name}
                        onClick={() => setSelectedColumn(col)}
                        title={`${col.column_name} • ${columnState?.status_label || "Sem leitura"} • null ${col.null_pct.toFixed(2)}% • distinct ${col.distinct_count}`}
                        type="button"
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0">
                            <p className="truncate text-sm font-semibold">{col.column_name}</p>
                            <p className="mt-1 truncate text-xs opacity-75">{col.data_type}</p>
                          </div>
                          <Badge tone={columnState?.tone === "success" ? "success" : columnState?.tone === "neutral" ? "neutral" : "warning"}>
                            {columnState?.status_label || (col.null_pct >= 30 ? "Crítico" : col.null_pct >= 10 ? "Atenção" : col.null_pct > 0 ? "Leve" : "Saudável")}
                          </Badge>
                        </div>
                        <div className="mt-4 flex items-end justify-between gap-3">
                          <div>
                            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] opacity-70">Nulos %</p>
                            <p className="mt-1 text-2xl font-semibold">{col.null_pct.toFixed(2)}%</p>
                          </div>
                          <div className="text-right text-xs opacity-80">
                            <p>Distintos: {col.distinct_count}</p>
                            <p>Nulos: {col.null_count}</p>
                          </div>
                        </div>
                        <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-surface/70">
                          <div
                            className={`h-full rounded-full ${col.null_pct >= 30 ? "bg-danger-500" : col.null_pct >= 10 ? "bg-warning-500" : col.null_pct > 0 ? "bg-orange-400" : "bg-success-500"}`}
                            style={{ width: `${Math.max(4, Math.min(100, col.null_pct || 4))}%` }}
                          />
                        </div>
                      </button>
                      );
                    })}
                  </div>
                </section>

                <section className="space-y-4">
                  <div>
                    <h3 className="text-sm font-semibold uppercase tracking-[0.18em] text-brand-600">Histórico por coluna</h3>
                    <p className="mt-1 text-sm text-text-body">Compare a evolução da nulidade, cardinalidade e limites observados ao longo dos últimos runs.</p>
                  </div>
                  <div className="overflow-x-auto rounded-2xl border border-border bg-surface shadow-[0_10px_30px_rgba(15,23,42,0.04)]">
                    <table className="min-w-full text-sm">
                      <thead className="bg-gradient-to-r from-slate-50 via-accent-50 to-violet-50 text-left text-xs uppercase tracking-[0.14em] text-muted">
                        <tr>
                          <th className="px-3 py-2">Coluna</th>
                          <th className="px-3 py-2">Tipo</th>
                          <th className="px-3 py-2">Nulos %</th>
                          <th className="px-3 py-2">Nulos</th>
                          <th className="px-3 py-2">Distintos</th>
                          <th className="px-3 py-2">Min</th>
                          <th className="px-3 py-2">Max</th>
                        </tr>
                      </thead>
                      <tbody>
                        {current.columns.map((col) => (
                          <tr className="border-t border-border odd:bg-surface even:bg-bg-subtle/60" key={col.column_name}>
                            <td className="px-3 py-2 font-medium text-text">{col.column_name}</td>
                            <td className="px-3 py-2 text-text-body">{col.data_type}</td>
                            <td className="px-3 py-2">
                              <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${col.null_pct >= 30 ? "bg-danger-100 text-danger-700" : col.null_pct >= 10 ? "bg-warning-100 text-warning-700" : col.null_pct > 0 ? "bg-orange-100 text-orange-700" : "bg-success-100 text-success-700"}`}>
                                {col.null_pct.toFixed(2)}%
                              </span>
                            </td>
                            <td className="px-3 py-2">{col.null_count}</td>
                            <td className="px-3 py-2">{col.distinct_count}</td>
                            <td className="px-3 py-2">{col.min_value ?? "-"}</td>
                            <td className="px-3 py-2">{col.max_value ?? "-"}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </section>
              </>
            ) : null}
            {selectedTableId ? (
              <details className="rounded-3xl border border-border bg-bg-subtle/70 p-4 shadow-[0_10px_30px_rgba(15,23,42,0.04)]">
                <summary className="cursor-pointer list-none text-sm font-semibold text-text">
                  Contexto transversal da plataforma
                  <span className="ml-2 text-xs font-normal text-muted">
                    Resumo geral para comparação com a tabela selecionada
                  </span>
                </summary>
                <div className="mt-4">
                  <DQPlatformScorecard
                    compact
                    description="Resumo transversal da cobertura de regras, contratos validados e ativos que precisam de atenção agora."
                    error={platformScorecardError}
                    loading={platformScorecardLoading}
                    summary={platformScorecard}
                    title="Scorecard da plataforma"
                  />
                </div>
              </details>
            ) : null}
              </>
            )}
          </CardContent>
        </Card>
      </div>

      {selectedColumn && latest ? (
                <div className="fixed inset-0 z-50 bg-slate-900/40">
          <div className="absolute right-0 top-0 h-[100dvh] w-full max-w-xl border-l border-border bg-surface shadow-2xl">
            <div className="flex items-center justify-between border-b border-border bg-gradient-to-r from-slate-50 via-cyan-50 to-violet-50 px-4 py-3">
              <div>
                <h3 className="text-base font-semibold">{selectedColumn.column_name}</h3>
                <p className="text-xs text-text-body">Detalhes, tendência e histórico da coluna selecionada</p>
              </div>
              <button aria-label="Fechar" className="rounded-md p-1 hover:bg-bg-subtle" onClick={() => setSelectedColumn(null)} type="button">
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="h-[calc(100dvh-57px)] space-y-4 overflow-y-auto p-4">
              <div className="grid gap-3 text-sm sm:grid-cols-2">
                <div className="rounded-2xl border border-border bg-bg-subtle/80 p-3">
                  <p className="text-xs text-muted">Tipo</p>
                  <p className="font-medium">{selectedColumn.data_type}</p>
                </div>
                <div className="rounded-2xl border border-border bg-bg-subtle/80 p-3">
                  <p className="text-xs text-muted">Nulidade atual</p>
                  <p className="font-medium">{selectedColumn.null_pct.toFixed(2)}%</p>
                </div>
                <div className="rounded-2xl border border-border bg-bg-subtle/80 p-3">
                  <p className="text-xs text-muted">Valores distintos</p>
                  <p className="font-medium">{selectedColumn.distinct_count}</p>
                </div>
                <div className="rounded-2xl border border-border bg-bg-subtle/80 p-3">
                  <p className="text-xs text-muted">Menor / maior valor</p>
                  <p className="truncate font-medium">{selectedColumn.min_value ?? "-"} / {selectedColumn.max_value ?? "-"}</p>
                </div>
              </div>

              <div className="rounded-2xl border border-border bg-gradient-to-br from-white via-violet-50/60 to-cyan-50/40 p-4">
                <p className="mb-2 text-sm font-semibold">Histórico de nulidade</p>
                <Sparkline
                  color={selectedColumn.null_pct >= 30 ? "#dc2626" : selectedColumn.null_pct >= 10 ? "#d97706" : "#7c3aed"}
                  values={(latest.column_history[selectedColumn.column_name] ?? []).map((item) => item.null_pct)}
                />
              </div>

              <div className="overflow-x-auto rounded-2xl border border-border bg-surface">
                <table className="min-w-full text-sm">
                  <thead className="bg-gradient-to-r from-slate-50 via-cyan-50 to-violet-50 text-left text-xs uppercase tracking-[0.14em] text-muted">
                    <tr>
                      <th className="px-3 py-2">Execução</th>
                      <th className="px-3 py-2">Data</th>
                      <th className="px-3 py-2">Nulos %</th>
                      <th className="px-3 py-2">Distintos</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(latest.column_history[selectedColumn.column_name] ?? []).map((item) => (
                      <tr className="border-t border-border" key={`${item.run_id}-${item.run_at}`}>
                        <td className="px-3 py-2">#{item.run_id}</td>
                        <td className="px-3 py-2">{new Date(item.run_at).toLocaleString()}</td>
                        <td className="px-3 py-2">{item.null_pct.toFixed(2)}%</td>
                        <td className="px-3 py-2">{item.distinct_count}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      ) : null}

      <ProfilingRunModal
        open={runModalOpen}
        runLoading={runLoading}
        runScope={runScope}
        runSchemaDatasourceId={runSchemaDatasourceId}
        runSchemaName={runSchemaName}
        runSchemaLimit={runSchemaLimit}
        runSchemaConcurrency={runSchemaConcurrency}
        runSchemaIncludeCsv={runSchemaIncludeCsv}
        runSchemaExcludeCsv={runSchemaExcludeCsv}
        runExecutionEngine={runExecutionEngine}
        selectedTableId={selectedTableId}
        selectedTableName={selectedTableName}
        allSchemaOptions={allSchemaOptions}
        datasourceOptions={nodes.map((ds) => ({ id: ds.id, name: ds.name }))}
        onClose={() => setRunModalOpen(false)}
        onRun={() => void runProfile()}
        onScopeChange={setRunScope}
        onExecutionEngineChange={setRunExecutionEngine}
        onSchemaDatasourceIdChange={setRunSchemaDatasourceId}
        onSchemaNameChange={setRunSchemaName}
        onSchemaLimitChange={setRunSchemaLimit}
        onSchemaConcurrencyChange={setRunSchemaConcurrency}
        onSchemaIncludeCsvChange={setRunSchemaIncludeCsv}
        onSchemaExcludeCsvChange={setRunSchemaExcludeCsv}
      />

      <ProfilingScheduleModal
        canWrite={canRun}
        loading={profilingScheduleSaving}
        open={profilingScheduleModalOpen}
        schedule={selectedProfilingSchedule}
        form={profilingScheduleForm}
        targetDatabaseName={selectedDatabaseName}
        targetDatasourceName={selectedDatasourceName}
        targetSchemaName={selectedSchemaName}
        targetTableName={selectedTableName}
        onClose={() => setProfilingScheduleModalOpen(false)}
        onDelete={() => void deleteProfilingSchedule()}
        onFormChange={updateProfilingScheduleForm}
        onSave={() => void saveProfilingSchedule()}
      />

      <ProfilingRunDrawer
        artifacts={profilingRunDetailArtifacts}
        error={profilingRunDetailError}
        loading={profilingRunDetailLoading}
        open={profilingRunDrawerOpen}
        run={profilingRunDetail}
        tableName={selectedTableName}
        onClose={closeProfilingRunDetail}
        onTroubleshoot={goToProfilingTroubleshooting}
      />
    </>
  );
}
