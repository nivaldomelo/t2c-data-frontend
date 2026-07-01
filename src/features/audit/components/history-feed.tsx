import { Link } from "@/lib/next-shims";
import { useMemo, useState, type ReactNode } from "react";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/cn";

import type { AuditHistoryEvent } from "../types";

type AuditGroup = {
  key: string;
  changeSetId: string | null;
  lead: AuditHistoryEvent;
  events: AuditHistoryEvent[];
  isSensitive: boolean;
};

const TEXT_DIFF_FIELDS = new Set([
  "description",
  "definition",
  "notes",
  "privacy_notes",
  "certification_notes",
  "dictionary_description",
  "dictionary_comment",
  "existing_comment",
]);

function fieldLabel(value: string | null): string {
  const labels: Record<string, string> = {
    owner: "Responsável",
    description: "Descrição",
    definition: "Definição",
    classification: "Classificação",
    certification_status: "Status de certificação",
    certification_criticality: "Criticidade de certificação",
    certification_badges: "Badges de certificação",
    certification_notes: "Notas de certificação",
    certification_review_at: "Data de revisão",
    lifecycle_status: "Ciclo de vida",
    legal_basis: "Base legal",
    retention_policy: "Retenção",
    access_scope: "Escopo de acesso",
    access_roles: "Perfis de acesso",
    privacy_notes: "Notas de privacidade",
    has_personal_data: "Dado pessoal",
    has_sensitive_personal_data: "Dado pessoal sensível",
    is_masked: "Mascaramento",
    external_sharing: "Compartilhamento externo",
    glossary_terms: "Termos de glossário",
    tags: "Tags",
    dictionary_description: "Descrição do dicionário",
    dictionary_comment: "Observação do dicionário",
    existing_comment: "Comentário existente",
    friendly_name: "Nome amigável",
    alias: "Alias",
    synonym: "Sinônimo",
    label_kind: "Tipo do rótulo",
  };
  if (!value) return "Campo";
  return labels[value] ?? value.replaceAll("_", " ");
}

function entityLabel(value: string | null): string {
  const labels: Record<string, string> = {
    table: "Tabela",
    column: "Coluna",
    glossary_term: "Termo de glossário",
    tag: "Tag",
    owner: "Owner",
    datasource: "Fonte",
    database: "Banco",
    schema: "Schema",
    classification: "Classificação",
    governance_settings: "Configuração de governança",
  };
  if (!value) return "Entidade";
  return labels[value] ?? value.replaceAll("_", " ");
}

function sourceModuleLabel(value: string | null): string {
  const labels: Record<string, string> = {
    catalog: "Catálogo",
    glossary: "Glossário",
    tags: "Tags",
    certification: "Certificação",
    privacy_access: "Privacidade e acesso",
    "privacy-access": "Privacidade e acesso",
    governance: "Governança",
    search: "Busca",
    dashboard: "Dashboard",
    incidents: "Incidentes",
    lineage: "Linhagem",
    admin: "Administração",
  };
  if (!value) return "";
  return labels[value] ?? value.replaceAll("_", " ");
}

function actionLabel(value: string | null): string {
  const labels: Record<string, string> = {
    "admin.governance_settings.update": "Atualização de parâmetros de governança",
    "table.certification.patch": "Atualização de certificação",
    "table.metadata.patch": "Atualização de metadados",
    "table.owner.patch": "Atualização de owner",
    "table.privacy.patch": "Atualização de privacidade",
  };
  if (!value) return "Mudança registrada";
  return labels[value] ?? value.replaceAll(".", " • ").replaceAll("_", " ");
}

function changeTypeLabel(value: string | null): string {
  const labels: Record<string, string> = {
    assign: "Atribuição",
    unassign: "Desassociação",
    update: "Atualização",
    certify: "Certificação",
    decertify: "Descertificação",
    reclassify: "Reclassificação",
    create: "Criação",
    delete: "Remoção",
  };
  return labels[value || ""] ?? "Mudança";
}

function changeTone(value: string | null): "neutral" | "accent" | "success" | "warning" {
  if (value === "certify") return "success";
  if (value === "decertify" || value === "reclassify" || value === "delete") return "warning";
  if (value === "assign" || value === "create") return "accent";
  return "neutral";
}

function sensitivityLabel(value: string | null): string {
  const labels: Record<string, string> = {
    owner: "Mudança sensível: owner",
    certification: "Mudança sensível: certificação",
    classification: "Mudança sensível: classificação",
    governance: "Mudança sensível",
  };
  return labels[value || ""] ?? "Mudança sensível";
}

function stringifyValue(value: unknown): string {
  if (value == null || value === "") return "";
  if (Array.isArray(value)) return value.join(", ");
  if (typeof value === "object") {
    const payload = value as { label?: string; email?: string; value?: string | number | boolean | null };
    const label = payload.label ?? payload.value;
    const extra = payload.email ? ` (${payload.email})` : "";
    return `${label ?? "Valor"}${extra}`;
  }
  return String(value);
}

