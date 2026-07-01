import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { Skeleton } from "@/components/ui/skeleton";

import { asTone, type IntelligenceDomainRiskItem } from "../types";

type Props = {
  items: IntelligenceDomainRiskItem[];
  loading: boolean;
};

export function DomainRisk({ items, loading }: Props) {
  return (
    <Card className="border-border/80 bg-surface shadow-card">
      <CardHeader className="border-b border-border">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-brand-600">Visão por domínio</p>
        <h3 className="mt-1 text-base font-semibold text-text">Onde a governança está mais crítica</h3>
      </CardHeader>
      <CardContent className="p-0">
        {loading ? (
          <div className="space-y-2 p-4">
            {Array.from({ length: 4 }).map((_, index) => (
              <Skeleton className="h-12 w-full rounded-lg" key={index} />
            ))}
          </div>
        ) : items.length === 0 ? (
          <div className="p-4">
            <EmptyState title="Sem domínios" description="Nenhum domínio com ativos no recorte atual." />
          </div>
        ) : (
          <ul className="divide-y divide-border">
            {items.map((item) => (
              <li className="flex items-center justify-between gap-3 px-4 py-3" key={item.domain}>
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium text-text">{item.domain}</p>
                  <p className="text-xs text-muted">
                    {item.asset_count} ativo(s) · {item.critical_assets} crítico(s) · {item.open_incidents} incidente(s)
                  </p>
                </div>
                <Badge tone={asTone(item.tone)}>Risco {Math.round(item.risk_score)}</Badge>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
