export type GovernanceRecommendationSignal = {
  key: string;
  label: string;
  value?: string | null;
  tone?: string | null;
  detail?: string | null;
};

export type GovernanceRecommendationLinkSet = {
  explorer: string;
  change_management: string;
  data_quality: string;
  incidents: string;
  certification: string;
  owners: string;
  privacy: string;
  lineage: string;
};

export type GovernanceAssistantTool = {
  key: string;
  label: string;
  description?: string | null;
  kind: string;
  action?: string | null;
  confirmation_required: boolean;
  confirmation_label?: string | null;
  confirmation_hint?: string | null;
  severity?: string | null;
  impact?: string | null;
  confidence_score?: number | null;
  can_execute: boolean;
};

export type GovernanceRecommendationItem = {
  id: number;
  key: string;
  recommendation_key: string;
  policy_rule_key?: string | null;
  entity_type: string;
  entity_id: number;
  table_id: number;
  table_name: string;
  table_fqn: string;
  column_id?: number | null;
  column_name?: string | null;
  datasource_id?: number | null;
  datasource_name: string;
  database_name: string;
  schema_name: string;
  domain_name?: string | null;
  owner_name?: string | null;
  certification_status: string;
  certification_status_label: string;
  sensitivity_level?: string | null;
  sensitivity_label: string;
  confidence_score: number;
  trust_score: number;
  trust_label?: string | null;
  trust_tone?: string | null;
  risk_score: number;
  risk_label: string;
  risk_tone: string;
  severity: string;
  severity_label: string;
  impact: string;
  impact_label: string;
  status: string;
  status_label: string;
  action_key: string;
  action_label: string;
  due_at?: string | null;
  aging_days: number;
  context_value?: string | null;
  reason?: string | null;
  summary?: string | null;
  source_kind: string;
  source_label: string;
  priority: number;
  assistant_summary?: string | null;
  feedback_rating?: string | null;
  feedback_label?: string | null;
  feedback_tone?: string | null;
  feedback_note?: string | null;
  feedback_updated_at?: string | null;
  feedback_updated_by_user_id?: number | null;
  signals: GovernanceRecommendationSignal[];
  context: Record<string, any>;
  links: GovernanceRecommendationLinkSet;
  created_at: string;
  updated_at: string;
  resolved_at?: string | null;
  resolved_by_user_id?: number | null;
  resolution_action?: string | null;
  resolution_note?: string | null;
};

export type GovernanceRecommendationSummary = {
  open_recommendations: number;
  high_confidence: number;
  due_soon: number;
  policy_driven: number;
  applied_recently: number;
  dismissed_recently: number;
};

export type GovernanceRecommendationFilterOption = {
  value: string;
  label: string;
};

export type GovernanceRecommendationFilters = {
  statuses: GovernanceRecommendationFilterOption[];
  severities: GovernanceRecommendationFilterOption[];
  impacts: GovernanceRecommendationFilterOption[];
  sources: GovernanceRecommendationFilterOption[];
  datasources: GovernanceRecommendationFilterOption[];
  schemas: GovernanceRecommendationFilterOption[];
  domains: GovernanceRecommendationFilterOption[];
  owners: GovernanceRecommendationFilterOption[];
};

export type GovernanceRecommendationListResponse = {
  generated_at: string;
  total: number;
  page: number;
  page_size: number;
  summary: GovernanceRecommendationSummary;
  filters: GovernanceRecommendationFilters;
  items: GovernanceRecommendationItem[];
};

export type GovernanceRecommendationContextResponse = {
  generated_at: string;
  recommendation: GovernanceRecommendationItem;
  assistant_summary: string;
  assistant_tools: GovernanceAssistantTool[];
  policy_matches: Array<Record<string, any>>;
  playbooks: Array<Record<string, any>>;
  recent_events: Array<Record<string, any>>;
  trust_history: Array<Record<string, any>>;
  canonical_asset?: Record<string, any> | null;
  governance_score?: Record<string, any> | null;
  trust_score?: Record<string, any> | null;
  risk_payload?: Record<string, any> | null;
};

export type GovernanceRecommendationFeedbackInput = {
  feedback_rating: "helpful" | "neutral" | "not_helpful";
  feedback_note?: string | null;
};

export type GovernanceRecommendationFeedbackResponse = {
  recommendation_id: number;
  recommendation_key: string;
  feedback_rating?: string | null;
  feedback_label?: string | null;
  feedback_tone?: string | null;
  feedback_note?: string | null;
  feedback_updated_at?: string | null;
  feedback_updated_by_user_id?: number | null;
  message: string;
};

export type GovernanceAssistantActionInput = {
  tool_key: string;
  confirm?: boolean;
  resolution_note?: string | null;
};

export type GovernanceAssistantActionResponse = {
  ok: boolean;
  recommendation_id: number;
  recommendation_key: string;
  tool_key: string;
  executed: boolean;
  message: string;
  result: Record<string, any>;
};

export type GovernancePlaybook = {
  key: string;
  title: string;
  description?: string | null;
  scope: string;
  trigger_key: string;
  domain_name?: string | null;
  datasource_name?: string | null;
  criticality?: string | null;
  sensitivity_level?: string | null;
  severity: string;
  impact: string;
  sla_days?: number | null;
  action_key: string;
  action_label: string;
  recommendation_title: string;
  recommendation_detail: string;
  auto_create_recommendation: boolean;
  requires_owner: boolean;
  requires_classification: boolean;
  requires_dictionary: boolean;
  requires_active_dq: boolean;
  requires_sla: boolean;
  priority: number;
  is_active: boolean;
  matched_recommendations: number;
  open_recommendations: number;
  last_matched_at?: string | null;
  recommended_actions: Array<{
    key: string;
    label: string;
    description?: string | null;
  }>;
};

export type GovernancePlaybooksResponse = {
  generated_at: string;
  total: number;
  items: GovernancePlaybook[];
};

export type GovernanceRecommendationResolutionResponse = {
  requested: number;
  succeeded: number;
  failed: number;
  applied_ids: number[];
  failed_items: Array<{
    recommendation_id: number;
    message: string;
  }>;
};
