import { useEffect, useMemo, useState } from "react";
import { BookMarked, Database, Eye, Sparkles, SlidersHorizontal } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import { GovernancePlaybooksConsole } from "@/features/governance/playbooks/playbooks-console";
import type { PlatformIntegrationSyncJob, PlatformLegacyApiSurface } from "@/features/platform/types";
import { useAuth } from "@/lib/auth";
import { apiRequest, downloadApiFile, getExportJobStatus } from "@/lib/client-api";
import { normalizePageItems, type PageResponse } from "@/lib/pagination";

type GovernanceSettings = {
  owner_review_interval_days: number;
  privacy_review_interval_days: number;
  sensitive_privacy_review_interval_days: number;
  certification_review_interval_days: number;
  certification_review_sla_days: number;
  certification_revalidation_window_days: number;
  audit_log_retention_days: number;
  audit_log_archive_retention_days: number;
  access_log_retention_days: number;
  access_log_archive_retention_days: number;
  platform_usage_event_retention_days: number;
  search_result_click_retention_days: number;
  legacy_api_cutoff_window_days: number;
  legacy_api_disabled_modules: string[];
  legacy_api_force_enabled_modules: string[];
  stewardship_assignment_rules: Array<{
    key: string;
    request_type: string;
    domain_name?: string | null;
    owner_area?: string | null;
    approver_user_id: number;
    approver_name?: string | null;
    approver_email?: string | null;
    priority: number;
    is_active: boolean;
  }>;
  governance_notifications_enabled: boolean;
  governance_notification_repeat_days: number;
  governance_notification_critical_repeat_hours: number;
  pipeline_failure_owner_sla_hours: number;
  operational_high_volume_threshold_rows: number;
  governance_high_usage_click_threshold: number;
    governance_policy_rules: Array<{
      key: string;
      name: string;
      description?: string | null;
    trigger_key: string;
    scope: string;
    domain_name?: string | null;
    datasource_name?: string | null;
    criticality?: string | null;
    sensitivity_level?: string | null;
    min_trust_score?: number | null;
    min_risk_score?: number | null;
    min_search_clicks?: number | null;
    severity: string;
    impact: string;
    sla_days?: number | null;
    action_key: string;
    action_label: string;
    recommendation_title: string;
    recommendation_detail: string;
    auto_create_recommendation: boolean;
      requires_owner: boolean;
      requires_classification: boolean;
      requires_dictionary: boolean;
      requires_active_dq: boolean;
      requires_sla: boolean;
      priority: number;
      is_active: boolean;
    }>;
  dq_operational_failure_penalty_points: number;
  dq_operational_stale_penalty_points: number;
  dq_operational_recurrent_penalty_points: number;
  airflow_ui_base_url: string | null;
  governance_score_weights: {
    owner_defined: number;
    table_description_complete: number;
    column_description_complete: number;
    tags_applied: number;
    glossary_terms: number;
    dq_score: number;
    certification: number;
    incident_health: number;
    owner_review: number;
    privacy_review: number;
    certification_review: number;
  };
  trust_score_domain_adjustments: Record<string, number>;
  trust_score_criticality_adjustments: Record<string, number>;
  updated_at?: string | null;
};

type GovernanceNotificationSummary = {
  generated_at: string;
  enabled: boolean;
  repeat_days: number;
  critical_repeat_hours: number;
  active_total: number;
  due_now_total: number;
  critical_total: number;
  review_total: number;
  operational_total: number;
  quality_total: number;
  incident_total: number;
};

type RetentionSummaryItem = {
  table_name: string;
  hot_rows: number;
  archived_rows: number;
  eligible_for_archive: number;
  eligible_for_purge: number;
  last_archived_count: number;
  last_purged_count: number;
  estimated_rows_per_day: number;
  projected_rows_30d: number;
  projected_hot_rows_at_retention: number;
  estimated_storage_mb?: number | null;
  projected_storage_mb_30d?: number | null;
  pressure_level: string;
  hot_retention_days?: number | null;
  archive_retention_days?: number | null;
};

type RetentionSummary = {
  generated_at: string;
  items: RetentionSummaryItem[];
};

type VisibilityRule = {
  id: number;
  entity_type: string;
  entity_id: number | null;
  rule_scope: string;
  match_value?: string | null;
  allowed_role?: string | null;
  allowed_user_id?: number | null;
  visibility_scope: string;
  mask_sensitive_fields: boolean;
  reason?: string | null;
  is_active: boolean;
  created_at?: string | null;
};

type VisibilityRuleForm = {
  entity_type: string;
  entity_id: string;
  rule_scope: string;
  match_value: string;
  allowed_role: string;
  allowed_user_id: string;
  visibility_scope: string;
  mask_sensitive_fields: boolean;
  reason: string;
};

type AdminUserOption = {
  id: number;
  email: string;
  name?: string | null;
  full_name?: string | null;
  is_active: boolean;
};

type SectionKey = "policies" | "playbooks" | "retention" | "compatibility" | "visibility";

const stewardshipRequestTypeOptions = [
  { value: "any", label: "Qualquer solicitação" },
  { value: "table_description", label: "Descrição da tabela" },
  { value: "owner_assignment", label: "Definição de owner" },
  { value: "glossary_terms", label: "Associação de termos" },
  { value: "certification_review", label: "Revisão de certificação" },
  { value: "owner_review", label: "Revisão de owner" },
  { value: "privacy_review", label: "Revisão de privacidade" },
];

const sections: Array<{
  key: SectionKey;
  title: string;
  description: string;
  icon: typeof SlidersHorizontal;
}> = [
  {
    key: "policies",
    title: "Políticas e SLA",
    description: "Prazos de revisão, certificação e governança contínua.",
    icon: SlidersHorizontal,
  },
  {
    key: "playbooks",
    title: "Playbooks",
    description: "Recomendações operacionais derivadas das políticas ativas.",
    icon: Sparkles,
  },
  {
    key: "retention",
    title: "Retenção e histórico frio",
    description: "Volume quente, archive e export operacional de trilhas.",
    icon: Database,
  },
  {
    key: "compatibility",
    title: "Compatibilidade e legado",
    description: "Controle do corte da API legada por janela e exceção.",
    icon: BookMarked,
  },
  {
    key: "visibility",
    title: "Visibilidade e masking",
    description: "Regras finas para acesso e mascaramento transversal.",
    icon: Eye,
  },
];

function SettingField({
  label,
  hint,
  value,
  onChange,
  unit,
  disabled = false,
}: {
  label: string;
  hint: string;
  value: number;
  onChange: (value: string) => void;
  unit?: string;
  disabled?: boolean;
}) {
  return (
    <label className="space-y-2">
      <span className="text-sm font-medium text-text-body">{label}</span>
      <p className="text-xs leading-5 text-muted">{hint}</p>
      <div className="relative">
        <Input
          className={unit ? "pr-16" : undefined}
          disabled={disabled}
          type="number"
          value={value}
          onChange={(e) => onChange(e.target.value)}
        />
        {unit ? (
          <span className="pointer-events-none absolute inset-y-0 right-3 flex items-center text-xs font-medium text-muted">
            {unit}
          </span>
        ) : null}
      </div>
    </label>
  );
}

function TextField({
  label,
  hint,
  value,
  onChange,
  placeholder,
  disabled = false,
}: {
  label: string;
  hint: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  disabled?: boolean;
}) {
  return (
    <label className="space-y-2">
      <span className="text-sm font-medium text-text-body">{label}</span>
      <p className="text-xs leading-5 text-muted">{hint}</p>
      <Input disabled={disabled} placeholder={placeholder} type="text" value={value} onChange={(e) => onChange(e.target.value)} />
    </label>
  );
}

function ScoreWeightField({
  label,
  hint,
  value,
  onChange,
  disabled = false,
}: {
  label: string;
  hint?: string;
  value: number;
  onChange: (value: string) => void;
  disabled?: boolean;
}) {
  return (
    <label className="space-y-2">
      <span className="text-sm font-medium text-text-body">{label}</span>
      {hint ? <p className="text-xs leading-5 text-muted">{hint}</p> : null}
      <div className="relative">
        <Input className="pr-10" disabled={disabled} min={0} max={100} type="number" value={value} onChange={(e) => onChange(e.target.value)} />
        <span className="pointer-events-none absolute inset-y-0 right-3 flex items-center text-xs font-medium text-muted">pts</span>
      </div>
    </label>
  );
}

