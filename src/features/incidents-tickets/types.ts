import type {
  Incident,
  IncidentEntityType,
  IncidentSeverity,
  IncidentStatus,
} from "@/features/incidents/types";

export type Me = { id: number; name: string | null; email: string; roles: string[]; permissions: string[]; is_admin: boolean };
export type AdminUser = { id: number; email: string; name: string | null; full_name: string | null; is_active: boolean };
export type TableLocator = {
  table_id: number;
  datasource_id: number;
  datasource_name: string;
  database_id: number | null;
  database_name: string;
  schema_id: number;
  schema_name: string;
  table_name: string;
  kind: string;
  db_type: string;
};
export type TableCorrelationDQRule = {
  id: number;
  name: string;
  severity: string;
  last_run_status: string | null;
  last_violations_count: number;
  open_incident_id: number | null;
  target_url: string;
};
export type TableCorrelationDQSummary = {
  dq_score: number | null;
  failed_rules: number;
  freshness_seconds: number | null;
  run_at: string | null;
  correlated_rules: TableCorrelationDQRule[];
};
export type DQIncidentSignals = {
  open_incidents: number;
  generated_incident_id: number | null;
  links: {
    explorer: string;
    data_quality: string;
    incidents: string;
    audit: string;
    lineage: string;
  };
};
export type IngestionSummary = {
  linked: boolean;
  state: string;
  message: string | null;
  primary_pipeline: {
    pipeline_name: string | null;
    dag_id: string | null;
    task_name: string | null;
    latest_status_label: string | null;
    last_success_at: string | null;
    last_error: string | null;
    pipeline_history_href: string | null;
  } | null;
};
export type CorrelationOperationalSLA = {
  active: boolean;
  issue_type: string | null;
  issue_label: string | null;
  detected_at: string | null;
  due_at: string | null;
  aging_hours: number;
  sla_hours: number | null;
  status: string;
  status_label: string;
  recurrent_degradation: boolean;
};
export type CorrelationIncidentItem = {
  id: number;
  title: string;
  status: string;
  severity: string;
  severity_label: string;
  source_type: string | null;
  detected_at: string;
  last_seen_at: string | null;
  target_url: string;
};
export type CorrelationIncidentPrefill = {
  title: string;
  description: string;
  source_type: string;
  source_ref_id: number;
  evidence_json: Record<string, unknown>;
};
export type CorrelationSummary = {
  table_id: number;
  locator: TableLocator;
  ingestion: IngestionSummary | null;
  dq: TableCorrelationDQSummary;
  incident_signals: DQIncidentSignals | null;
  incidents: {
    open_count: number;
    critical_open_count: number;
    latest_open_incident_id: number | null;
    latest_open_incident_title: string | null;
    items: CorrelationIncidentItem[];
  };
  operational_sla: CorrelationOperationalSLA | null;
  incident_prefill: CorrelationIncidentPrefill | null;
  signals: {
    combined_attention: boolean;
    operational_failure: boolean;
    stale_pipeline: boolean;
    open_incident: boolean;
    dq_below_threshold: boolean;
    summary: string;
  };
};
export type IncidentListResponse = {
  items?: Incident[];
  total?: number;
  page?: number;
  page_size?: number;
  has_more?: boolean;
};
export type OriginFilter = {
  label: string;
  value: string;
};
export type IncidentFiltersSnapshot = {
  q: string;
  entityType: "" | IncidentEntityType;
  ownerId: string;
  reporterId: string;
  dateFrom: string;
  dateTo: string;
  statusFilters: IncidentStatus[];
  severityFilters: IncidentSeverity[];
  sourceTypeFilter: string;
  sourceRefIdFilter: string;
  tableIdFilter: string;
  domainNameFilter: string;
  ownerNameFilter: string;
  unassignedOnly: boolean;
  slaStatusFilter: string;
};

export type ActiveFilterChip = {
  key: string;
  label: string;
  remove: () => void;
};

export type Tone = {
  border: string;
  surface: string;
  icon: string;
};
