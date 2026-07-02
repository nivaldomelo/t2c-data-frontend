import { Link } from "@/lib/next-shims";
import { safeHref } from "@/lib/safe-href";
import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "@/lib/next-shims";
import {
  AlertTriangle,
  CheckCircle2,
  Filter,
  Fingerprint,
  ShieldCheck,
  ShieldEllipsis,
  SlidersHorizontal,
  Workflow,
  X,
} from "lucide-react";

import { AccessRoleBadges, AccessScopeBadge, PrivacySummaryStrip, type PrivacySummaryLike, SensitivityBadge } from "@/components/privacy/privacy-badge";
import {
  CertificationStatusBadge,
  certificationStatusFrameClass,
  certificationStatusHeaderClass,
} from "@/components/certification/certification-badge";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import type { AuditHistoryPage } from "@/features/audit/types";
import { trackPlatformEvent } from "@/features/platform/client";
import { apiRequest, downloadApiFile, getExportJobStatus } from "@/lib/client-api";
import { cn } from "@/lib/cn";
import { useAuth } from "@/lib/auth";
import type { PlatformIntegrationSyncJob } from "@/features/platform/types";
import type {
  GlobalEventsFocusFilter,
  GlobalEventsPeriodFilter,
  HistoryCategoryKey,
  PageResponse,
  PriorityItem,
  PrivacyEventSummary,
  PrivacyFormState,
  PrivacyGlobalSummary,
  PrivacyHistoryEntry,
  PrivacyOptions,
  PrivacyPeriodicReviewPayload,
  PrivacyReviewEventPage,
  PrivacyTable,
  PrivacyTableDetail,
  QuickFilterKey,
  RiskDirectionFilter,
} from "@/features/privacy-access/types";
import {
  HISTORY_CATEGORY_FILTERS,
  JOURNEYS,
  PRIVACY_HISTORY_FIELDS,
  QUICK_FILTERS,
} from "@/features/privacy-access/constants";
import {
  buildActionList,
  buildForm,
  classifyHistoryImpact,
  collectRiskSignals,
  computeLocalSummary,
  computePriority,
  formatDateInputValue,
  formatDateTime,
  formatHistoryValue,
  hasFormalClassification,
  historyActorLabel,
  isPrivacyHistoryEvent,
  latestScheduledReviewFromHistory,
  mapAuditHistoryEvent,
  mapDedicatedHistoryEvent,
  periodDateFrom,
  privacyHistoryCategory,
  privacyHistoryFieldLabel,
} from "@/features/privacy-access/helpers";

