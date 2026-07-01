export type AssistantExplainProblem = {
  key: string;
  label: string;
  severity: string;
  detail: string;
  evidence: Record<string, unknown>;
  action_hint?: string | null;
  href?: string | null;
};

export type AssistantExplainImpact = {
  key: string;
  label: string;
  tone?: string | null;
  detail: string;
  evidence: Record<string, unknown>;
};

export type AssistantRecommendation = {
  key: string;
  label: string;
  detail: string;
  action_key: string;
  action_label: string;
  tone?: string | null;
  destructive?: boolean;
  confirmation_required?: boolean;
  confirmation_hint?: string | null;
  can_execute?: boolean;
  href?: string | null;
};

export type AssistantActionOption = {
  key: string;
  label: string;
  description: string;
  tone?: string | null;
  destructive?: boolean;
  confirmation_required?: boolean;
  confirmation_hint?: string | null;
  can_execute?: boolean;
  requires_owner_id?: boolean;
  recommended?: boolean;
  href?: string | null;
  disabled_reason?: string | null;
};

export type AssistantExplainResponse = {
  generated_at: string;
  asset_ref: string;
  asset_type: string;
  asset_id: number;
  entity_kind: string;
  asset_name: string;
  asset_fqn: string;
  table_id: number;
  column_id?: number | null;
  asset_owner_id?: number | null;
  asset_owner_name?: string | null;
  asset_owner_email?: string | null;
  asset_owner_defined?: boolean;
  sla_defined?: boolean;
  sla_hours?: number | null;
  summary: string;
  problems: AssistantExplainProblem[];
  impact: AssistantExplainImpact[];
  recommendation: AssistantRecommendation;
  actions: AssistantActionOption[];
  context: Record<string, unknown>;
};

export type AssistantActionInput = {
  action_key: string;
  confirm?: boolean;
  data_owner_id?: number | null;
  resolution_note?: string | null;
};

export type AssistantActionResponse = {
  ok: boolean;
  asset_ref: string;
  asset_type: string;
  asset_id: number;
  action_key: string;
  executed: boolean;
  message: string;
  result: Record<string, unknown>;
  follow_up_href?: string | null;
};

export type AssistantDataOwnerOption = {
  id: number;
  name: string;
  email: string;
  area: string | null;
  is_active: boolean;
};
