import {
  AlertTriangle,
  BadgeCheck,
  CircleDot,
  Clock3,
  Crown,
  Landmark,
  Lock,
  ShieldAlert,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/cn";
import { STATUS_TOKENS } from "@/config/status-tokens";

export type CertificationStatus =
  | "not_assessed"
  | "not_eligible"
  | "eligible"
  | "in_review"
  | "certified"
  | "rejected"
  | "expired"
  | "revalidation_pending";
export type CertificationCriticality = "low" | "medium" | "high" | "critical";
export type CertificationBadgeKey = "internal_use" | "official_use" | "restricted_sensitive";

export function certificationStatusLabel(status: string | null | undefined): string {
  switch (status) {
    case "certified":
      return "Certificada";
    case "eligible":
      return "Elegível";
    case "in_review":
      return "Em revisão";
    case "rejected":
      return "Recusada";
    case "expired":
      return "Vencida";
    case "revalidation_pending":
      return "Pendente de revalidação";
    case "not_eligible":
    case "not_assessed":
    default:
      return "Não elegível";
  }
}

export function certificationCriticalityLabel(criticality: string | null | undefined): string {
  switch (criticality) {
    case "critical":
      return "Crítica";
    case "high":
      return "Alta";
    case "medium":
      return "Média";
    case "low":
      return "Baixa";
    default:
      return "Não definida";
  }
}

export function certificationBadgeLabel(badge: string | null | undefined): string {
  switch (badge) {
    case "internal_use":
      return "Uso interno";
    case "official_use":
      return "Uso regulatório";
    case "restricted_sensitive":
      return "Restrito / sensível";
    default:
      return "Complementar";
  }
}

export function CertificationStatusBadge({
  status,
  className,
}: {
  status: string | null | undefined;
  className?: string;
}) {
  if (status === "certified") {
    return (
      <span
        className={cn(
          "inline-flex items-center gap-1.5 rounded-full border border-warning-200 bg-gradient-to-r from-warning-50 via-white to-brand-50 px-3 py-1 text-xs font-semibold text-warning-700 shadow-[inset_0_1px_0_rgba(255,255,255,0.9),0_10px_22px_-16px_rgba(180,83,9,0.55)]",
          className,
        )}
      >
        <Crown className="h-3.5 w-3.5" />
        {certificationStatusLabel(status)}
      </span>
    );
  }
  if (status === "in_review") {
    const tone = STATUS_TOKENS.accent;
    return (
      <span
        className={cn(
          "inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-semibold",
          tone.border,
          tone.background,
          tone.text,
          className,
        )}
      >
        <Clock3 className="h-3.5 w-3.5" />
        {certificationStatusLabel(status)}
      </span>
    );
  }
  if (status === "eligible") {
    const tone = STATUS_TOKENS.success;
    return (
      <span
        className={cn(
          "inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-semibold",
          tone.border,
          tone.background,
          tone.text,
          className,
        )}
      >
        <BadgeCheck className="h-3.5 w-3.5" />
        {certificationStatusLabel(status)}
      </span>
    );
  }
  if (status === "rejected") {
    const tone = STATUS_TOKENS.danger;
    return (
      <span
        className={cn(
          "inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-semibold",
          tone.border,
          tone.background,
          tone.text,
          className,
        )}
      >
        <ShieldAlert className="h-3.5 w-3.5" />
        {certificationStatusLabel(status)}
      </span>
    );
  }
  if (status === "expired" || status === "revalidation_pending") {
    const tone = STATUS_TOKENS.warning;
    return (
      <span
        className={cn(
          "inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-semibold",
          tone.border,
          tone.background,
          tone.text,
          className,
        )}
      >
        <AlertTriangle className="h-3.5 w-3.5" />
        {certificationStatusLabel(status)}
      </span>
    );
  }
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-semibold",
        STATUS_TOKENS.neutral.border,
        "bg-surface",
        STATUS_TOKENS.neutral.text,
        className,
      )}
    >
      <CircleDot className="h-3.5 w-3.5" />
      {certificationStatusLabel(status)}
    </span>
  );
}

