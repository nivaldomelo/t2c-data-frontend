import { Link } from "@/lib/next-shims";
import { usePathname, useRouter, useSearchParams } from "@/lib/next-shims";
import { FormEvent, useEffect, useMemo, useState } from "react";
import { AlertTriangle, ChevronDown, Clock3, Filter, Plus, Search, ShieldAlert, Ticket, X } from "lucide-react";
import { useTranslation } from "react-i18next";

import { TicketDetailsDrawer } from "@/components/tickets/ticket-details-drawer";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { buildOperationalIncidentCreateHref, parseIncidentCreatePrefill } from "@/features/incidents/prefill";
import type {
  Incident,
  IncidentCenterSummary,
  IncidentEntityType,
  IncidentSeverity,
  IncidentStatus,
} from "@/features/incidents/types";
import { trackPlatformEvent } from "@/features/platform/client";
import { apiRequest } from "@/lib/client-api";
import { useAuth } from "@/lib/auth";
import { cn } from "@/lib/cn";
import { normalizePageItems, type PageResponse } from "@/lib/pagination";
import type {
  AdminUser,
  CorrelationSummary,
  IncidentFiltersSnapshot,
  IncidentListResponse,
  Me,
} from "@/features/incidents-tickets/types";
import {
  ADVANCED_FILTERS_KEY,
  DEFAULT_PAGE_SIZE,
  FILTER_PANEL_KEY,
  ORIGIN_FILTERS,
  SEVERITY_LABELS,
  SEVERITY_OPTIONS,
  STATUS_LABELS,
  STATUS_OPTIONS,
  TONES,
} from "@/features/incidents-tickets/constants";
import {
  activeFilterChips,
  buildSearchParamsFromFilters,
  createEmptyFiltersSnapshot,
  formatDate,
  formatDateTime,
  incidentIsUnassigned,
  incidentOwnerLabel,
  incidentPrioritySort,
  incidentSlaStatus,
  incidentSourceCategory,
  readFiltersFromSearchParams,
  severityTone,
  statusTone,
  toLocalInputDate,
} from "@/features/incidents-tickets/helpers";

