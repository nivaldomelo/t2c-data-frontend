import { ApiError } from "@/lib/client-api";

import type { InboxNotification, InboxStateFilter } from "../types";
import type { ActionFilter, DeliveryFilter, OriginFilter, SeverityFilter, ViewMode } from "./inbox-types";

export function formatDateTime(value?: string | null) {
  if (!value) return "Não definido";
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return "Não definido";
  return parsed.toLocaleString("pt-BR");
}

export function severityTone(severity: string): "success" | "accent" | "warning" | "danger" | "neutral" {
  if (severity === "critical" || severity === "high") return "danger";
  if (severity === "medium") return "warning";
  if (severity === "low") return "success";
  return "neutral";
}

export function categoryTone(category: string): "success" | "accent" | "warning" | "neutral" {
  if (category === "governance") return "accent";
  if (category === "stewardship") return "success";
  if (category === "operations") return "warning";
  if (category === "data_quality") return "accent";
  return "neutral";
}

export function stateTone(state: string): "success" | "accent" | "warning" | "neutral" {
  if (state === "unread") return "warning";
  if (state === "read") return "accent";
  return "neutral";
}

export function deliveryTone(state: string): "success" | "accent" | "warning" | "danger" | "neutral" {
  if (state === "delivered") return "success";
  if (state === "pending") return "warning";
  if (state === "failed") return "danger";
  if (state === "skipped") return "accent";
  return "neutral";
}

export function categoryLabel(category: string) {
  if (category === "governance") return "Governança";
  if (category === "stewardship") return "Stewardship";
  if (category === "operations") return "Operação";
  if (category === "data_quality") return "Qualidade de dados";
  return category;
}

export function severityLabel(severity: string) {
  if (severity === "critical") return "Crítica";
  if (severity === "high") return "Alta";
  if (severity === "medium") return "Média";
  if (severity === "low") return "Baixa";
  if (severity === "info") return "Info";
  return severity;
}

export function stateLabel(state: string) {
  if (state === "unread") return "Não lida";
  if (state === "read") return "Lida";
  if (state === "archived") return "Arquivada";
  return state;
}

export function deliveryLabel(state: string) {
  if (state === "delivered") return "Entregue";
  if (state === "pending") return "Em entrega";
  if (state === "failed") return "Falha externa";
  if (state === "skipped") return "Ignorada";
  if (state === "none") return "Sem entrega";
  return state;
}

export function moduleLabel(sourceModule: string) {
  const value = (sourceModule || "").toLowerCase();
  if (value.startsWith("data_quality") || value === "dq" || value.startsWith("dq_")) return "Data Quality";
  if (value.startsWith("stewardship")) return "Stewardship";
  if (value.startsWith("governance")) return "Governança";
  if (value.startsWith("incidents")) return "Incidentes";
  if (value.startsWith("privacy")) return "Privacidade";
  if (value.startsWith("ingestion")) return "Ingestão";
  if (value.startsWith("operations")) return "Operação";
  if (value.startsWith("ops")) return "Ops";
  if (value.startsWith("platform")) return "Plataforma";
  if (!sourceModule) return "Origem não informada";
  return sourceModule;
}

export function originKey(item: InboxNotification): OriginFilter {
  const module = (item.source_module || "").toLowerCase();
  if (module.startsWith("data_quality") || module === "dq" || module.startsWith("dq_")) return "data_quality";
  if (module.startsWith("stewardship")) return "stewardship";
  if (module.startsWith("governance")) return "governance";
  if (module.startsWith("incidents")) return "incidents";
  if (module.startsWith("privacy")) return "privacy";
  if (module.startsWith("ingestion") || module.startsWith("operations") || module.startsWith("ops")) return "operations";
  if (module.startsWith("platform")) return "platform";
  return module ? "other" : "other";
}

export function originLabel(item: InboxNotification) {
  return moduleLabel(item.source_module);
}

export function notificationSignature(item: InboxNotification): string {
  const context = item.context_json && typeof item.context_json === "object" ? item.context_json : null;
  const contextPieces = context
    ? [
        typeof context.kind === "string" ? context.kind : "",
        typeof context.rule_name === "string" ? context.rule_name : "",
        typeof context.table_fqn === "string" ? context.table_fqn : "",
        typeof context.request_type === "string" ? context.request_type : "",
        typeof context.asset_name === "string" ? context.asset_name : "",
        typeof context.workflow === "string" ? context.workflow : "",
        typeof context.status === "string" ? context.status : "",
      ]
    : [];
  return [
    item.category,
    item.severity,
    item.source_module,
    item.source_entity_type,
    item.source_entity_id,
    item.title,
    item.message,
    ...contextPieces,
  ]
    .map((part) => String(part || "").trim().toLowerCase())
    .filter(Boolean)
    .join(" | ");
}

export function recurrenceCountFor(item: InboxNotification, recurrenceMap: Map<string, number>) {
  return recurrenceMap.get(notificationSignature(item)) ?? 1;
}

