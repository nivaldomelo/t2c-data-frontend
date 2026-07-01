import { Link } from "@/lib/next-shims";
import { useEffect, useMemo, useState } from "react";
import { AlertTriangle, ArrowRight, Download, Filter, RefreshCcw, ShieldAlert } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Banner } from "@/components/ui/banner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { InfoTooltip } from "@/components/ui/tooltip";
import { useAuth } from "@/lib/auth";
import { apiRequest, downloadApiFile } from "@/lib/client-api";
import { GovernanceRecommendationsPanel } from "@/features/governance/recommendations/recommendations-panel";

type FilterOption = {
  value: string;
  label: string;
};

type BreakdownItem = {
  key: string;
  label: string;
  count: number;
};

type PendingItem = {
  key: string;
  title: string;
  description: string;
  severity: string;
  severity_label: string;
  priority: number;
  origin: string;
  origin_label: string;
  status: string;
  status_label: string;
  table_id: number;
  table_name: string;
  table_fqn: string;
  datasource_name: string;
  database_name: string;
  schema_name: string;
  domain_name?: string | null;
  owner_name: string;
  data_owner_id?: number | null;
  detected_at: string;
  aging_days: number;
  sla_days?: number | null;
  due_at?: string | null;
  sla_status?: string | null;
  sla_status_label?: string | null;
  governance_score: {
    score: number;
    max_score: number;
    label: string;
    tone: string;
  };
  trust_score?: number | null;
  trust_label?: string | null;
  trust_tone?: string | null;
  risk_score?: number | null;
  risk_label?: string | null;
  risk_tone?: string | null;
  risk_reason?: string | null;
  risk_components?: string[];
  context_value?: string | null;
  action_label: string;
  action_href: string;
  links: {
    explorer: string;
    data_quality: string;
    incidents: string;
    certification: string;
    owners: string;
    privacy: string;
    lineage: string;
    audit: string;
  };
};

type PendingCampaign = {
  group_by: string;
  group_label: string;
  value: string;
  label: string;
  count: number;
  avg_governance_score: number;
  lowest_governance_score: number;
  governance_label: string;
  governance_tone: string;
  href: string;
  hint: string;
};

type CampaignFilterState = {
  q: string;
  status: string;
  origin: string;
};

const DEFAULT_CAMPAIGN_FILTERS: CampaignFilterState = {
  q: "",
  status: "",
  origin: "",
};

const PENDING_PAGE_SIZE = 15;

