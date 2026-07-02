import { Link } from "@/lib/next-shims";
import { safeHref } from "@/lib/safe-href";
import { FormEvent, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "@/lib/next-shims";
import {
  ArrowRight,
  BadgeAlert,
  Building2,
  Mail,
  Pencil,
  Plus,
  Power,
  ShieldCheck,
  Table2,
  Trash2,
  UserRound,
  Workflow,
} from "lucide-react";
import { useTranslation } from "react-i18next";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { ApiError, apiRequest, downloadApiFile, getExportJobStatus } from "@/lib/client-api";
import { useAuth } from "@/lib/auth";
import type { PlatformIntegrationSyncJob } from "@/features/platform/types";
import type {
  OwnerTablePreview,
  DataOwnerListItem,
  DataOwnerDetail,
  OwnerFormState,
  PageResponse,
  PrivacySummary,
  CatalogTable,
  TableLocator,
  OwnerPriority,
  OwnershipSummaryOwner,
  OwnershipSummaryPriority,
  OwnershipUnownedAsset,
  OwnershipRankingItem,
  OwnershipDistributionAsset,
  OwnershipSummaryResponse,
  OwnershipDeleteImpact,
  OwnershipReassignSourceOwner,
  OwnershipReassignOwner,
  OwnershipReassignAsset,
  OwnershipReassignImpact,
  OwnershipReassignPreview,
  OwnershipReassignResult,
} from "@/features/data-owners/types";
import { JOURNEYS } from "@/features/data-owners/constants";
import { formatDate, tableDescription, isRestrictedAccess, buildReassignImpact } from "@/features/data-owners/helpers";

const EMPTY_FORM: OwnerFormState = {
  name: "",
  email: "",
  area: "",
  description: "",
  is_active: true,
};

function statusBadge(active: boolean) {
  return active ? <Badge tone="success">Ativo</Badge> : <Badge tone="warning">Inativo</Badge>;
}

function certificationBadge(status: string | null | undefined) {
  const normalized = (status || "unknown").toLowerCase();
  if (normalized === "certified") return <Badge tone="success">Certificada</Badge>;
  if (normalized === "eligible") return <Badge tone="accent">Elegível</Badge>;
  if (normalized === "in_review") return <Badge tone="neutral">Em revisão</Badge>;
  return <Badge tone="warning">Pendente</Badge>;
}

function privacyBadge(table: CatalogTable) {
  if (table.has_sensitive_personal_data) return <Badge tone="warning">Dado sensível</Badge>;
  if (table.has_personal_data) return <Badge tone="neutral">Dado pessoal</Badge>;
  if (table.sensitivity_level) return <Badge tone="accent">{table.sensitivity_level}</Badge>;
  return <Badge tone="neutral">Sem classificação formal</Badge>;
}

function riskBadge(level: string | null | undefined) {
  const normalized = (level || "low").toLowerCase();
  if (normalized === "critical") return <Badge tone="danger">Risco crítico</Badge>;
  if (normalized === "high") return <Badge tone="warning">Risco alto</Badge>;
  if (normalized === "medium") return <Badge tone="accent">Risco médio</Badge>;
  return <Badge tone="success">Risco baixo</Badge>;
}

export default function DataOwnersPage() {
  const searchParams = useSearchParams();
  const { t } = useTranslation();
  const auth = useAuth();
  const canEdit = auth.canAccessPath("/data-owners") && auth.canAction("write", "dataOwners");
  const canExport = auth.hasPermission("owners.export");

  const [owners, setOwners] = useState<DataOwnerListItem[]>([]);
  const [ownershipSummary, setOwnershipSummary] = useState<OwnershipSummaryResponse | null>(null);
  const [catalogSample, setCatalogSample] = useState<CatalogTable[]>([]);
  const [privacySummary, setPrivacySummary] = useState<PrivacySummary | null>(null);
  const [tableLocators, setTableLocators] = useState<Record<number, TableLocator>>({});
  const [selectedOwnerId, setSelectedOwnerId] = useState<number | null>(null);
  const [selectedOwner, setSelectedOwner] = useState<DataOwnerDetail | null>(null);
  const [selectedOwnerTables, setSelectedOwnerTables] = useState<CatalogTable[]>([]);
  const [loading, setLoading] = useState(true);
  const [summaryLoading, setSummaryLoading] = useState(true);
  const [contextLoading, setContextLoading] = useState(true);
  const [detailLoading, setDetailLoading] = useState(false);
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "active" | "inactive">("all");
  const [scopeFilter, setScopeFilter] = useState<
    "all" | "with_assets" | "without_assets" | "many_assets" | "inactive_with_assets" | "without_recent_update"
  >("all");
  const [areaFilter, setAreaFilter] = useState("all");
  const [toast, setToast] = useState<{ tone: "success" | "error"; message: string } | null>(null);
  const [editorOpen, setEditorOpen] = useState(false);
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<DataOwnerListItem | null>(null);
  const [deleteImpact, setDeleteImpact] = useState<OwnershipDeleteImpact | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [exportingOwnership, setExportingOwnership] = useState(false);
  const [ownershipExportJob, setOwnershipExportJob] = useState<PlatformIntegrationSyncJob | null>(null);
  const [reassignOpen, setReassignOpen] = useState(false);
  const [reassignSourceOwner, setReassignSourceOwner] = useState<OwnershipReassignSourceOwner | null>(null);
  const [reassignPreview, setReassignPreview] = useState<OwnershipReassignPreview | null>(null);
  const [reassignTargetOwnerId, setReassignTargetOwnerId] = useState<number | null>(null);
  const [reassignMode, setReassignMode] = useState<"all" | "selected">("all");
  const [reassignSelectedAssetIds, setReassignSelectedAssetIds] = useState<number[]>([]);
  const [reassignNote, setReassignNote] = useState("");
  const [reassignLoading, setReassignLoading] = useState(false);
  const [reassignSaving, setReassignSaving] = useState(false);
  const [formMode, setFormMode] = useState<"create" | "edit">("create");
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [form, setForm] = useState<OwnerFormState>(EMPTY_FORM);

  const areaOptions = useMemo(
    () =>
      Array.from(new Set(owners.map((owner) => owner.area).filter((value): value is string => Boolean(value))))
        .sort((left, right) => left.localeCompare(right, "pt-BR")),
    [owners],
  );

  const filteredOwners = useMemo(() => {
    const q = query.trim().toLowerCase();
    return owners.filter((owner) => {
      if (q && ![owner.name, owner.email, owner.area || "", owner.description || ""].some((value) => value.toLowerCase().includes(q))) {
        return false;
      }
      if (statusFilter === "active" && !owner.is_active) return false;
      if (statusFilter === "inactive" && owner.is_active) return false;
      if (areaFilter !== "all" && (owner.area || "") !== areaFilter) return false;
      if (scopeFilter === "with_assets" && owner.tables_count === 0) return false;
      if (scopeFilter === "without_assets" && owner.tables_count > 0) return false;
      if (scopeFilter === "many_assets" && owner.tables_count < Math.max(3, Math.min(10, Math.ceil(Math.max(...owners.map((item) => item.tables_count), 0) / 2)))) return false;
      if (scopeFilter === "inactive_with_assets" && (owner.is_active || owner.tables_count === 0)) return false;
      if (scopeFilter === "without_recent_update") {
        const updatedAt = new Date(owner.updated_at).getTime();
        if (Number.isNaN(updatedAt)) return false;
        const ninetyDaysAgo = Date.now() - 90 * 24 * 60 * 60 * 1000;
        if (updatedAt >= ninetyDaysAgo) return false;
      }
      return true;
    });
  }, [areaFilter, owners, query, scopeFilter, statusFilter]);

  const filteredSummaryOwners = useMemo(() => {
    const source = ownershipSummary?.owners ?? [];
    if (scopeFilter === "all") return source;
    const mostAssetsThreshold = Math.max(
      3,
      Math.min(
        10,
        Math.ceil(
          Math.max(...source.map((item) => item.asset_count), 0) / 2,
        ),
      ),
    );
    return source.filter((owner) => {
      if (scopeFilter === "with_assets") return owner.asset_count > 0;
      if (scopeFilter === "without_assets") return owner.asset_count === 0;
      if (scopeFilter === "many_assets") return owner.asset_count >= mostAssetsThreshold;
      if (scopeFilter === "inactive_with_assets") return owner.status === "inactive" && owner.asset_count > 0;
      if (scopeFilter === "without_recent_update") {
        const updatedAt = new Date(owner.updated_at).getTime();
        if (Number.isNaN(updatedAt)) return false;
        const ninetyDaysAgo = Date.now() - 90 * 24 * 60 * 60 * 1000;
        return updatedAt < ninetyDaysAgo;
      }
      return true;
    });
  }, [ownershipSummary?.owners, scopeFilter]);

  const ownersStats = useMemo(() => {
    const ownersWithAssets = owners.filter((owner) => owner.tables_count > 0);
    const activeOwners = owners.filter((owner) => owner.is_active && owner.tables_count > 0).length;
    const ownersWithoutAssets = owners.filter((owner) => owner.tables_count === 0).length;
    const visibleAssets = privacySummary?.totals.visible_assets ?? catalogSample.length;
    const assetsWithoutOwner = privacySummary?.totals.without_owner ?? catalogSample.filter((table) => !table.data_owner_id).length;
    const assetsWithOwner = Math.max(visibleAssets - assetsWithoutOwner, 0);
    const criticalAssetsWithoutOwner = catalogSample.filter(
      (table) => !table.data_owner_id && ["critical", "high"].includes((table.certification_criticality || "").toLowerCase()),
    ).length;
    const pendingCertifiedWithOwner = catalogSample.filter(
      (table) => table.data_owner_id && table.certification_status !== "certified",
    ).length;
    return {
      ownersCount: owners.length,
      ownersWithAssetsCount: ownersWithAssets.length,
      activeOwners,
      ownersWithoutAssets,
      visibleAssets,
      assetsWithOwner,
      assetsWithoutOwner,
      criticalAssetsWithoutOwner,
      pendingCertifiedWithOwner,
    };
  }, [catalogSample, owners, privacySummary]);

  const ownerPriorities = useMemo(() => {
    const items: OwnerPriority[] = [];
    for (const owner of owners) {
      if (!owner.is_active && owner.tables_count > 0) {
        items.push({
          ownerId: owner.id,
          ownerName: owner.name,
          reason: "Owner inativo ainda com ativos associados.",
          affectedAssets: owner.tables_count,
          action: "Revisar se os ativos devem ser redistribuídos para outro responsável ativo.",
          tone: "danger",
        });
      }
      if (owner.tables_count === 0) {
        items.push({
          ownerId: owner.id,
          ownerName: owner.name,
          reason: "Responsável cadastrado sem ativos vinculados.",
          affectedAssets: 0,
          action: "Associar tabelas no Explorer ou revisar se o cadastro continua necessário.",
          tone: "neutral",
        });
      }
      if (owner.tables_count >= 5) {
        items.push({
          ownerId: owner.id,
          ownerName: owner.name,
          reason: "Carga operacional acima da média entre os responsáveis cadastrados.",
          affectedAssets: owner.tables_count,
          action: "Revisar se há sobrecarga e se a distribuição de ownership continua equilibrada.",
          tone: "warning",
        });
      }
      const updatedAt = new Date(owner.updated_at).getTime();
      const ninetyDaysAgo = Date.now() - 90 * 24 * 60 * 60 * 1000;
      if (!Number.isNaN(updatedAt) && updatedAt < ninetyDaysAgo && owner.tables_count > 0) {
        items.push({
          ownerId: owner.id,
          ownerName: owner.name,
          reason: "Cadastro sem atualização recente, apesar de ainda ter ativos sob responsabilidade.",
          affectedAssets: owner.tables_count,
          action: "Confirmar se e-mail, área e escopo do owner continuam corretos.",
          tone: "warning",
        });
      }
    }
    return items.sort((left, right) => right.affectedAssets - left.affectedAssets).slice(0, 6);
  }, [owners]);

  const unownedAssets = useMemo(() => catalogSample.filter((table) => !table.data_owner_id).slice(0, 10), [catalogSample]);

  const effectiveOwners = ownershipSummary ? filteredSummaryOwners : filteredOwners;
  const ownershipMode = ownershipSummary ? "summary" : "fallback";
  const effectiveStats = ownershipSummary
    ? {
        ownersCount: ownershipSummary.totals.owners,
        activeOwners: ownershipSummary.totals.active_owners,
        ownersWithoutAssets: ownershipSummary.totals.owners_without_assets,
        visibleAssets: ownershipSummary.totals.assets_with_owner + ownershipSummary.totals.assets_without_owner,
        assetsWithOwner: ownershipSummary.totals.assets_with_owner,
        assetsWithoutOwner: ownershipSummary.totals.assets_without_owner,
        criticalAssetsWithoutOwner: ownershipSummary.totals.critical_assets_without_owner,
        pendingCertifiedWithOwner: ownershipSummary.totals.certification_pending_assets,
        privacyPendingAssets: ownershipSummary.totals.privacy_pending_assets,
        dqUnmonitoredAssets: ownershipSummary.totals.dq_unmonitored_assets,
        assetsWithOpenIncidents: ownershipSummary.totals.assets_with_open_incidents,
      }
    : {
        ...ownersStats,
        privacyPendingAssets: 0,
        dqUnmonitoredAssets: 0,
        assetsWithOpenIncidents: 0,
      };
  const effectivePriorities = ownershipSummary
    ? ownershipSummary.priorities.map((item) => ({
        ownerId: item.owner_id ?? 0,
        ownerName: item.type === "owner" ? item.title : item.description,
        reason: item.description,
        affectedAssets: 0,
        action: item.recommended_action,
        tone: (
          item.severity === "critical"
            ? "danger"
            : item.severity === "high"
              ? "warning"
              : "neutral"
        ) as "danger" | "warning" | "neutral",
      }))
    : ownerPriorities;
  const effectiveUnownedAssets = ownershipSummary ? ownershipSummary.unowned_assets : unownedAssets;

  useEffect(() => {
    async function loadLocators() {
      if (effectiveUnownedAssets.length === 0) {
        setTableLocators({});
        return;
      }
      const entries = await Promise.all(
        effectiveUnownedAssets.map(async (table) => {
          try {
            const locator = await apiRequest<TableLocator>(`/v1/catalog/tables/${table.id}/locator`);
            return [table.id, locator] as const;
          } catch {
            return null;
          }
        }),
      );
      setTableLocators(
        Object.fromEntries(entries.filter((entry): entry is readonly [number, TableLocator] => Boolean(entry))),
      );
    }

    void loadLocators();
  }, [effectiveUnownedAssets]);

  const selectedOwnerSummary = useMemo(() => {
    if (!selectedOwner) return null;
    const bySchema = selectedOwner.tables.reduce<Record<string, number>>((acc, table) => {
      const key = `${table.database_name}.${table.schema_name}`;
      acc[key] = (acc[key] || 0) + 1;
      return acc;
    }, {});
    const certified = selectedOwnerTables.filter((table) => table.certification_status === "certified").length;
    const notCertified = Math.max(selectedOwnerTables.length - certified, 0);
    const personalData = selectedOwnerTables.filter((table) => table.has_personal_data || table.has_sensitive_personal_data).length;
    const restricted = selectedOwnerTables.filter((table) => isRestrictedAccess(table.access_scope)).length;
    const withoutDescription = selectedOwnerTables.filter((table) => !tableDescription(table)).length;
    const withoutPrivacyReview = selectedOwnerTables.filter((table) => !table.privacy_reviewed_at).length;
    return {
      bySchema,
      certified,
      notCertified,
      personalData,
      restricted,
      withoutDescription,
      withoutPrivacyReview,
    };
  }, [selectedOwner, selectedOwnerTables]);

  const selectedOwnerMetrics = useMemo(
    () => ownershipSummary?.owners.find((item) => item.id === selectedOwnerId) ?? null,
    [ownershipSummary, selectedOwnerId],
  );

  const reassignAvailableOwners = useMemo(
    () => owners.filter((owner) => !reassignSourceOwner || owner.id !== reassignSourceOwner.id),
    [owners, reassignSourceOwner],
  );

  const reassignVisibleAssets = useMemo(() => reassignPreview?.assets ?? [], [reassignPreview]);

  const reassignSelectedAssets = useMemo(() => {
    if (reassignMode === "all") return reassignVisibleAssets;
    const selected = new Set(reassignSelectedAssetIds);
    return reassignVisibleAssets.filter((asset) => selected.has(asset.id));
  }, [reassignMode, reassignSelectedAssetIds, reassignVisibleAssets]);

  const reassignImpact = useMemo(() => buildReassignImpact(reassignSelectedAssets), [reassignSelectedAssets]);

  async function loadOwners() {
    setLoading(true);
    try {
      const data = await apiRequest<DataOwnerListItem[] | PageResponse<DataOwnerListItem>>("/v1/data-owners?page=1&page_size=100");
      setOwners(Array.isArray(data) ? data : data.items ?? []);
    } catch (error) {
      setToast({ tone: "error", message: (error as Error).message });
    } finally {
      setLoading(false);
    }
  }

  async function loadOwnershipSummary() {
    setSummaryLoading(true);
    try {
      const params = new URLSearchParams();
      if (query.trim()) params.set("query", query.trim());
      if (statusFilter !== "all") params.set("status", statusFilter);
      if (areaFilter !== "all") params.set("area", areaFilter);
      params.set("include_unowned", "true");
      params.set("page", "1");
      params.set("page_size", "100");
      const payload = await apiRequest<OwnershipSummaryResponse>(`/v1/governance/owners/summary?${params.toString()}`);
      setOwnershipSummary(payload);
    } catch {
      setOwnershipSummary(null);
    } finally {
      setSummaryLoading(false);
    }
  }

  async function loadOwnersContext() {
    setContextLoading(true);
    try {
      const [summary, tables] = await Promise.all([
        apiRequest<PrivacySummary>("/v1/privacy-access/summary").catch(() => null),
        apiRequest<CatalogTable[]>("/v1/catalog/tables?limit=200&offset=0").catch(() => []),
      ]);
      setPrivacySummary(summary);
      setCatalogSample(tables);
    } catch {
      setPrivacySummary(null);
      setCatalogSample([]);
    } finally {
      setContextLoading(false);
    }
  }

  async function openDetails(ownerId: number) {
    setSelectedOwnerId(ownerId);
    setDetailsOpen(true);
    setDetailLoading(true);
    try {
      const detail = await apiRequest<DataOwnerDetail>(`/v1/data-owners/${ownerId}`);
      setSelectedOwner(detail);
      const enrichedTables = await Promise.all(
        detail.tables.map((table) =>
          apiRequest<CatalogTable>(`/v1/catalog/tables/${table.id}`).catch(() => null),
        ),
      );
      setSelectedOwnerTables(enrichedTables.filter((item): item is CatalogTable => Boolean(item)));
    } catch (error) {
      setToast({ tone: "error", message: (error as Error).message });
      setDetailsOpen(false);
    } finally {
      setDetailLoading(false);
    }
  }

  async function openDeleteImpact(owner: DataOwnerListItem) {
    setDeleteLoading(true);
    try {
      const impact = await apiRequest<OwnershipDeleteImpact>(`/v1/data-owners/${owner.id}/delete-impact`);
      setDeleteTarget(owner);
      setDeleteImpact(impact);
    } catch (error) {
      setToast({ tone: "error", message: (error as Error).message });
    } finally {
      setDeleteLoading(false);
    }
  }

  function closeDeleteImpact() {
    setDeleteTarget(null);
    setDeleteImpact(null);
  }

  async function loadReassignPreview(sourceOwner: OwnershipReassignSourceOwner, targetOwnerId: number | null) {
    setReassignLoading(true);
    try {
      const params = new URLSearchParams();
      if (targetOwnerId) params.set("target_owner_id", String(targetOwnerId));
      params.set("page", "1");
      params.set("page_size", String(Math.max(1, Math.min(sourceOwner.tables_count || 1, 5000))));
      const preview = await apiRequest<OwnershipReassignPreview>(`/v1/data-owners/${sourceOwner.id}/reassign-preview?${params.toString()}`);
      setReassignPreview(preview);
      setReassignSelectedAssetIds(preview.assets.map((asset) => asset.id));
      setReassignMode("all");
      setReassignNote("");
      setReassignTargetOwnerId(preview.target_owner?.id ?? targetOwnerId ?? null);
    } catch (error) {
      setToast({ tone: "error", message: (error as Error).message });
      setReassignOpen(false);
      setReassignSourceOwner(null);
      setReassignPreview(null);
      setReassignTargetOwnerId(null);
      setReassignSelectedAssetIds([]);
    } finally {
      setReassignLoading(false);
    }
  }

  function closeReassignModal() {
    setReassignOpen(false);
    setReassignSourceOwner(null);
    setReassignPreview(null);
    setReassignTargetOwnerId(null);
    setReassignMode("all");
    setReassignSelectedAssetIds([]);
    setReassignNote("");
    setReassignLoading(false);
    setReassignSaving(false);
  }

  function openReassignModal(sourceOwner: OwnershipReassignSourceOwner) {
    setReassignOpen(true);
    setReassignSourceOwner(sourceOwner);
    const fallbackTarget = owners.find((owner) => owner.id !== sourceOwner.id)?.id ?? null;
    void loadReassignPreview(sourceOwner, fallbackTarget);
  }

  async function refreshDeleteImpact(ownerId: number) {
    if (!deleteTarget || deleteTarget.id !== ownerId) return;
    try {
      const impact = await apiRequest<OwnershipDeleteImpact>(`/v1/data-owners/${ownerId}/delete-impact`);
      setDeleteImpact(impact);
    } catch (error) {
      setToast({ tone: "error", message: (error as Error).message });
    }
  }

  async function confirmReassign() {
    if (!reassignSourceOwner || reassignTargetOwnerId === null) return;
    if (reassignTargetOwnerId === reassignSourceOwner.id) {
      setToast({ tone: "error", message: "Escolha um owner de destino diferente do owner de origem." });
      return;
    }
    const sourceAssetIds = reassignMode === "selected" ? reassignSelectedAssetIds : [];
    if (reassignMode === "selected" && sourceAssetIds.length === 0) {
      setToast({ tone: "error", message: "Selecione ao menos um ativo para reatribuir." });
      return;
    }

    setReassignSaving(true);
    try {
      const payload = {
        target_owner_id: reassignTargetOwnerId,
        asset_ids: sourceAssetIds,
        mode: reassignMode,
        note: reassignNote.trim() || null,
      };
      await apiRequest<OwnershipReassignResult>(`/v1/data-owners/${reassignSourceOwner.id}/reassign-assets`, {
        method: "POST",
        body: JSON.stringify(payload),
      });
      setToast({ tone: "success", message: "Ativos reatribuídos com sucesso." });
      const currentSourceId = reassignSourceOwner.id;
      const currentTargetId = reassignTargetOwnerId;
      closeReassignModal();
      await loadOwners();
      await loadOwnershipSummary();
      await loadOwnersContext();
      if (detailsOpen && selectedOwnerId !== null && [currentSourceId, currentTargetId].includes(selectedOwnerId)) {
        await openDetails(selectedOwnerId);
      }
      await refreshDeleteImpact(currentSourceId);
    } catch (error) {
      setToast({ tone: "error", message: (error as Error).message });
    } finally {
      setReassignSaving(false);
    }
  }

  async function exportOwnership() {
    setExportingOwnership(true);
    try {
      const params = new URLSearchParams();
      if (query.trim()) params.set("query", query.trim());
      if (statusFilter !== "all") params.set("status", statusFilter);
      if (areaFilter !== "all") params.set("area", areaFilter);
      params.set("include_unowned", "true");
      const result = await downloadApiFile(
        `/v1/governance/owners/export.csv?${params.toString()}`,
        "ownership_export.csv",
        undefined,
        {
          confirmMessage:
            "Exportar o recorte filtrado de ownership (até 2.000 owners e 2.000 ativos sem owner)? A exportacao sera auditada e campos sensiveis permanecem mascarados.",
        },
      );
      if (result.kind === "queued") {
        setOwnershipExportJob(result.job as PlatformIntegrationSyncJob);
        setToast({ tone: "success", message: "Exportação em processamento. O download ficará disponível quando o job concluir." });
      } else {
        setOwnershipExportJob(null);
      }
    } catch (error) {
      setToast({ tone: "error", message: (error as Error).message });
    } finally {
      setExportingOwnership(false);
    }
  }

  useEffect(() => {
    const publicId = ownershipExportJob?.artifact_public_id;
    if (!publicId || !["queued", "running"].includes((ownershipExportJob?.status || "").toLowerCase())) {
      return;
    }
    let cancelled = false;
    const interval = window.setInterval(() => {
      void (async () => {
        try {
          const payload = await getExportJobStatus(publicId);
          if (cancelled) return;
          const job = payload as PlatformIntegrationSyncJob;
          setOwnershipExportJob(job);
          if (job.status === "success" && job.export_download_href) {
            setToast({ tone: "success", message: "Exportação pronta para download." });
            window.clearInterval(interval);
          } else if (job.status === "failed") {
            setToast({ tone: "error", message: job.error || "A exportação falhou." });
            window.clearInterval(interval);
          }
        } catch {
          // keep polling until the job becomes available
        }
      })();
    }, 3000);
    return () => {
      cancelled = true;
      window.clearInterval(interval);
    };
  }, [ownershipExportJob?.artifact_public_id, ownershipExportJob?.status]);

  useEffect(() => {
    void loadOwners();
    void loadOwnersContext();
  }, []);

  useEffect(() => {
    void loadOwnershipSummary();
  }, [areaFilter, query, statusFilter]);

  useEffect(() => {
    const ownerId = Number(searchParams.get("ownerId") || "");
    if (!Number.isFinite(ownerId) || ownerId <= 0) return;
    void openDetails(ownerId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams]);

  function openCreate() {
    setFormMode("create");
    setForm(EMPTY_FORM);
    setEditorOpen(true);
  }

  function openEdit(owner: DataOwnerListItem) {
    setFormMode("edit");
    setSelectedOwnerId(owner.id);
    setForm({
      name: owner.name,
      email: owner.email,
      area: owner.area || "",
      description: owner.description || "",
      is_active: owner.is_active,
    });
    setEditorOpen(true);
  }

  async function saveOwner(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    try {
      const payload = {
        name: form.name.trim(),
        email: form.email.trim(),
        area: form.area.trim() || null,
        description: form.description.trim() || null,
        is_active: form.is_active,
      };
      if (formMode === "create") {
        await apiRequest("/v1/data-owners", { method: "POST", body: JSON.stringify(payload) });
        setToast({ tone: "success", message: "Responsável de dados criado com sucesso." });
      } else if (selectedOwnerId !== null) {
        await apiRequest(`/v1/data-owners/${selectedOwnerId}`, { method: "PUT", body: JSON.stringify(payload) });
        setToast({ tone: "success", message: "Responsável de dados atualizado com sucesso." });
      }
      setEditorOpen(false);
      await loadOwners();
      await loadOwnershipSummary();
      await loadOwnersContext();
      if (selectedOwnerId !== null && detailsOpen) {
        await openDetails(selectedOwnerId);
      }
    } catch (error) {
      setToast({ tone: "error", message: (error as Error).message });
    } finally {
      setSaving(false);
    }
  }

  async function confirmDelete(force = false) {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      const suffix = force ? "?force=true" : "";
      await apiRequest(`/v1/data-owners/${deleteTarget.id}${suffix}`, { method: "DELETE" });
      setToast({ tone: "success", message: "Responsável de dados removido com sucesso." });
      if (selectedOwnerId === deleteTarget.id) {
        setSelectedOwnerId(null);
        setSelectedOwner(null);
        setSelectedOwnerTables([]);
        setDetailsOpen(false);
      }
      closeDeleteImpact();
      await loadOwners();
      await loadOwnershipSummary();
      await loadOwnersContext();
    } catch (error) {
      if (error instanceof ApiError && error.status === 409 && error.payload && typeof error.payload === "object") {
        const payload = error.payload as OwnershipDeleteImpact & { message?: string };
        setDeleteImpact(payload);
      }
      setToast({ tone: "error", message: (error as Error).message });
    } finally {
      setDeleting(false);
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div className="space-y-1">
          <h2 className="text-2xl font-semibold tracking-tight text-text">{t("pages.dataOwners.title")}</h2>
          <p className="max-w-2xl text-sm leading-6 text-text-body">
            Gerencie responsáveis de dados e acompanhe as tabelas associadas em um padrão visual consistente com o restante do sistema.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {canExport ? (
            <Button disabled={exportingOwnership} onClick={() => void exportOwnership()} variant="outline">
              {exportingOwnership ? <Power className="mr-2 h-4 w-4 animate-pulse" /> : null}
              Exportar ownership
            </Button>
          ) : null}
          {canEdit ? (
            <Button onClick={openCreate}>
              <Plus className="mr-2 h-4 w-4" />
              Novo responsável
            </Button>
          ) : null}
        </div>
        {ownershipExportJob ? (
          <div className="text-xs text-muted lg:text-right">
            Exportação {ownershipExportJob.status}.{" "}
            {ownershipExportJob.export_download_available && ownershipExportJob.export_download_href ? (
              <a className="font-medium text-info-700 underline" href={safeHref(ownershipExportJob.export_download_href)}>
                baixar arquivo
              </a>
            ) : (
              <span>Disponível até {ownershipExportJob.artifact_expires_at ? new Date(ownershipExportJob.artifact_expires_at).toLocaleString("pt-BR") : "expiração definida pelo job"}</span>
            )}
          </div>
        ) : null}
      </div>

      <Card className="border-border/80 bg-gradient-to-br from-white via-slate-50 to-accent-50 shadow-[0_18px_48px_rgba(15,23,42,0.05)]">
        <CardContent className="space-y-6 p-6">
          <div className="grid gap-6 xl:grid-cols-[1.3fr_0.95fr]">
            <div className="space-y-4">
              <div className="inline-flex items-center gap-2 rounded-full border border-info-200 bg-surface px-3 py-1 text-xs font-medium text-info-700">
                <ShieldCheck className="h-3.5 w-3.5" />
                Ownership aplicado à governança do catálogo
              </div>
              <div>
                <h3 className="text-3xl font-semibold tracking-tight text-text">O que é um responsável de dados?</h3>
                <p className="mt-2 max-w-3xl text-sm leading-7 text-text-body">
                  O responsável de dados, ou owner, é a pessoa ou time que responde pelo uso, prioridade, qualidade e governança de um conjunto de ativos. Ele ajuda a decidir quem pode usar os dados, quais tabelas precisam de documentação, quais incidentes devem ser tratados e quais ativos podem ser certificados.
                </p>
              </div>
              <div className="rounded-2xl border border-info-200/80 bg-surface/80 p-4 text-sm leading-6 text-text-body">
                Owner não é necessariamente quem desenvolve o pipeline. O owner representa a responsabilidade de negócio ou governança sobre o ativo.
              </div>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              {[
                {
                  label: "Owners cadastrados",
                  value: effectiveStats.ownersCount,
                  helper: "Quantidade de responsáveis cadastrados na plataforma.",
                },
                {
                  label: "Ativos com owner",
                  value: effectiveStats.assetsWithOwner,
                  helper: "Ativos visíveis que já possuem responsável definido.",
                },
                {
                  label: "Ativos sem owner",
                  value: effectiveStats.assetsWithoutOwner,
                  helper: "Tabelas sem responsável, o que dificulta governança, certificação e revisão.",
                },
                {
                  label: "Owners ativos",
                  value: effectiveStats.activeOwners,
                  helper: "Responsáveis ativos com pelo menos um ativo associado.",
                },
                {
                  label: "Owners sem ativos",
                  value: effectiveStats.ownersWithoutAssets,
                  helper: "Responsáveis cadastrados que ainda não possuem tabelas vinculadas.",
                },
                {
                  label: "Ativos críticos sem owner",
                  value: effectiveStats.criticalAssetsWithoutOwner,
                  helper: "Leitura baseada na amostra carregada do catálogo para revisão operacional rápida.",
                },
                {
                  label: "Ativos pendentes de certificação",
                  value: effectiveStats.pendingCertifiedWithOwner,
                  helper: "Leitura amostral dos ativos visíveis com owner definido, mas ainda não certificados.",
                },
                {
                  label: "Ativos com privacidade pendente",
                  value: effectiveStats.privacyPendingAssets,
                  helper: "Ativos que ainda precisam de revisão de privacidade ou base legal registrada.",
                },
                {
                  label: "Ativos sem DQ",
                  value: effectiveStats.dqUnmonitoredAssets,
                  helper: "Ativos sem monitoramento de qualidade detectado no consolidado disponível.",
                },
                {
                  label: "Ativos com incidentes",
                  value: effectiveStats.assetsWithOpenIncidents,
                  helper: "Ativos visíveis que possuem pelo menos um incidente aberto.",
                },
              ].map((item) => (
                <div className="rounded-2xl border border-border bg-surface p-4 shadow-sm" key={item.label}>
                  <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-brand-600">{item.label}</p>
                  <p className="mt-3 text-2xl font-semibold text-text">{item.value.toLocaleString("pt-BR")}</p>
                  <p className="mt-1 text-sm text-text-body">{item.helper}</p>
                </div>
              ))}
            </div>
          </div>
          <div className="rounded-2xl border border-border bg-bg-subtle/80 p-4 text-sm text-text-body">
            <span className="font-semibold text-text">
              {ownershipMode === "summary" ? "Resumo global de ownership:" : "Leitura operacional baseada nos dados carregados:"}
            </span>{" "}
            {ownershipMode === "summary"
              ? "os cards, prioridades e ativos sem owner usam o consolidado do endpoint agregador de ownership."
              : "a tela continua funcional usando owners, catálogo e summary de privacidade já existentes enquanto o agregador não responde."}
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-4 xl:grid-cols-3">
        <Card className="border-border/80 shadow-[0_12px_36px_rgba(15,23,42,0.04)] xl:col-span-2">
          <CardContent className="space-y-3 p-6">
            <div>
              <h3 className="text-base font-semibold text-text">Como usar a gestão de responsáveis</h3>
              <p className="mt-1 text-sm text-text-body">
                Use esta tela para acompanhar quem responde pelos ativos do catálogo, quais tabelas estão sem responsável e quais owners precisam atuar em pendências de qualidade, certificação, privacidade ou documentação.
              </p>
            </div>
            <div className="grid gap-3 md:grid-cols-3">
              {[
                "Revise os owners cadastrados e o número de tabelas atribuídas a cada um.",
                "Priorize owners com ativos críticos, muitos ativos ou cadastro desatualizado.",
                "Corrija ownership no Explorer e acompanhe certificação, privacidade e revisão dos ativos.",
              ].map((step, index) => (
                <div className="rounded-2xl border border-border bg-bg-subtle/80 p-4 text-sm text-text-body" key={step}>
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-brand-600">Passo {index + 1}</p>
                  <p className="mt-2 leading-6">{step}</p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card className="border-warning-200/80 bg-warning-50/60 shadow-[0_12px_36px_rgba(15,23,42,0.04)]">
          <CardContent className="space-y-3 p-6">
            <div className="inline-flex items-center gap-2 rounded-full border border-warning-200 bg-surface px-3 py-1 text-xs font-medium text-warning-700">
              <Workflow className="h-3.5 w-3.5" />
              Owner x Steward x Consumidor
            </div>
            <div className="space-y-3 text-sm leading-6 text-text-body">
              <p>
                <span className="font-semibold text-text">Owner:</span> responsável pela decisão, prioridade e responsabilidade do ativo.
              </p>
              <p>
                <span className="font-semibold text-text">Steward:</span> responsável por documentação, qualidade, classificação e governança diária.
              </p>
              <p>
                <span className="font-semibold text-text">Consumidor:</span> pessoa, time, dashboard ou processo que usa o dado.
              </p>
            </div>
            <div className="rounded-2xl border border-warning-200 bg-surface/80 p-4 text-sm leading-6 text-text-body">
              Um ativo pode ter owner, steward e consumidores diferentes. A tela Owners foca na responsabilidade principal de governança e decisão.
            </div>
          </CardContent>
        </Card>
      </div>

      <Card className="border-border/80 shadow-[0_12px_36px_rgba(15,23,42,0.04)]">
        <CardHeader>
          <div>
            <h3 className="text-sm font-semibold uppercase tracking-[0.18em] text-brand-600">Jornadas principais do owner</h3>
            <p className="mt-1 text-sm text-text-body">
              Use os atalhos para investigar ativos, qualidade, privacidade, certificação e incidentes sob responsabilidade do owner.
            </p>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
            {JOURNEYS.map((item) => (
              <div className="rounded-2xl border border-border bg-surface p-4 shadow-sm" key={item.title}>
                <p className="text-sm font-semibold text-text">{item.title}</p>
                <p className="mt-2 text-sm leading-6 text-text-body">{item.description}</p>
                <Button asChild className="mt-4 w-full" size="sm" variant="outline">
                  <Link href={item.href}>Abrir</Link>
                </Button>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {ownershipSummary ? (
        <div className="grid gap-4 xl:grid-cols-2">
          <Card className="border-border/80 shadow-[0_12px_36px_rgba(15,23,42,0.04)]">
            <CardHeader>
              <div>
                <h3 className="text-sm font-semibold uppercase tracking-[0.18em] text-brand-600">Ranking de ownership</h3>
                <p className="mt-1 text-sm text-text-body">
                  Responsáveis com maior volume ou risco operacional.
                </p>
              </div>
            </CardHeader>
            <CardContent className="grid gap-3 md:grid-cols-2">
              {[
                { title: "Mais ativos", items: ownershipSummary.rankings.most_assets },
                { title: "Mais pendências de certificação", items: ownershipSummary.rankings.most_certification_pending },
                { title: "Mais pendências de privacidade", items: ownershipSummary.rankings.most_privacy_pending },
                { title: "Mais ativos sem DQ", items: ownershipSummary.rankings.most_dq_unmonitored },
              ].map((group) => (
                <div className="rounded-2xl border border-border bg-surface p-4 shadow-sm" key={group.title}>
                  <p className="text-sm font-semibold text-text">{group.title}</p>
                  <div className="mt-3 space-y-2">
                    {group.items.length === 0 ? (
                      <p className="text-sm text-muted">Nenhum item disponível.</p>
                    ) : (
                      group.items.slice(0, 3).map((item) => (
                        <div className="flex items-center justify-between gap-3 rounded-2xl border border-border bg-bg-subtle/70 px-3 py-2" key={`${group.title}-${item.owner_id}`}>
                          <div className="min-w-0">
                            <p className="truncate text-sm font-medium text-text">{item.name}</p>
                            <p className="text-xs text-muted">{item.area || "Área não informada"}</p>
                          </div>
                          <div className="flex items-center gap-2">
                            {riskBadge(item.risk_level)}
                            <Badge tone="neutral">{item.metric_value}</Badge>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>

          <Card className="border-border/80 shadow-[0_12px_36px_rgba(15,23,42,0.04)]">
            <CardHeader>
              <div>
                <h3 className="text-sm font-semibold uppercase tracking-[0.18em] text-brand-600">Cobertura de ownership</h3>
                <p className="mt-1 text-sm text-text-body">
                  Quanto do catálogo visível possui responsável definido e onde a ausência de owner se concentra.
                </p>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="rounded-2xl border border-border bg-bg-subtle/80 p-4">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-muted">Cobertura com owner</p>
                  <p className="mt-2 text-2xl font-semibold text-text">
                    {effectiveStats.visibleAssets > 0
                      ? `${Math.round((effectiveStats.assetsWithOwner / effectiveStats.visibleAssets) * 100)}%`
                      : "0%"}
                  </p>
                  <p className="mt-1 text-sm text-text-body">{effectiveStats.assetsWithOwner} de {effectiveStats.visibleAssets} ativo(s) visíveis.</p>
                </div>
                <div className="rounded-2xl border border-border bg-bg-subtle/80 p-4">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-muted">Sem owner</p>
                  <p className="mt-2 text-2xl font-semibold text-text">
                    {effectiveStats.visibleAssets > 0
                      ? `${Math.round((effectiveStats.assetsWithoutOwner / effectiveStats.visibleAssets) * 100)}%`
                      : "0%"}
                  </p>
                  <p className="mt-1 text-sm text-text-body">{effectiveStats.assetsWithoutOwner} ativo(s) ainda órfãos no catálogo visível.</p>
                </div>
              </div>
              <div className="grid gap-3 md:grid-cols-2">
                <div className="rounded-2xl border border-border bg-surface p-4 shadow-sm">
                  <p className="text-sm font-semibold text-text">Schemas com maior ausência de owner</p>
                  <div className="mt-3 space-y-2">
                    {ownershipSummary.distribution.by_schema.slice(0, 4).map((item) => (
                      <div className="flex items-center justify-between gap-3 rounded-2xl border border-border bg-bg-subtle/70 px-3 py-2" key={`${item.database_name}-${item.schema_name}`}>
                        <div>
                          <p className="text-sm font-medium text-text">{item.schema_name}</p>
                          <p className="text-xs text-muted">{item.database_name}</p>
                        </div>
                        <Badge tone={item.assets_without_owner > 0 ? "warning" : "success"}>
                          {item.assets_without_owner} sem owner
                        </Badge>
                      </div>
                    ))}
                  </div>
                </div>
                <div className="rounded-2xl border border-border bg-surface p-4 shadow-sm">
                  <p className="text-sm font-semibold text-text">Bancos com mais pendências</p>
                  <div className="mt-3 space-y-2">
                    {ownershipSummary.distribution.by_database.slice(0, 4).map((item) => (
                      <div className="flex items-center justify-between gap-3 rounded-2xl border border-border bg-bg-subtle/70 px-3 py-2" key={item.database_name || "database"}>
                        <div>
                          <p className="text-sm font-medium text-text">{item.database_name}</p>
                          <p className="text-xs text-muted">{item.total_assets} ativo(s) visíveis</p>
                        </div>
                        <Badge tone={item.assets_without_owner > 0 ? "warning" : "neutral"}>
                          {item.assets_without_owner} sem owner
                        </Badge>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      ) : null}

      <div className="grid gap-4 xl:grid-cols-2">
        <Card className="border-border/80 shadow-[0_12px_36px_rgba(15,23,42,0.04)]">
          <CardHeader>
            <div>
              <h3 className="text-sm font-semibold uppercase tracking-[0.18em] text-brand-600">Prioridades dos responsáveis</h3>
              <p className="mt-1 text-sm text-text-body">
                Owners e ativos que precisam de atenção para reduzir risco de governança.
              </p>
            </div>
          </CardHeader>
          <CardContent>
            {effectivePriorities.length === 0 ? (
              <EmptyState
                title="Nenhuma prioridade evidente encontrada"
                description="Os responsáveis carregados não apresentaram sobrecarga, inatividade com ativos ou ausência de ativos nesta leitura."
              />
            ) : (
              <div className="space-y-3">
                {effectivePriorities.map((item, index) => (
                  <div className="rounded-2xl border border-border bg-surface p-4 shadow-sm" key={`${item.ownerId}-${item.reason}-${index}`}>
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div>
                        <p className="text-sm font-semibold text-text">{item.ownerName}</p>
                        <p className="mt-1 text-sm leading-6 text-text-body">{item.reason}</p>
                      </div>
                      <Badge tone={item.tone}>{item.affectedAssets > 0 ? `${item.affectedAssets} ativo(s)` : "Prioridade"}</Badge>
                    </div>
                    <div className="mt-3 rounded-2xl border border-info-200 bg-info-50/70 p-3 text-sm text-info-700">
                      <span className="font-semibold">Ação recomendada:</span> {item.action}
                    </div>
                    {item.ownerId > 0 ? (
                      <div className="mt-4 flex justify-end">
                        <Button onClick={() => void openDetails(item.ownerId)} size="sm" variant="outline">
                          Ver detalhe
                        </Button>
                      </div>
                    ) : null}
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="border-border/80 shadow-[0_12px_36px_rgba(15,23,42,0.04)]">
          <CardHeader>
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h3 className="text-sm font-semibold uppercase tracking-[0.18em] text-brand-600">Ativos sem responsável</h3>
                <p className="mt-1 text-sm text-text-body">
                  Tabelas que precisam de ownership definido para reduzir risco de governança.
                </p>
              </div>
              <p className="text-xs leading-5 text-muted">
                {ownershipMode === "summary"
                  ? "Lista operacional baseada no consolidado global de ownership visível ao seu perfil."
                  : "Lista operacional baseada na amostra visível do catálogo carregada nesta tela."}
              </p>
            </div>
          </CardHeader>
          <CardContent>
            {contextLoading || summaryLoading ? (
              <p className="text-sm text-muted">Carregando ativos sem owner...</p>
            ) : effectiveUnownedAssets.length === 0 ? (
              <EmptyState
                title="Nenhum ativo sem owner"
                description="Todos os ativos carregados possuem responsável definido."
              />
            ) : (
              <div className="space-y-3">
                {effectiveUnownedAssets.map((table) => (
                  <div className="rounded-2xl border border-border bg-surface p-4 shadow-sm" key={table.id}>
                    {(() => {
                      const locator = tableLocators[table.id];
                      const privacyPending =
                        "privacy_signal" in table
                          ? Boolean(table.privacy_signal)
                          : table.has_sensitive_personal_data || table.has_personal_data;
                      return (
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div>
                        <p className="text-sm font-semibold text-text">
                          {table.name}
                        </p>
                        <p className="mt-1 text-xs text-muted">
                          {locator
                            ? `${locator.datasource_name} • ${locator.database_name} • ${locator.schema_name}`
                            : "schema_name" in table && "database_name" in table && "connection_name" in table
                              ? `${table.connection_name} • ${table.database_name} • ${table.schema_name}`
                              : "Schema não informado"}
                        </p>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        {certificationBadge(table.certification_status)}
                        {privacyPending ? <Badge tone="warning">Privacidade pendente</Badge> : null}
                      </div>
                    </div>
                      );
                    })()}
                    <div className="mt-3 flex justify-end">
                      <Button asChild size="sm" variant="outline">
                        <Link href={`/explorer?tableId=${table.id}`}>Atribuir owner</Link>
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <Card className="border-border bg-surface shadow-[0_12px_36px_rgba(15,23,42,0.04)]">
        <CardContent className="space-y-4 p-5">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-2 text-sm text-text-body">
              <UserRound className="h-4 w-4 text-muted" />
              <span>{effectiveStats.ownersCount} responsáveis de dados cadastrados</span>
            </div>
            <div className="grid w-full gap-3 sm:max-w-4xl sm:grid-cols-[1fr_150px_190px_190px]">
              <Input onChange={(event) => setQuery(event.target.value)} placeholder="Buscar por nome, e-mail ou área" value={query} />
              <Select onChange={(event) => setStatusFilter(event.target.value as "all" | "active" | "inactive")} value={statusFilter}>
                <option value="all">Status: todos</option>
                <option value="active">Somente ativos</option>
                <option value="inactive">Somente inativos</option>
              </Select>
              <Select onChange={(event) => setAreaFilter(event.target.value)} value={areaFilter}>
                <option value="all">Área: todas</option>
                {areaOptions.map((area) => (
                  <option key={area} value={area}>
                    {area}
                  </option>
                ))}
              </Select>
              <Select onChange={(event) => setScopeFilter(event.target.value as typeof scopeFilter)} value={scopeFilter}>
                <option value="all">Escopo: todos</option>
                <option value="with_assets">Com ativos</option>
                <option value="without_assets">Sem ativos</option>
                <option value="many_assets">Com muitos ativos</option>
                <option value="inactive_with_assets">Inativo com ativos</option>
                <option value="without_recent_update">Sem atualização recente</option>
              </Select>
            </div>
          </div>
          <p className="text-xs leading-5 text-muted">
            Use filtros para encontrar responsáveis com maior carga operacional ou maior risco de governança.
          </p>
        </CardContent>
      </Card>

      {loading && !ownershipSummary ? (
        <Card className="border-border bg-surface shadow-[0_12px_36px_rgba(15,23,42,0.04)]">
          <CardContent className="py-8 text-sm text-muted">Carregando responsáveis de dados...</CardContent>
        </Card>
      ) : effectiveOwners.length === 0 ? (
        <EmptyState
          title={effectiveStats.ownersCount === 0 ? "Nenhum owner cadastrado" : "Nenhum resultado"}
          description={
            effectiveStats.ownersCount === 0
              ? "Cadastre o primeiro responsável para começar a atribuir ownership aos ativos do catálogo."
              : "Nenhum responsável encontrado com os filtros atuais."
          }
        />
      ) : (
        <div className="grid gap-5 lg:grid-cols-2 xl:grid-cols-3">
          {effectiveOwners.map((owner) => {
            const isSummaryOwner = "asset_count" in owner;
            const previewWithoutDescription = !isSummaryOwner
              ? owner.tables_preview.filter((table) => !table.description).length
              : owner.assets_without_description;
            const ownerAssetCount = isSummaryOwner ? owner.asset_count : owner.tables_count;
            const ownerIsActive = isSummaryOwner ? owner.status === "active" : owner.is_active;
            const editableOwner = owners.find((item) => item.id === owner.id) || null;
            return (
              <Card className="border-border bg-surface shadow-[0_12px_36px_rgba(15,23,42,0.04)] transition hover:border-border-strong hover:shadow-[0_14px_40px_rgba(15,23,42,0.07)]" key={owner.id}>
                <CardHeader className="space-y-4 border-b border-border pb-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <h3 className="truncate text-base font-semibold text-text">{owner.name}</h3>
                        <Badge tone="neutral">Owner</Badge>
                      </div>
                      <p className="mt-1 flex items-center gap-2 text-sm text-text-body">
                        <Building2 className="h-4 w-4 text-muted" />
                        <span className="truncate">{owner.area || "Área não informada"}</span>
                      </p>
                    </div>
                    {statusBadge(ownerIsActive)}
                  </div>
                  <p className="flex items-center gap-2 break-words text-sm leading-6 text-text-body">
                    <Mail className="h-4 w-4 text-muted" />
                    <span className="truncate">{owner.email}</span>
                  </p>
                </CardHeader>

                <CardContent className="space-y-5 p-5">
                  <div className="grid grid-cols-2 gap-3">
                    <div className="rounded-2xl border border-border bg-bg-subtle p-3">
                      <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-muted">Tabelas associadas</p>
                      <p className="mt-1 text-xl font-semibold text-text">{ownerAssetCount}</p>
                    </div>
                    <div className="rounded-2xl border border-border bg-bg-subtle p-3">
                      <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-muted">Atualizado</p>
                      <p className="mt-1 text-sm font-medium text-text">{formatDate(owner.updated_at)}</p>
                    </div>
                    <div className="rounded-2xl border border-border bg-bg-subtle p-3">
                      <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-muted">Sem descrição na prévia</p>
                      <p className="mt-1 text-xl font-semibold text-text">{previewWithoutDescription}</p>
                    </div>
                    <div className="rounded-2xl border border-border bg-bg-subtle p-3">
                      <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-muted">Cobertura</p>
                      <p className="mt-1 text-sm font-medium text-text">{ownerAssetCount > 0 ? "Com ativos" : "Sem ativos"}</p>
                    </div>
                  </div>

                  {"asset_count" in owner ? (
                    <div className="grid grid-cols-2 gap-3">
                      <div className="rounded-2xl border border-border bg-surface p-3 shadow-sm">
                        <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-muted">Certificação pendente</p>
                        <p className="mt-1 text-lg font-semibold text-text">{owner.certification_pending_assets}</p>
                      </div>
                      <div className="rounded-2xl border border-border bg-surface p-3 shadow-sm">
                        <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-muted">Sem DQ</p>
                        <p className="mt-1 text-lg font-semibold text-text">{owner.dq_unmonitored_assets}</p>
                      </div>
                      <div className="rounded-2xl border border-border bg-surface p-3 shadow-sm">
                        <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-muted">Incidentes</p>
                        <p className="mt-1 text-lg font-semibold text-text">{owner.assets_with_open_incidents}</p>
                      </div>
                      <div className="rounded-2xl border border-border bg-surface p-3 shadow-sm">
                        <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-muted">Privacidade pendente</p>
                        <p className="mt-1 text-lg font-semibold text-text">{owner.privacy_pending_assets}</p>
                      </div>
                    </div>
                  ) : null}

                  <div className="rounded-2xl border border-info-200 bg-info-50/60 p-3 text-sm leading-6 text-sky-950">
                    {"asset_count" in owner ? (
                      <>
                        <div className="flex flex-wrap items-center gap-2">
                          {riskBadge(owner.risk_level)}
                          {owner.main_blocker ? <span className="font-semibold">{owner.main_blocker}</span> : null}
                        </div>
                        <p className="mt-2">{owner.recommended_action || "Revisar documentação, certificação, privacidade e cobertura operacional dos ativos."}</p>
                      </>
                    ) : (
                      "Este responsável possui ativos que podem exigir revisão de documentação, certificação, privacidade ou redistribuição de ownership."
                    )}
                  </div>

                  <div className="space-y-2">
                    <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-muted">Principais tabelas</p>
                    {"tables_preview" in owner && owner.tables_preview.length === 0 ? (
                      <p className="text-sm leading-6 text-muted">Este responsável ainda não possui ativos associados.</p>
                    ) : "tables_preview" in owner ? (
                      <div className="space-y-2">
                        {owner.tables_preview.slice(0, 3).map((table) => (
                          <div className="rounded-2xl border border-border bg-bg-subtle/70 px-3 py-2.5" key={table.id}>
                            <div className="flex items-start justify-between gap-3">
                              <div className="min-w-0 flex-1">
                                <p className="break-words text-sm font-medium leading-5 text-text whitespace-normal">
                                  {table.schema_name}.{table.name}
                                </p>
                                <p className="mt-1 break-words text-xs leading-5 text-muted whitespace-normal">
                                  {table.datasource_name} • {table.database_name}
                                </p>
                              </div>
                              <Link className="shrink-0 text-xs font-medium text-text-body hover:text-text hover:underline" href={`/explorer?tableId=${table.id}`}>
                                Explorer
                              </Link>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-sm leading-6 text-muted">
                        O summary consolidado trouxe métricas globais deste owner. Abra o detalhe para ver a lista enriquecida dos ativos.
                      </p>
                    )}
                  </div>

                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="flex flex-wrap gap-2">
                      <Button onClick={() => void openDetails(owner.id)} size="sm" variant="outline">
                        Ver detalhes
                      </Button>
                      <Button asChild size="sm" variant="ghost">
                        <Link href={`/explorer`}>
                          Abrir ativos no Explorer
                        </Link>
                      </Button>
                    </div>
                    {canEdit ? (
                      <div className="flex items-center gap-2">
                        <Button
                          disabled={!editableOwner || editableOwner.tables_count === 0}
                          onClick={() => editableOwner && editableOwner.tables_count > 0 && openReassignModal({
                            id: editableOwner.id,
                            name: editableOwner.name,
                            email: editableOwner.email,
                            area: editableOwner.area,
                            tables_count: editableOwner.tables_count,
                          })}
                          size="sm"
                          title={!editableOwner || editableOwner.tables_count === 0 ? "Este owner não possui ativos para reatribuir." : undefined}
                          variant="ghost"
                        >
                          Reatribuir
                        </Button>
                        <Button disabled={!editableOwner} onClick={() => editableOwner && openEdit(editableOwner)} size="sm" variant="ghost">
                          <Pencil className="mr-1 h-4 w-4" />
                          Editar
                        </Button>
                        <Button disabled={!editableOwner} onClick={() => editableOwner && void openDeleteImpact(editableOwner)} size="sm" variant="ghost">
                          <Trash2 className="mr-1 h-4 w-4" />
                          Remover
                        </Button>
                      </div>
                    ) : null}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {editorOpen ? (
        <div className="fixed inset-0 z-50 bg-black/40 p-3">
          <div className="ml-auto h-full w-full max-w-xl overflow-y-auto rounded-2xl border border-border bg-surface shadow-[0_24px_70px_rgba(15,23,42,0.16)]">
            <div className="flex items-center justify-between border-b border-border px-5 py-4">
              <div>
                <h3 className="text-lg font-semibold text-text">{formMode === "create" ? "Novo responsável" : "Editar responsável"}</h3>
                <p className="text-xs leading-5 text-muted">Cadastro padronizado de responsáveis de dados para o catálogo.</p>
              </div>
              <Button onClick={() => setEditorOpen(false)} variant="ghost">
                Fechar
              </Button>
            </div>

            <form className="space-y-4 p-5" onSubmit={saveOwner}>
              <div>
                <label className="mb-1 block text-sm font-medium text-text-body">Nome</label>
                <Input onChange={(event) => setForm((prev) => ({ ...prev, name: event.target.value }))} required value={form.name} />
                <p className="mt-1 text-xs leading-5 text-muted">Nome da pessoa ou time responsável pelos ativos.</p>
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-text-body">E-mail</label>
                <Input onChange={(event) => setForm((prev) => ({ ...prev, email: event.target.value }))} required type="email" value={form.email} />
                <p className="mt-1 text-xs leading-5 text-muted">Contato usado para notificações, revisão e acionamento operacional.</p>
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-text-body">Área / time</label>
                <Input onChange={(event) => setForm((prev) => ({ ...prev, area: event.target.value }))} placeholder="Ex.: Comercial, Financeiro, Dados" value={form.area} />
                <p className="mt-1 text-xs leading-5 text-muted">Área de negócio ou time ao qual o responsável pertence.</p>
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-text-body">Observações</label>
                <Textarea onChange={(event) => setForm((prev) => ({ ...prev, description: event.target.value }))} placeholder="Escopo de atuação, contexto operacional ou limitações do responsável." value={form.description} />
                <p className="mt-1 text-xs leading-5 text-muted">Registre contexto, escopo de atuação ou limitações do responsável.</p>
              </div>
              <label className="flex items-start gap-2 text-sm">
                <input checked={form.is_active} onChange={(event) => setForm((prev) => ({ ...prev, is_active: event.target.checked }))} type="checkbox" />
                <span>
                  Responsável ativo
                  <span className="mt-1 block text-xs leading-5 text-muted">
                    Use “ativo” para responsáveis que ainda respondem por ativos. Owners inativos devem ter ativos redistribuídos.
                  </span>
                </span>
              </label>

              {formMode === "edit" && !form.is_active && owners.find((owner) => owner.id === selectedOwnerId)?.tables_count ? (
                <div className="rounded-2xl border border-warning-200 bg-warning-50/70 p-3 text-sm leading-6 text-warning-700">
                  Este responsável ainda possui ativos associados. Antes de desativar, confirme se a responsabilidade desses ativos continuará clara.
                </div>
              ) : null}

              <div className="flex items-center justify-end gap-2 border-t border-border pt-4">
                <Button onClick={() => setEditorOpen(false)} type="button" variant="outline">
                  Cancelar
                </Button>
                <Button disabled={saving} type="submit">
                  {saving ? "Salvando..." : "Salvar"}
                </Button>
              </div>
            </form>
          </div>
        </div>
      ) : null}

      {detailsOpen ? (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-950/35 p-3 sm:p-4 md:p-6" onClick={() => setDetailsOpen(false)}>
          <div className="flex min-h-full items-start justify-center py-2 sm:items-center">
            <div
              className="flex w-full max-w-5xl flex-col overflow-hidden rounded-[28px] border border-border bg-surface shadow-[0_30px_90px_-28px_rgba(15,23,42,0.45)] sm:max-h-[92vh]"
              onClick={(event) => event.stopPropagation()}
            >
              <div className="shrink-0 border-b border-border px-5 py-4 sm:px-6 sm:py-5">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-brand-600">Detalhe do responsável de dados</p>
                    <div className="mt-2 flex flex-wrap items-center gap-2">
                      <h3 className="text-xl font-semibold tracking-tight text-text">
                        {selectedOwner?.name || "Detalhes do responsável de dados"}
                      </h3>
                      {selectedOwner ? statusBadge(selectedOwner.is_active) : null}
                    </div>
                    <p className="mt-1 text-sm text-text-body">
                      Ativos, riscos e ações sob responsabilidade deste owner
                    </p>
                  </div>
                  <Button onClick={() => setDetailsOpen(false)} size="sm" variant="ghost">
                    Fechar
                  </Button>
                </div>
              </div>

              <div className="min-h-0 flex-1 overflow-y-auto px-5 py-5 sm:px-6 sm:py-6">
                <div className="space-y-4">
                  {detailLoading || !selectedOwner ? (
                    <p className="text-sm text-muted">Carregando detalhes...</p>
                  ) : (
                    <>
                      <Card className="border-border bg-surface shadow-[0_8px_24px_rgba(15,23,42,0.04)]">
                        <CardContent className="grid gap-4 py-4 md:grid-cols-2 xl:grid-cols-4">
                          <div>
                            <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-muted">Nome</p>
                            <p className="mt-1 text-sm leading-6 text-text">{selectedOwner.name}</p>
                          </div>
                          <div>
                            <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-muted">E-mail</p>
                            <p className="mt-1 text-sm leading-6 text-text">{selectedOwner.email}</p>
                          </div>
                          <div>
                            <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-muted">Área</p>
                            <p className="mt-1 text-sm leading-6 text-text">{selectedOwner.area || "Não informada"}</p>
                          </div>
                          <div>
                            <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-muted">Status</p>
                            <div className="mt-1">{statusBadge(selectedOwner.is_active)}</div>
                          </div>
                          <div>
                            <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-muted">Criado em</p>
                            <p className="mt-1 text-sm leading-6 text-text">{formatDate(selectedOwner.created_at)}</p>
                          </div>
                          <div>
                            <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-muted">Atualizado em</p>
                            <p className="mt-1 text-sm leading-6 text-text">{formatDate(selectedOwner.updated_at)}</p>
                          </div>
                          <div className="md:col-span-2">
                            <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-muted">Observações</p>
                            <p className="mt-1 text-sm leading-6 text-text">{selectedOwner.description || "Sem observações registradas."}</p>
                          </div>
                        </CardContent>
                      </Card>

                      <div className="grid gap-4 xl:grid-cols-2">
                        <Card className="border-border bg-surface shadow-[0_8px_24px_rgba(15,23,42,0.04)]">
                          <CardHeader>
                            <h4 className="text-sm font-semibold text-text">Resumo dos ativos</h4>
                          </CardHeader>
                          <CardContent className="grid gap-3 sm:grid-cols-2">
                            {[
                              { label: "Total de tabelas", value: selectedOwnerMetrics?.asset_count ?? selectedOwner.tables_count },
                              { label: "Tabelas certificadas", value: selectedOwnerMetrics?.certified_assets ?? (selectedOwnerSummary?.certified || 0) },
                              { label: "Pendentes de certificação", value: selectedOwnerMetrics?.certification_pending_assets ?? (selectedOwnerSummary?.notCertified || 0) },
                              { label: "DQ monitorado", value: selectedOwnerMetrics?.dq_monitored_assets ?? 0 },
                              { label: "Sem DQ", value: selectedOwnerMetrics?.dq_unmonitored_assets ?? 0 },
                              { label: "Com dado pessoal", value: selectedOwnerMetrics?.personal_data_assets ?? (selectedOwnerSummary?.personalData || 0) },
                              { label: "Restritas", value: selectedOwnerMetrics?.restricted_assets ?? (selectedOwnerSummary?.restricted || 0) },
                              { label: "Sem descrição", value: selectedOwnerMetrics?.assets_without_description ?? (selectedOwnerSummary?.withoutDescription || 0) },
                              { label: "Privacidade pendente", value: selectedOwnerMetrics?.privacy_pending_assets ?? 0 },
                              { label: "Sem revisão de privacidade", value: selectedOwnerMetrics?.assets_without_privacy_review ?? (selectedOwnerSummary?.withoutPrivacyReview || 0) },
                              { label: "Sem SLA", value: selectedOwnerMetrics?.assets_without_sla ?? 0 },
                              { label: "Incidentes abertos", value: selectedOwnerMetrics?.assets_with_open_incidents ?? 0 },
                              { label: "Schemas atendidos", value: Object.keys(selectedOwnerSummary?.bySchema || {}).length },
                            ].map((item) => (
                              <div className="rounded-2xl border border-border bg-bg-subtle/70 p-3" key={item.label}>
                                <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-muted">{item.label}</p>
                                <p className="mt-2 text-lg font-semibold text-text">{item.value.toLocaleString("pt-BR")}</p>
                              </div>
                            ))}
                          </CardContent>
                        </Card>

                        <Card className="border-border bg-surface shadow-[0_8px_24px_rgba(15,23,42,0.04)]">
                          <CardHeader>
                            <h4 className="text-sm font-semibold text-text">Pendências e recomendações</h4>
                          </CardHeader>
                          <CardContent className="space-y-3">
                            {selectedOwnerMetrics ? (
                              <div className="rounded-2xl border border-border bg-surface p-4 shadow-sm">
                                <div className="flex flex-wrap items-center gap-2">
                                  {riskBadge(selectedOwnerMetrics.risk_level)}
                                  {selectedOwnerMetrics.main_blocker ? (
                                    <span className="text-sm font-semibold text-text">{selectedOwnerMetrics.main_blocker}</span>
                                  ) : null}
                                  {!selectedOwner.is_active && selectedOwner.tables_count > 0 ? <Badge tone="warning">Owner inativo com ativos</Badge> : null}
                                </div>
                                <p className="mt-2 text-sm leading-6 text-text-body">
                                  {selectedOwnerMetrics.recommended_action || "Revisar os ativos sob responsabilidade deste owner."}
                                </p>
                              </div>
                            ) : null}
                            {[
                              (selectedOwnerMetrics?.assets_without_description ?? selectedOwnerSummary?.withoutDescription)
                                ? "Completar a documentação dos ativos sem descrição."
                                : null,
                              (selectedOwnerMetrics?.assets_without_privacy_review ?? selectedOwnerSummary?.withoutPrivacyReview)
                                ? "Registrar revisão de privacidade nos ativos ainda sem evidência formal."
                                : null,
                              (selectedOwnerMetrics?.certification_pending_assets ?? selectedOwnerSummary?.notCertified ?? 0) > 0
                                ? "Revisar ativos ainda não certificados e identificar os próximos candidatos à certificação."
                                : null,
                              (selectedOwnerMetrics?.dq_unmonitored_assets ?? 0) > 0
                                ? "Configurar monitoramento de Data Quality para os ativos ainda sem cobertura."
                                : null,
                              (selectedOwnerMetrics?.assets_with_open_incidents ?? 0) > 0
                                ? "Tratar incidentes abertos antes de ampliar consumo ou certificação dos ativos."
                                : null,
                              (selectedOwnerMetrics?.assets_without_sla ?? 0) > 0
                                ? "Definir SLA dos ativos operacionais para reduzir ambiguidade de atualização."
                                : null,
                              !selectedOwner.is_active && selectedOwner.tables_count > 0
                                ? "Redistribuir ativos para um responsável ativo antes de manter este owner como inativo."
                                : null,
                            ]
                              .filter((item): item is string => Boolean(item))
                              .map((item) => (
                                <div className="flex items-start gap-2 text-sm text-text-body" key={item}>
                                  <ArrowRight className="mt-0.5 h-4 w-4 text-muted" />
                                  <span>{item}</span>
                                </div>
                              ))}
                            {!((selectedOwnerMetrics?.assets_without_description ?? selectedOwnerSummary?.withoutDescription ?? 0) > 0) &&
                            !((selectedOwnerMetrics?.assets_without_privacy_review ?? selectedOwnerSummary?.withoutPrivacyReview ?? 0) > 0) &&
                            !((selectedOwnerMetrics?.certification_pending_assets ?? selectedOwnerSummary?.notCertified ?? 0) > 0) &&
                            !((selectedOwnerMetrics?.dq_unmonitored_assets ?? 0) > 0) &&
                            !((selectedOwnerMetrics?.assets_with_open_incidents ?? 0) > 0) &&
                            !((selectedOwnerMetrics?.assets_without_sla ?? 0) > 0) &&
                            !(!selectedOwner.is_active && selectedOwner.tables_count > 0) ? (
                              <EmptyState
                                className="shadow-none"
                                title="Sem pendências evidentes"
                                description="Os sinais disponíveis para este owner não mostraram pendências fortes nesta leitura."
                              />
                            ) : null}
                          </CardContent>
                        </Card>
                      </div>

                      <div className="space-y-3">
                        <div className="flex items-center justify-between gap-3">
                          <h4 className="text-sm font-semibold text-text">Ativos sob responsabilidade</h4>
                          <div className="flex items-center gap-2">
                            <Button asChild size="sm" variant="outline">
                              <Link href="/data-quality">Ver Data Quality</Link>
                            </Button>
                            <Button asChild size="sm" variant="outline">
                              <Link href="/incidents/tickets">Ver Incidentes</Link>
                            </Button>
                            <Button asChild size="sm" variant="outline">
                              <Link href="/certification">Ver Certificação</Link>
                            </Button>
                            <Button asChild size="sm" variant="outline">
                              <Link href="/privacy-access">Ver Privacidade</Link>
                            </Button>
                            {canEdit ? (
                              <Button
                                disabled={!selectedOwner || selectedOwner.tables_count === 0}
                                onClick={() =>
                                  selectedOwner &&
                                  selectedOwner.tables_count > 0 &&
                                  openReassignModal({
                                    id: selectedOwner.id,
                                    name: selectedOwner.name,
                                    email: selectedOwner.email,
                                    area: selectedOwner.area,
                                    tables_count: selectedOwner.tables_count,
                                  })
                                }
                                size="sm"
                                title={!selectedOwner || selectedOwner.tables_count === 0 ? "Este owner não possui ativos para reatribuir." : undefined}
                                variant="outline"
                              >
                                Reatribuir ativos
                              </Button>
                            ) : null}
                            {canEdit ? (
                              <Button
                                onClick={() => {
                                  const editableOwner = owners.find((item) => item.id === selectedOwner.id);
                                  if (editableOwner) openEdit(editableOwner);
                                }}
                                size="sm"
                                variant="outline"
                              >
                                <Pencil className="mr-1 h-4 w-4" />
                                Editar
                              </Button>
                            ) : null}
                          </div>
                        </div>
                        {selectedOwner.tables.length === 0 ? (
                          <EmptyState title="Owner sem ativos" description="Este responsável ainda não possui ativos associados. Atribua tabelas no Explorer ou atualize o owner do ativo." />
                        ) : (
                          <div className="grid gap-3">
                            {selectedOwner.tables.map((table) => {
                              const enriched = selectedOwnerTables.find((item) => item.id === table.id);
                              return (
                                <Card className="border-border bg-surface shadow-[0_8px_24px_rgba(15,23,42,0.04)]" key={table.id}>
                                  <CardContent className="py-4">
                                    <div className="flex flex-wrap items-start justify-between gap-3">
                                      <div className="min-w-0">
                                        <p className="break-words text-sm font-semibold leading-5 text-text whitespace-normal">
                                          {table.schema_name}.{table.name}
                                        </p>
                                        <p className="mt-1 flex items-center gap-2 text-xs leading-5 text-muted">
                                          <Table2 className="h-3.5 w-3.5 text-muted" />
                                          {table.datasource_name} • {table.database_name}
                                        </p>
                                        <p className="mt-2 text-sm leading-6 text-text-body">{table.description || "Sem descrição resumida."}</p>
                                      </div>
                                      <div className="flex flex-wrap gap-2">
                                        {certificationBadge(enriched?.certification_status)}
                                        {enriched ? privacyBadge(enriched) : null}
                                      </div>
                                    </div>
                                    <div className="mt-3 grid gap-2 text-xs text-text-body sm:grid-cols-3">
                                      <p>
                                        Revisão privacidade: <span className="font-medium text-text-body">{enriched?.privacy_reviewed_at ? formatDate(enriched.privacy_reviewed_at) : "Pendente"}</span>
                                      </p>
                                      <p>
                                        Escopo de acesso: <span className="font-medium text-text-body">{enriched?.access_scope || "Não informado"}</span>
                                      </p>
                                      <p>
                                        Criticidade cert.: <span className="font-medium text-text-body">{enriched?.certification_criticality || "Não informada"}</span>
                                      </p>
                                    </div>
                                    <div className="mt-4 flex flex-wrap justify-end gap-2">
                                      <Button asChild size="sm" variant="outline">
                                        <Link href={`/explorer?tableId=${table.id}`}>Explorer</Link>
                                      </Button>
                                      <Button asChild size="sm" variant="outline">
                                        <Link href={`/privacy-access?tableId=${table.id}`}>Privacidade</Link>
                                      </Button>
                                    </div>
                                  </CardContent>
                                </Card>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    </>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      ) : null}

      {deleteTarget ? (
        <div className="fixed inset-0 z-[70] bg-black/40 p-3">
          <div className="mx-auto mt-20 w-full max-w-lg rounded-xl bg-surface shadow-xl">
            <div className="border-b border-border px-5 py-4">
              <h3 className="text-lg font-semibold">Remover responsável de dados</h3>
              <p className="mt-1 text-xs leading-5 text-muted">
                Remover este owner pode deixar ativos sem responsável. Isso pode impactar certificação, privacidade, Data Quality, SLA e resposta a incidentes.
              </p>
            </div>
            <div className="space-y-4 px-5 py-4 text-sm text-text-body">
              {deleteLoading || !deleteImpact ? (
                <p className="text-sm text-muted">Carregando impacto da remoção...</p>
              ) : (
                <>
                  <div className="rounded-2xl border border-border bg-bg-subtle p-4">
                    <p className="font-semibold text-text">{deleteImpact.owner.name}</p>
                    <p className="mt-1 text-xs text-muted">
                      {deleteImpact.owner.email}
                      {deleteImpact.owner.area ? ` • ${deleteImpact.owner.area}` : ""}
                    </p>
                    <div className="mt-3 grid grid-cols-2 gap-2 text-xs text-text-body sm:grid-cols-3">
                      <div className="rounded-xl bg-surface px-3 py-2">
                        <span className="block text-[11px] uppercase tracking-[0.16em] text-muted">Ativos</span>
                        <span className="font-semibold text-text">{deleteImpact.impact.asset_count}</span>
                      </div>
                      <div className="rounded-xl bg-surface px-3 py-2">
                        <span className="block text-[11px] uppercase tracking-[0.16em] text-muted">Certificados</span>
                        <span className="font-semibold text-text">{deleteImpact.impact.certified_assets}</span>
                      </div>
                      <div className="rounded-xl bg-surface px-3 py-2">
                        <span className="block text-[11px] uppercase tracking-[0.16em] text-muted">Críticos</span>
                        <span className="font-semibold text-text">{deleteImpact.impact.critical_assets}</span>
                      </div>
                      <div className="rounded-xl bg-surface px-3 py-2">
                        <span className="block text-[11px] uppercase tracking-[0.16em] text-muted">Incidentes</span>
                        <span className="font-semibold text-text">{deleteImpact.impact.open_incidents}</span>
                      </div>
                      <div className="rounded-xl bg-surface px-3 py-2">
                        <span className="block text-[11px] uppercase tracking-[0.16em] text-muted">Privacidade</span>
                        <span className="font-semibold text-text">{deleteImpact.impact.privacy_pending_assets}</span>
                      </div>
                      <div className="rounded-xl bg-surface px-3 py-2">
                        <span className="block text-[11px] uppercase tracking-[0.16em] text-muted">Sem DQ</span>
                        <span className="font-semibold text-text">{deleteImpact.impact.dq_unmonitored_assets}</span>
                      </div>
                    </div>
                  </div>

                  {!deleteImpact.can_delete_without_force ? (
                    <div className="rounded-2xl border border-warning-200 bg-warning-50/80 p-3 text-warning-700">
                      <p className="font-semibold">Atenção operacional</p>
                      <p className="mt-1 leading-6">{deleteImpact.warning_message}</p>
                    </div>
                  ) : (
                    <div className="rounded-2xl border border-success-200 bg-success-50/80 p-3 text-success-700">
                      <p className="font-semibold">Remoção segura</p>
                      <p className="mt-1 leading-6">{deleteImpact.warning_message}</p>
                    </div>
                  )}

                  <div className="rounded-2xl border border-border bg-surface p-4">
                    <p className="text-sm font-semibold text-text">Recomendação</p>
                    <Button
                      className="mt-3"
                      disabled={deleteLoading || deleting || deleteImpact.impact.asset_count === 0}
                      onClick={() =>
                        deleteTarget &&
                        openReassignModal({
                          id: deleteTarget.id,
                          name: deleteTarget.name,
                          email: deleteTarget.email,
                          area: deleteTarget.area,
                          tables_count: deleteTarget.tables_count,
                        })
                      }
                      type="button"
                      variant="outline"
                    >
                      Reatribuir ativos
                    </Button>
                    <p className="mt-2 text-xs leading-5 text-muted">
                      Antes de remover este owner, reatribua os ativos para outro responsável. Isso evita deixar tabelas sem owner e reduz impacto em certificação, privacidade, Data Quality e incidentes.
                    </p>
                  </div>

                  {deleteImpact.sample_assets.length > 0 ? (
                    <div className="space-y-2">
                      <p className="text-xs font-semibold uppercase tracking-[0.16em] text-muted">Amostra de ativos impactados</p>
                      <div className="space-y-2">
                        {deleteImpact.sample_assets.map((asset) => (
                          <div className="rounded-2xl border border-border bg-bg-subtle/80 px-3 py-2" key={asset.id}>
                            <div className="flex items-start justify-between gap-3">
                              <div>
                                <p className="text-sm font-medium text-text">{asset.name}</p>
                                <p className="text-xs text-muted">
                                  {asset.database}
                                  {asset.schema ? ` • ${asset.schema}` : ""}
                                </p>
                              </div>
                              <span className="text-xs text-muted">{asset.risk || "medium"}</span>
                            </div>
                            <p className="mt-1 text-xs leading-5 text-text-body">{asset.reason}</p>
                          </div>
                        ))}
                      </div>
                    </div>
                  ) : null}
                </>
              )}
            </div>
            <div className="flex flex-wrap items-center justify-end gap-2 border-t border-border px-5 py-4">
              <Button onClick={closeDeleteImpact} type="button" variant="ghost">
                Cancelar
              </Button>
              {deleteImpact?.can_delete_without_force ? (
                <Button disabled={deleting || deleteLoading} onClick={() => void confirmDelete(false)} type="button">
                  {deleting ? <Power className="mr-2 h-4 w-4 animate-pulse" /> : <Trash2 className="mr-2 h-4 w-4" />}
                  Remover
                </Button>
              ) : (
                <Button disabled={deleting || deleteLoading} onClick={() => void confirmDelete(true)} type="button">
                  {deleting ? <Power className="mr-2 h-4 w-4 animate-pulse" /> : <Trash2 className="mr-2 h-4 w-4" />}
                  Remover mesmo assim
                </Button>
              )}
            </div>
          </div>
        </div>
      ) : null}

      {reassignOpen && reassignSourceOwner ? (
        <div className="fixed inset-0 z-[80] bg-slate-950/45 p-3">
          <div className="mx-auto mt-10 w-full max-w-6xl rounded-[28px] bg-surface shadow-[0_30px_90px_-28px_rgba(15,23,42,0.45)]">
            <div className="flex items-start justify-between gap-4 border-b border-border px-5 py-4 sm:px-6">
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-brand-600">Reatribuição de ownership</p>
                <h3 className="mt-1 text-xl font-semibold tracking-tight text-text">Reatribuir ativos do owner</h3>
                <p className="mt-1 max-w-3xl text-sm leading-6 text-text-body">
                  Escolha um novo responsável para os ativos associados a este owner. A reatribuição atualiza o ownership das tabelas e preserva a rastreabilidade da mudança.
                </p>
              </div>
              <Button onClick={closeReassignModal} variant="ghost">
                Fechar
              </Button>
            </div>

            <div className="grid gap-6 px-5 py-5 lg:grid-cols-[1.05fr_0.95fr]">
              <div className="space-y-5">
                <div className="rounded-2xl border border-border bg-bg-subtle/80 p-4">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <p className="text-sm font-semibold text-text">{reassignSourceOwner.name}</p>
                      <p className="mt-1 text-xs text-muted">
                        {reassignSourceOwner.email}
                        {reassignSourceOwner.area ? ` • ${reassignSourceOwner.area}` : ""}
                      </p>
                    </div>
                    <Badge tone="neutral">{reassignPreview?.total_assets ?? reassignSourceOwner.tables_count} ativo(s)</Badge>
                  </div>
                  <p className="mt-3 text-sm leading-6 text-text-body">
                    Antes de remover este owner, reatribua os ativos para outro responsável. Isso evita deixar tabelas sem owner e reduz impacto em certificação, privacidade, Data Quality e incidentes.
                  </p>
                </div>

                <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                  {[
                    { label: "Ativos", value: reassignImpact.asset_count },
                    { label: "Certificados", value: reassignImpact.certified_assets },
                    { label: "Críticos", value: reassignImpact.critical_assets },
                    { label: "Dado pessoal", value: reassignImpact.personal_data_assets },
                    { label: "Dado sensível", value: reassignImpact.sensitive_data_assets },
                    { label: "Incidentes abertos", value: reassignImpact.open_incidents },
                    { label: "Certificação pendente", value: reassignImpact.certification_pending_assets },
                    { label: "Privacidade pendente", value: reassignImpact.privacy_pending_assets },
                    { label: "Sem DQ", value: reassignImpact.dq_unmonitored_assets },
                  ].map((item) => (
                    <div className="rounded-2xl border border-border bg-surface p-3 shadow-sm" key={item.label}>
                      <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-muted">{item.label}</p>
                      <p className="mt-2 text-lg font-semibold text-text">{item.value.toLocaleString("pt-BR")}</p>
                    </div>
                  ))}
                </div>

                <div className="rounded-2xl border border-border bg-surface p-4">
                  <div className="grid gap-4 md:grid-cols-2">
                    <div>
                      <label className="mb-1 block text-sm font-medium text-text-body">Owner de destino</label>
                      <Select
                        onChange={(event) => setReassignTargetOwnerId(event.target.value ? Number(event.target.value) : null)}
                        value={reassignTargetOwnerId?.toString() || ""}
                      >
                        <option value="">Selecione um owner</option>
                        {reassignAvailableOwners.map((owner) => (
                          <option key={owner.id} value={owner.id}>
                            {owner.name}
                            {owner.area ? ` • ${owner.area}` : ""}
                          </option>
                        ))}
                      </Select>
                      <p className="mt-1 text-xs leading-5 text-muted">Escolha o novo responsável que assumirá os ativos reatribuídos.</p>
                    </div>
                    <div>
                      <label className="mb-1 block text-sm font-medium text-text-body">Modo</label>
                      <Select
                        onChange={(event) => {
                          const nextMode = event.target.value as "all" | "selected";
                          setReassignMode(nextMode);
                          if (nextMode === "selected" && reassignSelectedAssetIds.length === 0) {
                            setReassignSelectedAssetIds(reassignVisibleAssets.map((asset) => asset.id));
                          }
                        }}
                        value={reassignMode}
                      >
                        <option value="all">Todos os ativos</option>
                        <option value="selected">Selecionar ativos</option>
                      </Select>
                      <p className="mt-1 text-xs leading-5 text-muted">Você pode mover tudo de uma vez ou escolher somente parte dos ativos.</p>
                    </div>
                  </div>

                  <div className="mt-4">
                    <label className="mb-1 block text-sm font-medium text-text-body">Observação</label>
                    <Textarea
                      onChange={(event) => setReassignNote(event.target.value)}
                      placeholder="Reatribuição por mudança de responsabilidade."
                      value={reassignNote}
                    />
                    <p className="mt-1 text-xs leading-5 text-muted">Observação opcional, mas recomendada para rastreabilidade operacional.</p>
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                <div className="rounded-2xl border border-border bg-surface p-4 shadow-sm">
                  <p className="text-sm font-semibold text-text">Impacto da reatribuição</p>
                  <p className="mt-1 text-sm leading-6 text-text-body">
                    {reassignMode === "all"
                      ? "Todos os ativos listados serão transferidos para o owner de destino."
                      : "Somente os ativos marcados serão transferidos para o owner de destino."}
                  </p>
                  <div className="mt-4 grid gap-3 sm:grid-cols-2">
                    {[
                      { label: "Ativos selecionados", value: reassignImpact.asset_count },
                      { label: "Certificados", value: reassignImpact.certified_assets },
                      { label: "Críticos", value: reassignImpact.critical_assets },
                      { label: "Incidentes", value: reassignImpact.open_incidents },
                      { label: "Privacidade pendente", value: reassignImpact.privacy_pending_assets },
                      { label: "Sem DQ", value: reassignImpact.dq_unmonitored_assets },
                    ].map((item) => (
                      <div className="rounded-2xl border border-border bg-bg-subtle/70 p-3" key={item.label}>
                        <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-muted">{item.label}</p>
                        <p className="mt-2 text-lg font-semibold text-text">{item.value.toLocaleString("pt-BR")}</p>
                      </div>
                    ))}
                  </div>
                </div>

                {reassignMode === "selected" ? (
                  <div className="rounded-2xl border border-border bg-surface p-4 shadow-sm">
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <p className="text-sm font-semibold text-text">Selecionar ativos</p>
                        <p className="mt-1 text-sm leading-6 text-text-body">
                          Marque os ativos que devem sair do owner de origem.
                        </p>
                      </div>
                      <Badge tone="neutral">{reassignSelectedAssetIds.length} selecionado(s)</Badge>
                    </div>
                    <div className="mt-4 max-h-[28rem] space-y-2 overflow-y-auto pr-1">
                      {reassignVisibleAssets.length === 0 ? (
                        <EmptyState
                          title="Nenhum ativo disponível"
                          description="Este owner não possui ativos carregados para reatribuição."
                        />
                      ) : (
                        reassignVisibleAssets.map((asset) => {
                          const checked = reassignSelectedAssetIds.includes(asset.id);
                          return (
                            <label className="flex cursor-pointer items-start gap-3 rounded-2xl border border-border bg-bg-subtle/70 p-3" key={asset.id}>
                              <input
                                checked={checked}
                                onChange={(event) => {
                                  setReassignSelectedAssetIds((prev) =>
                                    event.target.checked ? (prev.includes(asset.id) ? prev : [...prev, asset.id]) : prev.filter((id) => id !== asset.id),
                                  );
                                }}
                                type="checkbox"
                              />
                              <div className="min-w-0 flex-1">
                                <div className="flex flex-wrap items-start justify-between gap-2">
                                  <div>
                                    <p className="text-sm font-medium text-text">{asset.schema ? `${asset.schema}.` : ""}{asset.name}</p>
                                    <p className="mt-1 text-xs text-muted">
                                      {asset.database || "Banco não informado"}
                                      {asset.privacy_signal ? ` • ${asset.privacy_signal}` : ""}
                                    </p>
                                  </div>
                                  <Badge tone={asset.open_incidents > 0 ? "warning" : "neutral"}>
                                    {asset.certification_status}
                                  </Badge>
                                </div>
                                <p className="mt-2 text-xs leading-5 text-text-body">{asset.recommended_action}</p>
                              </div>
                            </label>
                          );
                        })
                      )}
                    </div>
                  </div>
                ) : (
                  <div className="rounded-2xl border border-border bg-surface p-4 shadow-sm">
                    <p className="text-sm font-semibold text-text">Todos os ativos</p>
                    <p className="mt-1 text-sm leading-6 text-text-body">
                      A reatribuição vai mover todos os ativos do owner de origem para o owner de destino selecionado.
                    </p>
                  </div>
                )}

                <div className="rounded-2xl border border-border bg-bg-subtle/80 p-4 text-sm leading-6 text-text-body">
                  <p className="font-semibold text-text">Rastreabilidade</p>
                  <p className="mt-1">
                    A mudança atualiza `data_owner_id`, `owner` e `owner_email` nas tabelas associadas e preserva o histórico de alteração.
                  </p>
                </div>
              </div>
            </div>

            <div className="flex flex-wrap items-center justify-end gap-2 border-t border-border px-5 py-4 sm:px-6">
              <Button onClick={closeReassignModal} type="button" variant="ghost">
                Cancelar
              </Button>
              <Button
                disabled={
                  reassignLoading ||
                  reassignSaving ||
                  reassignPreview === null ||
                  reassignTargetOwnerId === null ||
                  reassignTargetOwnerId === reassignSourceOwner.id ||
                  (reassignMode === "selected" && reassignSelectedAssetIds.length === 0)
                }
                onClick={() => void confirmReassign()}
                type="button"
              >
                {reassignSaving ? "Reatribuindo..." : "Reatribuir ativos"}
              </Button>
            </div>
          </div>
        </div>
      ) : null}

      {toast ? (
        <div className="fixed bottom-4 right-4 z-[60] rounded-lg border border-border bg-surface px-4 py-3 text-sm shadow-lg">
          <div className="font-medium">{toast.tone === "success" ? "Sucesso" : "Atenção"}</div>
          <div className="text-text-body">{toast.message}</div>
        </div>
      ) : null}
    </div>
  );
}