function formatNumber(value: number) {
  return new Intl.NumberFormat("pt-BR").format(value);
}

function formatDateTime(value?: string | null) {
  if (!value) return "Sem uso auditado";
  return new Date(value).toLocaleString("pt-BR");
}

function formatAdjustmentJson(value: Record<string, number> | null | undefined) {
  return JSON.stringify(value || {}, null, 2);
}

function parseAdjustmentJson(value: string) {
  const normalized = value.trim();
  if (!normalized) return {};
  const parsed = JSON.parse(normalized);
  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
    throw new Error("O ajuste de trust precisa ser um objeto JSON.");
  }
  return Object.fromEntries(
    Object.entries(parsed as Record<string, unknown>).map(([key, item]) => [key.trim().toLowerCase(), Number(item) || 0]),
  );
}

function formatPolicyRulesJson(value: GovernanceSettings["governance_policy_rules"] | null | undefined) {
  return JSON.stringify(value || [], null, 2);
}

function parsePolicyRulesJson(value: string) {
  const normalized = value.trim();
  if (!normalized) return [];
  const parsed = JSON.parse(normalized);
  if (!Array.isArray(parsed)) {
    throw new Error("As políticas de governança precisam ser uma lista JSON.");
  }
  return parsed.map((item) => {
    if (!item || typeof item !== "object" || Array.isArray(item)) {
      throw new Error("Cada política precisa ser um objeto JSON válido.");
    }
    return item as Record<string, unknown>;
  });
}

function legacyStatusLabel(status: string) {
  const labels: Record<string, string> = {
    active_transition: "Em transição",
    eligible_for_cutoff: "Elegível para 410",
    awaiting_observation: "Em observação",
    blocked: "Bloqueado em /api",
    forced_enabled: "Mantido por exceção",
    removed: "Removido fisicamente",
  };
  return labels[status] || status;
}

function legacyStatusClassName(status: string) {
  if (status === "blocked") return "border-danger-200 bg-danger-50 text-danger-700";
  if (status === "removed") return "border-border-strong bg-bg-subtle text-text-body";
  if (status === "eligible_for_cutoff") return "border-warning-200 bg-warning-50 text-warning-700";
  if (status === "forced_enabled") return "border-info-200 bg-info-50 text-info-700";
  if (status === "active_transition") return "border-success-200 bg-success-50 text-success-700";
  return "border-border bg-bg-subtle text-text-body";
}

