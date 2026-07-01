export type IncidentStatus = "open" | "investigating" | "mitigated" | "resolved" | "closed" | "reopened" | "recurring";
export type IncidentSeverity = "sev1" | "sev2" | "sev3" | "sev4";
export type IncidentEntityType = "table" | "airflow_dag";

export type UserRef = { id: number; name: string | null; email: string };

export type IncidentAction = {
  key: string;
  label: string;
  description: string;
  href: string;
  category: string;
  tone: string;
};

export type IncidentLinks = {
  explorer: string;
  lineage: string;
  data_quality: string;
  incidents: string;
  audit: string;
  certification: string;
  owners: string;
  datasource: string;
  database: string;
  schema: string;
};

export type IncidentAssetContext = {
  table_id: number | null;
  table_name: string | null;
  table_fqn: string | null;
  datasource_name: string | null;
  database_name: string | null;
  schema_name: string | null;
  domain_name: string | null;
  owner_name: string | null;
  owner_defined: boolean;
  data_owner_id: number | null;
  criticality_score: number | null;
  criticality_label: string | null;
  sensitivity_level: string | null;
  sensitivity_label: string | null;
  dq_score: number | null;
  certification_status: string | null;
  open_incidents: number;
  critical_open_incidents: number;
  links: IncidentLinks | null;
  actions: IncidentAction[];
};

export type IncidentOrigin = {
  kind: string;
  label: string;
  mode: string;
  dq_run_id: number | null;
  dq_rule_id: number | null;
  dq_rule_run_id: number | null;
  dag_id: string | null;
  task_id: string | null;
  integration_name: string | null;
  source_module: string | null;
  source_ref_id: string | number | null;
};

export type IncidentImpact = {
  summary: string;
  operational: string | null;
  governance: string | null;
};

export type IncidentOperationalSLA = {
  issue_type: string;
  issue_label: string;
  detected_at: string;
  due_at: string | null;
  aging_hours: number;
  sla_hours: number | null;
  status: string;
  status_label: string;
  recurrent: boolean;
};

export type IncidentEventUserRef = {
  id: number;
  name: string | null;
  email: string;
};

export type IncidentEvent = {
  id: number;
  incident_id: number;
  event_type: string;
  title: string;
  detail: string | null;
  status_from: string | null;
  status_to: string | null;
  evidence_json: Record<string, unknown> | unknown[] | null;
  actor_user_id: number | null;
  actor_user: IncidentEventUserRef | null;
  actor_name: string | null;
  actor_email: string | null;
  created_at: string;
  updated_at: string;
};

export type Incident = {
  id: number;
  title: string;
  description: string | null;
  entity_type: IncidentEntityType;
  table_fqn: string | null;
  airflow_dag_id: string | null;
  detected_at: string;
  last_seen_at: string | null;
  acknowledged_at: string | null;
  triaged_at: string | null;
  mitigated_at: string | null;
  resolved_at: string | null;
  closed_at: string | null;
  reopened_at: string | null;
  sla_due_at: string | null;
  status: IncidentStatus;
  severity: IncidentSeverity;
  severity_label: string;
  owner_user_id: number | null;
  reporter_user_id: number | null;
  owner_user: UserRef | null;
  reporter_user: UserRef | null;
  tags: string[] | null;
  source_type: string | null;
  source_ref_id: number | null;
  evidence_json: Record<string, unknown> | null;
  technical_origin_json: Record<string, unknown> | null;
  related_links_json: Record<string, unknown> | unknown[] | null;
  impact_json: Record<string, unknown> | unknown[] | null;
  mitigation_json: Record<string, unknown> | unknown[] | null;
  postmortem_json: Record<string, unknown> | unknown[] | null;
  root_cause: string | null;
  impact_summary: string | null;
  mitigation_summary: string | null;
  postmortem_summary: string | null;
  domain_name: string | null;
  owner_team: string | null;
  squad_name: string | null;
  recurrence_count: number;
  occurrences: number;
  asset_context: IncidentAssetContext | null;
  origin: IncidentOrigin | null;
  impact: IncidentImpact | null;
  operational_sla?: IncidentOperationalSLA | null;
  timeline: IncidentEvent[];
  created_at: string;
  updated_at: string;
};

export type IncidentCenterQueue = {
  key: string;
  label: string;
  count: number;
  tone: string;
  href: string | null;
  description: string | null;
};

export type IncidentCenterMetric = {
  key: string;
  label: string;
  value: number;
  unit: string | null;
  tone: string;
  detail: string | null;
};

export type IncidentCenterAsset = {
  key: string;
  label: string;
  table_id: number | null;
  table_fqn: string | null;
  domain_name: string | null;
  owner_name: string | null;
  open_count: number;
  critical_count: number;
  overdue_count: number;
  last_detected_at: string | null;
  href: string | null;
  signals: string[];
};

export type IncidentCenterSummary = {
  generated_at: string;
  window_days: number;
  metrics: IncidentCenterMetric[];
  by_status: IncidentCenterQueue[];
  by_severity: IncidentCenterQueue[];
  by_domain: IncidentCenterQueue[];
  by_owner: IncidentCenterQueue[];
  by_sla: IncidentCenterQueue[];
  top_assets: IncidentCenterAsset[];
  recent_incidents: Incident[];
};
