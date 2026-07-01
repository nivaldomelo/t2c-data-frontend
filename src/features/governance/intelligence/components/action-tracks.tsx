import { Link } from "@/lib/next-shims";
import { ArrowRight } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

import type { IntelligenceActionTrack } from "../types";

type Props = {
  items: IntelligenceActionTrack[];
  loading: boolean;
};

export function ActionTracks({ items, loading }: Props) {
  return (
    <section className="space-y-3">
      <div>
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-brand-600">Trilhas de ação</p>
        <h3 className="mt-1 text-lg font-semibold text-text">Planos guiados para reduzir risco</h3>
      </div>

      {loading ? (
        <div className="grid gap-4 md:grid-cols-3">
          {Array.from({ length: 3 }).map((_, index) => (
            <Skeleton className="h-44 w-full rounded-2xl" key={index} />
          ))}
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-3">
          {items.map((track) => (
            <Card className="border-border/80 bg-surface shadow-card" key={track.key}>
              <CardContent className="flex h-full flex-col gap-3 p-4">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="text-sm font-semibold text-text">{track.label}</p>
                    {track.description ? <p className="mt-1 text-xs text-muted">{track.description}</p> : null}
                  </div>
                  <Badge tone={track.total > 0 ? "warning" : "success"}>{track.total}</Badge>
                </div>
                <ul className="flex-1 space-y-1.5">
                  {track.items.map((item) => (
                    <li className="flex items-center justify-between gap-2 text-xs" key={item.key}>
                      <span className="min-w-0 truncate text-text-body">{item.label}</span>
                      <span className="shrink-0 font-semibold text-text">{item.count}</span>
                    </li>
                  ))}
                </ul>
                {track.href ? (
                  <Link
                    className="inline-flex items-center gap-1 text-xs font-semibold text-brand-700 hover:text-brand-800"
                    href={track.href}
                  >
                    Abrir trilha
                    <ArrowRight className="h-3.5 w-3.5" />
                  </Link>
                ) : null}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </section>
  );
}
