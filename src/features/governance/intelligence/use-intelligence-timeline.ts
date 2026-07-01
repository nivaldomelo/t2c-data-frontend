import { useApiQuery } from "@/lib/use-api-query";

import type { GovernanceIntelligenceTimeline } from "./types";

export function useIntelligenceTimeline() {
  return useApiQuery<GovernanceIntelligenceTimeline>(
    ["governance", "intelligence", "timeline"],
    "/v1/governance/intelligence/timeline",
    undefined,
    // Correlated-episode build is heavy; keep it cached across navigations.
    { staleTime: 120_000, gcTime: 5 * 60_000 },
  );
}
