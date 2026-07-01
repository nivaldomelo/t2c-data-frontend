import type { AutomationRuleForm, TagFormState } from "./types";

export const EMPTY_FORM: TagFormState = {
  external_id: "",
  slug: "",
  name: "",
  description: "",
  group_name: "",
  subgroup_name: "",
  example_of_use: "",
  tag_type: "",
  suggested_scope: "",
  status: "active",
  synonyms: "",
  notes: "",
};

export const EMPTY_RULE_FORM: AutomationRuleForm = {
  id: null,
  tag_id: "",
  name: "",
  scope: "column",
  status: "active",
  action: "apply",
  category: "sensivel",
  priority: "10",
  match_fields: "name, description, comment",
  keywords: "",
  aliases: "",
  regex_pattern: "",
  min_confidence: "90",
  notes: "",
};

export const TAGS_PAGE_SIZE = 10;
export const PENDING_PAGE_SIZE = 10;

export const STATUS_LABELS: Record<string, string> = {
  active: "Ativa",
  inactive: "Inativa",
  draft: "Rascunho",
  deprecated: "Descontinuada",
  archived: "Arquivada",
};