export default function AdminGovernancePage() {
  const auth = useAuth();
  const canView = auth.canAccessPath("/admin/governance");
  const canEdit = auth.canAction("write", "configuration");
  const canExportAuditArchives = auth.hasPermission("audit:export");
  const [settings, setSettings] = useState<GovernanceSettings | null>(null);
  const [form, setForm] = useState<GovernanceSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [activeSection, setActiveSection] = useState<SectionKey>("policies");
  const [visibilityRules, setVisibilityRules] = useState<VisibilityRule[]>([]);
  const [adminUsers, setAdminUsers] = useState<AdminUserOption[]>([]);
  const [visibilityLoading, setVisibilityLoading] = useState(true);
  const [visibilitySaving, setVisibilitySaving] = useState(false);
  const [legacyApiSurface, setLegacyApiSurface] = useState<PlatformLegacyApiSurface | null>(null);
  const [legacyApiSurfaceLoading, setLegacyApiSurfaceLoading] = useState(true);
  const [notificationSummary, setNotificationSummary] = useState<GovernanceNotificationSummary | null>(null);
  const [auditExportJob, setAuditExportJob] = useState<PlatformIntegrationSyncJob | null>(null);
  const [trustDomainAdjustmentsText, setTrustDomainAdjustmentsText] = useState("{}");
  const [trustCriticalityAdjustmentsText, setTrustCriticalityAdjustmentsText] = useState("{}");
  const [policyRulesText, setPolicyRulesText] = useState("[]");
  const [visibilityForm, setVisibilityForm] = useState<VisibilityRuleForm>({
    entity_type: "table",
    entity_id: "",
    rule_scope: "asset",
    match_value: "",
    allowed_role: "",
    allowed_user_id: "",
    visibility_scope: "full",
    mask_sensitive_fields: false,
    reason: "",
  });
  const [retentionSummary, setRetentionSummary] = useState<RetentionSummary | null>(null);

  useEffect(() => {
    if (!canView) return;
    void (async () => {
      setLoading(true);
      try {
        const data = await apiRequest<GovernanceSettings>("/v1/admin/governance-settings");
        setSettings(data);
        setForm(data);
        const retention = await apiRequest<RetentionSummary>("/v1/admin/governance-retention-summary");
        setRetentionSummary(retention);
        const legacySurface = await apiRequest<PlatformLegacyApiSurface>("/v1/platform/legacy-api/surface");
        setLegacyApiSurface(legacySurface);
        const notifications = await apiRequest<GovernanceNotificationSummary>("/v1/governance/notifications/summary");
        setNotificationSummary(notifications);
        if (canEdit) {
          const users = await apiRequest<AdminUserOption[] | PageResponse<AdminUserOption>>("/v1/admin/users");
          setAdminUsers(normalizePageItems(users).filter((item) => item.is_active));
        } else {
          setAdminUsers([]);
        }
      } catch (error) {
        setMessage((error as Error).message);
      } finally {
        setLoading(false);
        setLegacyApiSurfaceLoading(false);
      }
    })();
  }, [canEdit, canView]);

  useEffect(() => {
    if (!canView) return;
    void (async () => {
      setVisibilityLoading(true);
      try {
        const data = await apiRequest<VisibilityRule[]>("/v1/platform/visibility/rules");
        setVisibilityRules(data);
      } catch (error) {
        setMessage((error as Error).message);
      } finally {
        setVisibilityLoading(false);
      }
    })();
  }, [canView]);

  useEffect(() => {
    if (!form) return;
    setTrustDomainAdjustmentsText(formatAdjustmentJson(form.trust_score_domain_adjustments));
    setTrustCriticalityAdjustmentsText(formatAdjustmentJson(form.trust_score_criticality_adjustments));
    setPolicyRulesText(formatPolicyRulesJson(form.governance_policy_rules));
  }, [form]);

  useEffect(() => {
    const publicId = auditExportJob?.artifact_public_id;
    if (!publicId || !["queued", "running"].includes((auditExportJob?.status || "").toLowerCase())) {
      return;
    }
    let cancelled = false;
    const interval = window.setInterval(() => {
      void (async () => {
        try {
          const payload = await getExportJobStatus(publicId);
          if (cancelled) return;
          const job = payload as PlatformIntegrationSyncJob;
          setAuditExportJob(job);
          if (job.status === "success" && job.export_download_href) {
            window.clearInterval(interval);
          } else if (job.status === "failed") {
            window.clearInterval(interval);
            setMessage(job.error || "A exportação falhou.");
          }
        } catch {
          // keep polling
        }
      })();
    }, 3000);
    return () => {
      cancelled = true;
      window.clearInterval(interval);
    };
  }, [auditExportJob?.artifact_public_id, auditExportJob?.status]);

  const summaryCards = useMemo(() => {
    if (!form) return [];
    return [
      { label: "Revisão de owner", value: `${form.owner_review_interval_days} dias` },
      { label: "SLA de certificação", value: `${form.certification_review_sla_days} dias` },
      { label: "SLA da falha de pipeline", value: `${form.pipeline_failure_owner_sla_hours} horas` },
      {
        label: "Reenvio padrão",
        value: form.governance_notifications_enabled
          ? `${form.governance_notification_repeat_days} dias`
          : "Notificações pausadas",
      },
      { label: "Threshold de alto consumo", value: `${formatNumber(form.operational_high_volume_threshold_rows)} linhas` },
      { label: "Threshold de uso alto", value: `${formatNumber(form.governance_high_usage_click_threshold)} cliques` },
      { label: "Regras de aprovação", value: `${form.stewardship_assignment_rules.length} ativa(s)` },
      {
        label: "Penalidade máxima de DQ",
        value: `${form.dq_operational_failure_penalty_points + form.dq_operational_stale_penalty_points + form.dq_operational_recurrent_penalty_points} pts`,
      },
      { label: "Corte do legado", value: `${form.legacy_api_cutoff_window_days} dias` },
      { label: "Airflow UI", value: form.airflow_ui_base_url?.trim() ? "Configurada" : "Não configurada" },
    ];
  }, [form]);

  function updateField(key: keyof GovernanceSettings, value: string) {
    setForm((current) => (current ? { ...current, [key]: Number(value) || 0 } : current));
  }

  function updateBooleanField(key: keyof GovernanceSettings, value: boolean) {
    setForm((current) => (current ? { ...current, [key]: value } : current));
  }

  function updateTextField(key: keyof GovernanceSettings, value: string) {
    setForm((current) => (current ? { ...current, [key]: value } : current));
  }

  function updateScoreWeight(
    key: keyof GovernanceSettings["governance_score_weights"],
    value: string,
  ) {
    setForm((current) =>
      current
        ? {
            ...current,
            governance_score_weights: {
              ...current.governance_score_weights,
              [key]: Math.max(Number(value) || 0, 0),
            },
          }
        : current,
    );
  }

  function addStewardshipRule() {
    setForm((current) =>
      current
        ? {
            ...current,
            stewardship_assignment_rules: [
              ...current.stewardship_assignment_rules,
              {
                key: `rule-${Date.now()}`,
                request_type: "any",
                domain_name: "",
                owner_area: "",
                approver_user_id: adminUsers[0]?.id ?? 1,
                approver_name: adminUsers[0]?.name || adminUsers[0]?.full_name || null,
                approver_email: adminUsers[0]?.email || null,
                priority: current.stewardship_assignment_rules.length + 1,
                is_active: true,
              },
            ],
          }
        : current,
    );
  }

  function updateStewardshipRule(index: number, patch: Partial<GovernanceSettings["stewardship_assignment_rules"][number]>) {
    setForm((current) => {
      if (!current) return current;
      return {
        ...current,
        stewardship_assignment_rules: current.stewardship_assignment_rules.map((rule, ruleIndex) => {
          if (ruleIndex !== index) return rule;
          const next = { ...rule, ...patch };
          const selectedUser = adminUsers.find((item) => item.id === next.approver_user_id);
          return {
            ...next,
            approver_name: selectedUser?.name || selectedUser?.full_name || next.approver_name || null,
            approver_email: selectedUser?.email || next.approver_email || null,
          };
        }),
      };
    });
  }

  function removeStewardshipRule(index: number) {
    setForm((current) =>
      current
        ? {
            ...current,
            stewardship_assignment_rules: current.stewardship_assignment_rules.filter((_, ruleIndex) => ruleIndex !== index),
          }
        : current,
    );
  }

  async function save() {
    if (!form) return;
    setSaving(true);
    try {
      const trustScoreDomainAdjustments = parseAdjustmentJson(trustDomainAdjustmentsText);
      const trustScoreCriticalityAdjustments = parseAdjustmentJson(trustCriticalityAdjustmentsText);
      const governancePolicyRules = parsePolicyRulesJson(policyRulesText);
      const data = await apiRequest<GovernanceSettings>("/v1/admin/governance-settings", {
        method: "PUT",
        body: JSON.stringify({
          ...form,
          trust_score_domain_adjustments: trustScoreDomainAdjustments,
          trust_score_criticality_adjustments: trustScoreCriticalityAdjustments,
          governance_policy_rules: governancePolicyRules,
        }),
      });
      const notifications = await apiRequest<GovernanceNotificationSummary>("/v1/governance/notifications/summary");
      setSettings(data);
      setForm(data);
      setNotificationSummary(notifications);
      setMessage("Parâmetros de governança atualizados com sucesso.");
    } catch (error) {
      setMessage((error as Error).message);
    } finally {
      setSaving(false);
    }
  }

  async function triggerAuditExport(
    href: string,
    filename: string,
    confirmMessage: string,
  ) {
    const result = await downloadApiFile(href, filename, undefined, { confirmMessage });
    if (result.kind === "queued") {
      setAuditExportJob(result.job as PlatformIntegrationSyncJob);
      setMessage("Exportação em processamento. O download será disponibilizado quando o job concluir.");
    }
  }

  async function createVisibilityRule() {
    if (visibilityForm.rule_scope === "asset" && !visibilityForm.entity_id.trim()) {
      setMessage("Informe o ID do ativo para criar a regra de visibilidade.");
      return;
    }
    if (visibilityForm.rule_scope !== "asset" && !visibilityForm.match_value.trim()) {
      setMessage("Informe o valor de domínio ou classificação da regra.");
      return;
    }
    setVisibilitySaving(true);
    try {
      const created = await apiRequest<VisibilityRule>("/v1/platform/visibility/rules", {
        method: "POST",
        body: JSON.stringify({
          entity_type: visibilityForm.entity_type,
          entity_id: visibilityForm.entity_id.trim() ? Number(visibilityForm.entity_id) : null,
          rule_scope: visibilityForm.rule_scope,
          match_value: visibilityForm.match_value.trim() || null,
          allowed_role: visibilityForm.allowed_role.trim() || null,
          allowed_user_id: visibilityForm.allowed_user_id.trim() ? Number(visibilityForm.allowed_user_id) : null,
          visibility_scope: visibilityForm.visibility_scope.trim() || "full",
          mask_sensitive_fields: visibilityForm.mask_sensitive_fields,
          reason: visibilityForm.reason.trim() || null,
          is_active: true,
        }),
      });
      setVisibilityRules((current) => [created, ...current]);
      setVisibilityForm({
        entity_type: "table",
        entity_id: "",
        rule_scope: "asset",
        match_value: "",
        allowed_role: "",
        allowed_user_id: "",
        visibility_scope: "full",
        mask_sensitive_fields: false,
        reason: "",
      });
      setMessage("Regra de visibilidade criada com sucesso.");
    } catch (error) {
      setMessage((error as Error).message);
    } finally {
      setVisibilitySaving(false);
    }
  }

  async function deleteVisibilityRule(ruleId: number) {
    try {
      await apiRequest(`/v1/platform/visibility/rules/${ruleId}`, { method: "DELETE" });
      setVisibilityRules((current) => current.filter((rule) => rule.id !== ruleId));
      setMessage("Regra de visibilidade removida.");
    } catch (error) {
      setMessage((error as Error).message);
    }
  }

  if (!canView) {
    return <EmptyState title="403" description="Você não possui acesso a esta área." />;
  }

  return (
    <div className="space-y-6 pb-6">
      <Card className="border-border bg-[linear-gradient(135deg,#ffffff_0%,#f8fafc_55%,#eef6ff_100%)] shadow-[0_18px_48px_rgba(15,23,42,0.06)]">
        <CardContent className="space-y-4 p-6">
          <div className="space-y-3">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-brand-600">Configuração</p>
            <h2 className="text-3xl font-semibold tracking-tight text-text">Parâmetros operacionais da governança</h2>
            <p className="max-w-4xl text-sm leading-7 text-text-body">
              Separamos esta área em subáreas para reduzir ruído e deixar mais claro o que é política, retenção,
              compatibilidade e visibilidade. A ideia é manter uma jornada administrativa objetiva e segura.
            </p>
            {!canEdit ? (
              <div className="rounded-2xl border border-border bg-bg-subtle px-4 py-3 text-sm text-text-body">
                Seu perfil possui acesso somente leitura nesta área. Os conteúdos continuam visíveis, mas ações de edição e salvamento ficam reservadas ao administrador.
              </div>
            ) : null}
          </div>
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-5">
            {sections.map((section) => {
              const Icon = section.icon;
              return (
                <button
                  className={`rounded-2xl border p-4 text-left transition ${
                    activeSection === section.key
                      ? "border-info-200 bg-info-50 text-info-700"
                      : "border-border bg-surface text-text hover:border-border-strong"
                  }`}
                  key={section.key}
                  onClick={() => setActiveSection(section.key)}
                  type="button"
                >
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-bg-subtle text-text-body">
                      <Icon className="h-5 w-5" />
                    </div>
                    <div>
                      <p className="font-semibold">{section.title}</p>
                      <p className="mt-1 text-xs leading-5 text-text-body">{section.description}</p>
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
            {summaryCards.map((card) => (
              <div className="rounded-2xl border border-border bg-surface p-4" key={card.label}>
                <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-brand-600">{card.label}</p>
                <p className="mt-2 text-lg font-semibold text-text">{card.value}</p>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {loading ? <Skeleton className="h-[420px] w-full" /> : null}

      {!loading && form ? (
        <>
          {activeSection === "policies" ? (
            <Card className="border-border bg-surface shadow-[0_12px_36px_rgba(15,23,42,0.05)]">
              <CardContent className="space-y-5 p-6">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-brand-600">Políticas e SLA</p>
                  <h3 className="mt-2 text-2xl font-semibold tracking-tight text-text">Revisão contínua e certificação</h3>
                </div>
                <fieldset disabled={!canEdit} className="space-y-5">
                <div className="grid gap-5 md:grid-cols-2">
                  <SettingField label="Revisão de owner" hint="Quantidade de dias para exigir reconfirmação formal do responsável pelo ativo." value={form.owner_review_interval_days} unit="dias" onChange={(value) => updateField("owner_review_interval_days", value)} />
                  <SettingField label="Revisão de privacidade" hint="Intervalo padrão de revisão para ativos sem contexto sensível explícito." value={form.privacy_review_interval_days} unit="dias" onChange={(value) => updateField("privacy_review_interval_days", value)} />
                  <SettingField label="Privacidade sensível" hint="Janela mais curta para ativos sensíveis ou com dado pessoal." value={form.sensitive_privacy_review_interval_days} unit="dias" onChange={(value) => updateField("sensitive_privacy_review_interval_days", value)} />
                  <SettingField label="Revisão de certificação" hint="Quantos dias a certificação permanece válida antes de pedir nova revisão." value={form.certification_review_interval_days} unit="dias" onChange={(value) => updateField("certification_review_interval_days", value)} />
                  <SettingField label="SLA de decisão em revisão" hint="Prazo esperado para concluir a decisão enquanto o ativo está em revisão." value={form.certification_review_sla_days} unit="dias" onChange={(value) => updateField("certification_review_sla_days", value)} />
                  <SettingField label="Janela de revalidação assistida" hint="Margem adicional entre a revisão programada e o vencimento efetivo da certificação." value={form.certification_revalidation_window_days} unit="dias" onChange={(value) => updateField("certification_revalidation_window_days", value)} />
                  <SettingField label="SLA da falha de pipeline para owner" hint="Prazo em horas para atribuir e cobrar do owner a coordenação da falha operacional recorrente." value={form.pipeline_failure_owner_sla_hours} unit="horas" onChange={(value) => updateField("pipeline_failure_owner_sla_hours", value)} />
                  <SettingField label="Threshold de alto consumo" hint="Quantidade mínima de linhas processadas para destacar falha operacional com alto consumo em cockpit, dashboard e correlação." value={form.operational_high_volume_threshold_rows} unit="linhas" onChange={(value) => updateField("operational_high_volume_threshold_rows", value)} />
                  <SettingField label="Threshold de uso alto" hint="Quantidade mínima de cliques recentes para tratar o ativo como de alto uso na governança ativa." value={form.governance_high_usage_click_threshold} unit="cliques" onChange={(value) => updateField("governance_high_usage_click_threshold", value)} />
                  <div className="md:col-span-2">
                    <TextField
                      label="URL base da UI do Airflow"
                      hint="Se informada, a plataforma passa a gerar links profundos para DAGs e tasks a partir do contexto operacional."
                      placeholder="https://airflow.exemplo.com"
                      value={form.airflow_ui_base_url ?? ""}
                      onChange={(value) => updateTextField("airflow_ui_base_url", value)}
                    />
                  </div>
                </div>
                <div className="space-y-4 rounded-3xl border border-border bg-surface p-5">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-brand-600">Policy engine</p>
                      <h4 className="mt-2 text-lg font-semibold text-text">Regras por domínio, fonte e criticidade</h4>
                      <p className="mt-1 max-w-3xl text-sm leading-6 text-text-body">
                        Essas regras ativam recomendações automáticas e priorização por contexto. O formato JSON mantém
                        o motor auditável e explicável sem espalhar regra de negócio pelo frontend.
                      </p>
                    </div>
                    <div className="rounded-2xl border border-border bg-bg-subtle px-4 py-3 text-right">
                      <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-muted">Políticas ativas</p>
                      <p className="mt-1 text-lg font-semibold text-text">{form.governance_policy_rules.length}</p>
                    </div>
                  </div>
                  <label className="space-y-2">
                    <span className="text-sm font-medium text-text-body">Políticas de governança</span>
                    <p className="text-xs leading-5 text-muted">
                      Ex.: domínio financeiro exige owner e classificação; fonte crítica exige DQ mínima; domínio regulado
                      pode reduzir SLA.
                    </p>
                    <Textarea
                      disabled={!canEdit}
                      className="min-h-[240px] font-mono text-sm"
                      value={policyRulesText}
                      onChange={(event) => setPolicyRulesText(event.target.value)}
                    />
                  </label>
                </div>
                <div className="space-y-4 rounded-3xl border border-border bg-bg-subtle p-5">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-brand-600">Política operacional de DQ</p>
                      <h4 className="mt-2 text-lg font-semibold text-text">Penalidades configuráveis</h4>
                      <p className="mt-1 max-w-3xl text-sm leading-6 text-text-body">
                        A operação pode reduzir formalmente o score efetivo de DQ. Mantemos a política explícita para facilitar auditoria, alinhamento com governança e ajuste fino sem intervenção em código.
                      </p>
                    </div>
                    <div className="rounded-2xl border border-border bg-surface px-4 py-3 text-right">
                      <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-muted">Máximo configurado</p>
                      <p className="mt-1 text-lg font-semibold text-text">
                        {form.dq_operational_failure_penalty_points + form.dq_operational_stale_penalty_points + form.dq_operational_recurrent_penalty_points} pts
                      </p>
                    </div>
                  </div>
                  <div className="grid gap-5 md:grid-cols-3">
                    <SettingField label="Falha operacional ativa" hint="Penalidade aplicada quando o pipeline principal entra em falha ou carrega erro recente." value={form.dq_operational_failure_penalty_points} unit="pts" onChange={(value) => updateField("dq_operational_failure_penalty_points", value)} />
                    <SettingField label="Sem sucesso recente" hint="Penalidade aplicada quando a atualização recente fica estagnada além da janela operacional." value={form.dq_operational_stale_penalty_points} unit="pts" onChange={(value) => updateField("dq_operational_stale_penalty_points", value)} />
                    <SettingField label="Degradação recorrente" hint="Penalidade adicional quando a tendência recente mostra recorrência de falhas no pipeline." value={form.dq_operational_recurrent_penalty_points} unit="pts" onChange={(value) => updateField("dq_operational_recurrent_penalty_points", value)} />
                  </div>
                </div>
                <div className="space-y-4 rounded-3xl border border-border bg-surface p-5">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-brand-600">Notificações e revisão periódica</p>
                      <h4 className="mt-2 text-lg font-semibold text-text">Base proativa de governança</h4>
                      <p className="mt-1 max-w-3xl text-sm leading-6 text-text-body">
                        A fila automatizada reaproveita pendências reais, stewardship, DQ, incidentes e operação. Nesta fase,
                        o canal inicial é in-app e o scheduler apenas mantém deduplicação, aging e reenvio controlado.
                      </p>
                    </div>
                    {notificationSummary ? (
                      <div className="grid gap-3 sm:grid-cols-3">
                        <div className="rounded-2xl border border-border bg-bg-subtle px-4 py-3">
                          <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-muted">Ativas</p>
                          <p className="mt-1 text-lg font-semibold text-text">{notificationSummary.active_total}</p>
                        </div>
                        <div className="rounded-2xl border border-border bg-bg-subtle px-4 py-3">
                          <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-muted">Vencidas para reenvio</p>
                          <p className="mt-1 text-lg font-semibold text-text">{notificationSummary.due_now_total}</p>
                        </div>
                        <div className="rounded-2xl border border-border bg-bg-subtle px-4 py-3">
                          <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-muted">Críticas</p>
                          <p className="mt-1 text-lg font-semibold text-text">{notificationSummary.critical_total}</p>
                        </div>
                      </div>
                    ) : null}
                  </div>
                  <label className="flex items-center gap-3 rounded-2xl border border-border bg-bg-subtle px-4 py-3">
                    <input
                      checked={form.governance_notifications_enabled}
                      className="h-4 w-4 rounded border-border-strong text-success-600 focus:ring-success-500"
                      onChange={(event) => updateBooleanField("governance_notifications_enabled", event.target.checked)}
                      type="checkbox"
                    />
                    <div className="space-y-1">
                      <span className="text-sm font-medium text-text-body">Ativar notificações automáticas in-app</span>
                      <p className="text-xs leading-5 text-muted">
                        Quando desativado, a plataforma continua calculando pendências e score, mas deixa de manter a fila
                        automatizada de alertas e revisões.
                      </p>
                    </div>
                  </label>
                  <div className="grid gap-5 md:grid-cols-2">
                    <SettingField
                      label="Reenvio padrão"
                      hint="Intervalo em dias para reativar lembretes persistentes de governança sem criar duplicatas."
                      value={form.governance_notification_repeat_days}
                      onChange={(value) => updateField("governance_notification_repeat_days", value)}
                    />
                    <SettingField
                      label="Reenvio crítico"
                      hint="Intervalo em horas para alertas críticos de operação, incidente ou degradação recorrente."
                      value={form.governance_notification_critical_repeat_hours}
                      onChange={(value) => updateField("governance_notification_critical_repeat_hours", value)}
                    />
                  </div>
                  {notificationSummary ? (
                    <div className="grid gap-3 md:grid-cols-4 xl:grid-cols-6">
                      <div className="rounded-2xl border border-border bg-bg-subtle px-4 py-3">
                        <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-muted">Revisões</p>
                        <p className="mt-1 text-lg font-semibold text-text">{notificationSummary.review_total}</p>
                      </div>
                      <div className="rounded-2xl border border-border bg-bg-subtle px-4 py-3">
                        <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-muted">Operação</p>
                        <p className="mt-1 text-lg font-semibold text-text">{notificationSummary.operational_total}</p>
                      </div>
                      <div className="rounded-2xl border border-border bg-bg-subtle px-4 py-3">
                        <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-muted">Qualidade</p>
                        <p className="mt-1 text-lg font-semibold text-text">{notificationSummary.quality_total}</p>
                      </div>
                      <div className="rounded-2xl border border-border bg-bg-subtle px-4 py-3">
                        <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-muted">Incidentes</p>
                        <p className="mt-1 text-lg font-semibold text-text">{notificationSummary.incident_total}</p>
                      </div>
                      <div className="rounded-2xl border border-border bg-bg-subtle px-4 py-3 md:col-span-2">
                        <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-muted">Última leitura</p>
                        <p className="mt-1 text-sm font-medium text-text">{formatDateTime(notificationSummary.generated_at)}</p>
                      </div>
                    </div>
                  ) : null}
                </div>
                <div className="space-y-4 rounded-3xl border border-border bg-surface p-5">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-brand-600">Aprovação por domínio e área</p>
                      <h4 className="mt-2 text-lg font-semibold text-text">Regras explícitas de stewardship</h4>
                      <p className="mt-1 max-w-3xl text-sm leading-6 text-text-body">
                        Quando existir uma regra ativa, o stewardship prioriza esse aprovador antes do histórico do ativo e do balanceamento de carga. Isso ajuda a refletir responsabilidade organizacional de domínio e área.
                      </p>
                    </div>
                    {canExportAuditArchives ? (
                      <Button onClick={addStewardshipRule} size="sm" variant="outline">
                        Nova regra
                      </Button>
                    ) : null}
                  </div>
                  {form.stewardship_assignment_rules.length ? (
                    <fieldset disabled={!canEdit}>
                      <div className="space-y-3">
                        {form.stewardship_assignment_rules.map((rule, index) => (
                          <div className="grid gap-3 rounded-2xl border border-border bg-bg-subtle p-4 xl:grid-cols-[1.2fr_1fr_1fr_1.2fr_0.7fr_auto]" key={rule.key || `${rule.request_type}-${index}`}>
                            <label className="space-y-2">
                              <span className="text-xs font-semibold uppercase tracking-[0.14em] text-muted">Tipo</span>
                              <select
                                className="w-full rounded-xl border border-border bg-surface px-3 py-2 text-sm text-text"
                                onChange={(event) => updateStewardshipRule(index, { request_type: event.target.value })}
                                value={rule.request_type}
                              >
                                {stewardshipRequestTypeOptions.map((option) => (
                                  <option key={option.value} value={option.value}>
                                    {option.label}
                                  </option>
                                ))}
                              </select>
                            </label>
                            <TextField
                              hint="Opcional"
                              label="Domínio"
                              value={rule.domain_name || ""}
                              onChange={(value) => updateStewardshipRule(index, { domain_name: value })}
                              placeholder="Ex.: Comercial"
                            />
                            <TextField
                              hint="Opcional"
                              label="Área do owner"
                              value={rule.owner_area || ""}
                              onChange={(value) => updateStewardshipRule(index, { owner_area: value })}
                              placeholder="Ex.: Financeiro"
                            />
                            <label className="space-y-2">
                              <span className="text-xs font-semibold uppercase tracking-[0.14em] text-muted">Aprovador</span>
                              <select
                                className="w-full rounded-xl border border-border bg-surface px-3 py-2 text-sm text-text"
                                onChange={(event) => updateStewardshipRule(index, { approver_user_id: Number(event.target.value) || rule.approver_user_id })}
                                value={rule.approver_user_id}
                              >
                                {adminUsers.map((user) => (
                                  <option key={user.id} value={user.id}>
                                    {(user.name || user.full_name || user.email) ?? `Usuário ${user.id}`} • {user.email}
                                  </option>
                                ))}
                              </select>
                            </label>
                            <SettingField
                              hint="Menor valor = maior prioridade"
                              label="Prioridade"
                              value={rule.priority}
                              onChange={(value) => updateStewardshipRule(index, { priority: Math.max(Number(value) || 1, 1) })}
                            />
                            <div className="flex flex-col justify-between gap-3 rounded-2xl border border-border bg-surface p-3">
                              <label className="flex items-center gap-2 text-sm text-text-body">
                                <input
                                  checked={rule.is_active}
                                  className="h-4 w-4 rounded border-border-strong"
                                  onChange={(event) => updateStewardshipRule(index, { is_active: event.target.checked })}
                                  type="checkbox"
                                />
                                Ativa
                              </label>
                              {canEdit ? (
                                <Button onClick={() => removeStewardshipRule(index)} size="sm" variant="outline">
                                  Remover
                                </Button>
                              ) : null}
                            </div>
                          </div>
                        ))}
                      </div>
                    </fieldset>
                  ) : (
                    <div className="rounded-2xl border border-dashed border-border-strong bg-bg-subtle px-4 py-6 text-sm text-muted">
                      Nenhuma regra configurada. Sem regra explícita, o stewardship continua usando histórico recente, responsável de dados, revisores anteriores e balanceamento de carga.
                    </div>
                  )}
                </div>
                <div className="space-y-4 rounded-3xl border border-border bg-bg-subtle p-5">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-brand-600">Score geral de governança</p>
                      <h4 className="mt-2 text-lg font-semibold text-text">Pesos explicáveis e parametrizáveis</h4>
                      <p className="mt-1 max-w-3xl text-sm leading-6 text-text-body">
                        Mantemos a soma em 100 pontos para preservar comparabilidade entre ativos. Os pesos abaixo alimentam Explorer, dashboard, central de pendências e campanhas automáticas.
                      </p>
                    </div>
                    <div className="rounded-2xl border border-border bg-surface px-4 py-3 text-right">
                      <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-muted">Total configurado</p>
                      <p className="mt-1 text-lg font-semibold text-text">
                        {Object.values(form.governance_score_weights).reduce((total, current) => total + current, 0)} pts
                      </p>
                    </div>
                  </div>
                  <fieldset disabled={!canEdit}>
                    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                      <ScoreWeightField label="Responsável definido" hint="Peso por ter um responsável atribuído ao ativo." value={form.governance_score_weights.owner_defined} onChange={(value) => updateScoreWeight("owner_defined", value)} />
                      <ScoreWeightField label="Descrição da tabela" hint="Peso pela descrição manual da tabela preenchida." value={form.governance_score_weights.table_description_complete} onChange={(value) => updateScoreWeight("table_description_complete", value)} />
                      <ScoreWeightField label="Descrição de colunas" hint="Peso pela cobertura de descrição das colunas." value={form.governance_score_weights.column_description_complete} onChange={(value) => updateScoreWeight("column_description_complete", value)} />
                      <ScoreWeightField label="Tags aplicadas" hint="Peso por ter tags de classificação aplicadas." value={form.governance_score_weights.tags_applied} onChange={(value) => updateScoreWeight("tags_applied", value)} />
                      <ScoreWeightField label="Termos de glossário" hint="Peso por associação a termos do glossário." value={form.governance_score_weights.glossary_terms} onChange={(value) => updateScoreWeight("glossary_terms", value)} />
                      <ScoreWeightField label="Data Quality" hint="Peso do score de Data Quality do ativo." value={form.governance_score_weights.dq_score} onChange={(value) => updateScoreWeight("dq_score", value)} />
                      <ScoreWeightField label="Certificação" hint="Peso por estar certificado e dentro da validade." value={form.governance_score_weights.certification} onChange={(value) => updateScoreWeight("certification", value)} />
                      <ScoreWeightField label="Saúde operacional" hint="Peso pela ausência de incidentes abertos no ativo." value={form.governance_score_weights.incident_health} onChange={(value) => updateScoreWeight("incident_health", value)} />
                      <ScoreWeightField label="Revisão de owner" hint="Peso por estar com a revisão de owner em dia." value={form.governance_score_weights.owner_review} onChange={(value) => updateScoreWeight("owner_review", value)} />
                      <ScoreWeightField label="Revisão de privacidade" hint="Peso por estar com a revisão de privacidade em dia." value={form.governance_score_weights.privacy_review} onChange={(value) => updateScoreWeight("privacy_review", value)} />
                      <ScoreWeightField label="Revisão de certificação" hint="Peso por estar com a revisão de certificação em dia." value={form.governance_score_weights.certification_review} onChange={(value) => updateScoreWeight("certification_review", value)} />
                    </div>
                  </fieldset>
                  <div className="space-y-4 rounded-3xl border border-border bg-surface p-5">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div>
                        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-brand-600">Trust score ajustável</p>
                        <h4 className="mt-2 text-lg font-semibold text-text">Peso por domínio e criticidade</h4>
                        <p className="mt-1 max-w-3xl text-sm leading-6 text-text-body">
                          Ajustes positivos aumentam confiança e ajustes negativos reduzem o score final. Use JSON simples para manter a configuração auditável e previsível.
                        </p>
                      </div>
                    </div>
                    <div className="grid gap-5 xl:grid-cols-2">
                      <label className="space-y-2">
                        <span className="text-sm font-medium text-text-body">Ajustes por domínio</span>
                        <p className="text-xs leading-5 text-muted">
                          Ex.: <code>{'{ "comercial": 5, "financeiro": -8 }'}</code>
                        </p>
                        <Textarea
                          disabled={!canEdit}
                          className="min-h-[180px] font-mono text-sm"
                          value={trustDomainAdjustmentsText}
                          onChange={(event) => setTrustDomainAdjustmentsText(event.target.value)}
                        />
                      </label>
                      <label className="space-y-2">
                        <span className="text-sm font-medium text-text-body">Ajustes por criticidade</span>
                        <p className="text-xs leading-5 text-muted">
                          Ex.: <code>{'{ "high": -4, "critical": -10 }'}</code>
                        </p>
                        <Textarea
                          disabled={!canEdit}
                          className="min-h-[180px] font-mono text-sm"
                          value={trustCriticalityAdjustmentsText}
                          onChange={(event) => setTrustCriticalityAdjustmentsText(event.target.value)}
                        />
                      </label>
                    </div>
                    <div className="grid gap-3 md:grid-cols-2">
                      <div className="rounded-2xl border border-border bg-bg-subtle px-4 py-3">
                        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-muted">Domínios configurados</p>
                        <p className="mt-2 text-sm font-semibold text-text">
                          {Object.keys(form.trust_score_domain_adjustments || {}).length.toLocaleString("pt-BR")}
                        </p>
                      </div>
                      <div className="rounded-2xl border border-border bg-bg-subtle px-4 py-3">
                        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-muted">Criticidades configuradas</p>
                        <p className="mt-2 text-sm font-semibold text-text">
                          {Object.keys(form.trust_score_criticality_adjustments || {}).length.toLocaleString("pt-BR")}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
                </fieldset>
              </CardContent>
            </Card>
          ) : null}

          {activeSection === "playbooks" ? <GovernancePlaybooksConsole /> : null}

          {activeSection === "retention" ? (
            <Card className="border-border bg-surface shadow-[0_12px_36px_rgba(15,23,42,0.05)]">
              <CardContent className="space-y-5 p-6">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-brand-600">Retenção operacional</p>
                  <h3 className="mt-2 text-2xl font-semibold tracking-tight text-text">Camada quente, arquivo frio e crescimento</h3>
                </div>
                <fieldset disabled={!canEdit}>
                  <div className="grid gap-5 md:grid-cols-2">
                    <SettingField label="Retenção do audit log" hint="Dias para manter a trilha quente de auditoria de negócio antes de expirar conforme política." value={form.audit_log_retention_days} unit="dias" onChange={(value) => updateField("audit_log_retention_days", value)} />
                    <SettingField label="Arquivo frio do audit log" hint="Dias para manter a auditoria de negócio em camada fria antes do purge controlado." value={form.audit_log_archive_retention_days} unit="dias" onChange={(value) => updateField("audit_log_archive_retention_days", value)} />
                    <SettingField label="Retenção do access log" hint="Dias para manter acessos recentes em armazenamento quente antes de arquivar." value={form.access_log_retention_days} unit="dias" onChange={(value) => updateField("access_log_retention_days", value)} />
                    <SettingField label="Histórico frio exportável" hint="Dias de retenção do arquivo frio de acessos, voltado para análise e exportação operacional." value={form.access_log_archive_retention_days} unit="dias" onChange={(value) => updateField("access_log_archive_retention_days", value)} />
                    <SettingField label="Retenção de analytics de uso" hint="Dias para manter eventos de uso da plataforma no armazenamento quente." value={form.platform_usage_event_retention_days} unit="dias" onChange={(value) => updateField("platform_usage_event_retention_days", value)} />
                    <SettingField label="Retenção de cliques da busca" hint="Dias para preservar cliques que alimentam relevância e analytics de busca." value={form.search_result_click_retention_days} unit="dias" onChange={(value) => updateField("search_result_click_retention_days", value)} />
                  </div>
                </fieldset>

                {retentionSummary ? (
                  <div className="space-y-3">
                    {retentionSummary.items.map((item) => (
                      <div className="rounded-2xl border border-border bg-bg-subtle p-4" key={item.table_name}>
                        <div className="flex flex-wrap items-center justify-between gap-3">
                          <div>
                            <p className="text-sm font-semibold text-text">{item.table_name}</p>
                            <p className="mt-1 text-xs text-muted">
                              Quente: {item.hot_retention_days ?? 0} dias
                              {item.archive_retention_days ? ` • Frio: ${item.archive_retention_days} dias` : ""}
                            </p>
                          </div>
                          <div className="flex flex-wrap gap-2 text-xs">
                            <span className="rounded-full border border-border bg-surface px-2.5 py-1 text-text-body">Volume quente: {formatNumber(item.hot_rows)}</span>
                            {item.archived_rows ? <span className="rounded-full border border-border bg-surface px-2.5 py-1 text-text-body">Arquivados: {formatNumber(item.archived_rows)}</span> : null}
                            <span className="rounded-full border border-orange-200 bg-orange-50 px-2.5 py-1 text-orange-700">Elegíveis para archive: {formatNumber(item.eligible_for_archive)}</span>
                            <span className="rounded-full border border-warning-200 bg-warning-50 px-2.5 py-1 text-warning-700">Elegíveis para purge: {formatNumber(item.eligible_for_purge)}</span>
                            <span className="rounded-full border border-info-200 bg-info-50 px-2.5 py-1 text-info-700">Crescimento estimado: {formatNumber(Math.round(item.estimated_rows_per_day))}/dia</span>
                            <span className={`rounded-full border px-2.5 py-1 ${
                              item.pressure_level === "high"
                                ? "border-danger-200 bg-danger-50 text-danger-700"
                                : item.pressure_level === "medium"
                                  ? "border-warning-200 bg-warning-50 text-warning-700"
                                  : "border-success-200 bg-success-50 text-success-700"
                            }`}>
                              Pressão {item.pressure_level}
                            </span>
                          </div>
                        </div>
                        <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
                          <div className="rounded-2xl border border-border bg-surface px-4 py-3">
                            <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-muted">Projetado em 30 dias</p>
                            <p className="mt-2 text-sm font-semibold text-text">{formatNumber(item.projected_rows_30d)} linhas</p>
                          </div>
                          <div className="rounded-2xl border border-border bg-surface px-4 py-3">
                            <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-muted">Hot layer no limite</p>
                            <p className="mt-2 text-sm font-semibold text-text">{formatNumber(item.projected_hot_rows_at_retention)} linhas</p>
                          </div>
                          <div className="rounded-2xl border border-border bg-surface px-4 py-3">
                            <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-muted">Custo estimado atual</p>
                            <p className="mt-2 text-sm font-semibold text-text">
                              {item.estimated_storage_mb != null ? `${item.estimated_storage_mb.toFixed(2)} MB` : "Indisponível"}
                            </p>
                          </div>
                          <div className="rounded-2xl border border-border bg-surface px-4 py-3">
                            <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-muted">Último ciclo</p>
                            <p className="mt-2 text-sm font-semibold text-text">
                              Arquivados {formatNumber(item.last_archived_count)} · Purgados {formatNumber(item.last_purged_count)}
                            </p>
                          </div>
                        </div>
                      </div>
                    ))}
                    {canExportAuditArchives ? (
                      <div className="space-y-3">
                        {auditExportJob ? (
                          <div className="rounded-2xl border border-info-200 bg-info-50 px-4 py-3 text-sm text-text-body">
                            <p className="font-semibold text-info-700">
                              {auditExportJob.status === "success"
                                ? "Exportação pronta para download."
                                : auditExportJob.status === "failed"
                                  ? "Exportação falhou."
                                  : "Exportação em processamento."}
                            </p>
                            <p className="mt-1 text-text-body">
                              Job {auditExportJob.id} · {auditExportJob.job_type}
                              {auditExportJob.artifact_expires_at ? ` · expira em ${new Date(auditExportJob.artifact_expires_at).toLocaleString("pt-BR")}` : ""}
                            </p>
                            {auditExportJob.export_download_available && auditExportJob.export_download_href ? (
                              <a className="mt-2 inline-flex font-medium text-info-700 underline" href={auditExportJob.export_download_href}>
                                Baixar arquivo agora
                              </a>
                            ) : null}
                          </div>
                        ) : null}
                      <div className="flex flex-wrap gap-2">
                        <Button
                          onClick={() =>
                            void triggerAuditExport("/v1/admin/access-log/export.csv", "access_log_archive.csv", "Exportar o archive frio de access log em CSV (limite de 1.000 linhas)? A exportação será auditada e os campos sensíveis permanecem mascarados.")
                          }
                          size="sm"
                          variant="outline"
                        >
                          Exportar access log frio CSV
                        </Button>
                        <Button
                          onClick={() =>
                            void triggerAuditExport("/v1/admin/access-log/export.xlsx", "access_log_archive.xlsx", "Exportar o archive frio de access log em Excel (limite de 1.000 linhas)? A exportação será auditada e os campos sensíveis permanecem mascarados.")
                          }
                          size="sm"
                          variant="outline"
                        >
                          Exportar access log frio Excel
                        </Button>
                        <Button
                          onClick={() =>
                            void triggerAuditExport("/v1/admin/audit-log/export.csv", "audit_log_archive.csv", "Exportar o archive frio de auditoria em CSV (limite de 1.000 linhas)? A exportação será auditada e os campos sensíveis permanecem mascarados.")
                          }
                          size="sm"
                          variant="outline"
                        >
                          Exportar auditoria fria CSV
                        </Button>
                        <Button
                          onClick={() =>
                            void triggerAuditExport("/v1/admin/audit-log/export.xlsx", "audit_log_archive.xlsx", "Exportar o archive frio de auditoria em Excel (limite de 1.000 linhas)? A exportação será auditada e os campos sensíveis permanecem mascarados.")
                          }
                          size="sm"
                          variant="outline"
                        >
                          Exportar auditoria fria Excel
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <p className="text-sm text-muted">Exportações reservadas a perfis com permissão de auditoria.</p>
                  )}
                </div>
              ) : null}
              </CardContent>
            </Card>
          ) : null}

          {activeSection === "compatibility" ? (
            <Card className="border-border bg-surface shadow-[0_12px_36px_rgba(15,23,42,0.05)]">
              <CardContent className="space-y-5 p-6">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-brand-600">Compatibilidade e legado</p>
                  <h3 className="mt-2 text-2xl font-semibold tracking-tight text-text">Corte controlado da API legada</h3>
                  <p className="mt-2 max-w-4xl text-sm leading-7 text-text-body">
                    Mantemos aqui o que é necessário para desligar o legado de forma segura, com observação por janela e exceções conscientes.
                  </p>
                </div>
                <fieldset disabled={!canEdit}>
                  <div className="grid gap-5 md:grid-cols-2">
                    <SettingField label="Janela de corte do legado" hint="Número de dias que o cockpit observa antes de cortar automaticamente módulos sem uso em /api." value={form.legacy_api_cutoff_window_days} unit="dias" onChange={(value) => updateField("legacy_api_cutoff_window_days", value)} />
                    <div className="rounded-2xl border border-border bg-bg-subtle p-4 text-sm text-text-body">
                      <p className="font-medium text-text">Contrato oficial</p>
                      <p className="mt-2 leading-6">Use <code>/api/v1</code> como padrão. A superfície legada <code>/api</code> foi encerrada e responde com <code>410 Gone</code>.</p>
                      <p className="mt-3 text-xs text-muted">
                        Nota interna publicada em <code>/Users/nivasmelo/Documents/projetos/catalogo/docs/api-contract.md</code>.
                      </p>
                    </div>
                    <label className="space-y-2 md:col-span-2">
                      <span className="text-sm font-medium text-text-body">Módulos com API legada desativada manualmente</span>
                      <p className="text-xs leading-5 text-muted">Além do corte automático por uso zerado, use esta lista para bloquear módulos imediatamente em <code>/api</code>.</p>
                      <Input
                        value={form.legacy_api_disabled_modules.join(", ")}
                        onChange={(e) =>
                          setForm((current) =>
                            current
                              ? {
                                  ...current,
                                  legacy_api_disabled_modules: e.target.value.split(",").map((item) => item.trim().toLowerCase()).filter(Boolean),
                                }
                              : current,
                          )
                        }
                      />
                    </label>
                    <label className="space-y-2 md:col-span-2">
                      <span className="text-sm font-medium text-text-body">Módulos mantidos no legado por exceção</span>
                      <p className="text-xs leading-5 text-muted">Use esta lista para impedir o corte automático, mesmo quando o cockpit mostrar uso zerado no período configurado.</p>
                      <Input
                        value={form.legacy_api_force_enabled_modules.join(", ")}
                        onChange={(e) =>
                          setForm((current) =>
                            current
                              ? {
                                  ...current,
                                  legacy_api_force_enabled_modules: e.target.value.split(",").map((item) => item.trim().toLowerCase()).filter(Boolean),
                                }
                              : current,
                          )
                        }
                      />
                    </label>
                  </div>
                </fieldset>

                {legacyApiSurfaceLoading ? <Skeleton className="h-64 w-full" /> : null}
                {legacyApiSurface ? (
                  <div className="space-y-4">
                    <div className="rounded-2xl border border-border bg-bg-subtle p-4 text-sm text-text-body">
                      <p className="font-medium text-text">Inventário operacional do legado</p>
                      <p className="mt-2 leading-6">
                        Esta visão usa a mesma referência do middleware para decidir bloqueios `410 Gone`. Só cortamos automaticamente módulos que já tiveram uso real e passaram toda a janela de {legacyApiSurface.window_days} dia(s) sem novos acessos.
                      </p>
                    </div>
                    <div className="grid gap-3 md:grid-cols-3">
                      <div className="rounded-2xl border border-border bg-surface p-4">
                        <p className="text-xs uppercase tracking-[0.16em] text-muted">Superfície oficial</p>
                        <p className="mt-2 text-lg font-semibold text-text">{legacyApiSurface.official_surface}</p>
                      </div>
                      <div className="rounded-2xl border border-border bg-surface p-4">
                        <p className="text-xs uppercase tracking-[0.16em] text-muted">Superfície temporária</p>
                        <p className="mt-2 text-lg font-semibold text-text">{legacyApiSurface.temporary_surface}</p>
                      </div>
                      <div className="rounded-2xl border border-border bg-surface p-4">
                        <p className="text-xs uppercase tracking-[0.16em] text-muted">Módulos rastreados</p>
                        <p className="mt-2 text-lg font-semibold text-text">{legacyApiSurface.items.length}</p>
                      </div>
                    </div>
                    <div className="space-y-3">
                      {legacyApiSurface.items.map((item) => (
                        <div className="rounded-2xl border border-border bg-bg-subtle p-4" key={item.module}>
                          <div className="flex flex-wrap items-start justify-between gap-3">
                            <div>
                              <p className="font-medium text-text">{item.module}</p>
                              <p className="mt-1 text-xs text-muted">
                                Legado: {item.legacy_prefixes.join(", ")} · Canônico: {item.canonical_prefixes.join(", ")}
                              </p>
                            </div>
                            <span className={`rounded-full border px-2.5 py-1 text-xs font-medium ${legacyStatusClassName(item.sunset_status)}`}>
                              {legacyStatusLabel(item.sunset_status)}
                            </span>
                          </div>
                          <p className="mt-3 text-sm leading-6 text-text-body">{item.note}</p>
                          <div className="mt-4 grid gap-3 md:grid-cols-4">
                            <div className="rounded-2xl border border-border bg-surface px-4 py-3">
                              <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-muted">Hits totais</p>
                              <p className="mt-2 text-sm font-semibold text-text">{formatNumber(item.hits_total)}</p>
                            </div>
                            <div className="rounded-2xl border border-border bg-surface px-4 py-3">
                              <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-muted">Hits na janela</p>
                              <p className="mt-2 text-sm font-semibold text-text">{formatNumber(item.hits_in_window)}</p>
                            </div>
                            <div className="rounded-2xl border border-border bg-surface px-4 py-3">
                              <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-muted">Último acesso</p>
                              <p className="mt-2 text-sm font-semibold text-text">{formatDateTime(item.last_hit_at)}</p>
                            </div>
                            <div className="rounded-2xl border border-border bg-surface px-4 py-3">
                              <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-muted">Controle</p>
                              <p className="mt-2 text-sm font-semibold text-text">
                                {item.disabled ? "Bloqueado" : item.forced_enabled ? "Exceção manual" : "Observação automática"}
                              </p>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : null}
              </CardContent>
            </Card>
          ) : null}

          {activeSection === "visibility" ? (
            <Card className="border-border bg-surface shadow-[0_12px_36px_rgba(15,23,42,0.05)]">
              <CardContent className="space-y-5 p-6">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-brand-600">Visibilidade por ativo</p>
                  <h3 className="mt-2 text-2xl font-semibold tracking-tight text-text">Regras finas e masking</h3>
                  <p className="mt-2 max-w-4xl text-sm leading-7 text-text-body">
                    Restrinja ativos específicos por papel, usuário, domínio ou classificação. As regras ativas já se refletem em busca, dashboard, explorer e módulos sensíveis.
                  </p>
                </div>
                <fieldset disabled={!canEdit} className="space-y-5">
                <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                  <label className="space-y-2">
                    <span className="text-sm font-medium text-text-body">Tipo da entidade</span>
                    <Input value={visibilityForm.entity_type} onChange={(e) => setVisibilityForm((current) => ({ ...current, entity_type: e.target.value }))} />
                  </label>
                  <label className="space-y-2">
                    <span className="text-sm font-medium text-text-body">Escopo da regra</span>
                    <Input value={visibilityForm.rule_scope} onChange={(e) => setVisibilityForm((current) => ({ ...current, rule_scope: e.target.value }))} placeholder="asset, domain, classification" />
                  </label>
                  <label className="space-y-2">
                    <span className="text-sm font-medium text-text-body">ID da entidade</span>
                    <Input type="number" value={visibilityForm.entity_id} onChange={(e) => setVisibilityForm((current) => ({ ...current, entity_id: e.target.value }))} />
                  </label>
                  <label className="space-y-2">
                    <span className="text-sm font-medium text-text-body">Match value</span>
                    <Input placeholder="domínio ou classificação" value={visibilityForm.match_value} onChange={(e) => setVisibilityForm((current) => ({ ...current, match_value: e.target.value }))} />
                  </label>
                  <label className="space-y-2">
                    <span className="text-sm font-medium text-text-body">Papel permitido</span>
                    <Input placeholder="admin, editor, viewer..." value={visibilityForm.allowed_role} onChange={(e) => setVisibilityForm((current) => ({ ...current, allowed_role: e.target.value }))} />
                  </label>
                  <label className="space-y-2">
                    <span className="text-sm font-medium text-text-body">Usuário permitido</span>
                    <Input placeholder="ID do usuário" type="number" value={visibilityForm.allowed_user_id} onChange={(e) => setVisibilityForm((current) => ({ ...current, allowed_user_id: e.target.value }))} />
                  </label>
                  <label className="space-y-2">
                    <span className="text-sm font-medium text-text-body">Escopo</span>
                    <Input value={visibilityForm.visibility_scope} onChange={(e) => setVisibilityForm((current) => ({ ...current, visibility_scope: e.target.value }))} />
                  </label>
                  <label className="space-y-2">
                    <span className="text-sm font-medium text-text-body">Motivo</span>
                    <Input value={visibilityForm.reason} onChange={(e) => setVisibilityForm((current) => ({ ...current, reason: e.target.value }))} />
                  </label>
                  <label className="flex items-center gap-3 rounded-2xl border border-border bg-bg-subtle px-4 py-3 text-sm text-text-body">
                    <input checked={visibilityForm.mask_sensitive_fields} onChange={(e) => setVisibilityForm((current) => ({ ...current, mask_sensitive_fields: e.target.checked }))} type="checkbox" />
                    Aplicar masking de campos sensíveis
                  </label>
                </div>
                <div className="flex justify-end">
                  <Button disabled={visibilitySaving} onClick={() => void createVisibilityRule()}>
                    {visibilitySaving ? "Criando..." : "Criar regra de visibilidade"}
                  </Button>
                </div>
                </fieldset>

                {visibilityLoading ? <Skeleton className="h-48 w-full" /> : null}
                {!visibilityLoading && visibilityRules.length ? (
                  <div className="overflow-x-auto rounded-2xl border border-border">
                    <table className="min-w-full divide-y divide-border text-sm">
                      <thead className="bg-bg-subtle/80 text-left text-xs uppercase tracking-[0.16em] text-muted">
                        <tr>
                          <th className="px-4 py-3">Entidade</th>
                          <th className="px-4 py-3">Acesso</th>
                          <th className="px-4 py-3">Escopo</th>
                          <th className="px-4 py-3">Motivo</th>
                          <th className="px-4 py-3">Criada em</th>
                          <th className="px-4 py-3">Ação</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-border bg-surface">
                        {visibilityRules.map((rule) => (
                          <tr key={rule.id}>
                            <td className="px-4 py-4 text-text-body">
                              <div>{rule.entity_type} {rule.entity_id != null ? `#${rule.entity_id}` : ""}</div>
                              <div className="text-xs text-muted">{rule.rule_scope}{rule.match_value ? ` · ${rule.match_value}` : ""}</div>
                            </td>
                            <td className="px-4 py-4 text-text-body">{rule.allowed_role || rule.allowed_user_id || "Global por regra"}</td>
                            <td className="px-4 py-4 text-text-body">{rule.visibility_scope}{rule.mask_sensitive_fields ? " · masking" : ""}</td>
                            <td className="px-4 py-4 text-text-body">{rule.reason || "-"}</td>
                            <td className="px-4 py-4 text-text-body">{rule.created_at ? new Date(rule.created_at).toLocaleString("pt-BR") : "-"}</td>
                            <td className="px-4 py-4">
                              {canEdit ? (
                                <Button onClick={() => void deleteVisibilityRule(rule.id)} size="sm" variant="outline">
                                  Remover
                                </Button>
                              ) : (
                                <span className="text-xs text-muted">Somente leitura</span>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : null}
                {!visibilityLoading && !visibilityRules.length ? (
                  <div className="rounded-2xl border border-border bg-bg-subtle p-4 text-sm text-text-body">
                    Nenhuma regra de visibilidade foi criada até o momento.
                  </div>
                ) : null}
              </CardContent>
            </Card>
          ) : null}

          <div className="flex items-center justify-between gap-3 rounded-2xl border border-border bg-surface px-5 py-4 shadow-[0_12px_36px_rgba(15,23,42,0.05)]">
            <p className="text-sm text-muted">
              Última atualização: {settings?.updated_at ? new Date(settings.updated_at).toLocaleString("pt-BR") : "não registrada"}
            </p>
            <div className="flex items-center gap-3">
              {message ? <span className="text-sm text-info-700">{message}</span> : null}
              {canEdit ? (
                <Button onClick={() => void save()}>{saving ? "Salvando..." : "Salvar parâmetros"}</Button>
              ) : (
                <span className="text-sm font-medium text-muted">Modo somente leitura</span>
              )}
            </div>
          </div>
        </>
      ) : null}
    </div>
  );
}
