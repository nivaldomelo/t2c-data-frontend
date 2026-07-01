import { useEffect, useMemo, useState } from "react";

import { PlatformExecutiveCockpit } from "@/features/dashboard/components/platform-executive-cockpit";
import { ExecutiveDashboardView } from "@/features/dashboard/components/executive-dashboard-view";
import { listDataSources } from "@/features/datasources/api";
import { trackPlatformEvent } from "@/features/platform/client";
import type {
  ExecutiveAppliedFilters,
  ExecutiveDashboardOverview,
  ExecutiveDashboardSecondary,
  ExecutiveDashboardSummary,
  DashboardSummary,
  ExecutiveFilterOption,
} from "@/features/dashboard/types";
import { apiRequest } from "@/lib/client-api";

const DEFAULT_FILTERS: ExecutiveAppliedFilters = {
  domain: null,
  data_source_id: null,
  source: null,
  database: null,
  schema_key: null,
  schema: null,
  owner: null,
  certification_status: null,
  dq_band: null,
  incidents: null,
  q: null,
};

const EMPTY_EXECUTIVE_SECONDARY: ExecutiveDashboardSecondary = {
  generated_at: "",
  stewardship: {
    pending_total: 0,
    awaiting_assignment: 0,
    review_pending: 0,
    certification_pending: 0,
    my_approvals_pending: 0,
    my_owner_queue: 0,
    by_owner: [],
    by_approver: [],
  },
  campaigns: [],
  critical_changes: [],
  ingestion: {
    available: false,
    message: null,
    pipelines_total: 0,
    linked_tables: 0,
    unmapped: 0,
    degraded: 0,
    failed: 0,
    running: 0,
    pending: 0,
    stale: 0,
    critical_stale: 0,
    high_volume_failed: 0,
    high_volume_failed_threshold_rows: 0,
    stale_threshold_hours: 0,
    items: [],
    high_volume_failed_items: [],
  },
  dq: {
    avg_score: 0,
    not_evaluated: 0,
    score_bands: [],
    worst_assets: [],
    trend: [],
  },
  incidents: {
    open_total: 0,
    critical_open_total: 0,
    by_severity: [],
    top_assets: [],
    recurring_assets: [],
    impact_assets: [],
  },
  risk: {
    by_domain: [],
    by_source: [],
    by_schema: [],
  },
  maturity_panels: {
    by_domain: [],
    by_source: [],
    by_owner: [],
    by_schema: [],
  },
  operational_intelligence: {
    generated_at: "",
    window_days: 30,
    evaluated_assets: 0,
    priority_queue_size: 0,
    high_risk_assets: 0,
    high_risk_domains: 0,
    high_risk_products: 0,
    unstable_pipelines: 0,
    deteriorating_assets: 0,
    recurring_instability: 0,
    suggested_incidents: 0,
    by_asset: [],
    by_domain: [],
    by_product: [],
    by_pipeline: [],
    alerts: [],
    trend: [],
  },
};

