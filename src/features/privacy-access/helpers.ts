import type { PrivacySummaryLike } from "@/components/privacy/privacy-badge";
import type { AuditHistoryEvent } from "@/features/audit/types";

import type {
  GlobalEventsPeriodFilter,
  HistoryCategoryKey,
  HistoryImpact,
  PriorityItem,
  PrivacyFormState,
  PrivacyGlobalSummary,
  PrivacyHistoryEntry,
  PrivacyReviewEvent,
  PrivacyTable,
  PrivacyTableDetail,
  QuickFilterKey,
} from "./types";

export function formatDateTime(value: string | null | undefined): string {
  if (!value) return "Ainda não revisado";
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return "Ainda não revisado";
  return parsed.toLocaleString("pt-BR");
}

export function formatDateInputValue(value: string | null | undefined): string {
  if (!value) return "";
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return "";
  return parsed.toISOString().slice(0, 16);
}

export function isPastDate(value: string | null | undefined): boolean {
  if (!value) return false;
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return false;
  return parsed.getTime() < Date.now();
}

export function isWithinDays(value: string | null | undefined, days: number): boolean {
  if (!value) return false;
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return false;
  const now = Date.now();
  const diff = parsed.getTime() - now;
  return diff >= 0 && diff <= days * 24 * 60 * 60 * 1000;
}

export function periodDateFrom(period: GlobalEventsPeriodFilter): string | null {
  if (period === "all") return null;
  const now = new Date();
  const days = period === "7d" ? 7 : period === "30d" ? 30 : 90;
  now.setDate(now.getDate() - days);
  return now.toISOString().slice(0, 10);
}

export function buildForm(detail: PrivacyTableDetail | null): PrivacyFormState {
  return {
    sensitivity_level: detail?.privacy.sensitivity_level || "",
    has_personal_data: Boolean(detail?.privacy.has_personal_data),
    has_sensitive_personal_data: Boolean(detail?.privacy.has_sensitive_personal_data),
    legal_basis: detail?.privacy.legal_basis || "",
    privacy_purpose: detail?.privacy.privacy_purpose || "",
    retention_policy: detail?.privacy.retention_policy || "",
    is_masked: Boolean(detail?.privacy.is_masked),
    external_sharing: Boolean(detail?.privacy.external_sharing),
    access_scope: detail?.privacy.access_scope || "",
    access_roles: detail?.privacy.access_roles || [],
    privacy_notes: detail?.privacy.privacy_notes || "",
  };
}

export function isWideAccess(scope: string | null | undefined): boolean {
  return !scope || scope === "authenticated" || scope === "public";
}

export function isRestrictedAccess(scope: string | null | undefined): boolean {
  return scope === "confidential" || scope === "restricted" || scope === "personal_data";
}

export function needsLegalBasis(privacy: PrivacySummaryLike): boolean {
  return Boolean(privacy.has_personal_data || privacy.has_sensitive_personal_data);
}

export function hasFormalClassification(privacy: PrivacySummaryLike): boolean {
  return Boolean(privacy.sensitivity_level || privacy.has_personal_data || privacy.has_sensitive_personal_data);
}

export function collectRiskSignals(privacy: PrivacySummaryLike, owner: string | null | undefined): string[] {
  const signals: string[] = [];
  if (privacy.possible_personal_data && !hasFormalClassification(privacy)) {
    signals.push("Possível dado pessoal sem classificação formal");
  }
  if (privacy.possible_personal_data && isWideAccess(privacy.access_scope)) {
    signals.push("Sinal automático com acesso amplo");
  }
  if (privacy.has_sensitive_personal_data && isWideAccess(privacy.access_scope)) {
    signals.push("Dado sensível com acesso amplo");
  }
  if (needsLegalBasis(privacy) && !privacy.legal_basis) {
    signals.push("Dado pessoal sem base legal registrada");
  }
  if (needsLegalBasis(privacy) && !privacy.privacy_purpose) {
    signals.push("Dado pessoal sem finalidade LGPD estruturada");
  }
  if (!owner) {
    signals.push("Ativo sem owner definido");
  }
  if (!privacy.privacy_reviewed_at) {
    signals.push("Sem revisão de privacidade registrada");
  }
  return signals;
}

