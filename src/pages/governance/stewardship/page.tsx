import { Link } from "@/lib/next-shims";
import { useEffect, useMemo, useState } from "react";
import {
  AlertTriangle,
  ArrowRight,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Clock3,
  RefreshCcw,
  Send,
  Users,
  XCircle,
} from "lucide-react";
import { useSearchParams } from "@/lib/next-shims";

import { Badge } from "@/components/ui/badge";
import { Banner } from "@/components/ui/banner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import {
  certificationStatusFrameClass,
  certificationStatusHeaderClass,
} from "@/components/certification/certification-badge";
import { EmptyState } from "@/components/ui/empty-state";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { InfoTooltip } from "@/components/ui/tooltip";
import { apiRequest } from "@/lib/client-api";
import { cn } from "@/lib/cn";
import { useAuth } from "@/lib/auth";
import { normalizePageItems, type PageResponse } from "@/lib/pagination";

type GovernanceScore = {
  score: number;
  max_score: number;
  label: string;
  tone: string;
};

type StewardshipRequestTypeOption = {
  value: string;
  label: string;
  description: string;
};

type StewardshipRequestEvent = {
  id: number;
  event_type: string;
  event_type_label: string;
  actor: {
    id?: number | null;
    name?: string | null;
    email?: string | null;
  };
  comment?: string | null;
  payload_json?: Record<string, unknown> | null;
  created_at: string;
};

type StewardshipRequestItem = {
  id: number;
  table_id?: number | null;
  table_name: string;
  table_fqn: string;
  datasource_name?: string | null;
  database_name?: string | null;
  schema_name?: string | null;
  data_owner_id?: number | null;
  owner_name?: string | null;
  request_type: string;
  request_type_label: string;
  request_type_description: string;
  status: string;
  status_label: string;
  request_origin: string;
  request_origin_label: string;
  requester_comment?: string | null;
  decision_comment?: string | null;
  current_value_json?: Record<string, unknown> | null;
  proposed_value_json?: Record<string, unknown> | null;
  requested_by: {
    id?: number | null;
    name?: string | null;
    email?: string | null;
  };
  approver: {
    id?: number | null;
    name?: string | null;
    email?: string | null;
  };
  suggested_approver: {
    id?: number | null;
    name?: string | null;
    email?: string | null;
  };
  approver_source: string;
  approver_source_label: string;
  decided_by: {
    id?: number | null;
    name?: string | null;
    email?: string | null;
  };
  governance_score?: GovernanceScore | null;
  aging_days: number;
  sla_days: number;
  due_at: string;
  sla_status: string;
  sla_status_label: string;
  created_at: string;
  updated_at: string;
  decided_at?: string | null;
  links: {
    explorer: string;
    pending_center: string;
  };
  events: StewardshipRequestEvent[];
};

type StewardshipListResponse = {
  generated_at: string;
  total: number;
  page: number;
  page_size: number;
  total_pages: number;
  summary: Array<{ key: string; label: string; count: number }>;
  inbox: {
    pending_total: number;
    awaiting_assignment: number;
    review_pending: number;
    certification_pending: number;
    my_approvals_pending: number;
    my_owner_queue: number;
    by_owner: Array<{ key: string; label: string; count: number; href: string }>;
    by_approver: Array<{ key: string; label: string; count: number; href: string }>;
  };
  filters: {
    statuses: Array<{ value: string; label: string }>;
    request_types: StewardshipRequestTypeOption[];
    owners: Array<{ value: string; label: string }>;
    approvers: Array<{ value: string; label: string }>;
    sla_statuses: Array<{ value: string; label: string }>;
  };
  items: StewardshipRequestItem[];
};

type DataOwnerOption = {
  id: number;
  name: string;
  email: string;
  area?: string | null;
  is_active: boolean;
};

type GlossaryTermOption = {
  id: number;
  name: string;
  category?: string | null;
  status?: string | null;
};

type TableLocator = {
  table_id: number;
  datasource_name: string;
  database_name: string;
  schema_name: string;
  table_name: string;
  kind?: string | null;
  db_type?: string | null;
};

type StewardshipRequestContext = {
  table_id: number;
  request_type: string;
  request_type_label: string;
  suggested_approver: {
    id?: number | null;
    name?: string | null;
    email?: string | null;
  };
  approver_source: string;
  approver_source_label: string;
  sla_days: number;
  due_at: string;
  sla_status: string;
  sla_status_label: string;
  hint: string;
};

type TableSearchSuggestion = {
  id: number;
  name: string;
  table_fqn: string;
  datasource_name: string;
  database_name: string;
  schema_name: string;
  table_type: string;
};

type CreateForm = {
  tableId: string;
  requestType: string;
  descriptionManual: string;
  dataOwnerId: string;
  termIds: number[];
  requesterComment: string;
  requestOrigin: string;
};

const DEFAULT_FORM: CreateForm = {
  tableId: "",
  requestType: "table_description",
  descriptionManual: "",
  dataOwnerId: "",
  termIds: [],
  requesterComment: "",
  requestOrigin: "manual",
};

const REQUEST_TYPE_OPTIONS: StewardshipRequestTypeOption[] = [
  {
    value: "table_description",
    label: "Descrição do ativo",
    description: "Solicita criar ou revisar a descrição principal do ativo.",
  },
  {
    value: "owner_assignment",
    label: "Alteração de owner",
    description: "Solicita definir ou trocar o responsável formal do ativo.",
  },
  {
    value: "glossary_terms",
    label: "Vínculo de termos",
    description: "Solicita vincular ou ajustar termos de glossário do ativo.",
  },
  {
    value: "certification_review",
    label: "Revisão de certificação",
    description: "Solicita iniciar ou revalidar a certificação do ativo.",
  },
  {
    value: "owner_review",
    label: "Revisão periódica de owner",
    description: "Solicita confirmar a responsabilidade atual do ativo.",
  },
  {
    value: "privacy_review",
    label: "Revisão periódica de privacidade",
    description: "Solicita revalidar classificação e controles de privacidade.",
  },
];