export function dqContextSummary(item: InboxNotification): string | null {
  const context = item.context_json;
  if (!context || typeof context !== "object") return null;
  const kind = typeof context.kind === "string" ? context.kind : "";
  if (!kind.startsWith("dq_")) return null;

  const parts: string[] = [];
  const tableFqn = typeof context.table_fqn === "string" ? context.table_fqn : "";
  const ruleName = typeof context.rule_name === "string" ? context.rule_name : "";
  const violationsCount = typeof context.violations_count === "number" ? context.violations_count : null;
  const dqScore = typeof context.dq_score === "number" ? context.dq_score : null;

  if (tableFqn) parts.push(tableFqn);
  if (ruleName) parts.push(`Regra: ${ruleName}`);
  if (violationsCount !== null) parts.push(`Violações: ${violationsCount}`);
  if (dqScore !== null) parts.push(`Score: ${dqScore.toFixed(1)}`);

  return parts.length ? parts.join(" · ") : null;
}

export function stewardshipContextSummary(item: InboxNotification): string | null {
  const context = item.context_json;
  if (!context || typeof context !== "object") return null;
  if (!item.category?.startsWith("stewardship") && !String(item.source_module || "").startsWith("stewardship")) return null;

  const parts: string[] = [];
  const candidates = [
    "request_type",
    "workflow",
    "action",
    "asset_name",
    "owner_name",
    "status",
    "approver_name",
    "request_id",
  ] as const;
  for (const key of candidates) {
    const value = context[key];
    if (typeof value === "string" && value.trim()) parts.push(value.trim());
  }
  return parts.length ? parts.join(" · ") : null;
}

export function contextualActionLabel(item: InboxNotification) {
  const href = item.href || "";
  if (href.startsWith("/explorer")) return "Abrir ativo";
  if (href.startsWith("/incidents")) return "Abrir incidente";
  if (href.startsWith("/governance/pending-center")) return "Abrir pendência";
  if (href.startsWith("/governance/stewardship")) return "Abrir stewardship";
  if (href.startsWith("/data-owners")) return "Abrir owners";
  if (href.startsWith("/certification")) return "Abrir certificação";
  if (href.startsWith("/data-quality/rules")) return "Abrir regra";
  if (href.startsWith("/data-quality")) return "Abrir DQ";
  if (href.startsWith("/ops")) return "Abrir operação";
  if (href.startsWith("/privacy-access")) return "Abrir privacidade";
  return "Abrir contexto";
}

export function deliveryExplanation(item: InboxNotification) {
  if (item.delivery_state === "delivered") {
    return "A notificação também foi espelhada para um canal externo configurado.";
  }
  if (item.delivery_state === "pending") {
    return "A entrega externa está em processamento para Slack, Teams ou outro canal elegível.";
  }
  if (item.delivery_state === "failed") {
    return "A entrega externa falhou. Consulte a tela de notificações externas para diagnosticar o motivo.";
  }
  if (item.delivery_state === "skipped") {
    return "A regra atual ignorou a entrega externa para este item.";
  }
  return "A notificação permanece no Inbox interno. Entrega externa pode não existir, não ser elegível ou não estar configurada.";
}

export function inboxErrorMessage(error: unknown) {
  if (error instanceof ApiError) {
    if (error.status === 403) return "Você não tem permissão para visualizar o Inbox com este perfil.";
    if (error.status === 404) {
      if (error.message && error.message !== "Not Found") return error.message;
      return "O serviço de Inbox não foi encontrado.";
    }
    if (error.status >= 500) return "O serviço de Inbox está indisponível no momento.";
    return error.message || "Não foi possível carregar o Inbox.";
  }
  if (error instanceof Error && error.message.trim()) return error.message;
  return "Não foi possível carregar o Inbox.";
}

export function priorityBucket(item: InboxNotification): string {
  if (item.state === "unread" && item.severity === "critical") return "Críticas não lidas";
  if (item.state === "unread" && item.severity === "high") return "Altas não lidas";
  if (item.state !== "archived" && Boolean(item.href)) return "Com ação pendente";
  if (item.delivery_state === "none") return "Sem entrega externa";
  if (item.delivery_state === "failed") return "Falhas externas";
  if (item.delivery_state === "pending") return "Em entrega";
  if (item.state === "read") return "Lidas recentes";
  return "Arquivadas";
}

export function assetGroupLabel(item: InboxNotification): string {
  const context = item.context_json;
  if (context && typeof context === "object" && typeof context.table_fqn === "string" && context.table_fqn.trim()) {
    return context.table_fqn.trim();
  }
  if (item.source_entity_type && item.source_entity_id) {
    return `${item.source_entity_type} · ${item.source_entity_id}`;
  }
  if (item.source_module) {
    return moduleLabel(item.source_module);
  }
  return "Ativo não informado";
}