export default function IncidentsPage() {
  const { t } = useTranslation();
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  const auth = useAuth();

  const [items, setItems] = useState<Incident[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusMessage, setStatusMessage] = useState("");
  const [loadError, setLoadError] = useState("");
  const [toast, setToast] = useState<{ tone: "success" | "error"; message: string } | null>(null);

  const [me, setMe] = useState<Me | null>(null);
  const [userOptions, setUserOptions] = useState<Array<{ id: number; label: string }>>([]);

  const [q, setQ] = useState("");
  const [entityType, setEntityType] = useState<"" | IncidentEntityType>("");
  const [ownerId, setOwnerId] = useState("");
  const [reporterId, setReporterId] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [statusFilters, setStatusFilters] = useState<IncidentStatus[]>([]);
  const [severityFilters, setSeverityFilters] = useState<IncidentSeverity[]>([]);
  const [filtersOpen, setFiltersOpen] = useState(true);
  const [advancedFiltersOpen, setAdvancedFiltersOpen] = useState(false);
  const [sourceTypeFilter, setSourceTypeFilter] = useState("");
  const [sourceRefIdFilter, setSourceRefIdFilter] = useState("");
  const [tableIdFilter, setTableIdFilter] = useState("");
  const [domainNameFilter, setDomainNameFilter] = useState("");
  const [ownerNameFilter, setOwnerNameFilter] = useState("");
  const [unassignedOnly, setUnassignedOnly] = useState(false);
  const [slaStatusFilter, setSlaStatusFilter] = useState("");
  const [page, setPage] = useState(1);
  const [pageData, setPageData] = useState<IncidentListResponse | null>(null);
  const [centerSummary, setCenterSummary] = useState<IncidentCenterSummary | null>(null);
  const [correlationSummary, setCorrelationSummary] = useState<CorrelationSummary | null>(null);
  const [contextError, setContextError] = useState("");

  const [createDrawerOpen, setCreateDrawerOpen] = useState(false);
  const [detailsDrawerOpen, setDetailsDrawerOpen] = useState(false);
  const [selectedTicketId, setSelectedTicketId] = useState<number | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [formError, setFormError] = useState("");

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [formEntityType, setFormEntityType] = useState<IncidentEntityType>("table");
  const [tableFqn, setTableFqn] = useState("");
  const [dagId, setDagId] = useState("");
  const [detectedAt, setDetectedAt] = useState("");
  const [lastSeenAt, setLastSeenAt] = useState("");
  const [formStatus, setFormStatus] = useState<IncidentStatus>("open");
  const [formSeverity, setFormSeverity] = useState<IncidentSeverity>("sev3");
  const [formOwnerId, setFormOwnerId] = useState("");
  const [formReporterId, setFormReporterId] = useState("");
  const [formSourceType, setFormSourceType] = useState("");
  const [formSourceRefId, setFormSourceRefId] = useState("");
  const [formEvidenceJson, setFormEvidenceJson] = useState<Record<string, unknown> | null>(null);
  const [tagsText, setTagsText] = useState("");

  const canManageAll = auth.canAction("write", "admin");

  useEffect(() => {
    void trackPlatformEvent({
      event_name: "page_view",
      module_name: "incidents",
      page_path: "/incidents/tickets",
      entity_type: tableIdFilter ? "table" : undefined,
      entity_id: tableIdFilter ? Number(tableIdFilter) : undefined,
    });
  }, [tableIdFilter]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const saved = window.localStorage.getItem(FILTER_PANEL_KEY);
    if (saved === "true" || saved === "false") setFiltersOpen(saved === "true");
    const advancedSaved = window.localStorage.getItem(ADVANCED_FILTERS_KEY);
    if (advancedSaved === "true" || advancedSaved === "false") setAdvancedFiltersOpen(advancedSaved === "true");
  }, []);

  useEffect(() => {
    const { filters, page: parsedPage } = readFiltersFromSearchParams(searchParams);
    setQ(filters.q);
    setEntityType(filters.entityType);
    setOwnerId(filters.ownerId);
    setReporterId(filters.reporterId);
    setDateFrom(filters.dateFrom);
    setDateTo(filters.dateTo);
    setStatusFilters(filters.statusFilters);
    setSeverityFilters(filters.severityFilters);
    setSourceTypeFilter(filters.sourceTypeFilter);
    setSourceRefIdFilter(filters.sourceRefIdFilter);
    setTableIdFilter(filters.tableIdFilter);
    setDomainNameFilter(filters.domainNameFilter);
    setOwnerNameFilter(filters.ownerNameFilter);
    setUnassignedOnly(filters.unassignedOnly);
    setSlaStatusFilter(filters.slaStatusFilter);
    setPage(parsedPage);
    void loadData(parsedPage, { filters });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams]);

  useEffect(() => {
    if (searchParams.get("create") === "1") {
      openCreateDrawer();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams]);

  useEffect(() => {
    if (!createDrawerOpen || !correlationSummary?.incident_prefill) return;
    if (searchParams.get("incident_context")) return;
    setTitle((current) => current || correlationSummary.incident_prefill?.title || "");
    setDescription((current) => current || correlationSummary.incident_prefill?.description || "");
    setFormSourceType((current) => current || correlationSummary.incident_prefill?.source_type || "");
    setFormSourceRefId((current) =>
      current || (correlationSummary.incident_prefill?.source_ref_id ? String(correlationSummary.incident_prefill.source_ref_id) : ""),
    );
    setFormEvidenceJson((current) => current || correlationSummary.incident_prefill?.evidence_json || null);
  }, [correlationSummary, createDrawerOpen, searchParams]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    window.localStorage.setItem(FILTER_PANEL_KEY, String(filtersOpen));
  }, [filtersOpen]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    window.localStorage.setItem(ADVANCED_FILTERS_KEY, String(advancedFiltersOpen));
  }, [advancedFiltersOpen]);

  useEffect(() => {
    const activeTableId = Number(tableIdFilter || searchParams.get("tableId") || searchParams.get("table_id") || "");
    if (!Number.isFinite(activeTableId) || activeTableId <= 0) {
      setCorrelationSummary(null);
      setContextError("");
      return;
    }
    let cancelled = false;
    setContextError("");
    void (async () => {
      try {
        const payload = await apiRequest<CorrelationSummary>(`/v1/catalog/tables/${activeTableId}/correlation-summary`);
        if (!cancelled) {
          setCorrelationSummary(payload);
        }
      } catch (error) {
        if (!cancelled) {
          setCorrelationSummary(null);
          setContextError((error as Error).message || "Não foi possível carregar o contexto do ativo filtrado.");
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [searchParams, tableIdFilter]);

  useEffect(() => {
    void loadBootstrap();
  }, []);

  async function loadBootstrap() {
    try {
      const meData = await apiRequest<Me>("/v1/me");
      setMe(meData);
      const baseOptions = [{ id: meData.id, label: meData.name || meData.email }];
      if (meData.is_admin) {
        try {
          const adminUsers = await apiRequest<AdminUser[] | PageResponse<AdminUser>>("/v1/admin/users");
          const opts = normalizePageItems(adminUsers).map((u) => ({ id: u.id, label: u.name || u.full_name || u.email }));
          setUserOptions(opts);
        } catch {
          setUserOptions(baseOptions);
        }
      } else {
        setUserOptions(baseOptions);
      }
      const centerResult = await apiRequest<IncidentCenterSummary>("/v1/incidents/center?days=30");
      setCenterSummary(centerResult);
    } catch (error) {
      setStatusMessage((error as Error).message);
    }
  }

  function currentFiltersSnapshot(): IncidentFiltersSnapshot {
    return {
      q,
      entityType,
      ownerId,
      reporterId,
      dateFrom,
      dateTo,
      statusFilters,
      severityFilters,
      sourceTypeFilter,
      sourceRefIdFilter,
      tableIdFilter,
      domainNameFilter,
      ownerNameFilter,
      unassignedOnly,
      slaStatusFilter,
    };
  }

  function buildBackendQuery(currentPage = 1, pageSize = DEFAULT_PAGE_SIZE, filters: IncidentFiltersSnapshot = currentFiltersSnapshot()): string {
    const params = new URLSearchParams();
    params.set("page", String(currentPage));
    params.set("page_size", String(pageSize));
    if (filters.q.trim()) params.set("q", filters.q.trim());
    if (filters.entityType) params.set("entity_type", filters.entityType);
    if (filters.ownerId) params.set("owner_id", filters.ownerId);
    if (filters.reporterId) params.set("reporter_id", filters.reporterId);
    if (filters.dateFrom) params.set("date_from", new Date(filters.dateFrom).toISOString());
    if (filters.dateTo) params.set("date_to", new Date(filters.dateTo).toISOString());
    if (filters.sourceTypeFilter) params.set("source_type", filters.sourceTypeFilter);
    if (filters.sourceRefIdFilter) params.set("source_ref_id", filters.sourceRefIdFilter);
    if (filters.tableIdFilter) params.set("table_id", filters.tableIdFilter);
    if (filters.domainNameFilter) params.set("domain_name", filters.domainNameFilter);
    if (filters.ownerNameFilter) params.set("owner_name", filters.ownerNameFilter);
    if (filters.unassignedOnly) params.set("unassigned", "1");
    if (filters.slaStatusFilter) params.set("sla_status", filters.slaStatusFilter);
    for (const value of filters.statusFilters) params.append("status", value);
    for (const value of filters.severityFilters) params.append("severity", value);
    const qs = params.toString();
    return qs ? `?${qs}` : "";
  }

  async function loadData(nextPage = page, options?: { silent?: boolean; filters?: IncidentFiltersSnapshot }) {
    if (!options?.silent) setLoading(true);
    setLoadError("");
    try {
      const query = buildBackendQuery(nextPage, DEFAULT_PAGE_SIZE, options?.filters);
      const listData = await apiRequest<Incident[] | IncidentListResponse>(`/v1/incidents${query}`);
      const normalized: IncidentListResponse = Array.isArray(listData)
        ? { items: listData, total: listData.length, page: nextPage, page_size: DEFAULT_PAGE_SIZE, has_more: false }
        : listData;
      setItems(normalized.items ?? []);
      setPageData(normalized);
      setPage(normalized.page ?? nextPage);
      setStatusMessage("");
    } catch (error) {
      const message = (error as Error).message;
      setLoadError(message);
      setStatusMessage(message);
      setItems([]);
    } finally {
      if (!options?.silent) setLoading(false);
    }
  }

  function updateUrlFromSnapshot(filters: IncidentFiltersSnapshot, nextPage = 1) {
    const params = buildSearchParamsFromFilters(filters, nextPage);
    const query = params.toString();
    setPage(nextPage);
    router.replace(query ? `${pathname}?${query}` : pathname, { scroll: false });
  }

  function applyCurrentFilters(nextPage = 1) {
    updateUrlFromSnapshot(currentFiltersSnapshot(), nextPage);
  }

  function clearFilters() {
    updateUrlFromSnapshot(createEmptyFiltersSnapshot(), 1);
  }

  function reloadClearedFilters() {
    clearFilters();
  }

  function toggleStatusFilter(value: IncidentStatus) {
    setStatusFilters((prev) => (prev.includes(value) ? prev.filter((x) => x !== value) : [...prev, value]));
  }

  function toggleSeverityFilter(value: IncidentSeverity) {
    setSeverityFilters((prev) => (prev.includes(value) ? prev.filter((x) => x !== value) : [...prev, value]));
  }

  function canEditIncident(item: Incident): boolean {
    if (canManageAll) return true;
    if (!me) return false;
    return item.owner_user_id === me.id || item.reporter_user_id === me.id;
  }

  function openCreateDrawer() {
    const prefill = parseIncidentCreatePrefill(searchParams.get("incident_context"));
    const selectedPrefill = correlationSummary?.incident_prefill ?? null;
    const effectivePrefill = prefill || selectedPrefill;
    setTitle("");
    setDescription("");
    setFormEntityType("table");
    setTableFqn("");
    setDagId("");
    setDetectedAt(toLocalInputDate(new Date().toISOString()));
    setLastSeenAt("");
    setFormStatus("open");
    setFormSeverity("sev3");
    setFormOwnerId("");
    setFormReporterId(me ? String(me.id) : "");
    setFormSourceType(effectivePrefill?.source_type || "");
    setFormSourceRefId(effectivePrefill?.source_ref_id ? String(effectivePrefill.source_ref_id) : "");
    setFormEvidenceJson(effectivePrefill?.evidence_json || null);
    setTagsText("");
    setFormError("");
    setCreateDrawerOpen(true);
    const locator = correlationSummary?.locator;
    if (effectivePrefill?.title) {
      setTitle(effectivePrefill.title);
    } else if (locator) {
      setTitle(`Incidente em ${locator.schema_name}.${locator.table_name}`);
    }
    if (effectivePrefill?.description) {
      setDescription(effectivePrefill.description);
    }
    if (locator) {
      setTableFqn(`${locator.schema_name}.${locator.table_name}`);
    } else {
      const activeTableId = tableIdFilter || searchParams.get("tableId") || "";
      if (activeTableId) {
        void (async () => {
          try {
            const fallbackLocator = await apiRequest<{ schema_name: string; table_name: string }>(`/v1/catalog/tables/${activeTableId}/locator`);
            setTableFqn(`${fallbackLocator.schema_name}.${fallbackLocator.table_name}`);
            setTitle((current) => current || `Incidente em ${fallbackLocator.schema_name}.${fallbackLocator.table_name}`);
          } catch {
            // keep manual creation flow when locator cannot be resolved
          }
        })();
      }
    }
  }

  function openDetailsDrawer(ticketId: number) {
    setSelectedTicketId(ticketId);
    setDetailsDrawerOpen(true);
  }

  function closeCreateDrawer() {
    setCreateDrawerOpen(false);
  }

  function closeDetailsDrawer() {
    setDetailsDrawerOpen(false);
    setSelectedTicketId(null);
  }

  function validateForm(): string | null {
    if (!title.trim()) return "Título é obrigatório.";
    if (!detectedAt) return "Data de detecção é obrigatória.";
    if (formEntityType === "table" && !tableFqn.trim()) return "table_fqn é obrigatório para incidentes de tabela.";
    if (formEntityType === "airflow_dag" && !dagId.trim()) return "airflow_dag_id é obrigatório para incidentes de DAG.";
    return null;
  }

  async function submitForm(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const err = validateForm();
    if (err) {
      setFormError(err);
      return;
    }

    setIsSaving(true);
    const payload = {
      title: title.trim(),
      description: description.trim() || null,
      entity_type: formEntityType,
      table_fqn: formEntityType === "table" ? tableFqn.trim() : null,
      airflow_dag_id: formEntityType === "airflow_dag" ? dagId.trim() : null,
      detected_at: new Date(detectedAt).toISOString(),
      last_seen_at: lastSeenAt ? new Date(lastSeenAt).toISOString() : null,
      status: formStatus,
      severity: formSeverity,
      owner_user_id: formOwnerId ? Number(formOwnerId) : null,
      reporter_user_id: formReporterId ? Number(formReporterId) : null,
      source_type: formSourceType.trim() || null,
      source_ref_id: formSourceRefId ? Number(formSourceRefId) : null,
      evidence_json: formEvidenceJson,
      tags: tagsText.split(",").map((v) => v.trim()).filter(Boolean),
    };

    try {
      await apiRequest<Incident>("/v1/incidents", { method: "POST", body: JSON.stringify(payload) });
      setToast({ tone: "success", message: "Ticket criado com sucesso." });
      closeCreateDrawer();
      await loadData(1);
    } catch (error) {
      setToast({ tone: "error", message: (error as Error).message });
    } finally {
      setIsSaving(false);
    }
  }

  const activeTableId = tableIdFilter || searchParams.get("tableId") || searchParams.get("table_id") || "";
  const contextLocator = correlationSummary?.locator ?? null;
  const contextTableLabel = contextLocator ? `${contextLocator.schema_name}.${contextLocator.table_name}` : activeTableId ? `#${activeTableId}` : null;

  const activeChips = activeFilterChips({
    q,
    entityType,
    ownerId,
    reporterId,
    tableId: tableIdFilter,
    sourceType: sourceTypeFilter,
    sourceRefIdFilter,
    dateFrom,
    dateTo,
    domainName: domainNameFilter,
    ownerName: ownerNameFilter,
    unassignedOnly,
    slaStatus: slaStatusFilter,
    statusFilters,
    severityFilters,
    contextualLabel: contextTableLabel,
    onRemoveTableId: () => updateUrlFromSnapshot({ ...currentFiltersSnapshot(), tableIdFilter: "" }, 1),
    onRemoveSourceType: () => updateUrlFromSnapshot({ ...currentFiltersSnapshot(), sourceTypeFilter: "" }, 1),
    onRemoveSourceRefId: () => updateUrlFromSnapshot({ ...currentFiltersSnapshot(), sourceRefIdFilter: "" }, 1),
    onRemoveUnassigned: () => updateUrlFromSnapshot({ ...currentFiltersSnapshot(), unassignedOnly: false }, 1),
    onRemoveStatus: (value) =>
      updateUrlFromSnapshot(
        { ...currentFiltersSnapshot(), statusFilters: currentFiltersSnapshot().statusFilters.filter((current) => current !== value) },
        1,
      ),
    onRemoveSeverity: (value) =>
      updateUrlFromSnapshot(
        { ...currentFiltersSnapshot(), severityFilters: currentFiltersSnapshot().severityFilters.filter((current) => current !== value) },
        1,
      ),
    onRemoveQ: () => updateUrlFromSnapshot({ ...currentFiltersSnapshot(), q: "" }, 1),
    onRemoveEntityType: () => updateUrlFromSnapshot({ ...currentFiltersSnapshot(), entityType: "" }, 1),
    onRemoveOwnerId: () => updateUrlFromSnapshot({ ...currentFiltersSnapshot(), ownerId: "" }, 1),
    onRemoveReporterId: () => updateUrlFromSnapshot({ ...currentFiltersSnapshot(), reporterId: "" }, 1),
    onRemoveDateFrom: () => updateUrlFromSnapshot({ ...currentFiltersSnapshot(), dateFrom: "" }, 1),
    onRemoveDateTo: () => updateUrlFromSnapshot({ ...currentFiltersSnapshot(), dateTo: "" }, 1),
    onRemoveDomainName: () => updateUrlFromSnapshot({ ...currentFiltersSnapshot(), domainNameFilter: "" }, 1),
    onRemoveOwnerName: () => updateUrlFromSnapshot({ ...currentFiltersSnapshot(), ownerNameFilter: "" }, 1),
    onRemoveSlaStatus: () => updateUrlFromSnapshot({ ...currentFiltersSnapshot(), slaStatusFilter: "" }, 1),
  });
  const activeFiltersCount = activeChips.length;
  const selectedTicket = selectedTicketId === null ? null : items.find((item) => item.id === selectedTicketId) ?? null;
  const canEditSelectedTicket = selectedTicket ? canEditIncident(selectedTicket) : canManageAll;
  const contextLatest = correlationSummary?.dq ?? null;
  const contextIngestion = correlationSummary?.ingestion ?? null;
  const primaryPipeline = contextIngestion?.primary_pipeline ?? null;
  const dqAttention = Boolean(contextLatest && ((contextLatest.dq_score ?? 100) < 90 || contextLatest.failed_rules > 0));
  const operationalAttention = Boolean(correlationSummary?.signals.operational_failure || correlationSummary?.signals.stale_pipeline);
  const pageTotal = pageData?.total ?? items.length;
  const pageStart = pageTotal === 0 ? 0 : (page - 1) * DEFAULT_PAGE_SIZE + 1;
  const pageEnd = Math.min(page * DEFAULT_PAGE_SIZE, pageTotal);
  const contextualCreateHref = correlationSummary?.incident_prefill
    ? buildOperationalIncidentCreateHref({
        tableId: correlationSummary.table_id,
        schemaName: contextLocator?.schema_name,
        tableName: contextLocator?.table_name,
        pipelineName: primaryPipeline?.pipeline_name,
        dagId: primaryPipeline?.dag_id,
        taskName: primaryPipeline?.task_name,
        latestStatusLabel: primaryPipeline?.latest_status_label,
        lastError: primaryPipeline?.last_error,
        lastSuccessAt: primaryPipeline?.last_success_at,
        dqScore: contextLatest?.dq_score ?? null,
        failedRules: contextLatest?.failed_rules ?? null,
        sourceType: correlationSummary.incident_prefill.source_type,
        sourceRefId: correlationSummary.incident_prefill.source_ref_id,
        origin: typeof correlationSummary.incident_prefill.evidence_json?.origin === "string"
          ? String(correlationSummary.incident_prefill.evidence_json.origin)
          : "explorer_ingestion",
        operationalSlaDueAt: correlationSummary.operational_sla?.due_at ?? null,
        recurrentDegradation: correlationSummary.operational_sla?.recurrent_degradation,
      })
    : activeTableId
      ? `/incidents/tickets?tableId=${activeTableId}&create=1`
      : null;
  const stats = useMemo(() => {
    const queueCount = (key: string): number =>
      centerSummary?.by_status?.find((queue) => queue.key === key)?.count ??
      centerSummary?.by_severity?.find((queue) => queue.key === key)?.count ??
      items.filter((item) => item.status === key || item.severity === key).length;
    const open = queueCount("open");
    const investigating = queueCount("investigating");
    const resolved = queueCount("resolved") + queueCount("closed");
    const critical = queueCount("sev1");
    const recurring = queueCount("recurring");
    return [
      {
        title: "Total na janela",
        value: centerSummary?.recent_incidents?.length ?? pageData?.total ?? items.length,
        hint: "consolidado dos incidentes recentes",
        tone: "neutral" as const,
        icon: Ticket,
      },
      { title: "Abertos na janela", value: open, hint: "aguardando tratativa", tone: "risk" as const, icon: AlertTriangle },
      { title: "Investigando na janela", value: investigating, hint: "em ação operacional", tone: "ops" as const, icon: ShieldAlert },
      { title: "Resolvidos na janela", value: resolved, hint: "resolvidos ou fechados", tone: "fresh" as const, icon: Clock3 },
      { title: "Críticos na janela", value: critical, hint: "severidade sev1", tone: "risk" as const, icon: ShieldAlert },
      { title: "Recorrentes na janela", value: recurring, hint: "degradação ou repetição", tone: "neutral" as const, icon: AlertTriangle },
    ].slice(0, 6);
  }, [centerSummary, items, pageData?.total]);

  const attentionSummary = useMemo(() => {
    const criticalOpen = items.filter((item) => item.status === "open" && item.severity === "sev1").length;
    const unassigned = centerSummary?.by_owner?.find((queue) => queue.key === "__unassigned__")?.count ?? items.filter(incidentIsUnassigned).length;
    const overdue = centerSummary?.by_sla?.find((queue) => queue.key === "overdue")?.count ?? items.filter((item) => incidentSlaStatus(item) === "overdue").length;
    const recurring = centerSummary?.metrics?.find((metric) => metric.key === "recurring")?.value ?? items.filter((item) => item.status === "recurring" || item.occurrences > 1).length;
    const dqCritical = items.filter((item) => (item.source_type || "").toLowerCase().startsWith("dq") && item.severity === "sev1").length;
    const reopened = items.filter((item) => item.status === "reopened").length;
    const investigating = items.filter((item) => item.status === "investigating").length;
    return [
      { title: "Críticos abertos", value: criticalOpen, hint: "Incidentes sev1 ainda sem resolução", tone: "risk" as const, action: () => setStatusFilters(["open"]), actionLabel: "Ver críticos" },
      { title: "Sem responsável", value: unassigned, hint: "Chamados sem owner ou squad definido", tone: "ops" as const, action: () => setUnassignedOnly(true), actionLabel: "Filtrar sem responsável" },
      { title: "SLA vencido", value: overdue, hint: "Chamados fora do prazo operacional", tone: "risk" as const, action: () => setSlaStatusFilter("overdue"), actionLabel: "Ver vencidos" },
      { title: "Recorrentes", value: recurring, hint: "Repetições ou degradação contínua", tone: "neutral" as const, action: () => setStatusFilters(["recurring"]), actionLabel: "Ver recorrentes" },
      { title: "DQ crítico", value: dqCritical, hint: "Incidentes severidade alta gerados por Data Quality", tone: "catalog" as const, action: () => setSourceTypeFilter("dq_rule"), actionLabel: "Abrir DQ" },
      { title: "Reabertos", value: reopened, hint: "Chamados que voltaram após encerramento", tone: "neutral" as const, action: () => setStatusFilters(["reopened"]), actionLabel: "Ver reabertos" },
      { title: "Investigação", value: investigating, hint: "Chamados já em análise ativa", tone: "ops" as const, action: () => setStatusFilters(["investigating"]), actionLabel: "Ver investigando" },
    ];
  }, [centerSummary, items]);

  const incidentCards = useMemo(() => [...items].sort(incidentPrioritySort), [items]);

  const originCounts = useMemo(() => {
    const counts = new Map<string, number>();
    for (const incident of centerSummary?.recent_incidents ?? items) {
      const key = incidentSourceCategory(incident).value || "manual";
      counts.set(key, (counts.get(key) ?? 0) + 1);
    }
    return ORIGIN_FILTERS.map((option) => ({
      ...option,
      count: option.value ? counts.get(option.value) ?? 0 : (centerSummary?.recent_incidents ?? items).length,
    }));
  }, [centerSummary, items]);

  return (
    <div className="space-y-6">
      <Card className="border-border/80 bg-gradient-to-br from-white via-slate-50 to-accent-50 shadow-[0_18px_48px_rgba(15,23,42,0.05)]">
        <CardContent className="space-y-5 p-6">
          <div className="flex flex-col gap-5 xl:flex-row xl:items-start xl:justify-between">
            <div className="space-y-3">
              <div className="inline-flex items-center gap-2 rounded-full border border-info-200 bg-surface px-3 py-1 text-xs font-medium text-info-700">
                <Ticket className="h-3.5 w-3.5" />
                Gestão de chamados
              </div>
              <div>
                <h2 className="text-2xl font-semibold tracking-tight text-text">{t("pages.incidents.title")}</h2>
                <p className="mt-2 max-w-3xl text-sm leading-7 text-text-body">
                  Operação diária de incidentes com foco em prioridade, responsável, severidade e rastreabilidade.
                </p>
              </div>
            </div>
            <Button data-doc-anchor="incidents-create" onClick={openCreateDrawer} size="sm">
              <Plus className="mr-2 h-4 w-4" />
              Criar chamado
            </Button>
          </div>

      {!loadError ? (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-6">
          {stats.map((card) => {
            const palette = TONES[card.tone];
            const Icon = card.icon;
            return (
              <Card className={cn("border shadow-[0_12px_32px_rgba(15,23,42,0.04)]", palette.border)} key={card.title}>
                <CardContent className={cn("space-y-3 bg-gradient-to-br p-4", palette.surface)}>
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <p className="text-sm font-medium text-text-body">{card.title}</p>
                      <p className="mt-2 text-3xl font-semibold tracking-tight text-text">{card.value}</p>
                    </div>
                    <div className={cn("flex h-10 w-10 items-center justify-center rounded-2xl", palette.icon)}>
                      <Icon className="h-5 w-5" />
                    </div>
                  </div>
                  <p className="text-sm text-text-body">{card.hint}</p>
                </CardContent>
              </Card>
            );
          })}
        </div>
      ) : null}
        </CardContent>
      </Card>

      <div className="grid gap-4 xl:grid-cols-[1.1fr_0.9fr]">
        <Card className="border-border/80 bg-surface shadow-[0_12px_32px_rgba(15,23,42,0.04)]">
          <CardContent className="space-y-3 p-5">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-brand-600">O que são incidentes de dados?</p>
            <h3 className="text-lg font-semibold text-text">Chamados para registrar, priorizar e resolver problemas operacionais</h3>
            <p className="text-sm leading-6 text-text-body">
              Incidentes representam problemas que podem afetar confiança, disponibilidade, qualidade, privacidade ou operação dos ativos de dados. Eles ajudam a registrar,
              priorizar, investigar e resolver falhas antes que impactem dashboards, produtos de dados, pipelines ou decisões de negócio.
            </p>
            <p className="text-xs text-muted">
              Um incidente pode ser criado manualmente ou gerado automaticamente a partir de Data Quality, ingestão, privacidade, certificação ou operação.
            </p>
          </CardContent>
        </Card>

        <Card className="border-border/80 bg-surface shadow-[0_12px_32px_rgba(15,23,42,0.04)]">
          <CardContent className="space-y-3 p-5">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-brand-600">Como usar a fila de incidentes</p>
            <h3 className="text-lg font-semibold text-text">Priorize pelo risco, depois pela tratativa</h3>
            <ol className="space-y-2 text-sm leading-6 text-text-body">
              <li>1. Revise os incidentes críticos e abertos.</li>
              <li>2. Atribua responsável para chamados sem owner.</li>
              <li>3. Abra o ativo impactado para entender o contexto.</li>
              <li>4. Consulte Data Quality, ingestão ou operação conforme a origem.</li>
              <li>5. Registre investigação, mitigação ou resolução.</li>
              <li>6. Feche o chamado apenas quando a causa e o impacto estiverem tratados.</li>
            </ol>
          </CardContent>
        </Card>
      </div>

      <Card className="border-border/80 bg-surface shadow-[0_12px_32px_rgba(15,23,42,0.04)]">
        <CardContent className="space-y-4 p-5">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-brand-600">Atenção imediata</p>
              <h3 className="mt-2 text-lg font-semibold text-text">Chamados que precisam de ação operacional</h3>
            </div>
            <p className="max-w-3xl text-sm text-text-body">Use estes atalhos para revisar severidade, SLA, responsável e recorrência antes de seguir para a lista detalhada.</p>
          </div>
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
            {attentionSummary.map((card) => (
              <div
                className={cn(
                  "rounded-2xl border p-4 shadow-sm",
                  card.tone === "risk"
                    ? "border-danger-200 bg-danger-50"
                    : card.tone === "ops"
                      ? "border-info-200 bg-info-50"
                      : card.tone === "catalog"
                        ? "border-violet-200 bg-violet-50"
                        : "border-border bg-surface",
                )}
                key={card.title}
              >
                <div className="flex items-center justify-between gap-2">
                  <p className="min-w-0 truncate text-sm font-medium text-text" title={card.title}>
                    {card.title}
                  </p>
                  <Badge tone={card.tone === "risk" ? "warning" : card.tone === "ops" ? "accent" : card.tone === "catalog" ? "accent" : "neutral"}>
                    {card.value}
                  </Badge>
                </div>
                <p className="mt-2 text-sm text-text-body">{card.hint}</p>
                <div className="mt-3 flex flex-wrap gap-2">
                  <Button onClick={card.action} size="sm" variant="outline">
                    {card.actionLabel}
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <Card className="border-border/80 bg-surface shadow-[0_12px_32px_rgba(15,23,42,0.04)]">
        <CardContent className="space-y-4 p-5">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-brand-600">Próximas ações recomendadas</p>
              <h3 className="mt-2 text-lg font-semibold text-text">O que fazer agora</h3>
            </div>
            <p className="max-w-3xl text-sm text-text-body">Ações sugeridas para reduzir risco, acelerar tratativa e manter a fila sob controle.</p>
          </div>
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            {[
              {
                title: "Atribuir responsável para chamados sem owner",
                tone: "warning" as const,
                reason: `${attentionSummary.find((card) => card.title === "Sem responsável")?.value ?? 0} chamado(s) sem responsável.`,
                impact: "Chamados sem owner tendem a ficar sem tratativa.",
                action: () => setUnassignedOnly(true),
                actionLabel: "Ver sem responsável",
              },
              {
                title: "Priorizar SLA vencido",
                tone: "risk" as const,
                reason: `${attentionSummary.find((card) => card.title === "SLA vencido")?.value ?? 0} chamado(s) fora do prazo.`,
                impact: "Casos vencidos podem aumentar o impacto e o risco operacional.",
                action: () => setSlaStatusFilter("overdue"),
                actionLabel: "Ver vencidos",
              },
              {
                title: "Investigar chamados críticos",
                tone: "risk" as const,
                reason: `${attentionSummary.find((card) => card.title === "Críticos abertos")?.value ?? 0} sev1 ainda abertos.`,
                impact: "Incidentes críticos exigem análise e mitigação imediatas.",
                action: () => setStatusFilters(["open"]),
                actionLabel: "Ver críticos",
              },
              {
                title: "Revisar DQ Rule com impacto",
                tone: "fresh" as const,
                reason: `${attentionSummary.find((card) => card.title === "DQ crítico")?.value ?? 0} chamado(s) de Data Quality crítico(s).`,
                impact: "Falhas de regra podem se propagar para consumo e confiança dos dados.",
                action: () => setSourceTypeFilter("dq_rule"),
                actionLabel: "Abrir DQ",
              },
              {
                title: "Revisar recorrências",
                tone: "neutral" as const,
                reason: `${attentionSummary.find((card) => card.title === "Recorrentes")?.value ?? 0} chamado(s) recorrente(s).`,
                impact: "Recorrência sugere correção incompleta ou causa ainda presente.",
                action: () => setStatusFilters(["recurring"]),
                actionLabel: "Ver recorrentes",
              },
            ].map((action) => (
              <div
                className={cn(
                  "rounded-2xl border p-4 shadow-sm",
                  action.tone === "risk"
                    ? "border-danger-200 bg-danger-50"
                    : action.tone === "warning"
                      ? "border-warning-200 bg-warning-50"
                      : action.tone === "fresh"
                        ? "border-success-200 bg-success-50"
                        : "border-border bg-surface",
                )}
                key={action.title}
              >
                <div className="flex items-center justify-between gap-2">
                  <p className="min-w-0 truncate text-sm font-medium text-text" title={action.title}>
                    {action.title}
                  </p>
                  <Badge tone={action.tone === "risk" ? "warning" : action.tone === "warning" ? "warning" : action.tone === "fresh" ? "success" : "neutral"}>
                    {action.tone === "risk" ? "Crítico" : action.tone === "warning" ? "Atenção" : action.tone === "fresh" ? "Saudável" : "Informativo"}
                  </Badge>
                </div>
                <p className="mt-2 line-clamp-2 text-sm text-text-body">{action.reason}</p>
                <p className="mt-2 line-clamp-2 text-xs text-muted">Impacto: {action.impact}</p>
                <div className="mt-3 flex flex-wrap gap-2">
                  <Button onClick={action.action} size="sm" variant="outline">
                    {action.actionLabel}
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {activeTableId ? (
        <Card className="border-border/80 bg-surface shadow-[0_12px_32px_rgba(15,23,42,0.04)]">
          <CardContent className="space-y-4 p-5">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-brand-600">Contexto correlacionado</p>
                <h3 className="mt-2 text-lg font-semibold text-text">
                  {contextLocator ? `${contextLocator.schema_name}.${contextLocator.table_name}` : `Ativo #${activeTableId}`}
                </h3>
                <p className="mt-1 text-sm text-text-body">
                  Use este contexto para navegar entre incidentes, qualidade e pipeline operacional sem perder o recorte do ativo.
                </p>
                {contextLocator ? (
                  <p className="mt-2 text-sm text-text-body">
                    Conexão <span className="font-medium text-text-body">{contextLocator.datasource_name}</span> • Banco{" "}
                    <span className="font-medium text-text-body">{contextLocator.database_name}</span> • Schema{" "}
                    <span className="font-medium text-text-body">{contextLocator.schema_name}</span>
                  </p>
                ) : null}
              </div>
              <div className="flex flex-wrap gap-2">
                {correlationSummary?.incidents ? (
                  <Badge tone={correlationSummary.incidents.open_count > 0 ? "warning" : "neutral"}>
                    {correlationSummary.incidents.open_count} incidente(s) aberto(s)
                  </Badge>
                ) : null}
                {contextLatest ? (
                  <Badge tone={dqAttention ? "warning" : "success"}>DQ {(contextLatest.dq_score ?? 0).toFixed(0)} pts</Badge>
                ) : null}
                {primaryPipeline?.latest_status_label ? (
                  <Badge tone={operationalAttention ? "warning" : "success"}>{primaryPipeline.latest_status_label}</Badge>
                ) : null}
              </div>
            </div>
            {contextError ? <p className="text-sm text-danger-700">{contextError}</p> : null}
            <div className="grid gap-3 lg:grid-cols-3">
              <div className="rounded-2xl border border-border bg-bg-subtle p-4">
                <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-brand-600">Data Quality</p>
                <p className="mt-2 text-sm font-semibold text-text">
                  {contextLatest && contextLatest.dq_score !== null ? `${contextLatest.dq_score.toFixed(1)} pts` : "Sem leitura de DQ"}
                </p>
                <p className="mt-1 text-sm text-text-body">
                  {contextLatest
                    ? `${contextLatest.failed_rules} regra(s) com falha • execução em ${formatDateTime(contextLatest.run_at)}`
                    : "Ainda não foi possível carregar métricas recentes para este ativo."}
                </p>
                {contextLatest?.correlated_rules?.length ? (
                  <div className="mt-3 space-y-2">
                    {contextLatest.correlated_rules.slice(0, 2).map((rule) => (
                      <div className="rounded-xl border border-border bg-surface p-3" key={rule.id}>
                        <p className="text-xs font-semibold text-text">{rule.name}</p>
                        <p className="mt-1 text-[11px] text-muted">
                          {rule.last_violations_count} violação(ões) · {rule.severity.toUpperCase()}
                        </p>
                      </div>
                    ))}
                  </div>
                ) : null}
              </div>
              <div className="rounded-2xl border border-border bg-bg-subtle p-4">
                <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-brand-600">Pipeline operacional</p>
                <p className="mt-2 text-sm font-semibold text-text">{primaryPipeline?.pipeline_name || "Sem pipeline mapeado"}</p>
                <p className="mt-1 text-sm text-text-body">
                  {primaryPipeline
                    ? `DAG ${primaryPipeline.dag_id || "-"} • task ${primaryPipeline.task_name || "-"}`
                    : contextIngestion?.message || "Não há vínculo operacional disponível para este ativo."}
                </p>
                {primaryPipeline ? (
                  <p className="mt-1 text-sm text-text-body">
                    Último sucesso: {formatDateTime(primaryPipeline.last_success_at)}
                  </p>
                ) : null}
                {correlationSummary?.operational_sla ? (
                  <p className="mt-2 text-xs text-muted">
                    SLA: {correlationSummary.operational_sla.status_label} · aging {correlationSummary.operational_sla.aging_hours}h
                    {correlationSummary.operational_sla.due_at ? ` · vence em ${formatDateTime(correlationSummary.operational_sla.due_at)}` : ""}
                  </p>
                ) : null}
                {primaryPipeline?.last_error ? <p className="mt-2 text-xs text-danger-700">{primaryPipeline.last_error}</p> : null}
              </div>
              <div className="rounded-2xl border border-border bg-bg-subtle p-4">
                <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-brand-600">Leitura cruzada</p>
                <p className="mt-2 text-sm text-text-body">
                  {correlationSummary?.signals.summary ||
                    (operationalAttention && dqAttention
                      ? "Há sinais operacionais e de qualidade no mesmo ativo. Priorize investigação conjunta antes de encerrar os chamados."
                      : operationalAttention
                        ? "A falha recente do pipeline pode explicar parte do comportamento observado neste conjunto de incidentes."
                        : dqAttention
                          ? "A qualidade degradada merece investigação mesmo sem falha operacional explícita."
                          : "Os sinais atuais não indicam correlação crítica imediata, mas o contexto do ativo segue disponível.")}
                </p>
              </div>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button asChild size="sm" variant="outline">
                <Link href={`/explorer?tableId=${activeTableId}`}>Abrir ativo</Link>
              </Button>
              <Button asChild size="sm" variant="outline">
                <Link href={`/data-quality?tableId=${activeTableId}`}>Ver impacto em DQ</Link>
              </Button>
              {contextualCreateHref ? (
                <Button asChild size="sm">
                  <Link href={contextualCreateHref}>Abrir chamado contextual</Link>
                </Button>
              ) : null}
              {primaryPipeline?.pipeline_history_href ? (
                <Button asChild size="sm" variant="outline">
                  <Link href={primaryPipeline.pipeline_history_href}>Ver histórico operacional</Link>
                </Button>
              ) : null}
              <Button asChild size="sm" variant="outline">
                <Link href={`/explorer?tableId=${activeTableId}&tab=lineage`}>Ver dependências e linhagem</Link>
              </Button>
              <Button
                onClick={() => updateUrlFromSnapshot({ ...currentFiltersSnapshot(), tableIdFilter: "" }, 1)}
                size="sm"
                variant="ghost"
              >
                Remover filtro do ativo
              </Button>
            </div>
            {(sourceTypeFilter || sourceRefIdFilter) ? (
              <p className="text-xs text-muted">
                A lista também está filtrada por origem:
                {sourceTypeFilter ? ` ${sourceTypeFilter}` : ""}
                {sourceRefIdFilter ? `${sourceTypeFilter ? " · " : " "}ref ${sourceRefIdFilter}` : ""}.
              </p>
            ) : null}
          </CardContent>
        </Card>
      ) : null}

      <div className="flex flex-wrap items-center gap-2">
        {activeChips.map((chip) => (
          <span className="inline-flex items-center gap-1 rounded-full border border-info-200 bg-info-50 px-2.5 py-1 text-xs text-info-700" key={chip.key}>
            <span>{chip.label}</span>
            <button
              aria-label={`Remover filtro ${chip.label}`}
              className="inline-flex h-4 w-4 items-center justify-center rounded-full text-info-600 hover:bg-info-100 hover:text-info-700"
              onClick={chip.remove}
              type="button"
            >
              <X className="h-3 w-3" />
            </button>
          </span>
        ))}
        {activeChips.length ? (
          <Button onClick={reloadClearedFilters} size="sm" variant="ghost">
            Limpar filtros
          </Button>
        ) : null}
      </div>

      <Card className="border-border/80 shadow-[0_12px_32px_rgba(15,23,42,0.04)]" data-doc-anchor="incidents-filters">
        <CardHeader className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <button className="inline-flex items-center gap-2 text-sm font-semibold text-text" onClick={() => setFiltersOpen((prev) => !prev)} type="button">
            <Filter className="h-4 w-4 text-info-700" />
            <span>Filtros ({activeFiltersCount})</span>
            <ChevronDown className={`h-4 w-4 transition-transform ${filtersOpen ? "rotate-180" : "rotate-0"}`} />
          </button>
          <div className="flex flex-wrap items-center gap-2">
            <Badge tone="neutral">{pageData?.total ?? items.length} chamados na consulta</Badge>
            <Button onClick={() => applyCurrentFilters(1)} size="sm" variant="outline">
              Aplicar
            </Button>
          </div>
        </CardHeader>
        {filtersOpen ? (
          <CardContent className="space-y-4">
            <div className="grid gap-3 xl:grid-cols-[1.5fr_1fr_1fr]">
              <div>
                <label className="mb-1 block text-xs font-medium text-text-body">Busca</label>
                <div className="relative">
                  <Search className="pointer-events-none absolute left-3 top-3 h-4 w-4 text-muted" />
                  <Input className="pl-9" onChange={(e) => setQ(e.target.value)} placeholder="title, descrição, fqn, dag" value={q} />
                </div>
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-text-body">Owner / time responsável</label>
                <Input onChange={(e) => setOwnerNameFilter(e.target.value)} placeholder="time de dados" value={ownerNameFilter} />
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-text-body">SLA</label>
                <select className="h-10 w-full rounded-md border border-border-strong px-3 text-sm" onChange={(e) => setSlaStatusFilter(e.target.value)} value={slaStatusFilter}>
                  <option value="">Todos</option>
                  <option value="within_sla">Dentro do SLA</option>
                  <option value="due_soon">Próximo do vencimento</option>
                  <option value="overdue">Fora do SLA</option>
                </select>
              </div>
            </div>

            <div className="grid gap-3 xl:grid-cols-[1fr_1fr]">
              <div>
                <p className="mb-1 text-xs font-medium text-text-body">Status</p>
                <div className="flex flex-wrap gap-2">
                  {STATUS_OPTIONS.map((value) => (
                    <button
                      className={`rounded-full border px-3 py-1 text-xs transition ${
                        statusFilters.includes(value)
                          ? "border-info-200 bg-info-50 text-info-700"
                          : "border-border-strong bg-surface text-text-body hover:border-info-200 hover:bg-info-50/40"
                      }`}
                      key={value}
                      onClick={() => toggleStatusFilter(value)}
                      type="button"
                    >
                      {STATUS_LABELS[value]}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <p className="mb-1 text-xs font-medium text-text-body">Severidade</p>
                <div className="flex flex-wrap gap-2">
                  {SEVERITY_OPTIONS.map((value) => (
                    <button
                      className={`rounded-full border px-3 py-1 text-xs transition ${
                        severityFilters.includes(value)
                          ? "border-info-200 bg-info-50 text-info-700"
                          : "border-border-strong bg-surface text-text-body hover:border-info-200 hover:bg-info-50/40"
                      }`}
                      key={value}
                      onClick={() => toggleSeverityFilter(value)}
                      type="button"
                    >
                      {SEVERITY_LABELS[value]}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div className="space-y-2 rounded-2xl border border-border bg-bg-subtle/70 p-4">
              <div className="flex items-center justify-between gap-3">
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-brand-600">Origem dos chamados</p>
                <p className="text-xs text-muted">Baseado na janela recente da central.</p>
              </div>
              <div className="flex gap-2 overflow-x-auto pb-1 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
                {originCounts.map((origin) => (
                  <Button
                    key={origin.value || "all"}
                    className="shrink-0 whitespace-nowrap"
                    onClick={() => setSourceTypeFilter(origin.value)}
                    size="sm"
                    variant={sourceTypeFilter === origin.value ? "default" : "outline"}
                  >
                    {origin.label} · {origin.count}
                  </Button>
                ))}
              </div>
            </div>

            <div className="flex flex-wrap gap-2">
              <Button onClick={() => setUnassignedOnly((prev) => !prev)} size="sm" variant={unassignedOnly ? "default" : "outline"}>
                Sem responsável
              </Button>
              <Button
                onClick={() => {
                  setStatusFilters(["open"]);
                  setPage(1);
                }}
                size="sm"
                variant={statusFilters.includes("open") ? "default" : "outline"}
              >
                Abertos
              </Button>
              <Button
                onClick={() => {
                  setStatusFilters(["reopened"]);
                  setPage(1);
                }}
                size="sm"
                variant={statusFilters.includes("reopened") ? "default" : "outline"}
              >
                Reabertos
              </Button>
              <Button
                onClick={() => {
                  setStatusFilters(["recurring"]);
                  setPage(1);
                }}
                size="sm"
                variant={statusFilters.includes("recurring") ? "default" : "outline"}
              >
                Recorrentes
              </Button>
              <Button
                onClick={() => {
                  setSourceTypeFilter("dq_rule");
                  setPage(1);
                }}
                size="sm"
                variant={sourceTypeFilter === "dq_rule" ? "default" : "outline"}
              >
                DQ Rule
              </Button>
              <Button onClick={() => setAdvancedFiltersOpen((prev) => !prev)} size="sm" variant="ghost">
                <ChevronDown className={cn("mr-1 h-4 w-4 transition-transform", advancedFiltersOpen ? "rotate-180" : "rotate-0")} />
                Filtros avançados
              </Button>
            </div>

            {advancedFiltersOpen ? (
              <div className="space-y-4 rounded-2xl border border-border bg-surface p-4">
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-brand-600">
                  Use filtros avançados para localizar chamados por origem técnica, ativo, domínio, relator ou referência interna.
                </p>
                <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
                  <div>
                    <label className="mb-1 block text-xs font-medium text-text-body">Tipo</label>
                    <select className="h-10 w-full rounded-md border border-border-strong px-3 text-sm" onChange={(e) => setEntityType(e.target.value as "" | IncidentEntityType)} value={entityType}>
                      <option value="">Todos</option>
                      <option value="table">Tabela</option>
                      <option value="airflow_dag">Airflow DAG</option>
                    </select>
                  </div>
                  <div>
                    <label className="mb-1 block text-xs font-medium text-text-body">ID do responsável</label>
                    <Input inputMode="numeric" onChange={(e) => setOwnerId(e.target.value.replace(/\D/g, ""))} value={ownerId} />
                  </div>
                  <div>
                    <label className="mb-1 block text-xs font-medium text-text-body">ID do relator</label>
                    <Input inputMode="numeric" onChange={(e) => setReporterId(e.target.value.replace(/\D/g, ""))} value={reporterId} />
                  </div>
                  <div>
                    <label className="mb-1 block text-xs font-medium text-text-body">ID do ativo</label>
                    <Input inputMode="numeric" onChange={(e) => setTableIdFilter(e.target.value.replace(/\D/g, ""))} value={tableIdFilter} />
                  </div>
                  <div>
                    <label className="mb-1 block text-xs font-medium text-text-body">De</label>
                    <Input onChange={(e) => setDateFrom(e.target.value)} type="date" value={dateFrom} />
                  </div>
                  <div>
                    <label className="mb-1 block text-xs font-medium text-text-body">Até</label>
                    <Input onChange={(e) => setDateTo(e.target.value)} type="date" value={dateTo} />
                  </div>
                  <div>
                    <label className="mb-1 block text-xs font-medium text-text-body">Domínio</label>
                    <Input onChange={(e) => setDomainNameFilter(e.target.value)} placeholder="Financeiro" value={domainNameFilter} />
                  </div>
                  <div>
                    <label className="mb-1 block text-xs font-medium text-text-body">Tipo de origem</label>
                    <Input onChange={(e) => setSourceTypeFilter(e.target.value)} placeholder="dq_rule" value={sourceTypeFilter} />
                  </div>
                  <div>
                    <label className="mb-1 block text-xs font-medium text-text-body">ID de referência da origem</label>
                    <Input inputMode="numeric" onChange={(e) => setSourceRefIdFilter(e.target.value.replace(/\D/g, ""))} value={sourceRefIdFilter} />
                  </div>
                  <div className="flex items-end">
                    <label className="flex items-center gap-2 text-xs font-medium text-text-body">
                      <input checked={unassignedOnly} onChange={(e) => setUnassignedOnly(e.target.checked)} type="checkbox" />
                      Sem responsável
                    </label>
                  </div>
                </div>
              </div>
            ) : null}
          </CardContent>
        ) : null}
      </Card>

      {loadError ? (
        <Card className="border-danger-200 bg-danger-50/80 shadow-[0_12px_32px_rgba(15,23,42,0.04)]">
          <CardContent className="flex flex-col gap-3 p-5 sm:flex-row sm:items-center sm:justify-between">
            <div className="space-y-1">
              <p className="text-sm font-semibold text-danger-700">Não foi possível carregar os incidentes</p>
              <p className="text-sm text-danger-700">{loadError}</p>
            </div>
            <Button onClick={() => void loadData()} size="sm" variant="outline">
              Tentar novamente
            </Button>
          </CardContent>
        </Card>
      ) : statusMessage ? (
        <p className="text-sm text-danger-700">{statusMessage}</p>
      ) : null}

      {loading ? (
        <div className="grid gap-4 xl:grid-cols-2">
          <Skeleton className="h-56 w-full" />
          <Skeleton className="h-56 w-full" />
        </div>
      ) : loadError ? null : items.length === 0 ? (
        <EmptyState
          action={
            <div className="flex flex-wrap justify-center gap-2">
              {activeChips.length ? (
                <Button onClick={reloadClearedFilters} size="sm" variant="outline">
                  Limpar filtros
                </Button>
              ) : null}
              {activeTableId ? (
                <Button onClick={() => updateUrlFromSnapshot({ ...currentFiltersSnapshot(), tableIdFilter: "" }, 1)} size="sm" variant="ghost">
                  Remover filtro do ativo
                </Button>
              ) : null}
              <Button onClick={clearFilters} size="sm" variant="ghost">
                Ver todos os chamados
              </Button>
            </div>
          }
          title="Nenhum chamado encontrado"
          description={`Não há incidentes para os filtros atuais.${
            activeChips.length ? ` Filtros ativos: ${activeChips.slice(0, 4).map((chip) => chip.label).join(" · ")}${activeChips.length > 4 ? " ..." : ""}.` : ""
          }${activeTableId ? ` Filtro contextual ativo: ${contextTableLabel}.` : ""}`}
        />
      ) : (
        <Card className="border-border/80 shadow-[0_12px_32px_rgba(15,23,42,0.04)]" data-doc-anchor="incidents-list">
          <CardHeader>
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h3 className="text-sm font-semibold text-text">Chamados priorizados</h3>
                <p className="mt-1 text-xs text-muted">
                  A lista prioriza chamados críticos, vencidos, sem responsável e recorrentes.
                </p>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <Badge tone="neutral">{pageData?.total ?? items.length} na consulta</Badge>
                <Badge tone="warning">Página {page}</Badge>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            {incidentCards.map((item) => {
              const editable = canEditIncident(item);
              const slaStatus = incidentSlaStatus(item);
              const sourceCategory = incidentSourceCategory(item);
              const unassigned = incidentIsUnassigned(item);
              const itemTone = item.severity === "sev1" || slaStatus === "overdue" || unassigned ? "risk" : item.status === "investigating" ? "ops" : "neutral";
              return (
                <div
                  className={cn(
                    "rounded-2xl border bg-surface p-4 shadow-sm transition hover:-translate-y-[1px]",
                    itemTone === "risk"
                      ? "border-danger-200 bg-danger-50/80"
                      : itemTone === "ops"
                        ? "border-info-200 bg-info-50/80"
                        : "border-border",
                  )}
                  key={item.id}
                >
                  <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
                    <div className="min-w-0 space-y-3">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="min-w-0 truncate text-sm font-semibold text-text">{item.title}</p>
                        <Badge tone={severityTone(item.severity)}>{item.severity_label || SEVERITY_LABELS[item.severity]}</Badge>
                        <Badge tone={statusTone(item.status)}>{STATUS_LABELS[item.status]}</Badge>
                        {slaStatus === "overdue" ? <Badge tone="warning">SLA vencido</Badge> : null}
                        {slaStatus === "within_sla" && item.operational_sla?.status === "due_soon" ? <Badge tone="warning">Vence hoje</Badge> : null}
                        {unassigned ? <Badge tone="warning">Sem responsável</Badge> : null}
                      </div>

                      <div className="flex flex-wrap items-center gap-2 text-[11px] text-muted">
                        <span>{item.entity_type === "table" ? "TABLE" : "AIRFLOW_DAG"}</span>
                        <span>•</span>
                        <span className="truncate">{item.asset_context?.table_fqn || (item.entity_type === "table" ? item.table_fqn : item.airflow_dag_id) || "Sem ativo relacionado"}</span>
                        <span>•</span>
                        <span className="truncate">
                          {item.asset_context?.database_name || "-"} / {item.asset_context?.schema_name || "-"}
                        </span>
                      </div>

                      <div className="flex flex-wrap gap-2">
                        <Badge tone={sourceCategory.value === "dq_rule" ? "accent" : "neutral"}>{sourceCategory.label}</Badge>
                        {item.operational_sla ? (
                          <Badge tone={item.operational_sla.status === "overdue" ? "warning" : item.operational_sla.status === "due_soon" ? "warning" : "success"}>
                            {item.operational_sla.status_label} · aging {item.operational_sla.aging_hours}h
                          </Badge>
                        ) : (
                          <Badge tone="neutral">Sem SLA definido</Badge>
                        )}
                        {item.occurrences > 1 ? <Badge tone="warning">Recorrente · {item.occurrences} ocorrências</Badge> : null}
                        {item.impact?.summary ? <Badge tone="neutral">Impacto: {item.impact.summary}</Badge> : null}
                      </div>

                      <div className="grid gap-2 rounded-2xl border border-border bg-bg-subtle/80 p-3 sm:grid-cols-2">
                        <div className="space-y-1">
                          <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-muted">Diagnóstico</p>
                          <p className="text-sm text-text-body">
                            {item.source_type === "dq_rule"
                              ? "Falha de Data Quality vinculada a regra operacional."
                              : slaStatus === "overdue"
                                ? "Chamado fora do SLA operacional."
                                : item.status === "reopened"
                                  ? "Chamado reaberto para nova tratativa."
                                  : item.status === "recurring"
                                    ? "Chamado recorrente ou com reincidência operacional."
                                    : item.status === "investigating"
                                      ? "Chamado já em investigação ativa."
                                      : "Chamado aguardando tratativa operacional."}
                          </p>
                        </div>
                        <div className="space-y-1">
                          <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-muted">Contexto</p>
                          <p className="truncate text-sm text-text-body">Responsável: {incidentOwnerLabel(item)}</p>
                          <p className="text-xs text-muted">
                            Detectado em {formatDate(item.detected_at)}
                            {item.operational_sla ? ` · ${item.operational_sla.status_label}` : ""}
                          </p>
                        </div>
                      </div>

                      {item.source_type === "dq_rule" && item.source_ref_id ? (
                        <div className="rounded-2xl border border-info-200 bg-info-50 p-3">
                          <p className="text-xs font-semibold text-info-700">Origem Data Quality</p>
                          <p className="mt-1 text-sm text-info-700">Regra #{item.source_ref_id} • {item.title}</p>
                          <p className="mt-1 text-xs text-info-700">Revise a regra, as ocorrências e o ativo impactado antes de resolver o incidente.</p>
                        </div>
                      ) : null}
                    </div>

                    <div className="flex flex-wrap gap-2 xl:justify-end">
                      <Button
                        onClick={(event) => {
                          event.stopPropagation();
                          openDetailsDrawer(item.id);
                        }}
                        size="sm"
                        variant="outline"
                      >
                        Detalhes
                      </Button>
                      {editable && unassigned ? (
                        <Button
                          onClick={(event) => {
                            event.stopPropagation();
                            openDetailsDrawer(item.id);
                          }}
                          size="sm"
                          variant="outline"
                        >
                          Atribuir responsável
                        </Button>
                      ) : null}
                      {item.asset_context?.links?.explorer ? (
                        <Button asChild onClick={(event) => event.stopPropagation()} size="sm" variant="outline">
                          <Link href={item.asset_context.links.explorer}>Ativo</Link>
                        </Button>
                      ) : null}
                      {item.asset_context?.links?.data_quality ? (
                        <Button asChild onClick={(event) => event.stopPropagation()} size="sm" variant="outline">
                          <Link href={item.asset_context.links.data_quality}>DQ</Link>
                        </Button>
                      ) : null}
                      {item.source_type === "dq_rule" && item.source_ref_id ? (
                        <Button asChild onClick={(event) => event.stopPropagation()} size="sm" variant="outline">
                          <Link href={`/data-quality/rules?rule_id=${item.source_ref_id}`}>Abrir regra DQ</Link>
                        </Button>
                      ) : null}
                      {item.asset_context?.links?.incidents ? (
                        <Button asChild onClick={(event) => event.stopPropagation()} size="sm" variant="ghost">
                          <Link href={item.asset_context.links.incidents}>Fila do ativo</Link>
                        </Button>
                      ) : null}
                      {!editable ? <span className="self-center text-xs text-muted">Somente leitura</span> : null}
                    </div>
                  </div>
                </div>
              );
            })}
            <div className="flex flex-col gap-3 border-t border-border pt-3 sm:flex-row sm:items-center sm:justify-between">
              <p className="text-sm text-muted">
                Mostrando {pageStart}-{pageEnd} de {pageTotal} chamados
              </p>
              <div className="flex gap-2">
                <Button disabled={page <= 1} onClick={() => applyCurrentFilters(page - 1)} size="sm" variant="ghost">
                  Anterior
                </Button>
                <Button disabled={!pageData?.has_more} onClick={() => applyCurrentFilters(page + 1)} size="sm" variant="ghost">
                  Próxima
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {createDrawerOpen ? (
        <div className="fixed inset-0 z-50 bg-black/40 p-3">
          <div className="ml-auto flex h-[100dvh] w-full max-w-xl flex-col overflow-hidden rounded-xl bg-surface shadow-xl">
            <div className="flex items-center justify-between border-b border-border px-5 py-4"><div><h3 className="text-lg font-semibold">Criar chamado</h3><p className="text-xs text-muted">Gestão de incidentes de dados</p></div><button className="rounded p-1 hover:bg-bg-subtle" onClick={closeCreateDrawer} type="button"><X className="h-4 w-4" /></button></div>
            <form className="flex h-[calc(100dvh-73px)] flex-col" onSubmit={submitForm}>
              <div className="flex-1 space-y-3 overflow-y-auto p-5">
                <div><label className="mb-1 block text-sm font-medium">Título</label><Input onChange={(e) => setTitle(e.target.value)} required value={title} /></div>
                <div><label className="mb-1 block text-sm font-medium">Descrição</label><textarea className="min-h-24 w-full rounded-md border border-border-strong px-3 py-2 text-sm" onChange={(e) => setDescription(e.target.value)} value={description} /></div>
                <div className="grid gap-3 sm:grid-cols-2"><div><label className="mb-1 block text-sm font-medium">Tipo da entidade</label><select className="h-10 w-full rounded-md border border-border-strong px-3 text-sm" onChange={(e) => setFormEntityType(e.target.value as IncidentEntityType)} value={formEntityType}><option value="table">Tabela</option><option value="airflow_dag">Airflow DAG</option></select></div><div><label className="mb-1 block text-sm font-medium">Detectado em</label><Input onChange={(e) => setDetectedAt(e.target.value)} required type="datetime-local" value={detectedAt} /></div></div>
                {formEntityType === "table" ? <div><label className="mb-1 block text-sm font-medium">FQN da tabela</label><Input onChange={(e) => setTableFqn(e.target.value)} required value={tableFqn} /></div> : <div><label className="mb-1 block text-sm font-medium">ID da DAG no Airflow</label><Input onChange={(e) => setDagId(e.target.value)} required value={dagId} /></div>}
                <div><label className="mb-1 block text-sm font-medium">Última ocorrência (opcional)</label><Input onChange={(e) => setLastSeenAt(e.target.value)} type="datetime-local" value={lastSeenAt} /></div>
                {(formSourceType || formSourceRefId || formEvidenceJson) ? (
                  <div className="rounded-2xl border border-info-200 bg-info-50 p-4">
                    <p className="text-sm font-semibold text-info-700">Contexto operacional pré-preenchido</p>
                    <div className="mt-2 grid gap-2 text-sm text-info-700 sm:grid-cols-2">
                      <p>Origem: <span className="font-medium">{formSourceType || "—"}</span></p>
                      <p>Ref: <span className="font-medium">{formSourceRefId || "—"}</span></p>
                      {correlationSummary?.operational_sla?.due_at ? (
                        <p className="sm:col-span-2">
                          SLA operacional: <span className="font-medium">{correlationSummary.operational_sla.status_label}</span> · vence em {formatDateTime(correlationSummary.operational_sla.due_at)}
                        </p>
                      ) : null}
                    </div>
                  </div>
                ) : null}
                <div className="grid gap-3 sm:grid-cols-2"><div><label className="mb-1 block text-sm font-medium">Status</label><select className="h-10 w-full rounded-md border border-border-strong px-3 text-sm" onChange={(e) => setFormStatus(e.target.value as IncidentStatus)} value={formStatus}>{STATUS_OPTIONS.map((value) => (<option key={value} value={value}>{STATUS_LABELS[value]}</option>))}</select></div><div><label className="mb-1 block text-sm font-medium">Severidade</label><select className="h-10 w-full rounded-md border border-border-strong px-3 text-sm" onChange={(e) => setFormSeverity(e.target.value as IncidentSeverity)} value={formSeverity}>{SEVERITY_OPTIONS.map((value) => (<option key={value} value={value}>{SEVERITY_LABELS[value]}</option>))}</select></div></div>
                <div className="grid gap-3 sm:grid-cols-2"><div><label className="mb-1 block text-sm font-medium">Responsável</label><select className="h-10 w-full rounded-md border border-border-strong px-3 text-sm" onChange={(e) => setFormOwnerId(e.target.value)} value={formOwnerId}><option value="">Não definido</option>{userOptions.map((user) => (<option key={user.id} value={String(user.id)}>{user.label}</option>))}</select></div><div><label className="mb-1 block text-sm font-medium">Relator</label><select className="h-10 w-full rounded-md border border-border-strong px-3 text-sm" onChange={(e) => setFormReporterId(e.target.value)} value={formReporterId}><option value="">Não definido</option>{userOptions.map((user) => (<option key={user.id} value={String(user.id)}>{user.label}</option>))}</select></div></div>
                <div><label className="mb-1 block text-sm font-medium">Tags (opcional)</label><Input onChange={(e) => setTagsText(e.target.value)} value={tagsText} /></div>
                {formError ? <div className="rounded-md border border-danger-200 bg-danger-50 px-3 py-2 text-sm text-danger-700"><span className="inline-flex items-center gap-2"><AlertTriangle className="h-4 w-4" />{formError}</span></div> : null}
              </div>
              <div className="sticky bottom-0 flex items-center justify-end gap-2 border-t border-border bg-surface px-5 py-4"><Button onClick={closeCreateDrawer} type="button" variant="outline">Cancelar</Button><Button disabled={isSaving} type="submit">{isSaving ? "Salvando..." : "Salvar"}</Button></div>
            </form>
          </div>
        </div>
      ) : null}

      <TicketDetailsDrawer
        canEdit={canEditSelectedTicket}
        onClose={closeDetailsDrawer}
        onDeleted={(ticketId) => {
          setItems((prev) => prev.filter((item) => item.id !== ticketId));
          void loadData();
        }}
        onToast={(tone, message) => setToast({ tone, message })}
        onUpdated={(updated) => {
          setItems((prev) => prev.map((item) => (item.id === updated.id ? updated : item)));
          void loadData();
        }}
        open={detailsDrawerOpen}
        ticketId={selectedTicketId}
        userOptions={userOptions}
      />

      {toast ? <div className="fixed bottom-5 right-5 z-50 max-w-sm rounded-lg border border-border bg-surface p-3 shadow-lg"><p className={`text-sm ${toast.tone === "success" ? "text-success-700" : "text-danger-700"}`}>{toast.message}</p><button className="mt-2 text-xs text-muted underline" onClick={() => setToast(null)} type="button">Fechar</button></div> : null}
    </div>
  );
}
