import { Link } from "@/lib/next-shims";
import { useEffect, useMemo, useState, type FormEvent } from "react";
import { ExternalLink, Loader2, Plus, Search, Trash2, X } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { apiRequest } from "@/lib/client-api";
import { useModalDismiss } from "@/lib/use-modal-dismiss";
import type {
  DQCatalogColumn,
  DQJobRun,
  DQRule,
  DQRuleCondition,
  DQRuleForm,
  DQTreeDatasource,
  DQTreeDatasourceChildren,
  DQTreeTable,
  DQUserOption,
  RuleBuilderOptions,
  RuleRun,
  RuleSeverity,
  RuleTest,
  RuleType,
  ScheduleMode,
} from "@/features/data-quality/types";

type RulesEditorDrawerProps = {
  open: boolean;
  canWrite: boolean;
  editingItem: DQRule | null;
  form: DQRuleForm;
  isSaving: boolean;
  testingRuleId: number | null;
  testResult: RuleTest | null;
  runResult: RuleRun | null;
  runJob: DQJobRun | null;
  runHistory: RuleRun[];
  recipientUserId: number | null;
  recipientUserLabel: string | null;
  recipientUserEmail: string | null;
  onClose: () => void;
  onSubmit: (event: FormEvent) => void;
  onFormChange: (patch: Partial<DQRuleForm>) => void;
  onTestRule: (item: DQRule) => void;
  onRunRule: (item: DQRule) => void;
  onOpenRunLog: () => void;
  formatDurationMs: (ms: number | null | undefined) => string;
  engineBadge: (run: RuleRun) => React.ReactNode;
  jobStatusBadge: (job: DQJobRun) => React.ReactNode;
};

const SCHEDULE_MODE_LABELS: Record<ScheduleMode, string> = {
  manual: "Manual",
  interval: "Intervalo técnico",
  daily: "Diário",
  weekly: "Semanal",
  biweekly: "Quinzenal",
  monthly: "Mensal",
};

const RULE_TYPE_LABELS: Record<RuleType, string> = {
  column_validation: "Validação de coluna",
  nullability: "Validação de nulidade",
  domain: "Domínio de valores",
  uniqueness: "Unicidade",
  freshness: "Freshness",
  column_comparison: "Comparação entre colunas",
  reconciliation: "Reconciliação",
};

const DIMENSION_LABELS: Record<NonNullable<DQRuleForm["quality_dimension"]>, string> = {
  completude: "Completude",
  validade: "Validade",
  consistencia: "Consistência",
  unicidade: "Unicidade",
  tempestividade: "Tempestividade",
  acuracia: "Acurácia",
};

const CATEGORY_LABELS: Record<NonNullable<DQRuleForm["rule_category"]>, string> = {
  technical: "Técnica",
  business: "Negócio",
  operational: "Operacional",
};

const TEMPLATE_LABELS: Record<string, string> = {
  "completude.required_column": "Coluna obrigatória",
  "completude.required_when_other_present": "Obrigatória quando outra coluna existe",
  "validade.cpf": "CPF válido",
  "validade.cnpj": "CNPJ válido",
  "validade.email": "E-mail válido",
  "validade.telefone": "Telefone válido",
  "validade.nao_futura": "Data não futura",
  "consistencia.colunas": "Comparação entre colunas",
  "unicidade.coluna": "Unicidade por coluna",
  "unicidade.chave_composta": "Chave composta única",
  "tempestividade.sla": "Freshness dentro do SLA",
  "acuracia.contagem": "Reconciliação de contagem",
  "acuracia.soma": "Reconciliação de soma",
};

const SEVERITY_LABELS: Record<RuleSeverity, string> = {
  low: "Baixa",
  medium: "Média",
  high: "Alta",
  critical: "Crítica",
};

const WEEKDAY_OPTIONS = [
  "Segunda-feira",
  "Terça-feira",
  "Quarta-feira",
  "Quinta-feira",
  "Sexta-feira",
  "Sábado",
  "Domingo",
] as const;

const EMPTY_CONDITION: DQRuleCondition = {
  column: "",
  operator: "",
  value: "",
  value_to: "",
  values: [],
  compare_column: null,
  value_type: "none",
  time_unit: "days",
};

const EMPTY_COMPARISON = {
  table_id: null,
  datasource_id: null,
  schema_name: "",
  table_name: "",
  table_fqn: "",
  metric: "count" as const,
  column: "",
  key_columns: [] as string[],
  tolerance_abs: null as number | null,
  tolerance_pct: null as number | null,
};

function formatDateTime(value: string | null | undefined) {
  if (!value) return "—";
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return "—";
  return parsed.toLocaleString("pt-BR");
}

function classifyColumnFamily(dataType: string | null | undefined): "number" | "text" | "date" | "boolean" {
  const normalized = (dataType || "").toLowerCase();
  if (normalized.includes("bool")) return "boolean";
  if (normalized.includes("date") || normalized.includes("time")) return "date";
  if (
    normalized.includes("int") ||
    normalized.includes("numeric") ||
    normalized.includes("decimal") ||
    normalized.includes("double") ||
    normalized.includes("float") ||
    normalized.includes("real") ||
    normalized.includes("number") ||
    normalized.includes("serial")
  ) {
    return "number";
  }
  return "text";
}

function operatorNeedsNoValue(operator: string) {
  return ["is_null", "not_null", "unique", "not_future"].includes(operator);
}

function operatorNeedsSecondValue(operator: string) {
  return ["between", "not_between"].includes(operator);
}

function operatorNeedsList(operator: string) {
  return ["in_list", "not_in_list"].includes(operator);
}

function operatorNeedsCompareColumn(operator: string) {
  return [
    "column_greater_than_column",
    "column_less_than_column",
    "column_equal_to_column",
    "column_required_when_other_present",
  ].includes(operator);
}

function operatorNeedsTimeUnit(operator: string) {
  return operator === "freshness_within_last";
}

function operatorNeedsRegex(operator: string) {
  return operator === "matches_regex" || operator === "not_matches_regex";
}

function humanizeCondition(condition: DQRuleCondition, operators: RuleBuilderOptions["operators"]) {
  const family = condition.column_family || "text";
  const options = operators[family] || [];
  const operatorLabel = options.find((item) => item.value === condition.operator)?.label || condition.operator || "operador";
  if (operatorNeedsNoValue(condition.operator || "")) return `${condition.column || "coluna"} ${operatorLabel}`;
  if (operatorNeedsRegex(condition.operator || "")) return `${condition.column || "coluna"} ${operatorLabel} ${condition.value || "padrão"}`;
  if (operatorNeedsCompareColumn(condition.operator || "")) {
    return `${condition.column || "coluna"} ${operatorLabel} ${condition.compare_column || "outra coluna"}`;
  }
  if (operatorNeedsTimeUnit(condition.operator || "")) {
    return `${condition.column || "coluna"} ${operatorLabel} ${condition.value || "0"} ${condition.time_unit === "hours" ? "horas" : "dias"}`;
  }
  if (operatorNeedsSecondValue(condition.operator || "")) {
    return `${condition.column || "coluna"} ${operatorLabel} ${condition.value || "?"} e ${condition.value_to || "?"}`;
  }
  if (operatorNeedsList(condition.operator || "")) {
    return `${condition.column || "coluna"} ${operatorLabel} ${(condition.values || []).join(", ") || "lista vazia"}`;
  }
  return `${condition.column || "coluna"} ${operatorLabel} ${condition.value ?? "?"}`;
}

