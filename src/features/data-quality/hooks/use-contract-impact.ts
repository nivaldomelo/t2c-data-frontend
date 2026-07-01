import { useEffect, useState } from "react";

import { apiRequest } from "@/lib/client-api";

import type { DataContractImpactSummary } from "../types";

export function useContractImpactSummary(tableId: number | null | undefined) {
  const [summary, setSummary] = useState<DataContractImpactSummary | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!tableId) {
      setSummary(null);
      setLoading(false);
      setError("");
      return;
    }
    let cancelled = false;
    setLoading(true);
    setError("");
    void (async () => {
      try {
        const payload = await apiRequest<DataContractImpactSummary>(`/v1/contracts/tables/${tableId}/impact-summary`);
        if (!cancelled) setSummary(payload);
      } catch (err) {
        if (!cancelled) {
          setSummary(null);
          setError(err instanceof Error ? err.message : "Não foi possível carregar o impacto do contrato.");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [tableId]);

  return { summary, loading, error };
}
