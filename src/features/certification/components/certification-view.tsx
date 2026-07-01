import { useMemo, useState } from "react";
import { AlertTriangle, ArrowRight, BookOpenCheck, CalendarDays, ClipboardList, Clock3, Database, Download, FileText, Flag, ShieldCheck, Sparkles, Tags, Target, TrendingUp, Users } from "lucide-react";

import { Banner } from "@/components/ui/banner";
import { Badge } from "@/components/ui/badge";
import { CertificationStatusBadge } from "@/components/certification/certification-badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { ContextualJourneyCard } from "@/components/navigation/contextual-journey-card";
import { EmptyState } from "@/components/ui/empty-state";
import { CertificationFiltersCard } from "@/features/certification/components/filters-card";
import { CertificationItemCard } from "@/features/certification/components/item-card";
import { CertificationStatsGrid } from "@/features/certification/components/stats-grid";
import type {
  CertificationGoal,
  CertificationGoalProgress,
  CertificationItem,
  CertificationSummary,
  CertificationSummaryPriorityItem,
} from "@/features/certification/types";

type CertificationViewProps = {
  title: string;
  loading: boolean;
  error: string | null;
  items: CertificationItem[];
  page: number;
  total: number;
  pageSize: number;
  query: string;
  statusFilter: string;
  criticalityFilter: string;
  ownerFilter: string;
  schemaFilter: string;
  databaseFilter: string;
  ownerOptions: Array<{ id: number; name: string }>;
  schemaOptions: string[];
  databaseOptions: string[];
  counters: {
    displayed: number;
    total: number;
    eligible: number;
    certified: number;
    revalidationPending: number;
    notEligible: number;
  };
  summary: CertificationSummary | null;
  goals: CertificationGoal[];
  selectedGoal: CertificationGoal | null;
  goalProgress: CertificationGoalProgress | null;
  goalProgressLoading: boolean;
  goalProgressError: string | null;
  canEdit: boolean;
  canExport: boolean;
  onQueryChange: (value: string) => void;
  onStatusFilterChange: (value: string) => void;
  quickFilter: string;
  onQuickFilterChange: (value: string) => void;
  onCriticalityFilterChange: (value: string) => void;
  onOwnerFilterChange: (value: string) => void;
  onSchemaFilterChange: (value: string) => void;
  onDatabaseFilterChange: (value: string) => void;
  onPageChange: (page: number) => void;
  onGoalSelect: (goalId: number) => void;
  onGoalCreateOpen: () => void;
  onExportCurrentFilters: () => void;
  onExportEvents: () => void;
  onOpenEditor: (item: CertificationItem) => void;
  onWorkflowAction: (item: CertificationItem, action: "submit" | "approve" | "reject" | "revalidate") => void;
  onRetry: () => void;
  statusOptions: Array<{ value: string; label: string }>;
  criticalityOptions: Array<{ value: string; label: string }>;
};

type BlockerKey =
  | "owner_defined"
  | "table_description_complete"
  | "documentation_coverage"
  | "tags_applied"
  | "terms_associated"
  | "privacy_reviewed"
  | "privacy_context_complete"
  | "dq_score"
  | "no_critical_incidents"
  | "review_recent";

const BLOCKER_DEFINITIONS: Array<{
  key: BlockerKey;
  label: string;
  quickLabel: string;
  description: string;
  action: string;
  href: string;
  icon: typeof Users;
}> = [
  {
    key: "owner_defined",
    label: "Sem owner",
    quickLabel: "Sem owner",
    description: "Ativos sem responsável não podem ser certificados com segurança, pois não há quem aprove, corrija ou mantenha a confiança do dado.",
    action: "Definir owner no Explorer.",
    href: "/explorer",
    icon: Users,
  },
  {
    key: "table_description_complete",
    label: "Sem descrição",
    quickLabel: "Sem descrição",
    description: "Sem descrição, consumidores não entendem finalidade, escopo ou uso correto da tabela.",
    action: "Completar documentação do ativo.",
    href: "/explorer",
    icon: FileText,
  },
  {
    key: "documentation_coverage",
    label: "Colunas pouco documentadas",
    quickLabel: "Colunas sem documentação",
    description: "A certificação exige documentação mínima das colunas para reduzir ambiguidade e erro de interpretação.",
    action: "Documentar colunas principais.",
    href: "/governance/dictionary",
    icon: BookOpenCheck,
  },
  {
    key: "tags_applied",
    label: "Sem tags",
    quickLabel: "Sem tags",
    description: "Tags ajudam busca, classificação e organização dos ativos.",
    action: "Adicionar tags de domínio, sensibilidade ou uso.",
    href: "/tags",
    icon: Tags,
  },
  {
    key: "terms_associated",
    label: "Sem termos",
    quickLabel: "Sem termos",
    description: "Termos conectam o ativo ao glossário de negócio e reduzem interpretações diferentes entre áreas.",
    action: "Associar termos de negócio.",
    href: "/glossary",
    icon: ClipboardList,
  },
  {
    key: "privacy_reviewed",
    label: "Privacidade sem revisão",
    quickLabel: "Privacidade sem revisão",
    description: "Ativos com dado pessoal ou sensível precisam de revisão formal de privacidade antes de avançar na certificação.",
    action: "Registrar revisão de privacidade.",
    href: "/privacy-access",
    icon: ShieldCheck,
  },
  {
    key: "privacy_context_complete",
    label: "Sem base legal ou finalidade",
    quickLabel: "Sem base legal ou finalidade",
    description: "Ativos com dado pessoal ou sensível precisam de base legal e finalidade estruturadas para sustentar a decisão de certificação.",
    action: "Completar base legal e finalidade.",
    href: "/privacy-access",
    icon: ShieldCheck,
  },
  {
    key: "dq_score",
    label: "Sem DQ",
    quickLabel: "Sem DQ",
    description: "Sem score de Data Quality, a plataforma não consegue validar confiança mínima do ativo.",
    action: "Executar ou configurar Data Quality.",
    href: "/data-quality",
    icon: Sparkles,
  },
  {
    key: "no_critical_incidents",
    label: "Com incidente crítico",
    quickLabel: "Com incidente crítico",
    description: "Incidentes críticos abertos bloqueiam certificação até análise ou resolução.",
    action: "Abrir incidentes.",
    href: "/incidents/tickets",
    icon: AlertTriangle,
  },
  {
    key: "review_recent",
    label: "Sem revisão recente",
    quickLabel: "Sem revisão recente",
    description: "A certificação precisa de revisão periódica para garantir que a decisão continua válida.",
    action: "Registrar revisão.",
    href: "/certification",
    icon: Clock3,
  },
];

