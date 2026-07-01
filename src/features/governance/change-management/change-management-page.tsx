import { Link } from "@/lib/next-shims";
import { useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "@/lib/next-shims";
import {
  AlertTriangle,
  ArrowRight,
  Ban,
  Check,
  Clock3,
  Database,
  FileText,
  History,
  RefreshCcw,
  ShieldCheck,
  Table2,
  Workflow,
} from "lucide-react";

import { AssetSearchInput, type AssetSuggestion } from "@/components/ui/asset-search-input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import { useAuth } from "@/lib/auth";

import { governanceSdk } from "../sdk";
import type {
  GovernanceChangeManagementAssetSla,
  GovernanceChangeManagementAssetSlaInput,
  GovernanceChangeManagementAssetSlaList,
  GovernanceChangeManagementRequest,
  GovernanceChangeManagementRequestInput,
  GovernanceChangeManagementRequestList,
  GovernanceChangeManagementTransitionInput,
} from "./types";

type AssetType = "table" | "column";

type Notice = {
  tone: "success" | "error";
  message: string;
} | null;

type AssetScope = {
  asset_type: AssetType;
  asset_id: number;
  asset_name: string | null;
  asset_fqn: string | null;
};

type AssetSlaForm = {
  sla_kind: string;
  sla_hours: string;
  status: string;
  source_kind: string;
  source_ref: string;
  context_json: string;
};

type ChangeRequestForm = {
  change_kind: string;
  title: string;
  description: string;
  policy_rule_key: string;
  recommendation_id: string;
  current_value_json: string;
  proposed_value_json: string;
  context_json: string;
};

const ASSET_TYPE_OPTIONS: Array<{ value: AssetType; label: string; description: string }> = [
  {
    value: "table",
    label: "Tabela",
    description: "Use para ownership, classificação, descrição e SLA do ativo.",
  },
  {
    value: "column",
    label: "Coluna",
    description: "Use para owner de coluna, descrição e ajustes pontuais por campo.",
  },
];

const CHANGE_KIND_OPTIONS: Array<{ value: string; label: string; description: string }> = [
  {
    value: "owner_assignment",
    label: "Owner",
    description: "Definir ou trocar o owner formal do ativo.",
  },
  {
    value: "owner_review",
    label: "Revisão de owner",
    description: "Registrar revisão formal do owner atual.",
  },
  {
    value: "classification_update",
    label: "Classificação",
    description: "Atualizar sensibilidade, privacidade ou base legal.",
  },
  {
    value: "description_update",
    label: "Descrição",
    description: "Revisar descrição manual e metadados descritivos.",
  },
  {
    value: "privacy_update",
    label: "Privacidade",
    description: "Alterar masking, sharing ou contexto de privacidade.",
  },
  {
    value: "sla",
    label: "SLA",
    description: "Criar ou atualizar o SLA formal do ativo.",
  },
  {
    value: "sla_update",
    label: "SLA atualizado",
    description: "Mesma operação de SLA com gatilho alternativo.",
  },
  {
    value: "freshness_sla",
    label: "Freshness SLA",
    description: "SLA de atualização para ativos com freshness monitorada.",
  },
];

const DEFAULT_SLA_FORM: AssetSlaForm = {
  sla_kind: "freshness",
  sla_hours: "24",
  status: "active",
  source_kind: "manual",
  source_ref: "",
  context_json: "{}",
};

const DEFAULT_REQUEST_FORM: ChangeRequestForm = {
  change_kind: "owner_assignment",
  title: "",
  description: "",
  policy_rule_key: "",
  recommendation_id: "",
  current_value_json: "{}",
  proposed_value_json: "{}",
  context_json: "{}",
};

function normalizeAssetType(value: string | null): AssetType {
  return value === "column" ? "column" : "table";
}

function formatDateTime(value?: string | null): string {
  if (!value) return "Sem data";
  return new Date(value).toLocaleString("pt-BR");
}

function formatUser(user?: GovernanceChangeManagementRequest["requested_by_user"] | null): string {
  if (!user) return "Sistema";
  return user.display_name || user.name || user.email || "Sistema";
}

function statusTone(status: string): "success" | "warning" | "accent" | "neutral" {
  if (status === "applied") return "success";
  if (status === "approved") return "warning";
  if (status === "review") return "accent";
  if (status === "rejected") return "neutral";
  return "accent";
}

function eventTone(eventType: string): "success" | "warning" | "accent" | "neutral" {
  if (eventType === "applied" || eventType === "approved") return "success";
  if (eventType === "rejected" || eventType === "apply_failed") return "warning";
  if (eventType === "reviewed") return "accent";
  return "neutral";
}

function requestEventLabel(eventType: string): string {
  const labels: Record<string, string> = {
    created: "Criada",
    reviewed: "Em revisão",
    approved: "Aprovada",
    applied: "Aplicada",
    rejected: "Rejeitada",
    apply_failed: "Falha ao aplicar",
  };
  return labels[eventType] || eventType;
}

function transitionLabel(transition: "review" | "approve" | "apply" | "reject"): string {
  if (transition === "review") return "revisada";
  if (transition === "approve") return "aprovada";
  if (transition === "apply") return "aplicada";
  return "rejeitada";
}

function safeParseJson(text: string, fallback: Record<string, unknown> = {}): Record<string, unknown> {
  const normalized = text.trim();
  if (!normalized) return fallback;
  const parsed = JSON.parse(normalized);
  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
    throw new Error("O valor precisa ser um objeto JSON.");
  }
  return parsed as Record<string, unknown>;
}