function inferValueType(condition: DQRuleCondition, family: string): DQRuleCondition["value_type"] {
  if (operatorNeedsNoValue(condition.operator || "")) return "none";
  if (operatorNeedsCompareColumn(condition.operator || "")) return "column";
  if (operatorNeedsList(condition.operator || "")) return "list";
  if (operatorNeedsRegex(condition.operator || "")) return "text";
  if (family === "number") return "number";
  if (family === "date") return "date";
  if (family === "boolean") return "boolean";
  return "text";
}

export function RulesEditorDrawer({
  open,
  canWrite,
  editingItem,
  form,
  isSaving,
  testingRuleId,
  testResult,
  runResult,
  runJob,
  runHistory,
  recipientUserId,
  recipientUserLabel,
  recipientUserEmail,
  onClose,
  onSubmit,
  onFormChange,
  onTestRule,
  onRunRule,
  onOpenRunLog,
  formatDurationMs,
  engineBadge,
  jobStatusBadge,
}: RulesEditorDrawerProps) {
  useModalDismiss({ open, onClose });
  const [builderOptions, setBuilderOptions] = useState<RuleBuilderOptions | null>(null);
  const [datasources, setDatasources] = useState<DQTreeDatasource[]>([]);
  const [schemas, setSchemas] = useState<DQTreeDatasourceChildren | null>(null);
  const [tables, setTables] = useState<DQTreeTable[]>([]);
  const [columns, setColumns] = useState<DQCatalogColumn[]>([]);
  const [loadingTree, setLoadingTree] = useState(false);
  const [recipientQuery, setRecipientQuery] = useState("");
  const [recipientOptions, setRecipientOptions] = useState<DQUserOption[]>([]);
  const [recipientLoading, setRecipientLoading] = useState(false);
  const [selectedRecipients, setSelectedRecipients] = useState<DQUserOption[]>([]);
  const [intervalUnit, setIntervalUnit] = useState<"minutes" | "hours">("minutes");

  useEffect(() => {
    if (!open) return;
    let active = true;
    setLoadingTree(true);
    void (async () => {
      try {
        const [options, tree] = await Promise.all([
          apiRequest<RuleBuilderOptions>("/v1/dq/rule-builder/options"),
          apiRequest<DQTreeDatasource[]>("/v1/dq/tree"),
        ]);
        if (!active) return;
        setBuilderOptions(options);
        setDatasources(tree);
      } finally {
        if (active) setLoadingTree(false);
      }
    })();
    return () => {
      active = false;
    };
  }, [open]);

  useEffect(() => {
    if (!open || !form.datasource_id) {
      setSchemas(null);
      return;
    }
    let active = true;
    void (async () => {
      const payload = await apiRequest<DQTreeDatasourceChildren>(`/v1/dq/tree/datasources/${form.datasource_id}`);
      if (!active) return;
      setSchemas(payload);
    })();
    return () => {
      active = false;
    };
  }, [open, form.datasource_id]);

  useEffect(() => {
    if (!open || !form.schema_id) {
      setTables([]);
      return;
    }
    let active = true;
    void (async () => {
      const payload = await apiRequest<DQTreeTable[]>(`/v1/dq/tree/schemas/${form.schema_id}/tables`);
      if (!active) return;
      setTables(payload.filter((item) => item.kind === "table"));
    })();
    return () => {
      active = false;
    };
  }, [open, form.schema_id]);

  useEffect(() => {
    if (!open || form.schema_id || !form.schema_name || !schemas?.schemas.length) return;
    const schema = schemas.schemas.find((item) => item.name === form.schema_name);
    if (schema) {
      onFormChange({ schema_id: schema.id });
    }
  }, [open, form.schema_id, form.schema_name, schemas, onFormChange]);

  useEffect(() => {
    if (!open || form.table_id || !form.table_name || !tables.length) return;
    const table = tables.find((item) => item.name === form.table_name);
    if (table) {
      onFormChange({ table_id: table.id });
    }
  }, [open, form.table_id, form.table_name, tables, onFormChange]);

  useEffect(() => {
    if (!open || !form.table_id) {
      setColumns([]);
      return;
    }
    let active = true;
    void (async () => {
      const payload = await apiRequest<DQCatalogColumn[]>(`/v1/catalog/tables/${form.table_id}/columns`);
      if (!active) return;
      setColumns(payload);
    })();
    return () => {
      active = false;
    };
  }, [open, form.table_id]);

  useEffect(() => {
    if (!open) {
      setRecipientQuery("");
      setRecipientOptions([]);
      setSelectedRecipients([]);
      return;
    }
    const initialRecipients = editingItem?.notification_recipient_users?.length
      ? editingItem.notification_recipient_users
      : form.notification_recipient_user_id != null && (recipientUserId != null || recipientUserLabel || recipientUserEmail)
        ? [{
            id: form.notification_recipient_user_id,
            display_name: recipientUserLabel || recipientUserEmail || `Usuário #${form.notification_recipient_user_id}`,
            email: recipientUserEmail || "",
          }]
        : [];
    setSelectedRecipients(initialRecipients);
    setIntervalUnit(
      form.schedule_mode === "interval" && form.schedule_every_minutes && form.schedule_every_minutes % 60 === 0 ? "hours" : "minutes",
    );
  }, [editingItem, form.notification_recipient_user_id, form.schedule_every_minutes, form.schedule_mode, open, recipientUserEmail, recipientUserId, recipientUserLabel]);

  useEffect(() => {
    if (!open) return;
    let active = true;
    const timeout = window.setTimeout(() => {
      setRecipientLoading(true);
      void (async () => {
        try {
          const query = recipientQuery.trim();
          const suffix = query ? `?q=${encodeURIComponent(query)}` : "";
          const data = await apiRequest<DQUserOption[]>(`/v1/dq/users${suffix}`);
          if (active) setRecipientOptions(data);
        } finally {
          if (active) setRecipientLoading(false);
        }
      })();
    }, 250);
    return () => {
      active = false;
      window.clearTimeout(timeout);
    };
  }, [open, recipientQuery]);

  const scheduleMode = form.schedule_mode || "manual";
  const selectedDatasource = datasources.find((item) => item.id === form.datasource_id) || null;
  const selectedSchema = schemas?.schemas.find((item) => item.id === form.schema_id) || null;
  const selectedTable = tables.find((item) => item.id === form.table_id) || null;
  const ruleSummary = useMemo(() => {
    if (!builderOptions) return "Selecione tabela, coluna e operador para gerar o resumo da regra.";
    if (!form.conditions.length) {
      if (form.template_key === "unicidade.chave_composta" && form.unique_columns.length) {
        return `Chave composta única: ${form.unique_columns.join(", ")}`;
      }
      if (form.template_key === "acuracia.contagem" || form.template_key === "acuracia.soma") {
        return form.comparison_target?.table_fqn
          ? `Reconciliação com ${form.comparison_target.table_fqn}`
          : "Configure a tabela de comparação para concluir a regra.";
      }
      return "Adicione ao menos uma condição.";
    }
    const joiner = form.logic === "OR" ? " OU " : " E ";
    return form.conditions.map((condition) => humanizeCondition(condition, builderOptions.operators)).join(joiner);
  }, [builderOptions, form.comparison_target?.table_fqn, form.conditions, form.logic, form.template_key, form.unique_columns]);

  const selectedRecipientsHint = selectedRecipients.length
    ? `${selectedRecipients.length} usuário(s) selecionado(s).`
    : "Nenhum destinatário manual selecionado.";

  function patchConditions(nextConditions: DQRuleCondition[]) {
    onFormChange({ conditions: nextConditions });
  }

  function applyTemplate(templateKey: string) {
    const template = builderOptions?.templates.find((item) => item.key === templateKey) || null;
    if (!template) return;
    const nextPatch: Partial<DQRuleForm> = {
      template_key: template.key,
      quality_dimension: template.dimension,
      rule_category: template.category,
      rule_type: template.rule_type,
      conditions: [],
      unique_columns: [],
      comparison_target: null,
    };
    if (templateKey === "completude.required_column") {
      nextPatch.conditions = [{ ...EMPTY_CONDITION, operator: "not_null", value_type: "none" }];
    } else if (templateKey === "completude.required_when_other_present") {
      nextPatch.conditions = [{ ...EMPTY_CONDITION, operator: "column_required_when_other_present", value_type: "column" }];
    } else if (templateKey === "validade.cpf") {
      nextPatch.conditions = [{ ...EMPTY_CONDITION, operator: "matches_regex", value: "^\\d{3}\\.\\d{3}\\.\\d{3}-\\d{2}$", value_type: "text" }];
    } else if (templateKey === "validade.cnpj") {
      nextPatch.conditions = [{ ...EMPTY_CONDITION, operator: "matches_regex", value: "^\\d{2}\\.\\d{3}\\.\\d{3}/\\d{4}-\\d{2}$", value_type: "text" }];
    } else if (templateKey === "validade.email") {
      nextPatch.conditions = [{ ...EMPTY_CONDITION, operator: "matches_regex", value: "^[^\\s@]+@[^\\s@]+\\.[^\\s@]+$", value_type: "text" }];
    } else if (templateKey === "validade.telefone") {
      nextPatch.conditions = [{ ...EMPTY_CONDITION, operator: "matches_regex", value: "^\\+?[0-9()\\-\\s]{8,20}$", value_type: "text" }];
    } else if (templateKey === "validade.nao_futura") {
      nextPatch.conditions = [{ ...EMPTY_CONDITION, operator: "not_future", value_type: "date" }];
    } else if (templateKey === "consistencia.colunas") {
      nextPatch.conditions = [{ ...EMPTY_CONDITION, operator: "column_equal_to_column", value_type: "column", compare_column: "" }];
    } else if (templateKey === "unicidade.coluna") {
      nextPatch.conditions = [{ ...EMPTY_CONDITION, operator: "unique", value_type: "none" }];
    } else if (templateKey === "unicidade.chave_composta") {
      nextPatch.conditions = [];
    } else if (templateKey === "tempestividade.sla") {
      nextPatch.conditions = [{ ...EMPTY_CONDITION, operator: "freshness_within_last", value_type: "number", time_unit: "hours", value: 1 }];
    } else if (templateKey === "acuracia.contagem") {
      nextPatch.conditions = [];
      nextPatch.comparison_target = { ...EMPTY_COMPARISON, metric: "count" };
    } else if (templateKey === "acuracia.soma") {
      nextPatch.conditions = [];
      nextPatch.comparison_target = { ...EMPTY_COMPARISON, metric: "sum" };
    }
    onFormChange(nextPatch);
  }

  function updateCondition(index: number, patch: Partial<DQRuleCondition>) {
    const next = form.conditions.map((item, itemIndex) => {
      if (itemIndex !== index) return item;
      const merged = { ...item, ...patch };
      const dataType = columns.find((column) => column.name === merged.column)?.data_type || null;
      const family = classifyColumnFamily(dataType);
      return {
        ...merged,
        column_family: family,
        column_data_type: dataType,
        value_type: inferValueType(merged, family),
      };
    });
    patchConditions(next);
  }

  function addCondition() {
    patchConditions([...form.conditions, { ...EMPTY_CONDITION }]);
  }

  function removeCondition(index: number) {
    if (form.conditions.length === 1) {
      patchConditions([{ ...EMPTY_CONDITION }]);
      return;
    }
    patchConditions(form.conditions.filter((_, itemIndex) => itemIndex !== index));
  }

  function toggleRecipient(option: DQUserOption) {
    const exists = selectedRecipients.some((item) => item.id === option.id);
    const next = exists
      ? selectedRecipients.filter((item) => item.id !== option.id)
      : [...selectedRecipients, option];
    setSelectedRecipients(next);
    const nextIds = next.map((item) => item.id);
    onFormChange({
      notification_recipient_user_id: nextIds[0] ?? null,
      notification_recipient_user_ids: nextIds,
    });
  }

  function applyScheduleMode(nextMode: ScheduleMode) {
    const baseTime = form.schedule_time || "08:00";
    const baseDate = form.schedule_anchor_date || new Date().toISOString().slice(0, 10);
    const baseDayOfWeek = form.schedule_day_of_week ?? 0;
    const baseDayOfMonth = form.schedule_day_of_month ?? 1;
    if (nextMode === "manual") {
      onFormChange({ schedule_mode: "manual", schedule_enabled: false });
      return;
    }
    if (nextMode === "interval") {
      onFormChange({ schedule_mode: "interval", schedule_enabled: true, schedule_every_minutes: form.schedule_every_minutes ?? 60 });
      return;
    }
    onFormChange({
      schedule_mode: nextMode,
      schedule_enabled: true,
      schedule_every_minutes: null,
      schedule_time: baseTime,
      schedule_anchor_date: baseDate,
      schedule_day_of_week: baseDayOfWeek,
      schedule_day_of_month: baseDayOfMonth,
    });
  }

  function updateTargetFromDatasource(datasourceId: number) {
    const datasource = datasources.find((item) => item.id === datasourceId) || null;
    onFormChange({
      datasource_id: datasource?.id ?? null,
      datasource_name: datasource?.name ?? "",
      schema_id: null,
      schema_name: "",
      table_id: null,
      table_name: "",
      table_fqn: "",
      conditions: [{ ...EMPTY_CONDITION }],
      template_key: "",
      quality_dimension: null,
      rule_category: null,
      unique_columns: [],
      comparison_target: null,
    });
  }

  function updateTargetFromSchema(schemaId: number) {
    const schema = schemas?.schemas.find((item) => item.id === schemaId) || null;
    onFormChange({
      schema_id: schema?.id ?? null,
      schema_name: schema?.name ?? "",
      table_id: null,
      table_name: "",
      table_fqn: "",
      conditions: [{ ...EMPTY_CONDITION }],
      template_key: "",
      quality_dimension: null,
      rule_category: null,
      unique_columns: [],
      comparison_target: null,
    });
  }

  function updateTargetFromTable(tableId: number) {
    const table = tables.find((item) => item.id === tableId) || null;
    const tableFqn = selectedDatasource && selectedSchema && table
      ? `${selectedDatasource.name}.${selectedSchema.name}.${table.name}`
      : "";
    onFormChange({
      table_id: table?.id ?? null,
      table_name: table?.name ?? "",
      table_fqn: tableFqn,
      conditions: [{ ...EMPTY_CONDITION }],
      template_key: "",
      quality_dimension: null,
      rule_category: null,
      unique_columns: [],
      comparison_target: null,
    });
  }

  function updateUniqueColumns(value: string) {
    const uniqueColumns = value
      .split(",")
      .map((item) => item.trim())
      .filter(Boolean);
    onFormChange({ unique_columns: uniqueColumns });
  }

  if (!open) return null;

  return (
    <div
      aria-modal="true"
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/55 p-2 md:p-4 backdrop-blur-md"
      role="dialog"
    >
      <div className="flex h-[96dvh] w-full max-w-[1280px] flex-col overflow-hidden rounded-[28px] border border-border/80 bg-surface shadow-card">
        <div className="flex items-start justify-between gap-4 border-b border-border/70 bg-[linear-gradient(135deg,#ffffff_0%,#f8fafc_58%,#eef6ff_100%)] px-6 py-5">
          <div className="min-w-0">
            <h3 className="text-lg font-semibold">{editingItem ? "Editar regra visual" : "Criar regra visual"}</h3>
            <p className="mt-1 text-sm text-muted">
              Todas as regras de Data Quality são executadas exclusivamente no cluster Spark. O backend apenas orquestra e persiste resultados.
            </p>
          </div>
          <button aria-label="Fechar" className="rounded-full border border-border/70 p-2 text-muted transition hover:border-border-strong hover:bg-bg-subtle hover:text-text" onClick={onClose} type="button">
            <X className="h-4 w-4" />
          </button>
        </div>

        <form className="flex min-h-0 flex-1 flex-col" onSubmit={onSubmit}>
          <div className="grid min-h-0 flex-1 gap-0 xl:grid-cols-[minmax(0,1.4fr)_minmax(360px,0.85fr)]">
            <div className="min-h-0 overflow-y-auto px-6 py-5">
              <div className="space-y-5">
                <section className="space-y-4 rounded-2xl border border-border/80 bg-bg-subtle/80 p-4 shadow-sm">
                  <div>
                    <p className="text-sm font-semibold text-text">1. Ativo da regra</p>
                    <p className="text-xs text-muted">Selecione fonte, schema e tabela. As colunas são carregadas automaticamente a partir do catálogo.</p>
                  </div>
                  <div className="grid gap-3 md:grid-cols-3">
                    <div>
                      <label className="mb-1 block text-sm font-medium">Fonte de dados</label>
                      <select
                        className="h-10 w-full rounded-lg border border-border/70 px-3 text-sm shadow-sm outline-none transition focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20"
                        onChange={(event) => updateTargetFromDatasource(Number(event.target.value))}
                        value={form.datasource_id ?? ""}
                      >
                        <option value="">Selecione</option>
                        {datasources.map((item) => (
                          <option key={item.id} value={item.id}>{item.name}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="mb-1 block text-sm font-medium">Schema</label>
                      <select
                        className="h-10 w-full rounded-lg border border-border/70 px-3 text-sm shadow-sm outline-none transition focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20"
                        disabled={!form.datasource_id}
                        onChange={(event) => updateTargetFromSchema(Number(event.target.value))}
                        value={form.schema_id ?? ""}
                      >
                        <option value="">Selecione</option>
                        {(schemas?.schemas || []).map((item) => (
                          <option key={item.id} value={item.id}>{item.name}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="mb-1 block text-sm font-medium">Tabela</label>
                      <select
                        className="h-10 w-full rounded-lg border border-border/70 px-3 text-sm shadow-sm outline-none transition focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20"
                        disabled={!form.schema_id}
                        onChange={(event) => updateTargetFromTable(Number(event.target.value))}
                        value={form.table_id ?? ""}
                      >
                        <option value="">Selecione</option>
                        {tables.map((item) => (
                          <option key={item.id} value={item.id}>{item.name}</option>
                        ))}
                      </select>
                    </div>
                  </div>
                  <div className="grid gap-3 md:grid-cols-3">
                    <div className="rounded-2xl border border-border/80 bg-surface p-4 shadow-sm">
                      <p className="text-xs uppercase tracking-wide text-muted">FQN</p>
                      <p className="mt-1 text-sm font-medium text-text">{form.table_fqn || "Selecione o ativo"}</p>
                    </div>
                    <div className="rounded-2xl border border-border/80 bg-surface p-4 shadow-sm">
                      <p className="text-xs uppercase tracking-wide text-muted">Colunas disponíveis</p>
                      <p className="mt-1 text-sm font-medium text-text">{form.table_id ? `${columns.length} colunas` : "—"}</p>
                    </div>
                    <div className="rounded-2xl border border-border/80 bg-surface p-4 shadow-sm">
                      <p className="text-xs uppercase tracking-wide text-muted">Ações rápidas</p>
                      <div className="mt-1 flex flex-wrap gap-2 text-xs">
                        {form.table_id ? (
                          <>
                            <Link className="inline-flex items-center gap-1 font-medium text-info-700 hover:text-info-700" href={`/explorer?tableId=${form.table_id}`}>
                              Explorer <ExternalLink className="h-3.5 w-3.5" />
                            </Link>
                            <Link className="inline-flex items-center gap-1 font-medium text-info-700 hover:text-info-700" href={`/explorer/data-journey?tableId=${form.table_id}`}>
                              Jornada <ExternalLink className="h-3.5 w-3.5" />
                            </Link>
                          </>
                        ) : (
                          <span className="text-muted">Selecione a tabela para navegar</span>
                        )}
                      </div>
                    </div>
                  </div>
                  {loadingTree ? <p className="text-xs text-muted">Carregando fontes e estruturas...</p> : null}
                </section>

                <section className="space-y-4 rounded-2xl border border-border/80 bg-bg-subtle/80 p-4 shadow-sm">
                  <div>
                    <p className="text-sm font-semibold text-text">2. Identidade da regra</p>
                    <p className="text-xs text-muted">Nomeie a regra, classifique a severidade e configure o agendamento.</p>
                  </div>
                  <div className="grid gap-3 md:grid-cols-2">
                    <div>
                      <label className="mb-1 block text-sm font-medium">Nome</label>
                      <Input onChange={(event) => onFormChange({ name: event.target.value })} required value={form.name} />
                    </div>
                    <div>
                      <label className="mb-1 block text-sm font-medium">Severidade</label>
                      <select
                        className="h-10 w-full rounded-lg border border-border/70 px-3 text-sm shadow-sm outline-none transition focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20"
                        onChange={(event) => onFormChange({ severity: event.target.value as RuleSeverity })}
                        value={form.severity}
                      >
                        {builderOptions?.severities.map((item) => (
                          <option key={item.value} value={item.value}>{item.label}</option>
                        ))}
                      </select>
                    </div>
                  </div>
                  <div>
                    <label className="mb-1 block text-sm font-medium">Descrição</label>
                    <textarea
                      className="min-h-24 w-full rounded-lg border border-border/70 px-3 py-2 text-sm shadow-sm outline-none transition focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20"
                      onChange={(event) => onFormChange({ description: event.target.value })}
                      value={form.description}
                    />
                  </div>
                  <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
                    <div className="xl:col-span-2">
                      <label className="mb-1 block text-sm font-medium">Template da regra</label>
                      <select
                        className="h-10 w-full rounded-lg border border-border/70 px-3 text-sm shadow-sm outline-none transition focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20"
                        onChange={(event) => applyTemplate(event.target.value)}
                        value={form.template_key}
                      >
                        <option value="">Selecione um template</option>
                        {builderOptions?.templates.map((item) => (
                          <option key={item.key} value={item.key}>
                            {item.label} · {DIMENSION_LABELS[item.dimension]} · {CATEGORY_LABELS[item.category]}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="mb-1 block text-sm font-medium">Dimensão</label>
                      <select
                        className="h-10 w-full rounded-lg border border-border/70 px-3 text-sm shadow-sm outline-none transition focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20"
                        onChange={(event) => onFormChange({ quality_dimension: event.target.value as DQRuleForm["quality_dimension"] })}
                        value={form.quality_dimension || ""}
                      >
                        <option value="">Selecione</option>
                        {builderOptions?.dimension_options.map((item) => (
                          <option key={item.value} value={item.value}>
                            {item.label}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="mb-1 block text-sm font-medium">Categoria</label>
                      <select
                        className="h-10 w-full rounded-lg border border-border/70 px-3 text-sm shadow-sm outline-none transition focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20"
                        onChange={(event) => onFormChange({ rule_category: event.target.value as DQRuleForm["rule_category"] })}
                        value={form.rule_category || ""}
                      >
                        <option value="">Inferida do tipo</option>
                        {builderOptions?.category_options.map((item) => (
                          <option key={item.value} value={item.value}>{item.label}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="mb-1 block text-sm font-medium">Tipo</label>
                      <select
                        className="h-10 w-full rounded-lg border border-border/70 px-3 text-sm shadow-sm outline-none transition focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20"
                        onChange={(event) => onFormChange({ rule_type: event.target.value as RuleType })}
                        value={form.rule_type}
                      >
                        {builderOptions?.rule_types.map((item) => (
                          <option key={item.value} value={item.value}>{item.label}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="mb-1 block text-sm font-medium">Agendamento</label>
                      <select
                        className="h-10 w-full rounded-lg border border-border/70 px-3 text-sm shadow-sm outline-none transition focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20"
                        onChange={(event) => applyScheduleMode(event.target.value as ScheduleMode)}
                        value={scheduleMode}
                      >
                        {Object.entries(SCHEDULE_MODE_LABELS).map(([value, label]) => (
                          <option key={value} value={value}>{label}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="mb-1 block text-sm font-medium">Engine</label>
                      <Input disabled value="Spark cluster" />
                    </div>
                  </div>
                  <div className="grid gap-3 md:grid-cols-3">
                    {scheduleMode === "interval" ? (
                      <div className="md:col-span-2 grid grid-cols-[1fr_120px] gap-2">
                        <Input
                          min={1}
                          onChange={(event) => {
                            const value = Number(event.target.value || "0");
                            onFormChange({ schedule_every_minutes: intervalUnit === "hours" ? value * 60 : value });
                          }}
                          type="number"
                          value={
                            intervalUnit === "hours"
                              ? Math.max(1, Math.round((form.schedule_every_minutes ?? 60) / 60))
                              : form.schedule_every_minutes ?? ""
                          }
                        />
                        <select
                          className="h-10 rounded-lg border border-border/70 px-3 text-sm shadow-sm outline-none transition focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20"
                          onChange={(event) => setIntervalUnit(event.target.value as "minutes" | "hours")}
                          value={intervalUnit}
                        >
                          <option value="minutes">Minutos</option>
                          <option value="hours">Horas</option>
                        </select>
                      </div>
                    ) : (
                      <div>
                        <label className="mb-1 block text-sm font-medium">Horário</label>
                        <Input onChange={(event) => onFormChange({ schedule_time: event.target.value })} type="time" value={form.schedule_time} />
                      </div>
                    )}
                    {scheduleMode === "weekly" ? (
                      <div>
                        <label className="mb-1 block text-sm font-medium">Dia da semana</label>
                        <select
                          className="h-10 w-full rounded-lg border border-border/70 px-3 text-sm shadow-sm outline-none transition focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20"
                          onChange={(event) => onFormChange({ schedule_day_of_week: Number(event.target.value) })}
                          value={form.schedule_day_of_week ?? 0}
                        >
                          {WEEKDAY_OPTIONS.map((label, index) => (
                            <option key={label} value={index}>{label}</option>
                          ))}
                        </select>
                      </div>
                    ) : null}
                    {scheduleMode === "monthly" ? (
                      <div>
                        <label className="mb-1 block text-sm font-medium">Dia do mês</label>
                        <Input
                          max={31}
                          min={1}
                          onChange={(event) => onFormChange({ schedule_day_of_month: Number(event.target.value) })}
                          type="number"
                          value={form.schedule_day_of_month ?? 1}
                        />
                      </div>
                    ) : null}
                    {scheduleMode === "biweekly" ? (
                      <div>
                        <label className="mb-1 block text-sm font-medium">Data âncora</label>
                        <Input onChange={(event) => onFormChange({ schedule_anchor_date: event.target.value })} type="date" value={form.schedule_anchor_date} />
                      </div>
                    ) : null}
                  </div>
                  <div className="flex flex-wrap items-center gap-4">
                    <label className="flex items-center gap-2 text-sm">
                      <input checked={form.is_active} onChange={(event) => onFormChange({ is_active: event.target.checked })} type="checkbox" />
                      Regra ativa
                    </label>
                    <label className="flex items-center gap-2 text-sm">
                      <input checked={form.schedule_enabled} onChange={(event) => onFormChange({ schedule_enabled: event.target.checked })} type="checkbox" />
                      Agendamento ativo
                    </label>
                  </div>
                </section>

                <section className="space-y-4 rounded-2xl border border-border/80 bg-bg-subtle/80 p-4 shadow-sm">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-sm font-semibold text-text">3. Condições da regra</p>
                      <p className="text-xs text-muted">Monte as validações com coluna, operador e parâmetros. Operadores são filtrados pelo tipo da coluna.</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <select
                        className="h-10 rounded-lg border border-border/70 px-3 text-sm shadow-sm outline-none transition focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20"
                        onChange={(event) => onFormChange({ logic: event.target.value as "AND" | "OR" })}
                        value={form.logic}
                      >
                        {builderOptions?.logic_options.map((item) => (
                          <option key={item.value} value={item.value}>{item.label}</option>
                        ))}
                      </select>
                      <Button onClick={addCondition} type="button" variant="outline">
                        <Plus className="mr-2 h-4 w-4" />
                        Adicionar condição
                      </Button>
                    </div>
                  </div>

                  {form.conditions.map((condition, index) => {
                    const selectedColumn = columns.find((item) => item.name === condition.column) || null;
                    const family = condition.column_family || classifyColumnFamily(selectedColumn?.data_type || null);
                    const operatorOptions = builderOptions?.operators[family] || [];
                    const compareColumns = columns.filter((item) => item.name !== condition.column);

                    return (
                      <div className="space-y-3 rounded-2xl border border-border/80 bg-surface p-4 shadow-sm" key={`${index}-${condition.column}-${condition.operator}`}>
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <p className="text-sm font-semibold text-text">Condição {index + 1}</p>
                            <p className="text-xs text-muted">
                              {selectedColumn ? `${selectedColumn.name} · ${selectedColumn.data_type || "tipo não informado"}` : "Selecione a coluna para liberar os operadores válidos."}
                            </p>
                          </div>
                          <Button onClick={() => removeCondition(index)} size="sm" type="button" variant="outline">
                            <Trash2 className="mr-2 h-4 w-4" />
                            Remover
                          </Button>
                        </div>
                        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
                          <div>
                            <label className="mb-1 block text-sm font-medium">Coluna</label>
                            <select
                              className="h-10 w-full rounded-lg border border-border/70 px-3 text-sm shadow-sm outline-none transition focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20"
                              disabled={!form.table_id}
                              onChange={(event) => updateCondition(index, {
                                column: event.target.value,
                                operator: "",
                                value: "",
                                value_to: "",
                                values: [],
                                compare_column: null,
                              })}
                              value={condition.column}
                            >
                              <option value="">Selecione</option>
                              {columns.map((item) => (
                                <option key={item.id} value={item.name}>{item.name}</option>
                              ))}
                            </select>
                          </div>
                          <div>
                            <label className="mb-1 block text-sm font-medium">Operador</label>
                            <select
                              className="h-10 w-full rounded-lg border border-border/70 px-3 text-sm shadow-sm outline-none transition focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20"
                              disabled={!condition.column}
                              onChange={(event) => updateCondition(index, {
                                operator: event.target.value,
                                value: "",
                                value_to: "",
                                values: [],
                                compare_column: null,
                              })}
                              value={condition.operator || ""}
                            >
                              <option value="">Selecione</option>
                              {operatorOptions.map((item) => (
                                <option key={item.value} value={item.value}>{item.label}</option>
                              ))}
                            </select>
                          </div>
                          {operatorNeedsCompareColumn(condition.operator || "") ? (
                            <div>
                              <label className="mb-1 block text-sm font-medium">Outra coluna</label>
                              <select
                                className="h-10 w-full rounded-lg border border-border/70 px-3 text-sm shadow-sm outline-none transition focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20"
                                onChange={(event) => updateCondition(index, { compare_column: event.target.value })}
                                value={condition.compare_column || ""}
                              >
                                <option value="">Selecione</option>
                                {compareColumns.map((item) => (
                                  <option key={item.id} value={item.name}>{item.name}</option>
                                ))}
                              </select>
                            </div>
                          ) : null}
                          {operatorNeedsList(condition.operator || "") ? (
                            <div className="md:col-span-2">
                              <label className="mb-1 block text-sm font-medium">Lista de valores</label>
                              <Input
                                onChange={(event) => updateCondition(index, {
                                  values: event.target.value.split(",").map((item) => item.trim()).filter(Boolean),
                                })}
                                placeholder="Ex.: Casa, Eletrônicos, Serviços"
                                value={(condition.values || []).join(", ")}
                              />
                            </div>
                          ) : null}
                          {operatorNeedsTimeUnit(condition.operator || "") ? (
                            <>
                              <div>
                                <label className="mb-1 block text-sm font-medium">Janela máxima</label>
                                <Input
                                  min={1}
                                  onChange={(event) => updateCondition(index, { value: event.target.value })}
                                  type="number"
                                  value={String(condition.value ?? "")}
                                />
                              </div>
                              <div>
                                <label className="mb-1 block text-sm font-medium">Unidade</label>
                                <select
                                  className="h-10 w-full rounded-lg border border-border/70 px-3 text-sm shadow-sm outline-none transition focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20"
                                  onChange={(event) => updateCondition(index, { time_unit: event.target.value as "hours" | "days" })}
                                  value={condition.time_unit || "days"}
                                >
                                  {builderOptions?.time_units.map((item) => (
                                    <option key={item.value} value={item.value}>{item.label}</option>
                                  ))}
                                </select>
                              </div>
                            </>
                          ) : null}
                          {!operatorNeedsNoValue(condition.operator || "") &&
                          !operatorNeedsCompareColumn(condition.operator || "") &&
                          !operatorNeedsList(condition.operator || "") &&
                          !operatorNeedsTimeUnit(condition.operator || "") ? (
                            <div>
                              <label className="mb-1 block text-sm font-medium">Valor</label>
                              <Input
                                onChange={(event) => updateCondition(index, { value: event.target.value })}
                                placeholder="Informe o valor"
                                value={String(condition.value ?? "")}
                              />
                            </div>
                          ) : null}
                          {operatorNeedsSecondValue(condition.operator || "") ? (
                            <div>
                              <label className="mb-1 block text-sm font-medium">Valor final</label>
                              <Input
                                onChange={(event) => updateCondition(index, { value_to: event.target.value })}
                                placeholder="Informe o valor final"
                                value={String(condition.value_to ?? "")}
                              />
                            </div>
                          ) : null}
                        </div>
                      </div>
                    );
                  })}
                  {form.rule_type === "uniqueness" ? (
                    <div className="rounded-2xl border border-border bg-bg-subtle/80 p-4">
                      <p className="text-sm font-medium text-text">Chave de unicidade</p>
                      <p className="mt-1 text-xs text-muted">
                        Selecione uma ou mais colunas para validar unicidade simples ou composta.
                      </p>
                      <select
                        className="mt-3 h-32 w-full rounded-lg border border-border/70 px-3 py-2 text-sm shadow-sm outline-none transition focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20"
                        multiple
                        onChange={(event) => {
                          const values = Array.from(event.target.selectedOptions).map((option) => option.value);
                          onFormChange({ unique_columns: values });
                        }}
                        value={form.unique_columns}
                      >
                        {columns.map((item) => (
                          <option key={item.id} value={item.name}>
                            {item.name}
                          </option>
                        ))}
                      </select>
                      <p className="mt-2 text-xs text-muted">
                        {form.unique_columns.length ? `Chave atual: ${form.unique_columns.join(", ")}` : "Nenhuma coluna selecionada."}
                      </p>
                    </div>
                  ) : null}
                  {form.template_key === "acuracia.contagem" || form.template_key === "acuracia.soma" ? (
                    <div className="grid gap-3 rounded-2xl border border-border bg-bg-subtle/80 p-4 md:grid-cols-2">
                      <div>
                        <label className="mb-1 block text-sm font-medium">Tabela de comparação (FQN)</label>
                        <Input
                          onChange={(event) =>
                            onFormChange({
                              comparison_target: {
                                ...(form.comparison_target || { ...EMPTY_COMPARISON }),
                                table_fqn: event.target.value,
                              },
                            })
                          }
                          placeholder="ex.: warehouse.gold.pagamentos"
                          value={form.comparison_target?.table_fqn || ""}
                        />
                      </div>
                      <div>
                        <label className="mb-1 block text-sm font-medium">Métrica</label>
                        <select
                          className="h-10 w-full rounded-lg border border-border/70 px-3 text-sm shadow-sm outline-none transition focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20"
                          onChange={(event) =>
                            onFormChange({
                              comparison_target: {
                                ...(form.comparison_target || { ...EMPTY_COMPARISON }),
                                metric: event.target.value as "count" | "sum",
                              },
                            })
                          }
                          value={form.comparison_target?.metric || "count"}
                        >
                          <option value="count">Contagem</option>
                          <option value="sum">Soma</option>
                        </select>
                      </div>
                      <div>
                        <label className="mb-1 block text-sm font-medium">Coluna da soma</label>
                        <Input
                          disabled={form.comparison_target?.metric !== "sum"}
                          onChange={(event) =>
                            onFormChange({
                              comparison_target: {
                                ...(form.comparison_target || { ...EMPTY_COMPARISON }),
                                column: event.target.value,
                              },
                            })
                          }
                          placeholder="valor_credito"
                          value={form.comparison_target?.column || ""}
                        />
                      </div>
                      <div>
                        <label className="mb-1 block text-sm font-medium">Colunas-chave</label>
                        <Input
                          onChange={(event) =>
                            onFormChange({
                              comparison_target: {
                                ...(form.comparison_target || { ...EMPTY_COMPARISON }),
                                key_columns: event.target.value
                                  .split(",")
                                  .map((item) => item.trim())
                                  .filter(Boolean),
                              },
                            })
                          }
                          placeholder="proposta_id, cota_id"
                          value={(form.comparison_target?.key_columns || []).join(", ")}
                        />
                      </div>
                      <div>
                        <label className="mb-1 block text-sm font-medium">Tolerância absoluta</label>
                        <Input
                          min={0}
                          onChange={(event) =>
                            onFormChange({
                              comparison_target: {
                                ...(form.comparison_target || { ...EMPTY_COMPARISON }),
                                tolerance_abs: event.target.value ? Number(event.target.value) : null,
                              },
                            })
                          }
                          type="number"
                          value={form.comparison_target?.tolerance_abs ?? ""}
                        />
                      </div>
                      <div>
                        <label className="mb-1 block text-sm font-medium">Tolerância percentual</label>
                        <Input
                          min={0}
                          onChange={(event) =>
                            onFormChange({
                              comparison_target: {
                                ...(form.comparison_target || { ...EMPTY_COMPARISON }),
                                tolerance_pct: event.target.value ? Number(event.target.value) : null,
                              },
                            })
                          }
                          type="number"
                          value={form.comparison_target?.tolerance_pct ?? ""}
                        />
                      </div>
                    </div>
                  ) : null}
                </section>

                <section className="space-y-4 rounded-2xl border border-border/80 bg-bg-subtle/80 p-4 shadow-sm">
                  <div>
                    <p className="text-sm font-semibold text-text">4. Destinatários e revisão</p>
                    <p className="text-xs text-muted">Selecione quem deve ser avisado e revise o resumo humano da regra antes de salvar.</p>
                  </div>
                  <div className="grid gap-4 lg:grid-cols-[minmax(0,1.2fr)_minmax(0,0.8fr)]">
                    <div className="space-y-3 rounded-2xl border border-border/80 bg-surface p-4 shadow-sm">
                      <label className="block text-sm font-medium">Buscar destinatários</label>
                      <Input
                        onChange={(event) => setRecipientQuery(event.target.value)}
                        placeholder="Busque por nome ou e-mail"
                        value={recipientQuery}
                      />
                      <p className="text-xs text-muted">{selectedRecipientsHint}</p>
                      <div className="max-h-56 space-y-2 overflow-y-auto">
                        {recipientLoading ? (
                          <p className="text-sm text-muted">Carregando usuários...</p>
                        ) : recipientOptions.map((option) => {
                          const active = selectedRecipients.some((item) => item.id === option.id);
                          return (
                            <button
                              className="flex w-full items-center justify-between rounded-xl border border-border/70 px-3 py-2 text-left shadow-sm transition hover:border-brand-500/40 hover:bg-bg-subtle"
                              key={option.id}
                              onClick={() => toggleRecipient(option)}
                              type="button"
                            >
                              <div className="min-w-0">
                                <p className="truncate font-medium text-text">{option.display_name}</p>
                                <p className="truncate text-xs text-muted">{option.email}</p>
                              </div>
                              <Badge tone={active ? "accent" : "neutral"}>{active ? "Selecionado" : "Adicionar"}</Badge>
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    <div className="space-y-3 rounded-2xl border border-border/80 bg-surface p-4 shadow-sm">
                      <div className="flex items-center justify-between gap-2">
                        <p className="text-sm font-semibold text-text">Resumo da regra</p>
                        <Badge tone={form.is_active ? "success" : "neutral"}>{form.is_active ? "Ativa" : "Inativa"}</Badge>
                      </div>
                      <div className="space-y-2 text-sm text-text-body">
                        <p><strong>Tipo:</strong> {RULE_TYPE_LABELS[form.rule_type]}</p>
                        <p><strong>Dimensão:</strong> {form.quality_dimension ? DIMENSION_LABELS[form.quality_dimension] : "Não informada"}</p>
                        <p><strong>Categoria:</strong> {form.rule_category ? CATEGORY_LABELS[form.rule_category] : "Inferida do tipo"}</p>
                        <p><strong>Template:</strong> {form.template_key ? TEMPLATE_LABELS[form.template_key] || form.template_key : "Sem template"}</p>
                        <p><strong>Severidade:</strong> {SEVERITY_LABELS[form.severity]}</p>
                        <p><strong>Tabela:</strong> {form.table_fqn || "Selecione o ativo"}</p>
                        <p><strong>Condições:</strong> {ruleSummary}</p>
                        {form.unique_columns.length ? <p><strong>Chave única:</strong> {form.unique_columns.join(", ")}</p> : null}
                        {form.comparison_target?.table_fqn ? <p><strong>Tabela comparada:</strong> {form.comparison_target.table_fqn}</p> : null}
                        <p><strong>Agendamento:</strong> {SCHEDULE_MODE_LABELS[scheduleMode]}</p>
                      </div>
                    </div>
                  </div>
                </section>
              </div>
            </div>

            <div className="min-h-0 overflow-y-auto border-t border-border/60 bg-bg-subtle/50 px-6 py-5 xl:border-l xl:border-t-0">
              <div className="space-y-4">
                <section className="space-y-3 rounded-2xl border border-border/80 bg-surface p-4 shadow-sm">
                  <div className="flex items-center justify-between gap-2">
                    <div>
                      <p className="text-sm font-semibold text-text">Validar estrutura</p>
                      <p className="text-xs text-muted">Confirma ativo, colunas, operadores e parâmetros sem executar dados no backend.</p>
                    </div>
                    <Button disabled={testingRuleId === editingItem?.id || !editingItem} onClick={() => editingItem && onTestRule(editingItem)} type="button" variant="outline">
                      {testingRuleId === editingItem?.id ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Search className="mr-2 h-4 w-4" />}
                      Validar estrutura
                    </Button>
                  </div>
                  {editingItem ? (
                    testResult ? (
                      <div className="space-y-2 rounded-2xl border border-border/70 bg-bg-subtle/80 p-3 shadow-sm">
                        <p className="text-sm">
                          Status: <strong>{testResult.status.toUpperCase()}</strong> · Estrutura {testResult.valid ? <strong>válida</strong> : <strong>inválida</strong>}
                        </p>
                        {testResult.error_message ? <p className="text-sm text-danger-700">{testResult.error_message}</p> : null}
                        {testResult.valid && !testResult.error_message ? (
                          <p className="text-xs text-muted">Estrutura validada. A execução da regra ocorre no cluster Spark.</p>
                        ) : null}
                      </div>
                    ) : (
                      <p className="text-xs text-muted">Salve a regra para habilitar a validação estrutural.</p>
                    )
                  ) : (
                    <p className="text-xs text-muted">Crie a regra primeiro. Depois você pode validar a estrutura e executar no Spark.</p>
                  )}
                </section>

                {editingItem ? (
                  <section className="space-y-3 rounded-2xl border border-border/80 bg-surface p-4 shadow-sm">
                    <div className="flex items-center justify-between gap-2">
                      <div>
                        <p className="text-sm font-semibold text-text">Executar no Spark</p>
                        <p className="text-xs text-muted">Enfileira a execução no cluster usando a definição estruturada já salva.</p>
                      </div>
                      <Button onClick={() => onRunRule(editingItem)} type="button">
                        Executar regra
                      </Button>
                    </div>
                    {runJob ? (
                      <div className="space-y-2 rounded-2xl border border-border/70 bg-bg-subtle/80 p-3 shadow-sm text-sm">
                        <div className="flex flex-wrap items-center gap-2">
                          {jobStatusBadge(runJob)}
                          <Badge tone="warning">Spark cluster</Badge>
                          <span className="text-xs text-muted">duração: {formatDurationMs(runJob.duration_ms)}</span>
                          {runJob.spark_app_id ? <span className="text-xs text-muted">app: {runJob.spark_app_id}</span> : null}
                        </div>
                        {runJob.status === "failed" ? (
                          <Button onClick={onOpenRunLog} size="sm" type="button" variant="outline">
                            Ver log
                          </Button>
                        ) : null}
                      </div>
                    ) : null}
                    {runResult ? (
                      <div className="flex flex-wrap items-center gap-2 text-sm">
                        <span>Último run manual: <strong>{runResult.status.toUpperCase()}</strong> · {runResult.violations_count} violações</span>
                        {engineBadge(runResult)}
                      </div>
                    ) : null}
                  </section>
                ) : null}

                {editingItem ? (
                  <section className="rounded-2xl border border-border/80 bg-surface shadow-sm">
                    <div className="border-b border-border/60 px-4 py-3">
                      <p className="text-sm font-semibold">Histórico de execuções</p>
                    </div>
                    <div className="max-h-[330px] overflow-y-auto">
                      {runHistory.length === 0 ? (
                        <p className="px-4 py-3 text-sm text-muted">Sem histórico ainda.</p>
                      ) : (
                        <table className="min-w-full text-sm">
                          <thead className="bg-bg-subtle/80 text-left text-xs uppercase text-muted">
                            <tr>
                              <th className="px-4 py-3">Run</th>
                              <th className="px-4 py-3">Status</th>
                              <th className="px-4 py-3">Engine</th>
                              <th className="px-4 py-3">Violações</th>
                              <th className="px-4 py-3">Quando</th>
                            </tr>
                          </thead>
                          <tbody>
                            {runHistory.map((run) => (
                              <tr className="border-t border-border/60" key={run.id}>
                                <td className="px-4 py-3">#{run.id}</td>
                                <td className="px-4 py-3">{run.status.toUpperCase()}</td>
                                <td className="px-4 py-3">{engineBadge(run)}</td>
                                <td className="px-4 py-3">{run.violations_count}</td>
                                <td className="px-4 py-3 text-xs text-muted">{formatDateTime(run.created_at)}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      )}
                    </div>
                  </section>
                ) : null}
              </div>
            </div>
          </div>

          <div className="flex items-center justify-end gap-2 border-t border-border/60 bg-surface px-6 py-4">
            <Button onClick={onClose} type="button" variant="outline">Cancelar</Button>
            <Button disabled={!canWrite || isSaving || !form.table_id || !form.name.trim()} type="submit">
              {isSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              Salvar regra
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
