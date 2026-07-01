import { dynamic } from "@/lib/next-shims";
import { Suspense } from "react";

import { ChunkLoadBoundary } from "@/components/chunk-load-boundary";

const DictionaryAdminPageClient = dynamic(
  () => import("@/features/dictionary/dictionary-page-client").then((mod) => mod.default),
  {
    ssr: false,
    loading: () => <div className="h-[40rem] animate-pulse rounded-3xl bg-bg-subtle" />,
  },
);

export default function DictionaryAdminPage() {
  return (
    <ChunkLoadBoundary
      buttonLabel="Recarregar dicionário"
      description="O dicionário tentou carregar um chunk desatualizado enquanto o ambiente recompilava. A página vai recarregar uma vez automaticamente; se persistir, use o botão abaixo."
      path="/governance/dictionary"
      scope="dictionary-route"
      title="Dicionário temporariamente indisponível"
    >
      <Suspense fallback={<div className="h-[40rem] animate-pulse rounded-3xl bg-bg-subtle" />}>
        <DictionaryAdminPageClient />
      </Suspense>
    </ChunkLoadBoundary>
  );
}
