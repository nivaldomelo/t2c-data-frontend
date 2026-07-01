import { Link } from "@/lib/next-shims";
import { AlertTriangle, ArrowRight, BarChart3 } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { Skeleton } from "@/components/ui/skeleton";

import { asTone, type IntelligenceAttentionItem } from "../types";

type Props = {
  items: IntelligenceAttentionItem[];
  loading: boolean;
};

export function AttentionNow({ items, loading }: Props) {
  return (
    <section className="space-y-3">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-brand-600">Atenção agora</p>
          <h3 className="mt-1 text-lg font-semibold text-text">O que está em risco e o que fazer primeiro</h3>
        </div>
        {items.length ? <Badge tone="warning">{items.length} prioridade(s)</Badge> : null}
      </div>

      {loading ? (
        <div className="grid gap-3 md:grid-cols-2">
          {Array.from({ length: 4 }).map((_, index) => (
            <Skeleton className="h-32 w-full rounded-2xl" key={index} />
          ))}
        </div>
      ) : items.length === 0 ? (
        <EmptyState
          title="Nenhum risco prioritário agora"
          description="Não há sinais críticos correlacionados no recorte atual."
        />
      ) : (
        <div className="grid gap-3 md:grid-cols-2">
          {items.map((item, index) => (
            <Card className="border-border/80 bg-surface shadow-card" key={`${item.table_id ?? "x"}-${index}`}>
              <CardContent className="space-y-3 p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <AlertTriangle className="h-4 w-4 text-warning-600" />
                      <p className="truncate text-sm font-semibold text-text">{item.signal ?? "Ativo"}</p>
                    </div>
                    {item.metabase_dashboards > 0 ? (
                      <Badge className="mt-1" tone="accent">
                        <BarChart3 className="mr-1 h-3 w-3" />
                        {item.metabase_dashboards} dashboard(s) Metabase
                      </Badge>
                    ) : null}
                  </div>
                  <Badge tone={asTone(item.tone)}>Prioridade {item.priority_score}</Badge>
                </div>

                {item.cause ? (
                  <p className="text-xs leading-5 text-text-body">
                    <span className="font-semibold text-text">Causa provável: </span>
                    {item.cause}
                  </p>
                ) : null}
                {item.impact ? (
                  <p className="text-xs leading-5 text-muted">
                    <span className="font-semibold text-text-body">Impacto: </span>
                    {item.impact}
                  </p>
                ) : null}

                <div className="flex items-center justify-between gap-2 border-t border-border pt-3">
                  <p className="min-w-0 truncate text-xs font-medium text-brand-700">
                    {item.action ?? "Revisar ativo"}
                  </p>
                  {item.href ? (
                    <Link
                      className="inline-flex shrink-0 items-center gap-1 text-xs font-semibold text-brand-700 hover:text-brand-800"
                      href={item.href}
                    >
                      Abrir
                      <ArrowRight className="h-3.5 w-3.5" />
                    </Link>
                  ) : null}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </section>
  );
}
