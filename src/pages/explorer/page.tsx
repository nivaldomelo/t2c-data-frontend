import { dynamic } from "@/lib/next-shims";
import { Suspense } from "react";

import { ChunkLoadBoundary } from "@/components/chunk-load-boundary";

const ExplorerPageClient = dynamic(
  () => import("@/features/explorer/explorer-page-client").then((mod) => mod.default),
  {
    ssr: false,
    loading: () => (
      <div className="space-y-4">
        <div className="h-32 animate-pulse rounded-3xl bg-bg-subtle" />
        <div className="grid gap-4 xl:grid-cols-[360px_1fr]">
          <div className="h-[40rem] animate-pulse rounded-3xl bg-bg-subtle" />
          <div className="h-[40rem] animate-pulse rounded-3xl bg-bg-subtle" />
        </div>
      </div>
    ),
  },
);

export default function ExplorerPage() {
  const path = "/explorer";
  return (
    <ChunkLoadBoundary path={path} scope="explorer-route">
      <Suspense
        fallback={
          <div className="space-y-4">
            <div className="h-32 animate-pulse rounded-3xl bg-bg-subtle" />
            <div className="grid gap-4 xl:grid-cols-[360px_1fr]">
              <div className="h-[40rem] animate-pulse rounded-3xl bg-bg-subtle" />
              <div className="h-[40rem] animate-pulse rounded-3xl bg-bg-subtle" />
            </div>
          </div>
        }
      >
        <ExplorerPageClient />
      </Suspense>
    </ChunkLoadBoundary>
  );
}
