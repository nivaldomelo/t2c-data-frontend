import { Link } from "@/lib/next-shims";
import { useSearchParams } from "@/lib/next-shims";
import { FormEvent, useEffect, useMemo, useState } from "react";
import {
  BookOpen,
  Download,
  Eye,
  Pencil,
  Plus,
  RefreshCw,
  Search,
  Trash2,
  Upload,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { DangerConfirmDialog } from "@/components/ui/danger-confirm-dialog";
import { EmptyState } from "@/components/ui/empty-state";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { GlossaryDetailDialog } from "@/features/glossary/components/detail-dialog";
import { GlossaryEditorDialog } from "@/features/glossary/components/editor-dialog";
import { GlossaryImportDialog } from "@/features/glossary/components/import-dialog";
import { useGlossaryImport } from "@/features/glossary/hooks/use-glossary-import";
import { ApiError, apiRequest, downloadApiFile } from "@/lib/client-api";
import { normalizePageItems, type PageResponse } from "@/lib/pagination";
import { useAuth } from "@/lib/auth";

type LinkedTablePreview = {
  id: number;
  name: string;
  schema_name: string;
  database_name: string;
  datasource_name: string;
  description: string | null;
};

type TermItem = {
  id: number;
  external_id: string | null;
  slug: string;
  name: string;
  definition: string;
  description: string | null;
  steward: string | null;
  category: string | null;
  subcategory: string | null;
  example_of_use: string | null;
  synonyms: string | null;
  suggested_priority: string | null;
  status: string;
  tag_labels: string | null;
  notes: string | null;
  tables_count: number;
  linked_tables_preview: LinkedTablePreview[];
  created_at: string;
  updated_at: string;
};

type TermDetail = TermItem & {
  linked_tables: LinkedTablePreview[];
};

type TermFilters = {
  categories: string[];
  subcategories: string[];
  statuses: string[];
  priorities: string[];
};

type TermSummary = {
  total: number;
  active: number;
  in_use: number;
  categories: number;
};

type TermFormState = {
  external_id: string;
  slug: string;
  name: string;
  definition: string;
  category: string;
  subcategory: string;
  example_of_use: string;
  synonyms: string;
  suggested_priority: string;
  status: string;
  tag_labels: string;
  notes: string;
};

type TermsTab = "catalog" | "io" | "admin";
type UsageFilter = "" | "used" | "unused";

const PAGE_SIZE_OPTIONS = [12, 24, 48];

const EMPTY_FORM: TermFormState = {
  external_id: "",
  slug: "",
  name: "",
  definition: "",
  category: "",
  subcategory: "",
  example_of_use: "",
  synonyms: "",
  suggested_priority: "medium",
  status: "active",
  tag_labels: "",
  notes: "",
};

const STATUS_LABELS: Record<string, string> = {
  active: "Ativo",
  inactive: "Inativo",
  draft: "Rascunho",
  deprecated: "Descontinuado",
  archived: "Arquivado",
};

const PRIORITY_LABELS: Record<string, string> = {
  high: "Alta",
  medium: "Média",
  low: "Baixa",
};

function statusTone(status: string): "success" | "warning" | "neutral" | "accent" {
  if (status === "active") return "success";
  if (status === "draft") return "accent";
  if (status === "inactive") return "warning";
  return "neutral";
}

function priorityTone(priority: string | null): "success" | "warning" | "neutral" | "accent" {
  if (priority === "high") return "warning";
  if (priority === "medium") return "accent";
  if (priority === "low") return "success";
  return "neutral";
}

function statusLabel(status: string): string {
  return STATUS_LABELS[status] || status;
}

function priorityLabel(priority: string | null): string {
  if (!priority) return "Sem prioridade";
  return PRIORITY_LABELS[priority] || priority;
}

function parseTagLabels(value: string | null): string[] {
  if (!value) return [];
  return value
    .split(";")
    .map((item) => item.trim())
    .filter(Boolean);
}

function toForm(item: TermItem | null): TermFormState {
  if (!item) return EMPTY_FORM;
  return {
    external_id: item.external_id || "",
    slug: item.slug,
    name: item.name,
    definition: item.definition,
    category: item.category || "",
    subcategory: item.subcategory || "",
    example_of_use: item.example_of_use || "",
    synonyms: item.synonyms || "",
    suggested_priority: item.suggested_priority || "medium",
    status: item.status,
    tag_labels: item.tag_labels || "",
    notes: item.notes || "",
  };
}

function formatDate(value: string): string {
  return new Date(value).toLocaleString("pt-BR");
}

function formatPaginationRange(total: number, page: number, pageSize: number): string {
  if (total <= 0) return "0 de 0";
  const start = (page - 1) * pageSize + 1;
  const end = Math.min(total, page * pageSize);
  return `${start}-${end} de ${total}`;
}

export default function TermsPage() {
  const searchParams = useSearchParams();
  const auth = useAuth();
  const canManage = auth.canAccessPath("/glossary") && (auth.primaryRole === "admin" || auth.primaryRole === "editor");
  const canExport = auth.hasPermission("glossary:export");

  const [activeTab, setActiveTab] = useState<TermsTab>("catalog");
  const [items, setItems] = useState<TermItem[]>([]);
  const [filters, setFilters] = useState<TermFilters>({ categories: [], subcategories: [], statuses: [], priorities: [] });
  const [summary, setSummary] = useState<TermSummary>({ total: 0, active: 0, in_use: 0, categories: 0 });
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("");
  const [subcategory, setSubcategory] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [priority, setPriority] = useState("");
  const [usageFilter, setUsageFilter] = useState<UsageFilter>("");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(12);
  const [total, setTotal] = useState(0);
  const [hasMore, setHasMore] = useState(false);
  const [toast, setToast] = useState<{ tone: "success" | "error"; message: string } | null>(null);
  const [authExpired, setAuthExpired] = useState(false);

  const [editorOpen, setEditorOpen] = useState(false);
  const [editorMode, setEditorMode] = useState<"create" | "edit">("create");
  const [editingTerm, setEditingTerm] = useState<TermItem | null>(null);
  const [form, setForm] = useState<TermFormState>(EMPTY_FORM);
  const [saving, setSaving] = useState(false);

  const [detailOpen, setDetailOpen] = useState(false);
  const [detailLoading, setDetailLoading] = useState(false);
  const [selectedTerm, setSelectedTerm] = useState<TermDetail | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<TermItem | null>(null);
  const [deleteSaving, setDeleteSaving] = useState(false);
  const [resetDialogOpen, setResetDialogOpen] = useState(false);
  const [resetSaving, setResetSaving] = useState(false);

  useEffect(() => {
    const termId = Number(searchParams.get("termId") || "");
    if (!Number.isFinite(termId) || termId <= 0) return;
    void openDetails(termId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams]);

  async function loadTerms() {
    setLoading(true);
    setAuthExpired(false);
    try {
      const params = new URLSearchParams();
      if (query.trim()) params.set("query", query.trim());
      if (category) params.set("category", category);
      if (subcategory) params.set("subcategory", subcategory);
      if (statusFilter) params.set("status", statusFilter);
      if (priority) params.set("priority", priority);
      if (usageFilter === "used") params.set("in_use", "true");
      if (usageFilter === "unused") params.set("without_use", "true");
      params.set("page", String(page));
      params.set("page_size", String(pageSize));
      const suffix = params.toString() ? `?${params.toString()}` : "";
      const [termData, filterData, summaryData] = await Promise.all([
        apiRequest<TermItem[] | PageResponse<TermItem>>(`/v1/glossary/terms${suffix}`),
        apiRequest<TermFilters>("/v1/glossary/filters"),
        apiRequest<TermSummary>(`/v1/glossary/summary${suffix}`),
      ]);
      const pageItems = normalizePageItems(termData);
      setItems(pageItems);
      setTotal(Array.isArray(termData) ? pageItems.length : termData.total ?? pageItems.length);
      setHasMore(Array.isArray(termData) ? false : Boolean(termData.has_more));
      setFilters(filterData);
      setSummary(summaryData);
      setToast(null);
    } catch (error) {
      if (error instanceof ApiError && error.status === 401) {
        setAuthExpired(true);
        setItems([]);
      } else {
        setToast({ tone: "error", message: (error as Error).message });
      }
      setItems([]);
      setTotal(0);
      setHasMore(false);
      setSummary({ total: 0, active: 0, in_use: 0, categories: 0 });
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadTerms();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [query, category, subcategory, statusFilter, priority, usageFilter, page, pageSize]);

  const {
    importOpen,
    importing,
    importResult,
    openImport,
    closeImport,
    downloadTemplate,
    submitImport,
    onImportFileChange,
  } = useGlossaryImport({
    onError: (message) => setToast({ tone: "error", message }),
    onSuccess: (message) => setToast({ tone: "success", message }),
    onImported: loadTerms,
  });

  function openCreate() {
    setEditorMode("create");
    setEditingTerm(null);
    setForm(EMPTY_FORM);
    setEditorOpen(true);
  }

  function openEdit(item: TermItem) {
    setEditorMode("edit");
    setEditingTerm(item);
    setForm(toForm(item));
    setEditorOpen(true);
  }

  async function openDetails(termId: number) {
    setDetailOpen(true);
    setDetailLoading(true);
    try {
      const data = await apiRequest<TermDetail>(`/v1/glossary/terms/${termId}`);
      setSelectedTerm(data);
    } catch (error) {
      setToast({ tone: "error", message: (error as Error).message });
      setDetailOpen(false);
    } finally {
      setDetailLoading(false);
    }
  }

  async function saveTerm(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    try {
      const payload = {
        external_id: form.external_id.trim() || null,
        slug: form.slug.trim() || form.name.trim(),
        name: form.name.trim(),
        definition: form.definition.trim(),
        category: form.category.trim() || null,
        subcategory: form.subcategory.trim() || null,
        example_of_use: form.example_of_use.trim() || null,
        synonyms: form.synonyms.trim() || null,
        suggested_priority: form.suggested_priority || null,
        status: form.status,
        tag_labels: form.tag_labels.trim() || null,
        notes: form.notes.trim() || null,
      };
      if (editorMode === "create") {
        await apiRequest<TermItem>("/v1/glossary/terms", { method: "POST", body: JSON.stringify(payload) });
        setToast({ tone: "success", message: "Termo criado com sucesso." });
      } else if (editingTerm) {
        await apiRequest<TermItem>(`/v1/glossary/terms/${editingTerm.id}`, { method: "PATCH", body: JSON.stringify(payload) });
        setToast({ tone: "success", message: "Termo atualizado com sucesso." });
      }
      setEditorOpen(false);
      await loadTerms();
      if (selectedTerm && editingTerm?.id === selectedTerm.id) {
        await openDetails(selectedTerm.id);
      }
    } catch (error) {
      setToast({ tone: "error", message: (error as Error).message });
    } finally {
      setSaving(false);
    }
  }

  async function toggleStatus(item: TermItem) {
    const nextStatus = item.status === "active" ? "inactive" : "active";
    try {
      await apiRequest(`/v1/glossary/terms/${item.id}`, {
        method: "PATCH",
        body: JSON.stringify({ status: nextStatus }),
      });
      setToast({
        tone: "success",
        message: nextStatus === "active" ? "Termo reativado com sucesso." : "Termo desativado com sucesso.",
      });
      await loadTerms();
      if (selectedTerm?.id === item.id) {
        await openDetails(item.id);
      }
    } catch (error) {
      setToast({ tone: "error", message: (error as Error).message });
    }
  }

  function askDeleteTerm(item: TermItem) {
    setDeleteTarget(item);
    setDeleteDialogOpen(true);
  }

  async function confirmDeleteTerm() {
    if (!deleteTarget) return;
    setDeleteSaving(true);
    try {
      await apiRequest(`/v1/glossary/terms/${deleteTarget.id}`, { method: "DELETE" });
      setToast({ tone: "success", message: "Termo removido com sucesso." });
      if (selectedTerm?.id === deleteTarget.id) {
        setDetailOpen(false);
        setSelectedTerm(null);
      }
      setDeleteDialogOpen(false);
      setDeleteTarget(null);
      await loadTerms();
    } catch (error) {
      setToast({ tone: "error", message: (error as Error).message });
    } finally {
      setDeleteSaving(false);
    }
  }

  async function confirmResetTerms() {
    setResetSaving(true);
    try {
      const result = await apiRequest<{ deleted_terms: number; deleted_assignments: number }>("/v1/glossary/reset", {
        method: "POST",
        body: JSON.stringify({ confirmation: "APAGAR" }),
      });
      setToast({
        tone: "success",
        message: `Termos zerados com sucesso. ${result.deleted_terms} termos e ${result.deleted_assignments} vínculos removidos.`,
      });
      setResetDialogOpen(false);
      await loadTerms();
      if (selectedTerm) {
        setDetailOpen(false);
        setSelectedTerm(null);
      }
    } catch (error) {
      setToast({ tone: "error", message: (error as Error).message });
    } finally {
      setResetSaving(false);
    }
  }

  async function exportSpreadsheet() {
    try {
      await downloadApiFile("/v1/glossary/export", "glossario_export.xlsx", undefined, {
        confirmMessage:
          "Exportar o glossário em Excel (limite de 2.500 linhas)? A exportação será auditada e campos sensíveis permanecem mascarados.",
      });
      setToast({ tone: "success", message: "Planilha exportada com sucesso." });
    } catch (error) {
      setToast({ tone: "error", message: (error as Error).message });
    }
  }

  const totalPages = useMemo(() => Math.max(1, Math.ceil(total / pageSize)), [pageSize, total]);
  const rangeLabel = useMemo(() => formatPaginationRange(total, page, pageSize), [page, pageSize, total]);

  function goToPage(nextPage: number) {
    setPage(Math.min(Math.max(1, nextPage), totalPages));
  }

  function changePageSize(nextSize: number) {
    setPageSize(nextSize);
    setPage(1);
  }

  function resetCatalogFilters() {
    setQuery("");
    setCategory("");
    setSubcategory("");
    setStatusFilter("");
    setPriority("");
    setUsageFilter("");
    setPage(1);
  }

  function focusCatalogTab() {
    setActiveTab("catalog");
  }

  function focusIoTab() {
    setActiveTab("io");
  }

  function focusAdminTab() {
    setActiveTab("admin");
  }

  return (
    <div className="space-y-6 pb-10">
      {authExpired ? (
        <EmptyState
          title="Sessão expirada"
          description="Sua autenticação expirou. Faça login novamente para continuar usando o glossário."
        />
      ) : null}

      <Card className="overflow-hidden border-border bg-[linear-gradient(135deg,#ffffff_0%,#f8fafc_55%,#eef6ff_100%)] shadow-[0_18px_48px_rgba(15,23,42,0.06)]">
        <CardContent className="space-y-4 p-6">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div className="max-w-3xl space-y-2">
              <Badge tone="accent">Glossário de negócio</Badge>
              <h1 className="text-3xl font-semibold tracking-tight text-text">Glossário</h1>
              <p className="text-sm leading-7 text-text-body">Termos de negócio e seu uso nas tabelas.</p>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button onClick={openImport} size="sm">
                <Upload className="h-4 w-4" />
                Importar planilha
              </Button>
              {canExport ? (
                <Button onClick={() => void exportSpreadsheet()} size="sm" variant="outline">
                  <Download className="h-4 w-4" />
                  Exportar planilha
                </Button>
              ) : null}
              {canManage ? (
                <Button onClick={openCreate} size="sm">
                  <Plus className="h-4 w-4" />
                  Novo termo
                </Button>
              ) : null}
              {canManage ? (
                <Button onClick={() => setResetDialogOpen(true)} size="sm" variant="danger">
                  Zerar termos
                </Button>
              ) : null}
              <Button onClick={() => void loadTerms()} size="sm" variant="ghost">
                <RefreshCw className="h-4 w-4" />
                Atualizar
              </Button>
            </div>
          </div>
          {toast ? (
            <div
              className={`rounded-xl border px-4 py-3 text-sm ${
                toast.tone === "success"
                  ? "border-success-200 bg-success-50 text-success-700"
                  : "border-danger-200 bg-danger-50 text-danger-700"
              }`}
            >
              {toast.message}
            </div>
          ) : null}
        </CardContent>
      </Card>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <button className="text-left" onClick={focusCatalogTab} type="button">
          <Card className="border-violet-200 bg-gradient-to-br from-violet-50 to-white shadow-[0_12px_36px_rgba(15,23,42,0.05)]">
            <CardContent className="py-5">
              <p className="text-xs font-semibold uppercase tracking-wide text-violet-700">Total de termos</p>
              <p className="mt-2 text-3xl font-semibold text-text">{summary.total}</p>
            </CardContent>
          </Card>
        </button>
        <button className="text-left" onClick={focusCatalogTab} type="button">
          <Card className="border-success-200 bg-gradient-to-br from-emerald-50 to-white shadow-[0_12px_36px_rgba(15,23,42,0.05)]">
            <CardContent className="py-5">
              <p className="text-xs font-semibold uppercase tracking-wide text-success-700">Ativos</p>
              <p className="mt-2 text-3xl font-semibold text-text">{summary.active}</p>
            </CardContent>
          </Card>
        </button>
        <button
          className="text-left"
          onClick={() => {
            focusCatalogTab();
            setUsageFilter("used");
          }}
          type="button"
        >
          <Card className="border-info-200 bg-gradient-to-br from-accent-50 to-white shadow-[0_12px_36px_rgba(15,23,42,0.05)]">
            <CardContent className="py-5">
              <p className="text-xs font-semibold uppercase tracking-wide text-info-700">Vinculados</p>
              <p className="mt-2 text-3xl font-semibold text-text">{summary.in_use}</p>
            </CardContent>
          </Card>
        </button>
        <button className="text-left" onClick={focusAdminTab} type="button">
          <Card className="border-warning-200 bg-gradient-to-br from-amber-50 to-white shadow-[0_12px_36px_rgba(15,23,42,0.05)]">
            <CardContent className="py-5">
              <p className="text-xs font-semibold uppercase tracking-wide text-warning-700">Categorias</p>
              <p className="mt-2 text-3xl font-semibold text-text">{summary.categories}</p>
            </CardContent>
          </Card>
        </button>
      </div>

      <div className="flex flex-wrap gap-2 rounded-2xl border border-border bg-surface p-2 shadow-[0_10px_30px_rgba(15,23,42,0.05)]">
        <Button onClick={() => setActiveTab("catalog")} size="sm" variant={activeTab === "catalog" ? "default" : "ghost"}>
          Catálogo de termos
        </Button>
        <Button onClick={focusIoTab} size="sm" variant={activeTab === "io" ? "default" : "ghost"}>
          Importação e exportação
        </Button>
        {canManage ? (
          <Button onClick={() => setActiveTab("admin")} size="sm" variant={activeTab === "admin" ? "default" : "ghost"}>
            Administração
          </Button>
        ) : null}
      </div>

      {loading ? (
        <Card>
          <CardContent className="py-8 text-sm text-muted">Carregando termos...</CardContent>
        </Card>
      ) : (
        <>
          {activeTab === "catalog" ? (
            <div className="space-y-6">
              <Card className="border-border bg-surface shadow-[0_12px_36px_rgba(15,23,42,0.05)]">
                <CardHeader className="px-6 py-5 lg:px-7">
                  <div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
                    <div>
                      <h2 className="text-lg font-semibold text-text">Filtros operacionais</h2>
                      <p className="text-sm text-muted">Busque, refine e reorganize o glossário sem perder o contexto da tabela associada.</p>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <Button onClick={resetCatalogFilters} size="sm" variant="ghost">
                        Limpar filtros
                      </Button>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-6 px-6 pb-6 pt-0 lg:px-7">
                  <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                    <div className="xl:col-span-2">
                      <label className="mb-1 block text-sm font-medium text-text-body">Busca textual</label>
                      <Input
                        onChange={(event) => {
                          setQuery(event.target.value);
                          setPage(1);
                        }}
                        placeholder="Termo, slug, definição, categoria ou subcategoria"
                        value={query}
                      />
                    </div>
                    <div>
                      <label className="mb-1 block text-sm font-medium text-text-body">Categoria</label>
                      <Select
                        onChange={(event) => {
                          setCategory(event.target.value);
                          setPage(1);
                        }}
                        value={category}
                      >
                        <option value="">Todas</option>
                        {filters.categories.map((item) => (
                          <option key={item} value={item}>
                            {item}
                          </option>
                        ))}
                      </Select>
                    </div>
                    <div>
                      <label className="mb-1 block text-sm font-medium text-text-body">Subcategoria</label>
                      <Select
                        onChange={(event) => {
                          setSubcategory(event.target.value);
                          setPage(1);
                        }}
                        value={subcategory}
                      >
                        <option value="">Todas</option>
                        {filters.subcategories.map((item) => (
                          <option key={item} value={item}>
                            {item}
                          </option>
                        ))}
                      </Select>
                    </div>
                    <div>
                      <label className="mb-1 block text-sm font-medium text-text-body">Status</label>
                      <Select
                        onChange={(event) => {
                          setStatusFilter(event.target.value);
                          setPage(1);
                        }}
                        value={statusFilter}
                      >
                        <option value="">Todos</option>
                        {filters.statuses.map((item) => (
                          <option key={item} value={item}>
                            {statusLabel(item)}
                          </option>
                        ))}
                      </Select>
                    </div>
                    <div>
                      <label className="mb-1 block text-sm font-medium text-text-body">Prioridade</label>
                      <Select
                        onChange={(event) => {
                          setPriority(event.target.value);
                          setPage(1);
                        }}
                        value={priority}
                      >
                        <option value="">Todas</option>
                        {filters.priorities.map((item) => (
                          <option key={item} value={item}>
                            {priorityLabel(item)}
                          </option>
                        ))}
                      </Select>
                    </div>
                    <div>
                      <label className="mb-1 block text-sm font-medium text-text-body">Uso</label>
                      <Select
                        onChange={(event) => {
                          setUsageFilter(event.target.value as UsageFilter);
                          setPage(1);
                        }}
                        value={usageFilter}
                      >
                        <option value="">Todos</option>
                        <option value="used">Vinculados</option>
                        <option value="unused">Sem vínculo</option>
                      </Select>
                    </div>
                  </div>

                  <div className="overflow-hidden rounded-2xl border border-border">
                    <table className="min-w-full divide-y divide-border text-left">
                      <thead className="bg-bg-subtle">
                        <tr className="text-[11px] uppercase tracking-[0.16em] text-muted">
                          <th className="px-4 py-3">Termo</th>
                          <th className="px-4 py-3">Categoria / subcategoria</th>
                          <th className="px-4 py-3">Prioridade</th>
                          <th className="px-4 py-3">Status</th>
                          <th className="px-4 py-3">Uso</th>
                          <th className="px-4 py-3">Atualizado em</th>
                          <th className="px-4 py-3">Ações</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-border bg-surface">
                        {items.map((item) => (
                          <tr className="align-top hover:bg-bg-subtle/60" key={item.id}>
                            <td className="px-4 py-4">
                              <div className="flex items-start gap-3">
                                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-orange-50 text-orange-600">
                                  <BookOpen className="h-4 w-4" />
                                </div>
                                <div className="min-w-0">
                                  <p className="break-words text-sm font-semibold text-text whitespace-normal">{item.name}</p>
                                  <p className="mt-1 text-xs uppercase tracking-wide text-muted">{item.slug}</p>
                                  <p className="mt-2 line-clamp-2 text-xs leading-5 text-text-body">{item.definition}</p>
                                </div>
                              </div>
                            </td>
                            <td className="px-4 py-4">
                              <div className="flex flex-wrap gap-2">
                                {item.category ? <Badge tone="neutral">{item.category}</Badge> : <span className="text-sm text-muted">Sem categoria</span>}
                                {item.subcategory ? <Badge tone="neutral">{item.subcategory}</Badge> : null}
                              </div>
                            </td>
                            <td className="px-4 py-4">
                              <Badge tone={priorityTone(item.suggested_priority)}>{priorityLabel(item.suggested_priority)}</Badge>
                            </td>
                            <td className="px-4 py-4">
                              <Badge tone={statusTone(item.status)}>{statusLabel(item.status)}</Badge>
                            </td>
                            <td className="px-4 py-4">
                              <p className="text-sm font-medium text-text">{item.tables_count} tabela(s)</p>
                              <p className="mt-1 text-xs text-muted">{item.tables_count > 0 ? "Em uso" : "Sem vínculo"}</p>
                            </td>
                            <td className="px-4 py-4 text-sm text-text-body">{formatDate(item.updated_at)}</td>
                            <td className="px-4 py-4">
                              <div className="flex flex-wrap gap-2">
                                <Button onClick={() => void openDetails(item.id)} size="sm" variant="outline">
                                  <Eye className="mr-2 h-4 w-4" />
                                  Ver detalhes
                                </Button>
                                {canManage ? (
                                  <>
                                    <Button onClick={() => openEdit(item)} size="sm" variant="ghost">
                                      <Pencil className="mr-1 h-4 w-4" />
                                      Editar
                                    </Button>
                                    <Button onClick={() => void toggleStatus(item)} size="sm" variant="ghost">
                                      {item.status === "active" ? "Desativar" : "Ativar"}
                                    </Button>
                                    <Button onClick={() => askDeleteTerm(item)} size="sm" variant="ghost">
                                      <Trash2 className="mr-1 h-4 w-4" />
                                      Apagar
                                    </Button>
                                  </>
                                ) : null}
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  <div className="flex flex-col gap-3 border-t border-border pt-4 lg:flex-row lg:items-center lg:justify-between">
                    <div className="flex flex-wrap items-center gap-2 text-sm text-text-body">
                      <span>{rangeLabel}</span>
                      {hasMore ? <Badge tone="accent">Mais resultados disponíveis</Badge> : null}
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                      <Select onChange={(event) => changePageSize(Number(event.target.value))} value={String(pageSize)}>
                        {PAGE_SIZE_OPTIONS.map((option) => (
                          <option key={option} value={option}>
                            {option} por página
                          </option>
                        ))}
                      </Select>
                      <div className="flex items-center gap-2">
                        <Button disabled={page <= 1} onClick={() => goToPage(page - 1)} size="sm" variant="outline">
                          Anterior
                        </Button>
                        <Badge tone="neutral">
                          Página {page} de {totalPages}
                        </Badge>
                        <Button disabled={page >= totalPages} onClick={() => goToPage(page + 1)} size="sm" variant="outline">
                          Próxima
                        </Button>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
              {items.length === 0 ? (
                <EmptyState
                  title="Nenhum termo encontrado"
                  description="Ajuste os filtros, importe uma planilha ou crie o primeiro termo do glossário."
                />
              ) : null}
            </div>
          ) : null}

          {activeTab === "io" ? (
            <div className="grid gap-4 lg:grid-cols-2">
              <Card className="border-border bg-surface shadow-[0_12px_36px_rgba(15,23,42,0.05)]">
                <CardHeader>
                  <h2 className="text-lg font-semibold text-text">Importação</h2>
                </CardHeader>
                <CardContent className="space-y-4">
                  <p className="text-sm leading-6 text-text-body">
                    Use a planilha oficial para incluir ou atualizar termos pela chave `slug`. O processamento continua auditado e segue o mesmo contrato do backend.
                  </p>
                  <div className="flex flex-wrap gap-2">
                    <Button onClick={openImport} size="sm">
                      <Upload className="h-4 w-4" />
                      Abrir importação
                    </Button>
                    <Button onClick={() => void downloadTemplate()} size="sm" variant="outline">
                      <Download className="h-4 w-4" />
                      Baixar modelo
                    </Button>
                  </div>
                </CardContent>
              </Card>

              <Card className="border-border bg-surface shadow-[0_12px_36px_rgba(15,23,42,0.05)]">
                <CardHeader>
                  <h2 className="text-lg font-semibold text-text">Exportação</h2>
                </CardHeader>
                <CardContent className="space-y-4">
                  <p className="text-sm leading-6 text-text-body">
                    Exporte o glossário em Excel para revisão ou round-trip. O arquivo respeita o limite operacional do backend e mantém os campos sensíveis mascarados.
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {canExport ? (
                      <Button onClick={() => void exportSpreadsheet()} size="sm" variant="outline">
                        <Download className="h-4 w-4" />
                        Exportar planilha
                      </Button>
                    ) : null}
                    <Button onClick={focusAdminTab} size="sm" variant="ghost">
                      Ir para administração
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </div>
          ) : null}

          {activeTab === "admin" && canManage ? (
            <div className="grid gap-4 lg:grid-cols-2">
              <Card className="border-border bg-surface shadow-[0_12px_36px_rgba(15,23,42,0.05)]">
                <CardHeader>
                  <h2 className="text-lg font-semibold text-text">Manutenção rápida</h2>
                </CardHeader>
                <CardContent className="space-y-3">
                  <p className="text-sm leading-6 text-text-body">
                    Crie um novo termo ou limpe o conjunto inteiro quando precisar reconstruir o glossário do zero.
                  </p>
                  <div className="flex flex-wrap gap-2">
                    <Button onClick={openCreate} size="sm">
                      <Plus className="h-4 w-4" />
                      Novo termo
                    </Button>
                    <Button onClick={() => setResetDialogOpen(true)} size="sm" variant="danger">
                      Zerar termos
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </div>
          ) : null}
        </>
      )}

      <GlossaryEditorDialog
        open={editorOpen}
        mode={editorMode}
        form={form}
        saving={saving}
        priorityOptions={Object.keys(PRIORITY_LABELS)}
        statusOptions={Object.keys(STATUS_LABELS)}
        priorityLabel={priorityLabel}
        statusLabel={statusLabel}
        setForm={setForm}
        onClose={() => setEditorOpen(false)}
        onSubmit={(event) => void saveTerm(event)}
      />

      <GlossaryDetailDialog
        open={detailOpen}
        loading={detailLoading}
        selectedTerm={selectedTerm}
        onClose={() => setDetailOpen(false)}
        formatDate={formatDate}
        parseTagLabels={parseTagLabels}
        priorityLabel={priorityLabel}
        priorityTone={priorityTone}
        statusLabel={statusLabel}
        statusTone={statusTone}
      />

      <DangerConfirmDialog
        busy={deleteSaving}
        confirmLabel="Apagar"
        confirmToken="APAGAR"
        confirmTokenLabel="Digite APAGAR para apagar o termo"
        description={
          deleteTarget
            ? `Essa ação apagará o termo "${deleteTarget.name}" e todos os seus vínculos com tabelas.`
            : "Essa ação apagará o termo selecionado e todos os seus vínculos com tabelas."
        }
        open={deleteDialogOpen}
        onCancel={() => {
          setDeleteDialogOpen(false);
          setDeleteTarget(null);
        }}
        onConfirm={() => void confirmDeleteTerm()}
        title={deleteTarget ? `Apagar termo "${deleteTarget.name}"?` : "Apagar termo?"}
      />

      <DangerConfirmDialog
        busy={resetSaving}
        confirmLabel="Zerar"
        confirmToken="APAGAR"
        confirmTokenLabel="Digite APAGAR para zerar todos os termos"
        description="Essa ação apagará todos os termos e todos os vínculos associados. Use esta operação apenas quando quiser reconstruir o glossário do zero."
        open={resetDialogOpen}
        onCancel={() => setResetDialogOpen(false)}
        onConfirm={() => void confirmResetTerms()}
        title="Zerar Termos"
      />

      <GlossaryImportDialog
        open={importOpen}
        importing={importing}
        importResult={importResult}
        onClose={closeImport}
        onDownloadTemplate={() => void downloadTemplate()}
        onFileChange={onImportFileChange}
        onSubmit={(event) => void submitImport(event)}
      />
    </div>
  );
}
