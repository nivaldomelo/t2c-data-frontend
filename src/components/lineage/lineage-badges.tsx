import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/cn";
import { STATUS_TOKENS } from "@/config/status-tokens";

export function LineageLayerBadge({ layer }: { layer: string | null | undefined }) {
  const value = (layer || "").toLowerCase();
  const className =
    value === "bronze"
      ? `${STATUS_TOKENS.warning.border} ${STATUS_TOKENS.warning.background} ${STATUS_TOKENS.warning.text}`
      : value === "silver"
        ? `${STATUS_TOKENS.neutral.border} bg-bg-subtle ${STATUS_TOKENS.neutral.text}`
        : value === "gold"
          ? `${STATUS_TOKENS.warning.border} bg-warning-50 text-warning-700`
          : value === "mart"
            ? "border-brand-200 bg-brand-50 text-brand-700"
            : value === "dashboard"
              ? `${STATUS_TOKENS.accent.border} ${STATUS_TOKENS.accent.background} ${STATUS_TOKENS.accent.text}`
              : `${STATUS_TOKENS.neutral.border} ${STATUS_TOKENS.neutral.background} ${STATUS_TOKENS.neutral.text}`;

  return <Badge className={cn(className, "capitalize")} tone="neutral">{value || "N/A"}</Badge>;
}

export function LineageRelationBadge({ relationType }: { relationType: string | null | undefined }) {
  const value = (relationType || "").toLowerCase();
  const className =
    value === "ingestion" || value === "extracted_from"
      ? `${STATUS_TOKENS.accent.border} ${STATUS_TOKENS.accent.background} ${STATUS_TOKENS.accent.text}`
      : value === "transformation" || value === "transformed_to" || value === "derived_from"
        ? `${STATUS_TOKENS.accent.border} ${STATUS_TOKENS.accent.background} ${STATUS_TOKENS.accent.text}`
        : value === "load" || value === "loaded_to"
          ? `${STATUS_TOKENS.success.border} ${STATUS_TOKENS.success.background} ${STATUS_TOKENS.success.text}`
          : value === "consumption" || value === "consumed_by"
            ? `${STATUS_TOKENS.danger.border} ${STATUS_TOKENS.danger.background} ${STATUS_TOKENS.danger.text}`
            : value === "validates"
              ? `${STATUS_TOKENS.success.border} ${STATUS_TOKENS.success.background} ${STATUS_TOKENS.success.text}`
              : value === "impacts"
                ? `${STATUS_TOKENS.danger.border} ${STATUS_TOKENS.danger.background} ${STATUS_TOKENS.danger.text}`
                : value === "depends_on"
                  ? `${STATUS_TOKENS.neutral.border} ${STATUS_TOKENS.neutral.background} ${STATUS_TOKENS.neutral.text}`
                  : `${STATUS_TOKENS.neutral.border} ${STATUS_TOKENS.neutral.background} ${STATUS_TOKENS.neutral.text}`;
  const label =
    value === "ingestion" || value === "extracted_from"
      ? "Extração"
      : value === "transformation" || value === "transformed_to"
        ? "Transformação"
        : value === "derived_from"
          ? "Derivada"
          : value === "load" || value === "loaded_to"
            ? "Carga"
            : value === "consumption" || value === "consumed_by"
              ? "Consumo"
              : value === "validates"
                ? "Validação"
                : value === "impacts"
                  ? "Impacto"
                  : value === "depends_on"
                    ? "Dependência"
                    : "N/A";

  return <Badge className={cn(className, "capitalize")} tone="neutral">{label}</Badge>;
}

export function LineageOriginBadge({ origin }: { origin: string | null | undefined }) {
  const value = (origin || "").toLowerCase();
  const className =
    value === "automatic"
      ? `${STATUS_TOKENS.info.border} ${STATUS_TOKENS.info.background} ${STATUS_TOKENS.info.text}`
      : value === "merged"
        ? `${STATUS_TOKENS.success.border} ${STATUS_TOKENS.success.background} ${STATUS_TOKENS.success.text}`
        : `${STATUS_TOKENS.neutral.border} ${STATUS_TOKENS.neutral.background} ${STATUS_TOKENS.neutral.text}`;

  const label = value === "automatic" ? "Automática" : value === "merged" ? "Mesclada" : "Manual";
  return <Badge className={cn(className)} tone="neutral">{label}</Badge>;
}