function itemBlockers(item: CertificationItem) {
  return item.checklist.filter((check) => !check.passed);
}

function primaryBlocker(item: CertificationItem) {
  return itemBlockers(item)[0];
}

function formatGoalDate(value: string) {
  try {
    return new Intl.DateTimeFormat("pt-BR", { dateStyle: "short" }).format(new Date(`${value}T00:00:00`));
  } catch {
    return value;
  }
}

function goalStatusTone(status: string): "neutral" | "accent" | "warning" | "success" {
  if (status === "on_track") return "success";
  if (status === "attention") return "accent";
  if (status === "delayed") return "warning";
  return "neutral";
}

export function CertificationView({
  title,
  loading,
  error,
  items,
  page,
  total,
  pageSize,
  query,
  statusFilter,
  criticalityFilter,
  ownerFilter,
  schemaFilter,
  databaseFilter,
  ownerOptions,
  schemaOptions,
  databaseOptions,
  counters,
  summary,
  goals,
  selectedGoal,
  goalProgress,
  goalProgressLoading,
  goalProgressError,
  canEdit,
  canExport,
  onQueryChange,
  onStatusFilterChange,
  quickFilter,
  onQuickFilterChange,
  onCriticalityFilterChange,
  onOwnerFilterChange,
  onSchemaFilterChange,
  onDatabaseFilterChange,
  onPageChange,
  onGoalSelect,
  onGoalCreateOpen,
  onExportCurrentFilters,
  onExportEvents,
  onOpenEditor,
  onWorkflowAction,
  onRetry,
  statusOptions,
  criticalityOptions,
}: CertificationViewProps) {
  const [localSort, setLocalSort] = useState("readiness_desc");
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const rangeStart = total > 0 ? (page - 1) * pageSize + 1 : 0;
  const rangeEnd = total > 0 ? Math.min(page * pageSize, total) : 0;
  const quickFilterOptions = [
    ...BLOCKER_DEFINITIONS.map((item) => ({ value: item.key, label: item.quickLabel })),
    { value: "near_certification", label: "Próximos da certificação" },
    { value: "low_readiness", label: "Baixa prontidão" },
  ];
  const visibleItems = useMemo(() => {
    // quick_filter is applied server-side (full set, then paginated); here we only sort the page.
    const filtered = [...items];
    return filtered.sort((a, b) => {
      const blockersA = itemBlockers(a).length;
      const blockersB = itemBlockers(b).length;
      if (localSort === "readiness_asc") return a.readiness_score - b.readiness_score;
      if (localSort === "near_certification") return (blockersA - blockersB) || (b.readiness_score - a.readiness_score);
      if (localSort === "most_blocked") return (blockersB - blockersA) || (a.readiness_score - b.readiness_score);
      if (localSort === "status") return a.certification_status_label.localeCompare(b.certification_status_label);
      if (localSort === "owner") return (a.data_owner?.name || a.owner || "").localeCompare(b.data_owner?.name || b.owner || "");
      if (localSort === "schema") return a.schema_name.localeCompare(b.schema_name) || a.name.localeCompare(b.name);
      if (localSort === "database") return a.database_name.localeCompare(b.database_name) || a.schema_name.localeCompare(b.schema_name);
      if (localSort === "review") return String(b.certification_decided_at || "").localeCompare(String(a.certification_decided_at || ""));
      if (localSort === "criticality") return String(b.certification_criticality || "").localeCompare(String(a.certification_criticality || ""));
      return b.readiness_score - a.readiness_score;
    });
  }, [items, localSort]);
  const localCounters = {
    ...counters,
    displayed: visibleItems.length,
    eligible: visibleItems.filter((item) => item.certification_status === "eligible").length,
    certified: visibleItems.filter((item) => item.certification_status === "certified").length,
    revalidationPending: visibleItems.filter((item) => item.certification_status === "revalidation_pending").length,
    notEligible: visibleItems.filter((item) => item.certification_status === "not_eligible").length,
  };
  const blockerCards = summary?.blockers?.length
    ? summary.blockers.map((blocker) => {
        const fallback = BLOCKER_DEFINITIONS.find((item) => item.key === blocker.key);
        return { ...blocker, href: fallback?.href || "/certification", icon: fallback?.icon || AlertTriangle };
      })
    : BLOCKER_DEFINITIONS.map((blocker) => ({
        ...blocker,
        count: visibleItems.filter((item) => item.checklist.some((check) => check.key === blocker.key && !check.passed)).length,
        percent: visibleItems.length ? Math.round((visibleItems.filter((item) => item.checklist.some((check) => check.key === blocker.key && !check.passed)).length / visibleItems.length) * 100) : 0,
      }));
  const activeBlockers = blockerCards.filter((item) => item.count > 0).sort((a, b) => b.count - a.count).slice(0, 5);
  const hasActiveFilters = Boolean(query || statusFilter || criticalityFilter || ownerFilter || schemaFilter || databaseFilter || quickFilter);
  const nearestItems = visibleItems
    .filter((item) => item.certification_status !== "certified")
    .sort((a, b) => (itemBlockers(a).length - itemBlockers(b).length) || (b.readiness_score - a.readiness_score))
    .slice(0, 3);
  const blockedItems = visibleItems
    .filter((item) => itemBlockers(item).length > 0)
    .sort((a, b) => (itemBlockers(b).length - itemBlockers(a).length) || (a.readiness_score - b.readiness_score))
    .slice(0, 3);
  const distribution = Object.values(
    visibleItems.reduce<Record<string, { key: string; total: number; certified: number; eligible: number; notEligible: number; readiness: number[]; blockers: Record<string, number> }>>((acc, item) => {
      const key = `${item.database_name}.${item.schema_name}`;
      const bucket = acc[key] || { key, total: 0, certified: 0, eligible: 0, notEligible: 0, readiness: [], blockers: {} };
      bucket.total += 1;
      bucket.certified += item.certification_status === "certified" ? 1 : 0;
      bucket.eligible += item.certification_status === "eligible" ? 1 : 0;
      bucket.notEligible += item.certification_status === "not_eligible" ? 1 : 0;
      bucket.readiness.push(item.readiness_score);
      for (const blocker of itemBlockers(item)) bucket.blockers[blocker.label] = (bucket.blockers[blocker.label] || 0) + 1;
      acc[key] = bucket;
      return acc;
    }, {}),
  );
  const nearPriorityItems = summary?.near_certification?.length ? summary.near_certification : nearestItems;
  const blockedPriorityItems = summary?.most_blocked?.length ? summary.most_blocked : blockedItems;
  const distributionItems = summary?.distribution?.length ? summary.distribution : distribution;
  const summaryScopeLabel = summary ? "Resumo global dos filtros atuais." : "Resumo local da página atual.";
  const goalStatusToneValue = goalStatusTone(goalProgress?.progress.status || "no_data");
  const dailyMax = Math.max(...(goalProgress?.daily.map((item) => Math.max(item.certified, item.accumulated_certified)) ?? [0]), 1);
  const globalDistribution = summary?.distribution?.slice(0, 4) ?? [];

  function priorityName(item: CertificationItem | CertificationSummaryPriorityItem) {
    return `${item.schema_name}.${item.name}`;
  }

  function priorityPendingCount(item: CertificationItem | CertificationSummaryPriorityItem) {
    return "pending_criteria" in item ? item.pending_criteria : itemBlockers(item).length;
  }

  function priorityPrimaryBlocker(item: CertificationItem | CertificationSummaryPriorityItem) {
    if ("primary_blocker" in item) {
      return item.primary_blocker ? `${item.primary_blocker}${item.primary_blocker_detail ? ` (${item.primary_blocker_detail})` : ""}` : "sem bloqueio nos critérios avaliados";
    }
    const blocker = primaryBlocker(item);
    return blocker ? `${blocker.label} (${blocker.detail})` : "sem bloqueio nos critérios avaliados";
  }

  return (
    <>
      <Banner
        icon={<ShieldCheck className="h-5 w-5" />}
        title="O que é certificação de dados?"
        description="Certificação valida se um ativo está pronto para uso confiável em análises, dashboards, integrações e decisões de negócio. Ela consolida owner, documentação, qualidade, incidentes e revisão em uma decisão clara: este ativo pode ser usado com confiança?"
      />

      <div className="grid gap-4 xl:grid-cols-[1.15fr_0.85fr]">
        <Card className="border-border/80 bg-surface shadow-card">
          <CardContent className="space-y-4 p-5">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-brand-600">Como usar esta tela</p>
              <h3 className="mt-2 text-lg font-semibold text-text">Fila orientada de certificação</h3>
              <p className="mt-2 text-sm leading-7 text-text-body">
                Use esta tela para identificar ativos certificados, elegíveis para revisão e bloqueados por pendências de governança,
                documentação, qualidade ou operação. A listagem é uma fila operacional: corrija os critérios pendentes nas telas certas,
                registre a decisão e revalide periodicamente os ativos críticos.
              </p>
            </div>
            <div className="grid gap-3 md:grid-cols-3">
              {[
                "Filtre por status, schema, banco, owner ou criticidade.",
                "Priorize ativos críticos, consumidos ou ligados a produtos de dados.",
                "Corrija pendências no Explorer, Data Quality, Incidentes ou SLA antes da decisão.",
              ].map((step, index) => (
                <div className="rounded-2xl border border-border/80 bg-bg-subtle p-4" key={step}>
                  <div className="flex h-8 w-8 items-center justify-center rounded-full bg-info-100 text-sm font-semibold text-info-700">{index + 1}</div>
                  <p className="mt-3 text-sm leading-6 text-text-body">{step}</p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card className="border-border/80 bg-surface shadow-card">
          <CardContent className="space-y-4 p-5">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-brand-600">Status de certificação</p>
              <h3 className="mt-2 text-lg font-semibold text-text">Como interpretar</h3>
              <p className="mt-2 text-sm leading-6 text-text-body">
                O status mostra a etapa atual da decisão. A prontidão indica quantos critérios mínimos foram atendidos.
              </p>
            </div>
            <div className="space-y-2">
              {[
                { status: "certified", text: "Aprovado para consumo confiável, com critérios mínimos e revisão registrada." },
                { status: "eligible", text: "Possui prontidão suficiente para avaliação por responsável." },
                { status: "in_review", text: "Está em análise antes da decisão final." },
                { status: "rejected", text: "Foi avaliado, mas possui bloqueios relevantes." },
                { status: "revalidation_pending", text: "Precisa nova revisão por prazo, mudança, incidente ou queda de qualidade." },
                { status: "not_eligible", text: "Ainda não atingiu critérios mínimos para entrar em certificação." },
              ].map((item) => (
                <div className="flex items-start gap-3 rounded-2xl border border-border/80 bg-bg-subtle/80 p-3" key={item.status}>
                  <CertificationStatusBadge status={item.status} />
                  <p className="text-xs leading-5 text-text-body">{item.text}</p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      <ContextualJourneyCard
        eyebrow="Jornadas principais da certificação"
        title="Corrija pendências e valide confiança sem perder contexto"
        description="Use os atalhos para completar documentação, validar qualidade, verificar incidentes, revisar linhagem e conectar o ativo aos domínios e produtos de dados antes de certificar."
        links={[
          { label: "Explorer", href: "/explorer", description: "Completar owner, descrição, tags, termos, domínio e documentação de colunas.", tone: "accent" },
          { label: "Data Quality", href: "/data-quality", description: "Validar score, regras, falhas, freshness e execução mais recente.", tone: "success" },
          { label: "Incidentes", href: "/incidents/tickets", description: "Verificar incidentes críticos ou recorrentes que bloqueiam certificação.", tone: "warning" },
          { label: "SLA", href: "/admin/governance", description: "Revisar prazos de decisão, revalidação e governança contínua.", tone: "neutral" },
          { label: "Produtos de dados", href: "/governance/data-products", description: "Entender se o ativo sustenta uma entrega consumível e deve ser priorizado.", tone: "accent" },
          { label: "Domínios", href: "/governance/domains", description: "Relacionar o ativo ao contexto de negócio correto.", tone: "neutral" },
          { label: "Linhagem", href: "/lineage", description: "Avaliar impacto em pipelines, dashboards e consumidores antes da decisão.", tone: "neutral" },
          { label: "Dashboard executivo", href: "/dashboard", description: "Acompanhar evolução de ativos certificados, elegíveis e pendentes.", tone: "success" },
        ]}
      />

      <div className="rounded-3xl border border-border/80 bg-gradient-to-r from-white via-slate-50 to-brand-50 p-6 shadow-card">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-brand-600">Governança do ativo</p>
            <h2 className="mt-2 text-2xl font-semibold tracking-tight text-text">{title}</h2>
            <p className="mt-2 max-w-3xl text-sm leading-6 text-text-body">
              Acompanhe a fila de ativos avaliados pelo processo de certificação. O status é calculado automaticamente com base na
              prontidão e nos sinais ativos de Data Quality, incidentes e revisão operacional.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <CertificationStatusBadge status="certified" />
            <CertificationStatusBadge status="eligible" />
            <CertificationStatusBadge status="in_review" />
            <CertificationStatusBadge status="rejected" />
            <CertificationStatusBadge status="revalidation_pending" />
            <CertificationStatusBadge status="not_eligible" />
          </div>
        </div>
      </div>

      <CertificationStatsGrid counters={localCounters} />

      <div className="grid gap-4 xl:grid-cols-[1fr_0.7fr]">
        <Card className="border-border/80 bg-surface shadow-card">
          <CardContent className="space-y-4 p-5">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-brand-600">Principais bloqueios da certificação</p>
              <h3 className="mt-2 text-lg font-semibold text-text">Onde atuar primeiro</h3>
              <p className="mt-2 text-sm leading-6 text-text-body">
                {summary
                  ? "Estes são os bloqueios mais frequentes do filtro atual. Use esta leitura para destravar o maior número possível de ativos."
                  : "Estes são os bloqueios mais frequentes nos ativos exibidos nesta página. Use esta leitura para atacar pendências em lote."}
              </p>
            </div>
            {activeBlockers.length ? (
              <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                {activeBlockers.map((blocker) => {
                  const Icon = blocker.icon;
                  return (
                    <div className="rounded-2xl border border-border/80 bg-bg-subtle/80 p-4" key={blocker.key}>
                      <div className="flex items-start justify-between gap-3">
                        <div className="rounded-2xl bg-surface p-2 text-info-700 shadow-sm">
                          <Icon className="h-4 w-4" />
                        </div>
                        <span className="rounded-full bg-surface px-2.5 py-1 text-xs font-semibold text-text-body shadow-sm">{blocker.count} · {blocker.percent}%</span>
                      </div>
                      <p className="mt-3 text-sm font-semibold text-text">{blocker.label}</p>
                      <p className="mt-1 text-xs leading-5 text-text-body">{blocker.description}</p>
                      <Button asChild className="mt-3 w-full justify-between" size="sm" variant="outline">
                        <a href={blocker.href}>
                          {blocker.action}
                          <ArrowRight className="h-4 w-4" />
                        </a>
                      </Button>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="rounded-2xl border border-success-100 bg-success-50/70 p-4 text-sm leading-6 text-success-700">
                Não foram encontrados bloqueios críticos nos ativos exibidos. Revise critérios restantes antes de certificar.
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="border-border/80 bg-surface shadow-card">
          <CardContent className="space-y-4 p-5">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-brand-600">Meta de certificação</p>
                <h3 className="mt-2 text-lg font-semibold text-text">Acompanhamento do avanço no período</h3>
                <p className="mt-2 text-sm leading-6 text-text-body">
                  Defina uma meta para acompanhar quantos ativos devem ser certificados, revisados ou revalidados. A meta transforma a fila em plano operacional.
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                {goals.length ? (
                  <select
                    className="h-10 rounded-xl border border-border bg-surface px-3 text-sm"
                    value={selectedGoal?.id ?? ""}
                    onChange={(event) => onGoalSelect(Number(event.target.value))}
                  >
                    {goals.map((goal) => (
                      <option key={goal.id} value={goal.id}>
                        {goal.name}
                      </option>
                    ))}
                  </select>
                ) : null}
                <Button onClick={onGoalCreateOpen} size="sm">
                  <Target className="mr-2 h-4 w-4" />
                  Criar meta
                </Button>
              </div>
            </div>
            {!goals.length ? (
              <EmptyState
                title="Nenhuma meta de certificação configurada"
                description="Configure uma meta para acompanhar o avanço da certificação no período. A meta permite comparar realizado, faltante e ritmo necessário."
                action={
                  <Button onClick={onGoalCreateOpen} size="sm">
                    Criar meta
                  </Button>
                }
              />
            ) : goalProgressLoading ? (
              <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                {Array.from({ length: 6 }).map((_, index) => (
                  <div className="h-24 rounded-2xl bg-bg-subtle" key={index} />
                ))}
              </div>
            ) : goalProgressError ? (
              <div className="rounded-2xl border border-danger-100 bg-danger-50/80 p-4 text-sm leading-6 text-danger-700">{goalProgressError}</div>
            ) : goalProgress ? (
              <div className="space-y-4">
                <div className="rounded-2xl border border-border/80 bg-bg-subtle/80 p-4">
                  <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                    <div>
                      <p className="text-sm font-semibold text-text">{goalProgress.goal.name}</p>
                      <p className="mt-1 text-xs text-muted">
                        {formatGoalDate(goalProgress.goal.period_start)} até {formatGoalDate(goalProgress.goal.period_end)} · escopo {goalProgress.goal.scope_type}
                        {goalProgress.goal.scope_value ? `: ${goalProgress.goal.scope_value}` : ""}
                      </p>
                    </div>
                    <Badge tone={goalStatusToneValue}>{goalProgress.progress.status_label}</Badge>
                  </div>
                </div>
                <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                  {[
                    { label: "Meta do período", value: goalProgress.goal.target_certified_assets, note: "ativos para certificar" },
                    { label: "Certificados no período", value: goalProgress.progress.certified_assets, note: "decisões de certificação no período" },
                    { label: "Elegíveis agora", value: goalProgress.progress.eligible_assets, note: "snapshot atual do escopo" },
                    { label: "Revisados no período", value: goalProgress.progress.reviewed_assets, note: "revisões ou decisões registradas" },
                    { label: "Decisões no período", value: goalProgress.progress.decisions_assets, note: "mudanças auditáveis registradas" },
                    { label: "Recusas no período", value: goalProgress.progress.refusal_assets, note: "recusas registradas na trilha auditável" },
                    { label: "Faltam certificar", value: goalProgress.progress.remaining_certified_assets, note: "para atingir a meta de certificados" },
                    { label: "Percentual concluído", value: `${goalProgress.progress.completion_percent}%`, note: "baseado na meta de certificados" },
                    { label: "Ritmo necessário", value: goalProgress.progress.required_daily_rate.toFixed(2), note: "certificações por dia" },
                    { label: "Ritmo atual", value: goalProgress.progress.current_daily_rate.toFixed(2), note: "média diária registrada" },
                    { label: "Projeção", value: goalProgress.progress.projected_total, note: "total estimado no ritmo atual" },
                  ].map((card) => (
                    <div className="rounded-2xl border border-border/80 bg-surface p-4 shadow-sm" key={card.label}>
                      <p className="text-xs font-semibold uppercase tracking-[0.16em] text-muted">{card.label}</p>
                      <p className="mt-2 text-2xl font-semibold text-text">{card.value}</p>
                      <p className="mt-1 text-xs text-muted">{card.note}</p>
                    </div>
                  ))}
                </div>
                <p className="text-xs leading-5 text-muted">
                  {goalProgress.progress.history_source === "events"
                    ? "Evolução baseada em eventos auditáveis de decisão."
                    : "Evolução parcial baseada em datas existentes de decisão e revisão. Novas decisões passam a registrar eventos auditáveis."}
                </p>
                <p className="text-xs leading-5 text-muted">{goalProgress.progress.history_note}</p>
              </div>
            ) : null}
          </CardContent>
        </Card>
      </div>

      <CertificationFiltersCard
        criticalityFilter={criticalityFilter}
        criticalityOptions={criticalityOptions}
        databaseFilter={databaseFilter}
        databaseOptions={databaseOptions}
        onCriticalityFilterChange={onCriticalityFilterChange}
        onDatabaseFilterChange={onDatabaseFilterChange}
        onOwnerFilterChange={onOwnerFilterChange}
        onQueryChange={onQueryChange}
        onSchemaFilterChange={onSchemaFilterChange}
        onStatusFilterChange={onStatusFilterChange}
        ownerFilter={ownerFilter}
        ownerOptions={ownerOptions}
        query={query}
        schemaFilter={schemaFilter}
        schemaOptions={schemaOptions}
        statusFilter={statusFilter}
        statusOptions={statusOptions}
      />

      <Card className="border-border/80 bg-surface shadow-card">
        <CardContent className="space-y-4 p-5">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-brand-600">Priorização local</p>
              <h3 className="mt-2 text-lg font-semibold text-text">Filtros rápidos e ordenação da página atual</h3>
              <p className="mt-2 max-w-4xl text-sm leading-6 text-text-body">
                Os filtros rápidos e a ordenação reorganizam os cards carregados nesta página. Os resumos de bloqueio, prioridade e distribuição
                usam o endpoint global quando disponível.
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              {canExport ? (
                <>
                  <Button onClick={onExportCurrentFilters} size="sm" variant="outline">
                    <Download className="mr-2 h-4 w-4" />
                    Exportar pendências
                  </Button>
                  <Button onClick={onExportEvents} size="sm" variant="outline">
                    <CalendarDays className="mr-2 h-4 w-4" />
                    Exportar eventos
                  </Button>
                </>
              ) : null}
              <select className="h-10 rounded-xl border border-border bg-surface px-3 text-sm" value={localSort} onChange={(event) => setLocalSort(event.target.value)}>
                <option value="readiness_desc">Maior prontidão</option>
                <option value="readiness_asc">Menor prontidão</option>
                <option value="near_certification">Mais próximos da certificação</option>
                <option value="most_blocked">Mais bloqueados</option>
                <option value="status">Status</option>
                <option value="owner">Owner</option>
                <option value="schema">Schema</option>
                <option value="database">Banco</option>
                <option value="review">Última revisão</option>
                <option value="criticality">Criticidade</option>
              </select>
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button size="sm" variant={quickFilter ? "outline" : "default"} onClick={() => onQuickFilterChange("")}>Todos</Button>
            {quickFilterOptions.map((option) => (
              <Button key={option.value} size="sm" variant={quickFilter === option.value ? "default" : "outline"} onClick={() => onQuickFilterChange(option.value)}>
                {option.label}
              </Button>
            ))}
          </div>
        </CardContent>
      </Card>

      <Card className="border-border/80 bg-surface shadow-card">
        <CardContent className="space-y-4 p-5">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-brand-600">Evolução da certificação</p>
              <h3 className="mt-2 text-lg font-semibold text-text">Avanço diário no período</h3>
              <p className="mt-2 text-sm leading-6 text-text-body">
                Acompanhe certificações e revisões registradas ao longo do período da meta selecionada.
              </p>
            </div>
          </div>
          {!goalProgress?.daily.length ? (
            <EmptyState
              title="Ainda não há histórico suficiente para a evolução"
              description="As próximas decisões de certificação e revisões registradas dentro do período alimentarão esta visão."
            />
          ) : (
            <div className="space-y-4">
              <div className="grid grid-cols-7 gap-2 md:grid-cols-10 xl:grid-cols-12">
                {goalProgress.daily.slice(-12).map((point) => (
                  <div className="rounded-2xl border border-border/80 bg-bg-subtle p-3" key={point.date}>
                    <div className="flex h-24 items-end gap-1">
                      <div
                        className="w-1/2 rounded-full bg-info-500"
                        style={{ height: `${Math.max((point.certified / dailyMax) * 100, point.certified ? 18 : 6)}%` }}
                        title={`Certificados: ${point.certified}`}
                      />
                      <div
                        className="w-1/2 rounded-full bg-success-500"
                        style={{ height: `${Math.max((point.reviewed / dailyMax) * 100, point.reviewed ? 18 : 6)}%` }}
                        title={`Revisados: ${point.reviewed}`}
                      />
                    </div>
                    <p className="mt-2 text-[11px] font-medium text-muted">{formatGoalDate(point.date)}</p>
                    <p className="mt-1 text-xs text-text-body">{point.accumulated_certified} acum.</p>
                  </div>
                ))}
              </div>
              <div className="flex flex-wrap gap-2 text-xs text-muted">
                <Badge tone="accent">Azul: certificados por dia</Badge>
                <Badge tone="success">Verde: revisões por dia</Badge>
              </div>
              <p className="text-xs leading-5 text-muted">
                {goalProgress?.progress.history_source === "events"
                  ? "Evolução baseada em eventos auditáveis de decisão."
                  : "Evolução parcial baseada em datas existentes de decisão e revisão."}
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {loading ? (
        <Card>
          <CardContent className="py-8 text-sm text-muted">Carregando certificações...</CardContent>
        </Card>
      ) : error ? (
        <EmptyState
          action={
            <Button onClick={onRetry} variant="outline">
              Tentar novamente
            </Button>
          }
          description={error}
          title="Não foi possível carregar a certificação"
        />
      ) : visibleItems.length === 0 ? (
        <EmptyState
          icon={hasActiveFilters ? <Database className="h-5 w-5" /> : <ShieldCheck className="h-5 w-5" />}
          title={quickFilter ? "Nenhum resultado nos filtros rápidos" : hasActiveFilters ? "Nenhum ativo encontrado para estes filtros" : "Nenhum ativo disponível para certificação"}
          description={
            quickFilter
              ? "Nenhum ativo exibido corresponde a este bloqueio. Remova o filtro rápido ou avance para outra página."
              : hasActiveFilters
              ? "Ajuste status, owner, schema, banco ou busca para ampliar a fila. Se estiver procurando elegíveis, tente também revisar ativos próximos da certificação."
              : "A plataforma ainda não encontrou ativos suficientes para montar a fila. Comece catalogando tabelas e avançando owner, documentação, Data Quality e revisão."
          }
        />
      ) : (
        <div className="space-y-4">
          <div className="grid gap-4 xl:grid-cols-2">
            {visibleItems.map((item) => (
              <CertificationItemCard canEdit={canEdit} item={item} key={item.id} onOpenEditor={onOpenEditor} onWorkflowAction={onWorkflowAction} />
            ))}
          </div>
          {total > 0 ? (
            <div className="flex flex-col gap-3 rounded-2xl border border-border/80 bg-surface px-4 py-3 shadow-card sm:flex-row sm:items-center sm:justify-between">
              <p className="text-sm text-muted">
                Mostrando <span className="font-medium text-text">{rangeStart}</span> a{" "}
                <span className="font-medium text-text">{rangeEnd}</span> de{" "}
                <span className="font-medium text-text">{total}</span> ativo(s)
              </p>
              <div className="flex items-center gap-2">
                <Button disabled={page <= 1} onClick={() => onPageChange(Math.max(1, page - 1))} size="sm" variant="outline">
                  Anterior
                </Button>
                <div className="rounded-xl border border-border bg-bg-subtle px-3 py-2 text-sm text-text-body">
                  Página <span className="font-medium text-text">{page}</span> de{" "}
                  <span className="font-medium text-text">{totalPages}</span>
                </div>
                <Button disabled={page >= totalPages} onClick={() => onPageChange(Math.min(totalPages, page + 1))} size="sm" variant="outline">
                  Próxima
                </Button>
              </div>
            </div>
          ) : null}
        </div>
      )}

      <Card className="border-border/80 bg-surface shadow-card">
        <CardContent className="space-y-4 p-5">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-brand-600">Plano de ação por bloqueio</p>
              <h3 className="mt-2 text-lg font-semibold text-text">Onde atuar primeiro para aumentar a certificação</h3>
              <p className="mt-2 text-sm leading-6 text-text-body">
                Os bloqueios mais frequentes mostram as correções com maior potencial de impacto no filtro atual.
              </p>
            </div>
            {activeBlockers.length ? (
              <div className="space-y-3">
                {activeBlockers.slice(0, 4).map((blocker) => (
                  <div className="rounded-2xl border border-border/80 bg-bg-subtle p-4" key={`plan-${blocker.key}`}>
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div>
                        <p className="text-sm font-semibold text-text">{blocker.label}</p>
                        <p className="mt-1 text-xs text-muted">{blocker.count} ativos · {blocker.percent}% do escopo analisado</p>
                      </div>
                      <Badge tone={blocker.percent >= 70 ? "warning" : blocker.percent >= 40 ? "accent" : "neutral"}>
                        {blocker.percent >= 70 ? "Prioridade alta" : blocker.percent >= 40 ? "Prioridade média" : "Prioridade localizada"}
                      </Badge>
                    </div>
                    <p className="mt-3 text-xs leading-5 text-text-body">{blocker.description}</p>
                    <p className="mt-2 text-xs leading-5 text-text-body">Ação recomendada: {blocker.action}</p>
                    <p className="mt-2 text-xs leading-5 text-muted">
                      Responsável sugerido:{" "}
                      {blocker.key === "owner_defined"
                        ? "governança + owner do domínio"
                        : blocker.key === "dq_score"
                          ? "time de Data Quality"
                          : blocker.key === "no_critical_incidents"
                            ? "owner + time de incidentes"
                            : "owner + stewardship"}
                      .
                    </p>
                    <div className="mt-3 flex flex-wrap gap-2">
                      <Button asChild size="sm" variant="outline">
                        <a href={blocker.href}>Abrir módulo</a>
                      </Button>
                      {canExport ? (
                        <Button onClick={onExportCurrentFilters} size="sm" variant="ghost">
                          Exportar pendências
                        </Button>
                      ) : null}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <EmptyState
                title="Nenhum bloqueio crítico"
                description="Os ativos deste recorte não mostram um bloqueio dominante. Revise prioridades por status e prontidão."
              />
            )}
          </CardContent>
      </Card>

      <div className="grid gap-4 xl:grid-cols-2">
        <Card className="border-border/80 bg-surface shadow-card">
          <CardContent className="space-y-4 p-5">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-brand-600">Prioridade de certificação</p>
              <h3 className="mt-2 text-lg font-semibold text-text">Mais próximos de elegibilidade</h3>
              <p className="mt-2 text-sm leading-6 text-text-body">Ativos com maior prontidão e menos pendências. {summaryScopeLabel}</p>
            </div>
            {nearPriorityItems.length ? (
              <div className="space-y-3">
                {nearPriorityItems.map((item) => {
                  return (
                    <div className="rounded-2xl border border-border/80 bg-bg-subtle p-4" key={item.id}>
                      <div className="flex flex-wrap items-start justify-between gap-3">
                        <div>
                          <p className="text-sm font-semibold text-text">{priorityName(item)}</p>
                          <p className="mt-1 text-xs text-muted">{item.database_name} · {item.readiness_completed}/{item.readiness_total} critérios</p>
                        </div>
                        <Badge tone={item.readiness_score >= 70 ? "success" : "accent"}>{item.readiness_score}%</Badge>
                      </div>
                      <p className="mt-3 text-xs leading-5 text-text-body">
                        Principal pendência: {priorityPrimaryBlocker(item)}.
                      </p>
                      <Button asChild className="mt-3" size="sm" variant="outline">
                        <a href={`/certification?tableId=${item.id}`}>Abrir decisão</a>
                      </Button>
                    </div>
                  );
                })}
              </div>
            ) : (
              <EmptyState title="Nenhum ativo próximo da certificação" description="Nenhum ativo carregado nesta página está próximo da elegibilidade. Comece por owner, documentação e Data Quality." />
            )}
          </CardContent>
        </Card>

        <Card className="border-border/80 bg-surface shadow-card">
          <CardContent className="space-y-4 p-5">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-brand-600">Prioridade de correção</p>
              <h3 className="mt-2 text-lg font-semibold text-text">Maiores bloqueios</h3>
              <p className="mt-2 text-sm leading-6 text-text-body">Ativos com baixa prontidão ou maior quantidade de critérios pendentes. {summaryScopeLabel}</p>
            </div>
            {blockedPriorityItems.length ? (
              <div className="space-y-3">
                {blockedPriorityItems.map((item) => {
                  return (
                    <div className="rounded-2xl border border-border/80 bg-bg-subtle p-4" key={item.id}>
                      <div className="flex flex-wrap items-start justify-between gap-3">
                        <div>
                          <p className="text-sm font-semibold text-text">{priorityName(item)}</p>
                          <p className="mt-1 text-xs text-muted">{item.database_name} · {priorityPendingCount(item)} bloqueio(s)</p>
                        </div>
                        <Badge tone={item.readiness_score < 50 ? "warning" : "accent"}>{item.readiness_score}%</Badge>
                      </div>
                      <p className="mt-3 text-xs leading-5 text-text-body">
                        Comece por: {priorityPrimaryBlocker(item)}.
                      </p>
                      <Button asChild className="mt-3" size="sm" variant="outline">
                        <a href={`/explorer?tableId=${item.id}`}>Corrigir no Explorer</a>
                      </Button>
                    </div>
                  );
                })}
              </div>
            ) : (
              <EmptyState title="Nenhum bloqueio nos ativos exibidos" description="Os ativos desta página não possuem bloqueios nos critérios avaliados. Revise status, qualidade e decisão antes de certificar." />
            )}
          </CardContent>
        </Card>
      </div>

      <Card className="border-border/80 bg-surface shadow-card">
        <CardContent className="space-y-4 p-5">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-brand-600">Prioridade global</p>
              <h3 className="mt-2 text-lg font-semibold text-text">Grupos com maior impacto na certificação</h3>
              <p className="mt-2 text-sm leading-6 text-text-body">
                Use a distribuição global para decidir qual banco ou schema deve entrar primeiro no plano de trabalho. Esta seção usa o resumo global dos filtros atuais.
              </p>
            </div>
            <Badge tone="neutral">Global</Badge>
          </div>
          {globalDistribution.length ? (
            <div className="grid gap-3 lg:grid-cols-2 xl:grid-cols-4">
              {globalDistribution.map((bucket) => (
                <div className="rounded-2xl border border-border/80 bg-bg-subtle p-4" key={`global-${bucket.key}`}>
                  <div className="flex items-center justify-between gap-3">
                    <div className="rounded-2xl bg-surface p-2 text-info-700 shadow-sm">
                      <Flag className="h-4 w-4" />
                    </div>
                    <Badge tone={bucket.avg_readiness >= 70 ? "success" : bucket.avg_readiness >= 50 ? "accent" : "warning"}>
                      {bucket.avg_readiness}% média
                    </Badge>
                  </div>
                  <p className="mt-3 text-sm font-semibold text-text">{bucket.key}</p>
                  <p className="mt-1 text-xs text-muted">{bucket.total} ativos · {bucket.not_eligible} não elegíveis</p>
                  <p className="mt-3 text-xs leading-5 text-text-body">
                    Recomendação: comece por {bucket.primary_blocker?.toLowerCase() || "revisão dos critérios pendentes"} neste grupo.
                  </p>
                </div>
              ))}
            </div>
          ) : (
            <EmptyState
              title="Sem distribuição global disponível"
              description="O resumo global dos filtros atuais não retornou grupos suficientes para priorização ampla."
            />
          )}
        </CardContent>
      </Card>

      <Card className="border-border/80 bg-surface shadow-card">
        <CardContent className="space-y-4 p-5">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-brand-600">Distribuição dos ativos exibidos</p>
            <h3 className="mt-2 text-lg font-semibold text-text">Onde estão concentradas as pendências desta página</h3>
            <p className="mt-2 text-sm leading-6 text-text-body">{summaryScopeLabel}</p>
          </div>
          {distributionItems.length ? (
            <div className="grid gap-3 lg:grid-cols-2">
              {distributionItems.map((bucket) => {
                const avg = "avg_readiness" in bucket ? bucket.avg_readiness : Math.round(bucket.readiness.reduce((sum, value) => sum + value, 0) / Math.max(bucket.readiness.length, 1));
                const topBlocker = "primary_blocker" in bucket ? [bucket.primary_blocker, bucket.primary_blocker_count] : Object.entries(bucket.blockers).sort((a, b) => b[1] - a[1])[0];
                return (
                  <div className="rounded-2xl border border-border/80 bg-bg-subtle p-4" key={bucket.key}>
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div>
                        <p className="text-sm font-semibold text-text">{bucket.key}</p>
                        <p className="mt-1 text-xs text-muted">{bucket.total} ativo(s) exibido(s)</p>
                      </div>
                      <Badge tone={avg >= 70 ? "success" : avg >= 50 ? "accent" : "warning"}>{avg}% média</Badge>
                    </div>
                    <div className="mt-3 grid grid-cols-3 gap-2 text-xs text-text-body">
                      <span>{bucket.certified} certificada(s)</span>
                      <span>{bucket.eligible} elegível(is)</span>
                      <span>{"not_eligible" in bucket ? bucket.not_eligible : bucket.notEligible} não elegível(is)</span>
                    </div>
                    <p className="mt-3 text-xs leading-5 text-text-body">
                      Principal bloqueio: {topBlocker && topBlocker[0] ? `${topBlocker[0]} (${topBlocker[1]})` : "sem bloqueios nos critérios avaliados"}.
                    </p>
                  </div>
                );
              })}
            </div>
          ) : (
            <EmptyState title="Nenhum resultado nos filtros rápidos" description="Nenhum ativo exibido corresponde a este bloqueio. Remova o filtro ou avance para outra página." />
          )}
        </CardContent>
      </Card>
    </>
  );
}