type PendingCenterResponse = {
  generated_at: string;
  total: number;
  page: number;
  page_size: number;
  export_csv_href: string;
  export_xlsx_href: string;
  summary_cards?: {
    stewardship_pending: number;
    without_approver: number;
    reviews: number;
    certification: number;
    trust_at_risk: number;
    my_approval: number;
    my_queue: number;
    active_notifications: number;
    ready_to_resend: number;
    critical: number;
    operation: number;
    quality_incidents: number;
  };
  summary: BreakdownItem[];
  origins: BreakdownItem[];
  campaigns: PendingCampaign[];
  stewardship: {
    pending_total: number;
    awaiting_assignment: number;
    review_pending: number;
    certification_pending: number;
    my_approvals_pending: number;
    my_owner_queue: number;
  };
  notifications: {
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
  filters: {
    severities: FilterOption[];
    origins: FilterOption[];
    statuses: FilterOption[];
    owners: FilterOption[];
    datasources: FilterOption[];
    schemas: FilterOption[];
    domains: FilterOption[];
  };
  risk_queue: PendingItem[];
  items: PendingItem[];
};

type PendingCenterSummaryResponse = Omit<PendingCenterResponse, "page" | "page_size" | "risk_queue" | "items">;

type PendingCenterQueueResponse = Pick<
  PendingCenterResponse,
  "generated_at" | "total" | "page" | "page_size" | "export_csv_href" | "export_xlsx_href" | "risk_queue" | "items"
>;

type PendingCenterCampaignsResponse = Pick<PendingCenterResponse, "generated_at" | "total" | "campaigns">;

const EMPTY_PENDING_CENTER_RESPONSE: PendingCenterResponse = {
  generated_at: "",
  total: 0,
  page: 1,
  page_size: PENDING_PAGE_SIZE,
  export_csv_href: "",
  export_xlsx_href: "",
  summary: [],
  origins: [],
  campaigns: [],
  stewardship: {
    pending_total: 0,
    awaiting_assignment: 0,
    review_pending: 0,
    certification_pending: 0,
    my_approvals_pending: 0,
    my_owner_queue: 0,
  },
  notifications: {
    generated_at: "",
    enabled: false,
    repeat_days: 0,
    critical_repeat_hours: 0,
    active_total: 0,
    due_now_total: 0,
    critical_total: 0,
    review_total: 0,
    operational_total: 0,
    quality_total: 0,
    incident_total: 0,
  },
  filters: {
    severities: [],
    origins: [],
    statuses: [],
    owners: [],
    datasources: [],
    schemas: [],
    domains: [],
  },
  risk_queue: [],
  items: [],
};

type FilterState = {
  q: string;
  severity: string;
  origin: string;
  owner: string;
  datasource: string;
  schema_name: string;
  status: string;
};

const DEFAULT_FILTERS: FilterState = {
  q: "",
  severity: "",
  origin: "",
  owner: "",
  datasource: "",
  schema_name: "",
  status: "",
};

function badgeToneFromSeverity(severity: string): "warning" | "accent" | "neutral" {
  if (severity === "critical") return "warning";
  if (severity === "high") return "warning";
  if (severity === "medium") return "accent";
  return "neutral";
}

function badgeToneFromOrigin(origin: string): "accent" | "neutral" | "warning" | "success" {
  if (origin === "incidents") return "warning";
  if (origin === "operations") return "warning";
  if (origin === "quality") return "accent";
  return "neutral";
}

function badgeToneFromGovernance(tone: string): "success" | "accent" | "warning" | "neutral" {
  if (tone === "success") return "success";
  if (tone === "accent") return "accent";
  if (tone === "warning" || tone === "danger") return "warning";
  return "neutral";
}

function badgeToneFromRisk(tone: string | null | undefined): "success" | "accent" | "warning" | "neutral" {
  if (tone === "success") return "success";
  if (tone === "accent") return "accent";
  if (tone === "warning") return "warning";
  return "neutral";
}

function formatDateTime(value: string) {
  return new Date(value).toLocaleString("pt-BR");
}

function groupCampaigns(campaigns: PendingCampaign[]) {
  const groups = new Map<string, PendingCampaign[]>();
  campaigns.forEach((campaign) => {
    const current = groups.get(campaign.group_by) || [];
    current.push(campaign);
    groups.set(campaign.group_by, current);
  });
  return Array.from(groups.entries());
}

function campaignStatusFromCount(count: number) {
  return count > 0 ? "active" : "empty";
}

function normalizePendingCenterResponse(payload: PendingCenterResponse | null): PendingCenterResponse {
  if (!payload) {
    return EMPTY_PENDING_CENTER_RESPONSE;
  }

  return {
    ...EMPTY_PENDING_CENTER_RESPONSE,
    ...payload,
    summary_cards: payload.summary_cards ?? EMPTY_PENDING_CENTER_RESPONSE.summary_cards,
    summary: payload.summary ?? [],
    origins: payload.origins ?? [],
    campaigns: payload.campaigns ?? [],
    stewardship: {
      ...EMPTY_PENDING_CENTER_RESPONSE.stewardship,
      ...(payload.stewardship ?? {}),
    },
    notifications: {
      ...EMPTY_PENDING_CENTER_RESPONSE.notifications,
      ...(payload.notifications ?? {}),
    },
    filters: {
      severities: payload.filters?.severities ?? [],
      origins: payload.filters?.origins ?? [],
      statuses: payload.filters?.statuses ?? [],
      owners: payload.filters?.owners ?? [],
      datasources: payload.filters?.datasources ?? [],
      schemas: payload.filters?.schemas ?? [],
      domains: payload.filters?.domains ?? [],
    },
    risk_queue: payload.risk_queue ?? [],
    items: payload.items ?? [],
  };
}

export default function GovernancePendingCenterPage() {
  const auth = useAuth();
  const canExport = auth.hasPermission("governance:export");
  const [filters, setFilters] = useState<FilterState>(DEFAULT_FILTERS);
  const [campaignFilters, setCampaignFilters] = useState<CampaignFilterState>(DEFAULT_CAMPAIGN_FILTERS);
  const [payload, setPayload] = useState<PendingCenterResponse | null>(null);
  const [summaryLoading, setSummaryLoading] = useState(true);
  const [queueLoading, setQueueLoading] = useState(true);
  const [campaignLoading, setCampaignLoading] = useState(false);
  const [error, setError] = useState("");
  const [reloadKey, setReloadKey] = useState(0);
  const [page, setPage] = useState(1);
  const [campaignPage, setCampaignPage] = useState(1);
  const campaignPageSize = 5;
  const normalizedPayload = useMemo(() => normalizePendingCenterResponse(payload), [payload]);
  const loading = summaryLoading || (queueLoading && payload === null);

  const queryString = useMemo(() => {
    const params = new URLSearchParams();
    Object.entries(filters).forEach(([key, value]) => {
      if (value.trim()) params.set(key, value.trim());
    });
    params.set("page", String(page));
    params.set("page_size", String(PENDING_PAGE_SIZE));
    return params.toString();
  }, [filters, page]);

  const effectivePage = normalizedPayload.page ?? page;
  const effectivePageSize = normalizedPayload.page_size ?? PENDING_PAGE_SIZE;
  const totalPages = Math.max(1, Math.ceil((normalizedPayload.total || 0) / effectivePageSize));
  const rangeStart = normalizedPayload.total > 0 ? (effectivePage - 1) * effectivePageSize + 1 : 0;
  const rangeEnd = normalizedPayload.total > 0 ? Math.min(effectivePage * effectivePageSize, normalizedPayload.total) : 0;
  const summaryCards = normalizedPayload.summary_cards ?? null;
  const summaryCardsTotal = summaryCards
    ? Object.values(summaryCards).reduce((accumulator, value) => accumulator + value, 0)
    : 0;
  const summaryCardsAvailable = Boolean(summaryCards) && (normalizedPayload.total === 0 || summaryCardsTotal > 0);
  const campaignItems = normalizedPayload.campaigns ?? [];
  const filteredCampaigns = useMemo(() => {
    const query = campaignFilters.q.trim().toLowerCase();
    return campaignItems.filter((campaign) => {
      const matchesQuery =
        !query ||
        [campaign.label, campaign.hint, campaign.group_label, campaign.value].some((field) =>
          field.toLowerCase().includes(query),
        );
      const matchesStatus =
        !campaignFilters.status ||
        campaignStatusFromCount(campaign.count) === campaignFilters.status;
      const matchesOrigin = !campaignFilters.origin || campaign.group_by === campaignFilters.origin;
      return matchesQuery && matchesStatus && matchesOrigin;
    });
  }, [campaignFilters.origin, campaignFilters.q, campaignFilters.status, campaignItems]);
  const campaignTotalPages = Math.max(1, Math.ceil(filteredCampaigns.length / campaignPageSize));
  const effectiveCampaignPage = Math.min(campaignPage, campaignTotalPages);
  const campaignStart = filteredCampaigns.length > 0 ? (effectiveCampaignPage - 1) * campaignPageSize + 1 : 0;
  const campaignEnd = filteredCampaigns.length > 0 ? Math.min(effectiveCampaignPage * campaignPageSize, filteredCampaigns.length) : 0;
  const campaignPageItems = useMemo(
    () => filteredCampaigns.slice((effectiveCampaignPage - 1) * campaignPageSize, effectiveCampaignPage * campaignPageSize),
    [effectiveCampaignPage, filteredCampaigns],
  );
  const campaignGroups = useMemo(() => groupCampaigns(campaignPageItems), [campaignPageItems]);

  function updateFilter<K extends keyof FilterState>(key: K, value: string) {
    setFilters((prev) => ({ ...prev, [key]: value }));
    setPage(1);
  }

  function updateCampaignFilter<K extends keyof CampaignFilterState>(key: K, value: string) {
    setCampaignFilters((prev) => ({ ...prev, [key]: value }));
    setCampaignPage(1);
  }

  useEffect(() => {
    if (campaignPage > campaignTotalPages) {
      setCampaignPage(campaignTotalPages);
    }
  }, [campaignPage, campaignTotalPages]);

  useEffect(() => {
    const summaryController = new AbortController();
    const queueController = new AbortController();
    let active = true;
    const timer = window.setTimeout(() => {
      setSummaryLoading(true);
      setQueueLoading(true);
      setError("");

      void (async () => {
        try {
          const summaryData = await apiRequest<PendingCenterSummaryResponse>(`/v1/governance/pending-center/summary-light?${queryString}`, {
            signal: summaryController.signal,
          });
          if (!active) return;
          setPayload((current) => ({
            ...EMPTY_PENDING_CENTER_RESPONSE,
            ...(current ?? {}),
            ...summaryData,
          }));
        } catch (err) {
          if ((err as Error).name === "AbortError" || !active) return;
          setError((err as Error).message);
        } finally {
          if (active) setSummaryLoading(false);
        }
      })();

      void (async () => {
        try {
          const queueData = await apiRequest<PendingCenterQueueResponse>(`/v1/governance/pending-center/queue?${queryString}`, {
            signal: queueController.signal,
          });
          if (!active) return;
          setPayload((current) => ({
            ...EMPTY_PENDING_CENTER_RESPONSE,
            ...(current ?? {}),
            ...queueData,
          }));
        } catch (err) {
          if ((err as Error).name === "AbortError" || !active) return;
          setError((err as Error).message);
        } finally {
          if (active) setQueueLoading(false);
        }
      })();
    }, filters.q ? 250 : 0);

    return () => {
      active = false;
      summaryController.abort();
      queueController.abort();
      window.clearTimeout(timer);
    };
  }, [queryString, filters.q, reloadKey]);

  useEffect(() => {
    const campaignController = new AbortController();
    let active = true;
    setCampaignLoading(true);
    const schedule =
      "requestIdleCallback" in window
        ? (window as Window & { requestIdleCallback: (cb: () => void) => number }).requestIdleCallback
        : (cb: () => void) => window.setTimeout(cb, 500);
    const cancelSchedule =
      "cancelIdleCallback" in window
        ? (window as Window & { cancelIdleCallback: (id: number) => void }).cancelIdleCallback
        : (id: number) => window.clearTimeout(id);

    const handle = schedule(() => {
      void (async () => {
        try {
          const campaignData = await apiRequest<PendingCenterCampaignsResponse>(`/v1/governance/pending-center/campaigns?${queryString}`, {
            signal: campaignController.signal,
          });
          if (!active) return;
          setPayload((current) => ({
            ...EMPTY_PENDING_CENTER_RESPONSE,
            ...(current ?? {}),
            campaigns: campaignData.campaigns ?? [],
          }));
        } catch (err) {
          if ((err as Error).name === "AbortError" || !active) return;
          setError((current) => current || (err as Error).message);
        } finally {
          if (active) setCampaignLoading(false);
        }
      })();
    });

    return () => {
      active = false;
      campaignController.abort();
      cancelSchedule(handle);
    };
  }, [queryString, reloadKey]);

  return (
    <div className="space-y-6 pb-6">
      <Card className="border-border bg-[linear-gradient(135deg,#ffffff_0%,#f8fafc_50%,#edf7f6_100%)] shadow-[0_18px_48px_rgba(15,23,42,0.06)]">
        <CardContent className="space-y-4 p-6">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div className="space-y-2">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-brand-600">Governança ativa</p>
              <h2 className="text-3xl font-semibold tracking-tight text-text">Central de pendências</h2>
              <p className="max-w-4xl text-sm leading-7 text-text-body">
                Mostramos aqui o que ainda precisa de ação em owner, metadados, qualidade, operação e revisão contínua.
                A fila é calculada a partir do estado real dos ativos e já aponta o melhor próximo passo.
              </p>
            </div>
            <div className="flex items-center gap-2">
              <Badge tone="neutral">{loading ? "Calculando..." : `${normalizedPayload.total} pendência(s)`}</Badge>
              {payload && canExport ? (
                <>
                  <Button
                    onClick={() =>
                      void downloadApiFile(payload.export_csv_href, "governance_pending_center.csv", undefined, {
                        confirmMessage:
                          "Exportar a central de pendências em CSV (limite de 2.000 linhas)? A exportação será auditada e o recorte seguirá os filtros atuais.",
                      })
                    }
                    size="sm"
                    variant="outline"
                  >
                    <Download className="mr-2 h-4 w-4" />
                    CSV
                  </Button>
                  <Button
                    onClick={() =>
                      void downloadApiFile(payload.export_xlsx_href, "governance_pending_center.xlsx", undefined, {
                        confirmMessage:
                          "Exportar a central de pendências em Excel (limite de 2.000 linhas)? A exportação será auditada e o recorte seguirá os filtros atuais.",
                      })
                    }
                    size="sm"
                    variant="outline"
                  >
                    <Download className="mr-2 h-4 w-4" />
                    XLSX
                  </Button>
                </>
              ) : null}
              <Button onClick={() => setReloadKey((current) => current + 1)} size="sm" variant="outline">
                <RefreshCcw className="mr-2 h-4 w-4" />
                Atualizar
              </Button>
            </div>
          </div>

          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-6">
            <div className="xl:col-span-2">
              <Input
                onChange={(event) => updateFilter("q", event.target.value)}
                placeholder="Buscar por ativo, owner ou tipo de pendência"
                value={filters.q}
              />
            </div>
            <Select onChange={(event) => updateFilter("severity", event.target.value)} value={filters.severity}>
              <option value="">Todas as severidades</option>
              {normalizedPayload.filters.severities.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </Select>
            <Select onChange={(event) => updateFilter("origin", event.target.value)} value={filters.origin}>
              <option value="">Todas as origens</option>
              {normalizedPayload.filters.origins.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </Select>
            <Select onChange={(event) => updateFilter("owner", event.target.value)} value={filters.owner}>
              <option value="">Todos os owners</option>
              {normalizedPayload.filters.owners.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </Select>
            <Select onChange={(event) => updateFilter("datasource", event.target.value)} value={filters.datasource}>
              <option value="">Todas as fontes</option>
              {normalizedPayload.filters.datasources.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </Select>
          </div>

          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-5">
            <Select onChange={(event) => updateFilter("schema_name", event.target.value)} value={filters.schema_name}>
              <option value="">Todos os schemas</option>
              {normalizedPayload.filters.schemas.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </Select>
            <Select onChange={(event) => updateFilter("status", event.target.value)} value={filters.status}>
              <option value="">Todos os status</option>
              {normalizedPayload.filters.statuses.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </Select>
            <div className="md:col-span-2 xl:col-span-3 flex items-center gap-2 rounded-2xl border border-dashed border-border bg-surface/80 px-4 py-2 text-sm text-text-body">
              <Filter className="h-4 w-4 text-muted" />
              <span>
                Recomendações são a fila principal de ação. Cada item abre o ativo no Explorer para conectar contexto,
                evidência e correção no mesmo fluxo.
              </span>
            </div>
          </div>

          {summaryCardsAvailable && summaryCards ? (
            <div className="grid gap-3 md:grid-cols-3 xl:grid-cols-6">
              <div className="rounded-2xl border border-border bg-surface px-4 py-3">
                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-muted">Stewardship pendente</p>
                <p className="mt-2 text-2xl font-semibold text-text">{summaryCards.stewardship_pending}</p>
              </div>
              <div className="rounded-2xl border border-border bg-surface px-4 py-3">
                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-muted">Sem aprovador</p>
                <p className="mt-2 text-2xl font-semibold text-text">{summaryCards.without_approver}</p>
              </div>
              <div className="rounded-2xl border border-border bg-surface px-4 py-3">
                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-muted">Revisões</p>
                <p className="mt-2 text-2xl font-semibold text-text">{summaryCards.reviews}</p>
              </div>
              <div className="rounded-2xl border border-border bg-surface px-4 py-3">
                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-muted">Certificação</p>
                <p className="mt-2 text-2xl font-semibold text-text">{summaryCards.certification}</p>
              </div>
              <div className="rounded-2xl border border-border bg-surface px-4 py-3">
                <p className="flex items-center gap-1 text-xs font-semibold uppercase tracking-[0.16em] text-muted">
                  Trust em risco
                  <InfoTooltip text="Trust é o nível de confiança no ativo, calculado a partir de qualidade, certificação, incidentes e políticas. 'Em risco' indica queda recente." />
                </p>
                <p className="mt-2 text-2xl font-semibold text-text">{summaryCards.trust_at_risk}</p>
              </div>
              <div className="rounded-2xl border border-border bg-surface px-4 py-3">
                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-muted">Minhas aprovações</p>
                <p className="mt-2 text-2xl font-semibold text-text">{summaryCards.my_approval}</p>
              </div>
              <div className="rounded-2xl border border-border bg-surface px-4 py-3">
                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-muted">Minha fila</p>
                <p className="mt-2 text-2xl font-semibold text-text">{summaryCards.my_queue}</p>
              </div>
            </div>
          ) : (
            <Banner description="Resumo da Central de pendências indisponível no momento." tone="warning" title="Resumo indisponível" />
          )}

          {summaryCardsAvailable && summaryCards ? (
            <div className="grid gap-3 md:grid-cols-3 xl:grid-cols-6">
              <div className="rounded-2xl border border-border bg-surface px-4 py-3">
                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-muted">Notificações ativas</p>
                <p className="mt-2 text-2xl font-semibold text-text">{summaryCards.active_notifications}</p>
              </div>
              <div className="rounded-2xl border border-border bg-surface px-4 py-3">
                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-muted">Prontas para reenvio</p>
                <p className="mt-2 text-2xl font-semibold text-text">{summaryCards.ready_to_resend}</p>
              </div>
              <div className="rounded-2xl border border-border bg-surface px-4 py-3">
                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-muted">Críticas</p>
                <p className="mt-2 text-2xl font-semibold text-text">{summaryCards.critical}</p>
              </div>
              <div className="rounded-2xl border border-border bg-surface px-4 py-3">
                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-muted">Operação</p>
                <p className="mt-2 text-2xl font-semibold text-text">{summaryCards.operation}</p>
              </div>
              <div className="rounded-2xl border border-border bg-surface px-4 py-3">
                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-muted">Qualidade + incidentes</p>
                <p className="mt-2 text-2xl font-semibold text-text">{summaryCards.quality_incidents}</p>
              </div>
            </div>
          ) : null}

          <GovernanceRecommendationsPanel />

          {normalizedPayload.risk_queue.length > 0 ? (
            <div className="space-y-3 rounded-3xl border border-border bg-surface p-4 shadow-[0_10px_26px_rgba(15,23,42,0.04)]">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <p className="text-sm font-semibold text-text">Sinais técnicos de apoio</p>
                  <p className="mt-1 text-xs text-muted">
                    Recorte técnico por trust score, SLA e incidentes. Use como evidência; a fila principal de execução fica em recomendações.
                  </p>
                </div>
                <Badge tone="neutral">{normalizedPayload.risk_queue.length.toLocaleString("pt-BR")} item(ns)</Badge>
              </div>
              <div className="grid gap-3 xl:grid-cols-2">
                {normalizedPayload.risk_queue.slice(0, 8).map((item, index) => (
                  <div className="rounded-2xl border border-border bg-bg-subtle/80 p-4 shadow-none" key={`risk-${item.table_id}-${item.key}`}>
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div className="space-y-2">
                        <div className="flex flex-wrap items-center gap-2">
                          <Badge tone="neutral">#{index + 1}</Badge>
                          <Badge tone={badgeToneFromSeverity(item.severity)}>{item.severity_label}</Badge>
                          <Badge tone={badgeToneFromOrigin(item.origin)}>{item.origin_label}</Badge>
                          <Badge tone={badgeToneFromRisk(item.risk_tone)}>{item.risk_label || "Risco"}</Badge>
                          {item.trust_score != null ? <Badge tone={badgeToneFromRisk(item.trust_tone)}>Trust {item.trust_score}</Badge> : null}
                        </div>
                        <p className="text-sm font-semibold text-text">{item.title}</p>
                        <p className="text-xs leading-5 text-text-body">{item.risk_reason || item.description}</p>
                      </div>
                      <div className="rounded-2xl border border-border bg-surface px-3 py-2 text-right">
                        <p className="text-[11px] font-semibold uppercase tracking-wide text-muted">Risco</p>
                        <p className="text-base font-semibold text-text">{item.risk_score ?? 0}</p>
                      </div>
                    </div>
                    <div className="mt-3 flex flex-wrap items-center gap-2">
                      <Button asChild size="sm" variant="outline">
                        <Link href={item.links.explorer}>Abrir no Explorer</Link>
                      </Button>
                      <Button asChild size="sm" variant="ghost">
                        <Link href={item.action_href}>{item.action_label}</Link>
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ) : null}
        </CardContent>
      </Card>

      {payload ? (
        <div className="grid gap-4 xl:grid-cols-[1.35fr,1fr]">
          <Card className="border-border bg-surface shadow-[0_12px_36px_rgba(15,23,42,0.05)]">
            <CardHeader className="pb-3">
              <div className="flex items-center gap-2 text-sm font-semibold text-text-body">
                <ShieldAlert className="h-4 w-4 text-success-600" />
                Distribuição técnica por severidade
              </div>
            </CardHeader>
            <CardContent className="grid gap-3 md:grid-cols-4">
              {normalizedPayload.summary.length > 0 ? (
                normalizedPayload.summary.map((item) => (
                  <div className="rounded-2xl border border-border bg-bg-subtle p-4" key={item.key}>
                    <p className="text-xs font-semibold uppercase tracking-wide text-muted">{item.label}</p>
                    <p className="mt-2 text-2xl font-semibold text-text">{item.count}</p>
                  </div>
                ))
              ) : (
                <p className="text-sm text-muted md:col-span-4">Nenhuma pendência encontrada com os filtros atuais.</p>
              )}
            </CardContent>
          </Card>

          <Card className="border-border bg-surface shadow-[0_12px_36px_rgba(15,23,42,0.05)]">
            <CardHeader className="pb-3">
              <div className="flex items-center gap-2 text-sm font-semibold text-text-body">
                <AlertTriangle className="h-4 w-4 text-warning-600" />
                Origem técnica das pendências
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              {normalizedPayload.origins.length > 0 ? (
                normalizedPayload.origins.map((item) => (
                  <div className="flex items-center justify-between rounded-2xl border border-border bg-bg-subtle px-4 py-3" key={item.key}>
                    <span className="text-sm text-text-body">{item.label}</span>
                    <Badge tone="neutral">{item.count}</Badge>
                  </div>
                ))
              ) : (
                <p className="text-sm text-muted">Sem pendências abertas para os filtros atuais.</p>
              )}
            </CardContent>
          </Card>
        </div>
      ) : null}

      {payload ? (
        <Card className="border-border bg-surface shadow-[0_12px_36px_rgba(15,23,42,0.05)]">
          <CardHeader className="pb-3">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-2 text-sm font-semibold text-text-body">
                <Filter className="h-4 w-4 text-info-600" />
                Campanhas automáticas
              </div>
              <Badge tone="neutral">
                {filteredCampaigns.length.toLocaleString("pt-BR")} campanha(s)
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
              <div className="xl:col-span-2">
                <Input
                  onChange={(event) => updateCampaignFilter("q", event.target.value)}
                  placeholder="Buscar por campanha, dica ou responsável"
                  value={campaignFilters.q}
                />
              </div>
              <Select onChange={(event) => updateCampaignFilter("status", event.target.value)} value={campaignFilters.status}>
                <option value="">Todos os status</option>
                <option value="active">Com pendências</option>
                <option value="empty">Sem pendências</option>
              </Select>
              <Select onChange={(event) => updateCampaignFilter("origin", event.target.value)} value={campaignFilters.origin}>
                <option value="">Todas as origens</option>
                <option value="owner">Por owner</option>
                <option value="datasource">Por fonte</option>
                <option value="severity">Por severidade</option>
              </Select>
            </div>

            <div className="rounded-2xl border border-dashed border-border bg-bg-subtle/70 px-4 py-3 text-sm text-text-body">
              Mostramos 5 campanhas por página para manter a leitura rápida e consistente com o restante do cockpit.
            </div>

            {campaignLoading ? (
              <div className="rounded-2xl border border-border bg-bg-subtle px-4 py-6 text-sm text-muted">
                Carregando campanhas automáticas...
              </div>
            ) : campaignGroups.length > 0 ? (
              <div className="space-y-4">
                {campaignGroups.map(([groupBy, items]) => (
                  <div className="space-y-3" key={groupBy}>
                    <p className="text-xs font-semibold uppercase tracking-[0.18em] text-brand-600">
                      {items[0]?.group_label}
                    </p>
                    <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
                      {items.map((campaign) => (
                        <Card className="border-border bg-bg-subtle shadow-none" key={`${campaign.group_by}-${campaign.value}`}>
                          <CardContent className="space-y-3 p-4">
                            <div className="flex items-center justify-between gap-3">
                              <p className="text-sm font-semibold text-text">{campaign.label}</p>
                              <Badge tone={campaign.count > 0 ? "accent" : "neutral"}>{campaign.count}</Badge>
                            </div>
                            <div className="flex flex-wrap items-center gap-2">
                              <Badge tone={badgeToneFromGovernance(campaign.governance_tone)}>
                                Média {campaign.avg_governance_score.toFixed(1)} pts
                              </Badge>
                              <Badge tone="neutral">Pior ativo {campaign.lowest_governance_score} pts</Badge>
                            </div>
                            <p className="text-xs leading-5 text-text-body">{campaign.hint}</p>
                            <p className="text-xs text-muted">Maturidade dominante: {campaign.governance_label}</p>
                            <Button asChild size="sm" variant="outline">
                              <Link href={campaign.href}>
                                Abrir campanha
                                <ArrowRight className="ml-2 h-4 w-4" />
                              </Link>
                            </Button>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="rounded-2xl border border-border bg-bg-subtle px-4 py-6 text-sm text-muted">
                Nenhuma campanha encontrada com os filtros atuais.
              </div>
            )}

            <div className="flex flex-col gap-3 rounded-2xl border border-border bg-surface p-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="space-y-1">
                <p className="text-sm font-semibold text-text">
                  Mostrando {campaignStart.toLocaleString("pt-BR")}-{campaignEnd.toLocaleString("pt-BR")} de{" "}
                  {filteredCampaigns.length.toLocaleString("pt-BR")} campanha(s)
                </p>
                <p className="text-xs text-muted">
                  Página {effectiveCampaignPage.toLocaleString("pt-BR")} de {campaignTotalPages.toLocaleString("pt-BR")}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  disabled={effectiveCampaignPage <= 1}
                  onClick={() => setCampaignPage((current) => Math.max(1, current - 1))}
                  size="sm"
                  variant="outline"
                >
                  Anterior
                </Button>
                <Button
                  disabled={effectiveCampaignPage >= campaignTotalPages}
                  onClick={() => setCampaignPage((current) => Math.min(campaignTotalPages, current + 1))}
                  size="sm"
                  variant="outline"
                >
                  Próxima
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      ) : null}

      {loading ? (
        <Card>
          <CardContent className="py-10 text-sm text-muted">Carregando pendências de governança...</CardContent>
        </Card>
      ) : error ? (
        <EmptyState title="Não foi possível carregar a central" description={error} />
      ) : normalizedPayload.items.length === 0 ? (
        <EmptyState
          title="Nenhuma pendência encontrada"
          description="Os filtros atuais não retornaram lacunas abertas. Ajuste os critérios ou atualize para recalcular a fila."
        />
      ) : (
        <div className="space-y-4">
          {normalizedPayload.items.map((item) => (
            <Card className="border-border bg-surface shadow-[0_10px_26px_rgba(15,23,42,0.04)]" key={`${item.table_id}-${item.key}`}>
              <CardContent className="space-y-4 p-5">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="space-y-2">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="text-lg font-semibold text-text">{item.title}</p>
                      <Badge tone={badgeToneFromSeverity(item.severity)}>{item.severity_label}</Badge>
                      <Badge tone={badgeToneFromOrigin(item.origin)}>{item.origin_label}</Badge>
                      <Badge tone="neutral">{item.status_label}</Badge>
                      <Badge tone={badgeToneFromGovernance(item.governance_score.tone)}>
                        Governança {item.governance_score.score} pts
                      </Badge>
                      {item.trust_score !== null && item.trust_score !== undefined ? (
                        <Badge tone={badgeToneFromGovernance(item.trust_tone || "neutral")}>Trust {item.trust_score}</Badge>
                      ) : null}
                    </div>
                    <p className="text-sm leading-6 text-text-body">{item.description}</p>
                  </div>
                  <div className="rounded-2xl border border-border bg-bg-subtle px-3 py-2 text-right">
                    <p className="text-[11px] font-semibold uppercase tracking-wide text-muted">Prioridade</p>
                    <p className="text-base font-semibold text-text">{item.priority}</p>
                  </div>
                </div>

                <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-5">
                  <div className="rounded-2xl border border-border bg-bg-subtle p-3 xl:col-span-2">
                    <p className="text-[11px] font-semibold uppercase tracking-wide text-muted">Ativo</p>
                    <p className="mt-1 text-sm font-medium text-text">{item.table_fqn}</p>
                    <p className="mt-1 text-xs text-muted">
                      {item.datasource_name} • {item.database_name} • {item.schema_name}
                    </p>
                  </div>
                  <div className="rounded-2xl border border-border bg-bg-subtle p-3">
                    <p className="text-[11px] font-semibold uppercase tracking-wide text-muted">Owner</p>
                    <p className="mt-1 text-sm font-medium text-text">{item.owner_name}</p>
                  </div>
                  <div className="rounded-2xl border border-border bg-bg-subtle p-3">
                    <p className="text-[11px] font-semibold uppercase tracking-wide text-muted">Detectada em</p>
                    <p className="mt-1 text-sm font-medium text-text">{formatDateTime(item.detected_at)}</p>
                  </div>
                  <div className="rounded-2xl border border-border bg-bg-subtle p-3">
                    <p className="text-[11px] font-semibold uppercase tracking-wide text-muted">Contexto</p>
                    <p className="mt-1 text-sm font-medium text-text">{item.context_value || "Sem detalhe adicional"}</p>
                  </div>
                  <div className="rounded-2xl border border-border bg-bg-subtle p-3">
                    <p className="flex items-center gap-1 text-[11px] font-semibold uppercase tracking-wide text-muted">
                      Maturidade
                      <InfoTooltip text="Maturidade indica o quanto o ativo está documentado, com owner e governado." />
                    </p>
                    <p className="mt-1 text-sm font-medium text-text">
                      {item.governance_score.label} · {item.governance_score.score}/{item.governance_score.max_score}
                    </p>
                  </div>
                </div>

                {(item.sla_days || item.due_at || item.sla_status_label) ? (
                  <div className="grid gap-3 md:grid-cols-3">
                    <div className="rounded-2xl border border-border bg-bg-subtle p-3">
                      <p className="text-[11px] font-semibold uppercase tracking-wide text-muted">Aging</p>
                      <p className="mt-1 text-sm font-medium text-text">{item.aging_days} dia(s)</p>
                    </div>
                    <div className="rounded-2xl border border-border bg-bg-subtle p-3">
                      <p className="text-[11px] font-semibold uppercase tracking-wide text-muted">SLA</p>
                      <p className="mt-1 text-sm font-medium text-text">
                        {item.sla_days ? `${item.sla_days} dia(s)` : "Sem SLA explícito"}
                      </p>
                      {item.sla_status_label ? <Badge className="mt-2" tone={item.sla_status === "overdue" ? "warning" : item.sla_status === "due_soon" ? "accent" : "success"}>{item.sla_status_label}</Badge> : null}
                    </div>
                    <div className="rounded-2xl border border-border bg-bg-subtle p-3">
                      <p className="text-[11px] font-semibold uppercase tracking-wide text-muted">Vencimento</p>
                      <p className="mt-1 text-sm font-medium text-text">{item.due_at ? formatDateTime(item.due_at) : "Sem data prevista"}</p>
                    </div>
                  </div>
                ) : null}

                <div className="flex flex-wrap items-center gap-2">
                  <Button asChild size="sm">
                    <Link href={item.action_href}>
                      {item.action_label}
                      <ArrowRight className="ml-2 h-4 w-4" />
                    </Link>
                  </Button>
                  <Button asChild size="sm" variant="outline">
                    <Link href={item.links.explorer}>Abrir ativo</Link>
                  </Button>
                  {item.links.data_quality ? (
                    <Button asChild size="sm" variant="ghost">
                      <Link href={item.links.data_quality}>Qualidade</Link>
                    </Button>
                  ) : null}
                  {item.links.incidents ? (
                    <Button asChild size="sm" variant="ghost">
                      <Link href={item.links.incidents}>Incidentes</Link>
                    </Button>
                  ) : null}
                  {item.links.audit ? (
                    <Button asChild size="sm" variant="ghost">
                      <Link href={item.links.audit}>Histórico</Link>
                    </Button>
                  ) : null}
                  {item.links.lineage ? (
                    <Button asChild size="sm" variant="ghost">
                      <Link href={item.links.lineage}>Linhagem</Link>
                    </Button>
                  ) : null}
                </div>
              </CardContent>
            </Card>
          ))}

          <Card className="border-border bg-surface shadow-[0_10px_26px_rgba(15,23,42,0.04)]">
            <CardContent className="flex flex-col gap-4 p-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="space-y-1">
                <p className="text-sm font-semibold text-text">
                  Mostrando {rangeStart.toLocaleString("pt-BR")}-{rangeEnd.toLocaleString("pt-BR")} de{" "}
                  {normalizedPayload.total.toLocaleString("pt-BR")} pendência(s)
                </p>
                <p className="text-xs text-muted">
                  Página {effectivePage.toLocaleString("pt-BR")} de {totalPages.toLocaleString("pt-BR")}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <Button disabled={effectivePage <= 1} onClick={() => setPage((current) => Math.max(1, current - 1))} size="sm" variant="outline">
                  Anterior
                </Button>
                <Button
                  disabled={effectivePage >= totalPages}
                  onClick={() => setPage((current) => Math.min(totalPages, current + 1))}
                  size="sm"
                  variant="outline"
                >
                  Próxima
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
