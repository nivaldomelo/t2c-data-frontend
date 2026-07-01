import { useEffect, useMemo, useState, type FormEvent } from "react";
import { useRouter } from "@/lib/next-shims";
import { AlertTriangle, BookOpen, CheckCircle2, Edit3, Layers3, Plus, RefreshCw, ShieldAlert, Sparkles, Trash2, TestTube2 } from "lucide-react";

import { ContextualJourneyCard } from "@/components/navigation/contextual-journey-card";
import { Badge } from "@/components/ui/badge";
import { Banner } from "@/components/ui/banner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import { useAuth } from "@/lib/auth";
import { cn } from "@/lib/cn";
import { formatDateTime, formatStatusLabel, formatStatusTone } from "@/features/integrations/utils";
import {
  createDataLakeConnection,
  deleteDataLakeConnection,
  deleteDataLakeScanSchedule,
  getDataLakeOperationsSummary,
  getDataLakeScanSchedule,
  getDataLakeTroubleshooting,
  listDataLakeInventory,
  listDataLakeConnections,
  scanDataLakeInventory,
  testDataLakeConnection,
  updateDataLakeConnection,
  upsertDataLakeScanSchedule,
} from "@/features/integrations/sdk";
import type {
  DataLakeAuthType,
  DataLakeConnection,
  DataLakeConnectionTestResult,
  DataLakeInventoryPage,
  DataLakeInventoryTable,
  DataLakeOperationsSummary,
  DataLakeScanSchedule,
  DataLakeScanScheduleInput,
  DataLakeTroubleshootingSummary,
} from "@/features/integrations/types";
import type {
  ConnectionDialogMode,
  DataLakeForm,
  DataLakeScheduleForm,
} from "./data-lake-console-types";
import { authHelpText, buildPayload, toneClasses } from "./data-lake-console-helpers";

const emptyForm: DataLakeForm = {
  name: "",
  description: "",
  bucket: "",
  region: "",
  prefix: "",
  auth_type: "default_environment",
  freshness_sla_hours_default: "",
  freshness_sla_hours_bronze: "",
  freshness_sla_hours_silver: "",
  freshness_sla_hours_gold: "",
  aws_access_key_id: "",
  aws_secret_access_key: "",
  aws_session_token: "",
  role_arn: "",
  is_active: true,
};

const emptyScheduleForm: DataLakeScheduleForm = {
  schedule_mode: "manual",
  schedule_enabled: true,
  schedule_every_minutes: "",
  schedule_time: "08:00",
  schedule_day_of_week: "0",
  schedule_day_of_month: "1",
  schedule_anchor_date: "",
};