export function buildActionList(
  privacy: PrivacySummaryLike,
  owner: string | null | undefined,
  options?: {
    nextReviewAt?: string | null;
    reviewedAt?: string | null;
  },
): string[] {
  const actions: string[] = [];
  if (privacy.possible_personal_data && !hasFormalClassification(privacy)) {
    actions.push("Confirmar a sensibilidade formal do ativo");
  }
  if (!owner) {
    actions.push("Definir owner antes da decisão de privacidade");
  }
  if (needsLegalBasis(privacy) && !privacy.legal_basis) {
    actions.push("Registrar base legal LGPD");
  }
  if (needsLegalBasis(privacy) && !privacy.privacy_purpose) {
    actions.push("Registrar a finalidade do tratamento");
  }
  if (privacy.has_sensitive_personal_data && isWideAccess(privacy.access_scope)) {
    actions.push("Restringir o acesso a perfis autorizados");
  } else if (privacy.possible_personal_data && isWideAccess(privacy.access_scope)) {
    actions.push("Revisar se o acesso amplo é realmente necessário");
  }
  if (!privacy.privacy_reviewed_at) {
    actions.push("Registrar revisão e justificativa da política");
  }
  if (options?.nextReviewAt && isPastDate(options.nextReviewAt)) {
    actions.unshift("Registrar revisão periódica porque a política já venceu");
  } else if (!options?.nextReviewAt && (privacy.has_personal_data || privacy.has_sensitive_personal_data || isRestrictedAccess(privacy.access_scope))) {
    actions.push("Definir a próxima revisão formal da política");
  } else if (options?.nextReviewAt && isWithinDays(options.nextReviewAt, 30)) {
    actions.push("Programar a próxima revisão antes do vencimento");
  }
  if (privacy.has_sensitive_personal_data && options?.reviewedAt && isPastDate(new Date(new Date(options.reviewedAt).getTime() + 90 * 24 * 60 * 60 * 1000).toISOString())) {
    actions.push("Revalidar o ativo sensível com evidência reforçada de acesso");
  }
  if (!privacy.retention_policy) {
    actions.push("Informar política de retenção ou regra equivalente");
  }
  if (!actions.length) {
    actions.push("Validar periodicamente a revisão de privacidade do ativo");
  }
  return actions;
}

