import { useEffect, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";

import type { TableCorrelationSummary } from "@/features/explorer/types";
import { OpsCockpitView } from "@/features/platform/components/ops-cockpit-view";
import { trackPlatformEvent } from "@/features/platform/client";
import { platformSdk } from "@/features/platform/sdk";
import type {
  PlatformCockpitSummary,
  PlatformCockpitRecommendedAction,
  PlatformJobsHistoryResponse,
  PlatformJobsStatus,
  ReadModelRefresh,
} from "@/features/platform/types";
import { useAuth } from "@/lib/auth";
import { apiRequest, downloadApiFile } from "@/lib/client-api";
import { useApiQuery } from "@/lib/use-api-query";

export default function OpsCockpitPage() {
  const auth = useAuth();
  const queryClient = useQueryClient();
  const canExport = auth.hasPermission("ops.export");
  const [refreshing, setRefreshing] = useState(false);
  const [acting, setActing] = useState<string | null>(null);
  // Mutation failures surface here; query failures come straight from the queries.
  const [actionError, setActionError] = useState("");

  useEffect(() => {
    void trackPlatformEvent({
      event_name: "page_view",
      module_name: "ops_cockpit",
      page_path: "/ops/cockpit",
    });
  }, []);

  const summaryQuery = useApiQuery<PlatformCockpitSummary>(["ops-cockpit", "summary"], "/v1/platform/cockpit/summary");
  const summary = summaryQuery.data ?? null;

  const jobsQuery = useQuery({
    queryKey: ["ops-cockpit", "jobs"],
    queryFn: async () => {
      const [status, history] = await Promise.all([
        platformSdk.getPlatformJobsStatus(12),
        platformSdk.listPlatformJobsHistory(1, 8),
      ]);
      return { status, history };
    },
  });

  const recommendedQuery = useQuery({
    queryKey: ["ops-cockpit", "recommended-actions"],
    queryFn: () => platformSdk.getPlatformCockpitRecommendedActions(10),
  });

  const highlightedTableId =
    summary?.correlation_priority?.[0]?.table_id ?? summary?.queues?.falha_dq_incidente?.[0]?.table_id;
  const correlationQuery = useApiQuery<TableCorrelationSummary>(
    ["ops-cockpit", "correlation", highlightedTableId ?? null],
    highlightedTableId ? `/v1/catalog/tables/${highlightedTableId}/correlation-summary` : "",
    undefined,
    { enabled: Boolean(highlightedTableId) },
  );

  function invalidateCockpit() {
    void queryClient.invalidateQueries({ queryKey: ["ops-cockpit"] });
  }

  const error = summaryQuery.error?.message || actionError;
  const loading = summaryQuery.isLoading;
  const jobsStatus: PlatformJobsStatus | null = jobsQuery.data?.status ?? null;
  const jobsHistory: PlatformJobsHistoryResponse | null = jobsQuery.data?.history ?? null;
  const jobsLoading = jobsQuery.isLoading;
  const jobsError = jobsQuery.error?.message ?? "";
  const recommendedActions: PlatformCockpitRecommendedAction[] | null = recommendedQuery.data
    ? recommendedQuery.data.items ?? []
    : null;
  const correlationSummary = highlightedTableId ? correlationQuery.data ?? null : null;
  const correlationLoading = Boolean(highlightedTableId) && correlationQuery.isLoading;
  const correlationError = highlightedTableId && correlationQuery.error ? correlationQuery.error.message : "";

  async function refreshReadModels() {
    setRefreshing(true);
    setActionError("");
    try {
      await apiRequest<ReadModelRefresh>("/v1/platform/read-models/refresh?mode=auto", { method: "POST" });
      await trackPlatformEvent({
        event_name: "read_models_refresh",
        module_name: "ops_cockpit",
        page_path: "/ops/cockpit",
      });
      invalidateCockpit();
    } catch (err) {
      setActionError((err as Error).message);
    } finally {
      setRefreshing(false);
    }
  }

  async function runAction(actionKey: string, endpoint: string, eventName: string, metadata?: Record<string, unknown>) {
    setActing(actionKey);
    setActionError("");
    try {
      await apiRequest(endpoint, { method: "POST" });
      await trackPlatformEvent({
        event_name: eventName,
        module_name: "ops_cockpit",
        page_path: "/ops/cockpit",
        metadata,
      });
      invalidateCockpit();
    } catch (err) {
      setActionError((err as Error).message);
    } finally {
      setActing(null);
    }
  }

  async function exportOperation() {
    try {
      await downloadApiFile("/v1/platform/cockpit/export.csv", "ops_cockpit_operacao.csv", undefined, {
        confirmMessage:
          "Exportar a fila operacional atual (limite de 2.000 linhas)? A exportacao sera auditada e o CSV respeita o filtro atual do cockpit.",
      });
      await trackPlatformEvent({
        event_name: "export_operational_cockpit",
        module_name: "ops_cockpit",
        page_path: "/ops/cockpit",
      });
    } catch (err) {
      setActionError((err as Error).message);
    }
  }

  return (
    <OpsCockpitView
      acting={acting}
      correlationError={correlationError}
      correlationLoading={correlationLoading}
      correlationSummary={correlationSummary}
      error={error}
      loading={loading}
      recommendedActions={recommendedActions}
      canExportOperation={canExport}
      onAutoOpenIncident={(tableId) =>
        void runAction(
          `incident-auto-${tableId}`,
          `/v1/platform/actions/tables/${tableId}/incidents/open?mode=auto_if_missing`,
          "open_incident_auto",
          { table_id: tableId, mode: "auto_if_missing" },
        )
      }
      onOpenIncident={(tableId) =>
        void runAction(
          `incident-${tableId}`,
          `/v1/platform/actions/tables/${tableId}/incidents/open`,
          "open_incident",
          { table_id: tableId },
        )
      }
      onRefreshReadModels={() => void refreshReadModels()}
      onReprocessScan={(datasourceId) =>
        void runAction(
          `scan-${datasourceId}`,
          `/v1/platform/actions/datasources/${datasourceId}/scan/reprocess`,
          "reprocess_scan",
          { datasource_id: datasourceId },
        )
      }
      onRerunProfiling={(tableId) =>
        void runAction(
          `profiling-${tableId}`,
          `/v1/platform/actions/tables/${tableId}/profiling/rerun`,
          "rerun_profiling",
          { table_id: tableId },
        )
      }
      refreshing={refreshing}
      summary={summary}
      jobsStatus={jobsStatus}
      jobsHistory={jobsHistory}
      jobsLoading={jobsLoading}
      jobsError={jobsError}
      onRefreshJobs={() => void queryClient.invalidateQueries({ queryKey: ["ops-cockpit", "jobs"] })}
      onExportOperation={() => void exportOperation()}
    />
  );
}