function prettyJson(value: Record<string, unknown> | null | undefined): string {
  if (!value || Object.keys(value).length === 0) return "{}";
  return JSON.stringify(value, null, 2);
}

function RequestEventList({ request }: { request: GovernanceChangeManagementRequest }) {
  if (!request.events.length) return null;
  return (
    <div className="space-y-2">
      {request.events.map((event) => (
        <div className="rounded-2xl border border-border bg-surface px-3 py-2" key={event.id}>
          <div className="flex flex-wrap items-center gap-2">
            <Badge tone={eventTone(event.event_type)}>{requestEventLabel(event.event_type)}</Badge>
            <p className="text-sm font-medium text-text">{formatDateTime(event.created_at)}</p>
          </div>
          <p className="mt-1 text-xs text-muted">
            {formatUser(event.actor_user)}{event.comment ? ` • ${event.comment}` : ""}
          </p>
        </div>
      ))}
    </div>
  );
}

function RequestCard({
  request,
  canMutate,
  transitionComment,
  onTransition,
}: {
  request: GovernanceChangeManagementRequest;
  canMutate: boolean;
  transitionComment: string;
  onTransition: (requestRef: string, transition: "review" | "approve" | "apply" | "reject") => void;
}) {
  return (
    <div className="rounded-3xl border border-border bg-bg-subtle/80 p-4 shadow-[0_8px_24px_rgba(15,23,42,0.04)]">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="space-y-2">
          <div className="flex flex-wrap items-center gap-2">
            <Badge tone={statusTone(request.status)}>{request.status_label}</Badge>
            <Badge tone="neutral">{request.change_kind}</Badge>
            <Badge tone="accent">{request.asset_type}</Badge>
            {request.policy_rule_key ? <Badge tone="warning">Política</Badge> : null}
          </div>
          <div>
            <p className="text-base font-semibold text-text">{request.title}</p>
            <p className="mt-1 text-sm leading-6 text-text-body">{request.description || "Sem descrição."}</p>
          </div>
        </div>
        <div className="rounded-2xl border border-border bg-surface px-3 py-2 text-right">
          <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-muted">Solicitação</p>
          <p className="mt-1 text-sm font-semibold text-text">{request.request_key}</p>
        </div>
      </div>

      <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        <div className="rounded-2xl border border-border bg-surface p-3">
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-muted">Ativo</p>
          <p className="mt-2 text-sm font-semibold text-text">{request.asset_name || request.asset_fqn || "Sem nome"}</p>
          <p className="mt-1 text-xs text-muted">{request.asset_fqn || "Sem FQN"}</p>
        </div>
        <div className="rounded-2xl border border-border bg-surface p-3">
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-muted">Solicitado por</p>
          <p className="mt-2 text-sm font-semibold text-text">{formatUser(request.requested_by_user)}</p>
          <p className="mt-1 text-xs text-muted">{formatDateTime(request.created_at)}</p>
        </div>
        <div className="rounded-2xl border border-border bg-surface p-3">
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-muted">Canal de aplicação</p>
          <p className="mt-2 text-sm font-semibold text-text">
            {request.can_review ? "Pendente de revisão" : request.can_approve ? "Pendente de aprovação" : request.can_apply ? "Pronta para aplicar" : "Fila finalizada"}
          </p>
          <p className="mt-1 text-xs text-muted">Eventos: {request.events.length}</p>
        </div>
        <div className="rounded-2xl border border-border bg-surface p-3">
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-muted">Status técnico</p>
          <p className="mt-2 text-sm font-semibold text-text">{request.apply_error || "Sem erro de aplicação"}</p>
          <p className="mt-1 text-xs text-muted">Atualizado em {formatDateTime(request.updated_at)}</p>
        </div>
      </div>

      <div className="mt-4 grid gap-4 xl:grid-cols-[1.1fr_0.9fr]">
        <div className="space-y-3">
          <div className="rounded-2xl border border-border bg-surface p-3">
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-muted">Valores JSON</p>
            <div className="mt-3 grid gap-3 md:grid-cols-2">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.14em] text-muted">Atual</p>
                <pre className="mt-2 max-h-48 overflow-auto rounded-2xl bg-slate-950 p-3 text-xs text-slate-50">
                  {prettyJson(request.current_value_json)}
                </pre>
              </div>
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.14em] text-muted">Proposto</p>
                <pre className="mt-2 max-h-48 overflow-auto rounded-2xl bg-slate-950 p-3 text-xs text-slate-50">
                  {prettyJson(request.proposed_value_json)}
                </pre>
              </div>
            </div>
          </div>
          <div className="rounded-2xl border border-border bg-surface p-3">
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-muted">Histórico</p>
            <div className="mt-3">
              <RequestEventList request={request} />
            </div>
          </div>
        </div>

        <div className="space-y-3">
          <div className="rounded-2xl border border-border bg-surface p-3">
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-muted">Ações</p>
            <p className="mt-2 text-sm leading-6 text-text-body">
              O comentário de transição é opcional, mas ajuda a registrar a decisão na trilha de mudança.
            </p>
            <div className="mt-3 space-y-2">
              {request.can_review ? (
                <Button className="w-full justify-between" disabled={!canMutate} onClick={() => onTransition(request.request_key, "review")} size="sm" variant="outline">
                  Revisar
                  <ArrowRight className="h-4 w-4" />
                </Button>
              ) : null}
              {request.can_approve ? (
                <Button className="w-full justify-between" disabled={!canMutate} onClick={() => onTransition(request.request_key, "approve")} size="sm">
                  <Check className="mr-2 h-4 w-4" />
                  Aprovar
                </Button>
              ) : null}
              {request.can_apply ? (
                <Button className="w-full justify-between" disabled={!canMutate} onClick={() => onTransition(request.request_key, "apply")} size="sm" variant="outline">
                  <Workflow className="mr-2 h-4 w-4" />
                  Aplicar
                </Button>
              ) : null}
              {request.can_reject ? (
                <Button className="w-full justify-between" disabled={!canMutate} onClick={() => onTransition(request.request_key, "reject")} size="sm" variant="ghost">
                  <Ban className="mr-2 h-4 w-4" />
                  Rejeitar
                </Button>
              ) : null}
              {!request.can_review && !request.can_approve && !request.can_apply && !request.can_reject ? (
                <p className="text-sm text-muted">Essa solicitação já concluiu o fluxo de mudança.</p>
              ) : null}
            </div>
            {!canMutate ? <p className="mt-3 text-xs text-warning-700">Seu perfil atual pode visualizar, mas não aprovar mudanças.</p> : null}
            {transitionComment.trim() ? (
              <p className="mt-3 text-xs text-muted">Comentário associado às ações: {transitionComment}</p>
            ) : null}
          </div>
        </div>
      </div>
    </div>
  );
}