function renderValue(value: unknown): ReactNode {
  const text = stringifyValue(value);
  if (!text) return <span className="text-muted">Não informado</span>;
  if (text.length <= 180) return <span>{text}</span>;
  return (
    <details className="group">
      <summary className="cursor-pointer text-text-body marker:text-muted">
        {text.slice(0, 180)}
        <span className="text-muted">… ver completo</span>
      </summary>
      <p className="mt-2 whitespace-pre-wrap text-text-body">{text}</p>
    </details>
  );
}

function contextPath(event: AuditHistoryEvent): string {
  const parts = [event.datasource_name, event.database_name, event.schema_name, event.table_name].filter(Boolean);
  return parts.length ? parts.join(" > ") : `${event.entity_type || "entidade"} #${event.entity_id || "—"}`;
}

function targetHref(event: AuditHistoryEvent): string | null {
  if (event.table_id) return `/explorer?tableId=${event.table_id}&tab=history`;
  return null;
}

function buildGroups(events: AuditHistoryEvent[]): AuditGroup[] {
  const groups = new Map<string, AuditGroup>();
  for (const event of events) {
    const key = event.change_set_id || `event:${event.id}`;
    const current = groups.get(key);
    if (current) {
      current.events.push(event);
      current.isSensitive = current.isSensitive || event.is_sensitive_change;
      continue;
    }
    groups.set(key, {
      key,
      changeSetId: event.change_set_id,
      lead: event,
      events: [event],
      isSensitive: event.is_sensitive_change,
    });
  }
  return Array.from(groups.values());
}

function diffText(before: string, after: string) {
  if (before === after) return null;
  let prefix = 0;
  const maxPrefix = Math.min(before.length, after.length);
  while (prefix < maxPrefix && before[prefix] === after[prefix]) prefix += 1;

  let suffix = 0;
  const maxSuffix = Math.min(before.length - prefix, after.length - prefix);
  while (
    suffix < maxSuffix &&
    before[before.length - 1 - suffix] === after[after.length - 1 - suffix]
  ) {
    suffix += 1;
  }

  return {
    prefix: before.slice(0, prefix),
    removed: before.slice(prefix, before.length - suffix),
    added: after.slice(prefix, after.length - suffix),
    suffix: after.slice(after.length - suffix),
  };
}

function renderLongTextDiff(event: AuditHistoryEvent) {
  const before = stringifyValue(event.before_value);
  const after = stringifyValue(event.after_value);
  if (!before && !after) return null;
  const fieldName = (event.field_name || "").toLowerCase();
  const shouldDiff =
    TEXT_DIFF_FIELDS.has(fieldName) || before.length > 120 || after.length > 120 || before.includes("\n") || after.includes("\n");
  if (!shouldDiff || !before || !after) return null;
  const delta = diffText(before, after);
  if (!delta) return null;
  return (
    <div className="rounded-2xl border border-border bg-bg-subtle/70 p-4">
      <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-brand-600">Diff textual</p>
      <div className="mt-3 space-y-3 text-sm leading-6 text-text-body">
        {delta.prefix ? <p className="whitespace-pre-wrap text-muted">{delta.prefix}</p> : null}
        {delta.removed ? (
          <p className="whitespace-pre-wrap rounded-xl bg-danger-50 px-3 py-2 text-danger-700 line-through decoration-rose-300">
            {delta.removed}
          </p>
        ) : null}
        {delta.added ? (
          <p className="whitespace-pre-wrap rounded-xl bg-success-50 px-3 py-2 text-success-700">
            {delta.added}
          </p>
        ) : null}
        {delta.suffix ? <p className="whitespace-pre-wrap text-muted">{delta.suffix}</p> : null}
      </div>
    </div>
  );
}

