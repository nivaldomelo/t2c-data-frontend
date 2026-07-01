import { useApiQuery } from "@/lib/use-api-query";

import type { GovernanceIntelligenceFeed } from "./types";

export function useIntelligenceFeed() {
  return useApiQuery<GovernanceIntelligenceFeed>(
    ["governance", "intelligence", "feed"],
    "/v1/governance/intelligence/feed",
    undefined,
    // Heavy aggregation (executive summary is cached 30s server-side). Keep it
    // fresh enough but avoid refetching on every navigation back to the page.
    { staleTime: 120_000, gcTime: 5 * 60_000 },
  );
}
