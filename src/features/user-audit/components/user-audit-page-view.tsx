import { useEffect, useMemo, useState } from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { cn } from "@/lib/cn";

import {
  getUserAuditSummary,
  listUserAuditChanges,
  listUserAuditEvents,
  listUserAuditExports,
  listUserAuditSessions,
  listUserAuditSensitiveAccess,
} from "../api";
import type {
  UserAuditAccessEvent,
  UserAuditChangeEvent,
  UserAuditSession,
  UserAuditSummary,
} from "../types";

type TabKey = "sessions" | "events" | "changes" | "sensitive" | "exports";

const TAB_OPTIONS: Array<{ key: TabKey; label: string; description: string }> = [
  { key: "sessions", label: "Sessões", description: "logins, duração e término" },
  { key: "events", label: "Acessos", description: "páginas e recursos visualizados" },
  { key: "changes", label: "Alterações", description: "mudanças auditadas" },
  { key: "sensitive", label: "Sensíveis", description: "visualizações sensíveis" },
  { key: "exports", label: "Exports", description: "exportações realizadas" },
];

type Filters = {
  periodDays: number;
  q: string;
  userId: string;
  status: string;
  authMethod: string;
  eventType: string;
  pageKey: string;
  resourceType: string;
  sensitivityLevel: string;
  module: string;
};

const DEFAULT_FILTERS: Filters = {
  periodDays: 30,
  q: "",
  userId: "",
  status: "",
  authMethod: "",
  eventType: "",
  pageKey: "",
  resourceType: "",
  sensitivityLevel: "",
  module: "",
};

function fmtDateTime(value: string | null | undefined): string {
  if (!value) return "—";
  return new Intl.DateTimeFormat("pt-BR", {
    dateStyle: "short",
    timeStyle: "short",
  }).format(new Date(value));
}

function fmtDuration(seconds: number | null | undefined): string {
  if (seconds === null || seconds === undefined) return "—";
  if (seconds < 60) return `${seconds}s`;
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  if (hours > 0) return `${hours}h ${minutes % 60}m`;
  return `${minutes}m`;
}

function SummaryCard({ label, value, hint }: { label: string; value: string | number; hint?: string }) {
  return (
    <Card className="shadow-card">
      <CardContent className="p-5">
        <div className="text-sm text-text-body">{label}</div>
        <div className="mt-2 text-2xl font-semibold text-text">{value}</div>
        {hint ? <div className="mt-1 text-xs text-muted">{hint}</div> : null}
      </CardContent>
    </Card>
  );
}

function renderStatusBadge(status: string | null | undefined) {
  const normalized = (status || "").toLowerCase();
  const tone = normalized === "em_andamento" ? "success" : normalized === "expirada" || normalized === "revogada" ? "danger" : "neutral";
  return <Badge tone={tone}>{status || "—"}</Badge>;
}

function DetailBlock({ title, value }: { title: string; value: string }) {
  return (
    <div className="rounded-xl border border-border/70 bg-bg-subtle/80 p-3">
      <div className="text-[11px] font-semibold uppercase tracking-wide text-muted">{title}</div>
      <div className="mt-1 text-sm text-text">{value}</div>
    </div>
  );
}

