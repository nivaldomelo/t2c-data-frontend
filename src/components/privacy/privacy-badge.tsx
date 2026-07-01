import {
  BadgeCheck,
  Clock3,
  Eye,
  EyeOff,
  Fingerprint,
  Globe,
  Lock,
  Shield,
  ShieldAlert,
  UserRound,
  Users,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/cn";
import { STATUS_TOKENS } from "@/config/status-tokens";

export type PrivacySummaryLike = {
  sensitivity_level?: string | null;
  has_personal_data?: boolean;
  has_sensitive_personal_data?: boolean;
  legal_basis?: string | null;
  legal_basis_label?: string | null;
  privacy_purpose?: string | null;
  retention_policy?: string | null;
  is_masked?: boolean;
  external_sharing?: boolean;
  access_scope?: string | null;
  access_scope_label?: string | null;
  access_roles?: string[] | null;
  access_role_labels?: string[] | null;
  privacy_notes?: string | null;
  privacy_reviewed_at?: string | null;
  possible_personal_data?: boolean;
};

export function sensitivityLabel(value: string | null | undefined): string {
  switch (value) {
    case "public":
      return "Público";
    case "internal":
      return "Interno";
    case "confidential":
      return "Confidencial";
    case "restricted":
      return "Restrito";
    case "personal_data":
      return "Dado pessoal";
    default:
      return "Não classificado";
  }
}

export function accessScopeLabel(value: string | null | undefined): string {
  switch (value) {
    case "public":
      return "Público";
    case "authenticated":
      return "Autenticados";
    case "confidential":
      return "Confidencial";
    case "restricted":
      return "Restrito";
    case "personal_data":
      return "Dado pessoal";
    default:
      return "Escopo não definido";
  }
}

export function accessRoleLabel(value: string | null | undefined): string {
  switch (value) {
    case "admin":
      return "Administrador";
    case "governance":
      return "Governança";
    case "data_owner":
      return "Responsável de dados";
    case "analyst":
      return "Analista";
    case "reader":
      return "Leitor";
    default:
      return "Perfil";
  }
}

export function SensitivityBadge({
  level,
  className,
}: {
  level: string | null | undefined;
  className?: string;
}) {
  if (level === "personal_data") {
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
        <Fingerprint className="h-3.5 w-3.5" />
        {sensitivityLabel(level)}
      </span>
    );
  }
  if (level === "restricted") {
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
        <Lock className="h-3.5 w-3.5" />
        {sensitivityLabel(level)}
      </span>
    );
  }
  if (level === "confidential") {
    return (
      <Badge className={cn(STATUS_TOKENS.warning.border, STATUS_TOKENS.warning.background, STATUS_TOKENS.warning.text, className)} tone="neutral">
        <ShieldAlert className="mr-1 h-3.5 w-3.5" />
        {sensitivityLabel(level)}
      </Badge>
    );
  }
  if (level === "internal") {
    return (
      <Badge className={cn(STATUS_TOKENS.neutral.border, STATUS_TOKENS.neutral.background, STATUS_TOKENS.neutral.text, className)} tone="neutral">
        <Users className="mr-1 h-3.5 w-3.5" />
        {sensitivityLabel(level)}
      </Badge>
    );
  }
  if (level === "public") {
    return (
      <Badge className={className} tone="success">
        <Globe className="mr-1 h-3.5 w-3.5" />
        {sensitivityLabel(level)}
      </Badge>
    );
  }
  return (
    <Badge className={className} tone="neutral">
      <Shield className="mr-1 h-3.5 w-3.5" />
      {sensitivityLabel(level)}
    </Badge>
  );
}

export function AccessScopeBadge({
  scope,
  className,
}: {
  scope: string | null | undefined;
  className?: string;
}) {
  if (scope === "public") {
    return (
      <Badge className={className} tone="success">
        <Eye className="mr-1 h-3.5 w-3.5" />
        {accessScopeLabel(scope)}
      </Badge>
    );
  }
  if (scope === "authenticated") {
    return (
      <Badge className={cn(STATUS_TOKENS.accent.border, STATUS_TOKENS.accent.background, STATUS_TOKENS.accent.text, className)} tone="neutral">
        <Users className="mr-1 h-3.5 w-3.5" />
        {accessScopeLabel(scope)}
      </Badge>
    );
  }
  return (
    <Badge className={cn("border-border bg-bg-subtle text-text-body", className)} tone="neutral">
      <EyeOff className="mr-1 h-3.5 w-3.5" />
      {accessScopeLabel(scope)}
    </Badge>
  );
}

export function PrivacyFlagBadge({
  active,
  label,
  tone = "neutral",
  className,
}: {
  active: boolean;
  label: string;
  tone?: "neutral" | "success" | "warning";
  className?: string;
}) {
  if (!active) return null;
  return (
    <Badge className={className} tone={tone}>
      <BadgeCheck className="mr-1 h-3.5 w-3.5" />
      {label}
    </Badge>
  );
}

export function AccessRoleBadges({
  roles,
  labels,
  className,
}: {
  roles?: string[] | null;
  labels?: string[] | null;
  className?: string;
}) {
  const values = (labels && labels.length ? labels : roles?.map((role) => accessRoleLabel(role))) || [];
  if (!values.length) {
    return <span className={cn("text-xs text-muted", className)}>Perfis padrão do escopo</span>;
  }
  return (
    <div className={cn("flex flex-wrap gap-1.5", className)}>
      {values.map((value) => (
        <span
          className={cn(
            "inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[11px] font-medium",
            STATUS_TOKENS.neutral.border,
            STATUS_TOKENS.neutral.background,
            STATUS_TOKENS.neutral.text,
          )}
          key={value}
        >
          <UserRound className="h-3 w-3" />
          {value}
        </span>
      ))}
    </div>
  );
}

export function PrivacySummaryStrip({
  privacy,
  className,
  compact = false,
}: {
  privacy: PrivacySummaryLike | null | undefined;
  className?: string;
  compact?: boolean;
}) {
  if (!privacy) return null;
  return (
    <div className={cn("flex flex-wrap items-center gap-2", compact ? "gap-1.5" : "gap-2", className)}>
      <SensitivityBadge level={privacy.sensitivity_level} />
      <AccessScopeBadge scope={privacy.access_scope} />
      <PrivacyFlagBadge active={Boolean(privacy.has_personal_data)} label="Dado pessoal" tone="warning" />
      <PrivacyFlagBadge active={Boolean(privacy.has_sensitive_personal_data)} label="Dado sensível" tone="neutral" />
      <PrivacyFlagBadge active={Boolean(privacy.is_masked)} label="Mascarado" tone="success" />
      <PrivacyFlagBadge active={Boolean(privacy.external_sharing)} label="Compartilhamento externo" tone="warning" />
      {privacy.possible_personal_data ? (
        <Badge tone="warning">
          <Clock3 className="mr-1 h-3.5 w-3.5" />
          Possível dado pessoal
        </Badge>
      ) : null}
    </div>
  );
}
