import { useCallback, useEffect, useMemo, useState } from "react";

import { apiRequest } from "@/lib/client-api";
import { normalizePageItems, type PageResponse } from "@/lib/pagination";
import type { LineageSourceStatus, LineageSourceSyncResult } from "@/features/lineage/types";

type UseLineageSourcesParams = {
  onMessage: (message: string) => void;
  onSynced: () => Promise<void>;
};

export function useLineageSources({ onMessage, onSynced }: UseLineageSourcesParams) {
  const [sources, setSources] = useState<LineageSourceStatus[]>([]);
  const [sourceSyncing, setSourceSyncing] = useState<number | null>(null);

  const loadSources = useCallback(async () => {
    try {
      const response = await apiRequest<LineageSourceStatus[] | PageResponse<LineageSourceStatus>>("/v1/lineage/sources");
      setSources(normalizePageItems(response));
    } catch (error) {
      onMessage((error as Error).message);
    }
  }, [onMessage]);

  useEffect(() => {
    void loadSources();
  }, [loadSources]);

  const currentSource = useMemo(() => sources[0] || null, [sources]);

  async function syncSource(sourceId: number) {
    try {
      setSourceSyncing(sourceId);
      const result = await apiRequest<LineageSourceSyncResult>(`/v1/lineage/sources/${sourceId}/sync`, {
        method: "POST",
        body: JSON.stringify({ depth: 1 }),
      });
      const warningText = result.warnings.length ? ` Avisos: ${result.warnings.join(" | ")}` : "";
      onMessage(
        `Processamento interno concluído: ${result.datasets_synced} datasets, ${result.jobs_synced} jobs, ${result.relations_created} relações criadas e ${result.relations_updated} relações atualizadas.${warningText}`,
      );
      await Promise.all([onSynced(), loadSources()]);
    } catch (error) {
      onMessage((error as Error).message);
    } finally {
      setSourceSyncing(null);
    }
  }

  async function createSource(payload: {
    name: string;
    base_url: string;
    default_namespace?: string | null;
    enabled?: boolean;
  }) {
    await apiRequest("/v1/lineage/sources", { method: "POST", body: JSON.stringify(payload) });
    onMessage("Fonte OpenLineage criada.");
    await loadSources();
  }

  async function updateSource(
    sourceId: number,
    payload: Partial<{ name: string; base_url: string; default_namespace: string | null; enabled: boolean }>,
  ) {
    await apiRequest(`/v1/lineage/sources/${sourceId}`, { method: "PATCH", body: JSON.stringify(payload) });
    onMessage("Fonte OpenLineage atualizada.");
    await loadSources();
  }

  return {
    currentSource,
    sources,
    sourceSyncing,
    loadSources,
    syncSource,
    createSource,
    updateSource,
  };
}