function EventDetails({
  selected,
  tab,
}: {
  selected: UserAuditSession | UserAuditAccessEvent | UserAuditChangeEvent | null;
  tab: TabKey;
}) {
  if (!selected) {
    return <EmptyState title="Selecione um item" description="Clique em uma linha para ver os detalhes do evento." />;
  }
  if (tab === "sessions") {
    const item = selected as UserAuditSession;
    return (
      <div className="grid gap-3 md:grid-cols-2">
        <DetailBlock title="Usuário" value={item.user_name || item.user_email || String(item.user_id)} />
        <DetailBlock title="Sessão" value={item.session_jti} />
        <DetailBlock title="Início" value={fmtDateTime(item.started_at)} />
        <DetailBlock title="Último acesso" value={fmtDateTime(item.last_seen_at)} />
        <DetailBlock title="Fim" value={fmtDateTime(item.ended_at)} />
        <DetailBlock title="Duração" value={fmtDuration(item.duration_seconds)} />
        <DetailBlock title="Status" value={item.status} />
        <DetailBlock title="IP" value={item.ip_address || "—"} />
      </div>
    );
  }
  if (tab === "changes" || tab === "exports") {
    const item = selected as UserAuditChangeEvent;
    return (
      <div className="grid gap-3 md:grid-cols-2">
        <DetailBlock title="Usuário" value={item.actor_name || item.user_email || "—"} />
        <DetailBlock title="Ação" value={item.action} />
        <DetailBlock title="Recurso" value={`${item.entity_type || "—"} / ${item.entity_id || "—"}`} />
        <DetailBlock title="Módulo" value={item.source_module || "—"} />
        <DetailBlock title="Campo" value={item.field_name || "—"} />
        <DetailBlock title="Sensível" value={item.is_sensitive_change ? "Sim" : "Não"} />
        <DetailBlock title="Antes" value={JSON.stringify(item.before_json ?? {}, null, 2)} />
        <DetailBlock title="Depois" value={JSON.stringify(item.after_json ?? {}, null, 2)} />
      </div>
    );
  }
  const item = selected as UserAuditAccessEvent;
  return (
    <div className="grid gap-3 md:grid-cols-2">
      <DetailBlock title="Usuário" value={item.user_name || item.user_email || String(item.user_id ?? "—")} />
      <DetailBlock title="Evento" value={item.event_type} />
      <DetailBlock title="Página" value={item.page_key || "—"} />
      <DetailBlock title="Recurso" value={item.resource_fqn || item.route_path || "—"} />
      <DetailBlock title="Tipo" value={item.resource_type || "—"} />
      <DetailBlock title="Sensível" value={item.has_sensitive_data || item.has_personal_data ? "Sim" : "Não"} />
      <DetailBlock title="Schema" value={item.schema_name || "—"} />
      <DetailBlock title="Tabela" value={item.table_name || "—"} />
      <DetailBlock title="Metadados" value={JSON.stringify(item.metadata_json ?? {}, null, 2)} />
    </div>
  );
}