export default function PrivacyAccessPage() {
  const searchParams = useSearchParams();
  const auth = useAuth();
  const canEdit = auth.canAction("write", "privacyAccess");
  const canExport = auth.hasPermission("privacy_access:export");
  const [items, setItems] = useState<PrivacyTable[]>([]);
  const [listPage, setListPage] = useState(1);
  const [listTotal, setListTotal] = useState(0);
  const [listPageSize, setListPageSize] = useState(10);
  const [listHasMore, setListHasMore] = useState(false);
  const [summary, setSummary] = useState<PrivacyGlobalSummary | null>(null);
  const [eventSummary, setEventSummary] = useState<PrivacyEventSummary | null>(null);
  const [eventsPageData, setEventsPageData] = useState<PrivacyReviewEventPage | null>(null);
  const [options, setOptions] = useState<PrivacyOptions | null>(null);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [detail, setDetail] = useState<PrivacyTableDetail | null>(null);
  const [privacyHistory, setPrivacyHistory] = useState<PrivacyHistoryEntry[]>([]);
  const [privacyHistorySource, setPrivacyHistorySource] = useState<"dedicated" | "audit_fallback">("audit_fallback");
  const [form, setForm] = useState<PrivacyFormState>(buildForm(null));
  const [q, setQ] = useState("");
  const [sensitivityFilter, setSensitivityFilter] = useState("all");
  const [personalDataFilter, setPersonalDataFilter] = useState("all");
  const [quickFilter, setQuickFilter] = useState<QuickFilterKey>("all");
  const [loading, setLoading] = useState(true);
  const [summarySource, setSummarySource] = useState<"backend" | "local_fallback">("local_fallback");
  const [globalEventsLoading, setGlobalEventsLoading] = useState(false);
  const [detailLoading, setDetailLoading] = useState(false);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [exportJob, setExportJob] = useState<PlatformIntegrationSyncJob | null>(null);
  const [periodicReviewOpen, setPeriodicReviewOpen] = useState(false);
  const [periodicReviewSaving, setPeriodicReviewSaving] = useState(false);
  const [periodicReviewForm, setPeriodicReviewForm] = useState<PrivacyPeriodicReviewPayload>({
    notes: "",
    next_review_at: null,
    confirmed: false,
  });
  const [historyCategoryFilter, setHistoryCategoryFilter] = useState<HistoryCategoryKey>("all");
  const [historyPeriodFilter, setHistoryPeriodFilter] = useState("all");
  const [historyReviewerFilter, setHistoryReviewerFilter] = useState("all");
  const [historyChangeTypeFilter, setHistoryChangeTypeFilter] = useState("all");
  const [historyFieldFilter, setHistoryFieldFilter] = useState("all");
  const [globalEventTypeFilter, setGlobalEventTypeFilter] = useState("all");
  const [globalRiskDirectionFilter, setGlobalRiskDirectionFilter] = useState<RiskDirectionFilter>("all");
  const [globalEventsPeriodFilter, setGlobalEventsPeriodFilter] = useState<GlobalEventsPeriodFilter>("30d");
  const [globalEventsSchemaFilter, setGlobalEventsSchemaFilter] = useState("all");
  const [globalEventsReviewerFilter, setGlobalEventsReviewerFilter] = useState("all");
  const [globalEventsRiskBeforeFilter, setGlobalEventsRiskBeforeFilter] = useState("all");
  const [globalEventsRiskAfterFilter, setGlobalEventsRiskAfterFilter] = useState("all");
  const [globalEventsFocusFilter, setGlobalEventsFocusFilter] = useState<GlobalEventsFocusFilter>("all");
  const [globalEventsPage, setGlobalEventsPage] = useState(1);
  const [toast, setToast] = useState<{ tone: "success" | "warning" | "neutral"; message: string } | null>(null);

  useEffect(() => {
    const tableId = Number(searchParams.get("tableId") || "");
    void trackPlatformEvent({
      event_name: "page_view",
      module_name: "privacy_access",
      page_path: "/privacy-access",
      entity_type: Number.isFinite(tableId) && tableId > 0 ? "table" : undefined,
      entity_id: Number.isFinite(tableId) && tableId > 0 ? tableId : undefined,
    });
  }, [searchParams]);

  useEffect(() => {
    void (async () => {
      const [nextOptions, nextEventSummary] = await Promise.all([
        apiRequest<PrivacyOptions>("/v1/privacy-access/options"),
        apiRequest<PrivacyEventSummary>("/v1/privacy-access/events/summary").catch(() => null),
      ]);
      setOptions(nextOptions);
      setEventSummary(nextEventSummary);
    })().catch((error) => {
      setToast({ tone: "neutral", message: (error as Error).message || "Falha ao carregar opções." });
    });
  }, []);

  useEffect(() => {
    void (async () => {
      setGlobalEventsLoading(true);
      try {
        const params = new URLSearchParams();
        params.set("page", String(globalEventsPage));
        params.set("page_size", "10");
        const dateFrom = periodDateFrom(globalEventsPeriodFilter);
        if (dateFrom) params.set("date_from", dateFrom);
        if (globalEventsSchemaFilter !== "all") {
          const [databaseName, schemaName] = globalEventsSchemaFilter.split(".");
          if (databaseName) params.set("database_name", databaseName);
          if (schemaName) params.set("schema_name", schemaName);
        }
        if (globalEventsReviewerFilter !== "all") params.set("reviewer", globalEventsReviewerFilter);
        if (globalEventTypeFilter !== "all") params.set("review_type", globalEventTypeFilter);
        if (globalEventsRiskBeforeFilter !== "all") params.set("risk_before", globalEventsRiskBeforeFilter);
        if (globalEventsRiskAfterFilter !== "all") params.set("risk_after", globalEventsRiskAfterFilter);
        if (globalRiskDirectionFilter === "increased") params.set("only_risk_increased", "true");
        if (globalRiskDirectionFilter === "reduced") params.set("only_risk_reduced", "true");
        if (globalEventsFocusFilter === "access_scope") params.set("field", "access_scope");
        if (globalEventsFocusFilter === "legal_basis") params.set("field", "legal_basis");
        if (globalEventsFocusFilter === "privacy_purpose") params.set("field", "privacy_purpose");
        if (globalEventsFocusFilter === "periodic_review") params.set("review_type", "periodic_review");
        const nextEventsPage = await apiRequest<PrivacyReviewEventPage>(`/v1/privacy-access/events?${params.toString()}`);
        setEventsPageData(nextEventsPage);
      } catch {
        setEventsPageData(null);
      } finally {
        setGlobalEventsLoading(false);
      }
    })();
  }, [
    globalEventTypeFilter,
    globalEventsFocusFilter,
    globalEventsPage,
    globalEventsPeriodFilter,
    globalEventsReviewerFilter,
    globalEventsRiskAfterFilter,
    globalEventsRiskBeforeFilter,
    globalEventsSchemaFilter,
    globalRiskDirectionFilter,
  ]);

  useEffect(() => {
    void (async () => {
      setLoading(true);
      try {
        const params = new URLSearchParams();
        if (q.trim()) params.set("q", q.trim());
        if (sensitivityFilter !== "all") params.set("sensitivity_level", sensitivityFilter);
        if (personalDataFilter !== "all") params.set("has_personal_data", personalDataFilter === "yes" ? "true" : "false");
        params.set("page", String(listPage));
        params.set("page_size", "10");
        // quick_filter refines the table list server-side; the summary stays global (ignores it).
        const tablesParams = new URLSearchParams(params);
        if (quickFilter !== "all") tablesParams.set("quick_filter", quickFilter);
        const [data, summaryResult] = await Promise.allSettled([
          apiRequest<PrivacyTable[] | PageResponse<PrivacyTable>>(`/v1/privacy-access/tables?${tablesParams.toString()}`),
          apiRequest<PrivacyGlobalSummary>(`/v1/privacy-access/summary?${params.toString()}`),
        ]);
        if (data.status !== "fulfilled") {
          throw data.reason;
        }
        const pagePayload = Array.isArray(data.value)
          ? { items: data.value, total: data.value.length, page: 1, page_size: 10, has_more: false }
          : data.value;
        setItems(pagePayload.items ?? []);
        setListTotal(pagePayload.total ?? 0);
        setListPage(pagePayload.page ?? 1);
        setListPageSize(pagePayload.page_size ?? 10);
        setListHasMore(Boolean(pagePayload.has_more));
        if (summaryResult.status === "fulfilled") {
          setSummary(summaryResult.value);
          setSummarySource("backend");
        } else {
          setSummary(null);
          setSummarySource("local_fallback");
        }
        setToast(null);
      } catch (error) {
        setToast({ tone: "neutral", message: (error as Error).message || "Falha ao carregar ativos." });
      } finally {
        setLoading(false);
      }
    })();
  }, [listPage, personalDataFilter, q, sensitivityFilter, quickFilter]);

  useEffect(() => {
    if (!selectedId) {
      setDetail(null);
      setPrivacyHistory([]);
      setPrivacyHistorySource("audit_fallback");
      setForm(buildForm(null));
      setPeriodicReviewOpen(false);
      setPeriodicReviewForm({ notes: "", next_review_at: null, confirmed: false });
      setHistoryCategoryFilter("all");
      setHistoryPeriodFilter("all");
      setHistoryReviewerFilter("all");
      setHistoryChangeTypeFilter("all");
      setHistoryFieldFilter("all");
      return;
    }
    void (async () => {
      setDetailLoading(true);
      setHistoryLoading(true);
      try {
        const data = await apiRequest<PrivacyTableDetail>(`/v1/privacy-access/tables/${selectedId}`);
        setDetail(data);
        setForm(buildForm(data));
        try {
          const dedicatedPage = await apiRequest<PrivacyReviewEventPage>(`/v1/privacy-access/tables/${selectedId}/events?page_size=100`);
          setPrivacyHistory((dedicatedPage.items || []).map(mapDedicatedHistoryEvent));
          setPrivacyHistorySource("dedicated");
        } catch {
          const auditPage = await apiRequest<AuditHistoryPage>(`/v1/audit/history/table/${selectedId}?page_size=100`);
          setPrivacyHistory((auditPage.items || []).filter(isPrivacyHistoryEvent).map(mapAuditHistoryEvent));
          setPrivacyHistorySource("audit_fallback");
        }
      } catch (error) {
        setToast({ tone: "neutral", message: (error as Error).message || "Falha ao carregar o detalhe do ativo." });
      } finally {
        setDetailLoading(false);
        setHistoryLoading(false);
      }
    })();
  }, [selectedId]);

  useEffect(() => {
    const tableId = Number(searchParams.get("tableId") || "");
    if (!Number.isFinite(tableId) || tableId <= 0) return;
    setSelectedId(tableId);
  }, [searchParams]);

  useEffect(() => {
    setListPage(1);
  }, [q, sensitivityFilter, personalDataFilter, quickFilter]);

  useEffect(() => {
    setSelectedId(null);
  }, [listPage]);

  useEffect(() => {
    setGlobalEventsPage(1);
  }, [
    globalEventTypeFilter,
    globalEventsFocusFilter,
    globalEventsPeriodFilter,
    globalEventsReviewerFilter,
    globalEventsRiskAfterFilter,
    globalEventsRiskBeforeFilter,
    globalEventsSchemaFilter,
    globalRiskDirectionFilter,
  ]);

  // Quick filter is applied server-side; items already reflect it.
  const filteredItems = items;
  const localSummary = useMemo(() => computeLocalSummary(filteredItems), [filteredItems]);
  const effectiveSummary = summary ?? localSummary;
  const listTotalPages = useMemo(() => Math.max(1, Math.ceil(listTotal / Math.max(listPageSize, 1))), [listPageSize, listTotal]);
  const listStart = useMemo(() => (listTotal === 0 ? 0 : (listPage - 1) * listPageSize + 1), [listPage, listPageSize, listTotal]);
  const listEnd = useMemo(() => (listTotal === 0 ? 0 : Math.min(listTotal, (listPage - 1) * listPageSize + items.length)), [items.length, listPage, listPageSize, listTotal]);
  const latestScheduledReview = useMemo(() => latestScheduledReviewFromHistory(privacyHistory), [privacyHistory]);
  const currentDedicatedRisk = useMemo(() => {
    const firstDedicated = privacyHistory.find((event) => event.source_kind === "dedicated" && event.risk_after);
    return firstDedicated?.risk_after || null;
  }, [privacyHistory]);

  const priorities = useMemo(() => {
    if (summary?.priorities?.length) {
      return summary.priorities.slice(0, 5).map((item) => ({
        table: filteredItems.find((entry) => entry.id === item.asset_id) ?? null,
        score: item.risk_level === "critical" ? 100 : item.risk_level === "high" ? 75 : item.risk_level === "medium" ? 45 : 15,
        reason: item.reason,
        risk: item.risk_level,
        action: item.recommended_action,
        asset_id: item.asset_id,
        asset_name: item.asset_name,
        database_name: item.database_name,
        schema_name: item.schema_name,
      }));
    }
    return filteredItems
      .map(computePriority)
      .filter((item): item is PriorityItem => Boolean(item))
      .sort((left, right) => right.score - left.score)
      .slice(0, 5);
  }, [filteredItems, summary]);

  const detailPreview = useMemo(() => {
    if (!detail) return null;
    return {
      ...detail.privacy,
      sensitivity_level: form.sensitivity_level || detail.privacy.sensitivity_level,
      has_personal_data: form.has_personal_data,
      has_sensitive_personal_data: form.has_sensitive_personal_data,
      legal_basis: form.legal_basis,
      privacy_purpose: form.privacy_purpose,
      retention_policy: form.retention_policy,
      is_masked: form.is_masked,
      external_sharing: form.external_sharing,
      access_scope: form.access_scope || detail.privacy.access_scope,
      access_roles: form.access_roles,
      privacy_notes: form.privacy_notes,
    } satisfies PrivacySummaryLike;
  }, [detail, form]);

  const detailSignals = useMemo(() => collectRiskSignals(detailPreview || {}, detail?.owner), [detail?.owner, detailPreview]);
  const detailActions = useMemo(() => {
    const actions = buildActionList(detailPreview || {}, detail?.owner, {
      nextReviewAt: latestScheduledReview,
      reviewedAt: detail?.privacy.privacy_reviewed_at || null,
    });
    if (detail?.suspected_columns?.length) {
      actions.unshift("Revisar as colunas que acionaram o sinal automático de privacidade");
    }
    return Array.from(new Set(actions));
  }, [detail?.owner, detail?.privacy.privacy_reviewed_at, detail?.suspected_columns, detailPreview, latestScheduledReview]);

  const historyReviewerOptions = useMemo(
    () =>
      Array.from(new Set(privacyHistory.map((event) => historyActorLabel(event)).filter(Boolean))).sort((left, right) =>
        left.localeCompare(right, "pt-BR"),
      ),
    [privacyHistory],
  );

  const historyChangeTypeOptions = useMemo(
    () =>
      Array.from(new Set(privacyHistory.map((event) => event.change_type || event.review_type || "update").filter(Boolean))).sort((left, right) =>
        left.localeCompare(right, "pt-BR"),
      ),
    [privacyHistory],
  );

  const historyFieldOptions = useMemo(
    () =>
      Array.from(
        new Set(
          privacyHistory
            .flatMap((event) => event.field_names)
            .filter((field): field is string => Boolean(field) && PRIVACY_HISTORY_FIELDS.includes(field as (typeof PRIVACY_HISTORY_FIELDS)[number])),
        ),
      ).sort((left, right) => privacyHistoryFieldLabel(left).localeCompare(privacyHistoryFieldLabel(right), "pt-BR")),
    [privacyHistory],
  );

  const filteredPrivacyHistory = useMemo(() => {
    const now = Date.now();
    return privacyHistory.filter((event) => {
      const categories = event.field_names.map((fieldName) => privacyHistoryCategory(fieldName));
      if (historyCategoryFilter !== "all" && !categories.includes(historyCategoryFilter)) return false;
      if (historyReviewerFilter !== "all" && historyActorLabel(event) !== historyReviewerFilter) return false;
      if (historyChangeTypeFilter !== "all" && (event.change_type || event.review_type || "update") !== historyChangeTypeFilter) return false;
      if (historyFieldFilter !== "all" && !event.field_names.includes(historyFieldFilter)) return false;
      if (historyPeriodFilter !== "all") {
        const changedAt = new Date(event.changed_at).getTime();
        if (Number.isNaN(changedAt)) return false;
        const diffDays = (now - changedAt) / (1000 * 60 * 60 * 24);
        if (historyPeriodFilter === "7d" && diffDays > 7) return false;
        if (historyPeriodFilter === "30d" && diffDays > 30) return false;
        if (historyPeriodFilter === "90d" && diffDays > 90) return false;
      }
      return true;
    });
  }, [historyCategoryFilter, historyChangeTypeFilter, historyFieldFilter, historyPeriodFilter, historyReviewerFilter, privacyHistory]);

  const historySummary = useMemo(() => {
    const lastEvent = filteredPrivacyHistory[0] || null;
    return {
      total: filteredPrivacyHistory.length,
      lastChangedAt: lastEvent?.changed_at || null,
      lastReviewer: lastEvent ? historyActorLabel(lastEvent) : null,
      accessChanges: filteredPrivacyHistory.filter((event) => event.field_names.some((field) => ["access_scope", "access_roles"].includes(field))).length,
      legalBasisChanges: filteredPrivacyHistory.filter((event) => event.field_names.includes("legal_basis")).length,
      sensitivityChanges: filteredPrivacyHistory.filter((event) =>
        event.field_names.some((field) => ["classification", "has_personal_data", "has_sensitive_personal_data"].includes(field)),
      ).length,
      increasedRisk: filteredPrivacyHistory.filter((event) => classifyHistoryImpact(event).direction === "up").length,
      reducedRisk: filteredPrivacyHistory.filter((event) => classifyHistoryImpact(event).direction === "down").length,
    };
  }, [filteredPrivacyHistory]);

  const globalEventSchemaOptions = useMemo(
    () => Object.keys(eventSummary?.by_schema || {}).sort((left, right) => left.localeCompare(right, "pt-BR")),
    [eventSummary?.by_schema],
  );

  const globalEventReviewerOptions = useMemo(
    () => Object.keys(eventSummary?.by_reviewer || {}).sort((left, right) => left.localeCompare(right, "pt-BR")),
    [eventSummary?.by_reviewer],
  );

  const globalEventsExportHref = useMemo(() => {
    const params = new URLSearchParams();
    const dateFrom = periodDateFrom(globalEventsPeriodFilter);
    if (dateFrom) params.set("date_from", dateFrom);
    if (globalEventsSchemaFilter !== "all") {
      const [databaseName, schemaName] = globalEventsSchemaFilter.split(".");
      if (databaseName) params.set("database_name", databaseName);
      if (schemaName) params.set("schema_name", schemaName);
    }
    if (globalEventsReviewerFilter !== "all") params.set("reviewer", globalEventsReviewerFilter);
    if (globalEventTypeFilter !== "all") params.set("review_type", globalEventTypeFilter);
    if (globalEventsRiskBeforeFilter !== "all") params.set("risk_before", globalEventsRiskBeforeFilter);
    if (globalEventsRiskAfterFilter !== "all") params.set("risk_after", globalEventsRiskAfterFilter);
    if (globalRiskDirectionFilter === "increased") params.set("only_risk_increased", "true");
    if (globalRiskDirectionFilter === "reduced") params.set("only_risk_reduced", "true");
    if (globalEventsFocusFilter === "access_scope") params.set("field", "access_scope");
    if (globalEventsFocusFilter === "legal_basis") params.set("field", "legal_basis");
    if (globalEventsFocusFilter === "privacy_purpose") params.set("field", "privacy_purpose");
    if (globalEventsFocusFilter === "periodic_review") params.set("review_type", "periodic_review");
    return `/api/v1/privacy-access/events/export.csv${params.toString() ? `?${params.toString()}` : ""}`;
  }, [
    globalEventTypeFilter,
    globalEventsFocusFilter,
    globalEventsPeriodFilter,
    globalEventsReviewerFilter,
    globalEventsRiskAfterFilter,
    globalEventsRiskBeforeFilter,
    globalEventsSchemaFilter,
    globalRiskDirectionFilter,
  ]);

  const filteredRecentEvents = useMemo(() => {
    const items = eventSummary?.recent_events || [];
    return items.filter((event) => {
      if (globalEventTypeFilter !== "all" && event.review_type !== globalEventTypeFilter) return false;
      const before = event.risk_before || "unknown";
      const after = event.risk_after || "unknown";
      const order = { unknown: 0, low: 1, medium: 2, high: 3, critical: 4 };
      const beforeRank = order[before as keyof typeof order] ?? 0;
      const afterRank = order[after as keyof typeof order] ?? 0;
      if (globalRiskDirectionFilter === "increased" && !(afterRank > beforeRank)) return false;
      if (globalRiskDirectionFilter === "reduced" && !(afterRank < beforeRank)) return false;
      if (globalRiskDirectionFilter === "unchanged" && !(afterRank === beforeRank)) return false;
      return true;
    });
  }, [eventSummary?.recent_events, globalEventTypeFilter, globalRiskDirectionFilter]);

  async function reloadEventSummary() {
    try {
      const next = await apiRequest<PrivacyEventSummary>("/v1/privacy-access/events/summary");
      setEventSummary(next);
    } catch {
      setEventSummary(null);
    }
  }

  async function reloadSelectedDetail(tableId: number) {
    const data = await apiRequest<PrivacyTableDetail>(`/v1/privacy-access/tables/${tableId}`);
    setDetail(data);
    setForm(buildForm(data));
    return data;
  }

  async function reloadSelectedHistory(tableId: number) {
    try {
      const dedicatedPage = await apiRequest<PrivacyReviewEventPage>(`/v1/privacy-access/tables/${tableId}/events?page_size=100`);
      setPrivacyHistory((dedicatedPage.items || []).map(mapDedicatedHistoryEvent));
      setPrivacyHistorySource("dedicated");
    } catch {
      const auditPage = await apiRequest<AuditHistoryPage>(`/v1/audit/history/table/${tableId}?page_size=100`);
      setPrivacyHistory((auditPage.items || []).filter(isPrivacyHistoryEvent).map(mapAuditHistoryEvent));
      setPrivacyHistorySource("audit_fallback");
    }
  }

  async function savePolicy() {
    if (!detail) return;
    setSaving(true);
    try {
      const updated = await apiRequest<PrivacyTableDetail>(`/v1/privacy-access/tables/${detail.id}`, {
        method: "PATCH",
        body: JSON.stringify(form),
      });
      setDetail(updated);
      setForm(buildForm(updated));
      await reloadSelectedHistory(detail.id);
      await reloadEventSummary();
      setItems((current) => current.map((item) => (item.id === updated.id ? updated : item)));
      setToast({ tone: "success", message: "Política de privacidade atualizada com sucesso." });
    } catch (error) {
      setToast({ tone: "neutral", message: (error as Error).message || "Falha ao salvar política." });
    } finally {
      setSaving(false);
    }
  }

  async function savePeriodicReview() {
    if (!detail) return;
    setPeriodicReviewSaving(true);
    try {
      const updated = await apiRequest<PrivacyTableDetail>(`/v1/privacy-access/tables/${detail.id}/periodic-review`, {
        method: "POST",
        body: JSON.stringify({
          notes: periodicReviewForm.notes || null,
          next_review_at: periodicReviewForm.next_review_at ? new Date(periodicReviewForm.next_review_at).toISOString() : null,
          confirmed: periodicReviewForm.confirmed,
        }),
      });
      setItems((current) => current.map((item) => (item.id === updated.id ? updated : item)));
      await reloadSelectedDetail(detail.id);
      await reloadSelectedHistory(detail.id);
      await reloadEventSummary();
      setPeriodicReviewOpen(false);
      setPeriodicReviewForm({ notes: "", next_review_at: null, confirmed: false });
      setToast({ tone: "success", message: "Revisão periódica registrada com sucesso." });
    } catch (error) {
      setToast({ tone: "neutral", message: (error as Error).message || "Falha ao registrar revisão periódica." });
    } finally {
      setPeriodicReviewSaving(false);
    }
  }

  function toggleRole(role: string) {
    setForm((current) => ({
      ...current,
      access_roles: current.access_roles.includes(role)
        ? current.access_roles.filter((item) => item !== role)
        : [...current.access_roles, role],
    }));
  }

  useEffect(() => {
    const publicId = exportJob?.artifact_public_id;
    if (!publicId || !["queued", "running"].includes((exportJob?.status || "").toLowerCase())) {
      return;
    }
    let cancelled = false;
    const interval = window.setInterval(() => {
      void (async () => {
        try {
          const payload = await getExportJobStatus(publicId);
          if (cancelled) return;
          const job = payload as PlatformIntegrationSyncJob;
          setExportJob(job);
          if (job.status === "success" && job.export_download_href) {
            window.clearInterval(interval);
          } else if (job.status === "failed") {
            window.clearInterval(interval);
            setToast({ tone: "warning", message: job.error || "A exportação falhou." });
          }
        } catch {
          // keep polling
        }
      })();
    }, 3000);
    return () => {
      cancelled = true;
      window.clearInterval(interval);
    };
  }, [exportJob?.artifact_public_id, exportJob?.status]);

  return (
    <div className="space-y-6">
      <Card className="border-border/80 bg-gradient-to-br from-white via-slate-50 to-cyan-50 shadow-[0_18px_48px_rgba(15,23,42,0.05)]">
        <CardContent className="space-y-6 p-6">
          <div className="grid gap-6 xl:grid-cols-[1.35fr_0.95fr]">
            <div className="space-y-4">
              <div className="inline-flex items-center gap-2 rounded-full border border-cyan-200 bg-surface px-3 py-1 text-xs font-medium text-cyan-700">
                <ShieldCheck className="h-3.5 w-3.5" />
                Governança aplicada à privacidade do catálogo
              </div>
              <div>
                <h2 className="text-3xl font-semibold tracking-tight text-text">Privacidade &amp; Acesso</h2>
                <p className="mt-2 max-w-3xl text-sm leading-7 text-text-body">
                  Esta área ajuda a classificar a sensibilidade dos ativos, registrar contexto LGPD e controlar quem pode
                  visualizar cada tabela no catálogo. Use a tela para revisar suspeitas de dado pessoal, formalizar a
                  classificação e ajustar o acesso conforme o risco.
                </p>
              </div>
              <div className="rounded-2xl border border-cyan-200/80 bg-surface/80 p-4 text-sm leading-6 text-text-body">
                A classificação de privacidade não é apenas uma etiqueta. Ela orienta acesso, governança, auditoria,
                consumo analítico e conformidade com políticas internas e LGPD.
              </div>
            </div>
            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-2">
              {[
                {
                  label: "Ativos visíveis",
                  value: effectiveSummary.totals.visible_assets,
                  helper:
                    summarySource === "backend"
                      ? "Resumo global dos ativos visíveis ao seu perfil e filtros aplicados."
                      : "Leitura local dos ativos carregados na lista atual.",
                },
                {
                  label: "Com dado pessoal",
                  value: effectiveSummary.totals.confirmed_personal_data,
                  helper: "Ativos formalmente marcados como contendo dado pessoal.",
                },
                {
                  label: "Dado sensível",
                  value: effectiveSummary.totals.confirmed_sensitive_data,
                  helper: "Ativos com confirmação de dado pessoal sensível e revisão reforçada.",
                },
                {
                  label: "Restritos",
                  value: effectiveSummary.totals.restricted_assets,
                  helper: "Ativos cujo escopo de acesso já está mais controlado.",
                },
                {
                  label: "Não classificados",
                  value: effectiveSummary.totals.unclassified_assets,
                  helper: "Ativos ainda sem decisão formal de sensibilidade.",
                },
                {
                  label: "Possível dado pessoal",
                  value: effectiveSummary.totals.possible_personal_data,
                  helper: "Sinais automáticos que ainda precisam de validação humana.",
                },
                {
                  label: "Sem base legal",
                  value: effectiveSummary.totals.without_legal_basis,
                  helper: "Ativos com dado pessoal confirmado sem base legal registrada.",
                },
                {
                  label: "Acesso amplo com suspeita",
                  value: effectiveSummary.totals.wide_access_with_suspicion,
                  helper: "Ativos com sinal de privacidade ainda expostos a autenticados ou público.",
                },
                {
                  label: "Sem owner",
                  value: effectiveSummary.totals.without_owner,
                  helper: "Ativos sem responsável dificultam revisão, aceite de risco e revalidação.",
                },
              ].map((item) => (
                <div className="rounded-2xl border border-border bg-surface p-4 shadow-sm" key={item.label}>
                  <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-brand-600">{item.label}</p>
                  <p className="mt-3 text-2xl font-semibold text-text">{item.value.toLocaleString("pt-BR")}</p>
                  <p className="mt-1 text-sm text-text-body">{item.helper}</p>
                </div>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-4 xl:grid-cols-3">
        <Card className="border-border/80 shadow-[0_12px_36px_rgba(15,23,42,0.04)] xl:col-span-2">
          <CardContent className="space-y-3 p-6">
            <div>
              <h3 className="text-base font-semibold text-text">Como usar a revisão de privacidade</h3>
              <p className="mt-1 text-sm text-text-body">
                Comece pelos ativos marcados como “Possível dado pessoal”, revise o contexto técnico e formalize a
                decisão com sensibilidade, base legal e escopo de acesso.
              </p>
            </div>
            <div className="grid gap-3 md:grid-cols-3">
              {[
                "Filtre ativos com suspeita automática, falta de owner ou acesso amplo.",
                "Abra o detalhe do ativo para confirmar sensibilidade, LGPD e perfis com acesso.",
                "Registre justificativa, revisão e restrições necessárias antes de ampliar consumo.",
              ].map((step, index) => (
                <div className="rounded-2xl border border-border bg-bg-subtle/80 p-4 text-sm text-text-body" key={step}>
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-brand-600">Passo {index + 1}</p>
                  <p className="mt-2 leading-6">{step}</p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card className="border-warning-200/80 bg-warning-50/60 shadow-[0_12px_36px_rgba(15,23,42,0.04)]">
          <CardContent className="space-y-3 p-6">
            <div className="inline-flex items-center gap-2 rounded-full border border-warning-200 bg-surface px-3 py-1 text-xs font-medium text-warning-700">
              <AlertTriangle className="h-3.5 w-3.5" />
              Sinal automático x classificação formal
            </div>
            <p className="text-sm leading-6 text-amber-950">
              “Possível dado pessoal” é um alerta heurístico baseado nos nomes das colunas do ativo. Ele não substitui a
              decisão formal de governança.
            </p>
            <div className="rounded-2xl border border-warning-200 bg-surface/80 p-4 text-sm leading-6 text-text-body">
              <p>
                <span className="font-semibold text-text">Sinal automático:</span> possível dado pessoal
              </p>
              <p>
                <span className="font-semibold text-text">Decisão formal:</span> dado pessoal confirmado, base legal
                registrada e acesso revisado
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card className="border-border/80 shadow-[0_12px_36px_rgba(15,23,42,0.04)]">
        <CardHeader>
          <div>
            <h3 className="text-sm font-semibold uppercase tracking-[0.18em] text-brand-600">Jornadas principais de privacidade</h3>
            <p className="mt-1 text-sm text-text-body">
              Use os atalhos para revisar contexto técnico, qualidade, incidentes, domínio, produto, linhagem e
              certificação antes de definir sensibilidade ou restringir acesso.
            </p>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
            {JOURNEYS.map((item) => (
              <div className="rounded-2xl border border-border bg-surface p-4 shadow-sm" key={item.title}>
                <p className="text-sm font-semibold text-text">{item.title}</p>
                <p className="mt-2 text-sm leading-6 text-text-body">{item.description}</p>
                <Button asChild className="mt-4 w-full" size="sm" variant="outline">
                  <Link href={item.href}>Abrir</Link>
                </Button>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {toast ? (
        <div className="flex items-center gap-2 rounded-2xl border border-border bg-surface px-4 py-3 text-sm text-text-body shadow-sm">
          <ShieldEllipsis className="h-4 w-4 text-muted" />
          {toast.message}
        </div>
      ) : null}

      <Card className="border-border/80 shadow-[0_12px_36px_rgba(15,23,42,0.04)]">
        <CardHeader>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h3 className="text-sm font-semibold uppercase tracking-[0.18em] text-brand-600">Prioridades de privacidade</h3>
              <p className="mt-1 text-sm text-text-body">
                {summarySource === "backend"
                  ? "Esta lista destaca, em visão global, os ativos visíveis com maior risco de privacidade."
                  : "Esta lista destaca os ativos com maior risco entre os itens carregados na tela atual."}
              </p>
            </div>
            <div className="rounded-2xl bg-bg-subtle p-2 text-text-body">
              <Workflow className="h-4 w-4" />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {priorities.length === 0 ? (
            <EmptyState
              description="Os ativos exibidos não formaram uma prioridade forte com os sinais atuais. Revise outros filtros ou avance para ativos ainda não classificados."
              title="Nenhuma prioridade crítica encontrada"
            />
          ) : (
            <div className="grid gap-3 xl:grid-cols-2">
              {priorities.map((item) => (
                <div className="rounded-2xl border border-border bg-surface p-4 shadow-sm" key={item.table?.id ?? `${item.asset_name}-${item.database_name}-${item.schema_name}`}>
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <p className="text-sm font-semibold text-text">{item.table?.name ?? item.asset_name}</p>
                      <p className="mt-1 text-xs text-muted">
                        {item.table?.datasource_name ? `${item.table.datasource_name} • ` : ""}
                        {item.table?.database_name ?? item.database_name} • {item.table?.schema_name ?? item.schema_name}
                      </p>
                    </div>
                    <Badge tone={item.risk === "critical" ? "danger" : item.risk === "high" ? "warning" : "neutral"}>
                      {summarySource === "backend" ? `Risco ${item.risk}` : `Prioridade ${item.score}`}
                    </Badge>
                  </div>
                  <p className="mt-3 text-sm font-medium text-text-body">{item.reason}</p>
                  <p className="mt-1 text-sm leading-6 text-text-body">
                    {summarySource === "backend"
                      ? "Use esta recomendação para atacar primeiro os ativos com maior impacto regulatório ou operacional."
                      : item.risk}
                  </p>
                  <div className="mt-3 rounded-2xl border border-info-200 bg-info-50/70 p-3 text-sm text-info-700">
                    <span className="font-semibold">Ação recomendada:</span> {item.action}
                  </div>
                  <div className="mt-4 flex justify-end">
                    <Button disabled={!(item.table?.id ?? item.asset_id)} onClick={() => setSelectedId(item.table?.id ?? item.asset_id ?? null)} size="sm" variant="outline">
                      Revisar privacidade
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <div className="grid gap-4 xl:grid-cols-2">
        <Card className="border-border/80 shadow-[0_12px_36px_rgba(15,23,42,0.04)]">
          <CardHeader>
            <div>
              <h3 className="text-sm font-semibold uppercase tracking-[0.18em] text-brand-600">Matriz de risco de privacidade</h3>
              <p className="mt-1 text-sm text-text-body">
                Sensibilidade combinada com escopo de acesso. Quanto maior o risco e mais amplo o acesso, maior a prioridade de revisão.
              </p>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid gap-3 sm:grid-cols-2">
              {[
                {
                  label: "Crítico",
                  value: effectiveSummary.risk.critical,
                  helper: "Dado sensível com acesso amplo ou combinação forte de exposição e ausência de governança.",
                  className: "border-danger-200 bg-danger-50/70 text-danger-700",
                },
                {
                  label: "Alto",
                  value: effectiveSummary.risk.high,
                  helper: "Ativos com dado pessoal sem base legal ou suspeita forte ainda sem classificação formal.",
                  className: "border-warning-200 bg-warning-50/70 text-warning-700",
                },
                {
                  label: "Atenção",
                  value: effectiveSummary.risk.medium,
                  helper: "Pendências de owner, revisão, finalidade ou classificação ainda exigem ação.",
                  className: "border-info-200 bg-info-50/70 text-info-700",
                },
                {
                  label: "Controlado",
                  value: effectiveSummary.risk.low,
                  helper: "Ativos com política mais madura e acesso compatível com a leitura atual.",
                  className: "border-success-200 bg-success-50/70 text-success-700",
                },
              ].map((item) => (
                <div className={cn("rounded-2xl border p-4", item.className)} key={item.label}>
                  <p className="text-[11px] font-semibold uppercase tracking-[0.18em]">{item.label}</p>
                  <p className="mt-3 text-2xl font-semibold">{item.value.toLocaleString("pt-BR")}</p>
                  <p className="mt-1 text-sm leading-6 opacity-90">{item.helper}</p>
                </div>
              ))}
            </div>
            <p className="mt-4 text-xs leading-5 text-muted">
              {summarySource === "backend"
                ? "Esta matriz usa o resumo global dos ativos visíveis ao seu perfil e filtros aplicados."
                : "Resumo em fallback local, baseado apenas nos ativos carregados na lista atual."}
            </p>
          </CardContent>
        </Card>

        <Card className="border-border/80 shadow-[0_12px_36px_rgba(15,23,42,0.04)]">
          <CardHeader>
            <div className="flex items-center justify-between gap-3">
              <div>
                <h3 className="text-sm font-semibold uppercase tracking-[0.18em] text-brand-600">Principais bloqueios globais</h3>
                <p className="mt-1 text-sm text-text-body">
                  Bloqueios mais frequentes entre os ativos visíveis. Use esta leitura para organizar ações em lote.
                </p>
              </div>
              {canExport ? (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() =>
                    void (async () => {
                      const result = await downloadApiFile(
                        `/v1/privacy-access/export.csv${(() => {
                          const params = new URLSearchParams();
                          if (q.trim()) params.set("q", q.trim());
                          if (sensitivityFilter !== "all") params.set("sensitivity_level", sensitivityFilter);
                          if (personalDataFilter !== "all") {
                            params.set("has_personal_data", personalDataFilter === "yes" ? "true" : "false");
                          }
                          return params.toString() ? `?${params.toString()}` : "";
                        })()}`,
                        "privacy_access_export.csv",
                        undefined,
                        {
                          confirmMessage:
                            "Exportar o recorte filtrado de privacidade (limite de 1.000 linhas)? A exportacao sera auditada e campos sensiveis permanecem mascarados.",
                        },
                      );
                      if (result.kind === "queued") {
                        setExportJob(result.job as PlatformIntegrationSyncJob);
                      } else {
                        setExportJob(null);
                      }
                    })()
                  }
                >
                  Exportar pendências
                </Button>
              ) : null}
            </div>
            {exportJob ? (
              <p className="mt-2 text-xs text-muted">
                Exportação {exportJob.status}.{" "}
                {exportJob.export_download_available && exportJob.export_download_href ? (
                  <a className="font-medium text-info-700 underline" href={safeHref(exportJob.export_download_href)}>
                    baixar arquivo
                  </a>
                ) : (
                  <span>Atualize para verificar novamente. Expira em {exportJob.artifact_expires_at ? new Date(exportJob.artifact_expires_at).toLocaleString("pt-BR") : "breve"}</span>
                )}
              </p>
            ) : null}
          </CardHeader>
          <CardContent>
            {effectiveSummary.top_blockers.length === 0 ? (
              <EmptyState
                title="Nenhum bloqueio relevante encontrado"
                description="Os ativos visíveis não apresentaram pendências fortes nesta leitura. Continue revisando ativos novos ou alterados."
              />
            ) : (
              <div className="space-y-3">
                {effectiveSummary.top_blockers.map((blocker) => (
                  <div className="rounded-2xl border border-border bg-surface p-4 shadow-sm" key={blocker.key}>
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div>
                        <p className="text-sm font-semibold text-text">{blocker.label}</p>
                        <p className="mt-1 text-sm leading-6 text-text-body">{blocker.description}</p>
                      </div>
                      <Badge tone="warning">
                        {blocker.count} ativos • {blocker.percent.toLocaleString("pt-BR")}%
                      </Badge>
                    </div>
                    <p className="mt-3 text-sm text-info-700">
                      <span className="font-semibold">Ação recomendada:</span> {blocker.action}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 xl:grid-cols-3">
        <Card className="border-border/80 shadow-[0_12px_36px_rgba(15,23,42,0.04)] xl:col-span-2">
          <CardHeader>
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h3 className="text-sm font-semibold uppercase tracking-[0.18em] text-brand-600">Eventos de privacidade</h3>
                <p className="mt-1 text-sm text-text-body">
                  Acompanhe alterações de sensibilidade, base legal, finalidade, acesso e revisões periódicas registradas na trilha dedicada de privacidade.
                </p>
              </div>
              {canExport ? (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() =>
                    void (async () => {
                      const result = await downloadApiFile("/v1/privacy-access/events/export.csv", "privacy_review_events.csv", undefined, {
                        confirmMessage:
                          "Exportar eventos de privacidade (limite de 1.000 linhas)? A exportacao sera auditada e observacoes sensiveis sao redigidas.",
                      });
                      if (result.kind === "queued") {
                        setExportJob(result.job as PlatformIntegrationSyncJob);
                      } else {
                        setExportJob(null);
                      }
                    })()
                  }
                >
                  Exportar eventos de privacidade
                </Button>
              ) : null}
            </div>
          </CardHeader>
          <CardContent>
            {eventSummary ? (
              <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
                {[
                  { label: "Total de eventos", value: eventSummary.total_events, helper: "Todas as mudanças e revisões formais registradas." },
                  { label: "Revisões periódicas", value: eventSummary.periodic_reviews, helper: "Revisões registradas sem mudança de política." },
                  { label: "Mudanças de classificação", value: eventSummary.by_type.classification || 0, helper: "Alterações na sensibilidade, dado pessoal ou sensível." },
                  { label: "Mudanças de acesso", value: eventSummary.access_changes, helper: "Ajustes em escopo e roles de acesso." },
                  { label: "Mudanças de base legal", value: eventSummary.legal_basis_changes, helper: "Alterações no fundamento jurídico do tratamento." },
                  { label: "Mudanças de finalidade", value: eventSummary.purpose_changes, helper: "Alterações no propósito declarado do tratamento." },
                  { label: "Aumentaram risco", value: eventSummary.increased_risk, helper: "Mudanças que elevaram a exposição do ativo." },
                  { label: "Reduziram risco", value: eventSummary.reduced_risk, helper: "Mudanças que reforçaram os controles." },
                  { label: "Revisões vencidas", value: eventSummary.review_due.overdue, helper: "Ativos cuja próxima revisão já passou do prazo." },
                  { label: "Vencem em 30 dias", value: eventSummary.review_due.due_30_days, helper: "Revisões que precisam entrar na agenda imediatamente." },
                ].map((item) => (
                  <div className="rounded-2xl border border-border bg-surface p-4 shadow-sm" key={item.label}>
                    <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-brand-600">{item.label}</p>
                    <p className="mt-3 text-2xl font-semibold text-text">{item.value.toLocaleString("pt-BR")}</p>
                    <p className="mt-1 text-sm text-text-body">{item.helper}</p>
                  </div>
                ))}
              </div>
            ) : (
              <EmptyState
                title="Resumo global de eventos indisponível"
                description="A trilha dedicada de privacidade ainda não retornou summary global nesta leitura. O histórico por ativo continua disponível no painel lateral."
              />
            )}
          </CardContent>
        </Card>

        <Card className="border-border/80 shadow-[0_12px_36px_rgba(15,23,42,0.04)]">
          <CardHeader>
            <div>
              <h3 className="text-sm font-semibold uppercase tracking-[0.18em] text-brand-600">Variação de risco</h3>
              <p className="mt-1 text-sm text-text-body">
                Veja quantas alterações aumentaram, reduziram ou mantiveram o risco de privacidade.
              </p>
            </div>
          </CardHeader>
          <CardContent>
            {eventSummary ? (
              <div className="space-y-3">
                {[
                  { label: "Aumentaram risco", value: eventSummary.increased_risk, tone: "text-danger-700" },
                  { label: "Reduziram risco", value: eventSummary.reduced_risk, tone: "text-success-700" },
                  { label: "Mantiveram risco", value: eventSummary.unchanged_risk, tone: "text-text-body" },
                  { label: "Risco crítico atual", value: eventSummary.current_risk_critical, tone: "text-danger-700" },
                  { label: "Risco alto atual", value: eventSummary.current_risk_high, tone: "text-warning-700" },
                ].map((item) => (
                  <div className="flex items-center justify-between rounded-2xl border border-border bg-bg-subtle/70 px-4 py-3" key={item.label}>
                    <span className="text-sm text-text-body">{item.label}</span>
                    <span className={cn("text-sm font-semibold", item.tone)}>{item.value.toLocaleString("pt-BR")}</span>
                  </div>
                ))}
              </div>
            ) : (
              <EmptyState
                className="shadow-none"
                title="Sem leitura global de risco"
                description="Assim que o summary global de eventos estiver disponível, a tela passa a mostrar variação de risco e vencimentos de revisão."
              />
            )}
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 xl:grid-cols-2">
        <Card className="border-border/80 shadow-[0_12px_36px_rgba(15,23,42,0.04)]">
          <CardHeader>
            <div>
              <h3 className="text-sm font-semibold uppercase tracking-[0.18em] text-brand-600">Revisões de privacidade</h3>
              <p className="mt-1 text-sm text-text-body">
                Acompanhe ativos que precisam de nova revisão de privacidade ou ainda não têm próxima revisão planejada.
              </p>
            </div>
          </CardHeader>
          <CardContent>
            {eventSummary ? (
              <div className="grid gap-3 sm:grid-cols-2">
                {[
                  { label: "Revisões vencidas", value: eventSummary.review_due.overdue, helper: "Prioridade imediata para revalidação." },
                  { label: "Vencem em 30 dias", value: eventSummary.review_due.due_30_days, helper: "Entram primeiro no planejamento operacional." },
                  { label: "Vencem em 60 dias", value: eventSummary.review_due.due_60_days, helper: "Janela para antecipar revisões sem urgência imediata." },
                  { label: "Sem próxima revisão", value: eventSummary.review_due.without_next_review, helper: "Ativos sem agenda formal de revalidação." },
                  { label: "Sensíveis sem revisão agendada", value: eventSummary.review_due.sensitive_without_next_review, helper: "Ativos sensíveis pedem reforço de governança." },
                ].map((item) => (
                  <div className="rounded-2xl border border-border bg-surface p-4 shadow-sm" key={item.label}>
                    <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-brand-600">{item.label}</p>
                    <p className="mt-3 text-2xl font-semibold text-text">{item.value.toLocaleString("pt-BR")}</p>
                    <p className="mt-1 text-sm text-text-body">{item.helper}</p>
                  </div>
                ))}
              </div>
            ) : (
              <EmptyState
                title="Nenhum vencimento consolidado disponível"
                description="Acompanhe o histórico por ativo enquanto a visão consolidada de revisões vencidas não estiver disponível nesta leitura."
              />
            )}
          </CardContent>
        </Card>

        <Card className="border-border/80 shadow-[0_12px_36px_rgba(15,23,42,0.04)]">
          <CardHeader>
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h3 className="text-sm font-semibold uppercase tracking-[0.18em] text-brand-600">Eventos recentes de privacidade</h3>
                <p className="mt-1 text-sm text-text-body">
                  Últimas mudanças registradas na trilha dedicada, com foco em risco antes/depois e tipo da revisão.
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                <Select onChange={(event) => setGlobalEventTypeFilter(event.target.value)} value={globalEventTypeFilter}>
                  <option value="all">Todos os tipos</option>
                  <option value="periodic_review">Revisão periódica</option>
                  <option value="classification">Classificação</option>
                  <option value="access_change">Acesso</option>
                  <option value="legal_basis_change">Base legal</option>
                  <option value="purpose_change">Finalidade</option>
                  <option value="mixed_change">Múltiplas mudanças</option>
                </Select>
                <Select onChange={(event) => setGlobalRiskDirectionFilter(event.target.value as RiskDirectionFilter)} value={globalRiskDirectionFilter}>
                  <option value="all">Todo impacto</option>
                  <option value="increased">Só aumentou risco</option>
                  <option value="reduced">Só reduziu risco</option>
                  <option value="unchanged">Sem mudança de risco</option>
                </Select>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {eventSummary ? (
              filteredRecentEvents.length ? (
                <div className="space-y-3">
                  {filteredRecentEvents.slice(0, 5).map((event) => (
                    <div className="rounded-2xl border border-border bg-surface p-4 shadow-sm" key={event.id}>
                      <div className="flex flex-wrap items-start justify-between gap-3">
                        <div>
                          <p className="text-sm font-semibold text-text">{event.table_name}</p>
                          <p className="mt-1 text-xs text-muted">
                            {event.database_name} • {event.schema_name} • {formatDateTime(event.created_at)}
                          </p>
                        </div>
                        <Badge tone="neutral">{event.review_type}</Badge>
                      </div>
                      <p className="mt-3 text-sm text-text-body">
                        Revisor: <span className="font-medium text-text">{event.reviewer_name || event.reviewer_email || "Sistema"}</span>
                      </p>
                      <p className="mt-1 text-sm text-text-body">
                        Risco: <span className="font-medium text-text">{event.risk_before || "unknown"}</span> →{" "}
                        <span className="font-medium text-text">{event.risk_after || "unknown"}</span>
                      </p>
                      <p className="mt-1 text-sm text-text-body">
                        Campo principal:{" "}
                        <span className="font-medium text-text-body">
                          {event.changed_fields[0]?.field ? privacyHistoryFieldLabel(event.changed_fields[0].field) : "Sem alteração de política"}
                        </span>
                      </p>
                      <div className="mt-3 flex justify-end">
                        <Button onClick={() => setSelectedId(event.table_id)} size="sm" variant="outline">
                          Abrir ativo
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <EmptyState
                  title="Nenhum evento recente com estes filtros"
                  description="Ajuste o tipo de revisão ou o filtro de impacto para ver outras mudanças na trilha dedicada."
                />
              )
            ) : (
              <EmptyState
                title="Sem eventos recentes carregados"
                description="Assim que o summary global responder, esta lista passa a mostrar as últimas revisões e mudanças de política."
              />
            )}
          </CardContent>
        </Card>
      </div>

      <Card className="border-border/80 shadow-[0_12px_36px_rgba(15,23,42,0.04)]">
        <CardHeader>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h3 className="text-sm font-semibold uppercase tracking-[0.18em] text-brand-600">Histórico global de privacidade</h3>
              <p className="mt-1 text-sm text-text-body">
                Use os filtros para acompanhar revisões periódicas, mudanças de acesso, base legal, finalidade e variação de risco em toda a trilha dedicada.
              </p>
            </div>
            {canExport ? (
              <Button asChild size="sm" variant="outline">
                <a href={globalEventsExportHref}>Exportar histórico filtrado</a>
              </Button>
            ) : null}
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
            <label className="space-y-1">
              <span className="text-[11px] font-semibold uppercase tracking-[0.18em] text-brand-600">Período</span>
              <Select onChange={(event) => setGlobalEventsPeriodFilter(event.target.value as GlobalEventsPeriodFilter)} value={globalEventsPeriodFilter}>
                <option value="all">Todo o histórico</option>
                <option value="7d">Últimos 7 dias</option>
                <option value="30d">Últimos 30 dias</option>
                <option value="90d">Últimos 90 dias</option>
              </Select>
            </label>
            <label className="space-y-1">
              <span className="text-[11px] font-semibold uppercase tracking-[0.18em] text-brand-600">Banco / schema</span>
              <Select onChange={(event) => setGlobalEventsSchemaFilter(event.target.value)} value={globalEventsSchemaFilter}>
                <option value="all">Todos</option>
                {globalEventSchemaOptions.map((item) => (
                  <option key={item} value={item}>
                    {item}
                  </option>
                ))}
              </Select>
            </label>
            <label className="space-y-1">
              <span className="text-[11px] font-semibold uppercase tracking-[0.18em] text-brand-600">Revisor</span>
              <Select onChange={(event) => setGlobalEventsReviewerFilter(event.target.value)} value={globalEventsReviewerFilter}>
                <option value="all">Todos</option>
                {globalEventReviewerOptions.map((item) => (
                  <option key={item} value={item}>
                    {item}
                  </option>
                ))}
              </Select>
            </label>
            <label className="space-y-1">
              <span className="text-[11px] font-semibold uppercase tracking-[0.18em] text-brand-600">Tipo de revisão</span>
              <Select onChange={(event) => setGlobalEventTypeFilter(event.target.value)} value={globalEventTypeFilter}>
                <option value="all">Todos</option>
                <option value="periodic_review">Revisão periódica</option>
                <option value="classification">Classificação</option>
                <option value="access_change">Acesso</option>
                <option value="legal_basis_change">Base legal</option>
                <option value="purpose_change">Finalidade</option>
                <option value="retention_change">Retenção</option>
                <option value="masking_change">Mascaramento</option>
                <option value="external_sharing_change">Compartilhamento externo</option>
                <option value="mixed_change">Múltiplas mudanças</option>
              </Select>
            </label>
          </div>

          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
            <label className="space-y-1">
              <span className="text-[11px] font-semibold uppercase tracking-[0.18em] text-brand-600">Foco do histórico</span>
              <Select onChange={(event) => setGlobalEventsFocusFilter(event.target.value as GlobalEventsFocusFilter)} value={globalEventsFocusFilter}>
                <option value="all">Todos os campos</option>
                <option value="access_scope">Somente acesso</option>
                <option value="legal_basis">Somente base legal</option>
                <option value="privacy_purpose">Somente finalidade</option>
                <option value="periodic_review">Somente revisão periódica</option>
              </Select>
            </label>
            <label className="space-y-1">
              <span className="text-[11px] font-semibold uppercase tracking-[0.18em] text-brand-600">Risco antes</span>
              <Select onChange={(event) => setGlobalEventsRiskBeforeFilter(event.target.value)} value={globalEventsRiskBeforeFilter}>
                <option value="all">Todos</option>
                <option value="critical">Crítico</option>
                <option value="high">Alto</option>
                <option value="medium">Médio</option>
                <option value="low">Baixo</option>
                <option value="unknown">Desconhecido</option>
              </Select>
            </label>
            <label className="space-y-1">
              <span className="text-[11px] font-semibold uppercase tracking-[0.18em] text-brand-600">Risco depois</span>
              <Select onChange={(event) => setGlobalEventsRiskAfterFilter(event.target.value)} value={globalEventsRiskAfterFilter}>
                <option value="all">Todos</option>
                <option value="critical">Crítico</option>
                <option value="high">Alto</option>
                <option value="medium">Médio</option>
                <option value="low">Baixo</option>
                <option value="unknown">Desconhecido</option>
              </Select>
            </label>
            <label className="space-y-1">
              <span className="text-[11px] font-semibold uppercase tracking-[0.18em] text-brand-600">Variação do risco</span>
              <Select onChange={(event) => setGlobalRiskDirectionFilter(event.target.value as RiskDirectionFilter)} value={globalRiskDirectionFilter}>
                <option value="all">Todas</option>
                <option value="increased">Só aumentou risco</option>
                <option value="reduced">Só reduziu risco</option>
                <option value="unchanged">Sem mudança de risco</option>
              </Select>
            </label>
          </div>

          <p className="text-xs leading-5 text-muted">
            Esta fila usa a trilha dedicada de privacidade. A exportação preserva os filtros globais aplicados nesta seção.
          </p>

          {globalEventsLoading ? (
            <div className="space-y-3">
              {Array.from({ length: 4 }).map((_, idx) => (
                <Skeleton className="h-24 w-full" key={idx} />
              ))}
            </div>
          ) : eventsPageData?.items?.length ? (
            <>
              <div className="space-y-3">
                {eventsPageData.items.map((event) => {
                  const historyEntry = mapDedicatedHistoryEvent(event);
                  const impact = classifyHistoryImpact(historyEntry);
                  const isPeriodicReview = event.review_type === "periodic_review";
                  return (
                    <div className="rounded-2xl border border-border bg-surface p-4 shadow-sm" key={event.id}>
                      <div className="flex flex-wrap items-start justify-between gap-3">
                        <div>
                          <p className="text-sm font-semibold text-text">{event.table_name}</p>
                          <p className="mt-1 text-xs text-muted">
                            {event.database_name} • {event.schema_name} • {formatDateTime(event.created_at)}
                          </p>
                        </div>
                        <div className="flex flex-wrap gap-2">
                          <Badge tone={impact.tone}>{impact.label}</Badge>
                          <Badge tone="neutral">{event.review_type}</Badge>
                        </div>
                      </div>
                      <div className="mt-3 grid gap-3 sm:grid-cols-2 xl:grid-cols-4 text-sm text-text-body">
                        <p>
                          Revisor: <span className="font-medium text-text">{event.reviewer_name || event.reviewer_email || "Sistema"}</span>
                        </p>
                        <p>
                          Risco: <span className="font-medium text-text">{event.risk_before || "unknown"}</span> →{" "}
                          <span className="font-medium text-text">{event.risk_after || "unknown"}</span>
                        </p>
                        <p>
                          Próxima revisão: <span className="font-medium text-text">{event.next_review_at ? formatDateTime(event.next_review_at) : "Não definida"}</span>
                        </p>
                        <p>
                          Campo principal:{" "}
                          <span className="font-medium text-text">
                            {event.changed_fields[0]?.field ? privacyHistoryFieldLabel(event.changed_fields[0].field) : "Sem alteração de política"}
                          </span>
                        </p>
                      </div>
                      <div className="mt-3 rounded-2xl border border-border bg-bg-subtle/70 p-3 text-sm text-text-body">
                        {isPeriodicReview ? (
                          <span>A revisão periódica confirmou que a política atual continua válida sem alterações formais.</span>
                        ) : (
                          <span>{event.notes || impact.description}</span>
                        )}
                      </div>
                      <div className="mt-3 flex justify-end">
                        <Button onClick={() => setSelectedId(event.table_id)} size="sm" variant="outline">
                          Abrir ativo
                        </Button>
                      </div>
                    </div>
                  );
                })}
              </div>

              <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                <p className="text-xs text-muted">
                  Mostrando página {eventsPageData.page} de {Math.max(1, Math.ceil(eventsPageData.total / eventsPageData.page_size))} • total de eventos filtrados:{" "}
                  {eventsPageData.total.toLocaleString("pt-BR")}
                </p>
                <div className="flex gap-2">
                  <Button disabled={globalEventsPage <= 1} onClick={() => setGlobalEventsPage((current) => Math.max(1, current - 1))} size="sm" variant="outline">
                    Anterior
                  </Button>
                  <Button
                    disabled={globalEventsPage >= Math.max(1, Math.ceil(eventsPageData.total / eventsPageData.page_size))}
                    onClick={() =>
                      setGlobalEventsPage((current) =>
                        Math.min(Math.max(1, Math.ceil(eventsPageData.total / eventsPageData.page_size)), current + 1),
                      )
                    }
                    size="sm"
                    variant="outline"
                  >
                    Próxima
                  </Button>
                </div>
              </div>
            </>
          ) : (
            <EmptyState
              title="Nenhum evento encontrado com estes filtros"
              description="Ajuste período, schema, revisor, tipo de revisão ou risco para encontrar outras mudanças na trilha dedicada."
            />
          )}
        </CardContent>
      </Card>

      <Card className="border-border/80 shadow-[0_12px_36px_rgba(15,23,42,0.04)]">
        <CardHeader>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h3 className="text-sm font-semibold uppercase tracking-[0.18em] text-brand-600">Distribuição de privacidade</h3>
              <p className="mt-1 text-sm text-text-body">
                Onde estão concentrados os ativos não classificados, com sinal automático, acesso amplo ou ausência de base legal.
              </p>
            </div>
            <p className="text-xs leading-5 text-muted">
              {summarySource === "backend"
                ? "Este resumo considera todos os ativos visíveis ao seu perfil e filtros aplicados."
                : "Fallback local: a distribuição considera apenas os ativos carregados na lista atual."}
            </p>
          </div>
        </CardHeader>
        <CardContent>
          {effectiveSummary.by_schema.length === 0 ? (
            <EmptyState
              title="Nenhuma distribuição disponível"
              description="Ainda não há ativos suficientes para agrupar riscos por banco e schema na leitura atual."
            />
          ) : (
            <div className="overflow-hidden rounded-2xl border border-border bg-surface">
              <div className="grid grid-cols-[1.1fr_0.55fr_0.55fr_0.55fr_0.55fr_0.55fr_0.55fr] gap-3 border-b border-border bg-bg-subtle px-4 py-3 text-[11px] font-semibold uppercase tracking-[0.18em] text-brand-600">
                <span>Banco / schema</span>
                <span>Total</span>
                <span>Não classif.</span>
                <span>Possível</span>
                <span>Pessoal</span>
                <span>Sem base</span>
                <span>Risco</span>
              </div>
              <div className="divide-y divide-border">
                {effectiveSummary.by_schema.map((item) => (
                  <div className="grid grid-cols-[1.1fr_0.55fr_0.55fr_0.55fr_0.55fr_0.55fr_0.55fr] gap-3 px-4 py-4 text-sm" key={`${item.database}.${item.schema_name}`}>
                    <div>
                      <p className="font-semibold text-text">
                        {item.database}.{item.schema_name}
                      </p>
                      <p className="mt-1 text-xs text-muted">
                        Restritos: {item.restricted} • Suspição com acesso amplo: {item.wide_access_with_suspicion}
                      </p>
                    </div>
                    <span className="text-text-body">{item.total}</span>
                    <span className="text-text-body">{item.unclassified}</span>
                    <span className="text-text-body">{item.possible_personal_data}</span>
                    <span className="text-text-body">{item.confirmed_personal_data}</span>
                    <span className="text-text-body">{item.without_legal_basis}</span>
                    <span>
                      <Badge tone={item.risk_score >= 80 ? "danger" : item.risk_score >= 55 ? "warning" : "neutral"}>
                        {item.risk_score}
                      </Badge>
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <div className="grid gap-4 xl:grid-cols-[1fr_1fr]">
        <Card className="border-border/80 shadow-[0_12px_36px_rgba(15,23,42,0.04)]">
          <CardHeader className="space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h3 className="text-sm font-semibold uppercase tracking-[0.18em] text-brand-600">Visão operacional</h3>
                <p className="mt-1 text-sm text-text-body">
                  Revise a sensibilidade, o contexto LGPD e o escopo de acesso dos ativos catalogados.
                </p>
                <p className="mt-1 text-xs leading-5 text-muted">
                  A listagem é paginada em blocos de 10 ativos para manter performance e facilitar a revisão em catálogos grandes.
                </p>
              </div>
              <div className="rounded-2xl bg-bg-subtle p-2 text-text-body">
                <SlidersHorizontal className="h-4 w-4" />
              </div>
            </div>

            <div className="grid gap-3 md:grid-cols-[1fr_180px_160px]">
              <Input onChange={(event) => setQ(event.target.value)} placeholder="Buscar tabela, owner, schema ou observação" value={q} />
              <Select onChange={(event) => setSensitivityFilter(event.target.value)} value={sensitivityFilter}>
                <option value="all">Todas as sensibilidades</option>
                {(options?.sensitivity_levels || []).map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </Select>
              <Select onChange={(event) => setPersonalDataFilter(event.target.value)} value={personalDataFilter}>
                <option value="all">LGPD: todos</option>
                <option value="yes">Com dado pessoal</option>
                <option value="no">Sem dado pessoal</option>
              </Select>
            </div>

            <div className="space-y-2">
              <div className="flex flex-wrap items-center gap-2">
                <Filter className="h-4 w-4 text-muted" />
                <p className="text-sm text-text-body">
                  Use os filtros rápidos para priorizar ativos com maior risco de privacidade. Eles agora filtram todo o catálogo (não apenas a página atual) e a paginação reflete o resultado.
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                {QUICK_FILTERS.map((chip) => (
                  <button
                    className={cn(
                      "rounded-full border px-3 py-1.5 text-xs font-medium transition",
                      quickFilter === chip.key
                        ? "border-info-200 bg-info-50 text-info-700"
                        : "border-border bg-surface text-text-body hover:border-border-strong",
                    )}
                    key={chip.key}
                    onClick={() => setQuickFilter(chip.key)}
                    type="button"
                  >
                    {chip.label}
                  </button>
                ))}
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="space-y-3">
                {Array.from({ length: 6 }).map((_, idx) => (
                  <Skeleton className="h-24 w-full" key={idx} />
                ))}
              </div>
            ) : filteredItems.length === 0 ? (
              <EmptyState
                description={
                  quickFilter === "all"
                    ? "Nenhum ativo encontrado nesta página. Altere os filtros ou volte para uma página anterior."
                    : "Nenhum ativo carregado corresponde a este filtro rápido nesta página. Remova o filtro, ajuste a busca ou avance para outra página."
                }
                title={quickFilter === "all" ? "Nenhum ativo encontrado nesta página" : "Nenhum resultado para este filtro rápido"}
              />
            ) : (
              <div className="overflow-hidden rounded-2xl border border-border bg-surface">
                <div className="grid grid-cols-[1.15fr_0.7fr_1fr_0.7fr] gap-3 border-b border-border bg-bg-subtle px-4 py-3 text-[11px] font-semibold uppercase tracking-[0.18em] text-brand-600">
                  <span>Ativo</span>
                  <span>Sensibilidade</span>
                  <span>LGPD &amp; acesso</span>
                  <span className="text-right">Ação</span>
                </div>
                <div className="divide-y divide-border">
                  {filteredItems.map((item) => {
                    const signals = collectRiskSignals(item.privacy, item.owner).slice(0, 2);
                    return (
                      <button
                        className={cn(
                          "grid w-full grid-cols-[1.15fr_0.7fr_1fr_0.7fr] gap-3 px-4 py-4 text-left transition hover:bg-info-50/40",
                          selectedId === item.id && "bg-info-50/50",
                        )}
                        key={item.id}
                        onClick={() => setSelectedId(item.id)}
                        type="button"
                      >
                        <div className="min-w-0">
                          <p className="truncate text-sm font-semibold text-text">{item.name}</p>
                          <p className="mt-1 truncate text-xs text-muted">
                            {item.datasource_name} • {item.database_name} • {item.schema_name}
                          </p>
                          <p className="mt-2 text-xs text-text-body">{item.owner || "Sem owner definido"}</p>
                        </div>
                        <div className="space-y-2">
                          <SensitivityBadge className="max-w-full" level={item.privacy.sensitivity_level} />
                          {item.privacy.possible_personal_data ? <Badge tone="warning">Possível dado pessoal</Badge> : null}
                        </div>
                        <div className="space-y-2">
                          <PrivacySummaryStrip compact privacy={item.privacy} />
                          {signals.length ? (
                            <div className="space-y-1">
                              {signals.map((signal) => (
                                <p className="text-xs text-text-body" key={signal}>
                                  • {signal}
                                </p>
                              ))}
                            </div>
                          ) : (
                            <p className="text-xs text-muted">Sem sinais fortes de risco na leitura atual.</p>
                          )}
                        </div>
                        <div className="flex items-start justify-end">
                          <span className="rounded-full border border-border bg-surface px-2.5 py-1 text-xs font-medium text-text-body">
                            {canEdit ? "Editar" : "Detalhes"}
                          </span>
                        </div>
                      </button>
                    );
                  })}
                </div>
                <div className="flex flex-col gap-3 border-t border-border bg-bg-subtle/70 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
                  <div className="space-y-1">
                    <p className="text-sm text-text-body">
                      Mostrando {listStart.toLocaleString("pt-BR")} a {listEnd.toLocaleString("pt-BR")} de {listTotal.toLocaleString("pt-BR")} ativo(s)
                    </p>
                    <p className="text-xs text-muted">
                      Página {listPage.toLocaleString("pt-BR")} de {listTotalPages.toLocaleString("pt-BR")}
                    </p>
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    <Button disabled={listPage <= 1} onClick={() => setListPage((current) => Math.max(1, current - 1))} size="sm" variant="outline">
                      Anterior
                    </Button>
                    <span className="rounded-full border border-border bg-surface px-3 py-1.5 text-xs font-medium text-text-body">
                      Página {listPage}
                    </span>
                    <Button
                      disabled={!listHasMore || listPage >= listTotalPages}
                      onClick={() => setListPage((current) => Math.min(listTotalPages, current + 1))}
                      size="sm"
                      variant="outline"
                    >
                      Próxima
                    </Button>
                  </div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="border-border/80 shadow-[0_12px_36px_rgba(15,23,42,0.04)]">
          <CardHeader>
            <div className="flex items-center justify-between gap-3">
              <div>
                <h3 className="text-sm font-semibold uppercase tracking-[0.18em] text-brand-600">Política de privacidade do ativo</h3>
                <p className="mt-1 text-sm text-text-body">
                  Classificação, LGPD e acesso da tabela selecionada.
                </p>
              </div>
              {selectedId ? (
                <button className="rounded-full border border-border p-2 text-muted transition hover:bg-bg-subtle" onClick={() => setSelectedId(null)} type="button">
                  <X className="h-4 w-4" />
                </button>
              ) : null}
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {detailLoading ? (
              <div className="space-y-3">
                <Skeleton className="h-10 w-full" />
                <Skeleton className="h-28 w-full" />
                <Skeleton className="h-40 w-full" />
              </div>
            ) : !detail ? (
              <EmptyState
                description="Selecione uma tabela para revisar sensibilidade, base legal LGPD, retenção, escopo de acesso e justificativas da decisão."
                title="Nenhum ativo selecionado"
              />
            ) : (
              <>
                <div
                  className={cn(
                    "rounded-2xl border border-border bg-gradient-to-r from-white via-slate-50 to-cyan-50 p-4",
                    certificationStatusFrameClass(detail.certification_status),
                    certificationStatusHeaderClass(detail.certification_status),
                  )}
                >
                  <p className="text-lg font-semibold text-text">{detail.name}</p>
                  <p className="mt-1 text-sm text-text-body">
                    {detail.datasource_name} • {detail.database_name} • {detail.schema_name}
                  </p>
                  <div className="mt-3 flex flex-wrap gap-2">
                    <SensitivityBadge level={detailPreview?.sensitivity_level || detail.privacy.sensitivity_level} />
                    <AccessScopeBadge scope={detailPreview?.access_scope || detail.privacy.access_scope} />
                    <CertificationStatusBadge status={detail.certification_status} />
                  </div>
                  <div className="mt-3 grid gap-2 text-sm text-text-body">
                    <p>
                      Owner: <span className="font-medium text-text-body">{detail.owner || "Sem owner definido"}</span>
                    </p>
                    <p>
                      Última revisão: <span className="font-medium text-text-body">{formatDateTime(detail.privacy.privacy_reviewed_at)}</span>
                      {detail.privacy.privacy_reviewed_by_user_name ? ` • ${detail.privacy.privacy_reviewed_by_user_name}` : ""}
                    </p>
                    <p>
                      Descrição:{" "}
                      <span className="font-medium text-text-body">
                        {detail.description_manual || detail.description_source || "Descrição não informada"}
                      </span>
                    </p>
                    <p>
                      Finalidade LGPD:{" "}
                      <span className="font-medium text-text-body">
                        {detailPreview?.privacy_purpose || "Finalidade ainda não estruturada"}
                      </span>
                    </p>
                  </div>
                </div>

                <div className="rounded-2xl border border-border bg-surface p-4">
                  <div className="flex items-start gap-3">
                    <Fingerprint className="mt-0.5 h-4 w-4 text-warning-600" />
                    <div>
                      <p className="text-sm font-semibold text-text">Classificação formal x sinal automático</p>
                      <p className="mt-1 text-sm leading-6 text-text-body">
                        O alerta de “possível dado pessoal” vem de sinais nos nomes das colunas e serve para triagem. A
                        decisão formal depende dos campos de sensibilidade, dado pessoal sensível, base legal e acesso.
                      </p>
                    </div>
                  </div>
                  <div className="mt-3 flex flex-wrap gap-2">
                    {detail.privacy.possible_personal_data ? <Badge tone="warning">Sinal automático ativo</Badge> : <Badge tone="success">Sem sinal automático</Badge>}
                    {hasFormalClassification(detailPreview || {}) ? <Badge tone="neutral">Classificação formal registrada</Badge> : <Badge tone="warning">Classificação formal pendente</Badge>}
                    {detailPreview?.has_sensitive_personal_data ? <Badge tone="warning">Dado sensível confirmado</Badge> : null}
                  </div>
                </div>

                <div className="rounded-2xl border border-border bg-surface p-4">
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-brand-600">Sinais de risco</p>
                  <div className="mt-3 space-y-2">
                    {detailSignals.length ? (
                      detailSignals.map((signal) => (
                        <div className="flex items-start gap-2 rounded-2xl border border-warning-200 bg-warning-50/70 px-3 py-2 text-sm text-warning-700" key={signal}>
                          <AlertTriangle className="mt-0.5 h-4 w-4" />
                          <span>{signal}</span>
                        </div>
                      ))
                    ) : (
                      <div className="flex items-start gap-2 rounded-2xl border border-success-200 bg-success-50/70 px-3 py-2 text-sm text-success-700">
                        <CheckCircle2 className="mt-0.5 h-4 w-4" />
                        <span>Não há bloqueios evidentes nesta leitura. Mantenha a revisão periódica do ativo.</span>
                      </div>
                    )}
                  </div>
                </div>

                <div className="rounded-2xl border border-border bg-surface p-4">
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-brand-600">Próximas ações recomendadas</p>
                  <div className="mt-3 space-y-2">
                    {detailActions.slice(0, 4).map((action, index) => (
                      <div className="flex items-start gap-2 text-sm text-text-body" key={action}>
                        <span className="mt-0.5 inline-flex h-5 w-5 items-center justify-center rounded-full bg-bg-subtle text-[11px] font-semibold text-text-body">
                          {index + 1}
                        </span>
                        <span>{action}</span>
                      </div>
                    ))}
                  </div>
                  {canEdit ? (
                    <div className="mt-4 flex justify-end">
                      <Button
                        onClick={() => {
                          setPeriodicReviewForm({
                            notes: "Política revisada e mantida sem alterações.",
                            next_review_at: latestScheduledReview ? formatDateInputValue(latestScheduledReview) : "",
                            confirmed: false,
                          });
                          setPeriodicReviewOpen(true);
                        }}
                        size="sm"
                        variant="outline"
                      >
                        Registrar revisão periódica
                      </Button>
                    </div>
                  ) : null}
                </div>

                <div className="rounded-2xl border border-border bg-surface p-4">
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-brand-600">Colunas com sinal de privacidade</p>
                  <p className="mt-1 text-sm leading-6 text-text-body">
                    Estas colunas acionaram a heurística automática. O sinal não confirma a classificação, mas ajuda a revisar o ativo com mais precisão.
                  </p>
                  <div className="mt-3 space-y-3">
                    {detail.suspected_columns.length ? (
                      detail.suspected_columns.map((column) => (
                        <div className="rounded-2xl border border-warning-200 bg-warning-50/60 p-4" key={`${column.column_name}-${column.signal}`}>
                          <div className="flex flex-wrap items-start justify-between gap-3">
                            <div>
                              <p className="text-sm font-semibold text-text">{column.column_name}</p>
                              <p className="mt-1 text-xs text-muted">
                                {column.data_type} • sinal: {column.signal}
                              </p>
                            </div>
                            <Badge tone={column.confidence === "high" ? "warning" : "neutral"}>
                              Confiança {column.confidence === "high" ? "alta" : "média"}
                            </Badge>
                          </div>
                          <p className="mt-3 text-sm leading-6 text-text-body">{column.reason}</p>
                          <p className="mt-2 text-sm text-info-700">
                            <span className="font-semibold">Sugestão:</span> revisar o ativo como {column.suggested_classification === "personal_data" ? "dado pessoal" : column.suggested_classification}.
                          </p>
                        </div>
                      ))
                    ) : (
                      <EmptyState
                        className="shadow-none"
                        title="Nenhuma coluna suspeita identificada"
                        description="A heurística não encontrou nomes de colunas associados a dados pessoais. Isso não elimina a necessidade de revisão quando o contexto de negócio indicar risco."
                      />
                    )}
                  </div>
                </div>

                <div className="grid gap-3 sm:grid-cols-2">
                  <label className="space-y-1">
                    <span className="text-xs font-semibold uppercase tracking-[0.18em] text-brand-600">Sensibilidade</span>
                    <Select disabled={!canEdit} onChange={(event) => setForm((current) => ({ ...current, sensitivity_level: event.target.value }))} value={form.sensitivity_level}>
                      <option value="">Selecione</option>
                      {(options?.sensitivity_levels || []).map((option) => (
                        <option key={option.value} value={option.value}>
                          {option.label}
                        </option>
                      ))}
                    </Select>
                    <p className="text-xs leading-5 text-muted">
                      Escolha a classificação formal do ativo. O indicador de dado sensível continua sendo confirmado pelo
                      campo dedicado abaixo.
                    </p>
                  </label>
                  <label className="space-y-1">
                    <span className="text-xs font-semibold uppercase tracking-[0.18em] text-brand-600">Base legal</span>
                    <Select disabled={!canEdit} onChange={(event) => setForm((current) => ({ ...current, legal_basis: event.target.value }))} value={form.legal_basis}>
                      <option value="">Não informada</option>
                      {(options?.legal_basis_options || []).map((option) => (
                        <option key={option.value} value={option.value}>
                          {option.label}
                        </option>
                      ))}
                    </Select>
                    <p className="text-xs leading-5 text-muted">
                      Informe o fundamento jurídico do tratamento quando houver dado pessoal. A finalidade agora fica em
                      campo próprio logo ao lado.
                    </p>
                  </label>
                  <label className="space-y-1">
                    <span className="text-xs font-semibold uppercase tracking-[0.18em] text-brand-600">Finalidade do tratamento</span>
                    <Textarea
                      disabled={!canEdit}
                      onChange={(event) => setForm((current) => ({ ...current, privacy_purpose: event.target.value }))}
                      placeholder="Ex.: permitir atendimento ao cliente, análise de pedidos, cobrança, auditoria operacional ou obrigação regulatória."
                      value={form.privacy_purpose}
                    />
                    <p className="text-xs leading-5 text-muted">
                      Descreva por que os dados são tratados e para qual uso são permitidos. A finalidade ajuda a validar se o uso do ativo está alinhado à LGPD.
                    </p>
                  </label>
                  <label className="space-y-1">
                    <span className="text-xs font-semibold uppercase tracking-[0.18em] text-brand-600">Retenção</span>
                    <Input
                      disabled={!canEdit}
                      onChange={(event) => setForm((current) => ({ ...current, retention_policy: event.target.value }))}
                      placeholder="Ex.: 5 anos após encerramento do contrato"
                      value={form.retention_policy}
                    />
                    <p className="text-xs leading-5 text-muted">
                      Descreva a política ou regra de retenção aplicável. Isso ajuda a orientar descarte, revisão e uso
                      seguro do ativo.
                    </p>
                  </label>
                  <label className="space-y-1">
                    <span className="text-xs font-semibold uppercase tracking-[0.18em] text-brand-600">Escopo de acesso</span>
                    <Select disabled={!canEdit} onChange={(event) => setForm((current) => ({ ...current, access_scope: event.target.value }))} value={form.access_scope}>
                      <option value="">Selecione</option>
                      {(options?.access_scopes || []).map((option) => (
                        <option key={option.value} value={option.value}>
                          {option.label}
                        </option>
                      ))}
                    </Select>
                    <p className="text-xs leading-5 text-muted">
                      Ativos com dado pessoal ou sensível devem evitar acesso amplo sem justificativa clara.
                    </p>
                  </label>
                </div>

                <div className="grid gap-3 sm:grid-cols-2">
                  {[
                    { key: "has_personal_data", label: "Dado pessoal confirmado", helper: "Use quando a revisão humana confirmar presença de dado pessoal." },
                    {
                      key: "has_sensitive_personal_data",
                      label: "Dado pessoal sensível confirmado",
                      helper: "Marque quando houver categoria sensível prevista em LGPD.",
                    },
                    { key: "is_masked", label: "Metadados mascarados", helper: "Sinaliza uso de mascaramento ou anonimização na visualização do catálogo." },
                    { key: "external_sharing", label: "Compartilhamento externo", helper: "Indica que o ativo é compartilhado fora do contexto interno padrão." },
                  ].map((item) => {
                    const checked = form[item.key as keyof PrivacyFormState] as boolean;
                    return (
                      <label className="space-y-2 rounded-2xl border border-border bg-bg-subtle/70 px-4 py-3 text-sm text-text-body" key={item.key}>
                        <span className="flex items-center gap-3">
                          <input
                            checked={checked}
                            className="h-4 w-4 rounded border-border-strong text-info-600 focus:ring-info-500"
                            disabled={!canEdit}
                            onChange={(event) => setForm((current) => ({ ...current, [item.key]: event.target.checked }))}
                            type="checkbox"
                          />
                          <span className="font-medium text-text-body">{item.label}</span>
                        </span>
                        <span className="block text-xs leading-5 text-muted">{item.helper}</span>
                      </label>
                    );
                  })}
                </div>

                <div className="space-y-2 rounded-2xl border border-border bg-surface p-4">
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-brand-600">Perfis com acesso adicional</p>
                  <p className="text-xs leading-5 text-muted">
                    Combine o escopo com perfis adicionais quando precisar abrir exceções controladas para governança,
                    owners ou analistas específicos.
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {(options?.access_roles || []).map((role) => {
                      const active = form.access_roles.includes(role.value);
                      return (
                        <button
                          className={cn(
                            "rounded-full border px-3 py-1.5 text-xs font-medium transition",
                            active ? "border-info-200 bg-info-50 text-info-700" : "border-border bg-surface text-text-body hover:border-border-strong",
                          )}
                          disabled={!canEdit}
                          key={role.value}
                          onClick={() => toggleRole(role.value)}
                          type="button"
                        >
                          {role.label}
                        </button>
                      );
                    })}
                  </div>
                  <AccessRoleBadges labels={form.access_roles.map((role) => options?.access_roles.find((item) => item.value === role)?.label || role)} />
                </div>

                <label className="space-y-1">
                  <span className="text-xs font-semibold uppercase tracking-[0.18em] text-brand-600">Observações e justificativa</span>
                  <Textarea
                    disabled={!canEdit}
                    onChange={(event) => setForm((current) => ({ ...current, privacy_notes: event.target.value }))}
                    placeholder="Registre justificativa da decisão, finalidade do uso, evidências avaliadas, restrições aplicadas e pendências de revisão."
                    value={form.privacy_notes}
                  />
                  <p className="text-xs leading-5 text-muted">
                    Use este campo para registrar finalidade, contexto LGPD, aceite de risco ou motivos para manter acesso
                    amplo ou restrito.
                  </p>
                </label>

                <div className="rounded-2xl border border-border bg-surface p-4">
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-brand-600">Prévia de exibição</p>
                  <div className="mt-3 space-y-3">
                    <PrivacySummaryStrip privacy={detailPreview} />
                    <AccessRoleBadges labels={form.access_roles.map((role) => options?.access_roles.find((item) => item.value === role)?.label || role)} />
                  </div>
                </div>

                <div className="rounded-2xl border border-border bg-surface p-4">
                  <div className="mb-3">
                    <p className="text-xs font-semibold uppercase tracking-[0.18em] text-brand-600">
                      {privacyHistorySource === "dedicated" ? "Histórico dedicado de privacidade" : "Histórico de privacidade"}
                    </p>
                    <p className="mt-1 text-sm leading-6 text-text-body">
                      {privacyHistorySource === "dedicated"
                        ? "Linha do tempo regulatória da política do ativo. Esta visão usa eventos dedicados de privacidade com risco antes/depois, campos alterados e próxima revisão."
                        : "Linha do tempo auditável das alterações de sensibilidade, base legal, finalidade, acesso e revisão deste ativo. Esta linha do tempo utiliza a auditoria geral do catálogo e exibe apenas eventos relacionados aos campos de privacidade."}
                    </p>
                  </div>
                  {historyLoading ? (
                    <div className="space-y-3">
                      <Skeleton className="h-20 w-full" />
                      <Skeleton className="h-16 w-full" />
                      <Skeleton className="h-36 w-full" />
                    </div>
                  ) : privacyHistory.length ? (
                    <div className="space-y-4">
                      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                        {[
                          { label: "Eventos de privacidade", value: historySummary.total, helper: "Eventos visíveis com os filtros atuais." },
                          { label: "Última alteração", value: historySummary.lastChangedAt ? formatDateTime(historySummary.lastChangedAt) : "Sem registros", helper: "Momento da mudança mais recente." },
                          { label: "Último revisor", value: historySummary.lastReviewer || "Não identificado", helper: "Usuário mais recente na trilha filtrada." },
                          { label: "Alterações de acesso", value: historySummary.accessChanges, helper: "Mudanças em escopo ou roles." },
                          { label: "Alterações de base legal", value: historySummary.legalBasisChanges, helper: "Mudanças que afetam fundamento jurídico." },
                          { label: "Alterações de sensibilidade", value: historySummary.sensitivityChanges, helper: "Mudanças em sensibilidade, dado pessoal ou sensível." },
                          { label: "Aumentaram risco", value: historySummary.increasedRisk, helper: "Mudanças com maior exposição potencial." },
                          { label: "Reduziram risco", value: historySummary.reducedRisk, helper: "Mudanças que reforçaram controles." },
                        ].map((item) => (
                          <div className="rounded-2xl border border-border bg-bg-subtle/70 p-3" key={item.label}>
                            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-brand-600">{item.label}</p>
                            <p className="mt-2 text-sm font-semibold text-text">{typeof item.value === "number" ? item.value.toLocaleString("pt-BR") : item.value}</p>
                            <p className="mt-1 text-xs leading-5 text-muted">{item.helper}</p>
                          </div>
                        ))}
                      </div>

                      <div className="rounded-2xl border border-border bg-bg-subtle/60 p-4">
                        <div className="flex items-start gap-3">
                          <Filter className="mt-0.5 h-4 w-4 text-muted" />
                          <div className="space-y-3">
                            <div>
                              <p className="text-sm font-semibold text-text">Filtros do histórico</p>
                              <p className="mt-1 text-xs leading-5 text-muted">
                                Use os filtros para encontrar mudanças específicas na política de privacidade, como
                                alteração de base legal, restrição de acesso ou revisão formal.
                              </p>
                            </div>
                            <div className="flex flex-wrap gap-2">
                              {HISTORY_CATEGORY_FILTERS.map((filter) => (
                                <button
                                  className={cn(
                                    "rounded-full border px-3 py-1.5 text-xs font-medium transition",
                                    historyCategoryFilter === filter.key
                                      ? "border-info-200 bg-info-50 text-info-700"
                                      : "border-border bg-surface text-text-body hover:border-border-strong",
                                  )}
                                  key={filter.key}
                                  onClick={() => setHistoryCategoryFilter(filter.key)}
                                  type="button"
                                >
                                  {filter.label}
                                </button>
                              ))}
                            </div>
                            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                              <label className="space-y-1">
                                <span className="text-[11px] font-semibold uppercase tracking-[0.18em] text-brand-600">Período</span>
                                <Select onChange={(event) => setHistoryPeriodFilter(event.target.value)} value={historyPeriodFilter}>
                                  <option value="all">Todo o histórico</option>
                                  <option value="7d">Últimos 7 dias</option>
                                  <option value="30d">Últimos 30 dias</option>
                                  <option value="90d">Últimos 90 dias</option>
                                </Select>
                              </label>
                              <label className="space-y-1">
                                <span className="text-[11px] font-semibold uppercase tracking-[0.18em] text-brand-600">Revisor</span>
                                <Select onChange={(event) => setHistoryReviewerFilter(event.target.value)} value={historyReviewerFilter}>
                                  <option value="all">Todos</option>
                                  {historyReviewerOptions.map((reviewer) => (
                                    <option key={reviewer} value={reviewer}>
                                      {reviewer}
                                    </option>
                                  ))}
                                </Select>
                              </label>
                              <label className="space-y-1">
                                <span className="text-[11px] font-semibold uppercase tracking-[0.18em] text-brand-600">Tipo de alteração</span>
                                <Select onChange={(event) => setHistoryChangeTypeFilter(event.target.value)} value={historyChangeTypeFilter}>
                                  <option value="all">Todos</option>
                                  {historyChangeTypeOptions.map((changeType) => (
                                    <option key={changeType} value={changeType}>
                                      {changeType}
                                    </option>
                                  ))}
                                </Select>
                              </label>
                              <label className="space-y-1">
                                <span className="text-[11px] font-semibold uppercase tracking-[0.18em] text-brand-600">Campo alterado</span>
                                <Select onChange={(event) => setHistoryFieldFilter(event.target.value)} value={historyFieldFilter}>
                                  <option value="all">Todos</option>
                                  {historyFieldOptions.map((field) => (
                                    <option key={field} value={field}>
                                      {privacyHistoryFieldLabel(field)}
                                    </option>
                                  ))}
                                </Select>
                              </label>
                            </div>
                          </div>
                        </div>
                      </div>

                      <div className="space-y-3">
                        {filteredPrivacyHistory.length ? (
                          filteredPrivacyHistory.map((event) => {
                            const impact = classifyHistoryImpact(event);
                            const isPeriodicReview = event.source_kind === "dedicated" && event.review_type === "periodic_review";
                            return (
                              <div className="rounded-2xl border border-border bg-surface p-4 shadow-sm" key={event.id}>
                                <div className="flex flex-wrap items-start justify-between gap-3">
                                  <div className="space-y-2">
                                    <div className="flex flex-wrap items-center gap-2">
                                      <Badge tone="accent">
                                        {isPeriodicReview
                                          ? "Sem alteração de política"
                                          : event.changed_fields.length > 1
                                          ? `${event.changed_fields.length} campos alterados`
                                          : privacyHistoryFieldLabel(event.field_name)}
                                      </Badge>
                                      <Badge tone={impact.tone}>{impact.label}</Badge>
                                      {event.change_type || event.review_type ? <Badge tone="neutral">{event.change_type || event.review_type}</Badge> : null}
                                    </div>
                                    <div>
                                      <p className="text-sm font-semibold text-text">
                                        {isPeriodicReview
                                          ? "Revisão periódica registrada"
                                          : event.changed_fields.length > 1
                                          ? "Política de privacidade alterada"
                                          : `${privacyHistoryFieldLabel(event.field_name)} alterado`}
                                      </p>
                                      <p className="mt-1 text-xs text-muted">
                                        Por {historyActorLabel(event)} • em {formatDateTime(event.changed_at)}
                                      </p>
                                    </div>
                                  </div>
                                  <div className="rounded-2xl border border-border bg-bg-subtle px-3 py-2 text-right text-xs text-text-body">
                                    <p className="font-semibold text-text-body">Origem</p>
                                    <p className="mt-1">{event.source_label}</p>
                                  </div>
                                </div>

                                {isPeriodicReview ? (
                                  <div className="mt-4 rounded-2xl border border-success-200 bg-success-50/70 p-3 text-sm text-success-700">
                                    A política foi revisada sem alteração de classificação, base legal, finalidade, retenção ou acesso.
                                  </div>
                                ) : event.changed_fields.length > 1 ? (
                                  <div className="mt-4 space-y-3">
                                    {event.changed_fields.map((field) => (
                                      <div className="rounded-2xl border border-border bg-bg-subtle/70 p-3" key={`${event.id}-${field.field}`}>
                                        <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-brand-600">
                                          {privacyHistoryFieldLabel(field.field)}
                                        </p>
                                        <div className="mt-2 grid gap-3 sm:grid-cols-2">
                                          <div>
                                            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-brand-600">Valor anterior</p>
                                            <p className="mt-1 text-sm text-text-body">{formatHistoryValue(field.previous)}</p>
                                          </div>
                                          <div>
                                            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-brand-600">Valor novo</p>
                                            <p className="mt-1 text-sm text-text-body">{formatHistoryValue(field.new)}</p>
                                          </div>
                                        </div>
                                      </div>
                                    ))}
                                  </div>
                                ) : (
                                  <div className="mt-4 grid gap-3 sm:grid-cols-2">
                                    <div className="rounded-2xl border border-border bg-bg-subtle/70 p-3">
                                      <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-brand-600">Valor anterior</p>
                                      <p className="mt-2 text-sm text-text-body">{formatHistoryValue(event.before_value)}</p>
                                    </div>
                                    <div className="rounded-2xl border border-border bg-bg-subtle/70 p-3">
                                      <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-brand-600">Valor novo</p>
                                      <p className="mt-2 text-sm text-text-body">{formatHistoryValue(event.after_value)}</p>
                                    </div>
                                  </div>
                                )}

                                <div className="mt-4 rounded-2xl border border-border bg-surface p-3">
                                  <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-brand-600">Impacto da alteração</p>
                                  <p className="mt-2 text-sm font-medium text-text-body">{impact.description}</p>
                                  {event.source_kind === "dedicated" && (event.risk_before || event.risk_after || event.next_review_at || event.notes) ? (
                                    <div className="mt-3 grid gap-2 text-xs text-text-body sm:grid-cols-2">
                                      <p>
                                        Risco antes: <span className="font-medium text-text-body">{event.risk_before || "Não informado"}</span>
                                      </p>
                                      <p>
                                        Risco depois: <span className="font-medium text-text-body">{event.risk_after || "Não informado"}</span>
                                      </p>
                                      <p>
                                        Próxima revisão: <span className="font-medium text-text-body">{event.next_review_at ? formatDateTime(event.next_review_at) : "Não definida"}</span>
                                      </p>
                                      <p>
                                        Observação: <span className="font-medium text-text-body">{event.notes || "Sem observação dedicada"}</span>
                                      </p>
                                    </div>
                                  ) : null}
                                </div>
                              </div>
                            );
                          })
                        ) : (
                          <EmptyState
                            className="shadow-none"
                            title="Nenhuma alteração de privacidade registrada"
                            description="Este ativo ainda não possui eventos de privacidade na auditoria do catálogo. Ao salvar alterações de sensibilidade, base legal, finalidade, acesso ou revisão, a linha do tempo será atualizada automaticamente."
                          />
                        )}
                      </div>
                    </div>
                  ) : (
                    <EmptyState
                      className="shadow-none"
                      title="Nenhuma alteração de privacidade registrada"
                      description="Este ativo ainda não possui eventos de privacidade na auditoria do catálogo. Ao salvar alterações de sensibilidade, base legal, finalidade, acesso ou revisão, a linha do tempo será atualizada automaticamente."
                    />
                  )}
                </div>

                {canEdit ? (
                  <div className="flex items-center justify-end gap-2">
                    <Button disabled={saving} onClick={() => setForm(buildForm(detail))} variant="ghost">
                      Reverter
                    </Button>
                    <Button disabled={saving} onClick={() => void savePolicy()}>
                      {saving ? "Salvando..." : "Salvar política"}
                    </Button>
                  </div>
                ) : null}
              </>
            )}
          </CardContent>
        </Card>
      </div>

      {periodicReviewOpen && detail ? (
        <div className="fixed inset-0 z-[80] flex items-center justify-center bg-slate-950/60 p-4 backdrop-blur-md">
          <button
            aria-label="Fechar revisão periódica"
            className="absolute inset-0 cursor-default"
            onClick={() => !periodicReviewSaving && setPeriodicReviewOpen(false)}
            type="button"
          />
          <div className="relative z-[81] w-full max-w-2xl overflow-hidden rounded-3xl border border-border bg-surface shadow-2xl">
            <div className="border-b border-border bg-[linear-gradient(135deg,#f8fafc_0%,#ffffff_45%,#eff6ff_100%)] px-6 py-5">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-info-700">Revisão formal</p>
                  <h3 className="mt-1 text-xl font-semibold text-text">Registrar revisão periódica</h3>
                  <p className="mt-2 text-sm leading-6 text-text-body">
                    Use esta ação para confirmar que a política de privacidade do ativo foi revisada e continua válida, mesmo sem alteração de sensibilidade, base legal, finalidade ou acesso.
                  </p>
                </div>
                <Button disabled={periodicReviewSaving} onClick={() => setPeriodicReviewOpen(false)} variant="ghost">
                  <X className="h-4 w-4" />
                </Button>
              </div>
            </div>

            <div className="space-y-5 px-6 py-5">
              <div className="grid gap-3 rounded-2xl border border-border bg-bg-subtle/70 p-4 sm:grid-cols-2">
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-brand-600">Ativo</p>
                  <p className="mt-1 text-sm font-semibold text-text">{detail.name}</p>
                  <p className="mt-1 text-xs text-muted">
                    {detail.datasource_name} • {detail.database_name} • {detail.schema_name}
                  </p>
                </div>
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-brand-600">Risco atual</p>
                  <p className="mt-1 text-sm font-semibold capitalize text-text">{currentDedicatedRisk || "Em avaliação"}</p>
                  <p className="mt-1 text-xs text-muted">A revisão periódica gera um evento auditável dedicado, sem alterar a política do ativo.</p>
                </div>
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-brand-600">Sensibilidade</p>
                  <p className="mt-1 text-sm text-text-body">{detailPreview?.sensitivity_level || detail.privacy.sensitivity_label || "Não classificado"}</p>
                </div>
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-brand-600">Base legal</p>
                  <p className="mt-1 text-sm text-text-body">{detailPreview?.legal_basis || detail.privacy.legal_basis_label || "Não informada"}</p>
                </div>
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-brand-600">Finalidade</p>
                  <p className="mt-1 text-sm text-text-body">{detailPreview?.privacy_purpose || "Não estruturada"}</p>
                </div>
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-brand-600">Próxima revisão atual</p>
                  <p className="mt-1 text-sm text-text-body">{latestScheduledReview ? formatDateTime(latestScheduledReview) : "Ainda não definida"}</p>
                </div>
              </div>

              <label className="space-y-1">
                <span className="text-xs font-semibold uppercase tracking-[0.18em] text-brand-600">Justificativa da revisão</span>
                <Textarea
                  onChange={(event) => setPeriodicReviewForm((current) => ({ ...current, notes: event.target.value }))}
                  placeholder="Explique como a política foi revisada, quais evidências foram consideradas e por que ela permanece adequada."
                  value={periodicReviewForm.notes}
                />
                <p className="text-xs leading-5 text-muted">
                  Campo obrigatório para manter a trilha decisória da revisão formal.
                </p>
              </label>

              <label className="space-y-1">
                <span className="text-xs font-semibold uppercase tracking-[0.18em] text-brand-600">Próxima revisão</span>
                <Input
                  onChange={(event) => setPeriodicReviewForm((current) => ({ ...current, next_review_at: event.target.value || null }))}
                  type="datetime-local"
                  value={periodicReviewForm.next_review_at || ""}
                />
                <p className="text-xs leading-5 text-muted">
                  Defina a próxima data planejada de revisão para manter a política revalidada ao longo do tempo.
                </p>
              </label>

              <label className="flex items-start gap-3 rounded-2xl border border-border bg-bg-subtle/70 px-4 py-3 text-sm text-text-body">
                <input
                  checked={periodicReviewForm.confirmed}
                  className="mt-1 h-4 w-4 rounded border-border-strong text-info-600 focus:ring-info-500"
                  onChange={(event) => setPeriodicReviewForm((current) => ({ ...current, confirmed: event.target.checked }))}
                  type="checkbox"
                />
                <span>Confirmo que revisei a política atual e que ela permanece adequada.</span>
              </label>
            </div>

            <div className="border-t border-border bg-bg-subtle/80 px-6 py-4">
              <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
                <Button disabled={periodicReviewSaving} onClick={() => setPeriodicReviewOpen(false)} variant="outline">
                  Cancelar
                </Button>
                <Button
                  disabled={periodicReviewSaving || !periodicReviewForm.confirmed || !periodicReviewForm.notes.trim()}
                  onClick={() => void savePeriodicReview()}
                >
                  {periodicReviewSaving ? "Registrando..." : "Salvar revisão periódica"}
                </Button>
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
