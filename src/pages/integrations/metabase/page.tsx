import { Link } from "@/lib/next-shims";
import { useEffect, useMemo, useState } from "react";
import { ArrowLeft, ExternalLink } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { ContextualJourneyCard } from "@/components/navigation/contextual-journey-card";
import { EmptyState } from "@/components/ui/empty-state";
import { Skeleton } from "@/components/ui/skeleton";
import { ApiError, apiRequest } from "@/lib/client-api";
import { formatCompactNumber } from "@/features/explorer/utils";
import type {
  MetabaseIntegrationArtifact,
  MetabaseIntegrationSummary,
  MetabaseIntegrationSyncRun,
  PageOut,
} from "@/features/integrations/types";
import { formatArtifactTypeLabel, formatDateTime, formatStatusLabel, formatStatusTone } from "@/features/integrations/utils";
import { MetabaseArtifactDrawer } from "@/features/integrations/components/metabase-artifact-drawer";

function normalizeText(value: string | null | undefined) {
  return (value || "").trim().toLowerCase();
}

function shortUrl(value: string | null | undefined) {
  if (!value) return "Sem informação";
  return value.replace(/^https?:\/\//, "").replace(/\/+$/, "");
}

function truncateText(value: string | null | undefined, maxLength = 64) {
  if (!value) return "Sem informação";
  return value.length > maxLength ? `${value.slice(0, maxLength)}...` : value;
}

function formatStatusFallback(value: string | null | undefined, fallback: string) {
  if (value && value.trim()) return value;
  return fallback;
}

function isExternalHref(value: string) {
  return /^https?:\/\//i.test(value);
}

function buildQueryString(params: Record<string, string | number | boolean | null | undefined>) {
  const query = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value === null || value === undefined || value === "") return;
    query.set(key, String(value));
  });
  const serialized = query.toString();
  return serialized ? `?${serialized}` : "";
}

function getRecommendationHref(actionTarget: string | null | undefined, context: Record<string, unknown> | undefined) {
  if (!actionTarget) return "#saude-da-sincronizacao";
  if (actionTarget === "sync-runs") return "#saude-da-sincronizacao";
  if (actionTarget === "artifacts") return "#artefatos-recentes";
  if (actionTarget === "explorer" && typeof context?.table_id === "number") return `/tables/${context.table_id}`;
  if (actionTarget === "explorer") return "/explorer";
  if (actionTarget === "certification") return "/certification";
  if (actionTarget === "lineage") return "/lineage";
  return "#saude-da-sincronizacao";
}

function extractSyncNowConflict(payload: unknown) {
  if (!payload || typeof payload !== "object") return null;
  const root = payload as Record<string, unknown>;
  const detail = root.detail && typeof root.detail === "object" ? (root.detail as Record<string, unknown>) : root;
  const message = typeof detail.message === "string" && detail.message.trim() ? detail.message : null;
  const diagnosticLabel = typeof detail.diagnostic_label === "string" && detail.diagnostic_label.trim() ? detail.diagnostic_label : null;
  const diagnosticDescription = typeof detail.diagnostic_description === "string" && detail.diagnostic_description.trim() ? detail.diagnostic_description : null;
  const runningDurationSeconds =
    typeof detail.running_duration_seconds === "number" && Number.isFinite(detail.running_duration_seconds)
      ? detail.running_duration_seconds
      : null;
  return {
    message,
    forceEligible: Boolean(detail.force_eligible),
    diagnosticLabel,
    diagnosticDescription,
    runningDurationSeconds,
  };
}

type SyncNowDialogMode = "confirm" | "force" | "blocked";

type SyncNowDialogProps = {
  open: boolean;
  mode: SyncNowDialogMode;
  title: string;
  description: string;
  details: string[];
  primaryLabel: string;
  busy?: boolean;
  onCancel: () => void;
  onConfirm: () => void;
};