export function computeLocalSummary(items: PrivacyTable[]): PrivacyGlobalSummary {
  const totals = {
    visible_assets: items.length,
    classified_assets: 0,
    unclassified_assets: 0,
    confirmed_personal_data: 0,
    confirmed_sensitive_data: 0,
    restricted_assets: 0,
    possible_personal_data: 0,
    without_legal_basis: 0,
    wide_access_with_suspicion: 0,
    without_owner: 0,
    without_review: 0,
  };
  const risk = { critical: 0, high: 0, medium: 0, low: 0 };
  const blockers = new Map<string, { key: string; label: string; count: number; percent: number; description: string; action: string }>();
  const bySchema = new Map<
    string,
    {
      database: string;
      schema: string;
      total: number;
      unclassified: number;
      possible_personal_data: number;
      confirmed_personal_data: number;
      sensitive_data: number;
      restricted: number;
      wide_access_with_suspicion: number;
      without_legal_basis: number;
      risk_score_total: number;
    }
  >();

  const priorities = items
    .map((item) => {
      const priority = computePriority(item);
      if (!priority) return null;
      let riskLevel = "medium";
      if (item.privacy.has_sensitive_personal_data && isWideAccess(item.privacy.access_scope)) riskLevel = "critical";
      else if (
        (item.privacy.has_personal_data && !item.privacy.legal_basis && isWideAccess(item.privacy.access_scope)) ||
        (item.privacy.possible_personal_data && !hasFormalClassification(item.privacy))
      ) {
        riskLevel = "high";
      }
      return {
        asset_id: item.id,
        asset_name: item.name,
        database_name: item.database_name,
        schema_name: item.schema_name,
        risk_level: riskLevel,
        reason: priority.reason,
        recommended_action: priority.action,
      };
    })
    .filter((item): item is NonNullable<typeof item> => Boolean(item));

  for (const item of items) {
    const classified = Boolean(item.privacy.sensitivity_level);
    const confirmedPersonal = Boolean(item.privacy.has_personal_data);
    const confirmedSensitive = Boolean(item.privacy.has_sensitive_personal_data);
    const restricted = isRestrictedAccess(item.privacy.access_scope);
    const possiblePersonal = Boolean(item.privacy.possible_personal_data);
    const withoutLegalBasis = needsLegalBasis(item.privacy) && !item.privacy.legal_basis;
    const wideAccessWithSuspicion = possiblePersonal && isWideAccess(item.privacy.access_scope);
    const withoutOwner = !item.owner;
    const withoutReview = !item.privacy.privacy_reviewed_at;

    totals.classified_assets += Number(classified);
    totals.unclassified_assets += Number(!classified);
    totals.confirmed_personal_data += Number(confirmedPersonal);
    totals.confirmed_sensitive_data += Number(confirmedSensitive);
    totals.restricted_assets += Number(restricted);
    totals.possible_personal_data += Number(possiblePersonal);
    totals.without_legal_basis += Number(withoutLegalBasis);
    totals.wide_access_with_suspicion += Number(wideAccessWithSuspicion);
    totals.without_owner += Number(withoutOwner);
    totals.without_review += Number(withoutReview);

    const riskLevel =
      confirmedSensitive && isWideAccess(item.privacy.access_scope)
        ? "critical"
        : confirmedPersonal && !item.privacy.legal_basis && isWideAccess(item.privacy.access_scope)
          ? "high"
          : possiblePersonal && !hasFormalClassification(item.privacy)
            ? "high"
            : !classified || withoutOwner || withoutReview
              ? "medium"
              : "low";
    risk[riskLevel] += 1;

    const blockerKey = possiblePersonal && !hasFormalClassification(item.privacy)
      ? "possible_personal_unclassified"
      : confirmedSensitive && isWideAccess(item.privacy.access_scope)
        ? "sensitive_wide_access"
        : withoutLegalBasis
          ? "without_legal_basis"
          : wideAccessWithSuspicion
            ? "wide_access_with_suspicion"
            : withoutOwner
              ? "without_owner"
              : withoutReview
                ? "without_review"
                : needsLegalBasis(item.privacy) && !item.privacy.privacy_purpose
                  ? "without_purpose"
                  : !classified
                    ? "unclassified"
                    : "controlled";

    if (blockerKey !== "controlled") {
      const current = blockers.get(blockerKey);
      if (current) current.count += 1;
      else {
        const metadata = {
          possible_personal_unclassified: {
            label: "Possível dado pessoal sem classificação",
            description: "Ativos com sinal automático de dado pessoal, mas sem decisão formal.",
            action: "Revisar sensibilidade",
          },
          sensitive_wide_access: {
            label: "Dado sensível com acesso amplo",
            description: "Ativos sensíveis expostos além do necessário.",
            action: "Restringir acesso",
          },
          without_legal_basis: {
            label: "Sem base legal",
            description: "Ativos com dado pessoal confirmado sem fundamento jurídico registrado.",
            action: "Informar base legal LGPD",
          },
          wide_access_with_suspicion: {
            label: "Acesso amplo com suspeita",
            description: "Ativos com sinal de dado pessoal ainda acessíveis a públicos mais amplos.",
            action: "Revisar acesso",
          },
          without_owner: {
            label: "Sem owner",
            description: "Ativos sem responsável definido para validar privacidade.",
            action: "Definir owner",
          },
          without_review: {
            label: "Sem revisão",
            description: "Ativos sem revisão registrada da política de privacidade.",
            action: "Registrar revisão",
          },
          without_purpose: {
            label: "Sem finalidade",
            description: "Ativos com dado pessoal confirmado sem finalidade estruturada.",
            action: "Registrar finalidade",
          },
          unclassified: {
            label: "Não classificado",
            description: "Ativos ainda sem decisão formal de sensibilidade.",
            action: "Classificar sensibilidade",
          },
        }[blockerKey];
        blockers.set(blockerKey, {
          key: blockerKey,
          label: metadata.label,
          count: 1,
          percent: 0,
          description: metadata.description,
          action: metadata.action,
        });
      }
    }

    const schemaKey = `${item.database_name}.${item.schema_name}`;
    const schemaBucket =
      bySchema.get(schemaKey) ||
      {
        database: item.database_name,
        schema: item.schema_name,
        total: 0,
        unclassified: 0,
        possible_personal_data: 0,
        confirmed_personal_data: 0,
        sensitive_data: 0,
        restricted: 0,
        wide_access_with_suspicion: 0,
        without_legal_basis: 0,
        risk_score_total: 0,
      };
        schemaBucket.total += 1;
    schemaBucket.unclassified += Number(!classified);
    schemaBucket.possible_personal_data += Number(possiblePersonal);
    schemaBucket.confirmed_personal_data += Number(confirmedPersonal);
    schemaBucket.sensitive_data += Number(confirmedSensitive);
    schemaBucket.restricted += Number(restricted);
    schemaBucket.wide_access_with_suspicion += Number(wideAccessWithSuspicion);
    schemaBucket.without_legal_basis += Number(withoutLegalBasis);
    schemaBucket.risk_score_total += riskLevel === "critical" ? 100 : riskLevel === "high" ? 75 : riskLevel === "medium" ? 45 : 15;
    bySchema.set(schemaKey, schemaBucket);
  }

  const topBlockers = Array.from(blockers.values())
    .map((item) => ({ ...item, percent: totals.visible_assets ? Number(((item.count / totals.visible_assets) * 100).toFixed(2)) : 0 }))
    .sort((left, right) => right.count - left.count)
    .slice(0, 6);

  const bySchemaList = Array.from(bySchema.values())
    .map((item) => ({
      ...item,
      schema_name: item.schema,
      risk_score: item.total ? Math.round(item.risk_score_total / item.total) : 0,
    }))
    .sort((left, right) => right.risk_score - left.risk_score)
    .slice(0, 12)
    .map(({ risk_score_total: _ignored, schema: _legacySchema, ...rest }) => rest);

  return {
    totals,
    risk,
    top_blockers: topBlockers,
    by_schema: bySchemaList,
    priorities: priorities.slice(0, 10),
  };
}