function AssetSlaCard({
  assetSlaList,
  canMutate,
  form,
  loading,
  onChange,
  onSubmit,
}: {
  assetSlaList: GovernanceChangeManagementAssetSlaList | null;
  canMutate: boolean;
  form: AssetSlaForm;
  loading: boolean;
  onChange: (patch: Partial<AssetSlaForm>) => void;
  onSubmit: () => void;
}) {
  return (
    <Card className="border-border bg-surface shadow-[0_12px_36px_rgba(15,23,42,0.05)]">
      <CardHeader className="pb-3">
        <div className="flex items-center gap-2 text-sm font-semibold text-text-body">
          <ShieldCheck className="h-4 w-4 text-success-600" />
          SLAs do ativo
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {loading ? (
          <Skeleton className="h-52 w-full" />
        ) : !assetSlaList ? (
          <EmptyState
            title="Nenhum ativo carregado"
            description="Selecione uma tabela ou coluna para visualizar e registrar SLAs formais."
          />
        ) : (
          <>
            <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
              {assetSlaList.items.length ? (
                assetSlaList.items.map((sla) => (
                  <div className="rounded-2xl border border-border bg-bg-subtle/80 p-3" key={sla.id}>
                    <div className="flex flex-wrap items-center gap-2">
                      <Badge tone="accent">{sla.sla_kind}</Badge>
                      <Badge tone={sla.status === "active" ? "success" : "neutral"}>{sla.status}</Badge>
                    </div>
                    <p className="mt-2 text-sm font-semibold text-text">{sla.sla_hours} hora(s)</p>
                    <p className="mt-1 text-xs text-muted">
                      Fonte {sla.source_kind}
                      {sla.source_ref ? ` • ${sla.source_ref}` : ""}
                    </p>
                    {sla.reviewed_by_user ? (
                      <p className="mt-2 text-xs text-text-body">
                        Revisado por {sla.reviewed_by_user.display_name || sla.reviewed_by_user.name || sla.reviewed_by_user.email}
                        {sla.reviewed_at ? ` em ${formatDateTime(sla.reviewed_at)}` : ""}
                      </p>
                    ) : null}
                  </div>
                ))
              ) : (
                <EmptyState
                  title="Sem SLA registrado"
                  description="Ainda não há SLAs formais para este ativo. Use o formulário abaixo para criar o primeiro registro."
                />
              )}
            </div>

            <div className="rounded-2xl border border-dashed border-border bg-bg-subtle/70 p-4">
              <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                <label className="space-y-2">
                  <span className="text-sm font-medium text-text-body">Tipo de SLA</span>
                  <Select onChange={(event) => onChange({ sla_kind: event.target.value })} value={form.sla_kind}>
                    <option value="freshness">freshness</option>
                    <option value="review">review</option>
                    <option value="quality">quality</option>
                  </Select>
                </label>
                <label className="space-y-2">
                  <span className="text-sm font-medium text-text-body">Horas de SLA</span>
                  <Input onChange={(event) => onChange({ sla_hours: event.target.value })} type="number" value={form.sla_hours} />
                </label>
                <label className="space-y-2">
                  <span className="text-sm font-medium text-text-body">Status</span>
                  <Select onChange={(event) => onChange({ status: event.target.value })} value={form.status}>
                    <option value="active">active</option>
                    <option value="inactive">inactive</option>
                    <option value="draft">draft</option>
                  </Select>
                </label>
                <label className="space-y-2">
                  <span className="text-sm font-medium text-text-body">Origem</span>
                  <Input onChange={(event) => onChange({ source_kind: event.target.value })} value={form.source_kind} />
                </label>
                <label className="space-y-2">
                  <span className="text-sm font-medium text-text-body">Referência</span>
                  <Input onChange={(event) => onChange({ source_ref: event.target.value })} value={form.source_ref} />
                </label>
                <div />
              </div>
              <label className="mt-4 space-y-2">
                <span className="text-sm font-medium text-text-body">Contexto JSON</span>
                <Textarea
                  className="min-h-[96px] font-mono text-xs"
                  onChange={(event) => onChange({ context_json: event.target.value })}
                  placeholder='{"notes":"SLA definido a partir do impacto operacional"}'
                  value={form.context_json}
                />
              </label>
              <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
                <p className="text-xs leading-5 text-muted">
                  O SLA é salvo por tipo de ativo + kind. Reabrir o mesmo kind atualiza o registro em vez de criar duplicidade.
                </p>
                <Button disabled={!canMutate} onClick={onSubmit} size="sm">
                  <Clock3 className="mr-2 h-4 w-4" />
                  Salvar SLA
                </Button>
              </div>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}

function ChangeRequestComposer({
  canMutate,
  assetScope,
  form,
  loading,
  onChange,
  onSubmit,
}: {
  canMutate: boolean;
  assetScope: AssetScope | null;
  form: ChangeRequestForm;
  loading: boolean;
  onChange: (patch: Partial<ChangeRequestForm>) => void;
  onSubmit: () => void;
}) {
  return (
    <Card className="border-border bg-surface shadow-[0_12px_36px_rgba(15,23,42,0.05)]">
      <CardHeader className="pb-3">
        <div className="flex items-center gap-2 text-sm font-semibold text-text-body">
          <FileText className="h-4 w-4 text-info-600" />
          Nova solicitação de mudança
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {loading ? (
          <Skeleton className="h-56 w-full" />
        ) : !assetScope ? (
          <EmptyState
            title="Selecione um ativo para criar mudanças"
            description="Use o seletor acima para carregar uma tabela ou coluna antes de abrir uma solicitação."
          />
        ) : (
          <>
            <div className="rounded-2xl border border-border bg-bg-subtle/70 p-3 text-sm text-text-body">
              <p className="font-medium text-text">{assetScope.asset_name || assetScope.asset_fqn || "Ativo selecionado"}</p>
              <p className="mt-1 text-xs text-muted">
                {assetScope.asset_type} #{assetScope.asset_id}
                {assetScope.asset_fqn ? ` • ${assetScope.asset_fqn}` : ""}
              </p>
            </div>
            <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
              <label className="space-y-2">
                <span className="text-sm font-medium text-text-body">Tipo de mudança</span>
                <Select onChange={(event) => onChange({ change_kind: event.target.value })} value={form.change_kind}>
                  {CHANGE_KIND_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </Select>
              </label>
              <label className="space-y-2 xl:col-span-2">
                <span className="text-sm font-medium text-text-body">Título</span>
                <Input
                  onChange={(event) => onChange({ title: event.target.value })}
                  placeholder="Ex.: Definir owner da tabela"
                  value={form.title}
                />
              </label>
            </div>
            <label className="space-y-2">
              <span className="text-sm font-medium text-text-body">Descrição</span>
              <Textarea
                className="min-h-[96px]"
                onChange={(event) => onChange({ description: event.target.value })}
                placeholder="Explique a mudança, a motivação e o impacto esperado."
                value={form.description}
              />
            </label>
            <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
              <label className="space-y-2">
                <span className="text-sm font-medium text-text-body">Policy rule key</span>
                <Input
                  onChange={(event) => onChange({ policy_rule_key: event.target.value })}
                  placeholder="Opcional"
                  value={form.policy_rule_key}
                />
              </label>
              <label className="space-y-2">
                <span className="text-sm font-medium text-text-body">Recommendation ID</span>
                <Input
                  onChange={(event) => onChange({ recommendation_id: event.target.value })}
                  placeholder="Opcional"
                  type="number"
                  value={form.recommendation_id}
                />
              </label>
              <div />
            </div>
            <div className="grid gap-3 xl:grid-cols-3">
              <label className="space-y-2">
                <span className="text-sm font-medium text-text-body">Valor atual JSON</span>
                <Textarea
                  className="min-h-[120px] font-mono text-xs"
                  onChange={(event) => onChange({ current_value_json: event.target.value })}
                  placeholder='{"data_owner_id": 1}'
                  value={form.current_value_json}
                />
              </label>
              <label className="space-y-2">
                <span className="text-sm font-medium text-text-body">Valor proposto JSON</span>
                <Textarea
                  className="min-h-[120px] font-mono text-xs"
                  onChange={(event) => onChange({ proposed_value_json: event.target.value })}
                  placeholder='{"data_owner_id": 2} ou {"sla_kind":"freshness","sla_hours":24}'
                  value={form.proposed_value_json}
                />
              </label>
              <label className="space-y-2">
                <span className="text-sm font-medium text-text-body">Contexto JSON</span>
                <Textarea
                  className="min-h-[120px] font-mono text-xs"
                  onChange={(event) => onChange({ context_json: event.target.value })}
                  placeholder='{"reason":"Mudança acordada com o owner"}'
                  value={form.context_json}
                />
              </label>
            </div>
            <div className="flex flex-wrap items-center justify-between gap-3">
              <p className="text-xs leading-5 text-muted">
                As mudanças seguem o fluxo draft → review → approve → apply. O payload JSON é reaproveitado na aplicação final.
              </p>
              <Button disabled={!canMutate} onClick={onSubmit} size="sm">
                <Workflow className="mr-2 h-4 w-4" />
                Criar solicitação
              </Button>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}

export function ChangeManagementPage() {
  const auth = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const canMutate = auth.canAction("write", "stewardship") || auth.canAction("write", "configuration") || auth.canEdit;

  const [assetTypeInput, setAssetTypeInput] = useState<AssetType>("table");
  const [assetIdInput, setAssetIdInput] = useState("");
  const [selectedAsset, setSelectedAsset] = useState<AssetSuggestion | null>(null);
  const [assetScope, setAssetScope] = useState<AssetScope | null>(null);
  const [assetSlaList, setAssetSlaList] = useState<GovernanceChangeManagementAssetSlaList | null>(null);
  const [changeRequests, setChangeRequests] = useState<GovernanceChangeManagementRequestList | null>(null);
  const [loading, setLoading] = useState(true);
  const [notice, setNotice] = useState<Notice>(null);
  const [reloadKey, setReloadKey] = useState(0);
  const [transitionComment, setTransitionComment] = useState("");
  const [slaForm, setSlaForm] = useState<AssetSlaForm>(DEFAULT_SLA_FORM);
  const [requestForm, setRequestForm] = useState<ChangeRequestForm>(DEFAULT_REQUEST_FORM);

  const selectedScopeLabel = useMemo(() => {
    if (!assetScope) return "Escopo global";
    return `${assetScope.asset_type === "table" ? "Tabela" : "Coluna"} #${assetScope.asset_id}`;
  }, [assetScope]);

  useEffect(() => {
    let active = true;
    const assetTypeParam = normalizeAssetType(searchParams.get("assetType"));
    const assetIdParam = searchParams.get("assetId")?.trim() || "";
    setAssetTypeInput(assetTypeParam);
    setAssetIdInput(assetIdParam);
    setLoading(true);
    setNotice(null);
    void (async () => {
      try {
        if (!assetIdParam) {
          const requests = await governanceSdk.listGovernanceChangeRequests({ page: 1, page_size: 8 });
          if (!active) return;
          setAssetScope(null);
          setAssetSlaList(null);
          setChangeRequests(requests);
          return;
        }

        const assetId = Number(assetIdParam);
        if (!Number.isFinite(assetId) || assetId <= 0) {
          throw new Error("Informe um asset ID válido.");
        }

        const [slaList, requests] = await Promise.all([
          governanceSdk.listGovernanceAssetSlas({ asset_type: assetTypeParam, asset_id: assetId }),
          governanceSdk.listGovernanceChangeRequests({ asset_type: assetTypeParam, asset_id: assetId, page: 1, page_size: 8 }),
        ]);
        if (!active) return;
        setAssetScope({
          asset_type: assetTypeParam,
          asset_id: assetId,
          asset_name: slaList.asset_name || requests.items[0]?.asset_name || null,
          asset_fqn: slaList.asset_fqn || requests.items[0]?.asset_fqn || null,
        });
        setAssetSlaList(slaList);
        setChangeRequests(requests);
      } catch (err) {
        if (!active) return;
        setAssetScope(null);
        setAssetSlaList(null);
        setChangeRequests(null);
        setNotice({ tone: "error", message: (err as Error).message });
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => {
      active = false;
    };
  }, [reloadKey, searchParams]);

  function refreshScope() {
    setReloadKey((current) => current + 1);
  }

  function updateSlaForm(patch: Partial<AssetSlaForm>) {
    setSlaForm((current) => ({ ...current, ...patch }));
  }

  function updateRequestForm(patch: Partial<ChangeRequestForm>) {
    setRequestForm((current) => ({ ...current, ...patch }));
  }

  function selectAssetScope() {
    const normalizedAssetId = Number(assetIdInput.trim());
    if (!assetIdInput.trim()) {
      router.replace("/governance/change-management");
      return;
    }
    if (!Number.isFinite(normalizedAssetId) || normalizedAssetId <= 0) {
      setNotice({ tone: "error", message: "Informe um asset ID numérico válido." });
      return;
    }
    const params = new URLSearchParams();
    params.set("assetType", assetTypeInput);
    params.set("assetId", String(normalizedAssetId));
    router.replace(`/governance/change-management?${params.toString()}`);
  }

  async function submitSla() {
    if (!assetScope) {
      setNotice({ tone: "error", message: "Selecione um ativo antes de salvar um SLA." });
      return;
    }
    try {
      const contextJson = safeParseJson(slaForm.context_json || "{}", {});
      const payload: GovernanceChangeManagementAssetSlaInput = {
        asset_type: assetScope.asset_type,
        asset_id: assetScope.asset_id,
        sla_kind: slaForm.sla_kind.trim() || "freshness",
        sla_hours: Number(slaForm.sla_hours),
        status: slaForm.status.trim() || "active",
        source_kind: slaForm.source_kind.trim() || "manual",
        source_ref: slaForm.source_ref.trim() || null,
        context_json: contextJson,
      };
      if (!Number.isFinite(payload.sla_hours) || payload.sla_hours <= 0) {
        throw new Error("Informe uma quantidade de horas válida para o SLA.");
      }
      await governanceSdk.upsertGovernanceAssetSla(payload);
      setNotice({ tone: "success", message: "SLA salvo com sucesso." });
      refreshScope();
    } catch (err) {
      setNotice({ tone: "error", message: (err as Error).message });
    }
  }

  async function submitChangeRequest() {
    if (!assetScope) {
      setNotice({ tone: "error", message: "Selecione um ativo antes de criar a solicitação." });
      return;
    }
    try {
      const recommendationId = requestForm.recommendation_id.trim() ? Number(requestForm.recommendation_id) : null;
      const payload: GovernanceChangeManagementRequestInput = {
        asset_type: assetScope.asset_type,
        asset_id: assetScope.asset_id,
        change_kind: requestForm.change_kind.trim(),
        title: requestForm.title.trim(),
        description: requestForm.description.trim() || null,
        policy_rule_key: requestForm.policy_rule_key.trim() || null,
        recommendation_id: recommendationId,
        current_value_json: safeParseJson(requestForm.current_value_json || "{}", {}),
        proposed_value_json: safeParseJson(requestForm.proposed_value_json || "{}", {}),
        context_json: safeParseJson(requestForm.context_json || "{}", {}),
      };
      if (recommendationId !== null && (!Number.isFinite(recommendationId) || recommendationId <= 0)) {
        throw new Error("Informe uma recommendation ID válida ou deixe o campo vazio.");
      }
      await governanceSdk.createGovernanceChangeRequest(payload);
      setNotice({ tone: "success", message: "Solicitação de mudança criada." });
      refreshScope();
    } catch (err) {
      setNotice({ tone: "error", message: (err as Error).message });
    }
  }

  async function transitionRequest(requestRef: string, transition: "review" | "approve" | "apply" | "reject") {
    const payload: GovernanceChangeManagementTransitionInput = transitionComment.trim()
      ? { comment: transitionComment.trim() }
      : {};
    try {
      if (transition === "review") {
        await governanceSdk.reviewGovernanceChangeRequest(requestRef, payload);
      } else if (transition === "approve") {
        await governanceSdk.approveGovernanceChangeRequest(requestRef, payload);
      } else if (transition === "apply") {
        await governanceSdk.applyGovernanceChangeRequest(requestRef, payload);
      } else {
        await governanceSdk.rejectGovernanceChangeRequest(requestRef, payload);
      }
      setNotice({ tone: "success", message: `Solicitação ${transitionLabel(transition)} com sucesso.` });
      refreshScope();
    } catch (err) {
      setNotice({ tone: "error", message: (err as Error).message });
    }
  }

  const assetRequestCount = changeRequests?.total ?? 0;
  const assetSlaCount = assetSlaList?.total ?? 0;
  const requestItems = changeRequests?.items ?? [];

  return (
    <div className="space-y-6 pb-6">
      <Card className="border-border bg-[linear-gradient(135deg,#ffffff_0%,#f8fafc_55%,#eef6ff_100%)] shadow-[0_18px_48px_rgba(15,23,42,0.06)]">
        <CardContent className="space-y-4 p-6">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div className="space-y-2">
              <div className="flex flex-wrap items-center gap-2">
                <Badge tone="accent">
                  <Workflow className="mr-1 h-3.5 w-3.5" />
                  Mudanças e SLA
                </Badge>
                <Badge tone="neutral">{selectedScopeLabel}</Badge>
                <Badge tone="success">{assetRequestCount} solicitação(ões)</Badge>
                <Badge tone="warning">{assetSlaCount} SLA(s)</Badge>
              </div>
              <h2 className="text-3xl font-semibold tracking-tight text-text">Governança avançada do ativo</h2>
              <p className="max-w-4xl text-sm leading-7 text-text-body">
                Registre SLAs por ativo, crie solicitações de mudança e acompanhe o fluxo draft → review → approve → apply com
                trilha auditável e links diretos para o Explorer.
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <Button asChild size="sm" variant="outline">
                <Link href="/governance/pending-center">
                  Pendências
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Link>
              </Button>
              <Button onClick={refreshScope} size="sm" variant="outline">
                <RefreshCcw className="mr-2 h-4 w-4" />
                Atualizar
              </Button>
            </div>
          </div>

          <div className="grid gap-3 md:grid-cols-[160px_minmax(0,1fr)_auto_auto]">
            <Select onChange={(event) => setAssetTypeInput(normalizeAssetType(event.target.value))} value={assetTypeInput}>
              {ASSET_TYPE_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </Select>
            <AssetSearchInput
              onSelect={(asset) => {
                setSelectedAsset(asset);
                if (asset) {
                  setAssetIdInput(String(asset.id));
                  setAssetTypeInput("table");
                } else {
                  setAssetIdInput("");
                }
              }}
              placeholder="Buscar ativo por nome, schema ou fonte…"
              selected={selectedAsset}
            />
            <Button onClick={selectAssetScope} size="sm">
              Carregar ativo
            </Button>
            <Button
              onClick={() => {
                setSelectedAsset(null);
                setAssetIdInput("");
                router.replace("/governance/change-management");
              }}
              size="sm"
              variant="ghost"
            >
              Limpar escopo
            </Button>
          </div>

          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
            {ASSET_TYPE_OPTIONS.map((option) => (
              <div className="rounded-2xl border border-border bg-surface px-4 py-3" key={option.value}>
                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-muted">{option.label}</p>
                <p className="mt-2 text-sm leading-6 text-text-body">{option.description}</p>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {notice ? (
        <div
          className={
            notice.tone === "success"
              ? "rounded-2xl border border-success-200 bg-success-50 px-4 py-3 text-sm text-success-700"
              : "rounded-2xl border border-danger-200 bg-danger-50 px-4 py-3 text-sm text-danger-700"
          }
        >
          {notice.message}
        </div>
      ) : null}

      {loading ? (
        <div className="grid gap-4 xl:grid-cols-2">
          <Skeleton className="h-[34rem] w-full rounded-3xl" />
          <Skeleton className="h-[34rem] w-full rounded-3xl" />
        </div>
      ) : (
        <div className="grid gap-4 xl:grid-cols-2">
          <AssetSlaCard
            assetSlaList={assetSlaList}
            canMutate={canMutate}
            form={slaForm}
            loading={loading}
            onChange={updateSlaForm}
            onSubmit={() => void submitSla()}
          />
          <ChangeRequestComposer
            assetScope={assetScope}
            canMutate={canMutate}
            form={requestForm}
            loading={loading}
            onChange={updateRequestForm}
            onSubmit={() => void submitChangeRequest()}
          />
        </div>
      )}

      <Card className="border-border bg-surface shadow-[0_12px_36px_rgba(15,23,42,0.05)]">
        <CardHeader className="pb-3">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div className="space-y-2">
              <div className="flex flex-wrap items-center gap-2">
                <Badge tone="accent">
                  <History className="mr-1 h-3.5 w-3.5" />
                  Fila de aprovações
                </Badge>
                <Badge tone="neutral">{assetScope ? "Escopo selecionado" : "Histórico global"}</Badge>
                <Badge tone="neutral">{changeRequests?.total ?? 0} registro(s)</Badge>
              </div>
              <p className="text-sm leading-6 text-text-body">
                A fila abaixo mostra as solicitações recentes com eventos, JSON proposto e ações de review/approve/apply/reject.
              </p>
            </div>
            <Button onClick={refreshScope} size="sm" variant="outline">
              <RefreshCcw className="mr-2 h-4 w-4" />
              Recarregar fila
            </Button>
          </div>
          <label className="space-y-2">
            <span className="text-sm font-medium text-text-body">Comentário para ações na fila</span>
            <Textarea
              className="min-h-[88px]"
              onChange={(event) => setTransitionComment(event.target.value)}
              placeholder="Opcional: um comentário será aplicado às próximas ações executadas na fila."
              value={transitionComment}
            />
          </label>
        </CardHeader>
        <CardContent className="space-y-4">
          {changeRequests === null ? (
            <EmptyState
              title="Fila indisponível"
              description="Não foi possível carregar as solicitações de mudança. Tente atualizar a fila."
            />
          ) : requestItems.length === 0 ? (
            <EmptyState
              title={assetScope ? "Nenhuma solicitação para este ativo" : "Nenhuma solicitação recente"}
              description={
                assetScope
                  ? "Abra uma nova solicitação de mudança ou remova o filtro para ver o histórico global."
                  : "Crie uma solicitação para começar a registrar a trilha de mudança do ativo."
              }
            />
          ) : (
            <div className="space-y-4">
              {requestItems.map((request) => (
                <RequestCard
                  canMutate={canMutate}
                  key={request.id}
                  onTransition={transitionRequest}
                  request={request}
                  transitionComment={transitionComment}
                />
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Card className="border-border bg-bg-subtle/80 shadow-none">
        <CardContent className="space-y-3 p-5">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <p className="text-sm font-semibold text-text">Atalho operacional</p>
              <p className="mt-1 text-sm leading-6 text-text-body">
                Use o Explorer para abrir um ativo com contexto e voltar para esta fila com o mesmo `assetType` e `assetId`.
              </p>
            </div>
            <Button asChild size="sm" variant="outline">
              <Link href="/explorer">
                Abrir Explorer
                <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button asChild size="sm" variant="outline">
              <Link href="/governance/stewardship">Stewardship</Link>
            </Button>
            <Button asChild size="sm" variant="outline">
              <Link href="/governance/pending-center">Pendências</Link>
            </Button>
            <Button asChild size="sm" variant="outline">
              <Link href="/governance/classification-review">Classificação</Link>
            </Button>
          </div>
          {!canMutate ? (
            <p className="text-xs text-warning-700">
              Seu perfil atual mantém acesso de leitura, mas não pode criar ou aplicar mudanças. O backend continua impondo a mesma regra.
            </p>
          ) : null}
        </CardContent>
      </Card>
    </div>
  );
}

export default ChangeManagementPage;
