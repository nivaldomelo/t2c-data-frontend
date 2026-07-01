export type IntelligenceTone = "success" | "accent" | "warning" | "danger" | "neutral";

export type IntelligenceKpi = {
  key: string;
  label: string;
  value: number;
  hint?: string | null;
  tone?: string | null;
  unit?: string | null;
};

export type IntelligenceAttentionItem = {
  table_id?: number | null;
  signal?: string | null;
  priority_score: number;
  tone?: string | null;
  metabase_dashboards: number;
  cause?: string | null;
  causes: string[];
  impact?: string | null;
  action?: string | null;
  href?: string | null;
};

export type IntelligenceAssetRiskItem = {
  table_id?: number | null;
  label?: string | null;
  href?: string | null;
  domain_name?: string | null;
  owner_name?: string | null;
  risk_score: number;
  priority_score: number;
  risk_label?: string | null;
  risk_tone?: string | null;
  reasons: string[];
  suggested_actions: string[];
  next_action?: string | null;
  metabase_dashboards: number;
  stale_hours?: number | null;
  open_incidents: number;
  critical_open_incidents: number;
  suggested_incident: boolean;
};

export type IntelligenceDomainRiskItem = {
  domain: string;
  asset_count: number;
  risk_score: number;
  max_score: number;
  critical_assets: number;
  open_incidents: number;
  tone?: string | null;
};

export type IntelligenceTrackItem = {
  key: string;
  label: string;
  count: number;
};

export type IntelligenceActionTrack = {
  key: string;
  label: string;
  description?: string | null;
  total: number;
  href?: string | null;
  items: IntelligenceTrackItem[];
};

export type IntelligenceNextBestAction = {
  order: number;
  action: string;
  count: number;
  tone?: string | null;
};

export type GovernanceIntelligenceFeed = {
  generated_at: string;
  total_assets: number;
  metabase_priority_count: number;
  kpis: IntelligenceKpi[];
  attention_now: IntelligenceAttentionItem[];
  asset_risk: IntelligenceAssetRiskItem[];
  by_domain: IntelligenceDomainRiskItem[];
  tracks: IntelligenceActionTrack[];
  next_best_actions: IntelligenceNextBestAction[];
};

export type IntelligenceTimelineStep = {
  occurred_at: string;
  title: string;
  severity?: string | null;
  event_type?: string | null;
};

export type IntelligenceTimelineEpisode = {
  episode_key: string;
  title: string;
  summary?: string | null;
  impact_summary?: string | null;
  why_it_matters?: string | null;
  next_action?: string | null;
  status: string;
  severity?: string | null;
  tone?: string | null;
  importance_score: number;
  occurred_at: string;
  correlation_label?: string | null;
  correlation_chain: string[];
  affected_assets_count: number;
  impacted_table_ids: number[];
  steps: IntelligenceTimelineStep[];
};

export type GovernanceIntelligenceTimeline = {
  generated_at: string;
  episodes: IntelligenceTimelineEpisode[];
};

const TONES: ReadonlySet<string> = new Set(["success", "accent", "warning", "danger", "neutral"]);

export function asTone(value: string | null | undefined): IntelligenceTone {
  return value && TONES.has(value) ? (value as IntelligenceTone) : "neutral";
}
