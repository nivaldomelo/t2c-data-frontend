import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { Skeleton } from "@/components/ui/skeleton";

import type { IntelligenceNextBestAction } from "../types";

type Props = {
  items: IntelligenceNextBestAction[];
  loading: boolean;
};

export function NextBestActions({ items, loading }: Props) {
  return (
    <Card className="border-border/80 bg-surface shadow-card">
      <CardHeader className="border-b border-border">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-brand-600">Próxima melhor ação</p>
        <h3 className="mt-1 text-base font-semibold text-text">Ações priorizadas por impacto</h3>
      </CardHeader>
      <CardContent className="p-0">
        {loading ? (
          <div className="space-y-2 p-4">
            {Array.from({ length: 5 }).map((_, index) => (
              <Skeleton className="h-10 w-full rounded-lg" key={index} />
            ))}
          </div>
        ) : items.length === 0 ? (
          <div className="p-4">
            <EmptyState title="Sem ações sugeridas" description="Nenhuma ação prioritária no recorte atual." />
          </div>
        ) : (
          <ol className="divide-y divide-border">
            {items.map((item) => (
              <li className="flex items-center gap-3 px-4 py-3" key={item.order}>
                <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-brand-600 text-xs font-semibold text-white">
                  {item.order}
                </span>
                <p className="min-w-0 flex-1 text-sm text-text-body">{item.action}</p>
                <span className="shrink-0 text-xs text-muted">{item.count} ativo(s)</span>
              </li>
            ))}
          </ol>
        )}
      </CardContent>
    </Card>
  );
}