export function UserAuditPageView() {
  const [filters, setFilters] = useState<Filters>(DEFAULT_FILTERS);
  const [activeTab, setActiveTab] = useState<TabKey>("sessions");
  const [summary, setSummary] = useState<UserAuditSummary | null>(null);
  const [sessionItems, setSessionItems] = useState<UserAuditSession[]>([]);
  const [eventItems, setEventItems] = useState<UserAuditAccessEvent[]>([]);
  const [changeItems, setChangeItems] = useState<UserAuditChangeEvent[]>([]);
  const [sensitiveItems, setSensitiveItems] = useState<UserAuditAccessEvent[]>([]);
  const [exportItems, setExportItems] = useState<UserAuditChangeEvent[]>([]);
  const [selected, setSelected] = useState<UserAuditSession | UserAuditAccessEvent | UserAuditChangeEvent | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [page, setPage] = useState(1);
  const pageSize = 25;
  const [hasMore, setHasMore] = useState(false);

  const currentItems = useMemo(() => {
    if (activeTab === "events") return eventItems;
    if (activeTab === "changes") return changeItems;
    if (activeTab === "sensitive") return sensitiveItems;
    if (activeTab === "exports") return exportItems;
    return sessionItems;
  }, [activeTab, changeItems, eventItems, exportItems, sensitiveItems, sessionItems]);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError("");
    void getUserAuditSummary(filters.periodDays)
      .then((payload) => {
        if (!cancelled) setSummary(payload);
      })
      .catch((err) => {
        if (!cancelled) setError((err as Error).message);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [filters.periodDays]);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError("");
    const common = {
      page,
      pageSize,
      periodDays: filters.periodDays,
      q: filters.q || null,
      userId: filters.userId ? Number(filters.userId) : null,
    };
    const load = async () => {
      try {
        if (activeTab === "sessions") {
          const payload = await listUserAuditSessions({
            ...common,
            status: filters.status || null,
            authMethod: filters.authMethod || null,
          });
          if (!cancelled) {
            setSessionItems(payload.items ?? []);
            setHasMore(Boolean(payload.has_more));
          }
        } else if (activeTab === "events") {
          const payload = await listUserAuditEvents({
            ...common,
            eventType: filters.eventType || null,
            pageKey: filters.pageKey || null,
            resourceType: filters.resourceType || null,
            sensitivityLevel: filters.sensitivityLevel || null,
          });
          if (!cancelled) {
            setEventItems(payload.items ?? []);
            setHasMore(Boolean(payload.has_more));
          }
        } else if (activeTab === "changes") {
          const payload = await listUserAuditChanges({
            ...common,
            module: filters.module || null,
          });
          if (!cancelled) {
            setChangeItems(payload.items ?? []);
            setHasMore(Boolean(payload.has_more));
          }
        } else if (activeTab === "sensitive") {
          const payload = await listUserAuditSensitiveAccess(common);
          if (!cancelled) {
            setSensitiveItems(payload.items ?? []);
            setHasMore(Boolean(payload.has_more));
          }
        } else {
          const payload = await listUserAuditExports(common);
          if (!cancelled) {
            setExportItems(payload.items ?? []);
            setHasMore(Boolean(payload.has_more));
          }
        }
      } catch (err) {
        if (!cancelled) setError((err as Error).message);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    void load();
    return () => {
      cancelled = true;
    };
  }, [activeTab, filters.authMethod, filters.eventType, filters.module, filters.pageKey, filters.periodDays, filters.q, filters.resourceType, filters.sensitivityLevel, filters.status, filters.userId, page]);

  function updateFilter<K extends keyof Filters>(key: K, value: Filters[K]) {
    setPage(1);
    setSelected(null);
    setFilters((prev) => ({ ...prev, [key]: value }));
  }

  function paginate(delta: number) {
    setPage((current) => Math.max(1, current + delta));
  }

  const periodLabel = `${filters.periodDays} dias`;

  return (
    <div className="space-y-6">
      <section className="space-y-4">
        <div>
          <h1 className="text-3xl font-semibold text-text">Auditoria de usuários</h1>
          <p className="mt-2 max-w-3xl text-sm text-text-body">
            Sessões, navegação, visualização de ativos, alterações e acessos sensíveis. Os dados são gravados com metadados e redaction para investigação administrativa.
          </p>
        </div>
        <div className="grid gap-4 md:grid-cols-3 xl:grid-cols-6">
          <SummaryCard label="Usuários ativos hoje" value={summary?.users_active_today ?? "—"} hint={`Janela: ${periodLabel}`} />
          <SummaryCard label="Logins 24h" value={summary?.logins_last_24h ?? "—"} />
          <SummaryCard label="Sessões abertas" value={summary?.open_sessions ?? "—"} />
          <SummaryCard label="Páginas 24h" value={summary?.page_views_last_24h ?? "—"} />
          <SummaryCard label="Exports 24h" value={summary?.exports_last_24h ?? "—"} />
          <SummaryCard label="Sensíveis 24h" value={summary?.sensitive_access_last_24h ?? "—"} />
        </div>
        <div className="grid gap-4 md:grid-cols-3">
          <Card className="shadow-card">
            <CardHeader className="pb-2">
              <h2 className="text-base font-semibold">Top páginas</h2>
            </CardHeader>
            <CardContent className="space-y-2">
              {(summary?.top_pages ?? []).map((item) => (
                <div key={item.label} className="flex items-center justify-between text-sm">
                  <span className="text-text-body">{item.label}</span>
                  <Badge tone="neutral">{item.value}</Badge>
                </div>
              ))}
            </CardContent>
          </Card>
          <Card className="shadow-card">
            <CardHeader className="pb-2">
              <h2 className="text-base font-semibold">Top ativos</h2>
            </CardHeader>
            <CardContent className="space-y-2">
              {(summary?.top_assets ?? []).map((item) => (
                <div key={item.label} className="flex items-center justify-between text-sm">
                  <span className="text-text-body">{item.label}</span>
                  <Badge tone="neutral">{item.value}</Badge>
                </div>
              ))}
            </CardContent>
          </Card>
          <Card className="shadow-card">
            <CardHeader className="pb-2">
              <h2 className="text-base font-semibold">Top usuários</h2>
            </CardHeader>
            <CardContent className="space-y-2">
              {(summary?.top_users ?? []).map((item) => (
                <div key={item.label} className="flex items-center justify-between text-sm">
                  <span className="text-text-body">{item.label}</span>
                  <Badge tone="neutral">{item.value}</Badge>
                </div>
              ))}
            </CardContent>
          </Card>
        </div>
      </section>

      <Card className="shadow-card">
        <CardHeader className="space-y-4">
          <div className="flex flex-wrap gap-2">
            {TAB_OPTIONS.map((tab) => (
              <Button
                key={tab.key}
                type="button"
                variant={activeTab === tab.key ? "default" : "outline"}
                onClick={() => {
                  setActiveTab(tab.key);
                  setPage(1);
                  setSelected(null);
                }}
              >
                {tab.label}
              </Button>
            ))}
          </div>
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-6">
            <Input
              placeholder="Buscar usuário, recurso ou rota"
              value={filters.q}
              onChange={(event) => updateFilter("q", event.target.value)}
            />
            <Input
              type="number"
              min={1}
              max={3650}
              value={filters.periodDays}
              onChange={(event) => updateFilter("periodDays", Math.max(1, Number(event.target.value || 30)))}
              placeholder="Período (dias)"
            />
            <Input placeholder="User ID" value={filters.userId} onChange={(event) => updateFilter("userId", event.target.value)} />
            <Select value={filters.status} onChange={(event) => updateFilter("status", event.target.value)}>
              <option value="">Status da sessão</option>
              <option value="em_andamento">Em andamento</option>
              <option value="encerrada">Encerrada</option>
              <option value="expirada">Expirada</option>
              <option value="revogada">Revogada</option>
            </Select>
            <Select value={filters.eventType} onChange={(event) => updateFilter("eventType", event.target.value)}>
              <option value="">Tipo de evento</option>
              <option value="page_view">Page view</option>
              <option value="asset_view">Asset view</option>
              <option value="search">Search</option>
              <option value="filter_apply">Filter apply</option>
              <option value="export">Export</option>
              <option value="sensitive_view">Sensitive view</option>
            </Select>
            <Select value={filters.module} onChange={(event) => updateFilter("module", event.target.value)}>
              <option value="">Módulo</option>
              <option value="data_quality">Data Quality</option>
              <option value="privacy">Privacy</option>
              <option value="certification">Certification</option>
              <option value="owners">Owners</option>
              <option value="users">Users</option>
              <option value="incident">Incidents</option>
            </Select>
          </div>
          <div className="grid gap-3 md:grid-cols-3 xl:grid-cols-4">
            <Input placeholder="page_key" value={filters.pageKey} onChange={(event) => updateFilter("pageKey", event.target.value)} />
            <Input placeholder="resource_type" value={filters.resourceType} onChange={(event) => updateFilter("resourceType", event.target.value)} />
            <Input placeholder="auth_method" value={filters.authMethod} onChange={(event) => updateFilter("authMethod", event.target.value)} />
            <Input placeholder="sensitivity_level" value={filters.sensitivityLevel} onChange={(event) => updateFilter("sensitivityLevel", event.target.value)} />
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {error ? <div className="rounded-xl border border-warning-200 bg-warning-50 px-4 py-3 text-sm text-warning-700">{error}</div> : null}
          {loading && currentItems.length === 0 ? (
            <div className="space-y-3">
              <div className="h-12 animate-pulse rounded-xl bg-bg-subtle" />
              <div className="h-12 animate-pulse rounded-xl bg-bg-subtle" />
              <div className="h-12 animate-pulse rounded-xl bg-bg-subtle" />
            </div>
          ) : currentItems.length === 0 ? (
            <EmptyState title="Nenhum resultado" description="Ajuste os filtros para encontrar sessões e eventos de auditoria." />
          ) : (
            <div className="overflow-x-auto rounded-2xl border border-border/70">
              <table className="min-w-full text-left text-sm">
                <thead className="bg-bg-subtle text-xs uppercase tracking-wide text-muted">
                  <tr>
                    {activeTab === "sessions" ? (
                      <>
                        <th className="px-4 py-3">Usuário</th>
                        <th className="px-4 py-3">Início</th>
                        <th className="px-4 py-3">Duração</th>
                        <th className="px-4 py-3">Último acesso</th>
                        <th className="px-4 py-3">IP</th>
                        <th className="px-4 py-3">Status</th>
                      </>
                    ) : null}
                    {activeTab === "events" || activeTab === "sensitive" ? (
                      <>
                        <th className="px-4 py-3">Data/hora</th>
                        <th className="px-4 py-3">Usuário</th>
                        <th className="px-4 py-3">Página</th>
                        <th className="px-4 py-3">Recurso</th>
                        <th className="px-4 py-3">Ação</th>
                        <th className="px-4 py-3">Sensível</th>
                      </>
                    ) : null}
                    {activeTab === "changes" || activeTab === "exports" ? (
                      <>
                        <th className="px-4 py-3">Data/hora</th>
                        <th className="px-4 py-3">Usuário</th>
                        <th className="px-4 py-3">Módulo</th>
                        <th className="px-4 py-3">Ação</th>
                        <th className="px-4 py-3">Recurso</th>
                        <th className="px-4 py-3">Sensível</th>
                      </>
                    ) : null}
                  </tr>
                </thead>
                <tbody>
                  {activeTab === "sessions"
                    ? (currentItems as UserAuditSession[]).map((item) => (
                        <tr key={item.id} className="cursor-pointer border-t border-border/70 hover:bg-bg-subtle" onClick={() => setSelected(item)}>
                          <td className="px-4 py-3">{item.user_name || item.user_email || item.user_id}</td>
                          <td className="px-4 py-3">{fmtDateTime(item.started_at)}</td>
                          <td className="px-4 py-3">{fmtDuration(item.duration_seconds)}</td>
                          <td className="px-4 py-3">{fmtDateTime(item.last_seen_at)}</td>
                          <td className="px-4 py-3">{item.ip_address || "—"}</td>
                          <td className="px-4 py-3">{renderStatusBadge(item.status)}</td>
                        </tr>
                      ))
                    : null}
                  {(activeTab === "events" || activeTab === "sensitive")
                    ? (currentItems as UserAuditAccessEvent[]).map((item) => (
                        <tr key={item.id} className="cursor-pointer border-t border-border/70 hover:bg-bg-subtle" onClick={() => setSelected(item)}>
                          <td className="px-4 py-3">{fmtDateTime(item.created_at)}</td>
                          <td className="px-4 py-3">{item.user_name || item.user_email || item.user_id || "—"}</td>
                          <td className="px-4 py-3">{item.page_key || "—"}</td>
                          <td className="px-4 py-3">{item.resource_fqn || item.route_path || "—"}</td>
                          <td className="px-4 py-3">{item.action || item.event_type}</td>
                          <td className="px-4 py-3">{item.has_sensitive_data || item.has_personal_data ? <Badge tone="danger">Sim</Badge> : <Badge tone="neutral">Não</Badge>}</td>
                        </tr>
                      ))
                    : null}
                  {(activeTab === "changes" || activeTab === "exports")
                    ? (currentItems as UserAuditChangeEvent[]).map((item) => (
                        <tr key={item.id} className="cursor-pointer border-t border-border/70 hover:bg-bg-subtle" onClick={() => setSelected(item)}>
                          <td className="px-4 py-3">{fmtDateTime(item.created_at)}</td>
                          <td className="px-4 py-3">{item.actor_name || item.user_email || item.user_id || "—"}</td>
                          <td className="px-4 py-3">{item.source_module || "—"}</td>
                          <td className="px-4 py-3">{item.action}</td>
                          <td className="px-4 py-3">{item.entity_type || item.entity_id || "—"}</td>
                          <td className="px-4 py-3">{item.is_sensitive_change ? <Badge tone="danger">Sim</Badge> : <Badge tone="neutral">Não</Badge>}</td>
                        </tr>
                      ))
                    : null}
                </tbody>
              </table>
            </div>
          )}

          <div className="flex items-center justify-between gap-3">
            <div className="text-sm text-muted">
              Página {page} · {pageSize} itens por página
            </div>
            <div className="flex gap-2">
              <Button type="button" variant="outline" onClick={() => paginate(-1)} disabled={page <= 1}>
                Anterior
              </Button>
              <Button type="button" variant="outline" onClick={() => paginate(1)} disabled={loading || !hasMore}>
                Próxima
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="shadow-card">
        <CardHeader>
          <h2 className="text-base font-semibold">Detalhe do item selecionado</h2>
        </CardHeader>
        <CardContent>
          <div className={cn("rounded-2xl border border-border/70 bg-surface p-4", selected ? "block" : "opacity-90")}>
            <EventDetails selected={selected} tab={activeTab} />
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
