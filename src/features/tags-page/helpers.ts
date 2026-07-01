import { EMPTY_FORM, EMPTY_RULE_FORM, STATUS_LABELS } from "./constants";
import type { AutomationRuleForm, TagAutomationRule, TagFormState, TagItem } from "./types";

export function statusTone(status: string): "success" | "warning" | "neutral" | "accent" {
  if (status === "active") return "success";
  if (status === "draft") return "accent";
  if (status === "inactive") return "warning";
  return "neutral";
}

export function statusLabel(status: string): string {
  return STATUS_LABELS[status] || status;
}

export function toForm(item: TagItem | null): TagFormState {
  if (!item) return EMPTY_FORM;
  return {
    external_id: item.external_id || "",
    slug: item.slug,
    name: item.name,
    description: item.description || "",
    group_name: item.group_name || "",
    subgroup_name: item.subgroup_name || "",
    example_of_use: item.example_of_use || "",
    tag_type: item.tag_type || "",
    suggested_scope: item.suggested_scope || "",
    status: item.status,
    synonyms: item.synonyms || "",
    notes: item.notes || "",
  };
}

export function toRuleForm(item: TagAutomationRule | null): AutomationRuleForm {
  if (!item) return { ...EMPTY_RULE_FORM };
  return {
    id: item.id,
    tag_id: String(item.tag_id),
    name: item.name,
    scope: item.scope,
    status: item.status,
    action: item.action,
    category: item.category || "",
    priority: String(item.priority ?? 10),
    match_fields: item.match_fields.join(", "),
    keywords: item.keywords.join(", "),
    aliases: item.aliases.join(", "),
    regex_pattern: item.regex_pattern || "",
    min_confidence: String(item.min_confidence ?? 90),
    notes: item.notes || "",
  };
}

export function parseList(value: string): string[] {
  return value
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}

export function formatDate(value: string): string {
  return new Date(value).toLocaleString("pt-BR");
}

export function formatPaginationRange(total: number, page: number, pageSize: number): string {
  if (total === 0) return "Mostrando 0 de 0";
  const start = (page - 1) * pageSize + 1;
  const end = Math.min(total, page * pageSize);
  return `Mostrando ${start}-${end} de ${total}`;
}

export function confidenceTone(value: number): "success" | "warning" | "accent" {
  if (value >= 80) return "success";
  if (value >= 60) return "accent";
  return "warning";
}

export function riskLabel(value: number): string {
  if (value >= 80) return "Baixo risco";
  if (value >= 60) return "Risco médio";
  return "Alto risco";
}
