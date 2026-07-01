import { Badge } from "@/components/ui/badge";

import type { DQProfilingRunItem, DQProfilingRunProgress } from "../types";

type SchemaRunProgressProps = {
  progress: DQProfilingRunProgress;
  items: DQProfilingRunItem[];
};

export function SchemaRunProgress({ progress, items }: SchemaRunProgressProps) {
  return (
    <section className="space-y-3 rounded-2xl border border-border/80 bg-surface p-4 shadow-sm">
      <div className="flex flex-wrap items-center gap-2">
        <Badge tone={progress.status === "failed" ? "neutral" : progress.status === "success" ? "success" : "warning"}>
          {progress.status === "queued"
            ? "Na fila"
            : progress.status === "running"
              ? "Executando"
              : progress.status === "success"
                ? "Concluído"
                : "Falhou"}
        </Badge>
        <Badge tone="warning">Spark cluster</Badge>
        <span className="text-sm text-text-body">
          Schema monitorado: <span className="font-medium">{progress.schema || "-"}</span>
        </span>
        {progress.duration_ms ? (
          <span className="text-sm text-muted">
            Tempo total: {(progress.duration_ms / 1000).toFixed(1)}s
          </span>
        ) : null}
      </div>
      <p className="text-xs text-muted">Acompanhe o avanço do scan do schema e veja quais tabelas concluíram, falharam ou ainda estão em fila.</p>
      <div className="grid gap-2 text-sm sm:grid-cols-5">
        <div className="rounded-md border px-3 py-2">Total: {progress.total_items}</div>
        <div className="rounded-md border px-3 py-2">Na fila: {progress.queued_items}</div>
        <div className="rounded-md border px-3 py-2">Em execução: {progress.running_items}</div>
        <div className="rounded-md border px-3 py-2">Concluídas: {progress.success_items}</div>
        <div className="rounded-md border px-3 py-2">Falhas: {progress.failed_items}</div>
      </div>
      {progress.error_message ? <p className="text-sm text-red-600">{progress.error_message}</p> : null}
      {items.length ? (
      <div className="max-h-64 overflow-auto rounded-2xl border border-border/80">
        <table className="min-w-full text-sm">
          <thead className="bg-bg-subtle/80 text-left text-xs uppercase text-muted">
              <tr>
                <th className="px-3 py-2">Tabela</th>
                <th className="px-3 py-2">Status</th>
                <th className="px-3 py-2">Motor</th>
                <th className="px-3 py-2">Tempo</th>
              </tr>
            </thead>
            <tbody>
              {items.map((item) => (
                <tr className="border-t border-border/60" key={item.id}>
                  <td className="px-3 py-2">{item.table_fqn ?? `#${item.table_id ?? item.id}`}</td>
                  <td className="px-3 py-2">
                    {item.status === "queued"
                      ? "Na fila"
                      : item.status === "running"
                        ? "Executando"
                        : item.status === "success"
                          ? "Concluída"
                          : item.status === "failed"
                            ? "Falhou"
                            : item.status}
                  </td>
                  <td className="px-3 py-2">{item.execution_engine === "spark" ? "Spark cluster" : item.execution_engine === "python" ? "Histórico legado" : item.execution_engine}</td>
                  <td className="px-3 py-2">{item.duration_ms ? `${(item.duration_ms / 1000).toFixed(1)}s` : "-"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : null}
    </section>
  );
}
