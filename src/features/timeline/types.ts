export type TimelineCategory = "governance" | "operation" | "quality" | "incident" | "audit";
export type TimelineMode = "manual" | "automatic" | "unknown";
export type TimelineSeverity = "low" | "medium" | "high" | "critical";

export type TimelineEvent = {
  id: string;
  occurred_at: string;
  category: TimelineCategory;
  event_type: string;
  title: string;
  detail: string | null;
  source_module: string | null;
  source_label: string | null;
  actor_name: string | null;
  actor_email: string | null;
  mode: TimelineMode;
  severity: TimelineSeverity;
  priority: number;
  entity_type: string | null;
  entity_id: string | null;
  table_id: number | null;
  column_id: number | null;
  table_name: string | null;
  column_name: string | null;
  schema_name: string | null;
  database_name: string | null;
  datasource_name: string | null;
  table_fqn: string | null;
  owner_name: string | null;
  certification_status: string | null;
  certification_status_label: string | null;
  readiness_score: number | null;
  trust_score: number | null;
  trust_label: string | null;
  trust_tone: string | null;
  trust_delta: number | null;
  trust_summary: string | null;
  active_dq_violation: boolean;
  active_dq_rule_names: string[];
  href: string | null;
  metadata_json: Record<string, unknown> | null;
};

export type TimelineEpisodeMember = {
  id: string;
  occurred_at: string;
  title: string;
  detail: string | null;
  category: TimelineCategory;
  event_type: string;
  mode: TimelineMode;
  severity: TimelineSeverity;
  priority: number;
  table_id: number | null;
  column_id: number | null;
  table_name: string | null;
  column_name: string | null;
  table_fqn: string | null;
  owner_name: string | null;
  trust_score: number | null;
  trust_delta: number | null;
  active_dq_violation: boolean;
  href: string | null;
  metadata_json: Record<string, unknown> | null;
};

export type TimelineEpisode = {
  episode_key: string;
  id: string;
  episode_type: string;
  title: string;
  summary: string;
  impact_summary: string;
  why_it_matters: string;
  next_action: string;
  status: "open" | "watching" | "acknowledged" | "silenced" | "resolved";
  category: TimelineCategory;
  source_module: string | null;
  source_label: string | null;
  mode: TimelineMode;
  severity: TimelineSeverity;
  priority: number;
  importance_score: number;
  occurred_at: string;
  updated_at: string;
  window_start: string;
  window_end: string;
  event_count: number;
  affected_assets_count: number;
  affected_columns_count: number;
  impacted_table_ids: number[];
  impacted_table_fqns: string[];
  impacted_owner_names: string[];
  related_labels: string[];
  child_events: TimelineEpisodeMember[];
  action_count: number;
  acknowledged_at: string | null;
  acknowledged_by_name: string | null;
  silenced_until: string | null;
  silence_reason: string | null;
  last_action_type: string | null;
  href: string | null;
  metadata_json: Record<string, unknown> | null;
  correlation_label: string | null;
  correlation_chain: string[];
};

export type TimelineAnalyticsBucket = {
  label: string;
  count: number;
};

export type TimelineAnalytics = {
  total_episodes: number;
  open_episodes: number;
  acknowledged_episodes: number;
  silenced_episodes: number;
  resolved_episodes: number;
  critical_episodes: number;
  recurrent_episodes: number;
  impacted_assets: number;
  impacted_columns: number;
  average_importance_score: number;
  average_event_count: number;
  top_episode_types: TimelineAnalyticsBucket[];
  top_sources: TimelineAnalyticsBucket[];
  top_statuses: TimelineAnalyticsBucket[];
};

export type TimelineEpisodeAction = {
  id: number;
  episode_key: string;
  table_id: number | null;
  column_id: number | null;
  action_type: "acknowledge" | "silence";
  status: string;
  reason: string | null;
  silent_until: string | null;
  actor_user_id: number | null;
  actor_name: string | null;
  actor_email: string | null;
  metadata_json: Record<string, unknown> | null;
  created_at: string | null;
  updated_at: string | null;
};

export type TimelineEpisodeActionInput = {
  episode_key: string;
  action_type: "acknowledge" | "silence";
  table_id: number | null;
  column_id: number | null;
  reason: string | null;
  silent_until: string | null;
};

export type TimelineSummary = {
  total: number;
  governance: number;
  operation: number;
  quality: number;
  incident: number;
  audit: number;
  manual: number;
  automatic: number;
  critical: number;
};

export type TimelinePage = {
  generated_at: string;
  scope: "global" | "asset";
  table_id: number | null;
  column_id: number | null;
  table_fqn: string | null;
  page: number;
  page_size: number;
  total: number;
  summary: TimelineSummary;
  items: TimelineEvent[];
  episode_page: number;
  episode_page_size: number;
  episode_total: number;
  episodes: TimelineEpisode[];
  analytics: TimelineAnalytics;
};
