export type LinkedTablePreview = {
  id: number;
  name: string;
  schema_name: string;
  database_name: string;
  datasource_name: string;
  description: string | null;
};

export type TagItem = {
  id: number;
  external_id: string | null;
  slug: string;
  name: string;
  color: string | null;
  description: string | null;
  group_name: string | null;
  subgroup_name: string | null;
  example_of_use: string | null;
  tag_type: string | null;
  suggested_scope: string | null;
  status: string;
  synonyms: string | null;
  notes: string | null;
  tables_count: number;
  columns_count: number;
  linked_tables_preview: LinkedTablePreview[];
  created_at: string;
  updated_at: string;
};

export type TagDetail = TagItem & {
  linked_tables: LinkedTablePreview[];
};

export type TagIntelligenceSuggestion = {
  id: number;
  tag_id: number;
  tag_name: string;
  tag_slug: string;
  entity_type: string;
  entity_id: number;
  datasource_name: string | null;
  database_name: string | null;
  schema_name: string | null;
  table_id: number | null;
  table_name: string | null;
  column_id: number | null;
  column_name: string | null;
  table_fqn: string | null;
  rule_label: string | null;
  inference_source: string | null;
  inference_reason: string | null;
  confidence_score: number;
  applied_automatically: boolean;
  review_status: string;
  evidence: Record<string, unknown> | null;
  explorer_url: string | null;
  created_at: string;
};

export type TagIntelligenceBatchResult = {
  action: string;
  requested: number;
  succeeded: number;
  failed: number;
  applied_ids: number[];
  failed_items: Array<{ event_id: number; message: string }>;
};

export type TagAutomationRule = {
  id: number;
  tag_id: number;
  tag_name: string | null;
  tag_slug: string | null;
  name: string;
  scope: string;
  status: string;
  action: string;
  category: string | null;
  priority: number;
  match_fields: string[];
  keywords: string[];
  aliases: string[];
  regex_pattern: string | null;
  min_confidence: number;
  notes: string | null;
  created_at: string;
  updated_at: string;
};

export type TagFilters = {
  groups: string[];
  subgroups: string[];
  statuses: string[];
  tag_types: string[];
};

export type TagsTab = "catalog" | "suggestions" | "rules" | "io";
export type PendingRiskBand = "" | "high" | "medium" | "low";

export type TagFormState = {
  external_id: string;
  slug: string;
  name: string;
  description: string;
  group_name: string;
  subgroup_name: string;
  example_of_use: string;
  tag_type: string;
  suggested_scope: string;
  status: string;
  synonyms: string;
  notes: string;
};

export type AutomationRuleForm = {
  id: number | null;
  tag_id: string;
  name: string;
  scope: string;
  status: string;
  action: string;
  category: string;
  priority: string;
  match_fields: string;
  keywords: string;
  aliases: string;
  regex_pattern: string;
  min_confidence: string;
  notes: string;
};