export function DataLakeConsole() {
  const auth = useAuth();
  const router = useRouter();
  const canManage = auth.primaryRole === "admin";
  const [connections, setConnections] = useState<DataLakeConnection[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [toast, setToast] = useState("");
  const [saving, setSaving] = useState(false);
  const [testingId, setTestingId] = useState<number | null>(null);
  const [testResult, setTestResult] = useState<DataLakeConnectionTestResult | null>(null);
  const [testResultConnectionId, setTestResultConnectionId] = useState<number | null>(null);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [connectionDialogOpen, setConnectionDialogOpen] = useState(false);
  const [connectionDialogMode, setConnectionDialogMode] = useState<ConnectionDialogMode>("create");
  const [form, setForm] = useState<DataLakeForm>(emptyForm);
  const [selectedConnectionId, setSelectedConnectionId] = useState<number | null>(null);
  const [inventoryPage, setInventoryPage] = useState<DataLakeInventoryPage | null>(null);
  const [inventoryLoading, setInventoryLoading] = useState(false);
  const [inventoryError, setInventoryError] = useState("");
  const [inventoryPageIndex, setInventoryPageIndex] = useState(1);
  const [inventoryPageSize] = useState(25);
  const [inventoryNameFilter, setInventoryNameFilter] = useState("");
  const [inventoryLayerFilter, setInventoryLayerFilter] = useState("");
  const [inventoryStatusFilter, setInventoryStatusFilter] = useState("");
  const [inventoryPartitionsFilter, setInventoryPartitionsFilter] = useState("");
  const [inventoryFreshnessFilter, setInventoryFreshnessFilter] = useState("");
  const [inventoryScanning, setInventoryScanning] = useState(false);
  const [schedule, setSchedule] = useState<DataLakeScanSchedule | null>(null);
  const [scheduleForm, setScheduleForm] = useState<DataLakeScheduleForm>(emptyScheduleForm);
  const [scheduleLoading, setScheduleLoading] = useState(false);
  const [scheduleSaving, setScheduleSaving] = useState(false);
  const [scheduleError, setScheduleError] = useState("");
  const [operationsSummary, setOperationsSummary] = useState<DataLakeOperationsSummary | null>(null);
  const [operationsLoading, setOperationsLoading] = useState(false);
  const [operationsError, setOperationsError] = useState("");
  const [troubleshooting, setTroubleshooting] = useState<DataLakeTroubleshootingSummary | null>(null);

  async function loadConnections() {
    setLoading(true);
    setError("");
    try {
      const payload = await listDataLakeConnections();
      setConnections(payload);
      if (payload.length > 0 && !payload.some((item) => item.id === selectedConnectionId)) {
        setSelectedConnectionId(payload[0].id);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Não foi possível carregar as conexões do Data Lake.");
    } finally {
      setLoading(false);
    }
  }

  function scheduleToForm(item: DataLakeScanSchedule | null): DataLakeScheduleForm {
    if (!item) return emptyScheduleForm;
    return {
      schedule_mode: item.schedule_mode || "manual",
      schedule_enabled: item.schedule_enabled,
      schedule_every_minutes: item.schedule_every_minutes?.toString() || "",
      schedule_time: item.schedule_time || "08:00",
      schedule_day_of_week: item.schedule_day_of_week?.toString() || "0",
      schedule_day_of_month: item.schedule_day_of_month?.toString() || "1",
      schedule_anchor_date: item.schedule_anchor_date?.slice(0, 10) || "",
    };
  }

  async function loadConnectionOperations(connectionId: number) {
    setOperationsLoading(true);
    setOperationsError("");
    setScheduleLoading(true);
    setScheduleError("");
    try {
      const [opsResult, troubleshootingResult, scheduleResult] = await Promise.allSettled([
        getDataLakeOperationsSummary(connectionId),
        getDataLakeTroubleshooting(connectionId),
        getDataLakeScanSchedule(connectionId),
      ]);
      if (opsResult.status === "fulfilled") {
        setOperationsSummary(opsResult.value);
      } else {
        setOperationsSummary(null);
        setOperationsError(opsResult.reason instanceof Error ? opsResult.reason.message : "Não foi possível carregar a operação da integração.");
      }
      if (troubleshootingResult.status === "fulfilled") {
        setTroubleshooting(troubleshootingResult.value);
      } else {
        setTroubleshooting(null);
      }
      if (scheduleResult.status === "fulfilled") {
        setSchedule(scheduleResult.value);
        setScheduleForm(scheduleToForm(scheduleResult.value));
      } else {
        setSchedule(null);
        setScheduleForm(emptyScheduleForm);
        setScheduleError(scheduleResult.reason instanceof Error ? scheduleResult.reason.message : "Não foi possível carregar o agendamento.");
      }
    } finally {
      setOperationsLoading(false);
      setScheduleLoading(false);
    }
  }

  useEffect(() => {
    if (!canManage) {
      setLoading(false);
      return;
    }
    void loadConnections();
  }, [canManage]);

  useEffect(() => {
    if (!selectedConnectionId && connections.length > 0) {
      setSelectedConnectionId(connections[0].id);
    }
  }, [connections, selectedConnectionId]);

  useEffect(() => {
    if (!canManage || !selectedConnectionId) {
      setOperationsSummary(null);
      setTroubleshooting(null);
      setSchedule(null);
      setScheduleForm(emptyScheduleForm);
      setOperationsLoading(false);
      setScheduleLoading(false);
      return;
    }
    void loadConnectionOperations(selectedConnectionId);
  }, [canManage, selectedConnectionId]);

  useEffect(() => {
    if (!canManage || !selectedConnectionId) {
      setInventoryPage(null);
      setInventoryError("");
      setInventoryLoading(false);
      return;
    }
    let cancelled = false;
    setInventoryLoading(true);
    setInventoryError("");
    void (async () => {
      try {
        const payload = await listDataLakeInventory(selectedConnectionId, {
          page: inventoryPageIndex,
          page_size: inventoryPageSize,
          layer: inventoryLayerFilter || null,
          name: inventoryNameFilter.trim() || null,
          status: inventoryStatusFilter || null,
          has_partitions:
            inventoryPartitionsFilter === "true" ? true : inventoryPartitionsFilter === "false" ? false : null,
          freshness_state: inventoryFreshnessFilter || null,
        });
        if (!cancelled) {
          setInventoryPage(payload);
        }
      } catch (err) {
        if (!cancelled) {
          setInventoryError(err instanceof Error ? err.message : "Não foi possível carregar o inventário do Data Lake.");
        }
      } finally {
        if (!cancelled) {
          setInventoryLoading(false);
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [
    canManage,
    selectedConnectionId,
    inventoryPageIndex,
    inventoryPageSize,
    inventoryLayerFilter,
    inventoryNameFilter,
    inventoryStatusFilter,
    inventoryPartitionsFilter,
    inventoryFreshnessFilter,
  ]);

  useEffect(() => {
    setInventoryPageIndex(1);
  }, [selectedConnectionId, inventoryLayerFilter, inventoryNameFilter, inventoryStatusFilter, inventoryPartitionsFilter, inventoryFreshnessFilter]);

  const stats = useMemo(() => {
    const total = connections.length;
    const active = connections.filter((item) => item.is_active).length;
    const successful = connections.filter((item) => item.last_test_status === "success").length;
    const failing = connections.filter((item) => item.last_test_status && item.last_test_status !== "success").length;
    return { total, active, successful, failing };
  }, [connections]);

  const operationalSignals = operationsSummary?.issues.length ?? 0;
  const selectedConnection = connections.find((item) => item.id === selectedConnectionId) ?? null;
  const overallHealth = useMemo(() => {
    if (stats.total === 0) {
      return {
        label: "Sem conexão",
        tone: "neutral" as const,
        detail: "Ainda não há conexão salva para testar ou inventariar o Data Lake.",
      };
    }
    if (stats.failing > 0 && operationalSignals > 0) {
      return {
        label: "Atenção",
        tone: "warning" as const,
        detail: `${stats.failing} conexão(ões) com falha e ${operationalSignals} sinal(is) operacional(is).`,
      };
    }
    if (stats.failing > 0) {
      return {
        label: "Atenção",
        tone: "warning" as const,
        detail: `${stats.failing} conexão(ões) com falha de teste.`,
      };
    }
    if (operationalSignals > 0) {
      return {
        label: "Atenção operacional",
        tone: "warning" as const,
        detail: `${operationalSignals} sinal(is) operacional(is) exigem revisão no último scan.`,
      };
    }
    return {
      label: "Saudável",
      tone: "success" as const,
      detail: "Conexões validadas e sinais operacionais estáveis na leitura atual.",
    };
  }, [operationalSignals, stats.failing, stats.total]);

  function parseDateOrNull(value: string | null): Date | null {
    if (!value) return null;
    const parsed = new Date(value);
    return Number.isNaN(parsed.getTime()) ? null : parsed;
  }

  function tableFreshnessFor(item: DataLakeInventoryTable, connection: DataLakeConnection | null) {
    const lastModified = parseDateOrNull(item.last_modified_at);
    if (!connection) {
      return { label: "Sem contexto", tone: "neutral" as const, detail: "Selecione uma conexão para calcular freshness." };
    }
    if (!lastModified) {
      return { label: "Sem atualização", tone: "warning" as const, detail: "Não foi possível identificar atualização recente para esta tabela." };
    }
    const slaHours =
      (item.freshness_sla_hours_override && item.freshness_sla_hours_override > 0
        ? item.freshness_sla_hours_override
        : item.layer === "bronze" && connection.freshness_sla_hours_bronze && connection.freshness_sla_hours_bronze > 0
          ? connection.freshness_sla_hours_bronze
          : item.layer === "silver" && connection.freshness_sla_hours_silver && connection.freshness_sla_hours_silver > 0
            ? connection.freshness_sla_hours_silver
            : item.layer === "gold" && connection.freshness_sla_hours_gold && connection.freshness_sla_hours_gold > 0
              ? connection.freshness_sla_hours_gold
              : connection.freshness_sla_hours_default && connection.freshness_sla_hours_default > 0
                ? connection.freshness_sla_hours_default
                : 168) || 168;
    const ageHours = Math.max(0, (Date.now() - lastModified.getTime()) / 36e5);
    if (ageHours <= slaHours) {
      return { label: "Fresh", tone: "success" as const, detail: `Dentro do SLA configurado (${slaHours}h).` };
    }
    if (ageHours <= slaHours * 1.5) {
      return { label: "Atenção", tone: "warning" as const, detail: `Levemente acima do SLA configurado (${slaHours}h).` };
    }
    return { label: "Sem atualização recente", tone: "danger" as const, detail: `Fora do SLA configurado (${slaHours}h).` };
  }

  function clearForm() {
    setEditingId(null);
    setForm(emptyForm);
  }

  function openCreateConnection() {
    clearForm();
    setConnectionDialogMode("create");
    setConnectionDialogOpen(true);
  }

  function editConnection(connection: DataLakeConnection) {
    setEditingId(connection.id);
    setConnectionDialogMode("edit");
    setForm({
      name: connection.name,
      description: connection.description ?? "",
      bucket: connection.bucket,
      region: connection.region,
      prefix: connection.prefix ?? "",
      auth_type: connection.auth_type,
      freshness_sla_hours_default: connection.freshness_sla_hours_default?.toString() || "",
      freshness_sla_hours_bronze: connection.freshness_sla_hours_bronze?.toString() || "",
      freshness_sla_hours_silver: connection.freshness_sla_hours_silver?.toString() || "",
      freshness_sla_hours_gold: connection.freshness_sla_hours_gold?.toString() || "",
      aws_access_key_id: connection.aws_access_key_id ?? "",
      aws_secret_access_key: "",
      aws_session_token: "",
      role_arn: connection.role_arn ?? "",
      is_active: connection.is_active,
    });
    setConnectionDialogOpen(true);
  }

  async function handleSave(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setError("");
    try {
      const payload = buildPayload(form);
      if (editingId) {
        await updateDataLakeConnection(editingId, payload);
        setToast("Conexão atualizada.");
      } else {
        const created = await createDataLakeConnection(payload);
        setEditingId(created.id);
        setToast("Conexão criada.");
      }
      setConnectionDialogOpen(false);
      await loadConnections();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Não foi possível salvar a conexão.");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(connection: DataLakeConnection) {
    if (!window.confirm(`Excluir a conexão ${connection.name}?`)) return;
    setError("");
    try {
      await deleteDataLakeConnection(connection.id);
      setToast("Conexão removida.");
      if (editingId === connection.id) {
        clearForm();
      }
      if (selectedConnectionId === connection.id) {
        setSelectedConnectionId(null);
      }
      await loadConnections();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Não foi possível remover a conexão.");
    }
  }

  async function handleTest(connectionId: number) {
    setTestingId(connectionId);
    setError("");
    try {
      const result = await testDataLakeConnection(connectionId);
      setTestResult(result);
      setTestResultConnectionId(connectionId);
      setToast(result.ok ? `Teste concluído: ${result.message}` : `Teste com atenção: ${result.message}`);
      await loadConnections();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Não foi possível testar a conexão.");
    } finally {
      setTestingId(null);
    }
  }

  async function handleRefreshInventory() {
    if (!selectedConnectionId) return;
    setInventoryScanning(true);
    setInventoryError("");
    try {
      const result = await scanDataLakeInventory(selectedConnectionId);
      setToast(result.job_status === "queued" ? "Inventário enfileirado para processamento." : "Inventário atualizado.");
      setInventoryPageIndex(1);
      const payload = await listDataLakeInventory(selectedConnectionId, {
        page: 1,
        page_size: inventoryPageSize,
        layer: inventoryLayerFilter || null,
        name: inventoryNameFilter.trim() || null,
        status: inventoryStatusFilter || null,
        has_partitions:
          inventoryPartitionsFilter === "true" ? true : inventoryPartitionsFilter === "false" ? false : null,
        freshness_state: inventoryFreshnessFilter || null,
      });
      setInventoryPage(payload);
      await loadConnectionOperations(selectedConnectionId);
    } catch (err) {
      setInventoryError(err instanceof Error ? err.message : "Não foi possível atualizar o inventário.");
    } finally {
      setInventoryScanning(false);
    }
  }

  async function handleSaveSchedule(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!selectedConnectionId) return;
    setScheduleSaving(true);
    setScheduleError("");
    try {
      const payload = buildSchedulePayload(scheduleForm);
      const saved = await upsertDataLakeScanSchedule(selectedConnectionId, payload);
      setSchedule(saved);
      setScheduleForm(scheduleToForm(saved));
      setToast("Agendamento salvo.");
      await loadConnectionOperations(selectedConnectionId);
    } catch (err) {
      setScheduleError(err instanceof Error ? err.message : "Não foi possível salvar o agendamento.");
    } finally {
      setScheduleSaving(false);
    }
  }

  async function handleDeleteSchedule() {
    if (!selectedConnectionId) return;
    if (!window.confirm("Remover o agendamento deste Data Lake?")) return;
    setScheduleSaving(true);
    setScheduleError("");
    try {
      await deleteDataLakeScanSchedule(selectedConnectionId);
      setSchedule(null);
      setScheduleForm(emptyScheduleForm);
      setToast("Agendamento removido.");
      await loadConnectionOperations(selectedConnectionId);
    } catch (err) {
      setScheduleError(err instanceof Error ? err.message : "Não foi possível remover o agendamento.");
    } finally {
      setScheduleSaving(false);
    }
  }

  function formatBytes(value: number): string {
    if (!Number.isFinite(value) || value <= 0) return "0 B";
    const units = ["B", "KB", "MB", "GB", "TB"];
    let size = value;
    let unitIndex = 0;
    while (size >= 1024 && unitIndex < units.length - 1) {
      size /= 1024;
      unitIndex += 1;
    }
    return `${size.toFixed(size >= 10 || unitIndex === 0 ? 0 : 1)} ${units[unitIndex]}`;
  }

  function buildSchedulePayload(formValue: DataLakeScheduleForm): DataLakeScanScheduleInput {
    const parseOptionalNumber = (value: string): number | null => {
      const trimmed = value.trim();
      if (!trimmed) return null;
      const parsed = Number(trimmed);
      return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
    };
    return {
      schedule_mode: formValue.schedule_mode || "manual",
      schedule_enabled: formValue.schedule_enabled,
      schedule_every_minutes: parseOptionalNumber(formValue.schedule_every_minutes),
      schedule_time: formValue.schedule_time.trim() || null,
      schedule_day_of_week: formValue.schedule_day_of_week.trim() ? Number(formValue.schedule_day_of_week) : null,
      schedule_day_of_month: formValue.schedule_day_of_month.trim() ? Number(formValue.schedule_day_of_month) : null,
      schedule_anchor_date: formValue.schedule_anchor_date.trim() ? `${formValue.schedule_anchor_date.trim()}T00:00:00Z` : null,
    };
  }

  function renderConnectionDialog() {
    if (!connectionDialogOpen) return null;
    return (
      <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-slate-950/60 p-4 py-8 backdrop-blur-sm">
        <button aria-label="Fechar modal" className="absolute inset-0 cursor-default" onClick={() => setConnectionDialogOpen(false)} type="button" />
        <div className="relative z-10 w-full max-w-4xl overflow-hidden rounded-3xl border border-border/80 bg-surface shadow-card">
          <div className="border-b border-border bg-[linear-gradient(135deg,#f8fafc_0%,#ffffff_60%,#eef6ff_100%)] px-6 py-5">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-brand-600">Configuração segura</p>
                <h3 className="mt-1 text-2xl font-semibold tracking-tight text-text">
                  {connectionDialogMode === "edit" ? "Editar conexão" : "Nova conexão"}
                </h3>
                <p className="mt-2 text-sm leading-6 text-text-body">{authHelpText(form.auth_type)}</p>
              </div>
              <Button onClick={() => setConnectionDialogOpen(false)} size="sm" variant="ghost" type="button">
                Fechar
              </Button>
            </div>
          </div>
          <div className="max-h-[calc(100vh-7rem)] overflow-y-auto p-6">
            <form className="space-y-5" onSubmit={handleSave}>
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2 md:col-span-2">
                  <label className="text-sm font-medium text-text-body" htmlFor="datalake-name">
                    Nome da conexão
                  </label>
                  <Input id="datalake-name" onChange={(event) => setForm((current) => ({ ...current, name: event.target.value }))} value={form.name} />
                </div>
                <div className="space-y-2 md:col-span-2">
                  <label className="text-sm font-medium text-text-body" htmlFor="datalake-description">
                    Descrição
                  </label>
                  <Textarea
                    id="datalake-description"
                    onChange={(event) => setForm((current) => ({ ...current, description: event.target.value }))}
                    value={form.description}
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium text-text-body" htmlFor="datalake-bucket">
                    Bucket
                  </label>
                  <Input id="datalake-bucket" onChange={(event) => setForm((current) => ({ ...current, bucket: event.target.value }))} value={form.bucket} />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium text-text-body" htmlFor="datalake-region">
                    Região AWS
                  </label>
                  <Input id="datalake-region" onChange={(event) => setForm((current) => ({ ...current, region: event.target.value }))} value={form.region} />
                </div>
                <div className="space-y-2 md:col-span-2">
                  <label className="text-sm font-medium text-text-body" htmlFor="datalake-prefix">
                    Prefixo / base path
                  </label>
                  <Input
                    id="datalake-prefix"
                    onChange={(event) => setForm((current) => ({ ...current, prefix: event.target.value }))}
                    placeholder="bronze/clientes, silver/pedidos"
                    value={form.prefix}
                  />
                  <p className="text-xs text-muted">
                    O valor informado é tratado como raiz recursiva. Separe múltiplos prefixos por vírgula ou quebra de linha se precisar testar mais de uma raiz.
                  </p>
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium text-text-body" htmlFor="datalake-sla-default">
                    SLA global (h)
                  </label>
                  <Input
                    id="datalake-sla-default"
                    min="1"
                    onChange={(event) => setForm((current) => ({ ...current, freshness_sla_hours_default: event.target.value }))}
                    placeholder="168"
                    type="number"
                    value={form.freshness_sla_hours_default}
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium text-text-body" htmlFor="datalake-sla-bronze">
                    SLA bronze (h)
                  </label>
                  <Input
                    id="datalake-sla-bronze"
                    min="1"
                    onChange={(event) => setForm((current) => ({ ...current, freshness_sla_hours_bronze: event.target.value }))}
                    placeholder="72"
                    type="number"
                    value={form.freshness_sla_hours_bronze}
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium text-text-body" htmlFor="datalake-sla-silver">
                    SLA silver (h)
                  </label>
                  <Input
                    id="datalake-sla-silver"
                    min="1"
                    onChange={(event) => setForm((current) => ({ ...current, freshness_sla_hours_silver: event.target.value }))}
                    placeholder="168"
                    type="number"
                    value={form.freshness_sla_hours_silver}
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium text-text-body" htmlFor="datalake-sla-gold">
                    SLA gold (h)
                  </label>
                  <Input
                    id="datalake-sla-gold"
                    min="1"
                    onChange={(event) => setForm((current) => ({ ...current, freshness_sla_hours_gold: event.target.value }))}
                    placeholder="24"
                    type="number"
                    value={form.freshness_sla_hours_gold}
                  />
                </div>
                <div className="space-y-2 md:col-span-2">
                  <label className="text-sm font-medium text-text-body" htmlFor="datalake-auth-type">
                    Tipo de autenticação
                  </label>
                  <Select
                    id="datalake-auth-type"
                    onChange={(event) => setForm((current) => ({ ...current, auth_type: event.target.value as DataLakeAuthType }))}
                    value={form.auth_type}
                  >
                    <option value="default_environment">Credenciais padrão do ambiente</option>
                    <option value="access_key_secret_key">Access key + secret key</option>
                    <option value="access_key_secret_key_session_token">Access key + secret key + session token</option>
                    <option value="role_arn">Role ARN / IAM role</option>
                  </Select>
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium text-text-body" htmlFor="datalake-access-key">
                    AWS access key id
                  </label>
                  <Input
                    id="datalake-access-key"
                    onChange={(event) => setForm((current) => ({ ...current, aws_access_key_id: event.target.value }))}
                    placeholder="AKIA..."
                    value={form.aws_access_key_id}
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium text-text-body" htmlFor="datalake-secret">
                    AWS secret access key
                  </label>
                  <Input
                    id="datalake-secret"
                    onChange={(event) => setForm((current) => ({ ...current, aws_secret_access_key: event.target.value }))}
                    placeholder="Somente ao criar/rotacionar"
                    type="password"
                    value={form.aws_secret_access_key}
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium text-text-body" htmlFor="datalake-token">
                    AWS session token
                  </label>
                  <Input
                    id="datalake-token"
                    onChange={(event) => setForm((current) => ({ ...current, aws_session_token: event.target.value }))}
                    placeholder="Opcional"
                    type="password"
                    value={form.aws_session_token}
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium text-text-body" htmlFor="datalake-role-arn">
                    Role ARN
                  </label>
                  <Input
                    id="datalake-role-arn"
                    onChange={(event) => setForm((current) => ({ ...current, role_arn: event.target.value }))}
                    placeholder="arn:aws:iam::123456789012:role/..."
                    value={form.role_arn}
                  />
                </div>
                <div className="md:col-span-2">
                  <label className="flex items-center gap-2 text-sm font-medium text-text-body">
                    <input
                      checked={form.is_active}
                      className="h-4 w-4 rounded border-border-strong text-brand-600 focus:ring-brand-500"
                      onChange={(event) => setForm((current) => ({ ...current, is_active: event.target.checked }))}
                      type="checkbox"
                    />
                    Conexão ativa
                  </label>
                </div>
              </div>
              <div className="rounded-2xl border border-border bg-bg-subtle px-4 py-3 text-xs text-muted">
                Segredos não são retornados completos pela API. Ao salvar, campos vazios preservam a credencial anterior.
              </div>
              <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border pt-4">
                <div className="text-xs text-muted">O teste valida bucket, região, prefixo e credenciais antes do inventário.</div>
                <div className="flex flex-wrap gap-2">
                  {editingId ? (
                    <Button disabled={testingId === editingId} onClick={() => void handleTest(editingId)} size="sm" type="button" variant="outline">
                      <TestTube2 className="mr-2 h-4 w-4" />
                      {testingId === editingId ? "Testando..." : "Testar conexão"}
                    </Button>
                  ) : null}
                  <Button disabled={saving} size="sm" type="submit">
                    <CheckCircle2 className="mr-2 h-4 w-4" />
                    {saving ? "Salvando..." : "Salvar conexão"}
                  </Button>
                </div>
              </div>
            </form>
          </div>
        </div>
      </div>
    );
  }

  if (!canManage) {
    return (
      <EmptyState
        description="Esta área é reservada ao administrador para criar, testar e remover conexões do Data Lake."
        title="403"
      />
    );
  }

  if (loading && connections.length === 0) {
    return (
      <div className="space-y-6 pb-6">
        <Skeleton className="h-36 w-full" />
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {Array.from({ length: 4 }).map((_, index) => (
            <Skeleton className="h-28 w-full" key={index} />
          ))}
        </div>
        <div className="grid gap-4 xl:grid-cols-[0.95fr_1.05fr]">
          <Skeleton className="h-[780px] w-full" />
          <Skeleton className="h-[780px] w-full" />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-6">
      {renderConnectionDialog()}
      <Card className="border-border/80 bg-[linear-gradient(135deg,#ffffff_0%,#f8fafc_55%,#eef6ff_100%)] shadow-card">
        <CardContent className="space-y-4 p-6">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <div className="inline-flex items-center gap-2 rounded-full border border-brand-200 bg-surface px-3 py-1 text-xs font-medium text-brand-700">
                <ShieldAlert className="h-3.5 w-3.5" />
                Integrações · Data Lake
              </div>
              <h2 className="mt-3 text-3xl font-semibold tracking-tight text-text">Conexões seguras com AWS S3</h2>
              <p className="mt-2 max-w-4xl text-sm leading-7 text-text-body">
                Configure conexões seguras com buckets e prefixos do Data Lake. A tela separa saúde da conexão, operação, agendamento, troubleshooting e inventário para reduzir ruído.
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <Badge tone={overallHealth.tone}>{overallHealth.label}</Badge>
              <Button onClick={() => void loadConnections()} size="sm" variant="outline">
                <RefreshCw className="mr-2 h-4 w-4" />
                Recarregar
              </Button>
              <Button onClick={openCreateConnection} size="sm">
                <Plus className="mr-2 h-4 w-4" />
                Nova conexão
              </Button>
            </div>
          </div>
          <div className="grid gap-3 text-sm text-text-body md:grid-cols-4">
            <div className="rounded-2xl border border-border/80 bg-bg-subtle/80 p-4">
              <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-brand-600">Conexões</p>
              <p className="mt-2 text-3xl font-semibold text-text">{stats.total}</p>
            </div>
            <div className="rounded-2xl border border-border/80 bg-bg-subtle/80 p-4">
              <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-brand-600">Ativas</p>
              <p className="mt-2 text-3xl font-semibold text-text">{stats.active}</p>
            </div>
            <div className="rounded-2xl border border-border/80 bg-bg-subtle/80 p-4">
              <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-brand-600">Testes bem-sucedidos</p>
              <p className="mt-2 text-3xl font-semibold text-text">{stats.successful}</p>
            </div>
            <div className="rounded-2xl border border-border/80 bg-bg-subtle/80 p-4">
              <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-brand-600">Conexões com falha</p>
              <p className="mt-2 text-3xl font-semibold text-text">{stats.failing}</p>
            </div>
          </div>
          <div className="grid gap-3 md:grid-cols-[1.2fr_0.8fr]">
            <div className="rounded-2xl border border-border/80 bg-surface/80 p-4">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-brand-600">Leitura rápida</p>
              <p className="mt-2 text-sm font-medium text-text">{overallHealth.detail}</p>
              <p className="mt-1 text-xs text-muted">
                {stats.failing} conexão(ões) com falha · {operationalSignals} sinal(is) operacional(is) · {operationsSummary?.tables_without_recent_update ?? 0} tabelas sem atualização recente
              </p>
            </div>
            <div className="rounded-2xl border border-border/80 bg-surface/80 p-4">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-brand-600">Próximo passo</p>
              <p className="mt-2 text-sm font-medium text-text">
                {operationsSummary?.tables_without_recent_update
                  ? "Reescanear inventário e revisar SLA de freshness."
                  : "Validar conexão, seguir para o inventário ou abrir o detalhe da tabela."}
              </p>
            </div>
          </div>
          {error ? <Banner description={error} icon={<ShieldAlert className="h-4 w-4" />} tone="error" title="Falha ao carregar Data Lake" /> : null}
          {toast ? <Banner description={toast} icon={<CheckCircle2 className="h-4 w-4" />} tone="success" title="Atualização concluída" /> : null}
        </CardContent>
      </Card>

      <ContextualJourneyCard
        description="Use os atalhos para sair da configuração técnica e continuar a investigação no catálogo, na operação e nas trilhas de governança."
        links={[
          { label: "Datalakes Explorer", href: "/datalakes", description: "Navegar por conexão, camada e tabela descoberta.", tone: "neutral" },
          { label: "Ops Cockpit", href: "/ops/cockpit", description: "Correlacionar freshness, filas e execução operacional.", tone: "accent" },
          { label: "Data Quality", href: "/data-quality", description: "Revisar score, freshness e sinais de qualidade.", tone: "success" },
          { label: "Ingestion", href: "/ops/ingestion", description: "Ver pipelines que alimentam este lake.", tone: "warning" },
        ]}
        title="Jornadas principais"
      />

      <div className="grid gap-4 xl:grid-cols-[0.95fr_1.05fr]">
        <div className="space-y-4">
          <Card className="border-border/80 bg-surface shadow-card">
            <CardHeader className="space-y-2 border-b border-border px-6 py-5">
              <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-brand-600">Como usar</p>
              <h3 className="text-2xl font-semibold tracking-tight text-text">Como usar a integração com Data Lake</h3>
              <p className="text-sm leading-6 text-text-body">
                Esta área conecta o t2c_data ao S3, descobre tabelas por prefixo e mantém sinais leves de operação, freshness, estrutura e qualidade.
              </p>
            </CardHeader>
            <CardContent className="space-y-3 p-6">
              <ol className="space-y-2 text-sm text-text-body">
                <li>1. Configure bucket, região e prefixos.</li>
                <li>2. Teste credenciais, role ou credenciais do ambiente.</li>
                <li>3. Execute ou agende o scan do inventário.</li>
                <li>4. Revise bronze, silver e gold descobertos.</li>
                <li>5. Reescanear quando o freshness ficar atrasado.</li>
              </ol>
            </CardContent>
          </Card>
          <Card className="border-border/80 bg-surface shadow-card">
            <CardHeader className="space-y-2 border-b border-border px-6 py-5">
              <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-brand-600">Conceitos principais</p>
              <h3 className="text-2xl font-semibold tracking-tight text-text">Vocabulário da operação</h3>
            </CardHeader>
            <CardContent className="grid gap-3 p-6 sm:grid-cols-2">
              {[
                { title: "Bucket", body: "Contêiner S3 onde os arquivos do lake estão armazenados.", icon: BookOpen },
                { title: "Prefixo", body: "Raiz usada para descobrir tabelas, por exemplo bronze/clientes.", icon: Layers3 },
                { title: "Scan", body: "Leitura recursiva do bucket para descobrir tabelas, arquivos e partições.", icon: RefreshCw },
                { title: "Freshness", body: "Tempo desde a última atualização observada dentro do SLA.", icon: Sparkles },
                { title: "SLA", body: "Janela máxima esperada desde a última atualização.", icon: AlertTriangle },
                { title: "Drift", body: "Mudança estrutural entre leituras, como schema ou partição.", icon: ShieldAlert },
              ].map((item) => {
                const Icon = item.icon;
                return (
                  <div className="rounded-2xl border border-border bg-bg-subtle px-4 py-3" key={item.title}>
                    <div className="flex items-start gap-3">
                      <div className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-border bg-surface text-text-body">
                        <Icon className="h-4 w-4" />
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-semibold text-text">{item.title}</p>
                        <p className="mt-1 text-sm leading-6 text-text-body">{item.body}</p>
                      </div>
                    </div>
                  </div>
                );
              })}
            </CardContent>
          </Card>
        </div>

        <Card className="border-border/80 bg-surface shadow-card">
          <CardHeader className="space-y-2 border-b border-border px-6 py-5">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-brand-600">Saúde da integração</p>
                <h3 className="text-2xl font-semibold tracking-tight text-text">Conexões, testes e scans do Data Lake</h3>
                <p className="text-sm leading-6 text-text-body">Leitura resumida da saúde técnica e dos sinais operacionais da integração.</p>
              </div>
              <Badge tone={overallHealth.tone}>{overallHealth.label}</Badge>
            </div>
          </CardHeader>
          <CardContent className="space-y-4 p-6">
            <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
              <div className="rounded-2xl border border-border/80 bg-bg-subtle/80 p-4">
                <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-brand-600">Conexões cadastradas</p>
                <p className="mt-2 text-3xl font-semibold text-text">{stats.total}</p>
              </div>
              <div className="rounded-2xl border border-border/80 bg-bg-subtle/80 p-4">
                <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-brand-600">Conexões ativas</p>
                <p className="mt-2 text-3xl font-semibold text-text">{stats.active}</p>
              </div>
              <div className="rounded-2xl border border-border/80 bg-bg-subtle/80 p-4">
                <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-brand-600">Testes bem-sucedidos</p>
                <p className="mt-2 text-3xl font-semibold text-text">{stats.successful}</p>
              </div>
              <div className="rounded-2xl border border-border/80 bg-bg-subtle/80 p-4">
                <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-brand-600">Conexões com falha</p>
                <p className="mt-2 text-3xl font-semibold text-text">{stats.failing}</p>
              </div>
            </div>
            <div className="grid gap-3 md:grid-cols-2">
              <div className="rounded-2xl border border-border bg-surface px-4 py-3">
                <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-brand-600">Sinais operacionais</p>
                <p className="mt-2 text-2xl font-semibold text-text">{operationalSignals}</p>
                <p className="mt-1 text-xs text-muted">Freshness, drift, falhas de leitura e outras anotações do último scan.</p>
              </div>
              <div className="rounded-2xl border border-border bg-surface px-4 py-3">
                <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-brand-600">Tabelas sem atualização</p>
                <p className="mt-2 text-2xl font-semibold text-text">{operationsSummary?.tables_without_recent_update ?? 0}</p>
                <p className="mt-1 text-xs text-muted">Tabelas fora da janela de freshness esperada.</p>
              </div>
            </div>
            <div className="rounded-2xl border border-border/80 bg-bg-subtle/80 p-4">
              <p className="text-sm font-medium text-text">{overallHealth.detail}</p>
              <p className="mt-1 text-xs text-muted">
                {stats.failing} conexão(ões) com falha · {operationalSignals} sinal(is) operacional(is) · {operationsSummary?.tables_without_recent_update ?? 0} tabelas fora do freshness esperado
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 xl:grid-cols-2">
        <Card className="border-border/80 bg-surface shadow-card">
          <CardHeader className="space-y-2 border-b border-border px-6 py-5">
            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-brand-600">Atenção imediata</p>
            <h3 className="text-2xl font-semibold tracking-tight text-text">Sinais que pedem revisão operacional</h3>
            <p className="text-sm leading-6 text-text-body">Priorizamos freshness atrasado, falhas de conexão e drift antes dos itens saudáveis.</p>
          </CardHeader>
          <CardContent className="space-y-3 p-6">
            {[
              {
                title: "Dados sem atualização recente",
                detail: `${operationsSummary?.tables_without_recent_update ?? 0} tabela(s) fora do freshness esperado.`,
                tone: (operationsSummary?.tables_without_recent_update ?? 0) > 0 ? "warning" : "success",
              },
              {
                title: "Conexões com falha",
                detail: `${stats.failing} conexão(ões) com teste não concluído com sucesso.`,
                tone: stats.failing > 0 ? "warning" : "success",
              },
              {
                title: "Drift detectado",
                detail: `${operationsSummary?.tables_with_drift ?? 0} tabela(s) com variação estrutural entre leituras.`,
                tone: (operationsSummary?.tables_with_drift ?? 0) > 0 ? "warning" : "success",
              },
              {
                title: "Silver / Gold ausentes",
                detail:
                  inventoryPage?.summary.total_tables && inventoryPage.summary.silver_tables === 0 && inventoryPage.summary.gold_tables === 0
                    ? "Pode ser esperado se o prefixo atual cobre apenas bronze."
                    : "As camadas de maior maturidade já foram descobertas ou não se aplicam ao recorte atual.",
                tone: "neutral",
              },
            ].map((item) => (
              <div
                className={cn(
                  "rounded-2xl border px-4 py-3",
                  item.tone === "warning"
                    ? "border-warning-200 bg-warning-50 text-warning-700"
                    : item.tone === "success"
                      ? "border-success-200 bg-success-50 text-success-700"
                      : "border-border bg-bg-subtle text-text-body",
                )}
                key={item.title}
              >
                <p className="text-sm font-semibold">{item.title}</p>
                <p className="mt-1 text-sm opacity-90">{item.detail}</p>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card className="border-border/80 bg-surface shadow-card">
          <CardHeader className="space-y-2 border-b border-border px-6 py-5">
            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-brand-600">Próximas ações recomendadas</p>
            <h3 className="text-2xl font-semibold tracking-tight text-text">O que fazer agora</h3>
            <p className="text-sm leading-6 text-text-body">Use as ações para validar credenciais, reescanear e revisar o inventário atrasado.</p>
          </CardHeader>
          <CardContent className="space-y-3 p-6">
            {[
              {
                title: "Reescanear a conexão",
                severity: "warning",
                reason: "Atualiza o inventário e recalcula freshness, drift e qualidade.",
                impact: "Reduz o risco de decisões com base em dados desatualizados.",
                primary: "Atualizar inventário",
                secondary: "Executar scan agora",
                onPrimary: () => void handleRefreshInventory(),
              },
              {
                title: "Revisar SLAs de freshness",
                severity: "warning",
                reason: "A conexão usa SLAs por camada e o bronze atual está fora da janela esperada.",
                impact: "Ajuda a diferenciar atraso real de janela de observação longa.",
                primary: "Editar conexão",
                secondary: null,
                onPrimary: () => selectedConnection ? editConnection(selectedConnection) : openCreateConnection(),
              },
              {
                title: "Validar credenciais",
                severity: stats.failing > 0 ? "danger" : "warning",
                reason: "Se o teste falhou, bucket, região ou role podem estar incorretos.",
                impact: "Evita scans sem acesso ou com escopo errado.",
                primary: "Testar conexão",
                secondary: null,
                onPrimary: () => (selectedConnection ? void handleTest(selectedConnection.id) : openCreateConnection()),
              },
              {
                title: "Abrir o detalhe de tabela",
                severity: "neutral",
                reason: "A tabela sem atualização recente costuma explicar o sinal mais importante.",
                impact: "Mostra freshness, arquivos, partições e qualidade.",
                primary: "Ver inventário",
                secondary: null,
                onPrimary: () => {
                  if (inventoryPage?.items.length && selectedConnectionId) {
                    const staleItem =
                      inventoryPage.items.find((item) => tableFreshnessFor(item, selectedConnection).tone === "danger") ?? inventoryPage.items[0];
                    if (staleItem) {
                      router.push(`/integrations/data-lake/connections/${selectedConnectionId}/tables/${staleItem.id}`);
                    }
                  }
                },
              },
            ].map((item) => (
              <div className="rounded-2xl border border-border bg-bg-subtle p-4" key={item.title}>
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <Badge tone={item.severity === "danger" ? "danger" : item.severity === "warning" ? "warning" : "neutral"}>
                        {item.severity === "danger" ? "Crítica" : item.severity === "warning" ? "Atenção" : "Info"}
                      </Badge>
                      <p className="text-sm font-semibold text-text">{item.title}</p>
                    </div>
                    <p className="mt-2 text-sm text-text-body">{item.reason}</p>
                    <p className="mt-1 text-xs text-muted">{item.impact}</p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <Button onClick={item.onPrimary} size="sm">
                      {item.primary}
                    </Button>
                    {item.secondary ? (
                      <Button onClick={() => void handleRefreshInventory()} size="sm" variant="outline">
                        {item.secondary}
                      </Button>
                    ) : null}
                  </div>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>

      {testResult ? (
        <Card className="border-border/80 bg-surface shadow-card">
          <CardHeader className="space-y-2 border-b border-border px-6 py-5">
            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-brand-600">Diagnóstico do teste</p>
            <h3 className="text-2xl font-semibold tracking-tight text-text">
              {testResultConnectionId ? `Conexão ${testResultConnectionId}` : "Último teste"}
            </h3>
            <p className="text-sm leading-6 text-text-body">
              O painel abaixo mostra o resultado do teste, os prefixos detectados e como o prefixo informado foi tratado na busca recursiva pelo bucket.
            </p>
          </CardHeader>
          <CardContent className="space-y-4 p-6">
            <div className={cn("rounded-2xl border px-4 py-3", testResult.ok ? "border-success-200 bg-success-50 text-success-700" : "border-warning-200 bg-warning-50 text-warning-700")}>
              <p className="text-sm font-semibold">{testResult.message}</p>
              {testResult.detail ? <p className="mt-1 text-sm opacity-90">{testResult.detail}</p> : null}
              <p className="mt-1 text-xs opacity-80">
                Bucket acessível: {testResult.bucket_accessible ? "sim" : "não"} · Prefixo acessível: {testResult.prefix_accessible ? "sim" : "não"} · Objetos encontrados: {testResult.prefix_object_count} · Parquet: {testResult.parquet_files_count}
              </p>
            </div>
            {!testResult.ok ? (
              <div className="rounded-2xl border border-danger-200 bg-danger-50 px-4 py-3 text-sm text-danger-700">
                Falha real na validação AWS. O backend tentou listar o S3 e retornou erro explícito, então isso não é um inventário vazio.
              </div>
            ) : null}
            <div className="grid gap-3 md:grid-cols-3">
              <div className="rounded-2xl border border-border bg-bg-subtle px-4 py-3">
                <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-brand-600">Modo de credencial</p>
                <p className="mt-2 truncate text-sm font-semibold text-text">{testResult.credentials_mode}</p>
                <p className="mt-1 text-xs text-muted">Fonte efetiva usada para assinar as chamadas AWS.</p>
              </div>
              <div className="rounded-2xl border border-border bg-bg-subtle px-4 py-3">
                <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-brand-600">Role usada</p>
                <p className="mt-2 truncate text-sm font-semibold text-text">{testResult.role_arn_used ?? "N/A"}</p>
                <p className="mt-1 text-xs text-muted">Preenchida quando o modo exige assume-role.</p>
              </div>
              <div className="rounded-2xl border border-border bg-bg-subtle px-4 py-3">
                <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-brand-600">Caller identity</p>
                <p className="mt-2 truncate text-sm font-semibold text-text">{testResult.caller_identity_arn ?? "N/A"}</p>
                <p className="mt-1 text-xs text-muted">
                  {testResult.caller_identity_account ?? "?"}
                  {testResult.caller_identity_userid ? ` · ${testResult.caller_identity_userid}` : ""}
                </p>
              </div>
            </div>
            <div className="grid gap-3 md:grid-cols-4">
              <div className="rounded-2xl border border-border bg-bg-subtle px-4 py-3">
                <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-brand-600">Objetos encontrados</p>
                <p className="mt-2 text-2xl font-semibold text-text">{testResult.prefix_object_count}</p>
                <p className="mt-1 text-xs text-muted">Listagem recursiva a partir da raiz informada.</p>
              </div>
              <div className="rounded-2xl border border-border bg-bg-subtle px-4 py-3">
                <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-brand-600">Parquet encontrados</p>
                <p className="mt-2 text-2xl font-semibold text-text">{testResult.parquet_files_count}</p>
                <p className="mt-1 text-xs text-muted">Arquivos parquet válidos no escopo testado.</p>
              </div>
              <div className="rounded-2xl border border-border bg-bg-subtle px-4 py-3">
                <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-brand-600">Tabelas candidatas</p>
                <p className="mt-2 text-2xl font-semibold text-text">{testResult.table_candidates.length}</p>
                <p className="mt-1 text-xs text-muted">Reconhecidas a partir dos caminhos parquet.</p>
              </div>
              <div className="rounded-2xl border border-border bg-bg-subtle px-4 py-3">
                <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-brand-600">Exemplo de caminho</p>
                <p className="mt-2 truncate text-sm font-semibold text-text">{testResult.example_paths[0] ?? "Nenhum"}</p>
                <p className="mt-1 text-xs text-muted">Primeiro arquivo parquet encontrado na busca recursiva.</p>
              </div>
            </div>
            {testResult.bucket_prefixes.length > 0 ? (
              <div className="grid gap-3 md:grid-cols-3">
                <div className="rounded-2xl border border-border bg-bg-subtle px-4 py-3">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-brand-600">Prefixos no bucket</p>
                  <p className="mt-2 text-2xl font-semibold text-text">{testResult.bucket_prefixes.length}</p>
                  <p className="mt-1 text-xs text-muted">Primeiro nível do bucket.</p>
                </div>
                <div className="rounded-2xl border border-border bg-bg-subtle px-4 py-3">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-brand-600">Parquet no preview</p>
                  <p className="mt-2 text-2xl font-semibold text-text">
                    {testResult.bucket_prefixes.reduce((total, item) => total + item.parquet_files_count, 0)}
                  </p>
                  <p className="mt-1 text-xs text-muted">Arquivos parquet identificados no primeiro nível.</p>
                </div>
                <div className="rounded-2xl border border-border bg-bg-subtle px-4 py-3">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-brand-600">Subpastas no preview</p>
                  <p className="mt-2 text-2xl font-semibold text-text">
                    {testResult.bucket_prefixes.reduce((total, item) => total + item.subfolders_count, 0)}
                  </p>
                  <p className="mt-1 text-xs text-muted">Pistas de particionamento ou organização hierárquica.</p>
                </div>
              </div>
            ) : null}
            {testResult.prefix_suggestion ? (
              <div className="rounded-2xl border border-info-200 bg-info-50 px-4 py-3 text-sm text-info-700">
                Você quis dizer <span className="font-semibold">{testResult.prefix_suggestion}/</span>?
              </div>
            ) : null}
            {testResult.prefix_diagnostics.length > 0 ? (
              <div className="space-y-2">
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-brand-600">Mensagem de diagnóstico</p>
                {testResult.prefix_diagnostics.map((item) => (
                  <div className="rounded-2xl border border-border bg-bg-subtle px-4 py-3 text-sm text-text-body" key={item}>
                    {item}
                  </div>
                ))}
              </div>
            ) : null}
            {testResult.bucket_prefixes.length > 0 ? (
              <div className="space-y-3">
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-brand-600">Primeiro nível do bucket</p>
                <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                  {testResult.bucket_prefixes.map((item) => (
                    <div className="rounded-2xl border border-border bg-bg-subtle px-4 py-3" key={item.prefix}>
                      <div className="flex items-center justify-between gap-2">
                        <p className="truncate text-sm font-semibold text-text">{item.prefix}/</p>
                        <Badge tone="neutral">{item.object_count} objetos</Badge>
                      </div>
                      <p className="mt-2 text-xs text-muted">
                        {item.parquet_files_count} parquet · {item.subfolders_count} subpasta(s)
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            ) : null}
            {testResult.table_candidates.length > 0 ? (
              <div className="space-y-3">
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-brand-600">Tabelas candidatas detectadas</p>
                <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                  {testResult.table_candidates.map((item) => (
                    <div className="rounded-2xl border border-border bg-bg-subtle px-4 py-3" key={item.path_base}>
                      <div className="flex items-center justify-between gap-2">
                        <p className="truncate text-sm font-semibold text-text">
                          {item.layer}/{item.table_name}
                        </p>
                        <Badge tone={item.parquet_files_count > 0 ? "success" : "warning"}>{item.parquet_files_count} parquet</Badge>
                      </div>
                      <p className="mt-2 text-xs text-muted">{item.path_base}</p>
                      <p className="mt-2 text-xs text-muted">
                        {item.files_count} objeto(s) · {item.has_partitions ? "com partições" : "sem partições"}{item.partition_pattern_detected ? ` · ${item.partition_pattern_detected}` : ""}
                      </p>
                      {item.example_path ? <p className="mt-2 truncate text-xs font-medium text-text-body">{item.example_path}</p> : null}
                    </div>
                  ))}
                </div>
              </div>
            ) : null}
            {testResult.prefix_candidates.length > 0 ? (
              <div className="rounded-2xl border border-border bg-bg-subtle px-4 py-3 text-sm text-text-body">
                <span className="font-semibold">Prefixos encontrados:</span> {testResult.prefix_candidates.map((item) => `${item}/`).join(" · ")}
              </div>
            ) : null}
          </CardContent>
        </Card>
      ) : null}

      <div className="grid gap-4 xl:grid-cols-[0.95fr_1.05fr]">
        <Card className="border-border/80 bg-surface shadow-card">
          <CardHeader className="space-y-2 border-b border-border px-6 py-5">
            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-brand-600">Configuração segura</p>
            <h3 className="text-2xl font-semibold tracking-tight text-text">Gerenciar conexão</h3>
            <p className="text-sm leading-6 text-text-body">
              Crie ou edite a conexão em um modal. O fluxo principal desta tela prioriza saúde, operação, agendamento e inventário.
            </p>
          </CardHeader>
          <CardContent className="space-y-4 p-6">
            <div className="grid gap-3 md:grid-cols-2">
              <div className="rounded-2xl border border-border bg-bg-subtle px-4 py-3">
                <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-brand-600">Conexão selecionada</p>
                <p className="mt-2 text-sm font-semibold text-text">{selectedConnection?.name ?? "Nenhuma conexão selecionada"}</p>
                <p className="mt-1 text-xs text-muted">
                  {selectedConnection ? `${selectedConnection.bucket} · ${selectedConnection.region}` : "Crie uma conexão para começar."}
                </p>
              </div>
              <div className="rounded-2xl border border-border bg-bg-subtle px-4 py-3">
                <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-brand-600">Autenticação</p>
                <p className="mt-2 text-sm font-semibold text-text">{selectedConnection ? authHelpText(selectedConnection.auth_type) : "Defina o bucket e a forma de autenticação."}</p>
              </div>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button onClick={openCreateConnection} size="sm">
                <Plus className="mr-2 h-4 w-4" />
                Nova conexão
              </Button>
              <Button disabled={inventoryScanning || !selectedConnectionId} onClick={() => void handleRefreshInventory()} size="sm" variant="outline">
                <RefreshCw className="mr-2 h-4 w-4" />
                {inventoryScanning ? "Reescanear..." : "Executar scan agora"}
              </Button>
              {selectedConnection ? (
                <Button onClick={() => editConnection(selectedConnection)} size="sm" variant="outline">
                  <Edit3 className="mr-2 h-4 w-4" />
                  Editar conexão
                </Button>
              ) : null}
            </div>
            <div className="rounded-2xl border border-border bg-surface px-4 py-3 text-sm text-text-body">
              Segredos nunca aparecem completos na tela. Para rotacionar credenciais, use o modal de conexão e informe um novo valor.
            </div>
          </CardContent>
        </Card>

        <Card className="border-border/80 bg-surface shadow-card">
          <CardHeader className="space-y-2 border-b border-border px-6 py-5">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-brand-600">Conexões salvas</p>
                <h3 className="text-2xl font-semibold tracking-tight text-text">Buckets e prefixos cadastrados</h3>
              </div>
              <Button onClick={openCreateConnection} size="sm" variant="outline">
                <Plus className="mr-2 h-4 w-4" />
                Nova conexão
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-4 p-6">
            {connections.length > 0 ? (
              <div className="space-y-3">
                {connections.map((connection) => {
                  const status = connection.last_test_status || (connection.is_active ? "default_environment" : "inactive");
                  return (
                    <div className="rounded-3xl border border-border/80 bg-bg-subtle/80 p-4 shadow-sm" key={connection.id}>
                      <div className="flex flex-wrap items-start justify-between gap-3">
                        <div className="min-w-0">
                          <div className="flex flex-wrap items-center gap-2">
                            <h4 className="truncate text-base font-semibold text-text">{connection.name}</h4>
                            <Badge tone={connection.is_active ? "success" : "neutral"}>{connection.is_active ? "Ativa" : "Inativa"}</Badge>
                            <Badge tone={formatStatusTone(status)}>{formatStatusLabel(connection.last_test_status || (connection.is_active ? "active" : "inactive"))}</Badge>
                          </div>
                          <p className="mt-1 text-sm text-text-body">
                            {connection.bucket} · {connection.region}
                            {connection.prefix ? ` · ${connection.prefix}` : ""}
                          </p>
                          <p className="mt-1 text-xs text-muted">{authHelpText(connection.auth_type)}</p>
                        </div>
                        <div className="flex flex-wrap gap-2">
                          <Button disabled={testingId === connection.id} onClick={() => void handleTest(connection.id)} size="sm" variant="outline">
                            <TestTube2 className="mr-2 h-4 w-4" />
                            {testingId === connection.id ? "Testando..." : "Testar"}
                          </Button>
                          <Button onClick={() => editConnection(connection)} size="sm" variant="outline">
                            <Edit3 className="mr-2 h-4 w-4" />
                            Editar
                          </Button>
                          <Button disabled={testingId === connection.id} onClick={() => void handleDelete(connection)} size="sm" variant="outline">
                            <Trash2 className="mr-2 h-4 w-4" />
                            Remover
                          </Button>
                        </div>
                      </div>
                      <div className="mt-4 grid gap-3 text-sm md:grid-cols-3">
                        <div className="rounded-2xl border border-border bg-surface px-4 py-3">
                          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-brand-600">Último teste</p>
                          <p className={cn("mt-1 font-medium", connection.last_test_status === "success" ? "text-success-700" : "text-text")}>
                            {connection.last_test_status ? formatStatusLabel(connection.last_test_status) : "Nunca testada"}
                          </p>
                          <p className="mt-1 text-xs text-muted">{formatDateTime(connection.last_test_at)}</p>
                        </div>
                        <div className="rounded-2xl border border-border bg-surface px-4 py-3">
                          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-brand-600">Credenciais</p>
                          <p className="mt-1 font-medium text-text">
                            {connection.auth_type === "default_environment" ? "Ambiente" : connection.aws_access_key_id || "Não informado"}
                          </p>
                          <p className="mt-1 text-xs text-muted">
                            {connection.aws_secret_access_key_configured ? "Secret configurada" : "Secret não configurada"}
                          </p>
                        </div>
                        <div className="rounded-2xl border border-border bg-surface px-4 py-3">
                          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-brand-600">Mensagem</p>
                          <p className="mt-1 line-clamp-3 text-sm leading-6 text-text-body">
                            {connection.last_test_message || "Nenhuma mensagem de teste registrada."}
                          </p>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <EmptyState
                action={
                  <Button onClick={openCreateConnection} size="sm" variant="outline">
                    <Plus className="mr-2 h-4 w-4" />
                    Criar primeira conexão
                  </Button>
                }
                description="Ainda não há conexões de Data Lake cadastradas."
                title="Sem conexões"
              />
            )}
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 xl:grid-cols-[1fr_0.95fr_0.95fr]">
        <Card className="border-border/80 bg-surface shadow-card">
          <CardHeader className="space-y-2 border-b border-border px-6 py-5">
            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-brand-600">Operação</p>
            <h3 className="text-2xl font-semibold tracking-tight text-text">Histórico operacional da integração</h3>
            <p className="text-sm leading-6 text-text-body">Último scan, volume lido, drift e sinais de atenção consolidados.</p>
          </CardHeader>
          <CardContent className="space-y-4 p-6">
            {operationsError ? <div className="rounded-2xl border border-danger-200 bg-danger-50 px-4 py-3 text-sm text-danger-700">{operationsError}</div> : null}
            {operationsLoading ? (
              <div className="space-y-3">
                <Skeleton className="h-24 w-full" />
                <Skeleton className="h-24 w-full" />
              </div>
            ) : operationsSummary ? (
              <>
                <div className="grid gap-3 md:grid-cols-2">
                  <div className="rounded-2xl border border-border bg-bg-subtle/80 p-4">
                    <p className="text-xs font-semibold uppercase tracking-[0.18em] text-brand-600">Último scan</p>
                    <p className="mt-2 text-sm font-medium text-text">{formatDateTime(operationsSummary.last_scan_at)}</p>
                    <p className="mt-1 text-xs text-muted">{operationsSummary.last_scan_duration_seconds ?? "N/D"} s · {formatStatusLabel(operationsSummary.last_scan_status)}</p>
                  </div>
                  <div className="rounded-2xl border border-border bg-bg-subtle/80 p-4">
                    <p className="text-xs font-semibold uppercase tracking-[0.18em] text-brand-600">Score médio</p>
                    <p className="mt-2 text-2xl font-semibold text-text">{operationsSummary.average_quality_score?.toFixed(1) ?? "N/D"}</p>
                    <p className="mt-1 text-xs text-muted">Média das últimas observações por tabela.</p>
                  </div>
                </div>
                <div className="grid gap-3 md:grid-cols-2">
                  {operationsSummary.layer_summaries.map((layer) => (
                    <div className="rounded-2xl border border-border bg-surface px-4 py-3" key={layer.layer}>
                      <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-brand-600">{layer.layer}</p>
                      <p className="mt-1 text-sm font-medium text-text">{layer.tables_count} tabela(s)</p>
                      <p className="mt-1 text-xs text-muted">
                        Score {layer.average_quality_score?.toFixed(1) ?? "N/D"} · {layer.stale_tables_count} com atraso
                      </p>
                    </div>
                  ))}
                </div>
                <div className="grid gap-3 md:grid-cols-4">
                  <div className="rounded-2xl border border-border bg-bg-subtle px-4 py-3">
                    <p className="text-xs font-semibold uppercase tracking-[0.18em] text-brand-600">Tabelas</p>
                    <p className="mt-1 text-lg font-semibold text-text">{operationsSummary.tables_total}</p>
                  </div>
                  <div className="rounded-2xl border border-border bg-bg-subtle px-4 py-3">
                    <p className="text-xs font-semibold uppercase tracking-[0.18em] text-brand-600">Com erro</p>
                    <p className="mt-1 text-lg font-semibold text-text">{operationsSummary.tables_with_error}</p>
                  </div>
                  <div className="rounded-2xl border border-border bg-bg-subtle px-4 py-3">
                    <p className="text-xs font-semibold uppercase tracking-[0.18em] text-brand-600">Sem atualização</p>
                    <p className="mt-1 text-lg font-semibold text-text">{operationsSummary.tables_without_recent_update}</p>
                  </div>
                  <div className="rounded-2xl border border-border bg-bg-subtle px-4 py-3">
                    <p className="text-xs font-semibold uppercase tracking-[0.18em] text-brand-600">Drift</p>
                    <p className="mt-1 text-lg font-semibold text-text">{operationsSummary.tables_with_drift}</p>
                  </div>
                </div>
                {operationsSummary.issues.length > 0 ? (
                  <div className="space-y-3">
                    <p className="text-xs font-semibold uppercase tracking-[0.18em] text-brand-600">Sinais de atenção</p>
                    {operationsSummary.issues.map((issue) => (
                      <div className={cn("rounded-2xl border px-4 py-3", toneClasses(issue.tone))} key={issue.key}>
                        <p className="text-sm font-semibold">{issue.label}</p>
                        {issue.detail ? <p className="mt-1 text-sm opacity-90">{issue.detail}</p> : null}
                        {issue.recommended_action ? <p className="mt-1 text-xs opacity-80">Próximo passo: {issue.recommended_action}</p> : null}
                      </div>
                    ))}
                  </div>
                ) : null}
              </>
            ) : (
              <EmptyState
                description="A operação da integração aparece aqui depois do primeiro scan."
                title="Sem histórico operacional"
              />
            )}
          </CardContent>
        </Card>

        <Card className="border-border/80 bg-surface shadow-card">
          <CardHeader className="space-y-2 border-b border-border px-6 py-5">
            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-brand-600">Agendamento</p>
            <h3 className="text-2xl font-semibold tracking-tight text-text">Scan recorrente</h3>
            <p className="text-sm leading-6 text-text-body">Configure a execução manual ou automática do inventário e da atualização de qualidade/freshness.</p>
          </CardHeader>
          <CardContent className="space-y-4 p-6">
            {scheduleError ? <div className="rounded-2xl border border-danger-200 bg-danger-50 px-4 py-3 text-sm text-danger-700">{scheduleError}</div> : null}
            {scheduleLoading ? <div className="rounded-2xl border border-border bg-bg-subtle px-4 py-3 text-sm text-text-body">Carregando agendamento...</div> : null}
            <form className="space-y-4" onSubmit={handleSaveSchedule}>
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2 md:col-span-2">
                  <label className="text-sm font-medium text-text-body" htmlFor="datalake-schedule-mode">
                    Modo
                  </label>
                  <Select
                    id="datalake-schedule-mode"
                    onChange={(event) => setScheduleForm((current) => ({ ...current, schedule_mode: event.target.value }))}
                    value={scheduleForm.schedule_mode}
                  >
                    <option value="manual">Manual</option>
                    <option value="interval">Intervalo técnico</option>
                    <option value="daily">Diário</option>
                    <option value="weekly">Semanal</option>
                    <option value="biweekly">Quinzenal</option>
                    <option value="monthly">Mensal</option>
                  </Select>
                </div>
                <div className="md:col-span-2">
                  <label className="flex items-center gap-2 text-sm font-medium text-text-body">
                    <input
                      checked={scheduleForm.schedule_enabled}
                      className="h-4 w-4 rounded border-border-strong text-brand-600 focus:ring-brand-500"
                      onChange={(event) => setScheduleForm((current) => ({ ...current, schedule_enabled: event.target.checked }))}
                      type="checkbox"
                    />
                    Habilitar agendamento
                  </label>
                </div>
                {scheduleForm.schedule_mode === "interval" ? (
                  <div className="space-y-2 md:col-span-2">
                    <label className="text-sm font-medium text-text-body" htmlFor="datalake-schedule-interval">
                      Intervalo em minutos
                    </label>
                    <Input
                      id="datalake-schedule-interval"
                      min="1"
                      onChange={(event) => setScheduleForm((current) => ({ ...current, schedule_every_minutes: event.target.value }))}
                      placeholder="360"
                      type="number"
                      value={scheduleForm.schedule_every_minutes}
                    />
                  </div>
                ) : null}
                {scheduleForm.schedule_mode !== "interval" ? (
                  <div className="space-y-2 md:col-span-2">
                    <label className="text-sm font-medium text-text-body" htmlFor="datalake-schedule-time">
                      Horário
                    </label>
                    <Input
                      id="datalake-schedule-time"
                      onChange={(event) => setScheduleForm((current) => ({ ...current, schedule_time: event.target.value }))}
                      type="time"
                      value={scheduleForm.schedule_time}
                    />
                  </div>
                ) : null}
                {scheduleForm.schedule_mode === "weekly" ? (
                  <div className="space-y-2 md:col-span-2">
                    <label className="text-sm font-medium text-text-body" htmlFor="datalake-schedule-weekday">
                      Dia da semana
                    </label>
                    <Select
                      id="datalake-schedule-weekday"
                      onChange={(event) => setScheduleForm((current) => ({ ...current, schedule_day_of_week: event.target.value }))}
                      value={scheduleForm.schedule_day_of_week}
                    >
                      <option value="0">Segunda-feira</option>
                      <option value="1">Terça-feira</option>
                      <option value="2">Quarta-feira</option>
                      <option value="3">Quinta-feira</option>
                      <option value="4">Sexta-feira</option>
                      <option value="5">Sábado</option>
                      <option value="6">Domingo</option>
                    </Select>
                  </div>
                ) : null}
                {scheduleForm.schedule_mode === "monthly" ? (
                  <div className="space-y-2 md:col-span-2">
                    <label className="text-sm font-medium text-text-body" htmlFor="datalake-schedule-monthday">
                      Dia do mês
                    </label>
                    <Input
                      id="datalake-schedule-monthday"
                      min="1"
                      max="31"
                      onChange={(event) => setScheduleForm((current) => ({ ...current, schedule_day_of_month: event.target.value }))}
                      type="number"
                      value={scheduleForm.schedule_day_of_month}
                    />
                  </div>
                ) : null}
                {scheduleForm.schedule_mode === "biweekly" ? (
                  <div className="space-y-2 md:col-span-2">
                    <label className="text-sm font-medium text-text-body" htmlFor="datalake-schedule-anchor">
                      Data âncora
                    </label>
                    <Input
                      id="datalake-schedule-anchor"
                      onChange={(event) => setScheduleForm((current) => ({ ...current, schedule_anchor_date: event.target.value }))}
                      type="date"
                      value={scheduleForm.schedule_anchor_date}
                    />
                  </div>
                ) : null}
              </div>
              <div className="rounded-2xl border border-border bg-bg-subtle px-4 py-3 text-sm text-text-body">
                {schedule?.schedule_summary || "Aguarde a primeira configuração para ver a descrição do agendamento."}
              </div>
              <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border pt-4">
                <div className="text-xs text-muted">
                  {schedule?.schedule_next_run_at ? `Próxima execução: ${formatDateTime(schedule.schedule_next_run_at)}` : "Sem próxima execução agendada."}
                </div>
                <div className="flex flex-wrap gap-2">
                  {schedule ? (
                    <Button disabled={scheduleSaving} onClick={() => void handleDeleteSchedule()} size="sm" type="button" variant="outline">
                      Remover
                    </Button>
                  ) : null}
                  <Button disabled={scheduleSaving} size="sm" type="submit">
                    {scheduleSaving ? "Salvando..." : schedule ? "Atualizar agendamento" : "Criar agendamento"}
                  </Button>
                </div>
              </div>
            </form>
          </CardContent>
        </Card>

        <Card className="border-border/80 bg-surface shadow-card">
          <CardHeader className="space-y-2 border-b border-border px-6 py-5">
            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-brand-600">Troubleshooting</p>
            <h3 className="text-2xl font-semibold tracking-tight text-text">Diagnóstico guiado</h3>
            <p className="text-sm leading-6 text-text-body">Sinais que ajudam a explicar falhas de conexão, leitura e freshness.</p>
          </CardHeader>
          <CardContent className="space-y-4 p-6">
            {troubleshooting?.summary ? <div className="rounded-2xl border border-border bg-bg-subtle px-4 py-3 text-sm text-text-body">{troubleshooting.summary}</div> : null}
            {troubleshooting?.items.length ? (
              <div className="space-y-3">
                {troubleshooting.items.map((item) => (
                  <div className={cn("rounded-2xl border px-4 py-3", toneClasses(item.tone))} key={item.key}>
                    <p className="text-sm font-semibold">{item.label}</p>
                    {item.detail ? <p className="mt-1 text-sm opacity-90">{item.detail}</p> : null}
                    {item.recommended_action ? <p className="mt-1 text-xs opacity-80">Próximo passo: {item.recommended_action}</p> : null}
                  </div>
                ))}
              </div>
            ) : (
              <EmptyState title="Sem sinais críticos" description="A conexão e o inventário estão estáveis para a leitura atual." />
            )}
          </CardContent>
        </Card>
      </div>

      <Card className="border-border/80 bg-surface shadow-card">
        <CardHeader className="space-y-2 border-b border-border px-6 py-5">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-brand-600">Inventário</p>
              <h3 className="mt-1 text-2xl font-semibold tracking-tight text-text">Tabelas descobertas no Data Lake</h3>
              <p className="mt-2 text-sm leading-6 text-text-body">
                O scanner identifica camadas bronze, silver e gold, além de pastas candidatas a tabela, suas partições e o atalho para o detalhe da tabela.
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button disabled={inventoryScanning || !selectedConnectionId} onClick={() => void handleRefreshInventory()} size="sm" variant="outline">
                <RefreshCw className="mr-2 h-4 w-4" />
                {inventoryScanning ? "Reescanear..." : "Atualizar inventário"}
              </Button>
            </div>
          </div>
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
            <div className="space-y-2">
              <label className="text-sm font-medium text-text-body" htmlFor="datalake-inventory-connection">
                Conexão
              </label>
              <Select
                id="datalake-inventory-connection"
                onChange={(event) => {
                  setSelectedConnectionId(Number(event.target.value));
                  setInventoryPageIndex(1);
                }}
                value={selectedConnectionId ? String(selectedConnectionId) : ""}
              >
                {connections.map((connection) => (
                  <option key={connection.id} value={connection.id}>
                    {connection.name}
                  </option>
                ))}
              </Select>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium text-text-body" htmlFor="datalake-inventory-layer">
                Camada
              </label>
              <Select id="datalake-inventory-layer" onChange={(event) => setInventoryLayerFilter(event.target.value)} value={inventoryLayerFilter}>
                <option value="">Todas</option>
                <option value="bronze">Bronze</option>
                <option value="silver">Silver</option>
                <option value="gold">Gold</option>
              </Select>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium text-text-body" htmlFor="datalake-inventory-status">
                Status
              </label>
              <Select id="datalake-inventory-status" onChange={(event) => setInventoryStatusFilter(event.target.value)} value={inventoryStatusFilter}>
                <option value="">Todos</option>
                <option value="scanned">Com parquet</option>
                <option value="no_parquet">Sem parquet válido</option>
                <option value="empty">Vazio</option>
                <option value="error">Com erro</option>
              </Select>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium text-text-body" htmlFor="datalake-inventory-partitions">
                Partições
              </label>
              <Select id="datalake-inventory-partitions" onChange={(event) => setInventoryPartitionsFilter(event.target.value)} value={inventoryPartitionsFilter}>
                <option value="">Todas</option>
                <option value="true">Com partição</option>
                <option value="false">Sem partição</option>
              </Select>
            </div>
          </div>
          <div className="grid gap-3 md:grid-cols-2">
            <div className="space-y-2">
              <label className="text-sm font-medium text-text-body" htmlFor="datalake-inventory-name">
                Buscar por tabela
              </label>
              <Input
                id="datalake-inventory-name"
                onChange={(event) => setInventoryNameFilter(event.target.value)}
                placeholder="tabela, path ou fragmento"
                value={inventoryNameFilter}
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium text-text-body" htmlFor="datalake-inventory-freshness">
                Atualização
              </label>
              <Select id="datalake-inventory-freshness" onChange={(event) => setInventoryFreshnessFilter(event.target.value)} value={inventoryFreshnessFilter}>
                <option value="">Todas</option>
                <option value="recent">Atualizadas recentemente</option>
                <option value="stale">Sem atualização recente</option>
              </Select>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-5 p-6">
          {inventoryError ? <div className="rounded-2xl border border-danger-200 bg-danger-50 px-4 py-3 text-sm text-danger-700">{inventoryError}</div> : null}
          {inventoryPage?.summary ? (
            <>
              <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-6">
                <div className="rounded-2xl border border-border/80 bg-bg-subtle/80 p-4">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-brand-600">Tabelas</p>
                  <p className="mt-2 text-3xl font-semibold text-text">{inventoryPage.summary.total_tables}</p>
                </div>
                <div className="rounded-2xl border border-border/80 bg-bg-subtle/80 p-4">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-brand-600">Bronze</p>
                  <p className="mt-2 text-3xl font-semibold text-text">{inventoryPage.summary.bronze_tables}</p>
                </div>
                <div className="rounded-2xl border border-border/80 bg-bg-subtle/80 p-4">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-brand-600">Silver</p>
                  <p className="mt-2 text-3xl font-semibold text-text">{inventoryPage.summary.silver_tables}</p>
                </div>
                <div className="rounded-2xl border border-border/80 bg-bg-subtle/80 p-4">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-brand-600">Gold</p>
                  <p className="mt-2 text-3xl font-semibold text-text">{inventoryPage.summary.gold_tables}</p>
                </div>
                <div className="rounded-2xl border border-border/80 bg-bg-subtle/80 p-4">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-brand-600">Sem parquet</p>
                  <p className="mt-2 text-3xl font-semibold text-text">{inventoryPage.summary.tables_without_parquet}</p>
                </div>
                <div className="rounded-2xl border border-border/80 bg-bg-subtle/80 p-4">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-brand-600">Sem atualização recente</p>
                  <p className="mt-2 text-3xl font-semibold text-text">{inventoryPage.summary.tables_without_recent_update}</p>
                </div>
              </div>

              <div className="flex flex-wrap items-center justify-between gap-2 rounded-2xl border border-border bg-bg-subtle/80 px-4 py-3 text-sm text-text-body">
                <div>
                  Última varredura: <span className="font-medium text-text">{formatDateTime(inventoryPage.summary.last_scan_at)}</span>
                </div>
                <div>
                  Status: <span className="font-medium text-text">{formatStatusLabel(inventoryPage.summary.latest_scan_status)}</span>
                </div>
                <div>
                  Arquivos parquet: <span className="font-medium text-text">{inventoryPage.summary.total_parquet_files}</span>
                </div>
                <div>
                  Volume: <span className="font-medium text-text">{formatBytes(inventoryPage.summary.total_bytes)}</span>
                </div>
              </div>
            </>
          ) : null}

          {inventoryLoading ? (
            <div className="space-y-3">
              {Array.from({ length: 3 }).map((_, index) => (
                <Skeleton className="h-24 w-full" key={index} />
              ))}
            </div>
          ) : inventoryPage && inventoryPage.items.length > 0 ? (
            <div className="space-y-3">
              {inventoryPage.items.map((item) => (
                <div className="rounded-3xl border border-border/80 bg-surface p-4 shadow-sm" key={item.id}>
                  {(() => {
                    const freshness = tableFreshnessFor(item, selectedConnection);
                    return (
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <h4 className="truncate text-base font-semibold text-text">{item.table_name}</h4>
                        <Badge tone="neutral">{item.layer}</Badge>
                        <Badge tone={formatStatusTone(item.status_scan)}>{formatStatusLabel(item.status_scan)}</Badge>
                        {item.has_partitions ? <Badge tone="accent">Particionado</Badge> : <Badge tone="neutral">Sem partição</Badge>}
                        <Badge tone={freshness.tone}>{freshness.label}</Badge>
                      </div>
                      <p className="mt-1 truncate text-sm text-text-body">{item.path_base}</p>
                      <p className="mt-1 text-xs text-muted">
                        Última atualização: {formatDateTime(item.last_modified_at)} · Último scan: {formatDateTime(item.data_last_scan_at)}
                      </p>
                      <p className="mt-1 text-xs text-muted">{freshness.detail}</p>
                    </div>
                    <div className="text-right text-sm text-text-body">
                      <p className="font-medium text-text">{item.parquet_files_count} parquet(s)</p>
                      <p>{formatBytes(item.size_total_bytes)}</p>
                      <Button
                        className="mt-3"
                        disabled={!selectedConnectionId}
                        onClick={() => selectedConnectionId ? router.push(`/integrations/data-lake/connections/${selectedConnectionId}/tables/${item.id}`) : undefined}
                        size="sm"
                        variant="outline"
                      >
                        Ver detalhe
                      </Button>
                    </div>
                  </div>
                    );
                  })()}
                  <div className="mt-3 grid gap-3 text-sm md:grid-cols-3">
                    <div className="rounded-2xl border border-border bg-bg-subtle px-4 py-3">
                      <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-brand-600">Arquivos</p>
                      <p className="mt-1 font-medium text-text">{item.files_count}</p>
                    </div>
                    <div className="rounded-2xl border border-border bg-bg-subtle px-4 py-3">
                      <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-brand-600">Parquet</p>
                      <p className="mt-1 font-medium text-text">{item.parquet_files_count}</p>
                    </div>
                    <div className="rounded-2xl border border-border bg-bg-subtle px-4 py-3">
                      <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-brand-600">Partição</p>
                      <p className="mt-1 font-medium text-text">{item.partition_pattern_detected || "Não detectada"}</p>
                    </div>
                  </div>
                  {item.error_message ? (
                    <p className="mt-3 rounded-2xl border border-warning-200 bg-warning-50 px-4 py-3 text-sm text-warning-700">{item.error_message}</p>
                  ) : null}
                </div>
              ))}
            </div>
          ) : (
            <EmptyState
              action={
                <Button disabled={inventoryScanning || !selectedConnectionId} onClick={() => void handleRefreshInventory()} size="sm" variant="outline">
                  <RefreshCw className="mr-2 h-4 w-4" />
                  {inventoryScanning ? "Reescaneando..." : "Reescanear Data Lake"}
                </Button>
              }
              description="Nenhuma tabela foi descoberta ainda. Execute um scan para mapear bronze, silver e gold."
              title="Inventário vazio"
            />
          )}

          {inventoryPage ? (
            <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border pt-4 text-sm text-text-body">
              <div>
                Página {inventoryPage.page} de {Math.max(1, Math.ceil(inventoryPage.total / inventoryPage.page_size))}
              </div>
              <div className="flex flex-wrap gap-2">
                <Button disabled={inventoryPage.page <= 1 || inventoryLoading} onClick={() => setInventoryPageIndex((current) => Math.max(1, current - 1))} size="sm" variant="outline">
                  Anterior
                </Button>
                <Button
                  disabled={!inventoryPage.has_more || inventoryLoading}
                  onClick={() => setInventoryPageIndex((current) => current + 1)}
                  size="sm"
                  variant="outline"
                >
                  Próxima
                </Button>
              </div>
            </div>
          ) : null}
        </CardContent>
      </Card>
    </div>
  );
}