function locatorToSuggestion(locator: TableLocator): TableSearchSuggestion {
  return {
    id: locator.table_id,
    name: locator.table_name,
    table_fqn: `${locator.datasource_name}.${locator.database_name}.${locator.schema_name}.${locator.table_name}`,
    datasource_name: locator.datasource_name,
    database_name: locator.database_name,
    schema_name: locator.schema_name,
    table_type: locator.kind || "table",
  };
}

function formatDateTime(value: string | null | undefined) {
  if (!value) return "Não definido";
  return new Date(value).toLocaleString("pt-BR");
}

function toneFromStatus(status: string): "warning" | "success" | "neutral" {
  if (status === "approved") return "success";
  if (status === "pending") return "warning";
  return "neutral";
}

function toneFromGovernance(tone: string | null | undefined): "success" | "accent" | "warning" | "neutral" {
  if (tone === "success") return "success";
  if (tone === "accent") return "accent";
  if (tone === "warning" || tone === "danger") return "warning";
  return "neutral";
}

function requestContextStatusTone(status: string) {
  if (status === "overdue") return "revalidation_pending";
  if (status === "due_soon") return "eligible";
  if (status === "on_track") return "certified";
  return "not_assessed";
}

function renderPayloadSummary(payload?: Record<string, unknown> | null) {
  if (!payload) return <span className="text-xs text-muted">Sem payload</span>;
  if (typeof payload.description_manual === "string") {
    return <p className="text-sm leading-6 text-text-body">{payload.description_manual || "Sem descrição proposta"}</p>;
  }
  if (payload.owner && typeof payload.owner === "object") {
    const owner = payload.owner as { name?: string; email?: string; area?: string };
    return (
      <div className="space-y-1 text-sm text-text-body">
        <p className="font-medium text-text">{owner.name || "Owner não definido"}</p>
        <p>{owner.email || "E-mail não informado"}</p>
        <p className="text-muted">{owner.area || "Área não informada"}</p>
      </div>
    );
  }
  if (Array.isArray(payload.terms)) {
    const terms = payload.terms as Array<{ id: number; label: string }>;
    return (
      <div className="flex flex-wrap gap-2">
        {terms.length === 0 ? <span className="text-xs text-muted">Nenhum termo.</span> : null}
        {terms.map((term) => (
          <Badge key={term.id} tone="accent">
            {term.label}
          </Badge>
        ))}
      </div>
    );
  }
  return <pre className="overflow-auto rounded-xl bg-bg-subtle p-3 text-xs text-text-body">{JSON.stringify(payload, null, 2)}</pre>;
}

