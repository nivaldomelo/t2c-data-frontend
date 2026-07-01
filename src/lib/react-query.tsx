import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useState } from "react";

/**
 * Shared TanStack Query defaults. Catalog data is read-heavy and changes
 * infrequently within a session, so we keep a modest staleTime to avoid
 * refetch storms, disable refetch-on-focus (jarring for a back-office tool),
 * and retry once on transient failures.
 */
export function createQueryClient(): QueryClient {
  return new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 30_000,
        gcTime: 5 * 60_000,
        retry: 1,
        refetchOnWindowFocus: false,
      },
    },
  });
}

export function ReactQueryProvider({ children }: { children: React.ReactNode }) {
  // One client per browser session; useState keeps it stable across renders.
  const [client] = useState(createQueryClient);
  return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
}