export function computePriority(table: PrivacyTable): PriorityItem | null {
  const privacy = table.privacy;
  let score = 0;
  let reason = "";
  let risk = "";
  let action = "";

  if (privacy.possible_personal_data && !hasFormalClassification(privacy)) {
    score += 50;
    reason ||= "Possível dado pessoal ainda sem classificação formal.";
    risk ||= "O ativo pode conter informação pessoal sem decisão explícita de governança.";
    action ||= "Confirmar sensibilidade, base legal e escopo de acesso.";
  }
  if (privacy.possible_personal_data && isWideAccess(privacy.access_scope)) {
    score += 35;
    reason ||= "Sinal automático de privacidade combinado com acesso amplo.";
    risk ||= "Usuários autenticados podem visualizar um ativo que ainda não foi revisado formalmente.";
    action ||= "Revisar a política e restringir o acesso se necessário.";
  }
  if (privacy.has_sensitive_personal_data && isWideAccess(privacy.access_scope)) {
    score += 45;
    reason ||= "Dado sensível confirmado com acesso mais amplo do que o ideal.";
    risk ||= "Exposição acima do necessário para um ativo sensível.";
    action ||= "Restringir o acesso a perfis autorizados.";
  }
  if (needsLegalBasis(privacy) && !privacy.legal_basis) {
    score += 30;
    reason ||= "Ativo com dado pessoal sem base legal LGPD registrada.";
    risk ||= "Falta de contexto jurídico para o tratamento do dado.";
    action ||= "Informar a base legal e registrar a justificativa da decisão.";
  }
  if (!table.owner) {
    score += 20;
    reason ||= "Ativo sem owner para confirmar classificação e acesso.";
    risk ||= "A ausência de responsável dificulta revisão, aceite de risco e revalidação.";
    action ||= "Definir owner antes de ampliar consumo.";
  }
  if (!privacy.privacy_reviewed_at) {
    score += 10;
    reason ||= "Política sem revisão registrada.";
    risk ||= "Sem rastreio claro de quem revisou a política atual.";
    action ||= "Registrar revisão com observações.";
  }

  if (score === 0) return null;
  return { table, score, reason, risk, action };
}

