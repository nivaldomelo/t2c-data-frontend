import { FormEvent, useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "@/lib/next-shims";
import { useTranslation } from "react-i18next";

import { CertificationBadgeKey } from "@/components/certification/certification-badge";
import { CertificationEditorDialog } from "@/features/certification/components/editor-dialog";
import { CertificationGoalDialog } from "@/features/certification/components/goal-dialog";
import { CertificationView } from "@/features/certification/components/certification-view";
import type {
  CertificationForm,
  CertificationDecisionEvent,
  CertificationDecisionEventPage,
  CertificationGoal,
  CertificationGoalProgress,
  CertificationItem,
  CertificationSummary,
  CertificationTablesPage,
} from "@/features/certification/types";
import type { CanonicalAssetContext } from "@/features/explorer/types";
import { trackPlatformEvent } from "@/features/platform/client";
import { useAuth } from "@/lib/auth";
import { ApiError, apiRequest, downloadApiFile } from "@/lib/client-api";

const PAGE_SIZE = 12;

const STATUS_OPTIONS = [
  { value: "not_eligible", label: "Não elegível" },
  { value: "eligible", label: "Elegível" },
  { value: "in_review", label: "Em revisão" },
  { value: "certified", label: "Certificada" },
  { value: "rejected", label: "Recusada" },
  { value: "revalidation_pending", label: "Pendente de revalidação" },
  { value: "expired", label: "Vencida" },
];

const CRITICALITY_OPTIONS = [
  { value: "", label: "Não definida" },
  { value: "low", label: "Baixa" },
  { value: "medium", label: "Média" },
  { value: "high", label: "Alta" },
  { value: "critical", label: "Crítica" },
];

const CERTIFICATION_BADGE_OPTIONS: { value: CertificationBadgeKey; label: string; description: string }[] = [
  {
    value: "internal_use",
    label: "Uso interno",
    description: "Ativo liberado para consumo interno e análises operacionais.",
  },
  {
    value: "official_use",
    label: "Uso regulatório",
    description: "Ativo apto para relatórios oficiais, prestação regulatória ou comunicação executiva.",
  },
  {
    value: "restricted_sensitive",
    label: "Restrito / sensível",
    description: "Ativo com sensibilidade elevada ou exigência adicional de controle.",
  },
];

function toInputDateTime(value: string | null): string {
  if (!value) return "";
  const date = new Date(value);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(
    date.getMinutes(),
  )}`;
}

export default function CertificationPage() {
  const { t } = useTranslation();
  const searchParams = useSearchParams();
  const auth = useAuth();
  const canEdit = auth.canAccessPath("/certification") && auth.canAction("write", "certification");
  const canExport = auth.hasPermission("certification:export");

  const [payload, setPayload] = useState<CertificationTablesPage | null>(null);
  const [summary, setSummary] = useState<CertificationSummary | null>(null);
  const [goals, setGoals] = useState<CertificationGoal[]>([]);
  const [selectedGoalId, setSelectedGoalId] = useState<number | null>(null);
  const [goalProgress, setGoalProgress] = useState<CertificationGoalProgress | null>(null);
  const [goalProgressLoading, setGoalProgressLoading] = useState(false);
  const [goalProgressError, setGoalProgressError] = useState<string | null>(null);
  const [goalDialogOpen, setGoalDialogOpen] = useState(false);
  const [goalSaving, setGoalSaving] = useState(false);
  const [goalForm, setGoalForm] = useState({
    name: "",
    period_start: "",
    period_end: "",
    target_certified_assets: "0",
    target_eligible_assets: "0",
    target_reviewed_assets: "0",
    target_revalidated_assets: "0",
    scope_type: "global",
    scope_value: "",
    owner: "",
    notes: "",
  });
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [criticalityFilter, setCriticalityFilter] = useState("");
  const [ownerFilter, setOwnerFilter] = useState("");
  const [schemaFilter, setSchemaFilter] = useState("");
  const [databaseFilter, setDatabaseFilter] = useState("");
  const [quickFilter, setQuickFilter] = useState("");
  const [page, setPage] = useState(1);
  const [editorOpen, setEditorOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [selectedItem, setSelectedItem] = useState<CertificationItem | null>(null);
  const [eventHistory, setEventHistory] = useState<CertificationDecisionEvent[]>([]);
  const [eventHistoryLoading, setEventHistoryLoading] = useState(false);
  const [eventHistoryError, setEventHistoryError] = useState("");
  const [form, setForm] = useState<CertificationForm>({
    certification_status: "not_eligible",
    certification_criticality: "",
    certification_notes: "",
    certification_review_at: "",
    certification_expires_at: "",
    certification_badges: [],
  });
  const [toast, setToast] = useState<{ tone: "success" | "error"; message: string } | null>(null);
  const [reloadKey, setReloadKey] = useState(0);
  const loadRequestSeq = useRef(0);
  const [canonicalAsset, setCanonicalAsset] = useState<CanonicalAssetContext | null>(null);
  const [canonicalLoading, setCanonicalLoading] = useState(false);
  const [canonicalError, setCanonicalError] = useState("");

  useEffect(() => {
    const tableId = Number(searchParams.get("tableId") || "");
    void trackPlatformEvent({
      event_name: "page_view",
      module_name: "certification",
      page_path: "/certification",
      entity_type: Number.isFinite(tableId) && tableId > 0 ? "table" : undefined,
      entity_id: Number.isFinite(tableId) && tableId > 0 ? tableId : undefined,
    });
  }, [searchParams]);

  useEffect(() => {
    const controller = new AbortController();
    const requestSeq = ++loadRequestSeq.current;

    async function loadItems() {
      setLoading(true);
      setLoadError(null);
      try {
        const params = new URLSearchParams();
        params.set("page", String(page));
        params.set("page_size", String(PAGE_SIZE));
        if (query.trim()) params.set("q", query.trim());
        if (statusFilter) params.set("certification_status", statusFilter);
        if (criticalityFilter) params.set("certification_criticality", criticalityFilter);
        if (ownerFilter) params.set("owner_id", ownerFilter);
        if (schemaFilter) params.set("schema_name", schemaFilter);
        if (databaseFilter) params.set("database_name", databaseFilter);
        // quick_filter only refines the table list (server-side); the summary stays global and ignores it.
        const tablesParams = new URLSearchParams(params);
        if (quickFilter) tablesParams.set("quick_filter", quickFilter);
        const [data, summaryData, goalsData] = await Promise.all([
          apiRequest<CertificationTablesPage>(`/v1/certification/tables?${tablesParams.toString()}`, {
            signal: controller.signal,
          }),
          apiRequest<CertificationSummary>(`/v1/certification/summary?${params.toString()}`, {
            signal: controller.signal,
          }).catch(() => null),
          apiRequest<CertificationGoal[]>("/v1/certification/goals", {
            signal: controller.signal,
          }).catch(() => []),
        ]);
        if (loadRequestSeq.current !== requestSeq) return;
        setPayload(data);
        setSummary(summaryData);
        setGoals(goalsData);
        setSelectedGoalId((current) => current ?? goalsData.find((goal) => goal.status === "active")?.id ?? goalsData[0]?.id ?? null);
        setToast(null);
      } catch (error) {
        if ((error as Error).name === "AbortError") return;
        if (loadRequestSeq.current !== requestSeq) return;
        setPayload(null);
        setSummary(null);
        setGoals([]);
        if (error instanceof ApiError && error.status === 403) {
          setLoadError("Você não tem permissão para visualizar a certificação com este perfil.");
          return;
        }
        if (error instanceof ApiError && error.status >= 500) {
          setLoadError(
            error.message ||
              "Falha interna ao carregar a certificação. Verifique se as migrations do banco foram aplicadas.",
          );
          return;
        }
        setLoadError(
          error instanceof Error && error.message
            ? error.message
            : "Não foi possível carregar a certificação. Verifique se o backend está disponível.",
        );
      } finally {
        if (loadRequestSeq.current !== requestSeq) return;
        setLoading(false);
      }
    }

    void loadItems();
    return () => controller.abort();
  }, [query, statusFilter, criticalityFilter, ownerFilter, schemaFilter, databaseFilter, quickFilter, page, reloadKey]);

  useEffect(() => {
    if (!selectedGoalId) {
      setGoalProgress(null);
      setGoalProgressError(null);
      setGoalProgressLoading(false);
      return;
    }
    let cancelled = false;
    setGoalProgressLoading(true);
    setGoalProgressError(null);
    void (async () => {
      try {
        const payload = await apiRequest<CertificationGoalProgress>(`/v1/certification/goals/${selectedGoalId}/progress`);
        if (cancelled) return;
        setGoalProgress(payload);
      } catch (error) {
        if (cancelled) return;
        setGoalProgress(null);
        setGoalProgressError(error instanceof Error ? error.message : "Falha ao carregar o progresso da meta.");
      } finally {
        if (!cancelled) setGoalProgressLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [selectedGoalId, reloadKey]);

  const items = payload?.items ?? [];

  const ownerOptions = useMemo(() => payload?.filters.owners ?? [], [payload]);
  const schemaOptions = useMemo(() => payload?.filters.schemas ?? [], [payload]);
  const databaseOptions = useMemo(() => payload?.filters.databases ?? [], [payload]);

  const counters = useMemo(() => {
    return {
      displayed: items.length,
      total: payload?.total ?? items.length,
      eligible: items.filter((item) => item.certification_status === "eligible").length,
      certified: items.filter((item) => item.certification_status === "certified").length,
      revalidationPending: items.filter((item) => item.certification_status === "revalidation_pending").length,
      notEligible: items.filter((item) => item.certification_status === "not_eligible").length,
    };
  }, [items, payload]);

  const selectedGoal = useMemo(
    () => goals.find((goal) => goal.id === selectedGoalId) ?? null,
    [goals, selectedGoalId],
  );

  useEffect(() => {
    const tableId = Number(searchParams.get("tableId") || "");
    if (!Number.isFinite(tableId) || tableId <= 0 || !canEdit) return;
    const target = items.find((item) => item.id === tableId);
    if (target) openEditor(target);
  }, [items, searchParams, canEdit]);

  useEffect(() => {
    if (!selectedItem) {
      setCanonicalAsset(null);
      setCanonicalLoading(false);
      setCanonicalError("");
      setEventHistory([]);
      setEventHistoryLoading(false);
      setEventHistoryError("");
      return;
    }
    let cancelled = false;
    setCanonicalLoading(true);
    setCanonicalError("");
    setEventHistoryLoading(true);
    setEventHistoryError("");
    void (async () => {
      try {
        const [response, history] = await Promise.all([
          apiRequest<CanonicalAssetContext>(`/v1/catalog/tables/${selectedItem.id}/canonical-context`),
          apiRequest<CertificationDecisionEventPage>(`/v1/certification/assets/${selectedItem.id}/events?page=1&page_size=10`).catch(() => null),
        ]);
        if (cancelled) return;
        setCanonicalAsset(response);
        setEventHistory(history?.items ?? []);
      } catch (error) {
        if (cancelled) return;
        setCanonicalAsset(null);
        setCanonicalError(error instanceof Error ? error.message : "Falha ao carregar o núcleo canônico.");
        setEventHistory([]);
        setEventHistoryError("Ainda não foi possível carregar o histórico auditável deste ativo.");
      } finally {
        if (!cancelled) {
          setCanonicalLoading(false);
          setEventHistoryLoading(false);
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [selectedItem]);

  useEffect(() => {
    if (!payload || payload.total <= 0) return;
    const totalPages = Math.max(1, Math.ceil(payload.total / PAGE_SIZE));
    if (page > totalPages) setPage(totalPages);
  }, [payload, page]);

  function handleFilterChange(setter: (value: string) => void, value: string) {
    setter(value);
    setPage(1);
  }

  async function handleExportCurrentFilters() {
    try {
      const params = new URLSearchParams();
      if (query.trim()) params.set("q", query.trim());
      if (statusFilter) params.set("certification_status", statusFilter);
      if (criticalityFilter) params.set("certification_criticality", criticalityFilter);
      if (ownerFilter) params.set("owner_id", ownerFilter);
      if (schemaFilter) params.set("schema_name", schemaFilter);
      if (databaseFilter) params.set("database_name", databaseFilter);
      await downloadApiFile(`/v1/certification/export.csv?${params.toString()}`, "certification_queue.csv", undefined, {
        confirmMessage:
          "Exportar o recorte filtrado da fila de certificacao (limite de 2.000 linhas)? A exportacao sera auditada.",
      });
    } catch (error) {
      setToast({ tone: "error", message: error instanceof Error ? error.message : "Falha ao exportar pendências." });
    }
  }

  async function handleExportEvents() {
    try {
      const params = new URLSearchParams();
      if (statusFilter) params.set("certification_status", statusFilter);
      if (criticalityFilter) params.set("certification_criticality", criticalityFilter);
      if (ownerFilter) params.set("owner_id", ownerFilter);
      if (schemaFilter) params.set("schema_name", schemaFilter);
      if (databaseFilter) params.set("database_name", databaseFilter);
      await downloadApiFile(`/v1/certification/events/export.csv?${params.toString()}`, "certification_events.csv", undefined, {
        confirmMessage:
          "Exportar os eventos filtrados de certificacao (limite de 2.000 linhas)? A exportacao sera auditada.",
      });
    } catch (error) {
      setToast({ tone: "error", message: error instanceof Error ? error.message : "Falha ao exportar eventos." });
    }
  }

  async function createGoal(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setGoalSaving(true);
    try {
      const created = await apiRequest<CertificationGoal>("/v1/certification/goals", {
        method: "POST",
        body: JSON.stringify({
          name: goalForm.name.trim(),
          period_start: goalForm.period_start,
          period_end: goalForm.period_end,
          target_certified_assets: Number(goalForm.target_certified_assets || 0),
          target_eligible_assets: Number(goalForm.target_eligible_assets || 0),
          target_reviewed_assets: Number(goalForm.target_reviewed_assets || 0),
          target_revalidated_assets: Number(goalForm.target_revalidated_assets || 0),
          scope_type: goalForm.scope_type,
          scope_value: goalForm.scope_type === "global" ? null : goalForm.scope_value.trim() || null,
          owner: goalForm.owner.trim() || null,
          notes: goalForm.notes.trim() || null,
          status: "active",
        }),
      });
      setGoals((current) => [created, ...current.filter((item) => item.id !== created.id)]);
      setSelectedGoalId(created.id);
      setGoalDialogOpen(false);
      setGoalForm({
        name: "",
        period_start: "",
        period_end: "",
        target_certified_assets: "0",
        target_eligible_assets: "0",
        target_reviewed_assets: "0",
        target_revalidated_assets: "0",
        scope_type: "global",
        scope_value: "",
        owner: "",
        notes: "",
      });
      setToast({ tone: "success", message: "Meta de certificação criada com sucesso." });
    } catch (error) {
      setToast({ tone: "error", message: error instanceof Error ? error.message : "Falha ao criar meta." });
    } finally {
      setGoalSaving(false);
    }
  }

  function openEditor(item: CertificationItem) {
    setSelectedItem(item);
    setForm({
      certification_status: item.certification_status,
      certification_criticality: item.certification_criticality || "",
      certification_notes: item.certification_notes || "",
      certification_review_at: toInputDateTime(item.certification_review_at),
      certification_expires_at: toInputDateTime(item.certification_expires_at),
      certification_badges: item.certification_badges || [],
    });
    setEditorOpen(true);
  }

  function toggleCertificationBadge(badge: CertificationBadgeKey) {
    setForm((prev) => ({
      ...prev,
      certification_badges: prev.certification_badges.includes(badge)
        ? prev.certification_badges.filter((current) => current !== badge)
        : [...prev.certification_badges, badge],
    }));
  }

  function replaceItem(updated: CertificationItem) {
    setPayload((current) =>
      current
        ? {
            ...current,
            items: current.items.map((item) => (item.id === updated.id ? updated : item)),
          }
        : current,
    );
    setSelectedItem((current) => (current?.id === updated.id ? updated : current));
    setForm((current) => ({
      ...current,
      certification_status: updated.certification_status,
      certification_criticality: updated.certification_criticality || "",
      certification_notes: updated.certification_notes || current.certification_notes,
      certification_review_at: toInputDateTime(updated.certification_review_at),
      certification_expires_at: toInputDateTime(updated.certification_expires_at),
      certification_badges: updated.certification_badges || [],
    }));
  }

  async function runWorkflowAction(item: CertificationItem, action: "submit" | "approve" | "reject" | "revalidate") {
    setSaving(true);
    try {
      let updated: CertificationItem;
      if (action === "submit" || action === "revalidate") {
        updated = await apiRequest<CertificationItem>(`/v1/certification/tables/${item.id}/submit`, {
          method: "POST",
          body: JSON.stringify({
            certification_notes: form.certification_notes.trim() || null,
            certification_review_at: form.certification_review_at ? new Date(form.certification_review_at).toISOString() : null,
            certification_expires_at: form.certification_expires_at ? new Date(form.certification_expires_at).toISOString() : null,
          }),
        });
      } else {
        updated = await apiRequest<CertificationItem>(`/v1/certification/tables/${item.id}/decision`, {
          method: "POST",
          body: JSON.stringify({
            decision: action === "approve" ? "certified" : "rejected",
            certification_criticality: form.certification_criticality || null,
            certification_badges: form.certification_badges,
            certification_notes: form.certification_notes.trim() || null,
            certification_review_at: form.certification_review_at ? new Date(form.certification_review_at).toISOString() : null,
            certification_expires_at: form.certification_expires_at ? new Date(form.certification_expires_at).toISOString() : null,
          }),
        });
      }
      replaceItem(updated);
      setToast({
        tone: "success",
        message:
          action === "submit"
            ? "Ativo enviado para revisão."
            : action === "revalidate"
              ? "Revalidação iniciada com sucesso."
              : action === "approve"
                ? "Certificação aprovada."
                : "Certificação recusada.",
      });
    } catch (error) {
      setToast({ tone: "error", message: (error as Error).message });
    } finally {
      setSaving(false);
    }
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!selectedItem) return;
    setSaving(true);
    try {
      const updated = await apiRequest<CertificationItem>(`/v1/certification/tables/${selectedItem.id}`, {
        method: "PATCH",
        body: JSON.stringify({
          certification_status: form.certification_status,
          certification_criticality: form.certification_criticality || null,
          certification_badges: form.certification_badges,
          certification_notes: form.certification_notes.trim() || null,
          certification_review_at: form.certification_review_at ? new Date(form.certification_review_at).toISOString() : null,
          certification_expires_at: form.certification_expires_at ? new Date(form.certification_expires_at).toISOString() : null,
        }),
      });
      replaceItem(updated);
      setToast({ tone: "success", message: "Certificação atualizada com sucesso." });
      setEditorOpen(false);
    } catch (error) {
      setToast({ tone: "error", message: (error as Error).message });
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-5">
      <CertificationView
        canEdit={canEdit}
        counters={counters}
        goalProgress={goalProgress}
        goalProgressError={goalProgressError}
        goalProgressLoading={goalProgressLoading}
        goals={goals}
        summary={summary}
        criticalityFilter={criticalityFilter}
        criticalityOptions={CRITICALITY_OPTIONS}
        databaseFilter={databaseFilter}
        databaseOptions={databaseOptions}
        error={loadError}
        items={items}
        loading={loading}
        quickFilter={quickFilter}
        onQuickFilterChange={(value) => handleFilterChange(setQuickFilter, value)}
        onCriticalityFilterChange={(value) => handleFilterChange(setCriticalityFilter, value)}
        onDatabaseFilterChange={(value) => handleFilterChange(setDatabaseFilter, value)}
        canExport={canExport}
        onExportCurrentFilters={() => void handleExportCurrentFilters()}
        onExportEvents={() => void handleExportEvents()}
        onGoalCreateOpen={() => setGoalDialogOpen(true)}
        onGoalSelect={setSelectedGoalId}
        onOpenEditor={openEditor}
        onOwnerFilterChange={(value) => handleFilterChange(setOwnerFilter, value)}
        onPageChange={setPage}
        onQueryChange={(value) => handleFilterChange(setQuery, value)}
        onSchemaFilterChange={(value) => handleFilterChange(setSchemaFilter, value)}
        onStatusFilterChange={(value) => handleFilterChange(setStatusFilter, value)}
        onWorkflowAction={(item, action) => void runWorkflowAction(item, action)}
        onRetry={() => setReloadKey((current) => current + 1)}
        page={payload?.page ?? page}
        total={payload?.total ?? items.length}
        pageSize={payload?.page_size ?? PAGE_SIZE}
        ownerFilter={ownerFilter}
        ownerOptions={ownerOptions}
        query={query}
        schemaFilter={schemaFilter}
        schemaOptions={schemaOptions}
        selectedGoal={selectedGoal}
        statusFilter={statusFilter}
        statusOptions={STATUS_OPTIONS}
        title={t("pages.certification.title")}
      />

      <CertificationGoalDialog
        form={goalForm}
        onClose={() => setGoalDialogOpen(false)}
        onFormChange={(patch) => setGoalForm((prev) => ({ ...prev, ...patch }))}
        onSubmit={createGoal}
        open={goalDialogOpen}
        saving={goalSaving}
      />

      <CertificationEditorDialog
        badgeOptions={CERTIFICATION_BADGE_OPTIONS}
        criticalityOptions={CRITICALITY_OPTIONS}
        canonicalAsset={canonicalAsset}
        canonicalError={canonicalError}
        canonicalLoading={canonicalLoading}
        eventHistory={eventHistory}
        eventHistoryError={eventHistoryError}
        eventHistoryLoading={eventHistoryLoading}
        form={form}
        onClose={() => setEditorOpen(false)}
        onFormChange={(patch) => setForm((prev) => ({ ...prev, ...patch }))}
        onSubmit={submit}
        onToggleCertificationBadge={toggleCertificationBadge}
        onWorkflowAction={(action) => selectedItem ? void runWorkflowAction(selectedItem, action) : undefined}
        open={editorOpen}
        saving={saving}
        selectedItem={selectedItem}
        statusOptions={STATUS_OPTIONS}
      />

      {toast ? (
        <div className="fixed bottom-5 right-5 z-50 max-w-sm rounded-2xl border border-border bg-surface p-4 shadow-lg">
          <p className={toast.tone === "success" ? "text-sm text-success-700" : "text-sm text-danger-700"}>{toast.message}</p>
          <button className="mt-2 text-xs text-muted underline" onClick={() => setToast(null)} type="button">
            Fechar
          </button>
        </div>
      ) : null}
    </div>
  );
}
