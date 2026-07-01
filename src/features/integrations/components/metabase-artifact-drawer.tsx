import { useEffect, useState } from "react";
import { Link } from "@/lib/next-shims";
import { ExternalLink, X } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { Skeleton } from "@/components/ui/skeleton";
import { apiRequest } from "@/lib/client-api";
import { formatArtifactTypeLabel, formatDateTime } from "@/features/integrations/utils";
import type { MetabaseArtifactDetail } from "@/features/integrations/types";

type Props = {
  objectId: number | null;
  open: boolean;
  onClose: () => void;
};

function statusBadge(status: MetabaseArtifactDetail["linked_status"]) {
  if (status === "linked") return <Badge tone="success">Vinculado</Badge>;
  if (status === "partially_linked") return <Badge tone="warning">Parcial</Badge>;
  if (status === "unlinked") return <Badge tone="neutral">Sem vínculo</Badge>;
  return <Badge tone="neutral">Não avaliado</Badge>;
}

function MetaRow({ label, value }: { label: string; value: React.ReactNode }) {
  if (value === null || value === undefined || value === "") return null;
  return (
    <div className="flex flex-col gap-0.5">
      <span className="text-[11px] font-semibold uppercase tracking-wide text-muted">{label}</span>
      <span className="text-sm text-text-body">{value}</span>
    </div>
  );
}