export function matchesQuickFilter(item: PrivacyTable, quickFilter: QuickFilterKey): boolean {
  const privacy = item.privacy;
  switch (quickFilter) {
    case "all":
      return true;
    case "possible_personal_data":
      return Boolean(privacy.possible_personal_data);
    case "not_classified":
      return !privacy.sensitivity_level;
    case "personal_confirmed":
      return Boolean(privacy.has_personal_data);
    case "sensitive":
      return Boolean(privacy.has_sensitive_personal_data);
    case "restricted":
      return isRestrictedAccess(privacy.access_scope);
    case "wide_access":
      return isWideAccess(privacy.access_scope);
    case "without_legal_basis":
      return needsLegalBasis(privacy) && !privacy.legal_basis;
    case "without_owner":
      return !item.owner;
    case "without_review":
      return !privacy.privacy_reviewed_at;
    case "high_risk":
      return Boolean(
        (privacy.possible_personal_data && isWideAccess(privacy.access_scope)) ||
          (privacy.has_sensitive_personal_data && isWideAccess(privacy.access_scope)) ||
          (needsLegalBasis(privacy) && !privacy.legal_basis),
      );
    default:
      return true;
  }
}

export function isPrivacyHistoryEvent(event: AuditHistoryEvent): boolean {
  const source = event.source_module || "";
  const action = event.action || "";
  const field = event.field_name || "";
  return (
    source === "privacy_access" ||
    source === "privacy-access" ||
    action === "table.privacy.patch" ||
    action === "table.privacy.review" ||
    [
      "classification",
      "has_personal_data",
      "has_sensitive_personal_data",
      "legal_basis",
      "privacy_purpose",
      "retention_policy",
      "access_scope",
      "access_roles",
      "privacy_notes",
      "privacy_reviewed_at",
      "is_masked",
      "external_sharing",
    ].includes(field)
  );
}

export function mapAuditHistoryEvent(event: AuditHistoryEvent): PrivacyHistoryEntry {
  const fieldName = event.field_name || null;
  return {
    id: `audit-${event.id}`,
    changed_at: event.changed_at,
    actor_name: event.actor_name,
    actor_email: event.actor_email,
    change_type: event.change_type,
    field_name: fieldName,
    field_names: fieldName ? [fieldName] : [],
    before_value: event.before_value,
    after_value: event.after_value,
    changed_fields: fieldName
      ? [
          {
            field: fieldName,
            previous: event.before_value,
            new: event.after_value,
          },
        ]
      : [],
    notes: null,
    risk_before: null,
    risk_after: null,
    next_review_at: null,
    source_label: historySourceLabel(event),
    source_kind: "audit",
    review_type: null,
  };
}

export function mapDedicatedHistoryEvent(event: PrivacyReviewEvent): PrivacyHistoryEntry {
  const firstField = event.changed_fields[0]?.field || null;
  return {
    id: `dedicated-${event.id}`,
    changed_at: event.created_at,
    actor_name: event.reviewer_name,
    actor_email: event.reviewer_email,
    change_type: event.review_type,
    field_name: firstField,
    field_names: event.changed_fields.map((item) => item.field),
    before_value: event.changed_fields.length === 1 ? event.changed_fields[0].previous : null,
    after_value: event.changed_fields.length === 1 ? event.changed_fields[0].new : null,
    changed_fields: event.changed_fields,
    notes: event.notes,
    risk_before: event.risk_before,
    risk_after: event.risk_after,
    next_review_at: event.next_review_at,
    source_label: "Histórico dedicado de privacidade",
    source_kind: "dedicated",
    review_type: event.review_type,
  };
}

