import { FormEvent, useEffect, useMemo, useState } from "react";
import { Link } from "@/lib/next-shims";
import { useSearchParams } from "@/lib/next-shims";
import {
  Ban,
  CheckCircle2,
  ArrowUpRight,
  Download,
  Eye,
  Pencil,
  Plus,
  Tag as TagIcon,
  Trash2,
  Upload,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { DangerConfirmDialog } from "@/components/ui/danger-confirm-dialog";
import { TagBadgeList } from "@/components/tags/tag-badges";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { TagsDetailDialog } from "@/features/tags/components/detail-dialog";
import { TagsEditorDialog } from "@/features/tags/components/editor-dialog";
import { TagsImportDialog, type TagImportResult } from "@/features/tags/components/import-dialog";
import { useTagsImport } from "@/features/tags/hooks/use-tags-import";
import { normalizePageItems, type PageResponse } from "@/lib/pagination";
import { apiRequest, downloadApiFile } from "@/lib/client-api";
import { useAuth } from "@/lib/auth";
import type {
  AutomationRuleForm,
  PendingRiskBand,
  TagAutomationRule,
  TagDetail,
  TagFilters,
  TagFormState,
  TagIntelligenceBatchResult,
  TagIntelligenceSuggestion,
  TagItem,
  TagsTab,
} from "@/features/tags-page/types";
import {
  EMPTY_FORM,
  EMPTY_RULE_FORM,
  PENDING_PAGE_SIZE,
  STATUS_LABELS,
  TAGS_PAGE_SIZE,
} from "@/features/tags-page/constants";
import {
  confidenceTone,
  formatDate,
  formatPaginationRange,
  parseList,
  riskLabel,
  statusLabel,
  statusTone,
  toForm,
  toRuleForm,
} from "@/features/tags-page/helpers";

export default function TagsPage() {
  const searchParams = useSearchParams();
  const auth = useAuth();
  const canManage = auth.canAccessPath("/tags") && (auth.primaryRole === "admin" || auth.primaryRole === "editor");
  const canExport = auth.hasPermission("tag:export");
  const [activeTab, setActiveTab] = useState<TagsTab>("catalog");

  const [items, setItems] = useState<TagItem[]>([]);
  const [tagTotal, setTagTotal] = useState(0);
  const [tagSummary, setTagSummary] = useState<{ total: number; active: number; in_use: number; groups: number }>({
    total: 0,
    active: 0,
    in_use: 0,
    groups: 0,
  });
  const [tagPage, setTagPage] = useState(1);
  const [tagPageSize, setTagPageSize] = useState(TAGS_PAGE_SIZE);
  const [tagHasMore, setTagHasMore] = useState(false);
  const [filters, setFilters] = useState<TagFilters>({ groups: [], subgroups: [], statuses: [], tag_types: [] });
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");
  const [group, setGroup] = useState("");
  const [subgroup, setSubgroup] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [tagType, setTagType] = useState("");
  const [usageFilter, setUsageFilter] = useState<"" | "used" | "unused">("");
  const [toast, setToast] = useState<{ tone: "success" | "error"; message: string } | null>(null);

  const [editorOpen, setEditorOpen] = useState(false);
  const [editorMode, setEditorMode] = useState<"create" | "edit">("create");
  const [editingTag, setEditingTag] = useState<TagItem | null>(null);
  const [form, setForm] = useState<TagFormState>(EMPTY_FORM);
  const [saving, setSaving] = useState(false);

  const [detailOpen, setDetailOpen] = useState(false);
  const [detailLoading, setDetailLoading] = useState(false);
  const [selectedTag, setSelectedTag] = useState<TagDetail | null>(null);
  const [reprocessing, setReprocessing] = useState(false);
  const [pendingSuggestions, setPendingSuggestions] = useState<TagIntelligenceSuggestion[]>([]);
  const [pendingLoading, setPendingLoading] = useState(false);
  const [pendingActionId, setPendingActionId] = useState<number | null>(null);
  const [pendingTotal, setPendingTotal] = useState(0);
  const [pendingPage, setPendingPage] = useState(1);
  const [pendingPageSize, setPendingPageSize] = useState(PENDING_PAGE_SIZE);
  const [pendingEntityType, setPendingEntityType] = useState("");
  const [pendingTableQuery, setPendingTableQuery] = useState("");
  const [pendingColumnQuery, setPendingColumnQuery] = useState("");
  const [pendingTagSlug, setPendingTagSlug] = useState("");
  const [pendingInferenceSource, setPendingInferenceSource] = useState("");
  const [pendingMinConfidence, setPendingMinConfidence] = useState("");
  const [pendingMaxConfidence, setPendingMaxConfidence] = useState("");
  const [pendingRiskBand, setPendingRiskBand] = useState<PendingRiskBand>("");
  const [pendingReviewStatus, setPendingReviewStatus] = useState("");
  const [pendingSortBy, setPendingSortBy] = useState("risk_desc");
  const [pendingSelectedIds, setPendingSelectedIds] = useState<number[]>([]);
  const [pendingBatchAction, setPendingBatchAction] = useState<"apply" | "block" | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<TagItem | null>(null);
  const [deleteSaving, setDeleteSaving] = useState(false);
  const [resetDialogOpen, setResetDialogOpen] = useState(false);
  const [resetSaving, setResetSaving] = useState(false);

  const [automationRules, setAutomationRules] = useState<TagAutomationRule[]>([]);
  const [automationLoading, setAutomationLoading] = useState(false);
  const [automationEditorOpen, setAutomationEditorOpen] = useState(false);
  const [automationForm, setAutomationForm] = useState<AutomationRuleForm>({ ...EMPTY_RULE_FORM });
  const [automationSaving, setAutomationSaving] = useState(false);
  const [automationDeleteId, setAutomationDeleteId] = useState<number | null>(null);
  const [automationDeleteOpen, setAutomationDeleteOpen] = useState(false);

  async function loadTags() {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: String(tagPage),
        page_size: String(TAGS_PAGE_SIZE),
      });
      if (query.trim()) params.set("query", query.trim());
      if (group) params.set("group", group);
      if (subgroup) params.set("subgroup", subgroup);
      if (statusFilter) params.set("status", statusFilter);
      if (tagType) params.set("tag_type", tagType);
      if (usageFilter === "used") params.set("in_use", "true");
      if (usageFilter === "unused") params.set("without_use", "true");
      const [tagData, filterData, summaryData] = await Promise.all([
        apiRequest<PageResponse<TagItem>>(`/v1/tags?${params.toString()}`),
        apiRequest<TagFilters>("/v1/tags/filters"),
        apiRequest<{ total: number; active: number; in_use: number; groups: number }>(`/v1/tags/summary?${params.toString()}`),
      ]);
      const normalizedItems = normalizePageItems(tagData);
      setItems(normalizedItems);
      setTagTotal(summaryData.total ?? tagData.total ?? normalizedItems.length);
      setTagPageSize(tagData.page_size ?? TAGS_PAGE_SIZE);
      setTagHasMore(Boolean(tagData.has_more));
      setTagSummary(summaryData);
      setFilters(filterData);
    } catch (error) {
      setItems([]);
      setTagTotal(0);
      setTagSummary({ total: 0, active: 0, in_use: 0, groups: 0 });
      setToast({ tone: "error", message: (error as Error).message });
    } finally {
      setLoading(false);
    }
  }

  async function loadPendingSuggestions() {
    setPendingLoading(true);
    try {
      const params = new URLSearchParams({
        page: String(pendingPage),
        page_size: String(PENDING_PAGE_SIZE),
      });
      if (pendingEntityType) params.set("entity_type", pendingEntityType);
      if (pendingTagSlug.trim()) params.set("tag_slug", pendingTagSlug.trim());
      if (pendingTableQuery.trim()) params.set("table", pendingTableQuery.trim());
      if (pendingColumnQuery.trim()) params.set("column", pendingColumnQuery.trim());
      if (pendingInferenceSource.trim()) params.set("inference_source", pendingInferenceSource.trim());
      if (pendingMinConfidence.trim()) params.set("min_confidence", pendingMinConfidence.trim());
      if (pendingMaxConfidence.trim()) params.set("max_confidence", pendingMaxConfidence.trim());
      if (pendingRiskBand) params.set("risk_band", pendingRiskBand);
      if (pendingReviewStatus.trim()) params.set("review_status", pendingReviewStatus.trim());
      if (pendingSortBy) params.set("sort_by", pendingSortBy);
      const data = await apiRequest<PageResponse<TagIntelligenceSuggestion>>(`/v1/tags/intelligence/events?${params.toString()}`);
      const normalizedItems = normalizePageItems(data);
      setPendingSuggestions(normalizedItems);
      setPendingTotal(data.total ?? normalizedItems.length);
      setPendingPageSize(data.page_size ?? PENDING_PAGE_SIZE);
    } catch {
      setPendingSuggestions([]);
      setPendingTotal(0);
    } finally {
      setPendingLoading(false);
    }
  }

  async function loadAutomationRules() {
    setAutomationLoading(true);
    try {
      const data = await apiRequest<TagAutomationRule[]>("/v1/tags/automation-rules");
      setAutomationRules(data);
    } catch {
      setAutomationRules([]);
    } finally {
      setAutomationLoading(false);
    }
  }

  useEffect(() => {
    void loadTags();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [query, group, subgroup, statusFilter, tagType, usageFilter, tagPage]);

  useEffect(() => {
    void loadAutomationRules();
  }, []);

  useEffect(() => {
    setPendingSelectedIds([]);
    const timeout = window.setTimeout(() => {
      void loadPendingSuggestions();
    }, 220);
    return () => window.clearTimeout(timeout);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    pendingEntityType,
    pendingTagSlug,
    pendingInferenceSource,
    pendingTableQuery,
    pendingColumnQuery,
    pendingMinConfidence,
    pendingMaxConfidence,
    pendingRiskBand,
    pendingReviewStatus,
    pendingSortBy,
    pendingPage,
  ]);

  useEffect(() => {
    const tagId = Number(searchParams.get("tagId") || "");
    if (!Number.isFinite(tagId) || tagId <= 0) return;
    void openDetails(tagId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams]);

  useEffect(() => {
    setPendingSelectedIds([]);
  }, [pendingSuggestions, pendingPage]);

  const {
    importOpen,
    importing,
    importResult,
    openImport,
    closeImport,
    downloadTemplate,
    submitImport,
    onImportFileChange,
  } = useTagsImport({
    onImported: loadTags,
    onToast: setToast,
  });

  const visiblePendingSuggestionIds = useMemo(() => pendingSuggestions.map((event) => event.id), [pendingSuggestions]);
  const automationRulesByTagId = useMemo(() => {
    const grouped = new Map<number, TagAutomationRule[]>();
    for (const rule of automationRules) {
      const current = grouped.get(rule.tag_id) || [];
      current.push(rule);
      grouped.set(rule.tag_id, current);
    }
    return grouped;
  }, [automationRules]);
  const selectedTagAutomationRules = useMemo(
    () => (selectedTag ? automationRulesByTagId.get(selectedTag.id) || [] : []),
    [automationRulesByTagId, selectedTag],
  );
  const catalogTotalPages = Math.max(1, Math.ceil(tagTotal / Math.max(1, tagPageSize)));
  const catalogRangeLabel = formatPaginationRange(tagTotal, tagPage, Math.max(1, tagPageSize));
  const pendingTotalPages = Math.max(1, Math.ceil(pendingTotal / Math.max(1, pendingPageSize)));
  const pendingRangeLabel = formatPaginationRange(pendingTotal, pendingPage, Math.max(1, pendingPageSize));

  function goToCatalogPage(page: number) {
    setTagPage(Math.max(1, page));
    setActiveTab("catalog");
  }

  function goToPendingPage(page: number) {
    setPendingPage(Math.max(1, page));
    setActiveTab("suggestions");
  }

  function focusCatalogTab(usage: "" | "used" | "unused" = "") {
    setUsageFilter(usage);
    setActiveTab("catalog");
  }

  function focusSuggestionsTab() {
    setActiveTab("suggestions");
  }

  function focusRulesTab() {
    setActiveTab("rules");
  }

  function focusImportExportTab() {
    setActiveTab("io");
  }

  function openAutomationCreate() {
    setAutomationForm({ ...EMPTY_RULE_FORM });
    setAutomationEditorOpen(true);
  }

  function openAutomationEdit(rule: TagAutomationRule) {
    setAutomationForm(toRuleForm(rule));
    setAutomationEditorOpen(true);
  }

  async function saveAutomationRule(event: FormEvent) {
    event.preventDefault();
    if (!automationForm.tag_id) {
      setToast({ tone: "error", message: "Selecione uma tag para a regra automática." });
      return;
    }
    setAutomationSaving(true);
    try {
      const payload = {
        tag_id: Number(automationForm.tag_id),
        name: automationForm.name.trim(),
        scope: automationForm.scope,
        status: automationForm.status,
        action: automationForm.action,
        category: automationForm.category || null,
        priority: Number(automationForm.priority || "0"),
        match_fields: parseList(automationForm.match_fields),
        keywords: parseList(automationForm.keywords),
        aliases: parseList(automationForm.aliases),
        regex_pattern: automationForm.regex_pattern.trim() || null,
        min_confidence: Number(automationForm.min_confidence || "90"),
        notes: automationForm.notes.trim() || null,
      };
      if (automationForm.id) {
        await apiRequest(`/v1/tags/automation-rules/${automationForm.id}`, {
          method: "PATCH",
          body: JSON.stringify(payload),
        });
      } else {
        await apiRequest("/v1/tags/automation-rules", {
          method: "POST",
          body: JSON.stringify(payload),
        });
      }
      setAutomationEditorOpen(false);
      setAutomationForm({ ...EMPTY_RULE_FORM });
      await loadAutomationRules();
      setToast({ tone: "success", message: "Regra automática salva." });
    } catch (error) {
      setToast({ tone: "error", message: (error as Error).message });
    } finally {
      setAutomationSaving(false);
    }
  }

  async function confirmDeleteAutomationRule() {
    if (!automationDeleteId) return;
    setAutomationSaving(true);
    try {
      await apiRequest(`/v1/tags/automation-rules/${automationDeleteId}`, { method: "DELETE" });
      setAutomationDeleteOpen(false);
      setAutomationDeleteId(null);
      await loadAutomationRules();
      setToast({ tone: "success", message: "Regra automática removida." });
    } catch (error) {
      setToast({ tone: "error", message: (error as Error).message });
    } finally {
      setAutomationSaving(false);
    }
  }

  function openCreate() {
    setEditorMode("create");
    setEditingTag(null);
    setForm(EMPTY_FORM);
    setEditorOpen(true);
  }

  function openEdit(item: TagItem) {
    setEditorMode("edit");
    setEditingTag(item);
    setForm(toForm(item));
    setEditorOpen(true);
  }

  async function openDetails(tagId: number) {
    setDetailOpen(true);
    setDetailLoading(true);
    try {
      const data = await apiRequest<TagDetail>(`/v1/tags/${tagId}`);
      setSelectedTag(data);
    } catch (error) {
      setToast({ tone: "error", message: (error as Error).message });
      setDetailOpen(false);
    } finally {
      setDetailLoading(false);
    }
  }

  async function reprocessLinkedTables() {
    if (!selectedTag || !canManage || selectedTag.linked_tables.length === 0) return;
    setReprocessing(true);
    try {
      for (const table of selectedTag.linked_tables) {
        await apiRequest(`/v1/tags/intelligence/tables/${table.id}/reprocess`, { method: "POST" });
      }
      setToast({
        tone: "success",
        message: `Reprocessamento concluído para ${selectedTag.linked_tables.length} tabela(s) vinculada(s).`,
      });
      await loadTags();
      await openDetails(selectedTag.id);
    } catch (error) {
      setToast({ tone: "error", message: (error as Error).message });
    } finally {
      setReprocessing(false);
    }
  }

  function eventPreviewTag(event: TagIntelligenceSuggestion) {
    return [
      {
        id: event.tag_id,
        name: event.tag_name,
        confidence_score: event.confidence_score,
        inference_source: event.inference_source,
        inference_reason: event.inference_reason,
        applied_automatically: event.applied_automatically,
        review_status: event.review_status,
        rule_label: event.rule_label,
      },
    ];
  }

  function pendingExplorerHref(event: TagIntelligenceSuggestion) {
    if (event.explorer_url) return event.explorer_url;
    if (event.entity_type === "column" && event.table_id && event.column_id) {
      return `/explorer?tableId=${event.table_id}&tab=columns&columnId=${event.column_id}`;
    }
    if (event.table_id) {
      return `/explorer?tableId=${event.table_id}&tab=tags`;
    }
    return "/explorer";
  }

  function togglePendingSelected(eventId: number) {
    setPendingSelectedIds((current) =>
      current.includes(eventId) ? current.filter((item) => item !== eventId) : [...current, eventId],
    );
  }

  function toggleVisibleSelection(checked: boolean) {
    if (!checked) {
      setPendingSelectedIds([]);
      return;
    }
    setPendingSelectedIds(visiblePendingSuggestionIds);
  }

  async function batchApplySuggestions() {
    if (pendingSelectedIds.length === 0) return;
    setPendingBatchAction("apply");
    try {
      const result = await apiRequest<TagIntelligenceBatchResult>("/v1/tags/intelligence/events/apply-batch", {
        method: "POST",
        body: JSON.stringify({ event_ids: pendingSelectedIds }),
      });
      setToast({
        tone: "success",
        message: `Aplicação em lote concluída: ${result.succeeded}/${result.requested} processada(s).`,
      });
      setPendingSelectedIds([]);
      await loadPendingSuggestions();
      await loadTags();
    } catch (error) {
      setToast({ tone: "error", message: (error as Error).message });
    } finally {
      setPendingBatchAction(null);
    }
  }

  async function batchBlockSuggestions() {
    if (pendingSelectedIds.length === 0) return;
    setPendingBatchAction("block");
    try {
      const result = await apiRequest<TagIntelligenceBatchResult>("/v1/tags/intelligence/events/block-batch", {
        method: "POST",
        body: JSON.stringify({ event_ids: pendingSelectedIds }),
      });
      setToast({
        tone: "success",
        message: `Bloqueio em lote concluído: ${result.succeeded}/${result.requested} processada(s).`,
      });
      setPendingSelectedIds([]);
      await loadPendingSuggestions();
      await loadTags();
    } catch (error) {
      setToast({ tone: "error", message: (error as Error).message });
    } finally {
      setPendingBatchAction(null);
    }
  }

  async function applySuggestion(event: TagIntelligenceSuggestion) {
    setPendingActionId(event.id);
    try {
      await apiRequest(`/v1/tags/intelligence/events/${event.id}/apply`, { method: "POST" });
      setToast({ tone: "success", message: `Tag "${event.tag_name}" aplicada com sucesso.` });
      await loadPendingSuggestions();
      await loadTags();
    } catch (error) {
      setToast({ tone: "error", message: (error as Error).message });
    } finally {
      setPendingActionId(null);
    }
  }

  async function blockSuggestion(event: TagIntelligenceSuggestion) {
    setPendingActionId(event.id);
    try {
      await apiRequest(`/v1/tags/intelligence/events/${event.id}/block`, { method: "POST" });
      setToast({ tone: "success", message: `Sugestão "${event.tag_name}" bloqueada.` });
      await loadPendingSuggestions();
      await loadTags();
    } catch (error) {
      setToast({ tone: "error", message: (error as Error).message });
    } finally {
      setPendingActionId(null);
    }
  }

  async function saveTag(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    try {
      const payload = {
        external_id: form.external_id.trim() || null,
        slug: form.slug.trim() || form.name.trim(),
        name: form.name.trim(),
        description: form.description.trim() || null,
        group_name: form.group_name.trim() || null,
        subgroup_name: form.subgroup_name.trim() || null,
        example_of_use: form.example_of_use.trim() || null,
        tag_type: form.tag_type.trim() || null,
        suggested_scope: form.suggested_scope.trim() || null,
        status: form.status,
        synonyms: form.synonyms.trim() || null,
        notes: form.notes.trim() || null,
      };
      if (editorMode === "create") {
        await apiRequest<TagItem>("/v1/tags", { method: "POST", body: JSON.stringify(payload) });
        setToast({ tone: "success", message: "Tag criada com sucesso." });
      } else if (editingTag) {
        await apiRequest<TagItem>(`/v1/tags/${editingTag.id}`, { method: "PATCH", body: JSON.stringify(payload) });
        setToast({ tone: "success", message: "Tag atualizada com sucesso." });
      }
      setEditorOpen(false);
      await loadTags();
      if (selectedTag && editingTag?.id === selectedTag.id) {
        await openDetails(selectedTag.id);
      }
    } catch (error) {
      setToast({ tone: "error", message: (error as Error).message });
    } finally {
      setSaving(false);
    }
  }

  async function toggleStatus(item: TagItem) {
    const nextStatus = item.status === "active" ? "inactive" : "active";
    try {
      await apiRequest(`/v1/tags/${item.id}`, {
        method: "PATCH",
        body: JSON.stringify({ status: nextStatus }),
      });
      setToast({
        tone: "success",
        message: nextStatus === "active" ? "Tag reativada com sucesso." : "Tag desativada com sucesso.",
      });
      await loadTags();
      if (selectedTag?.id === item.id) {
        await openDetails(item.id);
      }
    } catch (error) {
      setToast({ tone: "error", message: (error as Error).message });
    }
  }

  function askDeleteTag(item: TagItem) {
    setDeleteTarget(item);
    setDeleteDialogOpen(true);
  }

  async function confirmDeleteTag() {
    if (!deleteTarget) return;
    setDeleteSaving(true);
    try {
      await apiRequest(`/v1/tags/${deleteTarget.id}`, { method: "DELETE" });
      setToast({ tone: "success", message: "Tag removida com sucesso." });
      if (selectedTag?.id === deleteTarget.id) {
        setDetailOpen(false);
        setSelectedTag(null);
      }
      setDeleteDialogOpen(false);
      setDeleteTarget(null);
      await loadTags();
    } catch (error) {
      setToast({ tone: "error", message: (error as Error).message });
    } finally {
      setDeleteSaving(false);
    }
  }

  async function confirmResetTags() {
    setResetSaving(true);
    try {
      const result = await apiRequest<{ deleted_tags: number; deleted_assignments: number }>("/v1/tags/reset", {
        method: "POST",
        body: JSON.stringify({ confirmation: "APAGAR" }),
      });
      setToast({
        tone: "success",
        message: `Tags zeradas com sucesso. ${result.deleted_tags} tags e ${result.deleted_assignments} vínculos removidos.`,
      });
      setResetDialogOpen(false);
      await loadTags();
      if (selectedTag) {
        setDetailOpen(false);
        setSelectedTag(null);
      }
    } catch (error) {
      setToast({ tone: "error", message: (error as Error).message });
    } finally {
      setResetSaving(false);
    }
  }

  async function exportSpreadsheet() {
    try {
      await downloadApiFile("/v1/tags/export", "tags_export.xlsx", undefined, {
        confirmMessage:
          "Exportar as tags em Excel (limite de 2.500 linhas)? A exportação será auditada e observações sensíveis permanecem mascaradas.",
      });
      setToast({ tone: "success", message: "Planilha exportada com sucesso." });
    } catch (error) {
      setToast({ tone: "error", message: (error as Error).message });
    }
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-brand-600">Camada de classificação</p>
          <h1 className="mt-1 text-2xl font-semibold tracking-tight text-text sm:text-3xl">Tags</h1>
          <p className="mt-1 text-sm text-text-body">
            Gerencie a taxonomia de classificação, revise sugestões automáticas e acompanhe o uso das tags nos ativos.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button onClick={openImport} variant="outline">
            <Upload className="mr-2 h-4 w-4" />
            Importar planilha
          </Button>
          {canExport ? (
            <Button onClick={exportSpreadsheet} variant="outline">
              <Download className="mr-2 h-4 w-4" />
              Exportar planilha
            </Button>
          ) : null}
          {canManage ? (
            <Button onClick={openCreate}>
              <Plus className="mr-2 h-4 w-4" />
              Nova tag
            </Button>
          ) : null}
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
        <Button
          className="h-auto w-full justify-start p-0 text-left"
          onClick={() => {
            setUsageFilter("");
            setStatusFilter("");
            setActiveTab("catalog");
          }}
          variant="ghost"
        >
          <Card className="w-full border-border bg-gradient-to-br from-white to-slate-50 shadow-sm">
            <CardContent className="py-5 text-left">
              <p className="text-xs font-semibold uppercase tracking-wide text-muted">Total de tags</p>
              <p className="mt-2 text-3xl font-semibold text-text">{tagSummary.total}</p>
            </CardContent>
          </Card>
        </Button>
        <Button
          className="h-auto w-full justify-start p-0 text-left"
          onClick={() => {
            setStatusFilter("active");
            setUsageFilter("");
            setActiveTab("catalog");
          }}
          variant="ghost"
        >
          <Card className="w-full border-border bg-gradient-to-br from-white to-slate-50 shadow-sm">
            <CardContent className="py-5 text-left">
              <p className="text-xs font-semibold uppercase tracking-wide text-muted">Ativas</p>
              <p className="mt-2 text-3xl font-semibold text-text">{tagSummary.active}</p>
            </CardContent>
          </Card>
        </Button>
        <Button className="h-auto w-full justify-start p-0 text-left" onClick={() => focusCatalogTab("used")} variant="ghost">
          <Card className="w-full border-border bg-gradient-to-br from-white to-slate-50 shadow-sm">
            <CardContent className="py-5 text-left">
              <p className="text-xs font-semibold uppercase tracking-wide text-muted">Em uso</p>
              <p className="mt-2 text-3xl font-semibold text-text">{tagSummary.in_use}</p>
            </CardContent>
          </Card>
        </Button>
        <Button className="h-auto w-full justify-start p-0 text-left" onClick={focusSuggestionsTab} variant="ghost">
          <Card className="w-full border-border bg-gradient-to-br from-white to-slate-50 shadow-sm">
            <CardContent className="py-5 text-left">
              <p className="text-xs font-semibold uppercase tracking-wide text-muted">Sugestões pendentes</p>
              <p className="mt-2 text-3xl font-semibold text-text">{pendingTotal}</p>
            </CardContent>
          </Card>
        </Button>
        <Button
          className="h-auto w-full justify-start p-0 text-left"
          onClick={() => {
            setUsageFilter("");
            setStatusFilter("");
            setActiveTab("catalog");
          }}
          variant="ghost"
        >
          <Card className="w-full border-border bg-gradient-to-br from-white to-slate-50 shadow-sm">
            <CardContent className="py-5 text-left">
              <p className="text-xs font-semibold uppercase tracking-wide text-muted">Grupos</p>
              <p className="mt-2 text-3xl font-semibold text-text">{tagSummary.groups}</p>
            </CardContent>
          </Card>
        </Button>
      </div>

      <div className="flex flex-wrap gap-2 rounded-2xl border border-border bg-surface p-2 shadow-sm">
        <Button onClick={() => setActiveTab("catalog")} size="sm" variant={activeTab === "catalog" ? "default" : "ghost"}>
          Catálogo de tags
        </Button>
        {canManage ? (
          <>
            <Button onClick={focusSuggestionsTab} size="sm" variant={activeTab === "suggestions" ? "default" : "ghost"}>
              Sugestões pendentes
            </Button>
            <Button onClick={focusRulesTab} size="sm" variant={activeTab === "rules" ? "default" : "ghost"}>
              Regras automáticas
            </Button>
            <Button onClick={focusImportExportTab} size="sm" variant={activeTab === "io" ? "default" : "ghost"}>
              Importação e exportação
            </Button>
          </>
        ) : null}
      </div>

      {activeTab === "catalog" ? (
        <div className="space-y-4">
          <Card className="border-border/80 bg-surface/95 shadow-sm">
            <CardContent className="grid gap-3 py-4 md:grid-cols-2 xl:grid-cols-6">
              <div className="xl:col-span-2">
                <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-muted">Busca</label>
                <Input
                  onChange={(event) => setQuery(event.target.value)}
                  placeholder="Buscar por tag, slug, grupo, subgrupo ou descrição"
                  value={query}
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-muted">Grupo</label>
                <Select onChange={(event) => setGroup(event.target.value)} value={group}>
                  <option value="">Todos</option>
                  {filters.groups.map((value) => (
                    <option key={value} value={value}>
                      {value}
                    </option>
                  ))}
                </Select>
              </div>
              <div>
                <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-muted">Subgrupo</label>
                <Select onChange={(event) => setSubgroup(event.target.value)} value={subgroup}>
                  <option value="">Todos</option>
                  {filters.subgroups.map((value) => (
                    <option key={value} value={value}>
                      {value}
                    </option>
                  ))}
                </Select>
              </div>
              <div>
                <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-muted">Status</label>
                <Select onChange={(event) => setStatusFilter(event.target.value)} value={statusFilter}>
                  <option value="">Todos</option>
                  {filters.statuses.map((value) => (
                    <option key={value} value={value}>
                      {statusLabel(value)}
                    </option>
                  ))}
                </Select>
              </div>
              <div>
                <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-muted">Tipo</label>
                <Select onChange={(event) => setTagType(event.target.value)} value={tagType}>
                  <option value="">Todos</option>
                  {filters.tag_types.map((value) => (
                    <option key={value} value={value}>
                      {value}
                    </option>
                  ))}
                </Select>
              </div>
              <div>
                <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-muted">Uso</label>
                <Select onChange={(event) => setUsageFilter(event.target.value as "" | "used" | "unused")} value={usageFilter}>
                  <option value="">Todos</option>
                  <option value="used">Somente em uso</option>
                  <option value="unused">Sem uso</option>
                </Select>
              </div>
            </CardContent>
          </Card>

          <Card className="border-border/80 bg-surface/95 shadow-sm">
            <CardHeader className="flex flex-col gap-2 border-b border-border pb-4 md:flex-row md:items-center md:justify-between">
              <div>
                <h3 className="text-base font-semibold text-text">Catálogo de tags</h3>
                <p className="text-sm text-text-body">{catalogRangeLabel}</p>
              </div>
              <div className="flex items-center gap-2">
                <Button disabled={tagPage <= 1} onClick={() => goToCatalogPage(tagPage - 1)} size="sm" variant="outline">
                  Anterior
                </Button>
                <Badge tone="neutral">
                  Página {tagPage} de {catalogTotalPages}
                </Badge>
                <Button disabled={!tagHasMore && tagPage >= catalogTotalPages} onClick={() => goToCatalogPage(tagPage + 1)} size="sm" variant="outline">
                  Próxima
                </Button>
              </div>
            </CardHeader>
            <CardContent className="pt-0">
              {loading ? (
                <p className="py-8 text-sm text-muted">Carregando tags...</p>
              ) : items.length === 0 ? (
                <EmptyState title="Nenhuma tag encontrada" description="Ajuste os filtros ou importe uma planilha para iniciar a taxonomia." />
              ) : (
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-border text-sm">
                    <thead className="bg-bg-subtle text-xs uppercase tracking-wide text-muted">
                      <tr>
                        <th className="px-4 py-3 text-left">Tag</th>
                        <th className="px-4 py-3 text-left">Grupo / Subgrupo</th>
                        <th className="px-4 py-3 text-left">Tipo</th>
                        <th className="px-4 py-3 text-left">Status</th>
                        <th className="px-4 py-3 text-left">Uso</th>
                        <th className="px-4 py-3 text-left">Atualizado em</th>
                        <th className="px-4 py-3 text-right">Ações</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border bg-surface">
                      {items.map((item) => {
                        const previewTables = item.linked_tables_preview.slice(0, 2);
                        return (
                          <tr key={item.id} className="align-top">
                            <td className="px-4 py-4">
                              <div className="flex items-start gap-3">
                                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-bg-subtle text-text-body">
                                  <TagIcon className="h-4 w-4" />
                                </div>
                                <div className="min-w-0">
                                  <div className="flex flex-wrap items-center gap-2">
                                    <p className="font-semibold text-text">{item.name}</p>
                                    <Badge tone={statusTone(item.status)}>{statusLabel(item.status)}</Badge>
                                  </div>
                                  <p className="mt-1 text-xs font-medium uppercase tracking-wide text-muted">{item.slug}</p>
                                  <p className="mt-1 line-clamp-2 text-xs leading-5 text-text-body">
                                    {item.description || "Sem descrição cadastrada para esta tag."}
                                  </p>
                                  <div className="mt-2 flex flex-wrap gap-2">
                                    {previewTables.map((table) => (
                                      <Badge key={`${item.id}-${table.id}`} tone="neutral">
                                        {table.schema_name}.{table.name}
                                      </Badge>
                                    ))}
                                    {item.linked_tables_preview.length > previewTables.length ? (
                                      <Badge tone="accent">+{item.linked_tables_preview.length - previewTables.length} tabelas</Badge>
                                    ) : null}
                                  </div>
                                </div>
                              </div>
                            </td>
                            <td className="px-4 py-4 text-text-body">
                              <p className="font-medium text-text">{item.group_name || "Sem grupo"}</p>
                              <p className="mt-1 text-xs text-muted">{item.subgroup_name || "Sem subgrupo"}</p>
                            </td>
                            <td className="px-4 py-4 text-text-body">
                              <div className="space-y-1">
                                <p>{item.tag_type || "—"}</p>
                                <p className="text-xs text-muted">{item.suggested_scope || "Escopo não informado"}</p>
                              </div>
                            </td>
                            <td className="px-4 py-4">
                              <Badge tone={statusTone(item.status)}>{statusLabel(item.status)}</Badge>
                            </td>
                            <td className="px-4 py-4 text-text-body">
                              <p className="font-medium">{item.tables_count + item.columns_count} vínculo(s)</p>
                              <p className="mt-1 text-xs text-muted">{item.tables_count} tabela(s) • {item.columns_count} coluna(s)</p>
                            </td>
                            <td className="px-4 py-4 text-text-body">{formatDate(item.updated_at)}</td>
                            <td className="px-4 py-4">
                              <div className="flex flex-wrap justify-end gap-2">
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
                                    <Button onClick={() => askDeleteTag(item)} size="sm" variant="ghost">
                                      <Trash2 className="mr-1 h-4 w-4" />
                                      Apagar
                                    </Button>
                                  </>
                                ) : null}
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      ) : null}

      {activeTab === "suggestions" && canManage ? (
        <Card className="border-border/80 bg-surface/95 shadow-sm">
          <CardHeader className="pb-3">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-muted">Fila operacional</p>
                <h3 className="mt-1 text-base font-semibold text-text">Sugestões pendentes de classificação</h3>
                <p className="mt-1 text-sm text-text-body">
                  Filtre por tipo, tabela, coluna, tag sugerida, fonte e confiança. A seleção em massa vale apenas para a página atual.
                </p>
              </div>
              <Badge tone="accent">{pendingLoading ? "Carregando..." : `${pendingTotal} sugestão(ões)`}</Badge>
            </div>
          </CardHeader>
          <CardContent className="space-y-4 pt-0">
            <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-6">
              <div>
                <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-muted">Tipo</label>
                <Select onChange={(event) => setPendingEntityType(event.target.value)} value={pendingEntityType}>
                  <option value="">Todos</option>
                  <option value="table">Tabela</option>
                  <option value="column">Coluna</option>
                </Select>
              </div>
              <div>
                <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-muted">Tag sugerida</label>
                <Input onChange={(event) => setPendingTagSlug(event.target.value)} placeholder="slug da tag" value={pendingTagSlug} />
              </div>
              <div>
                <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-muted">Tabela</label>
                <Input onChange={(event) => setPendingTableQuery(event.target.value)} placeholder="Filtrar por nome da tabela" value={pendingTableQuery} />
              </div>
              <div>
                <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-muted">Coluna</label>
                <Input onChange={(event) => setPendingColumnQuery(event.target.value)} placeholder="Filtrar por nome da coluna" value={pendingColumnQuery} />
              </div>
              <div>
                <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-muted">Fonte</label>
                <Input onChange={(event) => setPendingInferenceSource(event.target.value)} placeholder="heurística, regex..." value={pendingInferenceSource} />
              </div>
              <div>
                <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-muted">Status</label>
                <Select onChange={(event) => setPendingReviewStatus(event.target.value)} value={pendingReviewStatus}>
                  <option value="">Todos</option>
                  <option value="suggested">Sugerido</option>
                  <option value="pending_review">Pendente</option>
                </Select>
              </div>
              <div>
                <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-muted">Risco</label>
                <Select onChange={(event) => setPendingRiskBand(event.target.value as PendingRiskBand)} value={pendingRiskBand}>
                  <option value="">Todos</option>
                  <option value="high">Alto risco</option>
                  <option value="medium">Risco médio</option>
                  <option value="low">Baixo risco</option>
                </Select>
                <p className="mt-1 text-xs leading-5 text-muted">Risco estimado a partir da confiança da sugestão.</p>
              </div>
              <div>
                <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-muted">Confiança mínima</label>
                <Input onChange={(event) => setPendingMinConfidence(event.target.value)} placeholder="0" type="number" value={pendingMinConfidence} />
              </div>
              <div>
                <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-muted">Confiança máxima</label>
                <Input onChange={(event) => setPendingMaxConfidence(event.target.value)} placeholder="100" type="number" value={pendingMaxConfidence} />
              </div>
              <div className="xl:col-span-2">
                <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-muted">Ordenar</label>
                <Select onChange={(event) => setPendingSortBy(event.target.value)} value={pendingSortBy}>
                  <option value="risk_desc">Maior risco primeiro</option>
                  <option value="certainty_desc">Maior confiança primeiro</option>
                  <option value="newest">Mais recentes</option>
                  <option value="oldest">Mais antigas</option>
                  <option value="table_asc">Tabela A-Z</option>
                  <option value="tag_asc">Tag A-Z</option>
                </Select>
              </div>
            </div>

            <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-border bg-bg-subtle px-4 py-3">
              <label className="flex items-center gap-2 text-sm font-medium text-text-body">
                <input
                  checked={pendingSuggestions.length > 0 && pendingSelectedIds.length === pendingSuggestions.length}
                  className="h-4 w-4 rounded border-border-strong text-info-600 focus:ring-info-500"
                  onChange={(event) => toggleVisibleSelection(event.target.checked)}
                  type="checkbox"
                />
                Selecionar tudo visível
              </label>
              <div className="flex flex-wrap items-center gap-2">
                <Badge tone="neutral">{pendingSelectedIds.length} selecionada(s) nesta página</Badge>
                <Badge tone="neutral">{pendingRangeLabel}</Badge>
                <Button
                  onClick={() => {
                    setPendingEntityType("");
                    setPendingTagSlug("");
                    setPendingTableQuery("");
                    setPendingColumnQuery("");
                    setPendingInferenceSource("");
                    setPendingMinConfidence("");
                    setPendingMaxConfidence("");
                    setPendingRiskBand("");
                    setPendingReviewStatus("");
                    setPendingSortBy("risk_desc");
                  }}
                  size="sm"
                  type="button"
                  variant="ghost"
                >
                  Limpar filtros
                </Button>
                <Button
                  onClick={() => void batchApplySuggestions()}
                  disabled={pendingBatchAction !== null || pendingSelectedIds.length === 0}
                  size="sm"
                  variant="outline"
                >
                  <CheckCircle2 className="mr-2 h-4 w-4" />
                  {pendingBatchAction === "apply" ? "Aplicando..." : "Aplicar selecionadas"}
                </Button>
                <Button
                  onClick={() => void batchBlockSuggestions()}
                  disabled={pendingBatchAction !== null || pendingSelectedIds.length === 0}
                  size="sm"
                  variant="ghost"
                >
                  <Ban className="mr-2 h-4 w-4" />
                  {pendingBatchAction === "block" ? "Bloqueando..." : "Bloquear selecionadas"}
                </Button>
              </div>
            </div>

            {pendingLoading ? <p className="text-sm text-muted">Carregando fila de sugestões...</p> : null}
            {!pendingLoading && pendingSuggestions.length === 0 ? (
              <EmptyState
                className="shadow-none"
                title="Sem sugestões pendentes"
                description="As inferências automáticas já foram aplicadas ou não há novas colunas com confiança suficiente aguardando revisão."
              />
            ) : null}
            {pendingSuggestions.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-border text-sm">
                  <thead className="bg-bg-subtle text-xs uppercase tracking-wide text-muted">
                    <tr>
                      <th className="px-4 py-3 text-left">Sugestão</th>
                      <th className="px-4 py-3 text-left">Ativo / Coluna</th>
                      <th className="px-4 py-3 text-left">Confiança</th>
                      <th className="px-4 py-3 text-left">Fonte</th>
                      <th className="px-4 py-3 text-left">Motivo</th>
                      <th className="px-4 py-3 text-right">Ações</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border bg-surface">
                    {pendingSuggestions.map((event) => {
                      const selected = pendingSelectedIds.includes(event.id);
                      return (
                        <tr key={event.id} className="align-top">
                          <td className="px-4 py-4">
                            <div className="flex items-start gap-3">
                              <input
                                checked={selected}
                                className="mt-1 h-4 w-4 rounded border-border-strong text-info-600 focus:ring-info-500"
                                onChange={() => togglePendingSelected(event.id)}
                                type="checkbox"
                              />
                              <div className="min-w-0">
                                <TagBadgeList maxVisible={1} tags={eventPreviewTag(event)} />
                                <div className="mt-2 flex flex-wrap gap-2">
                                  <Badge tone={event.entity_type === "column" ? "accent" : "neutral"}>{event.entity_type === "column" ? "Coluna" : "Tabela"}</Badge>
                                  <Badge tone={confidenceTone(event.confidence_score)}>Confiança {event.confidence_score}%</Badge>
                                  <Badge tone={event.confidence_score >= 80 ? "success" : event.confidence_score >= 60 ? "accent" : "warning"}>{riskLabel(event.confidence_score)}</Badge>
                                </div>
                              </div>
                            </div>
                          </td>
                          <td className="px-4 py-4 text-text-body">
                            <p className="font-medium text-text">{event.table_fqn || event.table_name || "Ativo desconhecido"}</p>
                            <p className="mt-1 text-xs text-muted">{event.column_name || "—"}</p>
                            <p className="mt-1 text-xs text-muted">{event.tag_name}</p>
                          </td>
                          <td className="px-4 py-4 text-text-body">
                            <p className="font-medium">{event.confidence_score}%</p>
                            <p className="mt-1 text-xs text-muted">{new Date(event.created_at).toLocaleString("pt-BR")}</p>
                          </td>
                          <td className="px-4 py-4 text-text-body">
                            <p className="font-medium">{event.inference_source || "heurística"}</p>
                            <p className="mt-1 text-xs text-muted">Tag: {event.tag_slug}</p>
                          </td>
                          <td className="px-4 py-4 text-text-body">
                            <p className="line-clamp-3">{event.inference_reason || event.rule_label || "Sugestão automática"}</p>
                          </td>
                          <td className="px-4 py-4">
                            <div className="flex flex-wrap justify-end gap-2">
                              <Button asChild size="sm" variant="ghost">
                                <Link href={pendingExplorerHref(event)}>
                                  <ArrowUpRight className="mr-2 h-4 w-4" />
                                  Abrir no Explorer
                                </Link>
                              </Button>
                              <Button
                                onClick={() => void applySuggestion(event)}
                                disabled={pendingActionId === event.id || pendingBatchAction !== null}
                                size="sm"
                                variant="outline"
                              >
                                <CheckCircle2 className="mr-2 h-4 w-4" />
                                Aplicar
                              </Button>
                              <Button
                                onClick={() => void blockSuggestion(event)}
                                disabled={pendingActionId === event.id || pendingBatchAction !== null}
                                size="sm"
                                variant="ghost"
                              >
                                <Ban className="mr-2 h-4 w-4" />
                                Bloquear
                              </Button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            ) : null}

            <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border pt-3">
              <Badge tone="neutral">{pendingRangeLabel}</Badge>
              <div className="flex items-center gap-2">
                <Button disabled={pendingPage <= 1} onClick={() => goToPendingPage(pendingPage - 1)} size="sm" variant="outline">
                  Anterior
                </Button>
                <Badge tone="neutral">
                  Página {pendingPage} de {pendingTotalPages}
                </Badge>
                <Button disabled={pendingPage >= pendingTotalPages} onClick={() => goToPendingPage(pendingPage + 1)} size="sm" variant="outline">
                  Próxima
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      ) : null}

      {activeTab === "rules" && canManage ? (
        <Card className="border-border/80 bg-surface/95 shadow-sm">
          <CardHeader className="pb-3">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-muted">Automação mínima</p>
                <h3 className="mt-1 text-base font-semibold text-text">Regras automáticas de tags</h3>
                <p className="mt-1 text-sm text-text-body">
                  Apenas regras explícitas aplicam tags automaticamente. Use este cadastro para controlar correspondências sensíveis.
                </p>
              </div>
              <Button onClick={openAutomationCreate} size="sm" type="button">
                <Plus className="mr-2 h-4 w-4" />
                Nova regra
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-3 pt-0">
            {automationLoading ? (
              <p className="text-sm text-muted">Carregando regras...</p>
            ) : automationRules.length === 0 ? (
              <EmptyState title="Nenhuma regra automática" description="Crie uma regra para começar a aplicar tags sensíveis de forma controlada." />
            ) : (
              <div className="overflow-hidden rounded-2xl border border-border">
                <table className="min-w-full divide-y divide-border text-sm">
                  <thead className="bg-bg-subtle text-xs uppercase tracking-wide text-muted">
                    <tr>
                      <th className="px-4 py-2 text-left">Tag</th>
                      <th className="px-4 py-2 text-left">Status</th>
                      <th className="px-4 py-2 text-left">Ação</th>
                      <th className="px-4 py-2 text-left">Match</th>
                      <th className="px-4 py-2 text-left">Conf.</th>
                      <th className="px-4 py-2 text-right">Ações</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border bg-surface">
                    {automationRules.map((rule) => (
                      <tr key={rule.id}>
                        <td className="px-4 py-2">
                          <div className="font-semibold text-text">{rule.tag_name || rule.name}</div>
                          <div className="text-xs text-muted">{rule.name}</div>
                        </td>
                        <td className="px-4 py-2">
                          <Badge tone={rule.status === "active" ? "success" : "warning"}>{statusLabel(rule.status)}</Badge>
                        </td>
                        <td className="px-4 py-2 text-text-body">{rule.action === "apply" ? "Aplicar" : rule.action}</td>
                        <td className="px-4 py-2 text-text-body">{rule.match_fields.join(", ") || "—"}</td>
                        <td className="px-4 py-2 text-text-body">{rule.min_confidence}%</td>
                        <td className="px-4 py-2 text-right">
                          <div className="flex justify-end gap-2">
                            <Button onClick={() => openAutomationEdit(rule)} size="sm" variant="ghost">
                              <Pencil className="h-4 w-4" />
                            </Button>
                            <Button
                              onClick={() => {
                                setAutomationDeleteId(rule.id);
                                setAutomationDeleteOpen(true);
                              }}
                              size="sm"
                              variant="ghost"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
            {automationEditorOpen ? (
              <form onSubmit={saveAutomationRule} className="space-y-3 rounded-2xl border border-dashed border-border bg-bg-subtle p-4">
                <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                  <div>
                    <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-muted">Tag</label>
                    <Select
                      onChange={(event) => setAutomationForm((prev) => ({ ...prev, tag_id: event.target.value }))}
                      value={automationForm.tag_id}
                    >
                      <option value="">Selecione</option>
                      {items.map((item) => (
                        <option key={item.id} value={item.id}>
                          {item.name}
                        </option>
                      ))}
                    </Select>
                  </div>
                  <div>
                    <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-muted">Nome da regra</label>
                    <Input
                      onChange={(event) => setAutomationForm((prev) => ({ ...prev, name: event.target.value }))}
                      value={automationForm.name}
                    />
                  </div>
                  <div>
                    <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-muted">Status</label>
                    <Select onChange={(event) => setAutomationForm((prev) => ({ ...prev, status: event.target.value }))} value={automationForm.status}>
                      <option value="active">Ativa</option>
                      <option value="inactive">Inativa</option>
                    </Select>
                  </div>
                </div>
                <div className="grid gap-3 md:grid-cols-3">
                  <div>
                    <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-muted">Ação</label>
                    <Select onChange={(event) => setAutomationForm((prev) => ({ ...prev, action: event.target.value }))} value={automationForm.action}>
                      <option value="apply">Aplicar</option>
                      <option value="suggest">Sugerir</option>
                      <option value="ignore">Ignorar</option>
                    </Select>
                  </div>
                  <div>
                    <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-muted">Categoria</label>
                    <Input onChange={(event) => setAutomationForm((prev) => ({ ...prev, category: event.target.value }))} value={automationForm.category} />
                  </div>
                  <div>
                    <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-muted">Confiança mínima</label>
                    <Input
                      onChange={(event) => setAutomationForm((prev) => ({ ...prev, min_confidence: event.target.value }))}
                      type="number"
                      value={automationForm.min_confidence}
                    />
                  </div>
                </div>
                <div className="grid gap-3 md:grid-cols-2">
                  <div>
                    <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-muted">Campos de match</label>
                    <Input
                      onChange={(event) => setAutomationForm((prev) => ({ ...prev, match_fields: event.target.value }))}
                      value={automationForm.match_fields}
                    />
                  </div>
                  <div>
                    <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-muted">Regex</label>
                    <Input
                      onChange={(event) => setAutomationForm((prev) => ({ ...prev, regex_pattern: event.target.value }))}
                      value={automationForm.regex_pattern}
                    />
                  </div>
                </div>
                <div className="grid gap-3 md:grid-cols-2">
                  <div>
                    <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-muted">Palavras-chave</label>
                    <Textarea
                      onChange={(event) => setAutomationForm((prev) => ({ ...prev, keywords: event.target.value }))}
                      value={automationForm.keywords}
                    />
                  </div>
                  <div>
                    <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-muted">Aliases</label>
                    <Textarea
                      onChange={(event) => setAutomationForm((prev) => ({ ...prev, aliases: event.target.value }))}
                      value={automationForm.aliases}
                    />
                  </div>
                </div>
                <div>
                  <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-muted">Notas</label>
                  <Textarea onChange={(event) => setAutomationForm((prev) => ({ ...prev, notes: event.target.value }))} value={automationForm.notes} />
                </div>
                <div className="flex justify-end gap-2">
                  <Button
                    onClick={() => {
                      setAutomationEditorOpen(false);
                      setAutomationForm({ ...EMPTY_RULE_FORM });
                    }}
                    type="button"
                    variant="ghost"
                  >
                    Cancelar
                  </Button>
                  <Button type="submit" disabled={automationSaving}>
                    {automationSaving ? "Salvando..." : "Salvar regra"}
                  </Button>
                </div>
              </form>
            ) : null}
          </CardContent>
        </Card>
      ) : null}

      {activeTab === "io" ? (
        <Card className="border-border/80 bg-surface/95 shadow-sm">
          <CardHeader className="pb-3">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-muted">Importação e exportação</p>
                <h3 className="mt-1 text-base font-semibold text-text">Operações de planilha e administração</h3>
                <p className="mt-1 text-sm text-text-body">
                  Use a importação para cargas em lote, a exportação para extração auditada e a limpeza apenas no fluxo administrativo.
                </p>
              </div>
              {canManage ? (
                <Button onClick={() => setResetDialogOpen(true)} variant="danger">
                  Zerar tags
                </Button>
              ) : null}
            </div>
          </CardHeader>
          <CardContent className="grid gap-4 md:grid-cols-3">
            <Card className="border-border bg-surface shadow-sm">
              <CardContent className="space-y-3 py-5">
                <p className="text-xs font-semibold uppercase tracking-wide text-muted">Importar</p>
                <p className="text-sm text-text-body">Carregue uma planilha XLSX para criar ou atualizar tags em lote.</p>
                <Button onClick={openImport} variant="outline">
                  <Upload className="mr-2 h-4 w-4" />
                  Abrir importação
                </Button>
              </CardContent>
            </Card>
            <Card className="border-border bg-surface shadow-sm">
              <CardContent className="space-y-3 py-5">
                <p className="text-xs font-semibold uppercase tracking-wide text-muted">Exportar</p>
                <p className="text-sm text-text-body">Exporte a taxonomia atual com auditoria e mascaramento de observações sensíveis.</p>
                {canExport ? (
                  <Button onClick={exportSpreadsheet} variant="outline">
                    <Download className="mr-2 h-4 w-4" />
                    Exportar planilha
                  </Button>
                ) : (
                  <p className="text-xs text-muted">Sem permissão para exportar.</p>
                )}
              </CardContent>
            </Card>
            <Card className="border-border bg-surface shadow-sm">
              <CardContent className="space-y-3 py-5">
                <p className="text-xs font-semibold uppercase tracking-wide text-muted">Limpeza administrativa</p>
                <p className="text-sm text-text-body">Ação destrutiva, reservada para operadores com acesso de gestão.</p>
                {canManage ? (
                  <Button onClick={() => setResetDialogOpen(true)} variant="danger">
                    Zerar tags
                  </Button>
                ) : (
                  <p className="text-xs text-muted">Sem permissão para limpeza.</p>
                )}
              </CardContent>
            </Card>
          </CardContent>
        </Card>
      ) : null}

      <TagsDetailDialog
        formatDate={formatDate}
        canManage={canManage}
        loading={detailLoading}
        onReprocessLinkedTables={() => void reprocessLinkedTables()}
        onClose={() => setDetailOpen(false)}
        open={detailOpen}
        reprocessing={reprocessing}
        relatedRules={selectedTagAutomationRules}
        selectedTag={selectedTag}
        statusLabel={statusLabel}
        statusTone={statusTone}
      />

      <DangerConfirmDialog
        busy={deleteSaving}
        confirmLabel="Apagar"
        confirmToken="APAGAR"
        confirmTokenLabel="Digite APAGAR para apagar a tag"
        description={
          deleteTarget
            ? `Essa ação apagará a tag "${deleteTarget.name}" e todos os seus vínculos com tabelas. A classificação continuará existindo apenas se outra tag a substituir.`
            : "Essa ação apagará a tag selecionada e todos os seus vínculos com tabelas."
        }
        open={deleteDialogOpen}
        onCancel={() => {
          setDeleteDialogOpen(false);
          setDeleteTarget(null);
        }}
        onConfirm={() => void confirmDeleteTag()}
        title={deleteTarget ? `Apagar tag "${deleteTarget.name}"?` : "Apagar tag?"}
      />

      <DangerConfirmDialog
        busy={resetSaving}
        confirmLabel="Zerar"
        confirmToken="APAGAR"
        confirmTokenLabel="Digite APAGAR para zerar todas as tags"
        description="Essa ação apagará todas as tags e todos os vínculos associados. Use esta operação apenas quando quiser reconstruir a taxonomia do zero."
        open={resetDialogOpen}
        onCancel={() => setResetDialogOpen(false)}
        onConfirm={() => void confirmResetTags()}
        title="Zerar Tags"
      />

      <DangerConfirmDialog
        busy={automationSaving}
        confirmLabel="Remover"
        confirmToken="REMOVER"
        confirmTokenLabel="Digite REMOVER para apagar a regra"
        description="Essa ação removerá a regra automática selecionada."
        open={automationDeleteOpen}
        onCancel={() => {
          setAutomationDeleteOpen(false);
          setAutomationDeleteId(null);
        }}
        onConfirm={() => void confirmDeleteAutomationRule()}
        title="Remover regra automática?"
      />

      <TagsImportDialog
        importResult={importResult}
        importing={importing}
        onClose={closeImport}
        onDownloadTemplate={downloadTemplate}
        onFileChange={onImportFileChange}
        onSubmit={submitImport}
        open={importOpen}
      />

      <TagsEditorDialog
        form={form}
        mode={editorMode}
        onClose={() => setEditorOpen(false)}
        onFormChange={(patch) => setForm((current) => ({ ...current, ...patch }))}
        onSubmit={saveTag}
        open={editorOpen}
        saving={saving}
        statusOptions={Object.keys(STATUS_LABELS).map((value) => ({
          value,
          label: statusLabel(value),
        }))}
      />
    </div>
  );
}
