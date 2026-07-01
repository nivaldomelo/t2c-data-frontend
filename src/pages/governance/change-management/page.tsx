import { dynamic } from "@/lib/next-shims";
import { Suspense } from "react";

import { ChunkLoadBoundary } from "@/components/chunk-load-boundary";

const ChangeManagementPage = dynamic(
  () => import("@/features/governance/change-management/change-management-page").then((mod) => mod.ChangeManagementPage),
  {
    ssr: false,
    loading: () => <div className="h-[42rem] animate-pulse rounded-3xl bg-bg-subtle" />,
  },
);

export default function GovernanceChangeManagementRoute() {
  return (
    <ChunkLoadBoundary
      path="/governance/change-management"
      scope="governance-change-management-route"
      title="Mudanças e SLA temporariamente indisponíveis"
      description="A página de mudanças e SLA carregou um chunk desatualizado enquanto o ambiente recompilava. Ela vai recarregar uma vez automaticamente; se persistir, use o botão abaixo."
      buttonLabel="Recarregar mudanças e SLA"
    >
      <Suspense fallback={<div className="h-[42rem] animate-pulse rounded-3xl bg-bg-subtle" />}>
        <ChangeManagementPage />
      </Suspense>
    </ChunkLoadBoundary>
  );
}