export function latestScheduledReviewFromHistory(history: PrivacyHistoryEntry[]): string | null {
  for (const event of history) {
    if (event.source_kind === "dedicated" && event.next_review_at) {
      return event.next_review_at;
    }
  }
  return null;
}

export function privacyHistoryFieldLabel(field: string | null): string {
  const labels: Record<string, string> = {
    classification: "Sensibilidade",
    has_personal_data: "Dado pessoal",
    has_sensitive_personal_data: "Dado sensível",
    legal_basis: "Base legal",
    privacy_purpose: "Finalidade",
    retention_policy: "Retenção",
    access_scope: "Escopo de acesso",
    access_roles: "Roles de acesso",
    privacy_notes: "Observações",
    privacy_reviewed_at: "Revisão",
    is_masked: "Mascaramento",
    external_sharing: "Compartilhamento externo",
  };
  if (!field) return "Campo";
  return labels[field] || field.replaceAll("_", " ");
}

export function privacyHistoryCategory(field: string | null): HistoryCategoryKey {
  switch (field) {
    case "classification":
      return "sensitivity";
    case "has_personal_data":
      return "personal_data";
    case "has_sensitive_personal_data":
      return "sensitive_data";
    case "legal_basis":
      return "legal_basis";
    case "privacy_purpose":
      return "purpose";
    case "retention_policy":
      return "retention";
    case "access_scope":
      return "access";
    case "access_roles":
      return "roles";
    case "is_masked":
      return "masking";
    case "external_sharing":
      return "external_sharing";
    case "privacy_reviewed_at":
      return "review";
    case "privacy_notes":
      return "notes";
    default:
      return "all";
  }
}

export function formatHistoryValue(value: unknown): string {
  if (value == null || value === "") return "Não informado";
  if (typeof value === "boolean") return value ? "Sim" : "Não";
  if (Array.isArray(value)) return value.length ? value.join(", ") : "Nenhum";
  if (typeof value === "object") return JSON.stringify(value);
  return String(value);
}

export function historyActorLabel(event: PrivacyHistoryEntry): string {
  return event.actor_name || event.actor_email || "Sistema";
}

export function historySourceLabel(event: AuditHistoryEvent): string {
  if (event.source_module === "privacy_access" || event.source_module === "privacy-access") {
    return "Auditoria geral do catálogo · Privacidade & Acesso";
  }
  if (event.source_module) {
    return `Auditoria geral do catálogo · ${event.source_module}`;
  }
  return "Auditoria geral do catálogo";
}

