import { useState } from "react";
import { Loader2, Plus, RefreshCcw, Workflow } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import type { LineageSourceStatus } from "@/features/lineage/types";
import { formatDateTime } from "@/features/lineage/utils";

type Props = {
  sources: LineageSourceStatus[];
  sourceSyncing: number | null;
  canManage: boolean;
  onSync: (sourceId: number) => void;
  onCreate: (payload: { name: string; base_url: string; default_namespace?: string | null }) => Promise<void>;
  onToggle: (sourceId: number, enabled: boolean) => Promise<void>;
};

const INGEST_ENDPOINT = "POST /v1/lineage/events";

export function OpenLineageManager({ sources, sourceSyncing, canManage, onSync, onCreate, onToggle }: Props) {
  const [creating, setCreating] = useState(false);
  const [saving, setSaving] = useState(false);
  const [name, setName] = useState("");
  const [baseUrl, setBaseUrl] = useState("");
  const [namespace, setNamespace] = useState("");

  async function submit() {
    if (!name.trim() || !baseUrl.trim()) return;
    setSaving(true);
    try {
      await onCreate({ name: name.trim(), base_url: baseUrl.trim(), default_namespace: namespace.trim() || null });
      setName("");
      setBaseUrl("");
      setNamespace("");
      setCreating(false);
    } finally {
      setSaving(false);
    }
  }

  return (
    <Card className="border-border/80 shadow-[0_12px_34px_rgba(15,23,42,0.04)]">
      <CardHeader className="space-y-3">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <Workflow className="h-4 w-4 text-muted" />
              <p className="text-sm font-semibold text-text">Gerenciador de OpenLineage</p>
              <Badge tone="neutral">{sources.length} fonte(s)</Badge>
            </div>
            <p className="text-sm text-muted">
              Conecte produtores OpenLineage (Airflow, dbt, jobs internos). Eles enviam eventos para{" "}
              <code className="rounded bg-bg-subtle px-1.5 py-0.5 font-mono text-[12px] text-text-body">{INGEST_ENDPOINT}</code>{" "}
              e a linhagem é montada automaticamente — sem cadastro manual.
            </p>
          </div>
          {canManage ? (
            <Button size="sm" variant="outline" onClick={() => setCreating((current) => !current)}>
              <Plus className="h-4 w-4" />
              Nova fonte
            </Button>
          ) : null}
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {creating && canManage ? (
          <div className="grid gap-3 rounded-2xl border border-border bg-bg-subtle/70 p-4 md:grid-cols-3">
            <label className="space-y-1">
              <span className="text-xs font-medium text-text-body">Nome</span>
              <Input placeholder="Ex.: Airflow produção" value={name} onChange={(e) => setName(e.target.value)} />
            </label>
            <label className="space-y-1">
              <span className="text-xs font-medium text-text-body">Base URL do produtor</span>
              <Input placeholder="https://airflow.exemplo.com" value={baseUrl} onChange={(e) => setBaseUrl(e.target.value)} />
            </label>
            <label className="space-y-1">
              <span className="text-xs font-medium text-text-body">Namespace padrão (opcional)</span>
              <Input placeholder="local-andromeda" value={namespace} onChange={(e) => setNamespace(e.target.value)} />
            </label>
            <div className="md:col-span-3 flex justify-end gap-2">
              <Button size="sm" variant="ghost" onClick={() => setCreating(false)}>
                Cancelar
              </Button>
              <Button size="sm" disabled={saving || !name.trim() || !baseUrl.trim()} onClick={() => void submit()}>
                {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                Salvar fonte
              </Button>
            </div>
          </div>
        ) : null}

        {sources.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-border bg-bg-subtle/60 p-5 text-sm text-text-body">
            Nenhuma fonte OpenLineage configurada. {canManage ? "Crie uma fonte ou " : ""}envie eventos para{" "}
            <code className="rounded bg-bg-subtle px-1.5 py-0.5 font-mono text-[12px]">{INGEST_ENDPOINT}</code> para popular a linhagem.
          </div>
        ) : (
          <div className="space-y-3">
            {sources.map((source) => (
              <div key={source.id} className="rounded-2xl border border-border bg-surface p-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="truncate text-sm font-semibold text-text">{source.name}</p>
                      <Badge tone={source.enabled ? "success" : "neutral"}>{source.enabled ? "Ativa" : "Pausada"}</Badge>
                      <Badge tone="neutral">{source.source_type}</Badge>
                    </div>
                    <p className="mt-1 text-xs text-muted">
                      Último sync: {formatDateTime(source.last_sync_at)} · {source.last_sync_status || "sem execução"}
                      {source.last_sync_message ? ` — ${source.last_sync_message}` : ""}
                    </p>
                  </div>
                  {canManage ? (
                    <div className="flex shrink-0 flex-wrap gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        disabled={sourceSyncing === source.id}
                        onClick={() => onSync(source.id)}
                      >
                        {sourceSyncing === source.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCcw className="h-4 w-4" />}
                        Reprocessar
                      </Button>
                      <Button size="sm" variant="ghost" onClick={() => void onToggle(source.id, !source.enabled)}>
                        {source.enabled ? "Pausar" : "Ativar"}
                      </Button>
                    </div>
                  ) : null}
                </div>
                <div className="mt-3 grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
                  {[
                    { label: "Eventos", value: source.events_processed },
                    { label: "Jobs", value: source.jobs_synced },
                    { label: "Datasets", value: source.datasets_synced },
                    { label: "Relações", value: source.relations_synced },
                    { label: "Colunas", value: source.column_edges_synced },
                  ].map((metric) => (
                    <div key={metric.label} className="rounded-xl border border-border bg-bg-subtle/70 px-3 py-2">
                      <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-muted">{metric.label}</p>
                      <p className="mt-1 text-xl font-semibold text-text">{metric.value ?? 0}</p>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