export function MetabaseArtifactDrawer({ objectId, open, onClose }: Props) {
  const [detail, setDetail] = useState<MetabaseArtifactDetail | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!open || objectId === null) return;
    let cancelled = false;
    setLoading(true);
    setError("");
    setDetail(null);
    void (async () => {
      try {
        const data = await apiRequest<MetabaseArtifactDetail>(`/v1/integrations/metabase/artifacts/${objectId}`);
        if (!cancelled) setDetail(data);
      } catch (err) {
        if (!cancelled) setError(err instanceof Error ? err.message : "Não foi possível carregar o detalhe do artefato.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [objectId, open]);

  useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open) return null;

  const isDashboard = detail?.object_type === "dashboard";
  const isQuestion = detail?.object_type === "question";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/40 p-4 backdrop-blur-sm sm:p-6" onClick={onClose}>
      <div
        aria-modal="true"
        role="dialog"
        className="flex max-h-[90vh] w-full max-w-2xl flex-col overflow-hidden rounded-2xl border border-border bg-surface shadow-2xl"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-4 border-b border-border bg-bg-subtle/80 px-5 py-4">
          <div className="min-w-0">
            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-brand-600">
              {detail ? formatArtifactTypeLabel(detail.object_type) : "Artefato"}
            </p>
            <h3 className="mt-1 truncate text-lg font-semibold text-text">{detail?.title || "Detalhe do artefato"}</h3>
            <div className="mt-2 flex flex-wrap items-center gap-2">
              {detail ? statusBadge(detail.linked_status) : null}
              {detail?.archived ? <Badge tone="warning">Arquivado</Badge> : null}
              {detail?.viz_type ? <Badge tone="neutral">{detail.viz_type}</Badge> : null}
            </div>
          </div>
          <button aria-label="Fechar" className="shrink-0 rounded-lg p-1 text-muted transition hover:bg-bg-subtle hover:text-text-body" onClick={onClose} type="button">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-5 py-4">
          {loading ? (
            <div className="space-y-3">
              <Skeleton className="h-20 w-full" />
              <Skeleton className="h-40 w-full" />
            </div>
          ) : error ? (
            <div className="rounded-2xl border border-danger-200 bg-danger-50 px-4 py-3 text-sm text-danger-700">{error}</div>
          ) : !detail ? (
            <EmptyState title="Sem detalhe" description="Não há detalhe disponível para este artefato." />
          ) : (
            <div className="space-y-5">
              {detail.description ? <p className="text-sm leading-6 text-text-body">{detail.description}</p> : null}

              <div className="grid grid-cols-2 gap-3 rounded-2xl border border-border bg-bg-subtle/60 p-4">
                <MetaRow label="Coleção" value={detail.collection_name || detail.collection_external_id} />
                <MetaRow label="Criado por" value={detail.creator_name} />
                <MetaRow label="Visualizações" value={typeof detail.view_count === "number" ? detail.view_count.toLocaleString("pt-BR") : null} />
                <MetaRow label="Última edição" value={detail.remote_updated_at ? formatDateTime(detail.remote_updated_at) : null} />
                <MetaRow label="Vínculos diretos" value={detail.direct_links ?? 0} />
                <MetaRow label="Vínculos indiretos" value={detail.indirect_links ?? 0} />
              </div>

              {detail.url ? (
                <Button asChild size="sm" variant="outline">
                  <Link href={detail.url} rel="noreferrer" target="_blank">
                    <ExternalLink className="mr-2 h-4 w-4" />
                    Abrir no Metabase
                  </Link>
                </Button>
              ) : null}

              {isQuestion && (detail.query_type || detail.sql || typeof detail.database_id === "number") ? (
                <div className="space-y-2">
                  <p className="text-sm font-semibold text-text">Consulta</p>
                  <div className="flex flex-wrap gap-2">
                    {detail.query_type ? <Badge tone="neutral">Tipo: {detail.query_type}</Badge> : null}
                    {typeof detail.database_id === "number" ? <Badge tone="neutral">DB #{detail.database_id}</Badge> : null}
                  </div>
                  {detail.sql ? (
                    <pre className="max-h-72 overflow-auto rounded-xl bg-slate-950 px-4 py-3 text-xs leading-6 text-slate-100">{detail.sql}</pre>
                  ) : (
                    <p className="text-xs text-muted">Consulta estruturada (sem SQL nativo).</p>
                  )}
                </div>
              ) : null}

              {isDashboard ? (
                <div className="space-y-2">
                  <p className="text-sm font-semibold text-text">Cards do dashboard ({detail.cards?.length ?? 0})</p>
                  {detail.cards?.length ? (
                    <ul className="divide-y divide-border rounded-xl border border-border">
                      {detail.cards.map((card, index) => (
                        <li className="flex items-center justify-between gap-3 px-3 py-2" key={`${card.metabase_id || index}`}>
                          <div className="min-w-0">
                            <p className="truncate text-sm text-text-body">{card.title}</p>
                            <p className="text-xs text-muted">
                              {card.viz_type ? card.viz_type : "card"}
                              {card.object_id ? "" : " · não sincronizado"}
                            </p>
                          </div>
                          {card.url ? (
                            <Button asChild size="sm" variant="ghost">
                              <Link href={card.url} rel="noreferrer" target="_blank">
                                <ExternalLink className="h-4 w-4" />
                              </Link>
                            </Button>
                          ) : null}
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="text-xs text-muted">Nenhum card identificado neste dashboard.</p>
                  )}
                </div>
              ) : null}

              {detail.referenced_tables?.length ? (
                <div className="space-y-2">
                  <p className="text-sm font-semibold text-text">Tabelas usadas ({detail.referenced_tables.length})</p>
                  <p className="text-xs text-muted">
                    Extraídas da consulta de cada {detail.object_type === "dashboard" ? "card do dashboard" : "pergunta"}. Em verde, as que casam com o catálogo.
                  </p>
                  <ul className="divide-y divide-border rounded-xl border border-border">
                    {detail.referenced_tables.map((table) => (
                      <li className="flex items-center justify-between gap-3 px-3 py-2" key={table.full_name}>
                        <span className="flex min-w-0 items-center gap-2">
                          <span className="truncate font-mono text-sm text-text-body">{table.full_name}</span>
                          <Badge tone={table.source === "sql" ? "neutral" : "accent"}>{table.source === "sql" ? "SQL" : "MBQL"}</Badge>
                          {!table.resolved ? <Badge tone="warning">id interno</Badge> : null}
                        </span>
                        {table.table_id ? (
                          <Button asChild size="sm" variant="ghost">
                            <Link href={`/tables/${table.table_id}`}>Abrir no catálogo</Link>
                          </Button>
                        ) : (
                          <span className="shrink-0 text-xs text-muted">fora do catálogo</span>
                        )}
                      </li>
                    ))}
                  </ul>
                </div>
              ) : null}

              <div className="space-y-2">
                <p className="text-sm font-semibold text-text">Tabelas do catálogo consumidas ({detail.linked_tables?.length ?? 0})</p>
                {detail.linked_tables?.length ? (
                  <ul className="divide-y divide-border rounded-xl border border-border">
                    {detail.linked_tables.map((table) => (
                      <li className="flex items-center justify-between gap-3 px-3 py-2" key={table.table_id}>
                        <span className="truncate text-sm text-text-body">{table.full_name}</span>
                        <Button asChild size="sm" variant="ghost">
                          <Link href={`/tables/${table.table_id}`}>Abrir</Link>
                        </Button>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-xs text-muted">Nenhuma tabela do catálogo vinculada.</p>
                )}
              </div>

              {detail.unresolved_references?.length ? (
                <div className="space-y-2">
                  <p className="text-sm font-semibold text-text">Referências não resolvidas ({detail.unresolved_references.length})</p>
                  <div className="flex flex-wrap gap-2">
                    {detail.unresolved_references.map((ref, index) => (
                      <Badge tone="warning" key={`${ref}-${index}`}>{ref}</Badge>
                    ))}
                  </div>
                </div>
              ) : null}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default MetabaseArtifactDrawer;