export function classifyHistoryImpact(event: PrivacyHistoryEntry): HistoryImpact {
  if (event.source_kind === "dedicated" && event.review_type === "periodic_review") {
    return {
      tone: "success",
      label: "Revisão registrada",
      description: "A política foi revisada sem alteração de classificação, base legal, finalidade ou acesso.",
      direction: "review",
    };
  }
  if (event.source_kind === "dedicated" && event.risk_before && event.risk_after) {
    const order = { unknown: 0, low: 1, medium: 2, high: 3, critical: 4 };
    const beforeRank = order[event.risk_before as keyof typeof order] ?? 0;
    const afterRank = order[event.risk_after as keyof typeof order] ?? 0;
    if (afterRank > beforeRank) {
      return {
        tone: "danger",
        label: "Aumentou risco",
        description: "A revisão dedicada indica um nível de risco mais alto após a mudança registrada.",
        direction: "up",
      };
    }
    if (afterRank < beforeRank) {
      return {
        tone: "success",
        label: "Reduziu risco",
        description: "A revisão dedicada reduziu o risco registrado para esta política de privacidade.",
        direction: "down",
      };
    }
  }
  const field = event.field_name || "";
  const before = event.before_value;
  const after = event.after_value;
  const beforeText = String(before ?? "");
  const afterText = String(after ?? "");
  const beforeTruthy = Boolean(before);
  const afterTruthy = Boolean(after);

  if (field === "has_sensitive_personal_data" && afterTruthy && !beforeTruthy) {
    return {
      tone: "danger",
      label: "Aumentou risco",
      description: "A alteração confirmou dado sensível e pede revisão reforçada de base legal, finalidade e acesso.",
      direction: "up",
    };
  }
  if (field === "has_personal_data" && afterTruthy && !beforeTruthy) {
    return {
      tone: "warning",
      label: "Requer atenção",
      description: "A alteração confirmou dado pessoal e pode exigir base legal, finalidade e revisão de acesso.",
      direction: "attention",
    };
  }
  if (field === "legal_basis" && beforeTruthy && !afterTruthy) {
    return {
      tone: "danger",
      label: "Aumentou risco",
      description: "A base legal foi removida, o que reduz a sustentação regulatória do tratamento.",
      direction: "up",
    };
  }
  if (field === "privacy_purpose" && beforeTruthy && !afterTruthy) {
    return {
      tone: "danger",
      label: "Aumentou risco",
      description: "A finalidade foi removida e o uso do dado perde contexto estruturado de tratamento.",
      direction: "up",
    };
  }
  if (field === "is_masked" && beforeTruthy && !afterTruthy) {
    return {
      tone: "danger",
      label: "Aumentou risco",
      description: "O mascaramento foi desativado, aumentando a exposição potencial do ativo.",
      direction: "up",
    };
  }
  if (field === "external_sharing" && !beforeTruthy && afterTruthy) {
    return {
      tone: "danger",
      label: "Aumentou risco",
      description: "O compartilhamento externo foi ativado e exige atenção adicional sobre exposição e justificativa.",
      direction: "up",
    };
  }
  if (field === "access_scope" && /authenticated|public/i.test(afterText) && !/authenticated|public/i.test(beforeText)) {
    return {
      tone: "danger",
      label: "Aumentou risco",
      description: "O acesso ficou mais amplo do que antes e pode ampliar exposição do ativo no catálogo.",
      direction: "up",
    };
  }
  if (field === "privacy_reviewed_at" && afterTruthy) {
    return {
      tone: "success",
      label: "Revisão registrada",
      description: "A política teve uma revisão formal registrada na trilha de auditoria.",
      direction: "review",
    };
  }
  if (field === "access_scope" && /restricted|confidential|personal_data/i.test(afterText) && !/restricted|confidential|personal_data/i.test(beforeText)) {
    return {
      tone: "success",
      label: "Reduziu risco",
      description: "O acesso ficou mais restrito, reduzindo a exposição operacional do ativo.",
      direction: "down",
    };
  }
  if (field === "legal_basis" && !beforeTruthy && afterTruthy) {
    return {
      tone: "success",
      label: "Reduziu risco",
      description: "A base legal foi preenchida e o tratamento agora está melhor contextualizado.",
      direction: "down",
    };
  }
  if (field === "privacy_purpose" && !beforeTruthy && afterTruthy) {
    return {
      tone: "success",
      label: "Reduziu risco",
      description: "A finalidade foi estruturada e o uso do dado ficou mais delimitado.",
      direction: "down",
    };
  }
  if (field === "is_masked" && !beforeTruthy && afterTruthy) {
    return {
      tone: "success",
      label: "Reduziu risco",
      description: "O mascaramento foi ativado para reduzir a exposição do ativo.",
      direction: "down",
    };
  }
  if (field === "access_roles" || field === "retention_policy" || field === "privacy_notes") {
    return {
      tone: "warning",
      label: "Requer atenção",
      description: "A alteração muda contexto operacional da política e merece validação do responsável.",
      direction: "attention",
    };
  }
  return {
    tone: "neutral",
    label: "Alteração informativa",
    description: "A mudança foi registrada na auditoria, mas não indica sozinha aumento ou redução clara de risco.",
    direction: "info",
  };
}