function MetabaseSyncNowDialog({
  open,
  mode,
  title,
  description,
  details,
  primaryLabel,
  busy = false,
  onCancel,
  onConfirm,
}: SyncNowDialogProps) {
  useEffect(() => {
    if (!open) return;
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        onCancel();
      }
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [open, onCancel]);

  if (!open) return null;

  const toneLabel = mode === "force" ? "warning" : mode === "blocked" ? "neutral" : "accent";
  const primaryVariant = mode === "force" ? "danger" : mode === "blocked" ? "outline" : "default";

  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center bg-slate-950/60 p-4 backdrop-blur-md">
      <button aria-label="Fechar confirmação" className="absolute inset-0 cursor-default" onClick={onCancel} type="button" />
      <div
        aria-labelledby="metabase-sync-now-title"
        aria-modal="true"
        className="relative w-full max-w-2xl overflow-hidden rounded-3xl border border-border/80 bg-surface shadow-card"
        role="dialog"
      >
        <div className="border-b border-border/70 bg-[linear-gradient(135deg,#f8fbff_0%,#ffffff_48%,#f8fafc_100%)] px-6 py-5">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div className="min-w-0">
              <Badge tone={toneLabel}>{mode === "force" ? "Possível execução travada" : mode === "blocked" ? "Sync em andamento" : "Execução manual"}</Badge>
              <h3 className="mt-3 text-xl font-semibold text-text" id="metabase-sync-now-title">
                {title}
              </h3>
              <p className="mt-2 max-w-xl text-sm leading-6 text-text-body">{description}</p>
            </div>
          </div>
        </div>

        <div className="space-y-4 px-6 py-5">
          <div className="grid gap-3 md:grid-cols-2">
            {details.map((detail, index) => (
              <div className="rounded-2xl border border-border/80 bg-bg-subtle/80 px-4 py-3 text-sm leading-6 text-text-body" key={`${mode}-${index}`}>
                {detail}
              </div>
            ))}
          </div>
        </div>

        <div className="border-t border-border/70 bg-bg-subtle/80 px-6 py-4">
          <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <Button onClick={onCancel} variant="outline">
              Cancelar
            </Button>
            <Button disabled={busy} onClick={onConfirm} variant={primaryVariant}>
              {busy ? "Processando..." : primaryLabel}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function MetabaseIntegrationPage() {
  const [summary, setSummary] = useState<MetabaseIntegrationSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [reloadKey, setReloadKey] = useState(0);
  const [tableSearch, setTableSearch] = useState("");
  const [tableScope, setTableScope] = useState<"all" | "direct" | "indirect">("all");
  const [tableMinimumLinks, setTableMinimumLinks] = useState<"all" | "1" | "3" | "5">("all");
  const [artifactSearch, setArtifactSearch] = useState("");
  const [artifactType, setArtifactType] = useState<"all" | "dashboard" | "question" | "collection">("all");
  const [artifactStatus, setArtifactStatus] = useState<"all" | "linked" | "partially_linked" | "unlinked" | "unknown">("all");
  const [artifactSort, setArtifactSort] = useState<"recent" | "views" | "title">("recent");
  const [syncRunsPage, setSyncRunsPage] = useState(1);
  const [syncRunsData, setSyncRunsData] = useState<PageOut<MetabaseIntegrationSyncRun> | null>(null);
  const [syncRunsLoading, setSyncRunsLoading] = useState(false);
  const [syncRunsError, setSyncRunsError] = useState("");
  const [artifactPage, setArtifactPage] = useState(1);
  const [artifactData, setArtifactData] = useState<PageOut<MetabaseIntegrationArtifact> | null>(null);
  const [artifactLoading, setArtifactLoading] = useState(false);
  const [artifactError, setArtifactError] = useState("");
  const [selectedArtifactId, setSelectedArtifactId] = useState<number | null>(null);
  const [syncNowDialogMode, setSyncNowDialogMode] = useState<SyncNowDialogMode | null>(null);
  const [syncNowBusy, setSyncNowBusy] = useState(false);
  const [syncNowNotice, setSyncNowNotice] = useState<{ tone: "success" | "warning" | "danger"; message: string } | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError("");
    setSummary(null);
    setSyncRunsData(null);
    setSyncRunsError("");
    setSyncRunsPage(1);
    setArtifactData(null);
    setArtifactError("");
    setArtifactPage(1);
    void (async () => {
      try {
        const payload = await apiRequest<MetabaseIntegrationSummary>("/v1/integrations/metabase/summary");
        if (cancelled) return;
        setSummary(payload);
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : "Não foi possível carregar o resumo do Metabase.");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [reloadKey]);

  useEffect(() => {
    if (!summary?.instance_id) {
      setSyncRunsData(null);
      return;
    }
    let cancelled = false;
    setSyncRunsLoading(true);
    setSyncRunsError("");
    void (async () => {
      try {
        const payload = await apiRequest<PageOut<MetabaseIntegrationSyncRun>>(
          `/v1/integrations/metabase/sync-runs${buildQueryString({
            instance_id: summary.instance_id,
            page: syncRunsPage,
            page_size: 4,
          })}`,
        );
        if (cancelled) return;
        setSyncRunsData(payload);
      } catch (err) {
        if (!cancelled) {
          setSyncRunsError(err instanceof Error ? err.message : "Não foi possível carregar o histórico completo da sync.");
        }
      } finally {
        if (!cancelled) setSyncRunsLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [reloadKey, summary?.instance_id, syncRunsPage]);

  useEffect(() => {
    if (!summary?.instance_id) {
      setArtifactData(null);
      return;
    }
    let cancelled = false;
    setArtifactLoading(true);
    setArtifactError("");
    void (async () => {
      try {
        const payload = await apiRequest<PageOut<MetabaseIntegrationArtifact>>(
          `/v1/integrations/metabase/artifacts${buildQueryString({
            instance_id: summary.instance_id,
            page: artifactPage,
            page_size: 6,
          })}`,
        );
        if (cancelled) return;
        setArtifactData(payload);
      } catch (err) {
        if (!cancelled) {
          setArtifactError(err instanceof Error ? err.message : "Não foi possível carregar os artefatos completos.");
        }
      } finally {
        if (!cancelled) setArtifactLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [artifactPage, reloadKey, summary?.instance_id]);

  const metabaseUnavailable = (summary?.integration_status === "unavailable" || summary?.integration_status === "misconfigured") && !summary?.available;
  const metabaseStatusLabel = formatStatusLabel(summary?.integration_status);

  const recentSyncRuns = summary?.recent_sync_runs || [];
  const syncHistoryRuns = syncRunsData ? syncRunsData.items : recentSyncRuns;
  const latestSuccessRun = useMemo(
    () => recentSyncRuns.find((item) => normalizeText(item.status) === "success") || null,
    [recentSyncRuns],
  );
  const latestFailureRun = useMemo(
    () => recentSyncRuns.find((item) => normalizeText(item.status) === "failed") || null,
    [recentSyncRuns],
  );
  const runningSyncRun = useMemo(
    () => recentSyncRuns.find((item) => normalizeText(item.status) === "running") || null,
    [recentSyncRuns],
  );
  const syncIsRunning = Boolean(runningSyncRun || normalizeText(summary?.sync_status) === "running");
  const runningSinceMinutes = useMemo(() => {
    const startedAt = runningSyncRun?.started_at;
    if (!startedAt) return null;
    const startedDate = new Date(startedAt);
    if (Number.isNaN(startedDate.getTime())) return null;
    return Math.max(Math.floor((Date.now() - startedDate.getTime()) / 60000), 0);
  }, [runningSyncRun?.started_at]);
  const syncRunningLong = runningSinceMinutes !== null && runningSinceMinutes > 30;
  const hasSuccessfulSync = Boolean(latestSuccessRun || summary?.last_success_at);

  // Auto-refresh while a sync is running so progress/completion shows without a manual reload.
  useEffect(() => {
    if (!syncIsRunning) return;
    const interval = window.setInterval(() => setReloadKey((current) => current + 1), 8000);
    return () => window.clearInterval(interval);
  }, [syncIsRunning]);
  const lastSuccessfulSyncAt = latestSuccessRun?.finished_at || latestSuccessRun?.started_at || summary?.last_success_at;
  const lastFailureAt = latestFailureRun?.finished_at || latestFailureRun?.started_at || summary?.last_failure_at;
  const consecutiveFailures = summary?.consecutive_failures ?? 0;
  const recentErrorType =
    summary?.error_type ||
    latestFailureRun?.error_type ||
    (consecutiveFailures > 0 ? "Não classificado" : null);
  const recentErrorSummary = summary?.error_summary || latestFailureRun?.error_message || summary?.last_sync_message || null;
  const warningReason = useMemo(() => {
    if (!summary) return "Carregando a leitura do Metabase.";
    if (summary.integration_status === "unavailable" || summary.integration_status === "misconfigured") {
      return summary.message || "A instância Metabase não está disponível para leitura.";
    }
    if (syncRunningLong) {
      return "A sincronização está em execução há mais tempo que o esperado. Vale revisar processo, locks e disponibilidade da instância.";
    }
    if (syncIsRunning) {
      return "A sincronização está em andamento e o histórico abaixo ajuda a entender o recorte mais recente.";
    }
    if (consecutiveFailures > 0 && !hasSuccessfulSync) {
      return "Há falhas consecutivas e ainda não existe sucesso registrado no recorte carregado. Verifique URL, credenciais e permissões.";
    }
    if (consecutiveFailures > 0) {
      return "Existem falhas consecutivas registradas. Compare o último sucesso com a última falha para entender o impacto.";
    }
    if (!hasSuccessfulSync) {
      return "Ainda não há sucesso registrado para esta integração.";
    }
    return summary.sync_health_notes?.[0] || summary.message || "A integração respondeu e os objetos sincronizados podem ser analisados abaixo.";
  }, [consecutiveFailures, hasSuccessfulSync, syncIsRunning, syncRunningLong, summary]);
  const overallStatus = useMemo(() => {
    if (!summary) {
      return { label: "Sem leitura", tone: "neutral" as const, message: "Carregando o resumo do Metabase." };
    }
    if (summary.integration_status === "unavailable" || summary.integration_status === "misconfigured") {
      return {
        label: "Desconectado",
        tone: "warning" as const,
        message: warningReason,
      };
    }
    if (syncRunningLong) {
      return {
        label: "Possivelmente travada",
        tone: "warning" as const,
        message: warningReason,
      };
    }
    if (syncIsRunning) {
      return {
        label: "Em execução",
        tone: "accent" as const,
        message: warningReason,
      };
    }
    if (consecutiveFailures >= 20 && !hasSuccessfulSync) {
      return {
        label: "Crítico · sem sucesso registrado",
        tone: "danger" as const,
        message: warningReason,
      };
    }
    if (consecutiveFailures > 0 && !hasSuccessfulSync) {
      return {
        label: "Com alerta · sem sucesso registrado",
        tone: "warning" as const,
        message: warningReason,
      };
    }
    if (consecutiveFailures > 0) {
      return {
        label: "Com alerta",
        tone: "warning" as const,
        message: warningReason,
      };
    }
    if (!hasSuccessfulSync) {
      return {
        label: "Sem sucesso registrado",
        tone: "neutral" as const,
        message: warningReason,
      };
    }
    return {
      label: "Saudável",
      tone: "success" as const,
      message: warningReason,
    };
  }, [hasSuccessfulSync, summary, syncIsRunning, syncRunningLong, warningReason]);
  const operationalCause =
    recentErrorSummary ||
    recentErrorType ||
    summary?.status_message ||
    summary?.message ||
    (consecutiveFailures > 0 ? "Há falhas recorrentes registradas na leitura atual." : "Sem causa classificada no recorte atual.");
  const operationalAction =
    syncRunningLong
      ? "Aguardar a conclusão ou revisar a sync no Metabase se a duração continuar acima do esperado."
      : syncIsRunning
        ? "Acompanhar a sync ativa e revisar o histórico se ela não avançar."
        : summary?.integration_status === "unavailable" || summary?.integration_status === "misconfigured"
          ? "Validar URL, credenciais e disponibilidade da instância."
          : consecutiveFailures > 0 && !hasSuccessfulSync
            ? "Abrir o histórico e revisar a última falha antes de forçar uma nova sync."
            : consecutiveFailures > 0
              ? "Comparar o último sucesso com a falha mais recente para entender o impacto."
              : "Manter monitoramento e revisar a próxima sync quando houver mudança de consumo.";
  const operationalRunbookHref = summary?.instance_base_url || "/integrations/metabase";

  const syncNowDialog = useMemo(() => {
    if (syncNowDialogMode === "force") {
      return {
        title: "Forçar nova sync",
        description: "A execução atual parece acima do limite esperado. Use esta ação apenas se a sync estiver realmente travada.",
        details: [
          "O backend tentará registrar a execução anterior como substituída.",
          "Não serão apagados os registros anteriores do histórico.",
          "A tela será recarregada após a nova sync concluir.",
        ],
        primaryLabel: "Forçar nova sync",
      };
    }
    if (syncNowDialogMode === "blocked") {
      return {
        title: "Sync em andamento",
        description: "Já existe uma sincronização em execução. Aguarde finalizar ou revise uma possível execução travada.",
        details: [
          "A solicitação manual foi bloqueada para evitar duplicidade.",
          "Use a execução forçada apenas quando a atual estiver acima do limite esperado.",
          "O histórico da última sync ajuda a decidir o próximo passo.",
        ],
        primaryLabel: "Entendi",
      };
    }
    return {
      title: "Executar sync agora",
      description: "Uma nova sincronização vai coletar dashboards, questions e collections do Metabase e atualizar os vínculos com o catálogo.",
      details: [
        "A sync manual é segura quando não existe execução ativa.",
        "O resumo e o histórico serão recarregados ao final.",
        "Se houver execução em andamento, o backend vai bloquear ou sugerir força.",
      ],
      primaryLabel: "Executar sync agora",
    };
  }, [syncNowDialogMode]);

  function openSyncNowDialog() {
    if (!summary?.instance_id || syncNowBusy || metabaseUnavailable) return;
    if (syncRunningLong) {
      setSyncNowDialogMode("force");
      return;
    }
    if (syncIsRunning) {
      setSyncNowDialogMode("blocked");
      return;
    }
    setSyncNowDialogMode("confirm");
  }

  async function handleSyncNowConfirm() {
    if (!summary?.instance_id || syncNowBusy || !syncNowDialogMode) return;
    if (syncNowDialogMode === "blocked") {
      setSyncNowDialogMode(null);
      return;
    }

    const force = syncNowDialogMode === "force";
    setSyncNowBusy(true);
    setSyncNowNotice(null);
    try {
      await apiRequest<MetabaseIntegrationSyncRun>("/v1/integrations/metabase/sync-now", {
        method: "POST",
        body: JSON.stringify({
          instance_id: summary.instance_id,
          force,
        }),
      });
      setSyncNowNotice({ tone: "success", message: "Sync manual iniciada." });
      setSyncNowDialogMode(null);
      setReloadKey((current) => current + 1);
      setSyncRunsPage(1);
      setArtifactPage(1);
    } catch (err) {
      if (err instanceof ApiError && err.status === 409) {
        const conflict = extractSyncNowConflict(err.payload);
        if (conflict?.forceEligible && !force) {
          setSyncNowDialogMode("force");
          return;
        }
        setSyncNowNotice({
          tone: "warning",
          message: conflict?.message || "Já existe uma sync em execução.",
        });
        setSyncNowDialogMode("blocked");
        return;
      }
      setSyncNowNotice({
        tone: "danger",
        message: err instanceof Error ? err.message : "Não foi possível executar a sync manual.",
      });
      setSyncNowDialogMode(null);
    } finally {
      setSyncNowBusy(false);
    }
  }

  const topTablesSource = summary?.top_tables_enriched?.length ? summary.top_tables_enriched : summary?.top_tables || [];

  const recommendationCards = useMemo(() => {
    if (summary?.recommendations?.length) {
      return summary.recommendations.slice(0, 5).map((item) => {
        const tone = item.severity === "critical" ? ("danger" as const) : item.severity === "warning" ? ("warning" as const) : ("accent" as const);
        const primaryHref = getRecommendationHref(item.action_target, item.context);
        return {
          title: item.title,
          description: item.description,
          impact: item.reason || item.description,
          tone,
          primary: { label: item.action_label || "Ver detalhes", href: primaryHref },
          secondary:
            item.action_target === "sync-runs" && summary?.instance_base_url
              ? { label: "Abrir Metabase", href: summary.instance_base_url }
              : item.action_target === "artifacts"
                ? { label: "Ver artefatos", href: "#artefatos-recentes" }
                : null,
        };
      });
    }
    return [
      {
        title: "Investigar falhas consecutivas da sync",
        description: "Há tentativas seguidas com erro e isso pode bloquear atualização de dashboards e questions.",
        impact: "O consumo analítico pode ficar desatualizado.",
        primary: { label: "Ver saúde", href: "#saude-da-sincronizacao" },
        secondary: { label: "Abrir Metabase", href: summary?.instance_base_url || "/integrations/metabase" },
        tone: "danger" as const,
      },
      {
        title: "Validar URL e credenciais da instância",
        description: "Se houver falhas sem sucesso recente, a conexão ou as permissões podem estar inconsistentes.",
        impact: "A sync pode permanecer sem conclusão bem-sucedida.",
        primary: { label: "Ver instância", href: "#saude-da-sincronizacao" },
        secondary: { label: "Recarregar", href: "#" },
        tone: "warning" as const,
      },
      {
        title: "Abrir as tabelas mais consumidas",
        description: "Os ativos mais consumidos merecem owner, qualidade, documentação e certificação prioritárias.",
        impact: "Pequenas mudanças podem afetar muitos dashboards.",
        primary: { label: "Ver tabelas", href: "#top-tables" },
        secondary: { label: "Explorer", href: "/explorer" },
        tone: "accent" as const,
      },
      {
        title: "Revisar linhagem e impacto",
        description: "Use linhagem para entender quais artefatos e consumidores são afetados pelas tabelas mais usadas.",
        impact: "Reduz risco de alteração em ativos críticos.",
        primary: { label: "Abrir linhagem", href: "/lineage" },
        secondary: { label: "Ver dashboards", href: "#artefatos-recentes" },
        tone: "success" as const,
      },
      {
        title: "Priorizar qualidade e certificação",
        description: "Se as tabelas têm forte consumo analítico, valide freshness, owners e prontidão.",
        impact: "Aumenta confiança em consumo, BI e relatórios.",
        primary: { label: "Data Quality", href: "/data-quality" },
        secondary: { label: "Certificação", href: "/certification" },
        tone: "neutral" as const,
      },
    ];
  }, [summary?.recommendations, summary?.instance_base_url]);

  const filteredTopTables = useMemo(() => {
    const q = normalizeText(tableSearch);
    const minimumLinks = tableMinimumLinks === "all" ? 0 : Number(tableMinimumLinks);
    return topTablesSource.filter((item) => {
      const matchesSearch =
        !q ||
        [item.table_fqn, item.table_name, item.schema_name, item.datasource_name]
          .map((value) => normalizeText(value))
          .join(" ")
          .includes(q);
      const matchesScope =
        tableScope === "all" ||
        (tableScope === "direct" && item.direct_links_count > 0 && item.indirect_links_count === 0) ||
        (tableScope === "indirect" && item.indirect_links_count > 0);
      const matchesMinimum = tableMinimumLinks === "all" || item.total_links_count >= minimumLinks;
      return matchesSearch && matchesScope && matchesMinimum;
    });
  }, [tableMinimumLinks, tableScope, tableSearch, topTablesSource]);

  const artifactSourceItems = artifactData ? artifactData.items : summary?.recent_artifacts || [];

  const filteredArtifacts = useMemo(() => {
    const q = normalizeText(artifactSearch);
    const filtered = artifactSourceItems.filter((item) => {
      const matchesType = artifactType === "all" || normalizeText(item.object_type) === artifactType;
      const matchesStatus = artifactStatus === "all" || (item.linked_status ?? "unknown") === artifactStatus;
      const matchesSearch =
        !q ||
        [item.title, item.collection_name, item.collection_external_id, item.url, formatArtifactTypeLabel(item.object_type)]
          .map((value) => normalizeText(value))
          .join(" ")
          .includes(q);
      return matchesType && matchesStatus && matchesSearch;
    });
    const sorted = [...filtered];
    if (artifactSort === "views") {
      sorted.sort((a, b) => (b.view_count ?? -1) - (a.view_count ?? -1));
    } else if (artifactSort === "title") {
      sorted.sort((a, b) => a.title.localeCompare(b.title));
    } else {
      sorted.sort((a, b) => {
        const at = new Date(a.remote_updated_at || a.last_seen_at || 0).getTime();
        const bt = new Date(b.remote_updated_at || b.last_seen_at || 0).getTime();
        return bt - at;
      });
    }
    return sorted;
  }, [artifactSearch, artifactType, artifactStatus, artifactSort, artifactSourceItems]);

  if (loading) {
    return (
      <div className="space-y-6 pb-6">
        <Skeleton className="h-36 w-full" />
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {Array.from({ length: 6 }).map((_, index) => (
            <Skeleton className="h-28 w-full" key={index} />
          ))}
        </div>
        <Skeleton className="h-72 w-full" />
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-6">
      <Card className="border-border/80 bg-[linear-gradient(135deg,#ffffff_0%,#f8fafc_55%,#eef6ff_100%)] shadow-card">
        <CardContent className="space-y-4 p-6">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-brand-600">Integrações · Metabase</p>
              <h2 className="mt-2 text-3xl font-semibold tracking-tight text-text">Resumo do consumo analítico</h2>
              <p className="mt-2 max-w-4xl text-sm leading-7 text-text-body">
                Use esta tela para acompanhar a sincronização com o Metabase, entender quais dashboards e questions consomem dados do catálogo e identificar
                tabelas com maior impacto analítico.
              </p>
              <div className="mt-4 rounded-2xl border border-border/80 bg-surface/70 px-4 py-3">
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-brand-600">Importante</p>
                <p className="mt-1 text-sm leading-6 text-text-body">
                  A integração Metabase não mede apenas quantidade de dashboards. Ela ajuda a conectar consumo analítico com tabelas, owners, qualidade,
                  certificação e linhagem.
                </p>
              </div>
            </div>
            <div className="flex flex-col items-start gap-3">
              <div className="flex flex-wrap gap-2">
                <Badge tone={metabaseUnavailable ? "warning" : formatStatusTone(summary?.integration_status)}>{metabaseUnavailable ? "Indisponível" : metabaseStatusLabel}</Badge>
                <Badge tone={overallStatus.tone}>{overallStatus.label}</Badge>
                <Button asChild size="sm" variant="outline">
                  <Link href="/integrations">
                    <ArrowLeft className="mr-2 h-4 w-4" />
                    Voltar
                  </Link>
                </Button>
                <Button asChild size="sm" variant="outline">
                  <Link href="/ops/cockpit">Abrir Ops Cockpit</Link>
                </Button>
                <Button asChild size="sm" variant="outline">
                  <Link href="/explorer">Abrir Explorer</Link>
                </Button>
                <Button asChild size="sm" variant="outline">
                  <Link href="/lineage">Abrir Linhagem</Link>
                </Button>
              </div>
              <div className="flex flex-wrap items-center gap-3">
                <Button
                  disabled={loading || syncNowBusy || !summary?.instance_id || metabaseUnavailable}
                  onClick={openSyncNowDialog}
                  size="sm"
                >
                  Executar sync agora
                </Button>
                <p className="max-w-md text-xs leading-5 text-muted">
                  {syncRunningLong
                    ? "Há uma sync possivelmente travada. Você poderá forçar uma nova execução após confirmação."
                    : syncIsRunning
                      ? "Já existe uma sync em execução. A ação manual será bloqueada até ela finalizar."
                      : "Inicia uma nova coleta de dashboards, questions e collections com validação de estado antes de disparar."}
                </p>
              </div>
            </div>
          </div>

          {summary?.instance_name || summary?.instance_base_url ? (
            <div className="grid gap-3 rounded-2xl border border-border/80 bg-bg-subtle/80 p-4 text-sm text-text-body md:grid-cols-[1.2fr_0.8fr]">
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-brand-600">Instância</p>
                <p className="mt-2 font-semibold text-text">{summary.instance_name || "Metabase"}</p>
                <p className="mt-1">URL técnica: {shortUrl(summary.instance_base_url)}</p>
              </div>
              <div className="flex items-center justify-start gap-2 md:justify-end">
                {summary.instance_base_url ? (
                  <Button asChild size="sm" variant="outline">
                    <a href={summary.instance_base_url} rel="noreferrer" target="_blank">
                      <ExternalLink className="mr-2 h-4 w-4" />
                      Abrir Metabase
                    </a>
                  </Button>
                ) : null}
              </div>
            </div>
          ) : null}

          <div className="grid gap-3 text-sm text-text-body md:grid-cols-3">
            <div className="rounded-2xl border border-border/80 bg-bg-subtle/80 p-4">
              <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-brand-600">Última checagem</p>
              <p className="mt-2 font-medium text-text">{formatDateTime(summary?.checked_at)}</p>
              <p className="mt-1">Status da integração: {formatStatusLabel(summary?.integration_status)}</p>
            </div>
            <div className="rounded-2xl border border-border/80 bg-bg-subtle/80 p-4">
              <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-brand-600">Última sync</p>
              <p className="mt-2 font-medium text-text">{formatDateTime(summary?.last_sync_at)}</p>
              <p className="mt-1">Sync atual: {formatStatusFallback(formatStatusLabel(summary?.sync_status), "Sem informação")}</p>
            </div>
            <div className="rounded-2xl border border-border/80 bg-bg-subtle/80 p-4">
              <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-brand-600">Último sucesso</p>
              <p className="mt-2 font-medium text-text">{formatDateTime(lastSuccessfulSyncAt)}</p>
              <p className="mt-1">Falhas consecutivas: {formatCompactNumber(summary?.consecutive_failures)}</p>
            </div>
          </div>

          <p className="text-sm leading-7 text-text-body">{overallStatus.message}</p>
        </CardContent>
      </Card>

      {error ? (
        <EmptyState
          action={
            <Button onClick={() => setReloadKey((current) => current + 1)} size="sm" variant="outline">
              Tentar novamente
            </Button>
          }
          description={error}
          title="Não foi possível carregar o Metabase"
        />
      ) : null}

      {!error && metabaseUnavailable ? (
        <EmptyState
          action={
            <Button onClick={() => setReloadKey((current) => current + 1)} size="sm" variant="outline">
              Tentar novamente
            </Button>
          }
          description={summary?.message || "Não foi possível alcançar o Metabase neste momento."}
          title="Integração indisponível"
        />
      ) : !error && summary ? (
        <>
          <Card className="border-border/80 bg-surface shadow-card" id="como-usar">
            <CardContent className="space-y-4 p-6">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-brand-600">Como usar esta visão</p>
                  <h3 className="mt-1 text-2xl font-semibold tracking-tight text-text">Leitura guiada da sync e do consumo</h3>
                </div>
                <Badge tone="neutral">Resumo operacional</Badge>
              </div>
              <div className="grid gap-4 xl:grid-cols-2">
                <div className="rounded-2xl border border-border/80 bg-bg-subtle/80 p-4">
                  <p className="text-sm font-semibold text-text">Passos</p>
                  <div className="mt-3 space-y-2 text-sm leading-6 text-text-body">
                    <p>1. Confira a saúde da sincronização.</p>
                    <p>2. Verifique falhas consecutivas, último sucesso e último erro.</p>
                    <p>3. Revise dashboards, questions, collections e vínculos persistidos.</p>
                    <p>4. Veja quais tabelas concentram consumo analítico.</p>
                    <p>5. Abra Explorer, Linhagem, Data Quality ou Certificação quando houver impacto.</p>
                  </div>
                </div>
                <div className="rounded-2xl border border-border/80 bg-bg-subtle/80 p-4">
                  <p className="text-sm font-semibold text-text">Conceitos principais</p>
                  <div className="mt-3 grid gap-2 md:grid-cols-2">
                    <div className="rounded-xl border border-border bg-surface px-3 py-2 text-sm text-text-body">
                      <p className="font-medium text-text">Dashboards</p>
                      <p>Painéis sincronizados do Metabase.</p>
                    </div>
                    <div className="rounded-xl border border-border bg-surface px-3 py-2 text-sm text-text-body">
                      <p className="font-medium text-text">Questions</p>
                      <p>Consultas/perguntas captadas na sync.</p>
                    </div>
                    <div className="rounded-xl border border-border bg-surface px-3 py-2 text-sm text-text-body">
                      <p className="font-medium text-text">Collections</p>
                      <p>Pastas para organizar conteúdos.</p>
                    </div>
                    <div className="rounded-xl border border-border bg-surface px-3 py-2 text-sm text-text-body">
                      <p className="font-medium text-text">Vínculo direto</p>
                      <p>Match direto com tabela ou SQL resolvido.</p>
                    </div>
                    <div className="rounded-xl border border-border bg-surface px-3 py-2 text-sm text-text-body">
                      <p className="font-medium text-text">Vínculo indireto</p>
                      <p>Associação via view, dependência ou lineage.</p>
                    </div>
                    <div className="rounded-xl border border-border bg-surface px-3 py-2 text-sm text-text-body">
                      <p className="font-medium text-text">Tabelas com consumo</p>
                      <p>Tabelas do catálogo usadas por artefatos.</p>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-border/80 bg-surface shadow-card" id="saude-da-sincronizacao">
            <CardContent className="space-y-4 p-6">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-brand-600">Saúde da sincronização</p>
                  <h3 className="mt-1 text-2xl font-semibold tracking-tight text-text">Estado técnico da integração com o Metabase</h3>
                </div>
                <Badge tone={overallStatus.tone}>{overallStatus.label}</Badge>
              </div>
              <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                <Card className="border-border/80 bg-bg-subtle/80 shadow-none">
                  <CardContent className="space-y-2 p-4">
                    <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-brand-600">Status da integração</p>
                    <p className="text-2xl font-semibold text-text">{metabaseStatusLabel}</p>
                    <p className="text-sm leading-6 text-text-body">Indica se a instância Metabase está respondendo e se a sync consegue consultar os objetos.</p>
                  </CardContent>
                </Card>
                <Card className="border-border/80 bg-bg-subtle/80 shadow-none">
                  <CardContent className="space-y-2 p-4">
                    <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-brand-600">Execução atual</p>
                    <p className="text-2xl font-semibold text-text">{syncIsRunning ? "Em execução" : formatStatusLabel(summary.sync_status)}</p>
                    <p className="text-sm leading-6 text-text-body">
                      {syncIsRunning
                        ? syncRunningLong
                          ? `Rodando há ${runningSinceMinutes} minuto(s).`
                          : "A sincronização está em andamento."
                        : "Mostra o estado da última sync observada."}
                    </p>
                  </CardContent>
                </Card>
                <Card className="border-border/80 bg-bg-subtle/80 shadow-none">
                  <CardContent className="space-y-2 p-4">
                    <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-brand-600">Último sucesso</p>
                    <p className="text-2xl font-semibold text-text">{lastSuccessfulSyncAt ? formatDateTime(lastSuccessfulSyncAt) : "Sem sucesso registrado"}</p>
                    <p className="text-sm leading-6 text-text-body">Se estiver vazio, a integração ainda não tem uma sync concluída com sucesso no recorte atual.</p>
                  </CardContent>
                </Card>
                <Card className="border-border/80 bg-bg-subtle/80 shadow-none">
                  <CardContent className="space-y-2 p-4">
                    <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-brand-600">Falhas consecutivas</p>
                    <p className="text-2xl font-semibold text-text">{formatCompactNumber(summary.consecutive_failures)}</p>
                    <p className="text-sm leading-6 text-text-body">Quantidade de tentativas seguidas com erro. Valores altos indicam integração instável ou bloqueada.</p>
                  </CardContent>
                </Card>
                <Card className="border-border/80 bg-bg-subtle/80 shadow-none">
                  <CardContent className="space-y-2 p-4">
                    <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-brand-600">Última falha</p>
                    <p className="text-2xl font-semibold text-text">{lastFailureAt ? formatDateTime(lastFailureAt) : "Sem falha registrada"}</p>
                    <p className="text-sm leading-6 text-text-body">Data/hora da última tentativa com falha.</p>
                  </CardContent>
                </Card>
                <Card className="border-border/80 bg-bg-subtle/80 shadow-none">
                  <CardContent className="space-y-2 p-4">
                    <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-brand-600">Tipo de erro recente</p>
                    <p className="text-2xl font-semibold text-text">{recentErrorType || "Sem erro recente"}</p>
                    <p className="text-sm leading-6 text-text-body">
                      {recentErrorSummary || (summary.consecutive_failures > 0 ? "Existe falha histórica sem classificação técnica detalhada." : "Sem erro recente classificado.")}
                    </p>
                  </CardContent>
                </Card>
              </div>
              {summary.consecutive_failures > 0 && !hasSuccessfulSync ? (
                <div className="rounded-2xl border border-warning-200 bg-warning-50 px-4 py-3 text-sm text-warning-800">
                  Existem falhas consecutivas registradas, mas não há último sucesso confirmado no recorte atual. Verifique credenciais, URL, permissões e o
                  estado da instância Metabase.
                </div>
              ) : null}
              <div className="grid gap-3 xl:grid-cols-[1.2fr_0.8fr]">
                <div className="rounded-2xl border border-border/80 bg-bg-subtle/80 p-4">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <p className="text-xs font-semibold uppercase tracking-[0.16em] text-muted">Histórico de sync</p>
                    <div className="flex flex-wrap items-center gap-2">
                      {syncRunsLoading ? <Badge tone="neutral">Carregando</Badge> : null}
                      {syncRunsData?.total_pages ? <Badge tone="neutral">Página {syncRunsData.page} de {syncRunsData.total_pages}</Badge> : null}
                      {syncRunsData?.total_pages && syncRunsData.total_pages > 1 ? (
                        <>
                          <Button
                            disabled={syncRunsPage <= 1}
                            onClick={() => setSyncRunsPage((current) => Math.max(current - 1, 1))}
                            size="sm"
                            variant="outline"
                          >
                            Anterior
                          </Button>
                          <Button
                            disabled={!syncRunsData.has_more}
                            onClick={() => setSyncRunsPage((current) => current + 1)}
                            size="sm"
                            variant="outline"
                          >
                            Próxima
                          </Button>
                        </>
                      ) : null}
                    </div>
                  </div>
                  <div className="mt-3 space-y-3">
                    {syncHistoryRuns.length > 0 ? (
                      syncHistoryRuns.map((run) => (
                        <div className="rounded-xl border border-border bg-surface p-3" key={run.id}>
                          <div className="flex flex-wrap items-start justify-between gap-2">
                            <div>
                              <p className="font-medium text-text">{formatStatusLabel(run.status)}</p>
                              <p className="text-sm text-muted">
                                {formatDateTime(run.started_at)} {run.finished_at ? `· ${formatDateTime(run.finished_at)}` : ""}
                              </p>
                            </div>
                            <Badge tone={formatStatusTone(run.status)}>{formatStatusLabel(run.status)}</Badge>
                          </div>
                          <p className="mt-2 text-sm text-text-body">
                            Dashboards {formatCompactNumber(run.dashboards_count)} · Questions {formatCompactNumber(run.questions_count)} · Collections{" "}
                            {formatCompactNumber(run.collections_count)} · Links {formatCompactNumber(run.links_count)}
                            {typeof run.artifacts_processed === "number" ? ` · Artefatos ${formatCompactNumber(run.artifacts_processed)}` : ""}
                            {typeof run.links_created === "number" ? ` · Criados ${formatCompactNumber(run.links_created)}` : ""}
                          </p>
                          {run.error_message ? <p className="mt-1 text-sm text-text-body">{truncateText(run.error_message, 140)}</p> : null}
                          {run.error_type ? <p className="mt-1 text-xs uppercase tracking-[0.16em] text-muted">Tipo de erro: {run.error_type}</p> : null}
                        </div>
                      ))
                    ) : (
                      <EmptyState
                        description="Ainda não há syncs recentes registradas para esta instância."
                        title="Sem histórico recente"
                      />
                    )}
                  </div>
                  {syncRunsError && !syncRunsData ? <p className="mt-3 text-xs text-muted">{syncRunsError}</p> : null}
                </div>
                <div className="rounded-2xl border border-border/80 bg-bg-subtle/80 p-4">
                  <p className="text-xs font-semibold uppercase tracking-[0.16em] text-muted">Leitura rápida</p>
                  <div className="mt-3 space-y-2 text-sm leading-6 text-text-body">
                    {summary.sync_health_notes?.length ? summary.sync_health_notes.slice(0, 3).map((note) => <p key={note}>• {note}</p>) : null}
                    <p>• Integração saudável: a instância responde e a sync conclui sem erros recorrentes.</p>
                    <p>• Com alerta: há falhas consecutivas, ausência de sucesso ou erro não classificado.</p>
                    <p>• Em execução: a sync está ativa no momento e os dados abaixo ajudam a investigar o estado recente.</p>
                    <p>• Possivelmente travada: a execução permanece em aberto por tempo acima do esperado.</p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-border/80 bg-surface shadow-card" id="atencao-imediata">
            <CardContent className="space-y-4 p-6">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-brand-600">Atenção imediata</p>
                  <h3 className="mt-1 text-2xl font-semibold tracking-tight text-text">Sinais que exigem revisão da integração ou do consumo analítico</h3>
                </div>
                <Badge tone={overallStatus.tone}>{overallStatus.label}</Badge>
              </div>
              <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                <div className="rounded-2xl border border-border/80 bg-bg-subtle/80 p-4">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-brand-600">Falhas consecutivas</p>
                  <p className="mt-2 text-3xl font-semibold text-text">{formatCompactNumber(summary.consecutive_failures)}</p>
                  <p className="mt-2 text-sm leading-6 text-text-body">A sync falhou repetidamente.</p>
                  <Button asChild className="mt-3" size="sm" variant="outline">
                    <Link href="#saude-da-sincronizacao">Ver saúde</Link>
                  </Button>
                </div>
                <div className="rounded-2xl border border-border/80 bg-bg-subtle/80 p-4">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-brand-600">Último sucesso</p>
                  <p className="mt-2 text-3xl font-semibold text-text">{lastSuccessfulSyncAt ? formatDateTime(lastSuccessfulSyncAt) : "Sem sucesso"}</p>
                  <p className="mt-2 text-sm leading-6 text-text-body">Se estiver vazio, a integração ainda não registrou uma sync bem-sucedida.</p>
                  <Button asChild className="mt-3" size="sm" variant="outline">
                    <Link href="#saude-da-sincronizacao">Ver histórico</Link>
                  </Button>
                </div>
                <div className="rounded-2xl border border-border/80 bg-bg-subtle/80 p-4">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-brand-600">Tipo de erro recente</p>
                  <p className="mt-2 text-3xl font-semibold text-text">{recentErrorType || "Sem erro"}</p>
                  <p className="mt-2 text-sm leading-6 text-text-body">Se não houver classificação, a falha existe, mas o rótulo técnico não foi exposto.</p>
                  <Button asChild className="mt-3" size="sm" variant="outline">
                    <Link href="#saude-da-sincronizacao">Ver erro</Link>
                  </Button>
                </div>
                <div className="rounded-2xl border border-border/80 bg-bg-subtle/80 p-4">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-brand-600">Tabelas com consumo</p>
                  <p className="mt-2 text-3xl font-semibold text-text">{formatCompactNumber(summary.tables_with_consumption_count)}</p>
                  <p className="mt-2 text-sm leading-6 text-text-body">Ativos do catálogo com maior impacto analítico.</p>
                  <Button asChild className="mt-3" size="sm" variant="outline">
                    <Link href="#top-tables">Ver tabelas</Link>
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-border/80 bg-surface shadow-card" id="proximas-acoes">
            <CardContent className="space-y-4 p-6">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-brand-600">Próximas ações recomendadas</p>
                  <h3 className="mt-1 text-2xl font-semibold tracking-tight text-text">Ações sugeridas com base na sync e no consumo analítico</h3>
                </div>
                <Badge tone="neutral">Até 5 ações principais</Badge>
              </div>
              <div className="grid gap-4 lg:grid-cols-2">
                {recommendationCards.map((action) => (
                    <div className="rounded-2xl border border-border/80 bg-bg-subtle/80 p-4" key={action.title}>
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-brand-600">{action.tone === "danger" ? "Crítico" : action.tone === "warning" ? "Atenção" : "Recomendado"}</p>
                          <p className="mt-2 text-lg font-semibold text-text">{action.title}</p>
                        </div>
                        <Badge tone={action.tone}>{action.tone === "danger" ? "Risco alto" : action.tone === "warning" ? "Atenção" : "Prioridade"}</Badge>
                      </div>
                      <p className="mt-3 text-sm leading-6 text-text-body">{action.description}</p>
                      <p className="mt-2 text-sm leading-6 text-text-body">Impacto: {action.impact}</p>
                      <div className="mt-4 flex flex-wrap gap-2">
                        {action.primary.href === "#" ? (
                          <Button onClick={() => setReloadKey((current) => current + 1)} size="sm" variant="outline">
                            {action.primary.label}
                          </Button>
                        ) : isExternalHref(action.primary.href) ? (
                          <Button asChild size="sm" variant="outline">
                            <a href={action.primary.href} rel="noreferrer" target="_blank">
                              {action.primary.label}
                            </a>
                          </Button>
                        ) : (
                          <Button asChild size="sm" variant="outline">
                            <Link href={action.primary.href}>{action.primary.label}</Link>
                          </Button>
                        )}
                        {action.secondary ? (
                          action.secondary.href === "#" ? (
                            <Button onClick={() => setReloadKey((current) => current + 1)} size="sm" variant="ghost">
                              {action.secondary.label}
                            </Button>
                          ) : isExternalHref(action.secondary.href) ? (
                            <Button asChild size="sm" variant="ghost">
                              <a href={action.secondary.href} rel="noreferrer" target="_blank">
                                {action.secondary.label}
                              </a>
                            </Button>
                          ) : (
                            <Button asChild size="sm" variant="ghost">
                              <Link href={action.secondary.href}>{action.secondary.label}</Link>
                            </Button>
                          )
                        ) : null}
                      </div>
                    </div>
                  ))}
              </div>
            </CardContent>
          </Card>

          <Card className="border-border/80 bg-surface shadow-card" id="consumo-analitico">
            <CardContent className="space-y-4 p-6">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-brand-600">Consumo analítico</p>
                  <h3 className="mt-1 text-2xl font-semibold tracking-tight text-text">Cobertura sincronizada e vínculos persistidos</h3>
                </div>
                <Badge tone="neutral">Tabelas, dashboards e perguntas</Badge>
              </div>
              <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                <Card className="border-border/80 bg-bg-subtle/80 shadow-none">
                  <CardContent className="space-y-2 p-4">
                    <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-brand-600">Dashboards</p>
                    <p className="text-3xl font-semibold text-text">{formatCompactNumber(summary.dashboards_count)}</p>
                    <p className="text-sm text-text-body">Painéis sincronizados do Metabase.</p>
                  </CardContent>
                </Card>
                <Card className="border-border/80 bg-bg-subtle/80 shadow-none">
                  <CardContent className="space-y-2 p-4">
                    <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-brand-600">Questions</p>
                    <p className="text-3xl font-semibold text-text">{formatCompactNumber(summary.questions_count)}</p>
                    <p className="text-sm text-text-body">Consultas/perguntas captadas na sync.</p>
                  </CardContent>
                </Card>
                <Card className="border-border/80 bg-bg-subtle/80 shadow-none">
                  <CardContent className="space-y-2 p-4">
                    <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-brand-600">Collections</p>
                    <p className="text-3xl font-semibold text-text">{formatCompactNumber(summary.collections_count)}</p>
                    <p className="text-sm text-text-body">Pastas/coleções para organizar conteúdos.</p>
                  </CardContent>
                </Card>
                <Card className="border-border/80 bg-bg-subtle/80 shadow-none">
                  <CardContent className="space-y-2 p-4">
                    <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-brand-600">Vínculos diretos</p>
                    <p className="text-3xl font-semibold text-text">{formatCompactNumber(summary.direct_links_count)}</p>
                    <p className="text-sm text-text-body">Match direto com tabela ou SQL resolvido.</p>
                  </CardContent>
                </Card>
                <Card className="border-border/80 bg-bg-subtle/80 shadow-none">
                  <CardContent className="space-y-2 p-4">
                    <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-brand-600">Vínculos indiretos</p>
                    <p className="text-3xl font-semibold text-text">{formatCompactNumber(summary.indirect_links_count)}</p>
                    <p className="text-sm text-text-body">Match por view, dependência ou lineage.</p>
                  </CardContent>
                </Card>
                <Card className="border-border/80 bg-bg-subtle/80 shadow-none">
                  <CardContent className="space-y-2 p-4">
                    <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-brand-600">Tabelas com consumo</p>
                    <p className="text-3xl font-semibold text-text">{formatCompactNumber(summary.tables_with_consumption_count)}</p>
                    <p className="text-sm text-text-body">Tabelas distintas usadas por dashboards ou questions.</p>
                  </CardContent>
                </Card>
              </div>
              <p className="text-sm leading-7 text-text-body">
                A cobertura abaixo mostra onde o consumo analítico está concentrado. Quanto maior o uso, maior a prioridade para owner, qualidade,
                documentação e certificação.
              </p>
              {summary.link_coverage ? (
                <div className="rounded-2xl border border-border/80 bg-bg-subtle/80 p-4 text-sm text-text-body">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-brand-600">Cobertura de vínculo</p>
                  <p className="mt-2">
                    {formatCompactNumber(summary.link_coverage.linked_artifacts)} vinculados · {formatCompactNumber(summary.link_coverage.partially_linked_artifacts)}{" "}
                    parciais · {formatCompactNumber(summary.link_coverage.unlinked_artifacts)} sem vínculo · {summary.link_coverage.coverage_percent}% de cobertura
                  </p>
                </div>
              ) : null}
            </CardContent>
          </Card>

          <div className="grid gap-4 xl:grid-cols-2">
            <Card className="border-border/80 bg-surface shadow-card" id="top-tables">
              <CardContent className="space-y-4 p-6">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-brand-600">Top tabelas</p>
                    <h3 className="mt-1 text-2xl font-semibold tracking-tight text-text">Mais consumidas</h3>
                  </div>
                  <Badge tone="neutral">Total: {formatCompactNumber(summary.total_links_count)}</Badge>
                </div>
                <div className="grid gap-3 md:grid-cols-2">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.16em] text-muted">Buscar tabela</p>
                    <input
                      className="mt-2 h-10 w-full rounded-xl border border-border/70 bg-surface px-3 text-sm text-text-body outline-none transition focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20"
                      onChange={(event) => setTableSearch(event.target.value)}
                      placeholder="Buscar por tabela, schema ou fonte"
                      value={tableSearch}
                    />
                  </div>
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.16em] text-muted">Cobertura</p>
                    <select
                      className="mt-2 h-10 w-full rounded-xl border border-border/70 bg-surface px-3 text-sm text-text-body outline-none transition focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20"
                      onChange={(event) => setTableScope(event.target.value as typeof tableScope)}
                      value={tableScope}
                    >
                      <option value="all">Todas</option>
                      <option value="direct">Somente diretas</option>
                      <option value="indirect">Somente indiretas</option>
                    </select>
                  </div>
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.16em] text-muted">Mínimo de vínculos</p>
                    <select
                      className="mt-2 h-10 w-full rounded-xl border border-border/70 bg-surface px-3 text-sm text-text-body outline-none transition focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20"
                      onChange={(event) => setTableMinimumLinks(event.target.value as typeof tableMinimumLinks)}
                      value={tableMinimumLinks}
                    >
                      <option value="all">Todos</option>
                      <option value="1">1 ou mais</option>
                      <option value="3">3 ou mais</option>
                      <option value="5">5 ou mais</option>
                    </select>
                  </div>
                  <div className="flex items-end">
                    <Button
                      onClick={() => {
                        setTableSearch("");
                        setTableScope("all");
                        setTableMinimumLinks("all");
                      }}
                      size="sm"
                      variant="ghost"
                    >
                      Limpar filtros
                    </Button>
                  </div>
                </div>
                {filteredTopTables.length > 0 ? (
                  <div className="space-y-3">
                    {filteredTopTables.map((item) => (
                      <div className="rounded-2xl border border-border/80 bg-bg-subtle/80 p-4" key={item.table_id}>
                        <div className="flex flex-wrap items-start justify-between gap-3">
                          <div>
                            <p className="font-semibold text-text">{item.table_fqn}</p>
                            <p className="text-sm text-muted">
                              {item.datasource_name} · {item.schema_name}
                            </p>
                          </div>
                          <Badge tone="neutral">{formatCompactNumber(item.total_links_count)} vínculo(s)</Badge>
                        </div>
                        <div className="mt-3 flex flex-wrap gap-2">
                          <Badge tone="success">Diretos {formatCompactNumber(item.direct_links_count)}</Badge>
                          <Badge tone="warning">Indiretos {formatCompactNumber(item.indirect_links_count)}</Badge>
                          {item.owner ? <Badge tone="neutral">Owner {item.owner}</Badge> : null}
                          {item.certification_status ? <Badge tone="neutral">Certificação {item.certification_status}</Badge> : null}
                          {typeof item.dq_score === "number" ? <Badge tone="accent">DQ {item.dq_score.toFixed(1)}</Badge> : null}
                          {item.privacy_status ? <Badge tone="neutral">Privacidade {item.privacy_status}</Badge> : null}
                          {typeof item.incident_count === "number" ? <Badge tone="warning">Incidentes {formatCompactNumber(item.incident_count)}</Badge> : null}
                          {typeof item.linked_dashboards === "number" ? <Badge tone="success">Dashboards {formatCompactNumber(item.linked_dashboards)}</Badge> : null}
                          {typeof item.linked_questions === "number" ? <Badge tone="accent">Questions {formatCompactNumber(item.linked_questions)}</Badge> : null}
                        </div>
                        <div className="mt-3 flex flex-wrap gap-2">
                          <Button asChild size="sm" variant="outline">
                            <Link href={`/tables/${item.table_id}`}>Abrir no Explorer</Link>
                          </Button>
                          <Button asChild size="sm" variant="ghost">
                            <Link href="/lineage">Ver linhagem</Link>
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <EmptyState
                    description="Não há tabelas que correspondam aos filtros atuais."
                    title="Sem tabelas consumidas"
                  />
                )}
              </CardContent>
            </Card>

            {summary?.top_dashboards?.length ? (
              <Card className="border-border/80 bg-surface shadow-card" id="top-dashboards">
                <CardContent className="space-y-4 p-6">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.18em] text-brand-600">Popularidade</p>
                    <h3 className="mt-1 text-lg font-semibold text-text">Top dashboards mais vistos</h3>
                    <p className="mt-1 text-sm text-muted">Ranking por número de visualizações no Metabase.</p>
                  </div>
                  <ol className="space-y-2">
                    {summary.top_dashboards.map((item, index) => (
                      <li
                        className="flex flex-wrap items-center gap-3 rounded-2xl border border-border/80 bg-bg-subtle/70 px-4 py-3"
                        key={`top-${item.object_id}`}
                      >
                        <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-slate-900 text-xs font-semibold text-white">
                          {index + 1}
                        </span>
                        <div className="min-w-0 flex-1">
                          <button
                            type="button"
                            onClick={() => setSelectedArtifactId(item.object_id)}
                            className="truncate text-left text-sm font-semibold text-text hover:text-info-700 hover:underline"
                          >
                            {item.title}
                          </button>
                          <p className="truncate text-xs text-muted">
                            {item.collection_name || item.collection_external_id || "Sem coleção"}
                            {item.creator_name ? ` · por ${item.creator_name}` : ""}
                          </p>
                        </div>
                        <Badge tone="accent">{formatCompactNumber(item.view_count || 0)} views</Badge>
                        {item.url ? (
                          <Button asChild size="sm" variant="ghost">
                            <Link href={item.url} rel="noreferrer" target="_blank">
                              <ExternalLink className="h-4 w-4" />
                            </Link>
                          </Button>
                        ) : null}
                      </li>
                    ))}
                  </ol>
                </CardContent>
              </Card>
            ) : null}

            <Card className="border-border/80 bg-surface shadow-card" id="artefatos-recentes">
              <CardContent className="space-y-4 p-6">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-brand-600">Artefatos recentes</p>
                    <h3 className="mt-1 text-2xl font-semibold tracking-tight text-text">Últimos objetos sincronizados</h3>
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    {artifactLoading ? <Badge tone="neutral">Carregando</Badge> : null}
                    {artifactData?.total_pages ? <Badge tone="neutral">Página {artifactData.page} de {artifactData.total_pages}</Badge> : null}
                    <Badge tone="neutral">{formatCompactNumber(artifactData?.total ?? filteredArtifacts.length)} artefato(s)</Badge>
                  </div>
                </div>
                <div className="grid gap-3 md:grid-cols-2">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.16em] text-muted">Buscar artefato</p>
                    <input
                      className="mt-2 h-10 w-full rounded-xl border border-border/70 bg-surface px-3 text-sm text-text-body outline-none transition focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20"
                      onChange={(event) => setArtifactSearch(event.target.value)}
                      placeholder="Buscar por nome, coleção ou URL"
                      value={artifactSearch}
                    />
                  </div>
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.16em] text-muted">Tipo</p>
                    <select
                      className="mt-2 h-10 w-full rounded-xl border border-border/70 bg-surface px-3 text-sm text-text-body outline-none transition focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20"
                      onChange={(event) => setArtifactType(event.target.value as typeof artifactType)}
                      value={artifactType}
                    >
                      <option value="all">Todos</option>
                      <option value="dashboard">Dashboards</option>
                      <option value="question">Questions</option>
                      <option value="collection">Collections</option>
                    </select>
                  </div>
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.16em] text-muted">Vínculo</p>
                    <select
                      className="mt-2 h-10 w-full rounded-xl border border-border/70 bg-surface px-3 text-sm text-text-body outline-none transition focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20"
                      onChange={(event) => setArtifactStatus(event.target.value as typeof artifactStatus)}
                      value={artifactStatus}
                    >
                      <option value="all">Todos</option>
                      <option value="linked">Vinculado</option>
                      <option value="partially_linked">Parcial</option>
                      <option value="unlinked">Sem vínculo</option>
                      <option value="unknown">Não avaliado</option>
                    </select>
                  </div>
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.16em] text-muted">Ordenar</p>
                    <select
                      className="mt-2 h-10 w-full rounded-xl border border-border/70 bg-surface px-3 text-sm text-text-body outline-none transition focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20"
                      onChange={(event) => setArtifactSort(event.target.value as typeof artifactSort)}
                      value={artifactSort}
                    >
                      <option value="recent">Mais recentes</option>
                      <option value="views">Mais visualizados</option>
                      <option value="title">Título (A–Z)</option>
                    </select>
                  </div>
                </div>
                <div className="flex flex-wrap gap-2">
                  {[
                    ["all", "Tudo"],
                    ["dashboard", "Dashboards"],
                    ["question", "Questions"],
                    ["collection", "Collections"],
                  ].map(([value, label]) => (
                    <Button
                      className={artifactType === value ? "border-brand-700 bg-brand-700 text-white hover:bg-brand-700" : ""}
                      key={value}
                      onClick={() => setArtifactType(value as typeof artifactType)}
                      size="sm"
                      variant={artifactType === value ? "default" : "outline"}
                    >
                      {label}
                    </Button>
                  ))}
                  <Button
                    onClick={() => {
                      setArtifactSearch("");
                      setArtifactType("all");
                      setArtifactStatus("all");
                      setArtifactSort("recent");
                      setArtifactPage(1);
                    }}
                    size="sm"
                    variant="ghost"
                  >
                    Limpar filtros
                  </Button>
                </div>
                {filteredArtifacts.length > 0 ? (
                  <div className="space-y-3">
                    {filteredArtifacts.map((item) => (
                      <div className="rounded-2xl border border-border/80 bg-bg-subtle/80 p-4" key={`${item.object_type}-${item.object_id}`}>
                        <div className="flex flex-wrap items-start justify-between gap-3">
                          <div className="min-w-0">
                            <button
                              type="button"
                              onClick={() => setSelectedArtifactId(item.object_id)}
                              className="text-left font-semibold text-text hover:text-info-700 hover:underline"
                            >
                              {formatArtifactTypeLabel(item.object_type)} · {item.title}
                            </button>
                            <p className="text-sm text-muted">{item.collection_name || item.collection_external_id || "Sem coleção"}</p>
                          </div>
                          <div className="flex flex-wrap items-center gap-2">
                            {item.archived ? <Badge tone="warning">Arquivado</Badge> : null}
                            <Badge tone={item.linked_status === "linked" ? "success" : item.linked_status === "partially_linked" ? "warning" : "neutral"}>
                              {item.linked_status === "linked"
                                ? "Vinculado"
                                : item.linked_status === "partially_linked"
                                  ? "Parcial"
                                  : item.linked_status === "unlinked"
                                    ? "Sem vínculo"
                                    : "Não avaliado"}
                            </Badge>
                          </div>
                        </div>
                        {item.description ? (
                          <p className="mt-3 text-sm leading-7 text-text-body">{truncateText(item.description, 140)}</p>
                        ) : null}
                        {item.referenced_tables?.length ? (
                          <div className="mt-3">
                            <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-muted">
                              Tabelas usadas ({item.referenced_tables.length})
                            </p>
                            <div className="mt-1.5 flex flex-wrap gap-1.5">
                              {item.referenced_tables.slice(0, 8).map((tbl) =>
                                tbl.table_id ? (
                                  <Link
                                    key={tbl.full_name}
                                    href={`/tables/${tbl.table_id}`}
                                    className="inline-flex items-center gap-1 rounded-md border border-success-200 bg-success-50 px-2 py-0.5 font-mono text-[11px] text-success-700 hover:bg-success-100"
                                    title={`No catálogo: ${tbl.catalog_full_name ?? tbl.full_name}`}
                                  >
                                    {tbl.full_name}
                                  </Link>
                                ) : (
                                  <span
                                    key={tbl.full_name}
                                    className="inline-flex items-center gap-1 rounded-md border border-border bg-surface px-2 py-0.5 font-mono text-[11px] text-text-body"
                                    title={tbl.resolved ? "Tabela referenciada (sem correspondência no catálogo)" : "Referência não resolvida (id interno do Metabase)"}
                                  >
                                    {tbl.full_name}
                                  </span>
                                ),
                              )}
                              {item.referenced_tables.length > 8 ? (
                                <span className="inline-flex items-center rounded-md px-1.5 py-0.5 text-[11px] text-muted">
                                  +{item.referenced_tables.length - 8}
                                </span>
                              ) : null}
                            </div>
                          </div>
                        ) : null}
                        <div className="mt-3 flex flex-wrap gap-2">
                          <Badge tone="neutral">Diretos {formatCompactNumber(item.direct_links || 0)}</Badge>
                          <Badge tone="neutral">Indiretos {formatCompactNumber(item.indirect_links || 0)}</Badge>
                          {item.linked_tables?.length ? <Badge tone="accent">{formatCompactNumber(item.linked_tables.length)} tabela(s)</Badge> : null}
                          {item.unresolved_references?.length ? <Badge tone="warning">{formatCompactNumber(item.unresolved_references.length)} ref. sem vínculo</Badge> : null}
                          {typeof item.view_count === "number" ? <Badge tone="accent">{formatCompactNumber(item.view_count)} views</Badge> : null}
                          {item.creator_name ? <Badge tone="neutral">por {item.creator_name}</Badge> : null}
                          {item.remote_updated_at ? <Badge tone="neutral">Editado {formatDateTime(item.remote_updated_at)}</Badge> : null}
                        </div>
                        <div className="mt-3 flex flex-wrap gap-2">
                          <Button size="sm" variant="outline" onClick={() => setSelectedArtifactId(item.object_id)}>
                            Ver detalhes
                          </Button>
                          {item.url ? (
                            <Button asChild size="sm" variant="ghost">
                              <Link href={item.url} rel="noreferrer" target="_blank">
                                <ExternalLink className="mr-2 h-4 w-4" />
                                Abrir no Metabase
                              </Link>
                            </Button>
                          ) : null}
                          {item.linked_tables?.length ? (
                            <Button asChild size="sm" variant="ghost">
                              <Link href={`/tables/${item.linked_tables[0].table_id}`}>Abrir tabela vinculada</Link>
                            </Button>
                          ) : null}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <EmptyState description="Nenhum artefato corresponde aos filtros atuais." title="Sem artefatos recentes" />
                )}
                <div className="flex flex-wrap justify-center gap-2">
                  {artifactData?.total_pages && artifactData.total_pages > 1 ? (
                    <>
                      <Button
                        disabled={artifactPage <= 1}
                        onClick={() => setArtifactPage((current) => Math.max(current - 1, 1))}
                        size="sm"
                        variant="outline"
                      >
                        Anterior
                      </Button>
                      <Button
                        disabled={!artifactData.has_more}
                        onClick={() => setArtifactPage((current) => current + 1)}
                        size="sm"
                        variant="outline"
                      >
                        Próxima
                      </Button>
                    </>
                  ) : null}
                </div>
                {artifactError && !artifactData ? <p className="text-xs leading-6 text-muted">{artifactError}</p> : null}
                <p className="text-xs leading-6 text-muted">
                  A lista agora usa o endpoint paginado quando disponível. Se a leitura incremental falhar, a tela volta ao recorte do summary sem quebrar
                  a navegação.
                </p>
              </CardContent>
            </Card>
          </div>

          <Card className="border-border/80 bg-surface shadow-card">
            <CardContent className="space-y-4 p-6">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-brand-600">Leitura operacional</p>
                  <h3 className="text-2xl font-semibold tracking-tight text-text">Causa, ação e severidade</h3>
                  <p className="text-sm leading-6 text-text-body">Resumo prático para decidir se vale aguardar a sync, revisar a falha ou abrir o Metabase.</p>
                </div>
                <Badge tone={overallStatus.tone}>{overallStatus.label}</Badge>
              </div>
              <div className="grid gap-3 md:grid-cols-3">
                <div className="rounded-2xl border border-border/80 bg-bg-subtle/80 p-4">
                  <p className="text-xs font-semibold uppercase tracking-[0.16em] text-muted">Causa provável</p>
                  <p className="mt-2 text-sm leading-6 text-text-body">{operationalCause}</p>
                </div>
                <div className="rounded-2xl border border-border/80 bg-bg-subtle/80 p-4">
                  <p className="text-xs font-semibold uppercase tracking-[0.16em] text-muted">Ação recomendada</p>
                  <p className="mt-2 text-sm leading-6 text-text-body">{operationalAction}</p>
                </div>
                <div className="rounded-2xl border border-border/80 bg-bg-subtle/80 p-4">
                  <p className="text-xs font-semibold uppercase tracking-[0.16em] text-muted">Runbook / próximo passo</p>
                  <p className="mt-2 text-sm leading-6 text-text-body">
                    <Link className="font-medium text-info-700 hover:text-info-700" href={operationalRunbookHref}>
                      Abrir a leitura operacional
                    </Link>
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <ContextualJourneyCard
            description="Conecte o consumo analítico do Metabase com catálogo, qualidade, linhagem e operação para entender impacto e priorização."
            links={[
              { description: "Abrir tabelas e contexto técnico do catálogo.", href: "/explorer", label: "Explorer", tone: "accent" },
              { description: "Entender o impacto downstream de dashboards e views.", href: "/lineage", label: "Linhagem", tone: "success" },
              { description: "Priorizar freshness e regras nas tabelas mais consumidas.", href: "/data-quality", label: "Data Quality", tone: "warning" },
              { description: "Ver prontidão e elegibilidade dos ativos.", href: "/certification", label: "Certificação", tone: "neutral" },
              { description: "Atribuir responsáveis para ativos mais usados.", href: "/data-owners", label: "Owners", tone: "neutral" },
              { description: "Correlacionar consumo com falhas operacionais.", href: "/ops/cockpit", label: "Ops Cockpit", tone: "accent" },
            ]}
            title="Jornadas principais do consumo analítico"
          />
        </>
      ) : null}
      {syncNowNotice ? (
        <div className="fixed bottom-5 right-5 z-[90] max-w-sm rounded-2xl border border-border bg-surface p-4 shadow-xl">
          <div className="flex items-start gap-3">
            <div
              className={
                syncNowNotice.tone === "success"
                  ? "mt-1 h-2.5 w-2.5 rounded-full bg-success-500"
                  : syncNowNotice.tone === "warning"
                    ? "mt-1 h-2.5 w-2.5 rounded-full bg-warning-500"
                    : "mt-1 h-2.5 w-2.5 rounded-full bg-danger-500"
              }
            />
            <div className="min-w-0">
              <p className="text-sm font-medium text-text">
                {syncNowNotice.tone === "success" ? "Sucesso" : syncNowNotice.tone === "warning" ? "Atenção" : "Erro"}
              </p>
              <p className="mt-1 text-sm leading-6 text-text-body">{syncNowNotice.message}</p>
              <button className="mt-2 text-xs font-medium text-muted underline" onClick={() => setSyncNowNotice(null)} type="button">
                Fechar
              </button>
            </div>
          </div>
        </div>
      ) : null}
      <MetabaseSyncNowDialog
        busy={syncNowBusy}
        description={syncNowDialog?.description || "Confirme a execução manual da sync Metabase."}
        details={syncNowDialog?.details || []}
        mode={syncNowDialogMode || "confirm"}
        onCancel={() => {
          if (syncNowBusy) return;
          setSyncNowDialogMode(null);
        }}
        onConfirm={handleSyncNowConfirm}
        open={Boolean(syncNowDialogMode)}
        primaryLabel={syncNowDialog?.primaryLabel || "Executar sync agora"}
        title={syncNowDialog?.title || "Executar sync agora"}
      />
      <MetabaseArtifactDrawer
        objectId={selectedArtifactId}
        open={selectedArtifactId !== null}
        onClose={() => setSelectedArtifactId(null)}
      />
    </div>
  );
}
