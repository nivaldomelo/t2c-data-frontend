import type { DataLakeAuthType, DataLakeConnectionInput } from "@/features/integrations/types";
import type { DataLakeForm } from "./data-lake-console-types";

export function authHelpText(authType: DataLakeAuthType): string {
  switch (authType) {
    case "access_key_secret_key":
      return "Use um par de access key + secret key para validar o bucket e o prefixo.";
    case "access_key_secret_key_session_token":
      return "Use access key + secret key + session token quando a conta for temporária.";
    case "role_arn":
      return "Assuma uma role via STS usando credenciais de origem ou as variáveis do ambiente AWS.";
    case "default_environment":
    default:
      return "Use as credenciais padrão do ambiente, sem expor segredos nesta tela.";
  }
}

export function toneClasses(tone: "neutral" | "accent" | "success" | "warning" | "danger"): string {
  switch (tone) {
    case "success":
      return "border-success-200 bg-success-50 text-success-700";
    case "warning":
      return "border-warning-200 bg-warning-50 text-warning-700";
    case "danger":
      return "border-danger-200 bg-danger-50 text-danger-700";
    case "accent":
      return "border-info-200 bg-info-50 text-info-700";
    default:
      return "border-border bg-bg-subtle text-text-body";
  }
}

export function buildPayload(form: DataLakeForm): DataLakeConnectionInput {
  const parseOptionalNumber = (value: string): number | null => {
    const trimmed = value.trim();
    if (!trimmed) return null;
    const parsed = Number(trimmed);
    return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
  };
  return {
    name: form.name.trim(),
    description: form.description.trim() || null,
    bucket: form.bucket.trim(),
    region: form.region.trim(),
    prefix: form.prefix.trim() || null,
    auth_type: form.auth_type,
    freshness_sla_hours_default: parseOptionalNumber(form.freshness_sla_hours_default),
    freshness_sla_hours_bronze: parseOptionalNumber(form.freshness_sla_hours_bronze),
    freshness_sla_hours_silver: parseOptionalNumber(form.freshness_sla_hours_silver),
    freshness_sla_hours_gold: parseOptionalNumber(form.freshness_sla_hours_gold),
    aws_access_key_id: form.aws_access_key_id.trim() || null,
    aws_secret_access_key: form.aws_secret_access_key.trim() || null,
    aws_session_token: form.aws_session_token.trim() || null,
    role_arn: form.role_arn.trim() || null,
    is_active: form.is_active,
  };
}
