import { FormEvent, useEffect, useMemo, useState } from "react";
import { Link } from "@/lib/next-shims";
import { useSearchParams } from "@/lib/next-shims";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { useAuth } from "@/lib/auth";
import { apiRequest, downloadApiFile } from "@/lib/client-api";

import { AuditHistoryFeed } from "./history-feed";
import type { AuditHistoryEvent, AuditHistoryFilterOptions, AuditHistoryPage } from "../types";

type AuditFilters = {
  q: string;
  actor: string;
  entity_type: string;
  entity_id: string;
  change_type: string;
  field_name: string;
  source_module: string;
  sensitive_only: string;
  datasource: string;
  database: string;
  schema: string;
  date_from: string;
  date_to: string;
};

const DEFAULT_FILTERS: AuditFilters = {
  q: "",
  actor: "",
  entity_type: "",
  entity_id: "",
  change_type: "",
  field_name: "",
  source_module: "",
  sensitive_only: "",
  datasource: "",
  database: "",
  schema: "",
  date_from: "",
  date_to: "",
};

function describeAuditAction(value: string | null): string {
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

function describeSourceModule(value: string | null): string {
  const labels: Record<string, string> = {
    catalog: "Catálogo",
    glossary: "Glossário",
    tags: "Tags",
    certification: "Certificação",
    privacy_access: "Privacidade e acesso",
    governance: "Governança",
    search: "Busca",
    dashboard: "Dashboard",
    incidents: "Incidentes",
    lineage: "Linhagem",
    admin: "Administração",
  };
  if (!value) return "—";
  return labels[value] ?? value.replaceAll("_", " ");
}

function buildQuery(filters: AuditFilters, page: number, pageSize: number): string {
  const params = new URLSearchParams();
  params.set("page", String(page));
  params.set("page_size", String(pageSize));
  for (const [key, value] of Object.entries(filters)) {
    if (!value.trim()) continue;
    if (key === "date_from") {
      params.set(key, new Date(`${value}T00:00:00`).toISOString());
      continue;
    }
    if (key === "date_to") {
      params.set(key, new Date(`${value}T23:59:59`).toISOString());
      continue;
    }
    params.set(key, value.trim());
  }
  return params.toString();
}

export function AuditHistoryPageView() {
  const auth = useAuth();
  const canExport = auth.hasPermission("audit:export");
  const searchParams = useSearchParams();
  const [filters, setFilters] = useState<AuditFilters>(DEFAULT_FILTERS);
  const [appliedFilters, setAppliedFilters] = useState<AuditFilters>(DEFAULT_FILTERS);
  const [options, setOptions] = useState<AuditHistoryFilterOptions | null>(null);
  const [events, setEvents] = useState<AuditHistoryEvent[]>([]);
  const [selectedEvent, setSelectedEvent] = useState<AuditHistoryEvent | null>(null);
  const [status, setStatus] = useState("");
  const [loading, setLoading] = useState(true);
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false);
  const [page, setPage] = useState(1);
  const pageSize = 10;
  const [total, setTotal] = useState(0);

  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const rangeStart = total === 0 ? 0 : (page - 1) * pageSize + 1;
  const rangeEnd = Math.min(total, page * pageSize);

  useEffect(() => {
    const nextFilters: AuditFilters = {
      ...DEFAULT_FILTERS,
      q: searchParams.get("q") || "",
      actor: searchParams.get("actor") || "",
      entity_type: searchParams.get("entity_type") || "",
      entity_id: searchParams.get("entity_id") || "",
      change_type: searchParams.get("change_type") || "",
      field_name: searchParams.get("field_name") || "",
      source_module: searchParams.get("source_module") || "",
      sensitive_only: searchParams.get("sensitive_only") || "",
      datasource: searchParams.get("datasource") || "",
      database: searchParams.get("database") || "",
      schema: searchParams.get("schema") || "",
      date_from: searchParams.get("date_from") || "",
      date_to: searchParams.get("date_to") || "",
    };
    setFilters(nextFilters);
    setAppliedFilters(nextFilters);
    setPage(1);
  }, [searchParams]);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const payload = await apiRequest<AuditHistoryFilterOptions>("/v1/audit/history/options");
        if (!cancelled) setOptions(payload);
      } catch {
        if (!cancelled) setOptions(null);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setStatus("");
    void (async () => {
      try {
        const payload = await apiRequest<AuditHistoryPage>(`/v1/audit/history?${buildQuery(appliedFilters, page, pageSize)}`);
        if (cancelled) return;
        setEvents(payload.items || []);
        setTotal(payload.total || 0);
      } catch (error) {
        if (!cancelled) {
          setStatus(error instanceof Error ? error.message : "Não foi possível carregar o histórico.");
          setEvents([]);
          setTotal(0);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [appliedFilters, page]);

  function applyFilters(event?: FormEvent) {
    event?.preventDefault();
    setAppliedFilters({ ...filters });
    setPage(1);
  }

  function clearFilters() {
    setFilters(DEFAULT_FILTERS);
    setAppliedFilters(DEFAULT_FILTERS);
    setPage(1);
  }

  const activeFilters = useMemo(
    () => Object.values(appliedFilters).filter((value) => value.trim().length > 0).length,
    [appliedFilters],
  );

  async function handleExportCsv() {
    await downloadApiFile(`/v1/audit/history/export.csv?${buildQuery(appliedFilters, 1, pageSize)}`, "auditoria.csv", undefined, {
      confirmMessage:
        "Exportar o historico de auditoria filtrado (limite de 1.000 linhas)? A exportacao sera auditada e campos sensiveis permanecem mascarados.",
    });
  }

  async function handleExportXlsx() {
    await downloadApiFile(`/v1/audit/history/export.xlsx?${buildQuery(appliedFilters, 1, pageSize)}`, "auditoria.xlsx", undefined, {
      confirmMessage:
        "Exportar o historico de auditoria filtrado em Excel (limite de 1.000 linhas)? A exportacao sera auditada e campos sensiveis permanecem mascarados.",
    });
  }

  return (
    <main className="mx-auto max-w-7xl space-y-6 p-4 sm:p-6">
      <Card className="border-border bg-gradient-to-br from-white via-slate-50 to-accent-50 shadow-[0_18px_50px_rgba(15,23,42,0.05)]">
        <CardContent className="space-y-4 p-6">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-muted">Governança & rastreabilidade</p>
              <h1 className="mt-2 text-3xl font-semibold tracking-tight text-text">Auditoria de mudanças</h1>
              <p className="mt-2 max-w-3xl text-sm leading-6 text-text-body">
                Consulte alterações relevantes de owner, certificação, classificação e metadados governados com autoria,
                before/after e contexto do ativo relacionado.
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <Badge tone="neutral">{total} evento(s)</Badge>
              <Badge tone="neutral">{activeFilters > 0 ? `${activeFilters} filtro(s)` : "Sem filtros"}</Badge>
              {canExport ? (
                <>
                  <Button onClick={() => void handleExportCsv()} size="sm" variant="outline">Exportar CSV</Button>
                  <Button onClick={() => void handleExportXlsx()} size="sm" variant="outline">Exportar Excel</Button>
                </>
              ) : null}
            </div>
          </div>
        </CardContent>
      </Card>

      <form onSubmit={applyFilters}>
        <Card className="border-border bg-surface shadow-soft">
          <CardContent className="space-y-4 p-5">
            <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-brand-600">Filtros essenciais</p>
                <p className="mt-1 text-sm text-text-body">Comece pelo recorte principal e expanda os filtros avançados apenas quando precisar refinar a investigação.</p>
              </div>
              <Button onClick={() => setShowAdvancedFilters((value) => !value)} type="button" variant="outline">
                {showAdvancedFilters ? "Ocultar filtros avançados" : "Mostrar filtros avançados"}
              </Button>
            </div>
            <div className="grid gap-3 lg:grid-cols-5">
              <Input placeholder="Buscar por ação, ator, campo ou ativo" value={filters.q} onChange={(e) => setFilters((prev) => ({ ...prev, q: e.target.value }))} />
              <Input placeholder="Usuário" value={filters.actor} onChange={(e) => setFilters((prev) => ({ ...prev, actor: e.target.value }))} />
              <Select value={filters.entity_type} onChange={(e) => setFilters((prev) => ({ ...prev, entity_type: e.target.value }))}>
                <option value="">Todos os tipos</option>
                {(options?.entity_types || []).map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}
              </Select>
              <Select value={filters.change_type} onChange={(e) => setFilters((prev) => ({ ...prev, change_type: e.target.value }))}>
                <option value="">Todos os tipos de mudança</option>
                {(options?.change_types || []).map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}
              </Select>
              <Select value={filters.sensitive_only} onChange={(e) => setFilters((prev) => ({ ...prev, sensitive_only: e.target.value }))}>
                <option value="">Todas as mudanças</option>
                <option value="true">Somente mudanças sensíveis</option>
              </Select>
            </div>
            {showAdvancedFilters ? (
              <div className="grid gap-3 rounded-2xl border border-border bg-bg-subtle p-4 lg:grid-cols-4">
                <Input placeholder="ID da entidade" value={filters.entity_id} onChange={(e) => setFilters((prev) => ({ ...prev, entity_id: e.target.value }))} />
                <Select value={filters.field_name} onChange={(e) => setFilters((prev) => ({ ...prev, field_name: e.target.value }))}>
                  <option value="">Todos os campos</option>
                  {(options?.field_names || []).map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}
                </Select>
                <Select value={filters.source_module} onChange={(e) => setFilters((prev) => ({ ...prev, source_module: e.target.value }))}>
                  <option value="">Todos os módulos</option>
                  {(options?.source_modules || []).map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}
                </Select>
                <Input placeholder="Fonte" value={filters.datasource} onChange={(e) => setFilters((prev) => ({ ...prev, datasource: e.target.value }))} />
                <Input placeholder="Banco" value={filters.database} onChange={(e) => setFilters((prev) => ({ ...prev, database: e.target.value }))} />
                <Input placeholder="Schema" value={filters.schema} onChange={(e) => setFilters((prev) => ({ ...prev, schema: e.target.value }))} />
                <Input type="date" value={filters.date_from} onChange={(e) => setFilters((prev) => ({ ...prev, date_from: e.target.value }))} />
                <Input type="date" value={filters.date_to} onChange={(e) => setFilters((prev) => ({ ...prev, date_to: e.target.value }))} />
              </div>
            ) : null}
            <div className="flex items-center gap-2">
              <Button disabled={loading} type="submit">Aplicar filtros</Button>
              <Button disabled={loading} onClick={clearFilters} type="button" variant="outline">Limpar</Button>
            </div>
          </CardContent>
        </Card>
      </form>

      {status ? <p className="text-sm text-danger-600">{status}</p> : null}

      <section className="grid gap-4 xl:grid-cols-[1.4fr_0.6fr]">
        <div>
          <AuditHistoryFeed
            emptyDescription="Nenhum evento encontrado para os filtros selecionados."
            emptyTitle="Sem eventos de auditoria"
            events={events}
            loading={loading}
          />
        </div>

        <Card className="self-start border-border/80 shadow-[0_14px_36px_rgba(15,23,42,0.04)]">
          <CardHeader>
            <h2 className="text-sm font-semibold text-text">Visão rápida</h2>
            <p className="mt-1 text-xs text-muted">Use a linha do tempo para abrir os eventos mais sensíveis e navegar para o ativo impactado.</p>
          </CardHeader>
          <CardContent className="space-y-3 text-sm text-text-body">
            <div className="rounded-2xl border border-border bg-bg-subtle p-4">
              <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-brand-600">Página atual</p>
              <p className="mt-2 text-lg font-semibold text-text">{page}</p>
              <p className="text-xs text-muted">de {totalPages}</p>
            </div>
            <div className="rounded-2xl border border-border bg-bg-subtle p-4">
              <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-brand-600">Eventos carregados</p>
              <p className="mt-2 text-lg font-semibold text-text">{events.length}</p>
              <p className="text-xs text-muted">Itens nesta página</p>
            </div>
            {events.slice(0, 4).map((event) => (
              <button
                className="w-full rounded-2xl border border-border px-4 py-3 text-left transition hover:border-info-200 hover:bg-info-50/50"
                key={event.id}
                onClick={() => setSelectedEvent(event)}
                type="button"
              >
                <p className="text-sm font-semibold text-text">{event.table_name || event.entity_type || "Evento"}</p>
                <p className="mt-1 text-xs text-muted">
                  {event.field_name || "campo"} • {new Date(event.changed_at).toLocaleString("pt-BR")}
                </p>
              </button>
            ))}
          </CardContent>
        </Card>
      </section>

      <Card className="border-border bg-surface shadow-soft">
        <CardContent className="flex items-center justify-between gap-3 px-4 py-3">
          <Button disabled={page <= 1 || loading} onClick={() => setPage((value) => Math.max(1, value - 1))} variant="outline">
            Anterior
          </Button>
          <div className="text-center">
            <p className="text-sm text-muted">
              Mostrando {rangeStart}-{rangeEnd} de {total} evento(s)
            </p>
            <p className="mt-1 text-xs text-muted">
              Página {page} de {totalPages}
            </p>
          </div>
          <Button disabled={page >= totalPages || loading} onClick={() => setPage((value) => Math.min(totalPages, value + 1))} variant="outline">
            Próxima
          </Button>
        </CardContent>
      </Card>

      {selectedEvent ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/45 p-4">
          <div className="max-h-[88vh] w-full max-w-4xl overflow-hidden rounded-[28px] border border-border bg-surface shadow-[0_30px_80px_rgba(15,23,42,0.24)]">
            <div className="flex items-center justify-between border-b border-border px-5 py-4">
              <div>
                <p className="text-sm font-semibold text-text">Evento #{selectedEvent.id}</p>
                <p className="mt-1 text-xs text-muted">
                  {selectedEvent.actor_name || selectedEvent.actor_email || "Sistema"} • {new Date(selectedEvent.changed_at).toLocaleString("pt-BR")}
                </p>
              </div>
              <Button onClick={() => setSelectedEvent(null)} size="sm" variant="ghost">Fechar</Button>
            </div>
            <div className="max-h-[72vh] overflow-auto p-5">
              <div className="grid gap-4 lg:grid-cols-[1fr_1fr]">
                <Card>
                  <CardHeader><h3 className="text-sm font-semibold text-text">Resumo</h3></CardHeader>
                  <CardContent className="space-y-2 text-sm text-text-body">
                    <p><span className="font-medium text-text">Ação:</span> {describeAuditAction(selectedEvent.action)}</p>
                    <p><span className="font-medium text-text">Campo:</span> {selectedEvent.field_name || "—"}</p>
                    <p><span className="font-medium text-text">Tipo:</span> {selectedEvent.change_type || "—"}</p>
                    <p><span className="font-medium text-text">Módulo:</span> {describeSourceModule(selectedEvent.source_module)}</p>
                    <p><span className="font-medium text-text">Contexto:</span> {[selectedEvent.datasource_name, selectedEvent.database_name, selectedEvent.schema_name, selectedEvent.table_name].filter(Boolean).join(" > ") || "—"}</p>
                    {selectedEvent.table_id ? (
                      <Link className="text-sm font-semibold text-info-700 hover:text-info-700" href={`/explorer?tableId=${selectedEvent.table_id}&tab=history`}>
                        Abrir ativo no Explorer
                      </Link>
                    ) : null}
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader><h3 className="text-sm font-semibold text-text">Payload técnico</h3></CardHeader>
                  <CardContent>
                    <pre className="overflow-auto rounded-2xl bg-bg-subtle p-4 text-xs text-text-body">
                      {JSON.stringify(selectedEvent, null, 2)}
                    </pre>
                  </CardContent>
                </Card>
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </main>
  );
}
