import { useState } from "react";

import { apiRequest } from "@/lib/client-api";

import type { LineageDownstream, LineageSource, LineageSpec, LineageSummary, NoticeState } from "../types";
import { normalizeLineageSpec } from "../utils";

type UseExplorerLineageOptions = {
  selectedTableId: number | null;
  onNotice: (notice: NoticeState) => void;
};

export function useExplorerLineage({
  selectedTableId,
  onNotice,
}: UseExplorerLineageOptions) {
  const [lineageSpec, setLineageSpec] = useState<LineageSpec | null>(null);
  const [lineageSummary, setLineageSummary] = useState<LineageSummary | null>(null);
  const [lineageLoading, setLineageLoading] = useState(false);
  const [lineageSaving, setLineageSaving] = useState(false);
  const [lineageEditorOpen, setLineageEditorOpen] = useState(false);
  const [upstreams, setUpstreams] = useState<LineageSource[]>([]);
  const [processLabel, setProcessLabel] = useState("Airflow");
  const [processDagId, setProcessDagId] = useState("");
  const [processTaskId, setProcessTaskId] = useState("");
  const [downstreams, setDownstreams] = useState<LineageDownstream[]>([]);
  const [lineageNotes, setLineageNotes] = useState("");

  function applyLoadedLineage(lineage: LineageSpec, summary: LineageSummary) {
    const normalized = normalizeLineageSpec(lineage);
    setLineageSpec(normalized);
    setLineageSummary(summary);
    setUpstreams(normalized.upstreams);
    setDownstreams(normalized.downstreams);
    setProcessLabel(normalized.process?.name || "Airflow");
    setProcessDagId(normalized.process?.dag_id || "");
    setProcessTaskId(normalized.process?.task_id || "");
    setLineageNotes(normalized.notes || "");
  }

  function resetLineageState() {
    setLineageSpec(null);
    setLineageSummary(null);
    setUpstreams([]);
    setDownstreams([]);
    setProcessLabel("Airflow");
    setProcessDagId("");
    setProcessTaskId("");
    setLineageNotes("");
    setLineageEditorOpen(false);
  }

  function addUpstream() {
    setUpstreams((prev) => [
      ...prev,
      { type: "external", name: "", datasource_id: null, database: "", schema: "", object: "" },
    ]);
  }

  function updateUpstream(index: number, patch: Partial<LineageSource>) {
    setUpstreams((prev) => prev.map((item, idx) => (idx === index ? { ...item, ...patch } : item)));
  }

  function removeUpstream(index: number) {
    setUpstreams((prev) => prev.filter((_, idx) => idx !== index));
  }

  function addDownstream() {
    setDownstreams((prev) => [...prev, { type: "dashboard", name: "", url: "" }]);
  }

  function updateDownstream(index: number, patch: Partial<LineageDownstream>) {
    setDownstreams((prev) => prev.map((item, idx) => (idx === index ? { ...item, ...patch } : item)));
  }

  function removeDownstream(index: number) {
    setDownstreams((prev) => prev.filter((_, idx) => idx !== index));
  }

  async function saveLineage(): Promise<void> {
    if (selectedTableId === null) return;
    try {
      setLineageSaving(true);
      if (!processLabel.trim()) {
        onNotice({ tone: "error", message: "Processamento é obrigatório." });
        return;
      }
      const payload: LineageSpec = {
        table_id: selectedTableId,
        upstreams: upstreams
          .map((up) => ({
            type: up.type,
            name: up.name?.trim() || null,
            datasource_id: up.datasource_id,
            database: up.database?.trim() || null,
            schema: up.schema?.trim() || null,
            object: up.object?.trim() || null,
          }))
          .filter((up) => Boolean(up.name) || up.datasource_id !== null || Boolean(up.database) || Boolean(up.object)),
        process: {
          type: "airflow",
          name: processLabel.trim(),
          dag_id: processDagId.trim() || null,
          task_id: processTaskId.trim() || null,
          meta: null,
        },
        downstreams: downstreams
          .map((down) => ({ type: "dashboard" as const, name: down.name.trim(), url: down.url?.trim() || null }))
          .filter((down) => down.name),
        notes: lineageNotes.trim() || null,
        updated_at: null,
      };

      await apiRequest<LineageSpec>(`/v1/lineage/spec/tables/${selectedTableId}`, {
        method: "PUT",
        body: JSON.stringify({ ...payload, upstreams: payload.upstreams }),
      });
      const [reloaded, summaryReloaded] = await Promise.all([
        apiRequest<LineageSpec>(`/v1/lineage/spec/tables/${selectedTableId}`),
        apiRequest<LineageSummary>(`/v1/lineage/tables/${selectedTableId}/summary`),
      ]);
      applyLoadedLineage(reloaded, summaryReloaded);
      setLineageEditorOpen(false);
      onNotice({ tone: "success", message: "Linhagem atualizada com sucesso." });
    } catch (error) {
      onNotice({ tone: "error", message: (error as Error).message });
    } finally {
      setLineageSaving(false);
    }
  }

  async function refreshAutomaticLineage(): Promise<void> {
    if (selectedTableId === null) return;
    try {
      setLineageLoading(true);
      const result = await apiRequest<{
        relations_created: number;
        relations_updated: number;
        jobs_synced: number;
        runs_synced: number;
        warnings: string[];
      }>(`/v1/lineage/tables/${selectedTableId}/sync`, {
        method: "POST",
        body: JSON.stringify({ depth: 1 }),
      });
      const summaryReloaded = await apiRequest<LineageSummary>(`/v1/lineage/tables/${selectedTableId}/summary`);
      setLineageSummary(summaryReloaded);
      onNotice({
        tone: "success",
        message: `Lineage atualizada: ${result.relations_created} relações criadas, ${result.relations_updated} atualizadas e ${result.jobs_synced} jobs sincronizados.${result.warnings.length ? ` Avisos: ${result.warnings.join(" | ")}` : ""}`,
      });
    } catch (error) {
      onNotice({ tone: "error", message: (error as Error).message });
    } finally {
      setLineageLoading(false);
    }
  }

  return {
    addDownstream,
    addUpstream,
    applyLoadedLineage,
    downstreams,
    lineageEditorOpen,
    lineageLoading,
    lineageNotes,
    lineageSaving,
    lineageSpec,
    lineageSummary,
    processDagId,
    processLabel,
    processTaskId,
    refreshAutomaticLineage,
    removeDownstream,
    removeUpstream,
    resetLineageState,
    saveLineage,
    setLineageEditorOpen,
    setLineageLoading,
    setLineageNotes,
    setProcessDagId,
    setProcessLabel,
    setProcessTaskId,
    updateDownstream,
    updateUpstream,
    upstreams,
  };
}
