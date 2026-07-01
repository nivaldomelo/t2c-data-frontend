import { FormEvent, useEffect, useMemo, useState } from "react";
import { Link } from "@/lib/next-shims";
import { Pencil, Plus, Search, Trash2, WandSparkles } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { apiRequest } from "@/lib/client-api";
import type {
  SearchAliasFiltersResponse,
  SearchAliasItem,
  SearchAliasListResponse,
  SearchAliasPayload,
} from "@/features/search/types";

type Props = {
  canEdit: boolean;
};

type AliasFilters = {
  q: string;
  entity_type: string;
  label_kind: string;
  datasource_id: string;
  database_id: string;
  schema_id: string;
  table_id: string;
  column_id: string;
};

type AliasFormState = {
  entity_type: string;
  label_kind: string;
  label: string;
  table_id: string;
  column_id: string;
};

const EMPTY_FILTERS: AliasFilters = {
  q: "",
  entity_type: "",
  label_kind: "",
  datasource_id: "",
  database_id: "",
  schema_id: "",
  table_id: "",
  column_id: "",
};

const EMPTY_FORM: AliasFormState = {
  entity_type: "table",
  label_kind: "alias",
  label: "",
  table_id: "",
  column_id: "",
};

function labelKindLabel(value: string): string {
  if (value === "friendly_name") return "Nome amigável";
  if (value === "synonym") return "Sinônimo";
  return "Alias";
}

function entityLabel(value: string): string {
  return value === "column" ? "Coluna" : "Tabela";
}

function buildListUrl(filters: AliasFilters): string {
  const params = new URLSearchParams();
  if (filters.q.trim()) params.set("q", filters.q.trim());
  if (filters.entity_type) params.set("entity_type", filters.entity_type);
  if (filters.label_kind) params.set("label_kind", filters.label_kind);
  if (filters.datasource_id) params.set("datasource_id", filters.datasource_id);
  if (filters.database_id) params.set("database_id", filters.database_id);
  if (filters.schema_id) params.set("schema_id", filters.schema_id);
  if (filters.table_id) params.set("table_id", filters.table_id);
  if (filters.column_id) params.set("column_id", filters.column_id);
  return `/v1/search/aliases?${params.toString()}`;
}

function toPayload(form: AliasFormState): SearchAliasPayload {
  return {
    entity_type: form.entity_type,
    label_kind: form.label_kind,
    label: form.label,
    table_id: form.entity_type === "table" && form.table_id ? Number(form.table_id) : null,
    column_id: form.entity_type === "column" && form.column_id ? Number(form.column_id) : null,
  };
}

