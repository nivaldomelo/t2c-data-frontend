import type {
  Incident,
  IncidentEntityType,
  IncidentSeverity,
  IncidentStatus,
} from "@/features/incidents/types";

import {
  ORIGIN_FILTERS,
  SEVERITY_ALIASES,
  SEVERITY_LABELS,
  STATUS_ALIASES,
  STATUS_LABELS,
} from "./constants";
import type { ActiveFilterChip, IncidentFiltersSnapshot, OriginFilter } from "./types";

export function toLocalInputDate(value: string): string {
  const date = new Date(value);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

export function statusTone(status: IncidentStatus): "neutral" | "success" | "warning" {
  if (status === "resolved" || status === "closed") return "success";
  if (status === "investigating" || status === "mitigated" || status === "reopened" || status === "recurring") return "warning";
  return "neutral";
}

export function severityTone(sev: IncidentSeverity): "neutral" | "success" | "warning" {
  if (sev === "sev1" || sev === "sev2") return "warning";
  if (sev === "sev4") return "success";
  return "neutral";
}

export function displayUser(user: Incident["owner_user"] | Incident["reporter_user"]): string {
  if (!user) return "-";
  return user.name || user.email;
}

export function formatDate(value: string): string {
  return new Date(value).toLocaleString("pt-BR");
}

export function formatDateTime(value: string | null | undefined): string {
  if (!value) return "—";
  return new Date(value).toLocaleString("pt-BR");
}

export function incidentOwnerLabel(item: Incident): string {
  if (item.asset_context?.owner_name) return item.asset_context.owner_name;
  if (item.owner_team && item.owner_team.trim()) return item.owner_team;
  if (item.squad_name && item.squad_name.trim()) return item.squad_name;
  return displayUser(item.owner_user);
}

export function incidentSourceCategory(item: Incident): OriginFilter {
  const source = (item.source_type || "").trim().toLowerCase();
  if (!source) return ORIGIN_FILTERS[0];
  if (source.startsWith("dq")) return ORIGIN_FILTERS[1];
  if (["pipeline_failure", "pipeline_stale", "ingestion_ops"].includes(source)) return ORIGIN_FILTERS[2];
  if (source.includes("privacy")) return ORIGIN_FILTERS[3];
  if (source.includes("cert")) return ORIGIN_FILTERS[4];
  if (["platform_ops", "ops_cockpit"].includes(source)) return ORIGIN_FILTERS[5];
  if (source === "manual") return ORIGIN_FILTERS[6];
  return { label: source, value: source };
}

export function incidentOriginTone(item: Incident): "neutral" | "success" | "warning" {
  const source = (item.source_type || "").trim().toLowerCase();
  if (source.startsWith("dq")) return "warning";
  if (["pipeline_failure", "pipeline_stale", "ingestion_ops", "platform_ops", "ops_cockpit"].includes(source)) return "warning";
  if (source.includes("privacy") || source.includes("cert")) return "neutral";
  return "neutral";
}

export function incidentSlaStatus(item: Incident): string {
  return item.operational_sla?.status || (item.sla_due_at && new Date(item.sla_due_at).getTime() <= Date.now() ? "overdue" : item.sla_due_at ? "within_sla" : "within_sla");
}

export function incidentIsUnassigned(item: Incident): boolean {
  return !item.owner_user_id && !item.owner_team && !item.squad_name && !item.asset_context?.owner_name;
}

export function incidentPriorityScore(item: Incident): number {
  const status = item.status;
  const sla = incidentSlaStatus(item);
  const source = (item.source_type || "").toLowerCase();
  let score = 0;
  if (item.severity === "sev1") score += 100;
  if (sla === "overdue") score += 80;
  if (incidentIsUnassigned(item)) score += 50;
  if (status === "recurring") score += 45;
  if (status === "open") score += 30;
  if (status === "reopened") score += 25;
  if (status === "investigating") score += 15;
  if (source.startsWith("dq")) score += 10;
  return score;
}

export function incidentPrioritySort(left: Incident, right: Incident): number {
  const scoreDiff = incidentPriorityScore(right) - incidentPriorityScore(left);
  if (scoreDiff !== 0) return scoreDiff;
  const leftTime = new Date(left.detected_at).getTime();
  const rightTime = new Date(right.detected_at).getTime();
  return leftTime - rightTime;
}

export function activeFilterChips(params: {
  q: string;
  entityType: "" | IncidentEntityType;
  ownerId: string;
  reporterId: string;
  tableId: string;
  sourceType: string;
  sourceRefIdFilter: string;
  dateFrom: string;
  dateTo: string;
  domainName: string;
  ownerName: string;
  unassignedOnly: boolean;
  slaStatus: string;
  statusFilters: IncidentStatus[];
  severityFilters: IncidentSeverity[];
  contextualLabel: string | null;
  onRemoveTableId: () => void;
  onRemoveSourceType: () => void;
  onRemoveSourceRefId: () => void;
  onRemoveUnassigned: () => void;
  onRemoveStatus: (value: IncidentStatus) => void;
  onRemoveSeverity: (value: IncidentSeverity) => void;
  onRemoveQ: () => void;
  onRemoveEntityType: () => void;
  onRemoveOwnerId: () => void;
  onRemoveReporterId: () => void;
  onRemoveDateFrom: () => void;
  onRemoveDateTo: () => void;
  onRemoveDomainName: () => void;
  onRemoveOwnerName: () => void;
  onRemoveSlaStatus: () => void;
}): ActiveFilterChip[] {
  const chips: ActiveFilterChip[] = [];
  if (params.q.trim()) chips.push({ key: "q", label: `Busca: ${params.q.trim()}`, remove: params.onRemoveQ });
  if (params.entityType) chips.push({ key: "entityType", label: `Tipo: ${params.entityType === "table" ? "Tabela" : "Airflow DAG"}`, remove: params.onRemoveEntityType });
  if (params.ownerId) chips.push({ key: "ownerId", label: `ID do responsável: ${params.ownerId}`, remove: params.onRemoveOwnerId });
  if (params.reporterId) chips.push({ key: "reporterId", label: `ID do relator: ${params.reporterId}`, remove: params.onRemoveReporterId });
  if (params.tableId) {
    chips.push({
      key: "tableId",
      label: params.contextualLabel ? `Ativo: ${params.contextualLabel}` : `Ativo: ${params.tableId}`,
      remove: params.onRemoveTableId,
    });
  }
  if (params.sourceType.trim()) chips.push({ key: "sourceType", label: `Origem: ${params.sourceType.trim()}`, remove: params.onRemoveSourceType });
  if (params.sourceRefIdFilter.trim()) chips.push({ key: "sourceRefId", label: `Ref. origem: ${params.sourceRefIdFilter.trim()}`, remove: params.onRemoveSourceRefId });
  if (params.dateFrom) chips.push({ key: "dateFrom", label: `De: ${params.dateFrom}`, remove: params.onRemoveDateFrom });
  if (params.dateTo) chips.push({ key: "dateTo", label: `Até: ${params.dateTo}`, remove: params.onRemoveDateTo });
  if (params.domainName.trim()) chips.push({ key: "domainName", label: `Domínio: ${params.domainName.trim()}`, remove: params.onRemoveDomainName });
  if (params.ownerName.trim()) chips.push({ key: "ownerName", label: `Owner: ${params.ownerName.trim()}`, remove: params.onRemoveOwnerName });
  if (params.unassignedOnly) chips.push({ key: "unassigned", label: "Sem responsável", remove: params.onRemoveUnassigned });
  if (params.slaStatus.trim()) chips.push({ key: "slaStatus", label: `SLA: ${params.slaStatus.trim()}`, remove: params.onRemoveSlaStatus });
  params.statusFilters.forEach((value) => chips.push({ key: `status-${value}`, label: `Status: ${STATUS_LABELS[value]}`, remove: () => params.onRemoveStatus(value) }));
  params.severityFilters.forEach((value) => chips.push({ key: `severity-${value}`, label: `Severidade: ${SEVERITY_LABELS[value]}`, remove: () => params.onRemoveSeverity(value) }));
  return chips;
}

export function createEmptyFiltersSnapshot(): IncidentFiltersSnapshot {
  return {
    q: "",
    entityType: "",
    ownerId: "",
    reporterId: "",
    dateFrom: "",
    dateTo: "",
    statusFilters: [],
    severityFilters: [],
    sourceTypeFilter: "",
    sourceRefIdFilter: "",
    tableIdFilter: "",
    domainNameFilter: "",
    ownerNameFilter: "",
    unassignedOnly: false,
    slaStatusFilter: "",
  };
}

export function normalizeIncidentStatusValue(value: string): IncidentStatus | null {
  const normalized = value.trim().toLowerCase();
  if (!normalized) return null;
  return STATUS_ALIASES[normalized] ?? null;
}

export function normalizeIncidentSeverityValue(value: string): IncidentSeverity | null {
  const normalized = value.trim().toLowerCase();
  if (!normalized) return null;
  return SEVERITY_ALIASES[normalized] ?? null;
}

export function readFiltersFromSearchParams(
  params: Pick<URLSearchParams, "get" | "getAll">,
): { filters: IncidentFiltersSnapshot; page: number } {
  const statusFilters = params
    .getAll("status")
    .map((value) => normalizeIncidentStatusValue(value))
    .filter((value): value is IncidentStatus => Boolean(value));
  const severityFilters = params
    .getAll("severity")
    .map((value) => normalizeIncidentSeverityValue(value))
    .filter((value): value is IncidentSeverity => Boolean(value));
  const tableId = (params.get("tableId") || params.get("table_id") || "").replace(/\D/g, "");
  const sourceRefId = (params.get("source_ref_id") || "").replace(/\D/g, "");
  const ownerId = (params.get("owner_id") || "").replace(/\D/g, "");
  const reporterId = (params.get("reporter_id") || "").replace(/\D/g, "");
  const page = Math.max(1, Number.parseInt(params.get("page") || "1", 10) || 1);
  const slaStatusRaw = (params.get("sla_status") || "").trim();
  const slaStatusFilter = slaStatusRaw === "breached" ? "overdue" : slaStatusRaw;
  return {
    filters: {
      q: params.get("q") || "",
      entityType: (params.get("entity_type") || "") as "" | IncidentEntityType,
      ownerId,
      reporterId,
      dateFrom: params.get("date_from") || "",
      dateTo: params.get("date_to") || "",
      statusFilters,
      severityFilters,
      sourceTypeFilter: params.get("source_type") || "",
      sourceRefIdFilter: sourceRefId,
      tableIdFilter: tableId,
      domainNameFilter: params.get("domain_name") || "",
      ownerNameFilter: params.get("owner_name") || "",
      unassignedOnly: ["1", "true"].includes((params.get("unassigned") || "").trim().toLowerCase()),
      slaStatusFilter,
    },
    page,
  };
}

export function buildSearchParamsFromFilters(filters: IncidentFiltersSnapshot, page: number): URLSearchParams {
  const params = new URLSearchParams();
  if (filters.q.trim()) params.set("q", filters.q.trim());
  if (filters.entityType) params.set("entity_type", filters.entityType);
  if (filters.ownerId) params.set("owner_id", filters.ownerId);
  if (filters.reporterId) params.set("reporter_id", filters.reporterId);
  if (filters.dateFrom) params.set("date_from", filters.dateFrom);
  if (filters.dateTo) params.set("date_to", filters.dateTo);
  if (filters.sourceTypeFilter) params.set("source_type", filters.sourceTypeFilter);
  if (filters.sourceRefIdFilter) params.set("source_ref_id", filters.sourceRefIdFilter);
  if (filters.tableIdFilter) params.set("tableId", filters.tableIdFilter);
  if (filters.domainNameFilter) params.set("domain_name", filters.domainNameFilter);
  if (filters.ownerNameFilter) params.set("owner_name", filters.ownerNameFilter);
  if (filters.unassignedOnly) params.set("unassigned", "1");
  if (filters.slaStatusFilter) params.set("sla_status", filters.slaStatusFilter);
  for (const value of filters.statusFilters) params.append("status", value);
  for (const value of filters.severityFilters) params.append("severity", value);
  if (page > 1) params.set("page", String(page));
  return params;
}
