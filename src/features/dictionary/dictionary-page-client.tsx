import { dynamic } from "@/lib/next-shims";
import { useEffect, useMemo, useState } from "react";
import { usePathname, useRouter, useSearchParams, type ReadonlyURLSearchParams } from "@/lib/next-shims";
import {
  Download,
  Filter,
  RefreshCw,
  Search,
  Upload,
  BookOpenText,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Banner } from "@/components/ui/banner";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { DangerConfirmDialog } from "@/components/ui/danger-confirm-dialog";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import { TagBadgeList } from "@/components/tags/tag-badges";
import { useAuth } from "@/lib/auth";
import { apiRequest, downloadApiFile } from "@/lib/client-api";
import { cn } from "@/lib/cn";
import type {
  ColumnDictionaryBulkResult,
  ColumnDictionaryDetail,
  ColumnDictionaryImportPreview,
  ColumnDictionaryImportResult,
  ColumnDictionaryItem,
  ColumnDictionaryPage,
  ColumnDictionaryResetResult,
  ColumnDictionarySummary,
  ColumnDictionaryUpdate,
} from "@/features/dictionary/types";

const DictionaryDetailDrawer = dynamic(
  () => import("@/features/dictionary/components/dictionary-detail-drawer").then((mod) => mod.DictionaryDetailDrawer),
  { ssr: false },
);
const DictionaryImportDialog = dynamic(
  () => import("@/features/dictionary/components/dictionary-import-dialog").then((mod) => mod.DictionaryImportDialog),
  { ssr: false },
);

type FilterValue = "" | "true" | "false";

type DraftFilters = {
  datasource_name: string;
  q: string;
  schema_name: string;
  table_name: string;
  data_type: string;
  is_primary_key: FilterValue;
  is_nullable: FilterValue;
  has_description: FilterValue;
  has_comment: FilterValue;
  has_existing_comment: FilterValue;
  sort_by: string;
  sort_dir: "asc" | "desc";
  page: number;
  page_size: number;
};

const DEFAULT_DRAFT: DraftFilters = {
  datasource_name: "",
  q: "",
  schema_name: "",
  table_name: "",
  data_type: "",
  is_primary_key: "",
  is_nullable: "",
  has_description: "",
  has_comment: "",
  has_existing_comment: "",
  sort_by: "schema",
  sort_dir: "asc",
  page: 1,
  page_size: 50,
};

function parseFilterValue(value: string | null): FilterValue {
  if (value === "true" || value === "false") return value;
  return "";
}

function parseDraftFromSearchParams(searchParams: ReadonlyURLSearchParams): DraftFilters {
  return {
    datasource_name: searchParams.get("datasource_name") || "",
    q: searchParams.get("q") || "",
    schema_name: searchParams.get("schema_name") || "",
    table_name: searchParams.get("table_name") || "",
    data_type: searchParams.get("data_type") || "",
    is_primary_key: parseFilterValue(searchParams.get("is_primary_key")),
    is_nullable: parseFilterValue(searchParams.get("is_nullable")),
    has_description: parseFilterValue(searchParams.get("has_description")),
    has_comment: parseFilterValue(searchParams.get("has_comment")),
    has_existing_comment: parseFilterValue(searchParams.get("has_existing_comment")),
    sort_by: searchParams.get("sort_by") || "schema",
    sort_dir: (searchParams.get("sort_dir") === "desc" ? "desc" : "asc"),
    page: Math.max(1, Number(searchParams.get("page") || 1)),
    page_size: Math.max(1, Number(searchParams.get("page_size") || 50)),
  };
}

function buildQueryString(draft: DraftFilters, override?: Partial<DraftFilters>): string {
  const value = { ...draft, ...override };
  const params = new URLSearchParams();
  if (value.datasource_name) params.set("datasource_name", value.datasource_name);
  if (value.q.trim()) params.set("q", value.q.trim());
  if (value.schema_name) params.set("schema_name", value.schema_name);
  if (value.table_name) params.set("table_name", value.table_name);
  if (value.data_type) params.set("data_type", value.data_type);
  if (value.is_primary_key) params.set("is_primary_key", value.is_primary_key);
  if (value.is_nullable) params.set("is_nullable", value.is_nullable);
  if (value.has_description) params.set("has_description", value.has_description);
  if (value.has_comment) params.set("has_comment", value.has_comment);
  if (value.has_existing_comment) params.set("has_existing_comment", value.has_existing_comment);
  if (value.sort_by) params.set("sort_by", value.sort_by);
  if (value.sort_dir) params.set("sort_dir", value.sort_dir);
  params.set("page", String(Math.max(1, value.page)));
  params.set("page_size", String(Math.max(1, value.page_size)));
  return params.toString();
}