export function AliasManagementView({ canEdit }: Props) {
  const [filters, setFilters] = useState<AliasFilters>(EMPTY_FILTERS);
  const [availableFilters, setAvailableFilters] = useState<SearchAliasFiltersResponse | null>(null);
  const [payload, setPayload] = useState<SearchAliasListResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [toast, setToast] = useState<{ tone: "success" | "error"; message: string } | null>(null);

  const [editorOpen, setEditorOpen] = useState(false);
  const [editorMode, setEditorMode] = useState<"create" | "edit">("create");
  const [editingItem, setEditingItem] = useState<SearchAliasItem | null>(null);
  const [form, setForm] = useState<AliasFormState>(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<SearchAliasItem | null>(null);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    void (async () => {
      try {
        const data = await apiRequest<SearchAliasFiltersResponse>("/v1/search/alias-filters");
        setAvailableFilters(data);
      } catch (err) {
        setError((err as Error).message);
      }
    })();
  }, []);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError("");
    void (async () => {
      try {
        const data = await apiRequest<SearchAliasListResponse>(buildListUrl(filters));
        if (!cancelled) setPayload(data);
      } catch (err) {
        if (!cancelled) setError((err as Error).message);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [filters]);

  const currentTargetOptions = useMemo(() => {
    if (!availableFilters) return [];
    return form.entity_type === "column" ? availableFilters.columns : availableFilters.tables;
  }, [availableFilters, form.entity_type]);

  function updateFilter(key: keyof AliasFilters, value: string) {
    setFilters((current) => ({ ...current, [key]: value }));
  }

  function clearFilters() {
    setFilters(EMPTY_FILTERS);
  }

  function openCreate() {
    setEditorMode("create");
    setEditingItem(null);
    setForm(EMPTY_FORM);
    setEditorOpen(true);
  }

  function openEdit(item: SearchAliasItem) {
    setEditorMode("edit");
    setEditingItem(item);
    setForm({
      entity_type: item.entity_type,
      label_kind: item.label_kind,
      label: item.label,
      table_id: item.table_id ? String(item.table_id) : "",
      column_id: item.column_id ? String(item.column_id) : "",
    });
    setEditorOpen(true);
  }

  async function saveAlias(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    try {
      if (editorMode === "create") {
        await apiRequest("/v1/search/aliases", {
          method: "POST",
          body: JSON.stringify(toPayload(form)),
        });
        setToast({ tone: "success", message: "Alias salvo com sucesso." });
      } else if (editingItem) {
        await apiRequest(`/v1/search/aliases/${editingItem.entity_type}/${editingItem.id}`, {
          method: "PUT",
          body: JSON.stringify({ label_kind: form.label_kind, label: form.label }),
        });
        setToast({ tone: "success", message: "Alias atualizado com sucesso." });
      }
      setEditorOpen(false);
      const refreshed = await apiRequest<SearchAliasListResponse>(buildListUrl(filters));
      setPayload(refreshed);
    } catch (err) {
      setToast({ tone: "error", message: (err as Error).message });
    } finally {
      setSaving(false);
    }
  }

  async function confirmDelete() {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await apiRequest(`/v1/search/aliases/${deleteTarget.entity_type}/${deleteTarget.id}`, {
        method: "DELETE",
      });
      setToast({ tone: "success", message: "Alias removido com sucesso." });
      setDeleteTarget(null);
      const refreshed = await apiRequest<SearchAliasListResponse>(buildListUrl(filters));
      setPayload(refreshed);
    } catch (err) {
      setToast({ tone: "error", message: (err as Error).message });
    } finally {
      setDeleting(false);
    }
  }

  return (
    <div className="space-y-6 pb-6">
      <Card className="border-border/80 bg-[linear-gradient(135deg,#ffffff_0%,#f8fafc_60%,#eef6ff_100%)] shadow-card">
        <CardContent className="space-y-5 p-6">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div className="space-y-3">
              <div className="inline-flex items-center gap-2 rounded-full border border-brand-200 bg-surface px-3 py-1 text-xs font-medium text-brand-700">
                <WandSparkles className="h-3.5 w-3.5" />
                Busca
              </div>
              <div>
                <h2 className="text-3xl font-semibold tracking-tight text-text">Aliases e nomes amigáveis</h2>
                <p className="mt-2 max-w-4xl text-sm leading-7 text-text-body">
                  Mantenha nomes amigáveis, aliases e sinônimos de negócio para tabelas e colunas. Esses rótulos entram direto na busca global e ajudam a aproximar linguagem técnica e linguagem do negócio.
                </p>
              </div>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button asChild type="button" variant="outline">
                <Link href="/search">Voltar para busca</Link>
              </Button>
              {canEdit ? (
                <Button onClick={openCreate} type="button">
                  <Plus className="mr-2 h-4 w-4" />
                  Novo alias
                </Button>
              ) : null}
            </div>
          </div>

          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
            <label className="space-y-1.5 text-sm text-text-body xl:col-span-2">
              <span className="block text-xs font-semibold uppercase tracking-[0.16em] text-muted">Buscar</span>
              <div className="relative">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
                <Input className="pl-9" onChange={(event) => updateFilter("q", event.target.value)} placeholder="Procure por alias, tabela, coluna, banco ou schema" value={filters.q} />
              </div>
            </label>
            <label className="space-y-1.5 text-sm text-text-body">
              <span className="block text-xs font-semibold uppercase tracking-[0.16em] text-muted">Tipo</span>
              <Select onChange={(event) => updateFilter("entity_type", event.target.value)} value={filters.entity_type}>
                <option value="">Todos</option>
                {(availableFilters?.entity_types || []).map((option) => (
                  <option key={option.value} value={option.value}>{option.label}</option>
                ))}
              </Select>
            </label>
            <label className="space-y-1.5 text-sm text-text-body">
              <span className="block text-xs font-semibold uppercase tracking-[0.16em] text-muted">Rótulo</span>
              <Select onChange={(event) => updateFilter("label_kind", event.target.value)} value={filters.label_kind}>
                <option value="">Todos</option>
                {(availableFilters?.label_kinds || []).map((option) => (
                  <option key={option.value} value={option.value}>{option.label}</option>
                ))}
              </Select>
            </label>
            <label className="space-y-1.5 text-sm text-text-body">
              <span className="block text-xs font-semibold uppercase tracking-[0.16em] text-muted">Fonte</span>
              <Select onChange={(event) => updateFilter("datasource_id", event.target.value)} value={filters.datasource_id}>
                <option value="">Todas</option>
                {(availableFilters?.datasources || []).map((option) => (
                  <option key={option.value} value={option.value}>{option.label}</option>
                ))}
              </Select>
            </label>
            <label className="space-y-1.5 text-sm text-text-body">
              <span className="block text-xs font-semibold uppercase tracking-[0.16em] text-muted">Banco</span>
              <Select onChange={(event) => updateFilter("database_id", event.target.value)} value={filters.database_id}>
                <option value="">Todos</option>
                {(availableFilters?.databases || []).map((option) => (
                  <option key={option.value} value={option.value}>{option.label}</option>
                ))}
              </Select>
            </label>
            <label className="space-y-1.5 text-sm text-text-body">
              <span className="block text-xs font-semibold uppercase tracking-[0.16em] text-muted">Schema</span>
              <Select onChange={(event) => updateFilter("schema_id", event.target.value)} value={filters.schema_id}>
                <option value="">Todos</option>
                {(availableFilters?.schemas || []).map((option) => (
                  <option key={option.value} value={option.value}>{option.label}</option>
                ))}
              </Select>
            </label>
            <div className="flex items-end justify-end">
              <Button onClick={clearFilters} type="button" variant="outline">Limpar filtros</Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {toast ? (
        <Card className={toast.tone === "error" ? "border-danger-200 bg-danger-50" : "border-success-200 bg-success-50"}>
          <CardContent className="p-4 text-sm">{toast.message}</CardContent>
        </Card>
      ) : null}

      {loading ? (
        <div className="space-y-3">
          {Array.from({ length: 6 }).map((_, index) => <Skeleton className="h-16 w-full" key={index} />)}
        </div>
      ) : null}

      {!loading && error ? (
        <Card className="border-danger-200 bg-danger-50">
          <CardContent className="p-5 text-sm text-danger-700">{error}</CardContent>
        </Card>
      ) : null}

      {!loading && !error && payload && payload.total === 0 ? (
        <EmptyState title="Nenhum alias encontrado" description="Ajuste os filtros ou crie o primeiro nome amigável para aproximar a busca do vocabulário do negócio." />
      ) : null}

      {!loading && !error && payload && payload.total > 0 ? (
        <Card className="border-border/80 bg-surface shadow-card">
          <CardContent className="overflow-x-auto p-0">
            <div className="flex items-center justify-between border-b border-border/60 px-5 py-4">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-brand-600">Registros</p>
                <h3 className="mt-1 text-lg font-semibold text-text">{payload.total} alias(es) encontrados</h3>
              </div>
              <Badge tone="neutral">Busca estruturada</Badge>
            </div>
            <table className="min-w-full text-sm">
              <thead className="bg-bg-subtle/80 text-left text-xs uppercase tracking-[0.16em] text-muted">
                <tr>
                  <th className="px-5 py-3">Rótulo</th>
                  <th className="px-5 py-3">Tipo</th>
                  <th className="px-5 py-3">Contexto</th>
                  <th className="px-5 py-3">Destino</th>
                  <th className="px-5 py-3 text-right">Ações</th>
                </tr>
              </thead>
              <tbody>
                {payload.items.map((item) => (
                  <tr className="border-t border-border/60" key={`${item.entity_type}-${item.id}`}>
                    <td className="px-5 py-4 align-top">
                      <div className="space-y-2">
                        <div className="flex flex-wrap items-center gap-2">
                          <p className="font-semibold text-text">{item.label}</p>
                          <Badge tone="accent">{labelKindLabel(item.label_kind)}</Badge>
                        </div>
                        <p className="text-xs text-muted">Normalizado: {item.normalized_label}</p>
                      </div>
                    </td>
                    <td className="px-5 py-4 align-top">
                      <Badge tone="neutral">{entityLabel(item.entity_type)}</Badge>
                    </td>
                    <td className="px-5 py-4 align-top text-text-body">
                      <p>{item.datasource_name || "-"}</p>
                      <p>{item.database_name || "-"}</p>
                      <p>{item.schema_name || "-"}</p>
                    </td>
                    <td className="px-5 py-4 align-top">
                      <div className="space-y-1">
                        <p className="font-medium text-text">{item.table_name || "-"}</p>
                        {item.column_name ? <p className="text-text-body">{item.column_name}</p> : null}
                      </div>
                    </td>
                    <td className="px-5 py-4 align-top">
                      <div className="flex justify-end gap-2">
                        {canEdit ? (
                          <>
                            <Button onClick={() => openEdit(item)} size="sm" type="button" variant="outline">
                              <Pencil className="h-4 w-4" />
                              Editar
                            </Button>
                            <Button onClick={() => setDeleteTarget(item)} size="sm" type="button" variant="outline">
                              <Trash2 className="h-4 w-4" />
                              Remover
                            </Button>
                          </>
                        ) : (
                          <span className="text-xs text-muted">Somente leitura</span>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </CardContent>
        </Card>
      ) : null}

      {editorOpen ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/55 p-4 backdrop-blur-md">
          <div className="w-full max-w-2xl rounded-[28px] border border-border/80 bg-surface shadow-card">
            <form className="space-y-5 p-6" onSubmit={saveAlias}>
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-brand-600">Busca</p>
                <h3 className="mt-1 text-xl font-semibold text-text">{editorMode === "create" ? "Novo alias" : "Editar alias"}</h3>
                <p className="mt-2 text-sm text-text-body">Defina nomes amigáveis, aliases ou sinônimos que ajudem a busca a aproximar a linguagem do negócio.</p>
              </div>
              <div className="grid gap-4 md:grid-cols-2">
                <label className="space-y-1.5 text-sm text-text-body">
                  <span className="block text-xs font-semibold uppercase tracking-[0.16em] text-muted">Tipo de entidade</span>
                  <Select disabled={editorMode === "edit"} onChange={(event) => setForm((current) => ({ ...current, entity_type: event.target.value, table_id: "", column_id: "" }))} value={form.entity_type}>
                    <option value="table">Tabela</option>
                    <option value="column">Coluna</option>
                  </Select>
                </label>
                <label className="space-y-1.5 text-sm text-text-body">
                  <span className="block text-xs font-semibold uppercase tracking-[0.16em] text-muted">Tipo de rótulo</span>
                  <Select onChange={(event) => setForm((current) => ({ ...current, label_kind: event.target.value }))} value={form.label_kind}>
                    {(availableFilters?.label_kinds || []).map((option) => (
                      <option key={option.value} value={option.value}>{option.label}</option>
                    ))}
                  </Select>
                </label>
                <label className="space-y-1.5 text-sm text-text-body md:col-span-2">
                  <span className="block text-xs font-semibold uppercase tracking-[0.16em] text-muted">Rótulo</span>
                  <Input onChange={(event) => setForm((current) => ({ ...current, label: event.target.value }))} placeholder="Ex.: Cliente, CPF do titular, Receita reconhecida" value={form.label} />
                </label>
                <label className="space-y-1.5 text-sm text-text-body md:col-span-2">
                  <span className="block text-xs font-semibold uppercase tracking-[0.16em] text-muted">{form.entity_type === "column" ? "Coluna" : "Tabela"}</span>
                  <Select onChange={(event) => setForm((current) => ({ ...current, table_id: form.entity_type === "table" ? event.target.value : current.table_id, column_id: form.entity_type === "column" ? event.target.value : current.column_id }))} value={form.entity_type === "column" ? form.column_id : form.table_id}>
                    <option value="">Selecione</option>
                    {currentTargetOptions.map((option) => (
                      <option key={option.value} value={option.value}>{option.label}</option>
                    ))}
                  </Select>
                </label>
              </div>
              <div className="flex justify-end gap-2">
                <Button onClick={() => setEditorOpen(false)} type="button" variant="outline">Cancelar</Button>
                <Button disabled={saving} type="submit">{saving ? "Salvando..." : editorMode === "create" ? "Salvar alias" : "Atualizar alias"}</Button>
              </div>
            </form>
          </div>
        </div>
      ) : null}

      {deleteTarget ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/55 p-4 backdrop-blur-md">
          <div className="w-full max-w-lg rounded-[28px] border border-border/80 bg-surface p-6 shadow-card">
            <h3 className="text-lg font-semibold text-text">Remover alias</h3>
            <p className="mt-2 text-sm text-text-body">
              Você está removendo <span className="font-medium text-text">{deleteTarget.label}</span> de {deleteTarget.table_name}{deleteTarget.column_name ? ` > ${deleteTarget.column_name}` : ""}.
            </p>
            <div className="mt-5 flex justify-end gap-2">
              <Button onClick={() => setDeleteTarget(null)} type="button" variant="outline">Cancelar</Button>
              <Button disabled={deleting} onClick={() => void confirmDelete()} type="button">{deleting ? "Removendo..." : "Remover"}</Button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
