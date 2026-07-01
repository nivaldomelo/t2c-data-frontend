import { useCallback, useEffect, useState } from "react";

import { apiRequest } from "@/lib/client-api";

import type { DQPlatformScorecardSummary } from "../types";

type ScorecardScope = {
  domain?: string | null;
  owner?: string | null;
  criticality?: string | null;
};

export function useDqPlatformScorecard(scope: ScorecardScope = {}) {
  const [summary, setSummary] = useState<DQPlatformScorecardSummary | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const refresh = useCallback(async () => {
    const params = new URLSearchParams();
    if (scope.domain) params.set("domain", scope.domain);
    if (scope.owner) params.set("owner", scope.owner);
    if (scope.criticality) params.set("criticality", scope.criticality);
    const query = params.toString();
    setLoading(true);
    setError("");
    try {
      const payload = await apiRequest<DQPlatformScorecardSummary>(`/v1/dq/scorecards/summary${query ? `?${query}` : ""}`);
      setSummary(payload);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Não foi possível carregar o scorecard de qualidade.");
      setSummary(null);
    } finally {
      setLoading(false);
    }
  }, [scope.criticality, scope.domain, scope.owner]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  return { summary, loading, error, refresh };
}