function EventCard({ event }: { event: AuditHistoryEvent }) {
  const href = targetHref(event);
  const diffBlock = renderLongTextDiff(event);
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="space-y-2">
          <div className="flex flex-wrap items-center gap-2">
            <Badge tone={changeTone(event.change_type)}>{changeTypeLabel(event.change_type)}</Badge>
            <Badge tone="neutral">{fieldLabel(event.field_name)}</Badge>
            {event.source_module ? <Badge tone="neutral">{sourceModuleLabel(event.source_module)}</Badge> : null}
            {event.is_sensitive_change ? <Badge tone="warning">{sensitivityLabel(event.sensitive_category)}</Badge> : null}
            {event.entity_type ? <Badge tone="neutral">{entityLabel(event.entity_type)}</Badge> : null}
          </div>
          <div>
            <p className="text-sm font-semibold text-text">
              {fieldLabel(event.field_name)} alterado
              {event.table_name ? ` em ${event.table_name}` : ""}
            </p>
            <p className="mt-1 text-xs text-muted">{contextPath(event)}</p>
          </div>
        </div>
        <div className="text-right text-xs text-muted">
          <p>{new Date(event.changed_at).toLocaleString("pt-BR")}</p>
          <p className="mt-1">{event.actor_name || event.actor_email || "Sistema"}</p>
        </div>
      </div>

      {diffBlock ? (
        diffBlock
      ) : (
        <div className="grid gap-3 lg:grid-cols-2">
          <div className="rounded-2xl border border-danger-100 bg-danger-50/70 p-3">
            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-danger-600">Antes</p>
            <div className="mt-2 text-sm text-text-body">{renderValue(event.before_value)}</div>
          </div>
          <div className="rounded-2xl border border-success-100 bg-success-50/70 p-3">
            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-success-600">Depois</p>
            <div className="mt-2 text-sm text-text-body">{renderValue(event.after_value)}</div>
          </div>
        </div>
      )}

      <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border pt-3">
        <p className="text-xs text-muted">
          {event.metadata_json && "message" in event.metadata_json && typeof event.metadata_json.message === "string"
            ? event.metadata_json.message
            : actionLabel(event.action)}
        </p>
        {href ? (
          <Link className="text-xs font-semibold text-info-700 hover:text-info-700" href={href}>
            Abrir ativo
          </Link>
        ) : null}
      </div>
    </div>
  );
}

export function AuditHistoryFeed({
  events,
  loading,
  emptyTitle,
  emptyDescription,
  compact = false,
}: {
  events: AuditHistoryEvent[];
  loading: boolean;
  emptyTitle: string;
  emptyDescription: string;
  compact?: boolean;
}) {
  const groups = useMemo(() => buildGroups(events), [events]);
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});

  if (loading) {
    return (
      <div className="space-y-3">
        {Array.from({ length: compact ? 4 : 6 }).map((_, index) => (
          <Skeleton className={cn("w-full rounded-2xl", compact ? "h-32" : "h-40")} key={index} />
        ))}
      </div>
    );
  }

  if (!groups.length) {
    return <EmptyState title={emptyTitle} description={emptyDescription} />;
  }

  return (
    <div className="space-y-3">
      {groups.map((group) => {
        const isExpanded = expanded[group.key] ?? !compact;
        return (
          <Card
            className={cn(
              "border-border/80 shadow-[0_10px_24px_rgba(15,23,42,0.04)]",
              group.isSensitive && "border-warning-200/90 bg-warning-50/30",
            )}
            key={group.key}
          >
            <CardContent className={cn("space-y-4", compact ? "p-4" : "p-5")}>
              {group.events.length > 1 ? (
                <div className="space-y-4">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="space-y-2">
                      <div className="flex flex-wrap items-center gap-2">
                        <Badge tone="accent">{group.events.length} mudanças</Badge>
                        {group.lead.source_module ? <Badge tone="neutral">{group.lead.source_module}</Badge> : null}
                        {group.isSensitive ? <Badge tone="warning">{sensitivityLabel(group.lead.sensitive_category)}</Badge> : null}
                      </div>
                      <div>
                        <p className="text-sm font-semibold text-text">
                          Ação agrupada com {group.events.length} alterações relacionadas
                        </p>
                        <p className="mt-1 text-xs text-muted">{contextPath(group.lead)}</p>
                      </div>
                    </div>
                    <div className="flex items-start gap-3">
                      <div className="text-right text-xs text-muted">
                        <p>{new Date(group.lead.changed_at).toLocaleString("pt-BR")}</p>
                        <p className="mt-1">{group.lead.actor_name || group.lead.actor_email || "Sistema"}</p>
                      </div>
                      <button
                        className="rounded-full border border-border px-3 py-1 text-xs font-semibold text-text-body hover:border-border-strong hover:bg-bg-subtle"
                        onClick={() => setExpanded((current) => ({ ...current, [group.key]: !isExpanded }))}
                        type="button"
                      >
                        {isExpanded ? "Recolher" : "Expandir"}
                      </button>
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-2">
                    {group.events.slice(0, isExpanded ? group.events.length : 3).map((event) => (
                      <Badge key={event.id} tone={changeTone(event.change_type)}>
                        {fieldLabel(event.field_name)}
                      </Badge>
                    ))}
                    {!isExpanded && group.events.length > 3 ? <Badge tone="neutral">+{group.events.length - 3} mudanças</Badge> : null}
                  </div>

                  {isExpanded ? (
                    <div className="space-y-4 border-t border-border pt-4">
                      {group.events.map((event, index) => (
                        <div
                          className={cn(index > 0 && "border-t border-dashed border-border pt-4")}
                          key={event.id}
                        >
                          <EventCard event={event} />
                        </div>
                      ))}
                    </div>
                  ) : null}
                </div>
              ) : (
                <EventCard event={group.lead} />
              )}
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