export default function DashboardPage() {
  const [platformSummary, setPlatformSummary] = useState<DashboardSummary | null>(null);
  const [summary, setSummary] = useState<ExecutiveDashboardSummary | null>(null);
  const [sourceOptions, setSourceOptions] = useState<ExecutiveFilterOption[]>([]);
  const [overviewLoading, setOverviewLoading] = useState(true);
  const [secondaryLoading, setSecondaryLoading] = useState(true);
  const [platformLoading, setPlatformLoading] = useState(true);
  const [sourcesLoading, setSourcesLoading] = useState(true);
  const [error, setError] = useState("");
  const [filters, setFilters] = useState<ExecutiveAppliedFilters>(DEFAULT_FILTERS);
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    let active = true;
    setSourcesLoading(true);

    void (async () => {
      try {
        const sources = await listDataSources();
        if (!active) return;
        setSourceOptions(
          sources.map((item) => ({
            value: String(item.id),
            label: item.name,
            datasource_id: item.id,
          })),
        );
      } catch (err) {
        if (!active) return;
        setSourceOptions([]);
      } finally {
        if (active) setSourcesLoading(false);
      }
    })();

    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    void trackPlatformEvent({
      event_name: "page_view",
      module_name: "dashboard",
      page_path: "/dashboard",
    });
  }, []);

  const queryString = useMemo(() => {
    const params = new URLSearchParams();
    Object.entries(filters).forEach(([key, value]) => {
      if (value === null || value === undefined) return;
      const text = typeof value === "string" ? value.trim() : String(value);
      if (text) params.set(key, text);
    });
    const text = params.toString();
    return text ? `?${text}` : "";
  }, [filters]);

  const loading = platformLoading || overviewLoading || (secondaryLoading && summary === null);

  useEffect(() => {
    const platformController = new AbortController();
    let active = true;
    setPlatformLoading(true);

    void (async () => {
      try {
        const platform = await apiRequest<DashboardSummary>(`/v1/dashboard/summary${queryString}`, {
          signal: platformController.signal,
        });
        if (!active) return;
        setPlatformSummary(platform);
      } catch (err) {
        if ((err as Error).name === "AbortError" || !active) return;
        setError((err as Error).message);
      } finally {
        if (active) setPlatformLoading(false);
      }
    })();

    return () => {
      active = false;
      platformController.abort();
    };
  }, [queryString, reloadKey]);

  useEffect(() => {
    const overviewController = new AbortController();
    const secondaryController = new AbortController();
    let active = true;
    let idleHandle: number | null = null;
    let cancelIdle: ((id: number) => void) | null = null;
    const timer = window.setTimeout(() => {
      setOverviewLoading(true);
      setError("");

      void (async () => {
        try {
          const overview = await apiRequest<ExecutiveDashboardOverview>(`/v1/dashboard/executive/overview${queryString}`, {
            signal: overviewController.signal,
          });
          if (!active) return;
          setSummary((current) => ({
            ...overview,
            ...(current ?? EMPTY_EXECUTIVE_SECONDARY),
          }));
        } catch (err) {
          if ((err as Error).name === "AbortError" || !active) return;
          setError((err as Error).message);
        } finally {
          if (active) setOverviewLoading(false);
        }
      })();

      setSecondaryLoading(true);
      const schedule =
        "requestIdleCallback" in window
          ? (window as Window & { requestIdleCallback: (cb: () => void) => number }).requestIdleCallback
          : (cb: () => void) => window.setTimeout(cb, 600);
      const cancelSchedule =
        "cancelIdleCallback" in window
          ? (window as Window & { cancelIdleCallback: (id: number) => void }).cancelIdleCallback
          : (id: number) => window.clearTimeout(id);
      cancelIdle = cancelSchedule;

      idleHandle = schedule(() => {
        void (async () => {
          try {
            const secondary = await apiRequest<ExecutiveDashboardSecondary>(`/v1/dashboard/executive/secondary${queryString}`, {
              signal: secondaryController.signal,
            });
            if (!active) return;
            setSummary((current) =>
              current
                ? ({
                    ...current,
                    ...secondary,
                  } satisfies ExecutiveDashboardSummary)
                : null,
            );
          } catch (err) {
            if ((err as Error).name === "AbortError" || !active) return;
            setError((err as Error).message);
          } finally {
            if (active) setSecondaryLoading(false);
          }
        })();
      });
    }, filters.q ? 250 : 0);

    return () => {
      active = false;
      overviewController.abort();
      secondaryController.abort();
      if (idleHandle !== null && cancelIdle) {
        cancelIdle(idleHandle);
      }
      window.clearTimeout(timer);
    };
  }, [queryString, filters.q, reloadKey]);

  return (
    <div className="space-y-3 pb-5">
      <PlatformExecutiveCockpit
        error={error}
        loading={overviewLoading || (secondaryLoading && summary === null)}
        summary={summary}
        secondaryLoading={secondaryLoading}
      />
      <ExecutiveDashboardView
        error={error}
        filters={filters}
        loading={loading}
        onClearFilters={() => setFilters({ ...DEFAULT_FILTERS })}
        onFiltersChange={(patch) => setFilters((current) => ({ ...current, ...patch }))}
        onRefresh={() => setReloadKey((current) => current + 1)}
        platformSummary={platformSummary}
        sourceOptions={sourceOptions}
        sourcesLoading={sourcesLoading}
        summary={summary}
      />
    </div>
  );
}
