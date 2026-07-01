import { Link } from "@/lib/next-shims";
import { useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";
import {
  Archive,
  Bell,
  CircleAlert,
  Clock3,
  ExternalLink,
  Filter,
  Inbox as InboxIcon,
  Loader2,
  MailCheck,
  MailX,
  RefreshCw,
  Send,
  X,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Banner } from "@/components/ui/banner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { Input } from "@/components/ui/input";

import { archiveInbox, fetchInbox, fetchInboxRecipients, fetchInboxSummary, forwardInbox, markInboxRead, markInboxUnread } from "../api";
import type { InboxNotification, InboxRecipientOption, InboxStateFilter, InboxSummaryResponse } from "../types";
import type { ActionFilter, DeliveryFilter, OriginFilter, SeverityFilter, ViewMode } from "./inbox-types";
import {
  assetGroupLabel,
  categoryLabel,
  categoryTone,
  contextualActionLabel,
  deliveryExplanation,
  deliveryLabel,
  deliveryTone,
  dqContextSummary,
  formatDateTime,
  groupNotifications,
  inboxErrorMessage,
  itemMatchesFilters,
  moduleLabel,
  notificationSignature,
  originKey,
  originLabel,
  priorityBucket,
  recurrenceCountFor,
  severityLabel,
  severityTone,
  sortNotifications,
  stateLabel,
  stateTone,
  stewardshipContextSummary,
} from "./inbox-helpers";

const STATE_FILTERS: Array<{ key: InboxStateFilter; label: string; description: string }> = [
  { key: "all", label: "Todas", description: "Visão completa da inbox." },
  { key: "unread", label: "Não lidas", description: "Alertas ainda não revisados." },
  { key: "read", label: "Lidas", description: "Itens já abertos ou cientes." },
  { key: "archived", label: "Arquivadas", description: "Notificações retiradas da fila principal." },
];

const VIEW_MODES: Array<{ key: ViewMode; label: string; description: string }> = [
  { key: "priority", label: "Por prioridade", description: "Críticas, pendências e recorrências primeiro." },
  { key: "category", label: "Por categoria", description: "Agrupa por Data Quality, Stewardship e Governança." },
  { key: "date", label: "Por data", description: "Ordena pela notificação mais recente." },
  { key: "asset", label: "Por ativo", description: "Agrupa pelo ativo, regra ou contexto relacionado." },
];

const SEVERITY_FILTERS: Array<{ key: SeverityFilter; label: string }> = [
  { key: "all", label: "Todas" },
  { key: "critical", label: "Crítica" },
  { key: "high", label: "Alta" },
  { key: "medium", label: "Média" },
  { key: "low", label: "Baixa" },
  { key: "info", label: "Info" },
];

const DELIVERY_FILTERS: Array<{ key: DeliveryFilter; label: string }> = [
  { key: "all", label: "Todas" },
  { key: "none", label: "Sem entrega" },
  { key: "pending", label: "Em entrega" },
  { key: "delivered", label: "Entregue" },
  { key: "failed", label: "Falha externa" },
  { key: "skipped", label: "Ignorada" },
];

const ACTION_FILTERS: Array<{ key: ActionFilter; label: string }> = [
  { key: "all", label: "Todas" },
  { key: "with_action", label: "Com ação" },
  { key: "without_action", label: "Sem ação" },
];

const ORIGIN_FILTERS: Array<{ key: OriginFilter; label: string }> = [
  { key: "all", label: "Todas" },
  { key: "data_quality", label: "Data Quality" },
  { key: "stewardship", label: "Stewardship" },
  { key: "governance", label: "Governança" },
  { key: "operations", label: "Operação" },
  { key: "incidents", label: "Incidentes" },
  { key: "privacy", label: "Privacidade" },
  { key: "platform", label: "Plataforma" },
  { key: "other", label: "Outros" },
];

function InboxItemCard({
  item,
  onArchive,
  onForward,
  onMarkRead,
  onMarkUnread,
  busy,
  recurrenceCount,
}: {
  item: InboxNotification;
  onArchive: (item: InboxNotification) => void;
  onForward: (item: InboxNotification) => void;
  onMarkRead: (item: InboxNotification) => void;
  onMarkUnread: (item: InboxNotification) => void;
  busy: boolean;
  recurrenceCount: number;
}) {
  const unread = item.state === "unread";
  const dqSummary = dqContextSummary(item);
  const stewardshipSummary = stewardshipContextSummary(item);
  const origin = originLabel(item);

  return (
    <article
      className={`rounded-2xl border bg-surface p-4 shadow-[0_8px_22px_rgba(15,23,42,0.04)] transition-colors ${
        unread ? "border-warning-200 bg-warning-50/35" : "border-border"
      }`}
    >
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div className="min-w-0 space-y-3">
          <div className="flex flex-wrap gap-2">
            <Badge tone={categoryTone(item.category)}>{categoryLabel(item.category)}</Badge>
            <Badge tone={severityTone(item.severity)}>{severityLabel(item.severity)}</Badge>
            <Badge tone={stateTone(item.state)}>{stateLabel(item.state)}</Badge>
            <Badge tone={deliveryTone(item.delivery_state)}>{deliveryLabel(item.delivery_state)}</Badge>
            {item.forwarded_from_notification_id ? <Badge tone="neutral">Encaminhada</Badge> : null}
            {recurrenceCount > 1 ? <Badge tone="warning">Repetida {recurrenceCount}x</Badge> : null}
          </div>

          <div className="space-y-1">
            <h3 className="text-sm font-semibold text-text">{item.title}</h3>
            <p className="text-sm leading-6 text-text-body">{item.message}</p>
            {dqSummary ? <p className="text-xs leading-5 text-muted">{dqSummary}</p> : null}
            {stewardshipSummary ? <p className="text-xs leading-5 text-muted">{stewardshipSummary}</p> : null}
            {item.forwarded_by_user_name ? (
              <p className="text-xs leading-5 text-muted">
                Encaminhada por <span className="font-medium text-text-body">{item.forwarded_by_user_name}</span>
                {item.forwarded_at ? ` em ${formatDateTime(item.forwarded_at)}` : ""}
              </p>
            ) : null}
          </div>

          <div className="grid gap-2 text-xs text-muted sm:grid-cols-2">
            <div className="rounded-xl border border-border bg-bg-subtle/70 px-3 py-2">
              <div className="text-[0.65rem] uppercase tracking-[0.18em] text-muted">Origem</div>
              <div className="mt-1 font-medium text-text-body">
                {origin} · {item.source_entity_type} · {item.source_entity_id}
              </div>
            </div>
            <div className="rounded-xl border border-border bg-bg-subtle/70 px-3 py-2">
              <div className="text-[0.65rem] uppercase tracking-[0.18em] text-muted">Entrega</div>
              <div className="mt-1 font-medium text-text-body">{deliveryExplanation(item)}</div>
            </div>
          </div>

          <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted">
            <span className="inline-flex items-center gap-1">
              <Bell className="h-3.5 w-3.5" />
              Criada em {formatDateTime(item.created_at)}
            </span>
            <span className="inline-flex items-center gap-1">
              <Clock3 className="h-3.5 w-3.5" />
              Última atualização {formatDateTime(item.updated_at)}
            </span>
            {item.last_notified_at ? <span>Último envio {formatDateTime(item.last_notified_at)}</span> : null}
            {item.next_delivery_at ? <span>Próxima entrega {formatDateTime(item.next_delivery_at)}</span> : null}
          </div>
        </div>

        <div className="flex flex-col gap-2 lg:min-w-[16rem] lg:items-end">
          {item.href ? (
            <Button asChild className="w-full lg:w-auto" size="sm" variant="outline">
              <Link href={item.href}>
                <ExternalLink className="mr-2 h-4 w-4" />
                {contextualActionLabel(item)}
              </Link>
            </Button>
          ) : (
            <div className="rounded-xl border border-dashed border-border px-3 py-2 text-xs text-muted">
              Sem atalho contextual. Use encaminhamento, leitura ou arquivamento para tratar este item.
            </div>
          )}
          <Button className="w-full lg:w-auto" disabled={busy} onClick={() => onForward(item)} size="sm" variant="outline">
            <Send className="mr-2 h-4 w-4" />
            Encaminhar
          </Button>
          {item.state === "unread" ? (
            <Button className="w-full lg:w-auto" disabled={busy} onClick={() => onMarkRead(item)} size="sm" variant="outline">
              <MailCheck className="mr-2 h-4 w-4" />
              Marcar como lida
            </Button>
          ) : (
            <Button className="w-full lg:w-auto" disabled={busy} onClick={() => onMarkUnread(item)} size="sm" variant="outline">
              <MailX className="mr-2 h-4 w-4" />
              Marcar como não lida
            </Button>
          )}
          <Button className="w-full lg:w-auto" disabled={busy} onClick={() => onArchive(item)} size="sm" variant="ghost">
            <Archive className="mr-2 h-4 w-4" />
            Arquivar
          </Button>
        </div>
      </div>
    </article>
  );
}

function ForwardNotificationModal({
  notification,
  onClose,
  onSubmit,
  submitting,
}: {
  notification: InboxNotification | null;
  onClose: () => void;
  onSubmit: (recipient: InboxRecipientOption) => Promise<void>;
  submitting: boolean;
}) {
  const [query, setQuery] = useState("");
  const [recipients, setRecipients] = useState<InboxRecipientOption[]>([]);
  const [selectedRecipient, setSelectedRecipient] = useState<InboxRecipientOption | null>(null);
  const [loadingRecipients, setLoadingRecipients] = useState(false);
  const [searchError, setSearchError] = useState("");

  useEffect(() => {
    if (!notification) return;
    setQuery("");
    setRecipients([]);
    setSelectedRecipient(null);
    setSearchError("");
    setLoadingRecipients(true);
  }, [notification?.id]);

  useEffect(() => {
    if (!notification) return;
    let active = true;
    const timer = window.setTimeout(async () => {
      setLoadingRecipients(true);
      setSearchError("");
      try {
        const options = await fetchInboxRecipients(query, 20);
        if (!active) return;
        setRecipients(options);
      } catch (err) {
        if (!active) return;
        setRecipients([]);
        setSearchError(inboxErrorMessage(err));
      } finally {
        if (active) setLoadingRecipients(false);
      }
    }, 250);

    return () => {
      active = false;
      window.clearTimeout(timer);
    };
  }, [notification, query]);

  if (!notification) return null;

  const summary = dqContextSummary(notification) || stewardshipContextSummary(notification);

  async function handleConfirm() {
    if (!selectedRecipient) return;
    try {
      await onSubmit(selectedRecipient);
    } catch (err) {
      setSearchError(inboxErrorMessage(err));
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center px-4 py-6">
      <button aria-label="Fechar modal" className="absolute inset-0 bg-slate-950/40 backdrop-blur-[1px]" onClick={onClose} type="button" />
      <div className="relative z-10 flex max-h-[90vh] w-full max-w-2xl flex-col overflow-hidden rounded-3xl border border-border bg-surface shadow-[0_32px_90px_rgba(15,23,42,0.22)]">
        <div className="flex items-start justify-between gap-4 border-b border-border px-6 py-5">
          <div className="space-y-1">
            <div className="flex flex-wrap gap-2">
              <Badge tone={categoryTone(notification.category)}>{categoryLabel(notification.category)}</Badge>
              <Badge tone={severityTone(notification.severity)}>{severityLabel(notification.severity)}</Badge>
            </div>
            <h3 className="text-lg font-semibold text-text">Encaminhar para outro usuário</h3>
            <p className="text-sm leading-6 text-text-body">
              O encaminhamento cria um novo item no Inbox do destinatário, preservando o contexto da notificação original.
            </p>
          </div>
          <Button aria-label="Fechar" onClick={onClose} size="sm" type="button" variant="ghost">
            <X className="h-4 w-4" />
          </Button>
        </div>

        <div className="flex-1 space-y-5 overflow-y-auto px-6 py-5">
          <section className="rounded-2xl border border-border bg-bg-subtle/60 p-4">
            <p className="text-xs uppercase tracking-[0.18em] text-brand-600">Notificação original</p>
            <h4 className="mt-2 text-sm font-semibold text-text">{notification.title}</h4>
            <p className="mt-1 text-sm leading-6 text-text-body">{notification.message}</p>
            {summary ? <p className="mt-2 text-xs leading-5 text-muted">{summary}</p> : null}
          </section>

          <section className="space-y-3">
            <div className="flex flex-wrap items-end justify-between gap-3">
              <div>
                <h4 className="text-sm font-semibold text-text">Destinatário</h4>
                <p className="text-sm text-text-body">Busque por nome ou e-mail e selecione um usuário ativo do sistema.</p>
              </div>
              {selectedRecipient ? (
                <div className="flex items-center gap-2">
                  <Badge tone="accent">
                    {selectedRecipient.display_name} · {selectedRecipient.email}
                  </Badge>
                  <Button onClick={() => setSelectedRecipient(null)} size="sm" type="button" variant="ghost">
                    Remover
                  </Button>
                </div>
              ) : null}
            </div>

            <Input autoComplete="off" onChange={(event) => setQuery(event.target.value)} placeholder="Buscar usuário por nome ou e-mail" value={query} />

            {searchError ? <Banner description={searchError} tone="error" title="Não foi possível buscar usuários" /> : null}

            <div className="rounded-2xl border border-border bg-surface">
              <div className="border-b border-border px-4 py-3 text-xs uppercase tracking-[0.18em] text-brand-600">
                {loadingRecipients ? "Carregando usuários..." : "Usuários elegíveis"}
              </div>
              <div className="max-h-72 divide-y divide-border overflow-y-auto">
                {recipients.length ? (
                  recipients.map((recipient) => {
                    const selected = selectedRecipient?.id === recipient.id;
                    return (
                      <button
                        className={`flex w-full items-start justify-between gap-3 px-4 py-3 text-left transition-colors ${
                          selected ? "bg-info-50" : "hover:bg-bg-subtle"
                        }`}
                        key={recipient.id}
                        onClick={() => setSelectedRecipient(recipient)}
                        type="button"
                      >
                        <div className="min-w-0 space-y-1">
                          <p className="truncate text-sm font-medium text-text">{recipient.display_name}</p>
                          <p className="truncate text-xs text-muted">{recipient.email}</p>
                        </div>
                        <Badge tone={selected ? "accent" : "neutral"}>{selected ? "Selecionado" : "Selecionar"}</Badge>
                      </button>
                    );
                  })
                ) : loadingRecipients ? (
                  <div className="px-4 py-6 text-sm text-muted">Buscando usuários ativos...</div>
                ) : (
                  <div className="px-4 py-6 text-sm text-muted">Nenhum usuário encontrado para este filtro.</div>
                )}
              </div>
            </div>
          </section>
        </div>

        <div className="flex flex-col gap-3 border-t border-border bg-bg-subtle/70 px-6 py-4 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-sm text-text-body">
            O encaminhamento não aciona Slack ou Teams. Ele replica a notificação para outro usuário dentro do Inbox.
          </p>
          <div className="flex items-center gap-2">
            <Button onClick={onClose} variant="outline">
              Cancelar
            </Button>
            <Button disabled={!selectedRecipient || submitting} onClick={() => void handleConfirm()}>
              {submitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Send className="mr-2 h-4 w-4" />}
              Encaminhar
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

function SectionCard({
  title,
  description,
  children,
}: {
  title: string;
  description: string;
  children: ReactNode;
}) {
  return (
    <Card className="border-border bg-surface shadow-[0_10px_28px_rgba(15,23,42,0.04)]">
      <CardHeader className="space-y-1">
        <h2 className="text-lg font-semibold text-text">{title}</h2>
        <p className="text-sm text-text-body">{description}</p>
      </CardHeader>
      <CardContent>{children}</CardContent>
    </Card>
  );
}

function MetricCard({
  title,
  value,
  description,
  tone = "neutral",
  actionLabel,
  onAction,
}: {
  title: string;
  value: number | string;
  description: string;
  tone?: "success" | "accent" | "warning" | "danger" | "neutral";
  actionLabel?: string;
  onAction?: () => void;
}) {
  const toneClasses: Record<typeof tone, string> = {
    success: "border-success-200 bg-success-50/70 text-success-700",
    accent: "border-info-200 bg-info-50/70 text-info-700",
    warning: "border-warning-200 bg-warning-50/70 text-warning-700",
    danger: "border-danger-200 bg-danger-50/70 text-danger-700",
    neutral: "border-border bg-surface text-text",
  };
  return (
    <Card className={`shadow-[0_10px_28px_rgba(15,23,42,0.04)] ${toneClasses[tone]}`}>
      <CardHeader className="pb-2">
        <p className="text-xs uppercase tracking-wide text-muted">{title}</p>
        <p className="text-2xl font-semibold text-text">{value}</p>
      </CardHeader>
      <CardContent className="space-y-3">
        <p className="text-sm leading-6 text-text-body">{description}</p>
        {actionLabel && onAction ? (
          <Button className="w-full justify-start px-0 text-left" onClick={onAction} size="sm" variant="ghost">
            {actionLabel}
          </Button>
        ) : null}
      </CardContent>
    </Card>
  );
}

function ActionRecommendationCard({
  title,
  description,
  impact,
  tone,
  action,
}: {
  title: string;
  description: string;
  impact: string;
  tone: "danger" | "warning" | "accent" | "success" | "neutral";
  action: ReactNode;
}) {
  return (
    <Card className="border-border bg-surface shadow-[0_10px_28px_rgba(15,23,42,0.04)]">
      <CardHeader className="space-y-2 pb-3">
        <div className="flex flex-wrap items-center gap-2">
          <Badge tone={tone}>{tone === "danger" ? "Crítica" : tone === "warning" ? "Atenção" : tone === "success" ? "Saudável" : "Info"}</Badge>
          <h3 className="text-sm font-semibold text-text">{title}</h3>
        </div>
        <p className="text-sm leading-6 text-text-body">{description}</p>
      </CardHeader>
      <CardContent className="space-y-3">
        <p className="text-xs leading-5 text-muted">{impact}</p>
        {action}
      </CardContent>
    </Card>
  );
}

export function InboxCenter() {
  const [summary, setSummary] = useState<InboxSummaryResponse | null>(null);
  const [items, setItems] = useState<InboxNotification[]>([]);
  const [listTotal, setListTotal] = useState(0);
  const [stateFilter, setStateFilter] = useState<InboxStateFilter>("all");
  const [categoryFilter, setCategoryFilter] = useState<string>("all");
  const [severityFilter, setSeverityFilter] = useState<SeverityFilter>("all");
  const [deliveryFilter, setDeliveryFilter] = useState<DeliveryFilter>("all");
  const [actionFilter, setActionFilter] = useState<ActionFilter>("all");
  const [originFilter, setOriginFilter] = useState<OriginFilter>("all");
  const [recurringOnly, setRecurringOnly] = useState(false);
  const [viewMode, setViewMode] = useState<ViewMode>("priority");
  const [visibleCount, setVisibleCount] = useState(10);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<number | null>(null);
  const [error, setError] = useState("");
  const [reloadKey, setReloadKey] = useState(0);
  const [forwardTarget, setForwardTarget] = useState<InboxNotification | null>(null);
  const [forwardSubmitting, setForwardSubmitting] = useState(false);
  const [feedback, setFeedback] = useState<{ tone: "success" | "danger"; message: string } | null>(null);

  useEffect(() => {
    let active = true;

    async function loadInbox() {
      setLoading(true);
      setError("");

      try {
        const [summaryData, inboxData] = await Promise.all([fetchInboxSummary(), fetchInbox({ limit: 100 })]);
        if (!active) return;
        setSummary(summaryData);
        setItems(inboxData.items);
        setListTotal(inboxData.total);
      } catch (err) {
        if (!active) return;
        setError(inboxErrorMessage(err));
        setSummary(null);
        setItems([]);
        setListTotal(0);
      } finally {
        if (active) setLoading(false);
      }
    }

    void loadInbox();
    return () => {
      active = false;
    };
  }, [reloadKey]);

  useEffect(() => {
    if (!feedback) return;
    const timeout = window.setTimeout(() => setFeedback(null), 4000);
    return () => window.clearTimeout(timeout);
  }, [feedback]);

  const recurrenceMap = useMemo(() => {
    const map = new Map<string, number>();
    for (const item of items) {
      const key = notificationSignature(item);
      map.set(key, (map.get(key) ?? 0) + 1);
    }
    return map;
  }, [items]);

  const visibleItems = useMemo(() => {
    const filtered = items.filter((item) =>
      itemMatchesFilters(item, {
        state: stateFilter,
        category: categoryFilter,
        severity: severityFilter,
        delivery: deliveryFilter,
        action: actionFilter,
        origin: originFilter,
        recurringOnly,
        recurrenceMap,
      }),
    );
    return sortNotifications(filtered, viewMode);
  }, [actionFilter, categoryFilter, deliveryFilter, items, originFilter, recurrenceMap, recurringOnly, severityFilter, stateFilter, viewMode]);

  const visibleSections = useMemo(() => groupNotifications(visibleItems.slice(0, visibleCount), viewMode), [visibleCount, viewMode, visibleItems]);

  const overallVisibleCount = visibleItems.length;
  const actionableCount = useMemo(() => items.filter((item) => Boolean(item.href)).length, [items]);
  const unreadCount = summary?.unread ?? items.filter((item) => item.state === "unread").length;
  const dueDeliveryCount = summary?.due_delivery ?? items.filter((item) => item.delivery_state === "pending").length;
  const criticalCount = useMemo(() => items.filter((item) => item.severity === "critical").length, [items]);
  const noDeliveryCount = useMemo(() => items.filter((item) => item.delivery_state === "none").length, [items]);
  const failedDeliveryCount = useMemo(() => items.filter((item) => item.delivery_state === "failed").length, [items]);
  const recurringCount = useMemo(
    () => items.filter((item) => (recurrenceMap.get(notificationSignature(item)) ?? 0) > 1).length,
    [items, recurrenceMap],
  );
  const dqCriticalCount = useMemo(
    () =>
      items.filter((item) => (item.category === "data_quality" || originKey(item) === "data_quality") && item.severity === "critical").length,
    [items],
  );
  const stewardshipCount = useMemo(
    () => items.filter((item) => (item.category === "stewardship" || originKey(item) === "stewardship") && item.state === "unread").length,
    [items],
  );
  const actionPendingCount = useMemo(() => items.filter((item) => item.href && item.state === "unread").length, [items]);
  const unreadCriticalCount = useMemo(() => items.filter((item) => item.state === "unread" && item.severity === "critical").length, [items]);

  const statusSummary = useMemo(() => {
    if (loading) return "Carregando Inbox...";
    if (!items.length) return "Sua inbox está vazia";
    if (criticalCount > 0 && unreadCriticalCount > 0) return "Atenção: há notificações críticas não lidas";
    if (failedDeliveryCount > 0) return "Atenção: há falhas externas registradas";
    if (noDeliveryCount > 0) return "Inbox saudável, com itens sem entrega externa";
    return "Inbox operacional";
  }, [criticalCount, failedDeliveryCount, items.length, loading, noDeliveryCount, unreadCriticalCount]);

  const currentCardCount = Math.min(visibleCount, overallVisibleCount);
  const shownLabel = useMemo(() => {
    if (loading) return "Carregando...";
    if (!overallVisibleCount) return "Nenhuma notificação na visão atual";
    if (overallVisibleCount > currentCardCount) {
      return `Mostrando ${currentCardCount} de ${overallVisibleCount} notificações na visão atual`;
    }
    return `${overallVisibleCount} notificação(ões) na visão atual`;
  }, [currentCardCount, loading, overallVisibleCount]);

  const noResults = !loading && !error && visibleItems.length === 0;
  const hasMoreItems = overallVisibleCount > currentCardCount;

  async function refresh() {
    setReloadKey((current) => current + 1);
  }

  function clearFilters() {
    setStateFilter("all");
    setCategoryFilter("all");
    setSeverityFilter("all");
    setDeliveryFilter("all");
    setActionFilter("all");
    setOriginFilter("all");
    setRecurringOnly(false);
    setViewMode("priority");
    setVisibleCount(10);
  }

  async function performAction(item: InboxNotification, action: "read" | "unread" | "archive") {
    setBusyId(item.id);
    setError("");
    try {
      if (action === "read") {
        await markInboxRead(item.id);
      } else if (action === "unread") {
        await markInboxUnread(item.id);
      } else {
        await archiveInbox(item.id);
      }
      await refresh();
      window.dispatchEvent(new Event("inbox:changed"));
    } catch (err) {
      setError(inboxErrorMessage(err));
    } finally {
      setBusyId(null);
    }
  }

  function handleForward(item: InboxNotification) {
    setForwardTarget(item);
  }

  async function submitForward(recipient: InboxRecipientOption) {
    if (!forwardTarget) return;
    setForwardSubmitting(true);
    try {
      await forwardInbox(forwardTarget.id, recipient.id);
      setFeedback({
        tone: "success",
        message: `Notificação encaminhada para ${recipient.display_name}.`,
      });
      setForwardTarget(null);
      await refresh();
      window.dispatchEvent(new Event("inbox:changed"));
    } catch (err) {
      setFeedback({ tone: "danger", message: inboxErrorMessage(err) });
      throw err;
    } finally {
      setForwardSubmitting(false);
    }
  }

  const attentionCards = [
    {
      title: "Críticas não lidas",
      value: unreadCriticalCount,
      description: "Alertas críticos ainda sem revisão.",
      impact: "Eles exigem leitura primeiro porque podem representar risco operacional ou de qualidade.",
      tone: "danger" as const,
      actionLabel: "Ver críticas",
      onAction: () => {
        setStateFilter("unread");
        setSeverityFilter("critical");
        setVisibleCount(10);
        setViewMode("priority");
      },
    },
    {
      title: "Data Quality crítica",
      value: dqCriticalCount,
      description: "Registros críticos de qualidade de dados.",
      impact: "Normalmente apontam regras violadas em tabelas ou colunas com impacto direto em consumo.",
      tone: "warning" as const,
      action: (
        <Button asChild size="sm" variant="outline">
          <Link href="/data-quality">Abrir Data Quality</Link>
        </Button>
      ),
    },
    {
      title: "Stewardship pendente",
      value: stewardshipCount,
      description: "Solicitações de governança ainda não revisadas.",
      impact: "Atrasos de stewardship podem travar aprovações, owners e mudanças de catálogo.",
      tone: "accent" as const,
      action: (
        <Button asChild size="sm" variant="outline">
          <Link href="/governance/stewardship">Abrir stewardship</Link>
        </Button>
      ),
    },
    {
      title: "Sem entrega externa",
      value: noDeliveryCount,
      description: "Itens criados no Inbox sem espelhamento externo registrado.",
      impact: "Não é necessariamente erro: pode indicar ausência de canal externo, item inelegível ou política local.",
      tone: "warning" as const,
      actionLabel: "Ver sem entrega",
      onAction: () => {
        setDeliveryFilter("none");
        setVisibleCount(10);
        setViewMode("priority");
      },
    },
    {
      title: "Recorrentes",
      value: recurringCount,
      description: "Notificações repetidas da mesma regra, origem ou contexto.",
      impact: "Recorrência costuma indicar causa raiz ainda aberta ou sinal sem tratativa definitiva.",
      tone: "warning" as const,
      actionLabel: "Ver recorrentes",
      onAction: () => {
        setRecurringOnly(true);
        setVisibleCount(10);
        setViewMode("priority");
      },
    },
    {
      title: "Com ação pendente",
      value: actionPendingCount,
      description: "Itens com atalho contextual para a origem.",
      impact: "São notificações que podem ser abertas diretamente no módulo de origem para tratar a causa.",
      tone: "accent" as const,
      actionLabel: "Priorizar ações",
      onAction: () => {
        setActionFilter("with_action");
        setStateFilter("unread");
        setVisibleCount(10);
        setViewMode("priority");
      },
    },
  ];

  const recommendedActions = useMemo(() => {
    const actions: Array<
      | {
          title: string;
          description: string;
          impact: string;
          tone: "danger" | "warning" | "accent" | "success" | "neutral";
          action: ReactNode;
        }
      | undefined
    > = [
      unreadCriticalCount
        ? {
            title: `Revisar ${unreadCriticalCount} notificação(ões) críticas não lidas`,
            description: "Comece pelos alertas de maior severidade que ainda não foram vistos.",
            impact: "Isso reduz risco operacional e evita que uma falha crítica fique sem tratativa.",
            tone: "danger",
            action: (
              <Button
                onClick={() => {
                  setStateFilter("unread");
                  setSeverityFilter("critical");
                  setVisibleCount(10);
                }}
                size="sm"
                variant="outline"
              >
                Ver críticas
              </Button>
            ),
          }
        : undefined,
      dqCriticalCount
        ? {
            title: "Abrir Data Quality",
            description: "As notificações de Data Quality críticas merecem revisão na regra e nas ocorrências.",
            impact: "Pode haver tabela impactada com dados defasados ou inconsistentes para consumo.",
            tone: "warning",
            action: (
              <Button asChild size="sm" variant="outline">
                <Link href="/data-quality">Abrir Data Quality</Link>
              </Button>
            ),
          }
        : undefined,
      stewardshipCount
        ? {
            title: "Revisar stewardship pendente",
            description: "Há solicitações de governança que ainda não foram avaliadas no módulo de origem.",
            impact: "Pendências de stewardship podem atrasar aprovação de mudanças e atualização de ownership.",
            tone: "accent",
            action: (
              <Button asChild size="sm" variant="outline">
                <Link href="/governance/stewardship">Abrir stewardship</Link>
              </Button>
            ),
          }
        : undefined,
      noDeliveryCount
        ? {
            title: "Verificar notificações sem entrega externa",
            description: "Alguns itens não possuem espelhamento para Slack ou Teams.",
            impact: "Não é erro por si só, mas vale validar se a entrega externa deveria existir para essas categorias.",
            tone: "warning",
            action: (
              <Button
                onClick={() => {
                  setDeliveryFilter("none");
                  setVisibleCount(10);
                }}
                size="sm"
                variant="outline"
              >
                Filtrar sem entrega
              </Button>
            ),
          }
        : undefined,
      recurringCount
        ? {
            title: "Investigar recorrência",
            description: "Há notificações repetidas da mesma regra ou contexto.",
            impact: "Isso costuma indicar problema recorrente, regra muito sensível ou tratativa incompleta.",
            tone: "warning",
            action: (
              <Button
                onClick={() => {
                  setRecurringOnly(true);
                  setVisibleCount(10);
                }}
                size="sm"
                variant="outline"
              >
                Ver recorrentes
              </Button>
            ),
          }
        : undefined,
      actionPendingCount
        ? {
            title: "Priorizar itens com ação direta",
            description: "Itens com atalho para a origem podem ser tratados sem sair da tela principal.",
            impact: "É o caminho mais rápido para corrigir a origem da notificação e fechar o ciclo.",
            tone: "accent",
            action: (
              <Button
                onClick={() => {
                  setActionFilter("with_action");
                  setStateFilter("unread");
                  setVisibleCount(10);
                }}
                size="sm"
                variant="outline"
              >
                Ver ações
              </Button>
            ),
          }
        : undefined,
    ];

    return actions.filter(Boolean).slice(0, 5) as Array<{
      title: string;
      description: string;
      impact: string;
      tone: "danger" | "warning" | "accent" | "success" | "neutral";
      action: ReactNode;
    }>;
  }, [actionPendingCount, dqCriticalCount, noDeliveryCount, recurringCount, stewardshipCount, unreadCriticalCount]);

  const byCategoryCounts = useMemo(() => {
    const counts = new Map<string, number>();
    for (const item of items) counts.set(item.category, (counts.get(item.category) ?? 0) + 1);
    return Array.from(counts.entries()).sort((left, right) => right[1] - left[1]);
  }, [items]);

  const categoryOptions = useMemo(() => {
    const known = new Map<string, string>();
    for (const [key] of byCategoryCounts) {
      known.set(key, categoryLabel(key));
    }
    const order = ["data_quality", "stewardship", "governance", "operations"];
    const options = order.filter((key) => known.has(key)).map((key) => ({ key, label: known.get(key) ?? key }));
    for (const [key, label] of Array.from(known.entries())) {
      if (!order.includes(key)) options.push({ key, label });
    }
    return options;
  }, [byCategoryCounts]);

  const activeFilters = useMemo(() => {
    const chips: Array<{ label: string; onRemove: () => void }> = [];
    if (stateFilter !== "all") chips.push({ label: `Estado: ${STATE_FILTERS.find((item) => item.key === stateFilter)?.label ?? stateFilter}`, onRemove: () => setStateFilter("all") });
    if (categoryFilter !== "all") chips.push({ label: `Categoria: ${categoryLabel(categoryFilter)}`, onRemove: () => setCategoryFilter("all") });
    if (severityFilter !== "all") chips.push({ label: `Severidade: ${severityLabel(severityFilter)}`, onRemove: () => setSeverityFilter("all") });
    if (deliveryFilter !== "all") chips.push({ label: `Entrega: ${deliveryLabel(deliveryFilter)}`, onRemove: () => setDeliveryFilter("all") });
    if (actionFilter !== "all") chips.push({ label: `Ação: ${actionFilter === "with_action" ? "Com ação" : "Sem ação"}`, onRemove: () => setActionFilter("all") });
    if (originFilter !== "all") chips.push({ label: `Origem: ${ORIGIN_FILTERS.find((item) => item.key === originFilter)?.label ?? originFilter}`, onRemove: () => setOriginFilter("all") });
    if (recurringOnly) chips.push({ label: "Recorrentes", onRemove: () => setRecurringOnly(false) });
    return chips;
  }, [actionFilter, categoryFilter, deliveryFilter, originFilter, recurringOnly, severityFilter, stateFilter]);

  const summaryStatusTone: "success" | "warning" | "danger" | "neutral" | "accent" =
    criticalCount > 0 && unreadCriticalCount > 0 ? "danger" : failedDeliveryCount > 0 ? "warning" : noDeliveryCount > 0 ? "accent" : "success";

  return (
    <div className="space-y-6">
      <section className="space-y-4">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="space-y-3">
            <div className="inline-flex items-center gap-2 rounded-full border border-border bg-surface px-3 py-1 text-xs font-medium uppercase tracking-[0.18em] text-brand-600">
              <InboxIcon className="h-3.5 w-3.5" />
              Inbox
            </div>
            <div className="space-y-2">
              <h1 className="text-2xl font-semibold text-text">Inbox</h1>
              <p className="max-w-3xl text-sm leading-6 text-text-body">
                Centro interno de notificações operacionais e de governança. O Inbox continua funcionando mesmo quando a entrega externa para Slack
                ou Teams falha ou não está configurada.
              </p>
              <p className="max-w-3xl text-sm leading-6 text-muted">
                Use esta tela para priorizar alertas críticos, abrir a origem, acompanhar encaminhamentos e limpar notificações já tratadas.
              </p>
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            <Button disabled={loading} onClick={() => void refresh()} variant="outline">
              {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <RefreshCw className="mr-2 h-4 w-4" />}
              Atualizar
            </Button>
            <Button asChild variant="outline">
              <Link href="/incidents">Ver incidentes</Link>
            </Button>
            <Button asChild variant="outline">
              <Link href="/data-quality">Abrir Data Quality</Link>
            </Button>
          </div>
        </div>

        {feedback ? (
          <Banner description={feedback.message} tone={feedback.tone === "success" ? "success" : "error"} title={feedback.tone === "success" ? "Concluído" : "Falha na ação"} />
        ) : null}

        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4 2xl:grid-cols-7">
          <MetricCard
            actionLabel="Ver todas"
            description="Notificações carregadas na visão atual do Inbox."
            onAction={() => clearFilters()}
            title="Total na inbox"
            tone="neutral"
            value={summary?.total ?? items.length}
          />
          <MetricCard
            actionLabel="Ver não lidas"
            description="Alertas ainda não revisados por você."
            onAction={() => setStateFilter("unread")}
            title="Não lidas"
            tone="warning"
            value={unreadCount}
          />
          <MetricCard
            actionLabel="Ver críticas"
            description="Itens de maior severidade que merecem prioridade."
            onAction={() => {
              setStateFilter("unread");
              setSeverityFilter("critical");
            }}
            title="Críticas"
            tone="danger"
            value={criticalCount}
          />
          <MetricCard
            actionLabel="Ver sem entrega"
            description="Itens criados no Inbox sem espelhamento externo registrado."
            onAction={() => setDeliveryFilter("none")}
            title="Sem entrega"
            tone="accent"
            value={noDeliveryCount}
          />
          <MetricCard
            actionLabel="Ver em entrega"
            description="Notificações aguardando conclusão de envio externo."
            onAction={() => setDeliveryFilter("pending")}
            title="Em entrega"
            tone="warning"
            value={dueDeliveryCount}
          />
          <MetricCard
            actionLabel="Ver ação"
            description="Itens com atalho contextual para a origem."
            onAction={() => setActionFilter("with_action")}
            title="Com ação"
            tone="accent"
            value={actionableCount}
          />
          <MetricCard
            actionLabel="Ver recorrentes"
            description="Notificações repetidas da mesma origem ou regra."
            onAction={() => setRecurringOnly(true)}
            title="Recorrentes"
            tone="warning"
            value={recurringCount}
          />
        </div>
      </section>

      <div className="grid gap-4 lg:grid-cols-2">
        <SectionCard
          description="Siga estes passos para abrir a origem certa, tratar a causa e remover ruído da fila."
          title="Como usar o Inbox"
        >
          <ol className="space-y-3 text-sm leading-6 text-text-body">
            <li>1. Comece pelas notificações críticas e não lidas.</li>
            <li>2. Abra o módulo de origem, como Data Quality, Stewardship ou Incidentes.</li>
            <li>3. Verifique o ativo, regra ou solicitação relacionada.</li>
            <li>4. Encaminhe para outro usuário quando precisar de revisão.</li>
            <li>5. Marque como lida quando estiver ciente.</li>
            <li>6. Arquive quando a notificação não precisar mais aparecer na fila principal.</li>
          </ol>
        </SectionCard>

        <SectionCard
          description="O Inbox interno continua ativo mesmo sem canal externo. A entrega externa é opcional e pode falhar sem impedir a criação da notificação."
          title="Inbox interno x entrega externa"
        >
          <div className="space-y-3 text-sm leading-6 text-text-body">
            <div className="rounded-2xl border border-border bg-bg-subtle/70 p-4">
              <p className="text-xs uppercase tracking-[0.18em] text-brand-600">Inbox interno</p>
              <p className="mt-1">Registro principal da notificação dentro do t2c_data. Ele continua funcionando mesmo sem Slack ou Teams.</p>
            </div>
            <div className="rounded-2xl border border-border bg-bg-subtle/70 p-4">
              <p className="text-xs uppercase tracking-[0.18em] text-brand-600">Entrega externa</p>
              <p className="mt-1">
                Espelhamento opcional para canais oficiais de time. Pode falhar por erro de transporte, payload recusado ou indisponibilidade do
                provedor.
              </p>
            </div>
            <p className="text-sm text-muted">
              “Sem entrega” não significa necessariamente erro. Pode indicar ausência de canal externo, item inelegível ou notificação criada apenas para o
              Inbox interno.
            </p>
          </div>
        </SectionCard>
      </div>

      <section className="space-y-3">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h2 className="text-lg font-semibold text-text">Atenção imediata</h2>
            <p className="text-sm text-text-body">Notificações que precisam de ação agora.</p>
          </div>
          <Badge tone={summaryStatusTone}>{statusSummary}</Badge>
        </div>
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {attentionCards.map((card) => (
            <Card className="border-border bg-surface shadow-[0_10px_28px_rgba(15,23,42,0.04)]" key={card.title}>
              <CardHeader className="space-y-2 pb-3">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="text-xs uppercase tracking-[0.18em] text-brand-600">{card.title}</p>
                    <p className="text-2xl font-semibold text-text">{card.value}</p>
                  </div>
                  <Badge tone={card.tone}>{card.tone === "danger" ? "Crítica" : card.tone === "warning" ? "Atenção" : "Info"}</Badge>
                </div>
                <p className="text-sm leading-6 text-text-body">{card.description}</p>
              </CardHeader>
              <CardContent className="space-y-2">
                <p className="text-xs leading-5 text-muted">{card.impact}</p>
                {"action" in card ? (
                  card.action
                ) : (
                  <Button onClick={card.onAction} size="sm" variant="outline">
                    {card.actionLabel}
                  </Button>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      <section className="space-y-3">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h2 className="text-lg font-semibold text-text">Próximas ações recomendadas</h2>
            <p className="text-sm text-text-body">Ações sugeridas com base nas notificações atuais.</p>
          </div>
        </div>
        <div className="grid gap-4 lg:grid-cols-2 xl:grid-cols-3">
          {recommendedActions.length ? (
            recommendedActions.map((action) => (
              <ActionRecommendationCard
                action={action.action}
                description={action.description}
                impact={action.impact}
                key={action.title}
                title={action.title}
                tone={action.tone}
              />
            ))
          ) : (
            <Card className="border-border bg-surface shadow-[0_10px_28px_rgba(15,23,42,0.04)]">
              <CardContent className="py-8">
                <EmptyState description="Não há ações prioritárias no recorte atual. Explore os filtros para revisar outros grupos de notificações." icon={<CircleAlert className="h-5 w-5" />} title="Nenhuma ação recomendada agora" />
              </CardContent>
            </Card>
          )}
        </div>
      </section>

      <Card className="border-border bg-surface shadow-[0_10px_28px_rgba(15,23,42,0.04)]">
        <CardHeader className="space-y-4">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <h2 className="text-lg font-semibold text-text">Filtros</h2>
              <p className="text-sm text-text-body">Use os filtros para priorizar notificações críticas, sem leitura, sem entrega ou relacionadas a um módulo específico.</p>
            </div>
            <div className="flex items-center gap-2">
              <Badge tone="neutral">{shownLabel}</Badge>
              {listTotal > items.length ? <Badge tone="warning">Recorte carregado: {items.length} de {listTotal}</Badge> : null}
            </div>
          </div>

          <div className="space-y-4">
            <div className="space-y-2">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-brand-600">Status</p>
              <div className="flex flex-wrap gap-2">
                {STATE_FILTERS.map((filter) => (
                  <Button
                    key={filter.key}
                    onClick={() => setStateFilter(filter.key)}
                    size="sm"
                    variant={stateFilter === filter.key ? "default" : "outline"}
                  >
                    <Filter className="mr-2 h-4 w-4" />
                    {filter.label}
                  </Button>
                ))}
              </div>
            </div>

            <div className="space-y-2">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-brand-600">Categoria</p>
              <div className="flex flex-wrap gap-2">
                {[{ key: "all", label: "Todas" }, ...categoryOptions].map((filter) => (
                  <Button
                    key={filter.key}
                    onClick={() => setCategoryFilter(filter.key)}
                    size="sm"
                    variant={categoryFilter === filter.key ? "default" : "outline"}
                  >
                    {filter.label}
                  </Button>
                ))}
              </div>
            </div>

            <div className="space-y-2">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-brand-600">Severidade</p>
              <div className="flex flex-wrap gap-2">
                {SEVERITY_FILTERS.map((filter) => (
                  <Button
                    key={filter.key}
                    onClick={() => setSeverityFilter(filter.key)}
                    size="sm"
                    variant={severityFilter === filter.key ? "default" : "outline"}
                  >
                    {filter.label}
                  </Button>
                ))}
              </div>
            </div>

            <div className="space-y-2">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-brand-600">Entrega</p>
              <div className="flex flex-wrap gap-2">
                {DELIVERY_FILTERS.map((filter) => (
                  <Button
                    key={filter.key}
                    onClick={() => setDeliveryFilter(filter.key)}
                    size="sm"
                    variant={deliveryFilter === filter.key ? "default" : "outline"}
                  >
                    {filter.label}
                  </Button>
                ))}
              </div>
            </div>

            <div className="space-y-2">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-brand-600">Ação</p>
              <div className="flex flex-wrap gap-2">
                {ACTION_FILTERS.map((filter) => (
                  <Button
                    key={filter.key}
                    onClick={() => setActionFilter(filter.key)}
                    size="sm"
                    variant={actionFilter === filter.key ? "default" : "outline"}
                  >
                    {filter.label}
                  </Button>
                ))}
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between gap-3">
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-brand-600">Origem</p>
                <Button
                  className="h-auto px-2 py-0 text-xs"
                  onClick={() => setRecurringOnly((current) => !current)}
                  size="sm"
                  variant={recurringOnly ? "default" : "outline"}
                >
                  Recorrentes
                </Button>
              </div>
              <div className="flex flex-wrap gap-2">
                {ORIGIN_FILTERS.map((filter) => (
                  <Button
                    key={filter.key}
                    onClick={() => setOriginFilter(filter.key)}
                    size="sm"
                    variant={originFilter === filter.key ? "default" : "outline"}
                  >
                    {filter.label}
                  </Button>
                ))}
              </div>
            </div>

            <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border pt-4">
              <div className="flex flex-wrap gap-2">
                {activeFilters.length ? (
                  activeFilters.map((chip) => (
                    <Badge key={chip.label} tone="accent">
                      <button className="inline-flex items-center gap-2" onClick={chip.onRemove} type="button">
                        {chip.label}
                        <X className="h-3 w-3" />
                      </button>
                    </Badge>
                  ))
                ) : (
                  <span className="text-sm text-muted">Nenhum filtro aplicado.</span>
                )}
              </div>
              <Button disabled={!activeFilters.length} onClick={clearFilters} size="sm" variant="outline">
                Limpar filtros
              </Button>
            </div>
          </div>
        </CardHeader>
      </Card>

      <Card className="border-border bg-surface shadow-[0_10px_28px_rgba(15,23,42,0.04)]">
        <CardHeader className="space-y-4">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <h2 className="text-lg font-semibold text-text">Fila de notificações</h2>
              <p className="text-sm text-text-body">
                Priorize por criticidade, categoria, data ou ativo. O recorte atual é controlado pelos filtros acima.
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <Badge tone="neutral">Visão: {VIEW_MODES.find((item) => item.key === viewMode)?.label ?? "Por prioridade"}</Badge>
              <Badge tone="neutral">{shownLabel}</Badge>
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            {VIEW_MODES.map((mode) => (
              <Button
                key={mode.key}
                onClick={() => {
                  setViewMode(mode.key);
                  setVisibleCount(10);
                }}
                size="sm"
                variant={viewMode === mode.key ? "default" : "outline"}
              >
                {mode.label}
              </Button>
            ))}
          </div>

          <div className="text-sm text-muted">
            <span className="inline-flex items-center gap-1">
              <Clock3 className="h-3.5 w-3.5" />
              {loading ? "Atualizando inbox..." : listTotal > items.length ? `Carregados ${items.length} de ${listTotal} itens retornados pela API.` : `Total carregado: ${items.length} item(ns).`}
            </span>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {loading ? (
            <div className="rounded-2xl border border-border bg-bg-subtle px-4 py-6 text-sm text-muted">Carregando notificações...</div>
          ) : error ? (
            <EmptyState
              action={
                <Button onClick={() => void refresh()} variant="outline">
                  Tentar novamente
                </Button>
              }
              description={error}
              title="Não foi possível carregar o Inbox"
            />
          ) : noResults ? (
            <EmptyState
              action={
                <Button onClick={clearFilters} variant="outline">
                  Limpar filtros
                </Button>
              }
              description="Nenhuma notificação corresponde aos filtros atuais. Ajuste categoria, severidade, origem ou estado."
              icon={<CircleAlert className="h-5 w-5" />}
              title="Nenhum resultado com os filtros atuais"
            />
          ) : (
            <div className="space-y-5">
              {visibleSections.map((section) => (
                <section className="space-y-3" key={section.key}>
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div>
                      <h3 className="text-sm font-semibold text-text">{section.title}</h3>
                      <p className="text-xs leading-5 text-muted">{section.description}</p>
                    </div>
                    <Badge tone="neutral">{section.items.length}</Badge>
                  </div>
                  <div className="space-y-3">
                    {section.items.map((item) => (
                      <InboxItemCard
                        busy={busyId === item.id}
                        item={item}
                        key={item.id}
                        onArchive={(current) => void performAction(current, "archive")}
                        onForward={(current) => handleForward(current)}
                        onMarkRead={(current) => void performAction(current, "read")}
                        onMarkUnread={(current) => void performAction(current, "unread")}
                        recurrenceCount={recurrenceCountFor(item, recurrenceMap)}
                      />
                    ))}
                  </div>
                </section>
              ))}

              {hasMoreItems ? (
                <div className="flex justify-center pt-2">
                  <Button onClick={() => setVisibleCount((current) => current + 10)} variant="outline">
                    Ver mais 10
                  </Button>
                </div>
              ) : null}
            </div>
          )}
        </CardContent>
      </Card>

      <section className="space-y-3">
        <div>
          <h2 className="text-lg font-semibold text-text">Jornadas principais do Inbox</h2>
          <p className="text-sm text-text-body">Use os atalhos para investigar origem, impacto e contexto das notificações.</p>
        </div>
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {[
            { description: "Revisar regras, violações e score.", href: "/data-quality", label: "Data Quality", tone: "accent" },
            { description: "Acompanhar solicitações e aprovações.", href: "/governance/stewardship", label: "Stewardship", tone: "success" },
            { description: "Abrir chamados quando o sinal precisa de tratativa.", href: "/incidents", label: "Incidentes", tone: "warning" },
            { description: "Abrir o ativo e revisar ownership e metadados.", href: "/explorer", label: "Explorer", tone: "accent" },
            { description: "Atribuir o responsável certo ao ativo.", href: "/data-owners", label: "Owners", tone: "success" },
            { description: "Correlacionar com filas, jobs e operação.", href: "/ops/cockpit", label: "Ops Cockpit", tone: "warning" },
            { description: "Revisar alertas sensíveis e de acesso.", href: "/privacy-access", label: "Privacidade", tone: "danger" },
          ].map((journey) => (
            <Card className="border-border bg-surface shadow-[0_10px_28px_rgba(15,23,42,0.04)]" key={journey.label}>
              <CardHeader className="space-y-2 pb-3">
                <div className="flex items-center justify-between gap-2">
                  <Badge tone={journey.tone as "success" | "accent" | "warning" | "danger" | "neutral"}>{journey.label}</Badge>
                </div>
                <p className="text-sm leading-6 text-text-body">{journey.description}</p>
              </CardHeader>
              <CardContent>
                <Button asChild className="w-full justify-start" size="sm" variant="outline">
                  <Link href={journey.href}>Abrir</Link>
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      <ForwardNotificationModal
        notification={forwardTarget}
        onClose={() => setForwardTarget(null)}
        onSubmit={submitForward}
        submitting={forwardSubmitting}
      />
    </div>
  );
}