export function certificationStatusFrameClass(status: string | null | undefined) {
  if (status === "certified") {
    return "!border-warning-200 !bg-[linear-gradient(180deg,#fffdf4_0%,#ffffff_52%,#fffaf0_100%)] !shadow-[0_18px_48px_rgba(180,83,9,0.08)] !ring-1 !ring-warning-100/80";
  }
  if (status === "revalidation_pending") {
    return "!border-warning-200 !bg-[linear-gradient(180deg,#fff8e7_0%,#ffffff_60%,#fffdf6_100%)] !shadow-[0_14px_34px_rgba(180,83,9,0.05)]";
  }
  return "";
}

export function certificationStatusHeaderClass(status: string | null | undefined) {
  if (status === "certified") {
    return "!bg-[radial-gradient(circle_at_top_right,rgba(20,184,166,0.18),transparent_32%),linear-gradient(135deg,#ffffff_0%,#fffdf4_55%,#fef3c7_100%)]";
  }
  if (status === "revalidation_pending") {
    return "!bg-[linear-gradient(135deg,#fffaf0_0%,#ffffff_55%,#fffbeb_100%)]";
  }
  return "";
}

export function CertificationCriticalityBadge({
  criticality,
  className,
}: {
  criticality: string | null | undefined;
  className?: string;
}) {
  if (criticality === "critical") {
    return (
      <Badge className={cn(STATUS_TOKENS.danger.border, STATUS_TOKENS.danger.background, STATUS_TOKENS.danger.text, className)} tone="neutral">
        <AlertTriangle className="mr-1 h-3.5 w-3.5" />
        {certificationCriticalityLabel(criticality)}
      </Badge>
    );
  }
  if (criticality === "high") {
    return (
      <Badge className={className} tone="warning">
        <AlertTriangle className="mr-1 h-3.5 w-3.5" />
        {certificationCriticalityLabel(criticality)}
      </Badge>
    );
  }
  if (criticality === "medium") {
    return (
      <Badge className={cn(STATUS_TOKENS.accent.border, STATUS_TOKENS.accent.background, STATUS_TOKENS.accent.text, className)} tone="neutral">
        <BadgeCheck className="mr-1 h-3.5 w-3.5" />
        {certificationCriticalityLabel(criticality)}
      </Badge>
    );
  }
  if (criticality === "low") {
    return (
      <Badge className={className} tone="success">
        <BadgeCheck className="mr-1 h-3.5 w-3.5" />
        {certificationCriticalityLabel(criticality)}
      </Badge>
    );
  }
  return (
    <Badge className={className} tone="neutral">
      {certificationCriticalityLabel(criticality)}
    </Badge>
  );
}

export function CertificationUsageBadge({
  badge,
  className,
}: {
  badge: string | null | undefined;
  className?: string;
}) {
  if (badge === "official_use") {
    return (
      <span
        className={cn(
          "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-semibold",
          STATUS_TOKENS.accent.border,
          STATUS_TOKENS.accent.background,
          STATUS_TOKENS.accent.text,
          className,
        )}
      >
        <Landmark className="h-3.5 w-3.5" />
        {certificationBadgeLabel(badge)}
      </span>
    );
  }
  if (badge === "restricted_sensitive") {
    return (
      <span
        className={cn(
          "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-semibold",
          STATUS_TOKENS.danger.border,
          STATUS_TOKENS.danger.background,
          STATUS_TOKENS.danger.text,
          className,
        )}
      >
        <Lock className="h-3.5 w-3.5" />
        {certificationBadgeLabel(badge)}
      </span>
    );
  }
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-semibold",
        "border-info-200 bg-info-50 text-info-700",
        className,
      )}
    >
      <BadgeCheck className="h-3.5 w-3.5" />
      {certificationBadgeLabel(badge)}
    </span>
  );
}