function formatDateTime(value: string): string {
  try {
    return new Intl.DateTimeFormat("pt-BR", {
      dateStyle: "short",
      timeStyle: "short",
    }).format(new Date(value));
  } catch {
    return value;
  }
}

function toneFromStatus(status: string): "success" | "warning" | "danger" | "neutral" | "accent" {
  if (status === "complete") return "success";
  if (status === "partial") return "warning";
  return "danger";
}

function titleFromSort(value: string): string {
  switch (value) {
    case "schema":
      return "Schema";
    case "table":
      return "Tabela";
    case "column":
      return "Coluna";
    case "ordinal_position":
      return "Posição";
    case "data_type":
      return "Tipo de dado";
    case "updated_at":
      return "Atualização";
    default:
      return "Schema";
  }
}

export default function DictionaryAdminPage() {
  const auth = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const searchKey = searchParams.toString();
  const canManage = auth.canAccessPath("/governance/dictionary") && (auth.primaryRole === "admin" || auth.primaryRole === "editor");
  const canExport = auth.hasPermission("catalog:export");

  const [draft, setDraft] = useState<DraftFilters>(DEFAULT_DRAFT);
  const [summary, setSummary] = useState<ColumnDictionarySummary | null>(null);
  const [pageData, setPageData] = useState<ColumnDictionaryPage | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [refreshToken, setRefreshToken] = useState(0);
  const [selectedIds, setSelectedIds] = useState<number[]>([]);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [detail, setDetail] = useState<ColumnDictionaryDetail | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailSaving, setDetailSaving] = useState(false);
  const [detailForm, setDetailForm] = useState<ColumnDictionaryUpdate>({
    dictionary_description: "",
    dictionary_comment: "",
    existing_comment: "",
  });
  const [bulkForm, setBulkForm] = useState<ColumnDictionaryUpdate>({
    dictionary_description: "",
    dictionary_comment: "",
    existing_comment: "",
  });
  const [bulkSaving, setBulkSaving] = useState(false);
  const [notice, setNotice] = useState("");
  const [clearDialogOpen, setClearDialogOpen] = useState(false);
  const [clearDialogTarget, setClearDialogTarget] = useState<ColumnDictionaryItem | ColumnDictionaryDetail | null>(null);
  const [clearActionSaving, setClearActionSaving] = useState(false);
  const [resetDialogOpen, setResetDialogOpen] = useState(false);
  const [resetActionSaving, setResetActionSaving] = useState(false);
  const [importOpen, setImportOpen] = useState(false);
  const [importFile, setImportFile] = useState<File | null>(null);
  const [importPreview, setImportPreview] = useState<ColumnDictionaryImportPreview | null>(null);
  const [importPreviewLoading, setImportPreviewLoading] = useState(false);
  const [importing, setImporting] = useState(false);
  const [importResult, setImportResult] = useState<ColumnDictionaryImportResult | null>(null);

  useEffect(() => {
    setDraft(parseDraftFromSearchParams(searchParams));
  }, [searchKey]);

  async function loadData(currentKey: string) {
    const params = new URLSearchParams(currentKey);
    const query = params.toString();
    const [summaryPayload, pagePayload] = await Promise.all([
      apiRequest<ColumnDictionarySummary>(`/v1/catalog/column-dictionary/summary?${query}`),
      apiRequest<ColumnDictionaryPage>(`/v1/catalog/column-dictionary/items?${query}`),
    ]);
    setSummary(summaryPayload);
    setPageData(pagePayload);
  }

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError("");
    void (async () => {
      try {
        await loadData(searchKey);
        if (!cancelled) setSelectedIds([]);
      } catch (err) {
        if (!cancelled) setError((err as Error).message);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [searchKey, refreshToken]);

  useEffect(() => {
    if (!selectedId) {
      setDetail(null);
      return;
    }
    let cancelled = false;
    setDetailLoading(true);
    void (async () => {
      try {
        const payload = await apiRequest<ColumnDictionaryDetail>(`/v1/catalog/column-dictionary/items/${selectedId}`);
        if (cancelled) return;
        setDetail(payload);
        setDetailForm({
          dictionary_description: payload.dictionary_description || "",
          dictionary_comment: payload.dictionary_comment || "",
          existing_comment: payload.existing_comment || "",
        });
      } catch (err) {
        if (!cancelled) setNotice((err as Error).message);
      } finally {
        if (!cancelled) setDetailLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [selectedId]);

  const totalPages = useMemo(() => {
    if (!pageData) return 1;
    return Math.max(1, Math.ceil(pageData.total / pageData.page_size));
  }, [pageData]);

  const visibleItems = pageData?.items ?? [];

  function setQuery(next: Partial<DraftFilters>) {
    const merged = { ...draft, ...next, page: 1 };
    setDraft(merged);
  }

  function applyFilters(next?: Partial<DraftFilters>) {
    const merged = { ...draft, ...next, page: 1 } as DraftFilters;
    const query = buildQueryString(merged);
    router.replace(query ? `${pathname}?${query}` : pathname, { scroll: false });
  }

  function setPage(page: number) {
    const query = buildQueryString(draft, { page });
    router.replace(query ? `${pathname}?${query}` : pathname, { scroll: false });
  }

  function setPageSize(pageSize: number) {
    const query = buildQueryString(draft, { page_size: pageSize, page: 1 });
    router.replace(query ? `${pathname}?${query}` : pathname, { scroll: false });
  }

  function clearFilters() {
    setDraft(DEFAULT_DRAFT);
    router.replace(pathname, { scroll: false });
  }

  function refreshData() {
    setRefreshToken((current) => current + 1);
  }

  function toggleSelected(id: number) {
    setSelectedIds((current) => (current.includes(id) ? current.filter((value) => value !== id) : [...current, id]));
  }

  function toggleSelectAllVisible(checked: boolean) {
    if (!checked) {
      setSelectedIds([]);
      return;
    }
    setSelectedIds(visibleItems.map((item) => item.id));
  }

  async function openImportPreview() {
    if (!importFile) return;
    setImportPreviewLoading(true);
    setImportPreview(null);
    setImportResult(null);
    try {
      const formData = new FormData();
      formData.append("file", importFile);
      const payload = await apiRequest<ColumnDictionaryImportPreview>("/v1/catalog/column-dictionary/import-preview", {
        method: "POST",
        body: formData,
      });
      setImportPreview(payload);
      setNotice(
        payload.catalog_sync_required
          ? `Preview validado: ${payload.processed} processadas, ${payload.matched} casadas, ${payload.inserted} inseridas, ${payload.updated} atualizadas, ${payload.ignored} ignoradas, ${payload.rejected} rejeitadas. O catálogo técnico precisa ser sincronizado antes do import.`
          : `Preview validado: ${payload.processed} processadas, ${payload.matched} casadas, ${payload.inserted} inseridas, ${payload.updated} atualizadas, ${payload.ignored} ignoradas, ${payload.rejected} rejeitadas.`,
      );
    } catch (err) {
      setNotice((err as Error).message);
    } finally {
      setImportPreviewLoading(false);
    }
  }

  async function confirmImport() {
    if (!importFile || !importPreview) return;
    setImporting(true);
    try {
      const formData = new FormData();
      formData.append("file", importFile);
      const payload = await apiRequest<ColumnDictionaryImportResult>("/v1/catalog/column-dictionary/import", {
        method: "POST",
        body: formData,
      });
      setImportResult(payload);
      setNotice(
        `Importação concluída: ${payload.processed} processadas, ${payload.matched} casadas, ${payload.imported} inseridas, ${payload.updated} atualizadas, ${payload.ignored} ignoradas, ${payload.rejected} rejeitadas.`,
      );
      refreshData();
    } catch (err) {
      setNotice((err as Error).message);
    } finally {
      setImporting(false);
    }
  }

  async function saveDetail() {
    if (!selectedId || !detail) return;
    setDetailSaving(true);
    try {
      const payload = await apiRequest<ColumnDictionaryDetail>(`/v1/catalog/column-dictionary/items/${selectedId}`, {
        method: "PUT",
        body: JSON.stringify(detailForm),
      });
      setDetail(payload);
      setDetailForm({
        dictionary_description: payload.dictionary_description || "",
        dictionary_comment: payload.dictionary_comment || "",
        existing_comment: payload.existing_comment || "",
      });
      setNotice("Alterações salvas com sucesso.");
      refreshData();
    } catch (err) {
      setNotice((err as Error).message);
    } finally {
      setDetailSaving(false);
    }
  }

  async function refreshSelectedDetail(columnId: number | null = selectedId) {
    if (!columnId) return;
    try {
      const payload = await apiRequest<ColumnDictionaryDetail>(`/v1/catalog/column-dictionary/items/${columnId}`);
      setDetail(payload);
      setDetailForm({
        dictionary_description: payload.dictionary_description || "",
        dictionary_comment: payload.dictionary_comment || "",
        existing_comment: payload.existing_comment || "",
      });
    } catch (err) {
      setNotice((err as Error).message);
    }
  }

  function askClearItem(item: ColumnDictionaryItem | ColumnDictionaryDetail) {
    setClearDialogTarget(item);
    setClearDialogOpen(true);
  }

  async function confirmClearItem() {
    if (!clearDialogTarget) return;
    setClearActionSaving(true);
    try {
      await apiRequest<ColumnDictionaryDetail>(`/v1/catalog/column-dictionary/items/${clearDialogTarget.id}`, {
        method: "DELETE",
      });
      setNotice("Curadoria da coluna apagada com sucesso.");
      setClearDialogOpen(false);
      setClearDialogTarget(null);
      await loadData(searchKey);
      setSelectedIds([]);
      await refreshSelectedDetail(clearDialogTarget.id === selectedId ? clearDialogTarget.id : selectedId);
    } catch (err) {
      setNotice((err as Error).message);
    } finally {
      setClearActionSaving(false);
    }
  }

  async function confirmResetDictionary() {
    setResetActionSaving(true);
    try {
      const payload = await apiRequest<ColumnDictionaryResetResult>("/v1/catalog/column-dictionary/reset", {
        method: "POST",
        body: JSON.stringify({ confirmation: "APAGAR" }),
      });
      setNotice(`Dicionário zerado com sucesso. ${payload.deleted_columns} linhas foram removidas.`);
      setResetDialogOpen(false);
      await loadData(searchKey);
      setSelectedIds([]);
      setSelectedId(null);
      setDetail(null);
      await refreshSelectedDetail();
    } catch (err) {
      setNotice((err as Error).message);
    } finally {
      setResetActionSaving(false);
    }
  }

  async function applyBulkUpdate() {
    if (!canManage || selectedIds.length === 0) return;
    const hasValues = [bulkForm.dictionary_description, bulkForm.dictionary_comment, bulkForm.existing_comment].some((value) => Boolean((value ?? "").trim()));
    if (!hasValues) {
      setNotice("Informe ao menos um campo para aplicar em lote.");
      return;
    }
    const ok = window.confirm(`Aplicar alterações a ${selectedIds.length} colunas selecionadas?`);
    if (!ok) return;
    setBulkSaving(true);
    try {
      const payload = await apiRequest<ColumnDictionaryBulkResult>("/v1/catalog/column-dictionary/bulk-update", {
        method: "POST",
        body: JSON.stringify({
          column_ids: selectedIds,
          dictionary_description: bulkForm.dictionary_description || null,
          dictionary_comment: bulkForm.dictionary_comment || null,
          existing_comment: bulkForm.existing_comment || null,
        }),
      });
      setNotice(`Lote aplicado em ${payload.updated} colunas. Não encontradas: ${payload.not_found.length}.`);
      setSelectedIds([]);
      setBulkForm({ dictionary_description: "", dictionary_comment: "", existing_comment: "" });
      refreshData();
    } catch (err) {
      setNotice((err as Error).message);
    } finally {
      setBulkSaving(false);
    }
  }

  async function downloadExport() {
    try {
      await downloadApiFile(`/v1/catalog/column-dictionary/export?${searchKey}`, "dicionario_dados_export.xlsx", undefined, {
        confirmMessage:
          "Exportar o recorte filtrado do dicionário em Excel (limite de 2.500 linhas)? A exportação será auditada e campos sensíveis permanecem mascarados.",
      });
    } catch (err) {
      setNotice((err as Error).message);
    }
  }

  async function downloadTemplate() {
    try {
      await downloadApiFile("/v1/catalog/column-dictionary/template", "dicionario_dados_template.xlsx");
    } catch (err) {
      setNotice((err as Error).message);
    }
  }

  const selectAllVisible = visibleItems.length > 0 && visibleItems.every((item) => selectedIds.includes(item.id));
  const clearDialogTitle = clearDialogTarget ? `Apagar curadoria da coluna ${clearDialogTarget.name}?` : "Apagar curadoria da coluna?";
  const clearDialogDescription = clearDialogTarget
    ? `Essa ação apagará apenas a curadoria/documentação da coluna ${clearDialogTarget.schema_name}.${clearDialogTarget.table_name}.${clearDialogTarget.name}. A estrutura técnica, a descoberta do catálogo e os metadados essenciais permanecerão preservados.`
    : "Essa ação apagará apenas a curadoria/documentação da coluna selecionada. A estrutura técnica e os metadados essenciais permanecerão preservados.";

  return (
    <div className="mx-auto w-full max-w-[1920px] space-y-8 pb-10">
      <Card className="overflow-hidden border-border bg-[linear-gradient(135deg,#ffffff_0%,#f8fafc_55%,#eef6ff_100%)] shadow-[0_18px_48px_rgba(15,23,42,0.06)]">
        <CardContent className="space-y-4 p-6">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div className="max-w-3xl space-y-2">
              <div className="flex items-center gap-2">
                <Badge tone="accent">Administração premium</Badge>
                <Badge tone="neutral">Excel round-trip</Badge>
              </div>
              <h1 className="text-3xl font-semibold tracking-tight text-text">Dicionário de Dados</h1>
              <p className="text-sm leading-7 text-text-body">
                Curadoria operacional de colunas catalogadas com foco em completude, consistência e edição segura. O fluxo preserva a planilha oficial como formato de troca.
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button onClick={() => setImportOpen(true)} size="sm">
                <Upload className="h-4 w-4" />
                Importar Excel
              </Button>
              {canExport ? (
                <Button onClick={() => void downloadExport()} size="sm" variant="outline">
                  <Download className="h-4 w-4" />
                  Exportar Excel
                </Button>
              ) : null}
              <Button onClick={() => void downloadTemplate()} size="sm" variant="outline">
                <BookOpenText className="h-4 w-4" />
                Modelo
              </Button>
              {canManage ? (
                <Button onClick={() => setResetDialogOpen(true)} size="sm" variant="danger">
                  Zerar dicionário
                </Button>
              ) : null}
              <Button onClick={refreshData} size="sm" variant="ghost">
                <RefreshCw className="h-4 w-4" />
                Atualizar
              </Button>
            </div>
          </div>
          {notice ? (
            <Banner description={notice} tone="info" title="Aviso do dicionário" />
          ) : null}
        </CardContent>
      </Card>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4 2xl:grid-cols-7">
        {([
          { label: "Total de colunas", value: summary?.total_columns ?? 0, tone: "neutral" as const },
          { label: "Total de tabelas", value: summary?.total_tables ?? 0, tone: "neutral" as const },
          { label: "Total de schemas", value: summary?.total_schemas ?? 0, tone: "neutral" as const },
          { label: "% documentado", value: `${summary?.documented_pct ?? 0}%`, tone: "success" as const },
          { label: "% comentário", value: `${summary?.comment_pct ?? 0}%`, tone: "accent" as const },
          { label: "% comentário existente", value: `${summary?.existing_comment_pct ?? 0}%`, tone: "warning" as const },
          {
            label: "Pendências",
            value: summary?.pending_columns ?? 0,
            tone: "danger" as const,
            onClick: () => applyFilters({ has_description: "false" }),
            filterLabel: "colunas sem descrição",
          },
        ] as Array<{
          label: string;
          value: string | number;
          tone: "success" | "warning" | "danger" | "neutral" | "accent";
          onClick?: () => void;
          filterLabel?: string;
        }>).map((item) => {
          if (item.onClick) {
            return (
              <button
                type="button"
                aria-label={`Filtrar por ${item.filterLabel}`}
                className="cursor-pointer rounded-card border border-border bg-surface text-left shadow-[0_12px_36px_rgba(15,23,42,0.05)] backdrop-blur-sm transition-colors hover:border-border-strong"
                key={item.label}
                onClick={item.onClick}
              >
                <CardContent className="p-4">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-brand-600">{item.label}</p>
                  <div className="mt-2 flex items-end justify-between gap-2">
                    <p className="text-2xl font-semibold text-text">{item.value}</p>
                  </div>
                </CardContent>
              </button>
            );
          }
          return (
            <Card className="border-border bg-surface shadow-[0_12px_36px_rgba(15,23,42,0.05)]" key={item.label}>
              <CardContent className="p-4">
                <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-brand-600">{item.label}</p>
                <div className="mt-2 flex items-end justify-between gap-2">
                  <p className="text-2xl font-semibold text-text">{item.value}</p>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <div className="space-y-6">
        <Card className="border-border bg-surface shadow-[0_12px_36px_rgba(15,23,42,0.05)]">
          <CardHeader className="px-6 py-5 lg:px-7">
            <div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
              <div>
                <h2 className="text-lg font-semibold text-text">Filtros operacionais</h2>
                <p className="text-sm text-muted">Busque, refine e reorganize o dicionário sem perder o contexto da planilha oficial.</p>
              </div>
              <div className="flex flex-wrap gap-2">
                <Button onClick={() => applyFilters()} size="sm">
                  <Search className="h-4 w-4" />
                  Aplicar filtros
                </Button>
                <Button onClick={clearFilters} size="sm" variant="ghost">
                  Limpar filtros
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-6 px-6 pb-6 pt-0 lg:px-7">
              <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
              <div>
                <label className="mb-1 block text-sm font-medium text-text-body">Fonte de dados</label>
                <Select onChange={(event) => setQuery({ datasource_name: event.target.value })} value={draft.datasource_name}>
                  <option value="">Todas</option>
                  {(pageData?.filters.datasources ?? []).map((item) => (
                    <option key={item} value={item}>
                      {item}
                    </option>
                  ))}
                </Select>
              </div>
              <div className="md:col-span-2 xl:col-span-2">
                <label className="mb-1 block text-sm font-medium text-text-body">Busca textual</label>
                <Input
                  onChange={(event) => setQuery({ q: event.target.value })}
                  placeholder="Schema, tabela, coluna, descrição ou comentário"
                  value={draft.q}
                />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-text-body">Schema</label>
                <Select onChange={(event) => setQuery({ schema_name: event.target.value })} value={draft.schema_name}>
                  <option value="">Todos</option>
                  {(pageData?.filters.schemas ?? []).map((item) => (
                    <option key={item} value={item}>
                      {item}
                    </option>
                  ))}
                </Select>
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-text-body">Tabela</label>
                <Select onChange={(event) => setQuery({ table_name: event.target.value })} value={draft.table_name}>
                  <option value="">Todas</option>
                  {(pageData?.filters.tables ?? []).map((item) => (
                    <option key={item} value={item}>
                      {item}
                    </option>
                  ))}
                </Select>
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-text-body">Tipo de dado</label>
                <Select onChange={(event) => setQuery({ data_type: event.target.value })} value={draft.data_type}>
                  <option value="">Todos</option>
                  {(pageData?.filters.data_types ?? []).map((item) => (
                    <option key={item} value={item}>
                      {item}
                    </option>
                  ))}
                </Select>
              </div>
              {[
                ["is_primary_key", "Chave primária"],
                ["is_nullable", "Aceita nulo"],
                ["has_description", "Com descrição"],
                ["has_comment", "Com comentário"],
                ["has_existing_comment", "Com comentário existente"],
              ].map(([field, label]) => (
                <div key={field}>
                  <label className="mb-1 block text-sm font-medium text-text-body">{label}</label>
                  <Select
                    onChange={(event) => setQuery({ [field]: event.target.value as FilterValue } as Partial<DraftFilters>)}
                    value={draft[field as keyof Pick<DraftFilters, "is_primary_key" | "is_nullable" | "has_description" | "has_comment" | "has_existing_comment">] as FilterValue}
                  >
                    <option value="">Todos</option>
                    <option value="true">Sim</option>
                    <option value="false">Não</option>
                  </Select>
                </div>
              ))}
              <div>
                <label className="mb-1 block text-sm font-medium text-text-body">Ordenar por</label>
                <Select onChange={(event) => setQuery({ sort_by: event.target.value })} value={draft.sort_by}>
                  {["schema", "table", "column", "ordinal_position", "data_type", "updated_at"].map((value) => (
                    <option key={value} value={value}>
                      {titleFromSort(value)}
                    </option>
                  ))}
                </Select>
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-text-body">Direção</label>
                <Select onChange={(event) => setQuery({ sort_dir: event.target.value as "asc" | "desc" })} value={draft.sort_dir}>
                  <option value="asc">Crescente</option>
                  <option value="desc">Decrescente</option>
                </Select>
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-text-body">Por página</label>
                <Select onChange={(event) => setPageSize(Number(event.target.value))} value={String(pageData?.page_size ?? draft.page_size)}>
                  {[25, 50, 100, 150].map((value) => (
                    <option key={value} value={value}>
                      {value}
                    </option>
                  ))}
                </Select>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="overflow-hidden border-border bg-surface shadow-[0_12px_36px_rgba(15,23,42,0.05)]">
          <CardHeader className="px-6 py-5 lg:px-7">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h2 className="text-lg font-semibold text-text">Colunas do dicionário</h2>
                <p className="text-sm text-muted">Grade operacional com foco em documentação, completude e edição segura.</p>
              </div>
              <div className="flex flex-wrap gap-2">
                <Badge tone="neutral">{pageData?.total ?? 0} registros</Badge>
                <Badge tone="neutral">Ordenação: {titleFromSort(draft.sort_by)}</Badge>
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            {loading ? (
              <div className="space-y-3 p-4 lg:p-6">
                <Skeleton className="h-14 w-full" />
                <Skeleton className="h-14 w-full" />
                <Skeleton className="h-14 w-full" />
                <Skeleton className="h-14 w-full" />
              </div>
            ) : error ? (
              <div className="p-6 text-sm text-danger-700">{error}</div>
            ) : visibleItems.length === 0 ? (
              <div className="p-10 text-center">
                <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-3xl bg-bg-subtle text-muted">
                  <Filter className="h-6 w-6" />
                </div>
                <h3 className="mt-4 text-lg font-semibold text-text">Nenhuma coluna encontrada</h3>
                <p className="mt-2 text-sm text-muted">Ajuste os filtros ou importe uma planilha para enriquecer o dicionário.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full min-w-[1560px] table-fixed border-separate border-spacing-0">
                  <colgroup>
                    {canManage ? <col className="w-12" /> : null}
                    <col className="w-40" />
                    <col className="w-56" />
                    <col className="w-60" />
                    <col className="w-36" />
                    <col className="w-24" />
                    <col className="w-24" />
                    <col className="w-[26rem]" />
                    <col className="w-[26rem]" />
                    <col className="w-40" />
                    {canManage ? <col className="w-44" /> : null}
                  </colgroup>
                  <thead className="sticky top-0 z-10 bg-bg-subtle/95">
                    <tr className="text-left text-xs uppercase tracking-[0.16em] text-muted">
                      {canManage ? (
                        <th className="border-b border-border px-5 py-4">
                          <input checked={selectAllVisible} onChange={(event) => toggleSelectAllVisible(event.target.checked)} type="checkbox" />
                        </th>
                      ) : null}
                      {["Schema", "Tabela", "Nome da coluna", "Tipo", "PK", "Nulo", "Descrição", "Comentário", "Status"].map((label) => (
                        <th className="border-b border-border px-5 py-4" key={label}>
                          {label}
                        </th>
                      ))}
                      {canManage ? <th className="border-b border-border px-5 py-4">Ações</th> : null}
                    </tr>
                  </thead>
                  <tbody>
                    {visibleItems.map((item) => {
                      const descriptionText = item.dictionary_description || item.description_manual || item.description_source || "-";
                      const commentText = item.dictionary_comment || item.existing_comment || "-";
                      const selected = selectedIds.includes(item.id);
                      return (
                        <tr
                          className={cn(
                            "cursor-pointer border-b border-border transition-colors hover:bg-info-50/50",
                            selected ? "bg-info-50/70" : "bg-surface",
                          )}
                          key={item.id}
                          onClick={() => setSelectedId(item.id)}
                        >
                          {canManage ? (
                            <td className="border-b border-border px-5 py-4 align-top" onClick={(event) => event.stopPropagation()}>
                              <input checked={selected} onChange={() => toggleSelected(item.id)} type="checkbox" />
                            </td>
                          ) : null}
                          <td className="border-b border-border px-5 py-4 align-top text-sm text-text-body">{item.schema_name}</td>
                          <td className="border-b border-border px-5 py-4 align-top text-sm text-text-body">
                            <div className="font-medium text-text">{item.table_name}</div>
                            <div className="mt-1 text-xs text-muted">Posição {item.ordinal_position}</div>
                          </td>
                          <td className="border-b border-border px-5 py-4 align-top text-sm text-text-body">{item.name}</td>
                          <td className="border-b border-border px-5 py-4 align-top">
                            <Badge tone="neutral">{item.data_type}</Badge>
                          </td>
                          <td className="border-b border-border px-5 py-4 align-top">
                            {item.is_primary_key ? <Badge tone="accent">PK</Badge> : <Badge tone="neutral">-</Badge>}
                          </td>
                          <td className="border-b border-border px-5 py-4 align-top">
                            {item.is_nullable ? <Badge tone="neutral">Sim</Badge> : <Badge tone="warning">Não</Badge>}
                          </td>
                          <td className="border-b border-border px-5 py-4 align-top">
                            <span className="block truncate text-sm text-text-body" title={descriptionText}>
                              {descriptionText}
                            </span>
                          </td>
                          <td className="border-b border-border px-5 py-4 align-top">
                            <span className="block truncate text-sm text-text-body" title={commentText}>
                              {commentText}
                            </span>
                          </td>
                          <td className="border-b border-border px-5 py-4 align-top">
                            <Badge tone={toneFromStatus(item.documentation_status)}>{item.documentation_status_label}</Badge>
                            <div className="mt-2 text-xs text-muted">{item.documentation_pct}% completo</div>
                            <div className="mt-3">
                              <TagBadgeList tags={item.tags} maxVisible={3} />
                            </div>
                          </td>
                          {canManage ? (
                            <td className="border-b border-border px-5 py-4 align-top" onClick={(event) => event.stopPropagation()}>
                              <div className="flex flex-col gap-2">
                                <Button onClick={() => setSelectedId(item.id)} size="sm" variant="outline">
                                  Editar
                                </Button>
                                <Button onClick={() => askClearItem(item)} size="sm" variant="ghost">
                                  Apagar
                                </Button>
                              </div>
                            </td>
                          ) : null}
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>

        <div className="flex flex-col items-center justify-between gap-3 rounded-3xl border border-border bg-surface px-5 py-4 shadow-[0_12px_36px_rgba(15,23,42,0.05)] sm:flex-row">
          <p className="text-sm text-muted">
            Página {pageData?.page ?? draft.page} de {totalPages} • {pageData?.total ?? 0} registros
          </p>
          <div className="flex items-center gap-2">
            <Button disabled={(pageData?.page ?? draft.page) <= 1} onClick={() => setPage((pageData?.page ?? draft.page) - 1)} size="sm" variant="outline">
              Anterior
            </Button>
            <Badge tone="neutral">{pageData?.page ?? draft.page}</Badge>
            <Button
              disabled={(pageData?.page ?? draft.page) >= totalPages}
              onClick={() => setPage((pageData?.page ?? draft.page) + 1)}
              size="sm"
              variant="outline"
            >
              Próxima
            </Button>
          </div>
        </div>
      </div>

      <DictionaryDetailDrawer
        canManage={canManage}
        form={{
          dictionary_description: detailForm.dictionary_description || "",
          dictionary_comment: detailForm.dictionary_comment || "",
          existing_comment: detailForm.existing_comment || "",
        }}
        item={detail}
        loading={detailLoading}
        onClose={() => setSelectedId(null)}
        onFieldChange={(field, value) => setDetailForm((current) => ({ ...current, [field]: value }))}
        onClear={() => detail ? askClearItem(detail) : null}
        onSave={() => void saveDetail()}
        onTableDescriptionSaved={() => void refreshSelectedDetail()}
        open={selectedId !== null}
        saving={detailSaving}
        formatDateTime={formatDateTime}
      />

      <DangerConfirmDialog
        busy={clearActionSaving}
        confirmLabel="Apagar"
        confirmToken="APAGAR"
        confirmTokenLabel="Digite APAGAR para apagar a curadoria da coluna"
        description={clearDialogDescription}
        open={clearDialogOpen}
        onCancel={() => {
          setClearDialogOpen(false);
          setClearDialogTarget(null);
        }}
        onConfirm={() => void confirmClearItem()}
        title={clearDialogTitle}
      />

      <DangerConfirmDialog
        busy={resetActionSaving}
        confirmLabel="Zerar"
        confirmToken="APAGAR"
        confirmTokenLabel="Digite APAGAR para apagar todas as linhas do dicionário"
        description="Essa ação removerá todos os registros da tabela de dicionário de dados. A listagem ficará vazia e uma nova importação começará do zero."
        open={resetDialogOpen}
        onCancel={() => setResetDialogOpen(false)}
        onConfirm={() => void confirmResetDictionary()}
        title="Zerar Dicionário"
      />

      <DictionaryImportDialog
        file={importFile}
        importing={importing}
        onClose={() => {
          setImportOpen(false);
          setImportFile(null);
          setImportPreview(null);
          setImportResult(null);
        }}
        onConfirmImport={() => void confirmImport()}
        onDownloadExport={() => void downloadExport()}
        onDownloadTemplate={() => void downloadTemplate()}
        onFileChange={(file) => {
          setImportFile(file);
          setImportPreview(null);
          setImportResult(null);
        }}
        onPreview={() => void openImportPreview()}
        open={importOpen}
        preview={importPreview}
        previewLoading={importPreviewLoading}
        result={importResult}
      />
    </div>
  );
}
