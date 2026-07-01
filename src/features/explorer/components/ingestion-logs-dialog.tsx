import { AlertTriangle, ListChecks, X } from "lucide-react";
import { useState } from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { Skeleton } from "@/components/ui/skeleton";
import { useModalDismiss } from "@/lib/use-modal-dismiss";

import type { TableIngestionLog } from "../types";
import { formatDateTime } from "../utils";

type ExplorerIngestionLogsDialogProps = {
  error: string;
  executionId: string | null;
  loading: boolean;
  logs: TableIngestionLog[];
  onClose: () => void;
  open: boolean;
  total?: number | null;
  loadingMore?: boolean;
  onLoadMore?: () => void;
};

function levelTone(level: string | null | undefined): "success" | "warning" | "neutral" {
  const normalized = (level || "").toLowerCase();
  if (normalized.includes("error") || normalized.includes("fatal")) return "warning";
  if (normalized.includes("warn")) return "warning";
  if (normalized.includes("info") || normalized.includes("debug")) return "neutral";
  return "neutral";
}

export function ExplorerIngestionLogsDialog({
  error,
  executionId,
  loading,
  logs,
  onClose,
  open,
  total = null,
  loadingMore = false,
  onLoadMore,
}: ExplorerIngestionLogsDialogProps) {
  const [expandedLogIds, setExpandedLogIds] = useState<Set<string>>(new Set());

  useModalDismiss({ open, onClose });
  if (!open) return null;

  const hasMore = Boolean(onLoadMore) && total !== null && logs.length < total;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/55 p-4 backdrop-blur-md">
      <div
        aria-modal="true"
        className="flex max-h-[88vh] w-full max-w-5xl flex-col overflow-hidden rounded-[28px] border border-border/80 bg-surface shadow-card"
        role="dialog"
      >
        <div className="flex items-start justify-between gap-4 border-b border-border/70 bg-[linear-gradient(135deg,#ffffff_0%,#f8fafc_58%,#eef6ff_100%)] px-6 py-5">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-brand-600">Logs de execução</p>
            <h3 className="mt-2 text-xl font-semibold tracking-[-0.02em] text-text">{executionId || "Execução operacional"}</h3>
            <p className="mt-1 text-sm text-text-body">Resumo da execução selecionada. O detalhe técnico fica oculto por padrão e pode ser aberto item a item quando necessário.</p>
          </div>
          <Button aria-label="Fechar" className="h-10 w-10 shrink-0 p-0" onClick={onClose} size="md" variant="ghost">
            <X className="h-4 w-4" />
          </Button>
        </div>

        <div className="flex-1 overflow-y-auto px-6 py-5">
          {loading ? (
            <div className="space-y-3">
              <Skeleton className="h-20 w-full" />
              <Skeleton className="h-20 w-full" />
              <Skeleton className="h-20 w-full" />
            </div>
          ) : null}

          {!loading && error ? (
            <div className="rounded-2xl border border-danger-200 bg-danger-50 p-4 text-sm text-danger-700">
              Não foi possível carregar os logs desta execução. {error}
            </div>
          ) : null}

          {!loading && !error && logs.length === 0 ? (
            <EmptyState
              title="Sem logs disponíveis"
              description="A execução foi localizada, mas não há linhas de log gravadas para este processamento."
            />
          ) : null}

          {!loading && !error && logs.length > 0 ? (
            <div className="space-y-3">
              {logs.map((log) => (
                <div className="rounded-2xl border border-border/80 bg-bg-subtle/80 p-4 shadow-sm" key={log.log_id}>
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="space-y-2">
                      <div className="flex flex-wrap items-center gap-2">
                        <Badge tone={levelTone(log.level)}>{log.level || "INFO"}</Badge>
                        {log.step ? <Badge tone="neutral">{log.step}</Badge> : null}
                      </div>
                      <p className="text-sm font-medium leading-6 text-text">{log.message || "Sem mensagem detalhada."}</p>
                    </div>
                    <p className="text-xs text-muted">{formatDateTime(log.occurred_at)}</p>
                  </div>
                  {log.stacktrace ? (
                    <div className="mt-4 space-y-3">
                      <Button
                        className="px-0 text-xs font-medium"
                        onClick={() => {
                          setExpandedLogIds((current) => {
                            const next = new Set(current);
                            if (next.has(log.log_id)) {
                              next.delete(log.log_id);
                            } else {
                              next.add(log.log_id);
                            }
                            return next;
                          });
                        }}
                        variant="ghost"
                      >
                        {expandedLogIds.has(log.log_id) ? "Ocultar detalhe técnico" : "Exibir detalhe técnico"}
                      </Button>
                      {expandedLogIds.has(log.log_id) ? (
                        <div className="rounded-2xl border border-warning-200 bg-warning-50 px-4 py-3">
                          <div className="flex items-center gap-2">
                            <AlertTriangle className="h-4 w-4 text-warning-700" />
                            <p className="text-sm font-semibold text-warning-900">Detalhe técnico</p>
                          </div>
                          <pre className="mt-3 overflow-x-auto whitespace-pre-wrap break-words rounded-xl bg-slate-950 px-4 py-3 text-xs leading-6 text-slate-100">
                            {log.stacktrace}
                          </pre>
                        </div>
                      ) : (
                        <p className="text-xs text-muted">Stacktrace oculto. Abra o detalhe técnico apenas quando precisar da causa raiz.</p>
                      )}
                    </div>
                  ) : null}
                </div>
              ))}
            </div>
          ) : null}

          {hasMore ? (
            <div className="mt-4 flex justify-center">
              <Button disabled={loadingMore} onClick={() => onLoadMore?.()} size="sm" variant="outline">
                {loadingMore ? "Carregando…" : "Carregar mais logs"}
              </Button>
            </div>
          ) : null}
        </div>

        <div className="flex items-center justify-between border-t border-border/70 bg-surface/95 px-6 py-4 backdrop-blur">
          <div className="flex items-center gap-2 text-xs text-muted">
            <ListChecks className="h-4 w-4" />
            <span>
              {logs.length}
              {total !== null ? ` de ${total}` : ""} registros carregados · detalhe técnico oculto por padrão
            </span>
          </div>
          <Button onClick={onClose} variant="outline">
            Fechar
          </Button>
        </div>
      </div>
    </div>
  );
}
