import { dynamic } from "@/lib/next-shims";
import { Suspense } from "react";

import { ChunkLoadBoundary } from "@/components/chunk-load-boundary";

const DataJourneyPageClient = dynamic(
  () => import("@/features/data-journey/data-journey-page-client").then((mod) => mod.default),
  {
    ssr: false,
    loading: () => (
      <div className="space-y-4">
        <div className="h-40 animate-pulse rounded-3xl bg-bg-subtle" />
        <div className="grid gap-4 xl:grid-cols-[380px_1fr]">
          <div className="h-[32rem] animate-pulse rounded-3xl bg-bg-subtle" />
          <div className="h-[32rem] animate-pulse rounded-3xl bg-bg-subtle" />
        </div>
      </div>
    ),
  },
);

export default function DataJourneyPage() {
  const path = "/explorer/data-journey";
  return (
    <ChunkLoadBoundary path={path} scope="data-journey-route">
      <Suspense
        fallback={
          <div className="space-y-4">
            <div className="h-40 animate-pulse rounded-3xl bg-bg-subtle" />
            <div className="grid gap-4 xl:grid-cols-[380px_1fr]">
              <div className="h-[32rem] animate-pulse rounded-3xl bg-bg-subtle" />
              <div className="h-[32rem] animate-pulse rounded-3xl bg-bg-subtle" />
            </div>
          </div>
        }
      >
        <DataJourneyPageClient />
      </Suspense>
    </ChunkLoadBoundary>
  );
}
