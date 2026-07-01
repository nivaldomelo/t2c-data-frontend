import { Link } from "@/lib/next-shims";
import { ArrowRight, BarChart3 } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { Skeleton } from "@/components/ui/skeleton";

import { asTone, type IntelligenceAssetRiskItem } from "../types";

type Props = {
  items: IntelligenceAssetRiskItem[];
  loading: boolean;
};

export function AssetRiskList({ items, loading }: Props) {
  return (
    <section className="space-y-3">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-brand-600">Ranking de risco</p>
          <h3 className="mt-1 text-lg font-semibold text-text">Ativos que mais colocam a governança em risco</h3>
        </div>
        {items.length ? <Badge tone="neutral">{items.length} ativo(s)</Badge> : null}
      </div>

      <Card className="border-border/80 bg-surface shadow-card">
        <CardHeader className="border-b border-border">
          <p className="text-xs text-muted">
            Ordenado por prioridade, com tabelas consumidas em dashboards do Metabase no topo.
          </p>
        </CardHeader>
        <CardContent className="p-0">
          {loading ? (
            <div className="space-y-2 p-4">
              {Array.from({ length: 6 }).map((_, index) => (
                <Skeleton className="h-16 w-full rounded-xl" key={index} />
              ))}
            </div>
          ) : items.length === 0 ? (
            <div className="p-4">
              <EmptyState
                title="Sem ativos em risco"
                description="Nenhum ativo atingiu o limiar de risco no recorte atual."
              />
            </div>
          ) : (
            <ul className="divide-y divide-border">
              {items.map((item, index) => (
                <li className="flex items-start gap-4 px-4 py-4" key={`${item.table_id ?? "x"}-${index}`}>
                  <div className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-border bg-bg-subtle text-xs font-semibold text-text-body">
                    {index + 1}
                  </div>
                  <div className="min-w-0 flex-1 space-y-2">
                    <div className="flex flex-wrap items-center gap-2">
                      {item.href ? (
                        <Link className="truncate text-sm font-semibold text-text hover:text-brand-700" href={item.href}>
                          {item.label ?? "Ativo"}
                        </Link>
                      ) : (
                        <span className="truncate text-sm font-semibold text-text">{item.label ?? "Ativo"}</span>
                      )}
                      <Badge tone={asTone(item.risk_tone)}>
                        {item.risk_label ?? "Risco"} · {item.priority_score}
                      </Badge>
                      {item.metabase_dashboards > 0 ? (
                        <Badge tone="accent">
                          <BarChart3 className="mr-1 h-3 w-3" />
                          {item.metabase_dashboards}
                        </Badge>
                      ) : null}
                    </div>
                    <p className="text-xs text-muted">
                      {item.domain_name ? `${item.domain_name} · ` : ""}
                      {item.owner_name ? `Owner: ${item.owner_name}` : "Sem owner"}
                    </p>
                    {item.reasons.length ? (
                      <div className="flex flex-wrap gap-1.5">
                        {item.reasons.slice(0, 4).map((reason, reasonIndex) => (
                          <span
                            className="rounded-full border border-border bg-bg-subtle px-2 py-0.5 text-[11px] text-text-body"
                            key={`${reason}-${reasonIndex}`}
                          >
                            {reason}
                          </span>
                        ))}
                      </div>
                    ) : null}
                    {item.next_action ? (
                      <p className="text-xs font-medium text-brand-700">Próxima ação: {item.next_action}</p>
                    ) : null}
                  </div>
                  {item.href ? (
                    <Link
                      aria-label={`Abrir ${item.label ?? "ativo"}`}
                      className="mt-0.5 inline-flex shrink-0 items-center text-muted hover:text-brand-700"
                      href={item.href}
                    >
                      <ArrowRight className="h-4 w-4" />
                    </Link>
                  ) : null}
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </section>
  );
}