export default function StewardshipPage() {
  const auth = useAuth();
  const searchParams = useSearchParams();
  const canEdit = auth.canAccessPath("/governance/stewardship") && auth.canAction("write", "stewardship");
  const [form, setForm] = useState<CreateForm>(DEFAULT_FORM);
  const [assetQuery, setAssetQuery] = useState("");
  const [assetSuggestions, setAssetSuggestions] = useState<TableSearchSuggestion[]>([]);
  const [assetSuggestionsLoading, setAssetSuggestionsLoading] = useState(false);
  const [selectedAsset, setSelectedAsset] = useState<TableSearchSuggestion | null>(null);
  const [locator, setLocator] = useState<TableLocator | null>(null);
  const [owners, setOwners] = useState<DataOwnerOption[]>([]);
  const [terms, setTerms] = useState<GlossaryTermOption[]>([]);
  const [payload, setPayload] = useState<StewardshipListResponse | null>(null);
  const [requestContext, setRequestContext] = useState<StewardshipRequestContext | null>(null);
  const [statusFilter, setStatusFilter] = useState("");
  const [typeFilter, setTypeFilter] = useState("");
  const [ownerFilter, setOwnerFilter] = useState("");
  const [approverFilter, setApproverFilter] = useState("");
  const [slaFilter, setSlaFilter] = useState("");
  const [mineOnly, setMineOnly] = useState(false);
  const [sortBySla, setSortBySla] = useState(true);
  const [page, setPage] = useState(1);
  const [termSearch, setTermSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [messageTone, setMessageTone] = useState<"success" | "error" | "info">("info");
  const [decisionNotes, setDecisionNotes] = useState<Record<number, string>>({});
  const [decidingId, setDecidingId] = useState<number | null>(null);
  const [reloadKey, setReloadKey] = useState(0);

  function notify(text: string, tone: "success" | "error" | "info" = "info") {
    setMessage(text);
    setMessageTone(tone);
  }
  const requestTypeOptions = payload?.filters.request_types?.length ? payload.filters.request_types : REQUEST_TYPE_OPTIONS;
  const assetQueryPlaceholder = "Busque por nome, schema.tabela ou fonte";

  useEffect(() => {
    const tableId = searchParams.get("tableId") || "";
    const requestType = searchParams.get("requestType") || DEFAULT_FORM.requestType;
    const requestOrigin = searchParams.get("origin") || (searchParams.get("create") ? "pending_center" : DEFAULT_FORM.requestOrigin);
    const tableName = searchParams.get("tableName") || "";
    const schemaName = searchParams.get("schemaName") || "";
    const databaseName = searchParams.get("databaseName") || "";
    const datasourceName = searchParams.get("datasourceName") || "";
    const queryLabel = [datasourceName, databaseName, schemaName, tableName].filter(Boolean).join(".");

    setForm((current) => ({
      ...current,
      tableId: tableId || current.tableId,
      requestType: requestType || current.requestType,
      requestOrigin: requestOrigin || current.requestOrigin,
    }));
    setAssetQuery(queryLabel);
    setStatusFilter(searchParams.get("status") || "");
    setTypeFilter(searchParams.get("request_type") || "");
    setOwnerFilter(searchParams.get("dataOwnerId") || "");
    setApproverFilter(searchParams.get("approverUserId") || "");
  }, [searchParams]);

  useEffect(() => {
    void (async () => {
      try {
        const [ownersResponse, termsResponse] = await Promise.all([
          apiRequest<DataOwnerOption[] | PageResponse<DataOwnerOption>>("/v1/data-owners"),
          apiRequest<GlossaryTermOption[] | PageResponse<GlossaryTermOption>>("/v1/glossary/terms"),
        ]);
        setOwners(normalizePageItems(ownersResponse).filter((item) => item.is_active));
        setTerms(normalizePageItems(termsResponse));
      } catch (error) {
        notify((error as Error).message, "error");
      }
    })();
  }, []);

  useEffect(() => {
    if (!form.tableId.trim()) {
      setLocator(null);
      setSelectedAsset(null);
      setRequestContext(null);
      return;
    }
    void (async () => {
      try {
        const nextLocator = await apiRequest<TableLocator>(`/v1/catalog/tables/${form.tableId.trim()}/locator`);
        const nextAsset = locatorToSuggestion(nextLocator);
        setLocator(nextLocator);
        setSelectedAsset(nextAsset);
        setAssetQuery(nextAsset.table_fqn);
      } catch {
        setLocator(null);
        setSelectedAsset(null);
      }
    })();
  }, [form.tableId]);

  useEffect(() => {
    if (!form.tableId.trim() || !form.requestType.trim()) {
      setRequestContext(null);
      return;
    }
    void (async () => {
      try {
        const context = await apiRequest<StewardshipRequestContext>(
          `/v1/stewardship/context?table_id=${form.tableId.trim()}&request_type=${encodeURIComponent(form.requestType)}`,
        );
        setRequestContext(context);
      } catch {
        setRequestContext(null);
      }
    })();
  }, [form.tableId, form.requestType]);

  useEffect(() => {
    const normalized = assetQuery.trim();
    if (!canEdit || normalized.length < 2) {
      setAssetSuggestions([]);
      setAssetSuggestionsLoading(false);
      return;
    }
    if (selectedAsset && normalized.toLowerCase() === selectedAsset.table_fqn.toLowerCase()) {
      setAssetSuggestions([]);
      setAssetSuggestionsLoading(false);
      return;
    }
    let active = true;
    const timeoutId = window.setTimeout(() => {
      void (async () => {
        setAssetSuggestionsLoading(true);
        try {
          const data = await apiRequest<TableSearchSuggestion[]>(`/v1/catalog/tables/search?q=${encodeURIComponent(normalized)}&limit=8`);
          if (active) {
            setAssetSuggestions(data);
          }
        } catch {
          if (active) {
            setAssetSuggestions([]);
          }
        } finally {
          if (active) {
            setAssetSuggestionsLoading(false);
          }
        }
      })();
    }, 250);

    return () => {
      active = false;
      window.clearTimeout(timeoutId);
    };
  }, [assetQuery, canEdit, selectedAsset]);

  useEffect(() => {
    setPage(1);
  }, [statusFilter, typeFilter, ownerFilter, approverFilter, slaFilter, mineOnly, sortBySla, form.tableId]);

  useEffect(() => {
    const params = new URLSearchParams();
    if (statusFilter) params.set("status", statusFilter);
    if (typeFilter) params.set("request_type", typeFilter);
    if (ownerFilter) params.set("data_owner_id", ownerFilter);
    if (approverFilter) params.set("approver_user_id", approverFilter);
    if (slaFilter) params.set("sla_status", slaFilter);
    if (mineOnly) params.set("mine", "true");
    if (sortBySla) params.set("sort", "sla");
    if (form.tableId.trim()) params.set("table_id", form.tableId.trim());
    params.set("page", String(page));

    setLoading(true);
    void (async () => {
      try {
        const data = await apiRequest<StewardshipListResponse>(`/v1/stewardship/requests${params.toString() ? `?${params.toString()}` : ""}`);
        setPayload(data);
      } catch (error) {
        notify((error as Error).message, "error");
      } finally {
        setLoading(false);
      }
    })();
  }, [statusFilter, typeFilter, ownerFilter, approverFilter, slaFilter, mineOnly, sortBySla, form.tableId, page, reloadKey]);

  const filteredTerms = useMemo(() => {
    const normalized = termSearch.trim().toLowerCase();
    if (!normalized) return terms;
    return terms.filter((item) => `${item.name} ${item.category || ""}`.toLowerCase().includes(normalized));
  }, [termSearch, terms]);

  async function submitRequest() {
    setSaving(true);
    try {
      await apiRequest<StewardshipRequestItem>("/v1/stewardship/requests", {
        method: "POST",
        body: JSON.stringify({
          table_id: Number(form.tableId),
          request_type: form.requestType,
          description_manual: form.requestType === "table_description" ? form.descriptionManual : undefined,
          data_owner_id: form.requestType === "owner_assignment" && form.dataOwnerId ? Number(form.dataOwnerId) : undefined,
          term_ids: form.requestType === "glossary_terms" ? form.termIds : undefined,
          requester_comment: form.requesterComment || undefined,
          request_origin: form.requestOrigin || "manual",
        }),
      });
      notify("Solicitação registrada com sucesso.", "success");
      setForm((current) => ({
        ...current,
        descriptionManual: "",
        dataOwnerId: "",
        termIds: [],
        requesterComment: "",
      }));
      setAssetSuggestions([]);
      setReloadKey((current) => current + 1);
    } catch (error) {
      notify((error as Error).message, "error");
    } finally {
      setSaving(false);
    }
  }

  function selectAssetSuggestion(asset: TableSearchSuggestion) {
    setSelectedAsset(asset);
    setAssetQuery(asset.table_fqn);
    setLocator(null);
    setRequestContext(null);
    setForm((current) => ({ ...current, tableId: String(asset.id) }));
    setAssetSuggestions([]);
    setMessage("");
  }

  async function decideRequest(requestId: number, action: "approve" | "reject" | "cancel") {
    const comment = (decisionNotes[requestId] || "").trim();
    if (action === "reject" && !comment) {
      notify("Informe uma justificativa para rejeitar a solicitação.", "error");
      return;
    }
    setDecidingId(requestId);
    try {
      await apiRequest(`/v1/stewardship/requests/${requestId}/${action}`, {
        method: "POST",
        body: JSON.stringify({ decision_comment: comment || undefined }),
      });
      const label = action === "approve" ? "aprovada" : action === "reject" ? "rejeitada" : "cancelada";
      notify(`Solicitação ${label} com sucesso.`, "success");
      setReloadKey((current) => current + 1);
      setDecisionNotes((current) => ({ ...current, [requestId]: "" }));
    } catch (error) {
      notify((error as Error).message, "error");
    } finally {
      setDecidingId(null);
    }
  }

  return (
    <div className="space-y-6 pb-6">
      {message ? (
        <div
          className={cn(
            "fixed right-6 top-6 z-[60] flex max-w-sm items-start gap-3 rounded-2xl border px-4 py-3 text-sm shadow-lg",
            messageTone === "success"
              ? "border-success-200 bg-success-50 text-success-700"
              : messageTone === "error"
                ? "border-danger-200 bg-danger-50 text-danger-700"
                : "border-border bg-surface text-text-body",
          )}
          role="status"
        >
          <span className="flex-1 leading-6">{message}</span>
          <button
            aria-label="Fechar"
            className="shrink-0 text-muted transition hover:text-text-body"
            onClick={() => setMessage("")}
            type="button"
          >
            <XCircle className="h-4 w-4" />
          </button>
        </div>
      ) : null}
      <Card className="border-border bg-[linear-gradient(135deg,#ffffff_0%,#f8fafc_55%,#eef6ff_100%)] shadow-[0_18px_48px_rgba(15,23,42,0.06)]">
        <CardContent className="space-y-4 p-6">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div className="space-y-2">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-brand-600">Fluxo de stewardship</p>
              <h2 className="text-3xl font-semibold tracking-tight text-text">Revisão e aprovação de ativos</h2>
              <p className="max-w-4xl text-sm leading-7 text-text-body">
                Stewardship é o fluxo de cuidado e decisão sobre os ativos de dados. Aqui registramos pedidos de ajuste, definimos quem
                precisa revisar, aprovamos mudanças importantes e mantemos histórico do que foi alterado em descrição, owner, termos,
                certificação e revisões periódicas.
              </p>
            </div>
            <div className="flex items-center gap-2">
              <Badge tone="neutral">{payload ? `${payload.total} solicitação(ões)` : "Carregando..."}</Badge>
              <Button asChild size="sm" variant="outline">
                <Link href="/data-owners">
                  <Users className="mr-2 h-4 w-4" />
                  Owners
                </Link>
              </Button>
              <Button onClick={() => setReloadKey((current) => current + 1)} size="sm" variant="outline">
                <RefreshCcw className="mr-2 h-4 w-4" />
                Atualizar
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {requestContext ? (
        <Card
          className={cn(
            "mx-auto w-full max-w-5xl border-border bg-surface shadow-[0_12px_36px_rgba(15,23,42,0.05)]",
            certificationStatusFrameClass(requestContextStatusTone(requestContext.sla_status)),
          )}
        >
          <CardContent
            className={cn(
              "space-y-4 p-5 sm:p-6",
              certificationStatusHeaderClass(requestContextStatusTone(requestContext.sla_status)),
            )}
          >
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="space-y-1">
                <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-brand-600">Detalhe central</p>
                <h3 className="text-lg font-semibold text-text">Contexto da solicitação de stewardship</h3>
                <p className="max-w-3xl text-sm leading-6 text-text-body">
                  Resumo do que será decidido neste pedido: quem deve aprovar, o prazo (SLA) e a data prevista para a conclusão.
                </p>
              </div>
              <Badge tone={requestContext.sla_status === "overdue" ? "warning" : requestContext.sla_status === "due_soon" ? "accent" : "success"}>
                {requestContext.sla_status_label}
              </Badge>
            </div>

            <div className="grid gap-3 md:grid-cols-3">
              <div className="rounded-2xl border border-border bg-bg-subtle/80 px-4 py-3">
                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-muted">Aprovador sugerido</p>
                <p className="mt-2 text-sm font-medium text-text">
                  {requestContext.suggested_approver.name || requestContext.suggested_approver.email || "Sem sugestão automática"}
                </p>
                <p className="mt-1 text-xs text-muted">{requestContext.approver_source_label}</p>
              </div>
              <div className="rounded-2xl border border-border bg-bg-subtle/80 px-4 py-3">
                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-muted">SLA da solicitação</p>
                <p className="mt-2 text-sm font-medium text-text">{requestContext.sla_days} dia(s)</p>
                <p className="mt-1 text-xs text-muted">{requestContext.sla_status_label}</p>
              </div>
              <div className="rounded-2xl border border-border bg-bg-subtle/80 px-4 py-3">
                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-muted">Previsão</p>
                <p className="mt-2 text-sm font-medium text-text">{formatDateTime(requestContext.due_at)}</p>
                <p className="mt-1 text-xs text-muted">{requestContext.hint}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      ) : null}

      <div className="grid gap-6 xl:grid-cols-[0.95fr,1.05fr]">
          <Card className="border-border bg-surface shadow-[0_12px_36px_rgba(15,23,42,0.05)]">
            <CardHeader>
              <div>
                <h3 className="text-lg font-semibold text-text">Nova solicitação</h3>
                <p className="mt-1 text-sm text-muted">Abra um pedido rastreável quando a mudança precisar de stewardship e aprovação.</p>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <label className="mb-1 block text-sm font-medium text-text-body">Ativo</label>
                <div className="relative">
                  <Input
                    disabled={!canEdit}
                    onChange={(event) => {
                      const nextValue = event.target.value;
                      setAssetQuery(nextValue);
                      setSelectedAsset(null);
                      setLocator(null);
                      setRequestContext(null);
                      setForm((current) => ({ ...current, tableId: "" }));
                    }}
                    placeholder={assetQueryPlaceholder}
                    value={assetQuery}
                  />
                  {assetSuggestionsLoading ? (
                    <p className="mt-1 text-xs text-muted">Buscando ativos...</p>
                  ) : null}
                  {assetSuggestions.length > 0 ? (
                    <div className="absolute left-0 top-full z-20 mt-2 w-full overflow-hidden rounded-2xl border border-border bg-surface shadow-xl">
                      {assetSuggestions.map((asset) => (
                        <button
                          className="flex w-full flex-col items-start gap-1 border-b border-border px-4 py-3 text-left transition last:border-b-0 hover:bg-bg-subtle"
                          disabled={!canEdit}
                          key={asset.id}
                          onClick={() => selectAssetSuggestion(asset)}
                          type="button"
                        >
                          <span className="text-sm font-medium text-text">{asset.table_fqn}</span>
                          <span className="text-xs text-muted">
                            {asset.datasource_name} • {asset.database_name}.{asset.schema_name} · {asset.table_type}
                          </span>
                        </button>
                      ))}
                    </div>
                  ) : null}
                </div>
              </div>
            {selectedAsset ? (
              <div className="rounded-2xl border border-info-200 bg-info-50/70 px-4 py-3 text-sm text-info-700">
                <p className="font-medium">{selectedAsset.table_fqn}</p>
                <p className="mt-1 text-xs text-info-700">
                  {selectedAsset.datasource_name} • {selectedAsset.database_name}.{selectedAsset.schema_name} · {selectedAsset.table_type}
                </p>
                <p className="mt-1 text-xs text-info-700">ID interno: {selectedAsset.id} · O ID técnico é derivado da seleção acima.</p>
              </div>
            ) : (
              <div className="rounded-2xl border border-dashed border-border bg-bg-subtle px-4 py-3 text-sm text-text-body">
                Você pode abrir esta página a partir do Explorer ou da Central de pendências. O ativo pode ser escolhido por nome, schema
                e fonte, sem precisar digitar o ID manualmente.
              </div>
            )}

            <div>
              <label className="mb-1 block text-sm font-medium text-text-body">Tipo de solicitação</label>
              <Select disabled={!canEdit} onChange={(event) => setForm((current) => ({ ...current, requestType: event.target.value }))} value={form.requestType}>
                {requestTypeOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </Select>
              <p className="mt-1 text-xs text-muted">
                {requestTypeOptions.find((option) => option.value === form.requestType)?.description || "Escolha a trilha de stewardship."}
              </p>
            </div>

            {form.requestType === "table_description" ? (
              <div>
                <label className="mb-1 block text-sm font-medium text-text-body">Descrição proposta</label>
                <Textarea
                  disabled={!canEdit}
                  onChange={(event) => setForm((current) => ({ ...current, descriptionManual: event.target.value }))}
                  placeholder="Escreva a descrição manual sugerida para o ativo."
                  value={form.descriptionManual}
                />
              </div>
            ) : null}

            {form.requestType === "owner_assignment" ? (
              <div>
                <label className="mb-1 block text-sm font-medium text-text-body">Owner proposto</label>
                <Select disabled={!canEdit} onChange={(event) => setForm((current) => ({ ...current, dataOwnerId: event.target.value }))} value={form.dataOwnerId}>
                  <option value="">Selecione um owner</option>
                  {owners.map((owner) => (
                    <option key={owner.id} value={owner.id}>
                      {owner.name} • {owner.email}
                    </option>
                  ))}
                </Select>
              </div>
            ) : null}

            {form.requestType === "glossary_terms" ? (
              <div className="space-y-3">
                <div>
                  <label className="mb-1 block text-sm font-medium text-text-body">Buscar termos</label>
                  <Input disabled={!canEdit} onChange={(event) => setTermSearch(event.target.value)} placeholder="Buscar por nome ou categoria" value={termSearch} />
                </div>
                <div className="max-h-52 space-y-2 overflow-y-auto rounded-2xl border border-border p-3">
                  {filteredTerms.map((term) => {
                    const selected = form.termIds.includes(term.id);
                    return (
                      <button
                        className={`flex w-full items-center justify-between rounded-xl border px-3 py-2 text-left text-sm transition ${
                          selected ? "border-info-200 bg-info-50 text-info-700" : "border-border bg-surface text-text-body hover:border-info-200"
                        }`}
                        disabled={!canEdit}
                        key={term.id}
                        onClick={() =>
                          setForm((current) => ({
                            ...current,
                            termIds: current.termIds.includes(term.id) ? current.termIds.filter((item) => item !== term.id) : [...current.termIds, term.id],
                          }))
                        }
                        type="button"
                      >
                        <span>{term.name}</span>
                        <span className="text-xs text-muted">{term.category || "Sem categoria"}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            ) : null}

            <div>
              <label className="mb-1 block text-sm font-medium text-text-body">Comentário para revisão</label>
              <Textarea
                disabled={!canEdit}
                onChange={(event) => setForm((current) => ({ ...current, requesterComment: event.target.value }))}
                placeholder="Explique a motivação, o contexto e o que precisa ser aprovado."
                value={form.requesterComment}
              />
            </div>

            <div className="flex items-center justify-between gap-3 border-t border-border pt-3">
              <p className="text-xs text-muted">
                {!canEdit
                  ? "Você tem acesso de leitura: pode acompanhar as solicitações, mas não abrir novas."
                  : !locator
                    ? "Selecione um ativo na busca acima para habilitar a criação."
                    : "A base já conecta owner, glossário, certificação e revisões contínuas em uma fila única e auditável."}
              </p>
              <Button
                disabled={!canEdit || !locator || saving}
                onClick={() => void submitRequest()}
                size="sm"
              >
                <Send className="mr-2 h-4 w-4" />
                {saving ? "Enviando..." : "Criar solicitação"}
              </Button>
            </div>
          </CardContent>
        </Card>

        <div className="space-y-4">
          <Card className="border-border bg-surface shadow-[0_12px_36px_rgba(15,23,42,0.05)]">
            <CardContent className="grid gap-3 p-5 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-6">
              {(payload?.summary || []).map((item) => (
                <div className="min-w-0 rounded-2xl border border-border bg-bg-subtle px-4 py-3" key={item.key}>
                  <p className="break-words text-xs font-semibold uppercase tracking-[0.16em] leading-5 text-muted whitespace-normal">
                    {item.label}
                  </p>
                  <p className="mt-2 text-2xl font-semibold text-text">{item.count}</p>
                </div>
              ))}
            </CardContent>
          </Card>

          {payload?.inbox ? (
            <Card className="border-border bg-surface shadow-[0_12px_36px_rgba(15,23,42,0.05)]">
              <CardContent className="space-y-4 p-5">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-brand-600">Inbox de stewardship</p>
                  <h3 className="mt-2 text-lg font-semibold text-text">Quem precisa agir agora</h3>
                </div>
                <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-6">
                  <div className="min-w-0 rounded-2xl border border-border bg-bg-subtle px-4 py-3">
                    <p className="break-words text-xs font-semibold uppercase tracking-[0.16em] leading-5 text-muted whitespace-normal">Pendentes</p>
                    <p className="mt-2 text-2xl font-semibold text-text">{payload.inbox.pending_total}</p>
                  </div>
                  <div className="min-w-0 rounded-2xl border border-border bg-bg-subtle px-4 py-3">
                    <p className="break-words text-xs font-semibold uppercase tracking-[0.16em] leading-5 text-muted whitespace-normal">Sem aprovador</p>
                    <p className="mt-2 text-2xl font-semibold text-text">{payload.inbox.awaiting_assignment}</p>
                  </div>
                  <div className="min-w-0 rounded-2xl border border-border bg-bg-subtle px-4 py-3">
                    <p className="break-words text-xs font-semibold uppercase tracking-[0.16em] leading-5 text-muted whitespace-normal">Revisões</p>
                    <p className="mt-2 text-2xl font-semibold text-text">{payload.inbox.review_pending}</p>
                  </div>
                  <div className="min-w-0 rounded-2xl border border-border bg-bg-subtle px-4 py-3">
                    <p className="break-words text-xs font-semibold uppercase tracking-[0.16em] leading-5 text-muted whitespace-normal">Certificação</p>
                    <p className="mt-2 text-2xl font-semibold text-text">{payload.inbox.certification_pending}</p>
                  </div>
                  <div className="min-w-0 rounded-2xl border border-border bg-bg-subtle px-4 py-3">
                    <p className="break-words text-xs font-semibold uppercase tracking-[0.16em] leading-5 text-muted whitespace-normal">Para minha aprovação</p>
                    <p className="mt-2 text-2xl font-semibold text-text">{payload.inbox.my_approvals_pending}</p>
                  </div>
                  <div className="min-w-0 rounded-2xl border border-border bg-bg-subtle px-4 py-3">
                    <p className="break-words text-xs font-semibold uppercase tracking-[0.16em] leading-5 text-muted whitespace-normal">Na minha fila</p>
                    <p className="mt-2 text-2xl font-semibold text-text">{payload.inbox.my_owner_queue}</p>
                  </div>
                </div>
                <div className="grid gap-4 lg:grid-cols-2">
                  <div className="space-y-3 rounded-2xl border border-border bg-bg-subtle p-4 align-top">
                    <div className="min-w-0">
                      <p className="break-words text-xs font-semibold uppercase tracking-[0.16em] leading-5 text-muted whitespace-normal">Por aprovador</p>
                      <p className="mt-1 break-words text-sm leading-6 text-text-body whitespace-normal">Quem concentra solicitações aguardando decisão.</p>
                    </div>
                    {payload.inbox.by_approver.length ? payload.inbox.by_approver.map((bucket) => (
                      <div className="flex items-start justify-between gap-3 rounded-xl border border-border bg-surface px-3 py-2" key={bucket.key}>
                        <div className="min-w-0 flex-1">
                          <p className="break-words text-sm font-medium leading-5 text-text whitespace-normal">{bucket.label}</p>
                          <p className="mt-0.5 break-words text-xs leading-5 text-muted whitespace-normal">{bucket.count} pendência(s)</p>
                        </div>
                        <Button asChild className="shrink-0" size="sm" variant="outline">
                          <Link href={bucket.href}>Abrir</Link>
                        </Button>
                      </div>
                    )) : <p className="break-words text-sm leading-6 text-muted whitespace-normal">Nenhum aprovador com solicitações pendentes neste recorte.</p>}
                  </div>
                  <div className="space-y-3 rounded-2xl border border-border bg-bg-subtle p-4 align-top">
                    <div className="min-w-0">
                      <p className="break-words text-xs font-semibold uppercase tracking-[0.16em] leading-5 text-muted whitespace-normal">Por owner</p>
                      <p className="mt-1 break-words text-sm leading-6 text-text-body whitespace-normal">Ativos que já têm owner e ainda aguardam alguma decisão de stewardship.</p>
                    </div>
                    {payload.inbox.by_owner.length ? payload.inbox.by_owner.map((bucket) => (
                      <div className="flex items-start justify-between gap-3 rounded-xl border border-border bg-surface px-3 py-2" key={bucket.key}>
                        <div className="min-w-0 flex-1">
                          <p className="break-words text-sm font-medium leading-5 text-text whitespace-normal">{bucket.label}</p>
                          <p className="mt-0.5 break-words text-xs leading-5 text-muted whitespace-normal">{bucket.count} pendência(s)</p>
                        </div>
                        <Button asChild className="shrink-0" size="sm" variant="outline">
                          <Link href={bucket.href}>Abrir</Link>
                        </Button>
                      </div>
                    )) : <p className="break-words text-sm leading-6 text-muted whitespace-normal">Nenhum owner com solicitações pendentes neste recorte.</p>}
                  </div>
                </div>
              </CardContent>
            </Card>
          ) : null}

          <Card className="border-border bg-surface shadow-[0_12px_36px_rgba(15,23,42,0.05)]">
            <CardContent className="space-y-3 p-5">
              <div className="grid gap-3 md:grid-cols-3 xl:grid-cols-5">
                <Select onChange={(event) => setStatusFilter(event.target.value)} value={statusFilter}>
                  <option value="">Todos os status</option>
                  {payload?.filters.statuses.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </Select>
                <Select onChange={(event) => setTypeFilter(event.target.value)} value={typeFilter}>
                  <option value="">Todos os tipos</option>
                  {payload?.filters.request_types.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </Select>
                <Select onChange={(event) => setOwnerFilter(event.target.value)} value={ownerFilter}>
                  <option value="">Todos os owners</option>
                  {payload?.filters.owners.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </Select>
                <Select onChange={(event) => setApproverFilter(event.target.value)} value={approverFilter}>
                  <option value="">Todos os aprovadores</option>
                  {payload?.filters.approvers.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </Select>
                <Select onChange={(event) => setSlaFilter(event.target.value)} value={slaFilter}>
                  <option value="">Todos os prazos (SLA)</option>
                  {(payload?.filters.sla_statuses || []).map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </Select>
              </div>
              <div className="flex flex-wrap items-center gap-2 border-t border-border pt-3">
                <Button
                  onClick={() => setMineOnly((current) => !current)}
                  size="sm"
                  variant={mineOnly ? "default" : "outline"}
                >
                  Somente as minhas
                </Button>
                <Button
                  onClick={() => setSortBySla((current) => !current)}
                  size="sm"
                  variant={sortBySla ? "default" : "outline"}
                >
                  <Clock3 className="mr-2 h-4 w-4" />
                  {sortBySla ? "Ordenado por SLA (mais urgentes primeiro)" : "Ordenar por SLA"}
                </Button>
                <span className="ml-auto inline-flex items-center text-xs text-muted">
                  Prazo (SLA)
                  <InfoTooltip
                    className="ml-1"
                    text="SLA é o prazo combinado para concluir a solicitação. Vencido = passou do prazo; Vence em breve = faltam até 2 dias; Dentro do prazo = ainda há folga."
                  />
                </span>
              </div>
            </CardContent>
          </Card>

          {loading ? (
            <Card className="border-border bg-surface">
              <CardContent className="p-6 text-sm text-muted">Carregando solicitações...</CardContent>
            </Card>
          ) : payload?.items.length ? (
            payload.items.map((item) => (
              <Card
                className={cn(
                  "bg-surface shadow-[0_12px_36px_rgba(15,23,42,0.05)]",
                  item.sla_status === "overdue"
                    ? "border-danger-200 ring-1 ring-danger-200"
                    : item.sla_status === "due_soon"
                      ? "border-warning-200 ring-1 ring-warning-100"
                      : "border-border",
                )}
                key={item.id}
              >
                <CardContent className="space-y-4 p-5">
                  {item.sla_status === "overdue" ? (
                    <div className="flex items-center gap-2 rounded-xl border border-danger-200 bg-danger-50 px-3 py-2 text-sm font-medium text-danger-700">
                      <AlertTriangle className="h-4 w-4 shrink-0" />
                      Prazo (SLA) vencido — priorize a decisão desta solicitação.
                    </div>
                  ) : null}
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="space-y-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <Badge tone={toneFromStatus(item.status)}>{item.status_label}</Badge>
                        <Badge tone="neutral">{item.request_type_label}</Badge>
                        {item.governance_score ? (
                          <span className="inline-flex items-center gap-1">
                            <Badge tone={toneFromGovernance(item.governance_score.tone)}>
                              Governança {item.governance_score.score}/{item.governance_score.max_score} • {item.governance_score.label}
                            </Badge>
                            <InfoTooltip text="Índice de governança do ativo (descrição, owner, termos, certificação e revisões). Quanto maior, mais completo e confiável o ativo." />
                          </span>
                        ) : null}
                        <Badge tone="neutral">{item.approver_source_label}</Badge>
                        <Badge tone={item.sla_status === "overdue" ? "warning" : item.sla_status === "due_soon" ? "accent" : "neutral"}>
                          {item.sla_status_label}
                        </Badge>
                      </div>
                      <h3 className="text-lg font-semibold text-text">{item.table_fqn}</h3>
                      <p className="text-sm text-muted">
                        Solicitado por {item.requested_by.name || item.requested_by.email || "Usuário"} em {formatDateTime(item.created_at)}
                      </p>
                      <p className="text-sm text-muted">
                        Owner atual: {item.owner_name || "Não definido"}
                      </p>
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                      <Button asChild size="sm" variant="outline">
                        <Link href={item.links.explorer}>
                          Abrir ativo
                          <ArrowRight className="ml-2 h-4 w-4" />
                        </Link>
                      </Button>
                      <Button asChild size="sm" variant="outline">
                        <Link href={item.links.pending_center}>Ver pendências</Link>
                      </Button>
                    </div>
                  </div>

                  <div className="grid gap-4 lg:grid-cols-2">
                    <div className="space-y-2 rounded-2xl border border-border bg-bg-subtle p-4">
                      <p className="text-xs font-semibold uppercase tracking-[0.16em] text-muted">Estado atual</p>
                      {renderPayloadSummary(item.current_value_json)}
                    </div>
                    <div className="space-y-2 rounded-2xl border border-info-200 bg-info-50/70 p-4">
                      <p className="text-xs font-semibold uppercase tracking-[0.16em] text-info-700">Proposta</p>
                      {renderPayloadSummary(item.proposed_value_json)}
                    </div>
                  </div>

                  <div className="grid gap-3 lg:grid-cols-3">
                    <div className="rounded-2xl border border-border bg-surface p-4 text-sm text-text-body">
                      <p className="font-medium text-text">Origem</p>
                      <p className="mt-1">{item.request_origin_label}</p>
                    </div>
                    <div className="rounded-2xl border border-border bg-surface p-4 text-sm text-text-body">
                      <p className="font-medium text-text">Aprovador</p>
                      <p className="mt-1">{item.decided_by.name || item.approver.name || "Ainda não definido"}</p>
                    </div>
                    <div className="rounded-2xl border border-border bg-surface p-4 text-sm text-text-body">
                      <p className="font-medium text-text">Última decisão</p>
                      <p className="mt-1">{formatDateTime(item.decided_at)}</p>
                    </div>
                    <div className="rounded-2xl border border-border bg-surface p-4 text-sm text-text-body">
                      <p className="font-medium text-text">SLA / aging</p>
                      <p className="mt-1">{item.aging_days} dia(s) em aberto</p>
                      <p className="mt-1 text-muted">Vence em {formatDateTime(item.due_at)}</p>
                    </div>
                  </div>

                  {item.requester_comment ? <Banner description={item.requester_comment} tone="warning" title="Comentário do solicitante" /> : null}

                  {item.status === "pending" && canEdit ? (
                    <div className="space-y-3 rounded-2xl border border-border bg-bg-subtle p-4">
                      <Textarea
                        onChange={(event) => setDecisionNotes((current) => ({ ...current, [item.id]: event.target.value }))}
                        placeholder="Comentário da decisão (obrigatório para rejeitar)."
                        value={decisionNotes[item.id] || ""}
                      />
                      <div className="flex flex-wrap items-center justify-end gap-2">
                        <Button
                          disabled={decidingId === item.id}
                          onClick={() => void decideRequest(item.id, "cancel")}
                          size="sm"
                          variant="outline"
                        >
                          <Clock3 className="mr-2 h-4 w-4" />
                          Cancelar
                        </Button>
                        <Button
                          disabled={decidingId === item.id || !(decisionNotes[item.id] || "").trim()}
                          onClick={() => void decideRequest(item.id, "reject")}
                          size="sm"
                          variant="outline"
                        >
                          <XCircle className="mr-2 h-4 w-4" />
                          Rejeitar
                        </Button>
                        <Button
                          disabled={decidingId === item.id}
                          onClick={() => void decideRequest(item.id, "approve")}
                          size="sm"
                        >
                          <CheckCircle2 className="mr-2 h-4 w-4" />
                          {decidingId === item.id ? "Processando..." : "Aprovar"}
                        </Button>
                      </div>
                    </div>
                  ) : null}

                  <div className="space-y-3">
                    <p className="text-sm font-medium text-text">Histórico</p>
                    <div className="space-y-3">
                      {item.events.map((event) => (
                        <div className="rounded-2xl border border-border bg-surface p-4" key={event.id}>
                          <div className="flex flex-wrap items-center justify-between gap-2">
                            <p className="text-sm font-medium text-text">{event.event_type_label}</p>
                            <p className="text-xs text-muted">{formatDateTime(event.created_at)}</p>
                          </div>
                          <p className="mt-1 text-xs text-muted">
                            {event.actor.name || event.actor.email || "Sistema"}
                          </p>
                          {event.comment ? <p className="mt-2 text-sm leading-6 text-text-body">{event.comment}</p> : null}
                        </div>
                      ))}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))
          ) : (
            <div className="space-y-3">
              <EmptyState
                description="Nenhuma solicitação aberta no momento. Você pode iniciar o fluxo a partir do Explorer, da Central de pendências ou diretamente por um ativo."
                title="Nenhuma solicitação aberta"
              />
              {canEdit ? (
                <div className="flex justify-center">
                  <Button asChild size="sm" variant="outline">
                    <Link href="/explorer">Abrir Explorer</Link>
                  </Button>
                </div>
              ) : null}
            </div>
          )}

          {payload && payload.total_pages > 1 ? (
            <Card className="border-border bg-surface shadow-[0_12px_36px_rgba(15,23,42,0.05)]">
              <CardContent className="flex flex-wrap items-center justify-between gap-3 p-4">
                <p className="text-sm text-muted">
                  Página {payload.page} de {payload.total_pages} · {payload.total} solicitação(ões)
                </p>
                <div className="flex items-center gap-2">
                  <Button
                    disabled={loading || payload.page <= 1}
                    onClick={() => setPage((current) => Math.max(1, current - 1))}
                    size="sm"
                    variant="outline"
                  >
                    <ChevronLeft className="mr-1 h-4 w-4" />
                    Anterior
                  </Button>
                  <Button
                    disabled={loading || payload.page >= payload.total_pages}
                    onClick={() => setPage((current) => current + 1)}
                    size="sm"
                    variant="outline"
                  >
                    Próxima
                    <ChevronRight className="ml-1 h-4 w-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ) : null}
        </div>
      </div>
    </div>
  );
}