export function itemMatchesFilters(
  item: InboxNotification,
  filters: {
    state: InboxStateFilter;
    category: string;
    severity: SeverityFilter;
    delivery: DeliveryFilter;
    action: ActionFilter;
    origin: OriginFilter;
    recurringOnly: boolean;
    recurrenceMap: Map<string, number>;
  },
) {
  const recurrenceCount = recurrenceCountFor(item, filters.recurrenceMap);
  if (filters.state !== "all" && item.state !== filters.state) return false;
  if (filters.category !== "all" && item.category !== filters.category) return false;
  if (filters.severity !== "all" && item.severity !== filters.severity) return false;
  if (filters.delivery !== "all" && item.delivery_state !== filters.delivery) return false;
  if (filters.action === "with_action" && !item.href) return false;
  if (filters.action === "without_action" && item.href) return false;
  if (filters.origin !== "all" && originKey(item) !== filters.origin) return false;
  if (filters.recurringOnly && recurrenceCount < 2) return false;
  return true;
}

export function sortNotifications(items: InboxNotification[], mode: ViewMode) {
  const byDateDesc = (left: InboxNotification, right: InboxNotification) =>
    new Date(right.created_at).getTime() - new Date(left.created_at).getTime();
  const priorityRank = (item: InboxNotification) => {
    if (item.state === "unread" && item.severity === "critical") return 0;
    if (item.state === "unread" && item.severity === "high") return 1;
    if (item.state !== "archived" && Boolean(item.href)) return 2;
    if (item.delivery_state === "failed") return 3;
    if (item.delivery_state === "pending") return 4;
    if (item.delivery_state === "none") return 5;
    if (item.state === "read") return 6;
    return 7;
  };

  if (mode === "date") {
    return [...items].sort(byDateDesc);
  }

  if (mode === "priority") {
    return [...items].sort((left, right) => {
      const delta = priorityRank(left) - priorityRank(right);
      if (delta !== 0) return delta;
      return byDateDesc(left, right);
    });
  }

  if (mode === "category") {
    const categoryOrder = new Map([
      ["data_quality", 0],
      ["stewardship", 1],
      ["governance", 2],
      ["operations", 3],
    ]);
    return [...items].sort((left, right) => {
      const leftOrder = categoryOrder.get(left.category) ?? 99;
      const rightOrder = categoryOrder.get(right.category) ?? 99;
      if (leftOrder !== rightOrder) return leftOrder - rightOrder;
      const delta = priorityRank(left) - priorityRank(right);
      if (delta !== 0) return delta;
      return byDateDesc(left, right);
    });
  }

  return [...items].sort((left, right) => {
    const leftGroup = assetGroupLabel(left);
    const rightGroup = assetGroupLabel(right);
    if (leftGroup !== rightGroup) return leftGroup.localeCompare(rightGroup, "pt-BR");
    const delta = priorityRank(left) - priorityRank(right);
    if (delta !== 0) return delta;
    return byDateDesc(left, right);
  });
}

export function groupNotifications(items: InboxNotification[], mode: ViewMode) {
  if (mode === "date") {
    return [
      {
        key: "date",
        title: "Mais recentes",
        description: "Ordenadas por data de criação.",
        items,
      },
    ];
  }

  const sections = new Map<
    string,
    {
      key: string;
      title: string;
      description: string;
      items: InboxNotification[];
    }
  >();

  for (const item of items) {
    let key = "";
    let title = "";
    let description = "";

    if (mode === "priority") {
      key = priorityBucket(item);
      title = key;
      description =
        key === "Críticas não lidas"
          ? "Alertas críticos ainda sem revisão."
          : key === "Altas não lidas"
            ? "Alertas altos ainda sem revisão."
            : key === "Com ação pendente"
              ? "Itens com atalho direto para a origem."
              : key === "Sem entrega externa"
                ? "Notificações sem espelhamento externo registrado."
                : key === "Falhas externas"
                  ? "Itens que falharam ao espelhar para canais externos."
                  : key === "Em entrega"
                    ? "Itens ainda em processamento de entrega."
                    : key === "Lidas recentes"
                      ? "Itens já revisados recentemente."
                      : "Itens arquivados da fila principal.";
    } else if (mode === "category") {
      key = item.category || "other";
      title = categoryLabel(item.category);
      description =
        item.category === "data_quality"
          ? "Alertas de regras, score e violações."
          : item.category === "stewardship"
            ? "Solicitações e fluxos de governança."
            : item.category === "governance"
              ? "Mudanças e alertas de governança."
              : item.category === "operations"
                ? "Sinais operacionais e de execução."
                : "Notificações de categoria não mapeada.";
    } else {
      key = assetGroupLabel(item);
      title = assetGroupLabel(item);
      description = "Itens relacionados ao mesmo ativo, regra ou contexto.";
    }

    if (!sections.has(key)) {
      sections.set(key, { key, title, description, items: [] });
    }
    sections.get(key)!.items.push(item);
  }

  return Array.from(sections.values());
}
