import { X } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useModalDismiss } from "@/lib/use-modal-dismiss";

import type { DatasourceNode, LineageDownstream, LineageSource } from "../types";

type ExplorerLineageEditorDrawerProps = {
  addDownstream: () => void;
  addUpstream: () => void;
  canEdit: boolean;
  datasources: DatasourceNode[];
  downstreams: LineageDownstream[];
  hasSavedLineage: boolean;
  lineageEditorOpen: boolean;
  lineageNotes: string;
  lineageSaving: boolean;
  onClose: () => void;
  onSave: () => void;
  processDagId: string;
  processLabel: string;
  processTaskId: string;
  removeDownstream: (index: number) => void;
  removeUpstream: (index: number) => void;
  selectedTableFullName: string;
  setLineageNotes: (value: string) => void;
  setProcessDagId: (value: string) => void;
  setProcessLabel: (value: string) => void;
  setProcessTaskId: (value: string) => void;
  updateDownstream: (index: number, patch: Partial<LineageDownstream>) => void;
  updateUpstream: (index: number, patch: Partial<LineageSource>) => void;
  upstreams: LineageSource[];
};

export function ExplorerLineageEditorDrawer({
  addDownstream,
  addUpstream,
  canEdit,
  datasources,
  downstreams,
  hasSavedLineage,
  lineageEditorOpen,
  lineageNotes,
  lineageSaving,
  onClose,
  onSave,
  processDagId,
  processLabel,
  processTaskId,
  removeDownstream,
  removeUpstream,
  selectedTableFullName,
  setLineageNotes,
  setProcessDagId,
  setProcessLabel,
  setProcessTaskId,
  updateDownstream,
  updateUpstream,
  upstreams,
}: ExplorerLineageEditorDrawerProps) {
  useModalDismiss({ open: lineageEditorOpen, onClose });
  if (!lineageEditorOpen || !canEdit) return null;

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-slate-950/50 backdrop-blur-md">
      <div
        aria-label="Editor de linhagem"
        aria-modal="true"
        className="h-[100dvh] w-full border-l border-border/70 bg-surface shadow-card md:w-[80vw] lg:w-[70vw]"
        role="dialog"
      >
        <div className="flex h-full flex-col">
          <div className="flex items-center justify-between border-b border-border/70 bg-[linear-gradient(135deg,#ffffff_0%,#f8fafc_58%,#eef6ff_100%)] px-4 py-3 backdrop-blur">
            <div>
              <p className="text-sm font-semibold tracking-[-0.01em] text-text">
                {hasSavedLineage ? "Editar linhagem" : "Adicionar linhagem"}
              </p>
              <p className="text-xs text-muted">{selectedTableFullName}</p>
            </div>
            <button aria-label="Fechar" className="rounded-full border border-border/70 p-1 text-muted transition hover:border-border-strong hover:bg-bg-subtle hover:text-text" onClick={onClose} type="button">
              <X className="h-4 w-4" />
            </button>
          </div>

          <div className="flex-1 overflow-y-auto px-4 py-4">
            <div className="space-y-4">
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <p className="text-xs font-semibold uppercase tracking-wide text-muted">Origens</p>
                  <button
                    className="rounded-md border border-brand-200 bg-surface px-2 py-1 text-xs text-brand-700 transition hover:bg-brand-50"
                    onClick={addUpstream}
                    type="button"
                  >
                    Adicionar origem
                  </button>
                </div>
                {upstreams.length === 0 ? (
                  <p className="text-xs text-muted">Nenhuma origem cadastrada.</p>
                ) : (
                  upstreams.map((item, index) => (
                    <div className="grid gap-2 rounded-2xl border border-border/80 bg-bg-subtle/80 p-2 md:grid-cols-7" key={`up-${index}`}>
                      <select
                        className="rounded-md border border-border bg-surface px-2 py-1.5 text-sm"
                        onChange={(event) =>
                          updateUpstream(index, {
                            type: event.target.value as LineageSource["type"],
                            datasource_id: null,
                          })
                        }
                        value={item.type}
                      >
                        <option value="external">External</option>
                        <option value="postgres">Postgres</option>
                        <option value="mysql">MySQL</option>
                      </select>
                      <Input
                        onChange={(event) => updateUpstream(index, { name: event.target.value })}
                        placeholder="nome da origem"
                        value={item.name ?? ""}
                      />
                      <select
                        className="rounded-md border border-border bg-surface px-2 py-1.5 text-sm"
                        disabled={item.type === "external"}
                        onChange={(event) =>
                          updateUpstream(index, {
                            datasource_id: event.target.value ? Number(event.target.value) : null,
                          })
                        }
                        value={item.datasource_id ?? ""}
                      >
                        <option value="">Datasource (opcional)</option>
                        {datasources
                          .filter((datasource) => datasource.db_type === item.type)
                          .map((datasource) => (
                            <option key={`ds-opt-${datasource.id}`} value={datasource.id}>
                              {datasource.name}
                            </option>
                          ))}
                      </select>
                      <Input
                        onChange={(event) => updateUpstream(index, { database: event.target.value })}
                        placeholder="database (opcional)"
                        value={item.database ?? ""}
                      />
                      <Input
                        onChange={(event) => updateUpstream(index, { schema: event.target.value })}
                        placeholder="schema (opcional)"
                        value={item.schema ?? ""}
                      />
                      <Input
                        onChange={(event) => updateUpstream(index, { object: event.target.value })}
                        placeholder="objeto (opcional)"
                        value={item.object ?? ""}
                      />
                      <button
                        className="rounded-md border border-border/80 px-2 py-1.5 text-xs text-text-body hover:bg-bg-subtle"
                        onClick={() => removeUpstream(index)}
                        type="button"
                      >
                        Remover
                      </button>
                    </div>
                  ))
                )}
              </div>

              <div className="space-y-2">
                <p className="text-xs font-semibold uppercase tracking-wide text-muted">Processamento (obrigatório)</p>
                <div className="grid gap-2 md:grid-cols-4">
                  <Input disabled value="airflow" />
                  <Input
                    onChange={(event) => setProcessLabel(event.target.value)}
                    placeholder="Nome do processo"
                    value={processLabel}
                  />
                  <Input
                    onChange={(event) => setProcessDagId(event.target.value)}
                    placeholder="dag_id (opcional)"
                    value={processDagId}
                  />
                  <Input
                    onChange={(event) => setProcessTaskId(event.target.value)}
                    placeholder="task_id (opcional)"
                    value={processTaskId}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <p className="text-xs font-semibold uppercase tracking-wide text-muted">Consumos (Dashboards)</p>
                  <button
                    className="rounded-md border border-brand-200 bg-surface px-2 py-1 text-xs text-brand-700 transition hover:bg-brand-50"
                    onClick={addDownstream}
                    type="button"
                  >
                    Adicionar consumo
                  </button>
                </div>
                {downstreams.length === 0 ? (
                  <p className="text-xs text-muted">Nenhum consumo cadastrado.</p>
                ) : (
                  downstreams.map((item, index) => (
                    <div className="grid gap-2 rounded-2xl border border-border/80 bg-bg-subtle/80 p-2 md:grid-cols-4" key={`down-${index}`}>
                      <Input disabled value="dashboard" />
                      <Input
                        onChange={(event) => updateDownstream(index, { name: event.target.value })}
                        placeholder="Nome do dashboard"
                        value={item.name}
                      />
                      <Input
                        onChange={(event) => updateDownstream(index, { url: event.target.value })}
                        placeholder="URL (opcional)"
                        value={item.url ?? ""}
                      />
                      <button
                        className="rounded-md border border-border/80 px-2 py-1.5 text-xs text-text-body hover:bg-bg-subtle"
                        onClick={() => removeDownstream(index)}
                        type="button"
                      >
                        Remover
                      </button>
                    </div>
                  ))
                )}
              </div>

              <div className="space-y-1">
                <label className="text-xs font-medium text-text-body" htmlFor="lineage-notes">
                  Notas
                </label>
                <textarea
                  className="w-full rounded-xl border border-border bg-surface p-2 text-sm shadow-sm"
                  id="lineage-notes"
                  onChange={(event) => setLineageNotes(event.target.value)}
                  placeholder="Observações da linhagem (opcional)"
                  rows={3}
                  value={lineageNotes}
                />
              </div>
            </div>
          </div>

          <div className="sticky bottom-0 border-t border-border/70 bg-surface/95 px-4 py-3 backdrop-blur">
            <div className="flex justify-end gap-2">
              <button
                className="rounded-md border border-border px-3 py-1.5 text-sm text-text-body hover:bg-bg-subtle"
                onClick={onClose}
                type="button"
              >
                Cancelar
              </button>
              <button
                className="rounded-md bg-gradient-to-r from-brand-600 via-brand-500 to-accent-600 px-3 py-1.5 text-sm font-medium text-white shadow-sm transition hover:-translate-y-0.5 hover:shadow-card disabled:opacity-60"
                disabled={lineageSaving}
                onClick={onSave}
                type="button"
              >
                {lineageSaving ? "Salvando..." : "Salvar"}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
