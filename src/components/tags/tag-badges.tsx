import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/cn";

type TagBadgeItem = {
  id: number;
  name: string;
  color?: string | null;
  confidence_score?: number | null;
  inference_source?: string | null;
  inference_reason?: string | null;
  evidence?: { matched_sources?: string[]; matched_terms?: string[] } | null;
  applied_automatically?: boolean | null;
  review_status?: string | null;
  rule_label?: string | null;
  assigned_scope?: string | null;
  assigned_entity_type?: string | null;
  suggested_scope?: string | null;
};

function tagTone(tag: TagBadgeItem): "neutral" | "accent" | "success" | "warning" | "danger" {
  if (tag.review_status === "pending_review" || tag.review_status === "suggested") return "warning";
  if (tag.applied_automatically) return "success";
  return "neutral";
}

export function TagBadge({
  tag,
  className,
}: {
  tag: TagBadgeItem;
  className?: string;
}) {
  const tone = tagTone(tag);
  const rawScope = tag.assigned_scope || tag.assigned_entity_type || tag.suggested_scope;
  const scope =
    rawScope === "column"
      ? "coluna"
      : rawScope === "table"
        ? "tabela"
        : rawScope === "aggregated"
          ? "agregado"
          : rawScope;
  const title = [
    scope ? `Escopo: ${scope}` : null,
    tag.rule_label,
    tag.inference_source ? `Fonte: ${tag.inference_source}` : null,
    tag.confidence_score != null ? `Confiança: ${tag.confidence_score}%` : null,
    tag.evidence?.matched_sources?.length ? `Evidência: ${tag.evidence.matched_sources.join(", ")}` : null,
    tag.inference_reason,
  ]
    .filter(Boolean)
    .join(" • ");

  return (
    <Badge
      className={cn("gap-1.5 px-2 py-0.5 text-[11px] font-semibold", className)}
      title={title || tag.name}
      tone={tone}
    >
      <span className={cn("h-1.5 w-1.5 rounded-full", tag.applied_automatically ? "bg-success-500" : tone === "warning" ? "bg-warning-500" : "bg-slate-400")} />
      <span>{tag.name}</span>
      {tag.applied_automatically ? <span className="text-[9px] uppercase tracking-[0.14em] opacity-80">Auto</span> : null}
      {tag.review_status === "pending_review" || tag.review_status === "suggested" ? (
        <span className="text-[9px] uppercase tracking-[0.14em] opacity-80">Revisar</span>
      ) : null}
    </Badge>
  );
}

export function TagBadgeList({
  tags,
  maxVisible = 4,
  className,
}: {
  tags: TagBadgeItem[];
  maxVisible?: number;
  className?: string;
}) {
  const visibleTags = tags.slice(0, maxVisible);
  const extra = Math.max(0, tags.length - visibleTags.length);

  if (tags.length === 0) {
    return <span className={cn("text-xs text-muted", className)}>Sem tags</span>;
  }

  return (
    <div className={cn("flex flex-wrap gap-1.5", className)}>
      {visibleTags.map((tag) => (
        <TagBadge key={tag.id} tag={tag} />
      ))}
      {extra > 0 ? <span className="inline-flex items-center rounded-full border border-border bg-surface px-2 py-0.5 text-[11px] text-muted">+{extra}</span> : null}
    </div>
  );
}
