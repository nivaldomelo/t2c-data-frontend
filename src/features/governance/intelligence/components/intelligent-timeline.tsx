import { ArrowRight, GitBranch } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { Skeleton } from "@/components/ui/skeleton";
import { formatDateTime } from "@/features/dashboard/components/shared";

import { asTone, type IntelligenceTimelineEpisode } from "../types";

type Props = {
  episodes: IntelligenceTimelineEpisode[];
  loading: boolean;
};

function stepDotClass(severity: string | null | undefined): string {
  switch ((severity ?? "").toLowerCase()) {
    case "critical":
      return "bg-danger-500";
    case "high":
      return "bg-accent-500";
    case "medium":
      return "bg-warning-500";
    default:
      return "bg-border-strong";
  }
}

function EpisodeCard({ episode }: { episode: IntelligenceTimelineEpisode }) {
  return (
    <Card className="border-border/80 bg-surface shadow-card">
      <CardContent className="space-y-3 p-4">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold text-text">{episode.title}</p>
            <p className="mt-0.5 text-xs text-muted">{formatDateTime(episode.occurred_at)}</p>
          </div>
          <Badge tone={asTone(episode.tone)}>Importância {episode.importance_score}</Badge>
        </div>

        {episode.correlation_chain.length ? (
          <div className="flex flex-wrap items-center gap-1.5 text-xs text-text-body">
            {episode.correlation_chain.map((node, index) => (
              <span className="inline-flex items-center gap-1.5" key={`${node}-${index}`}>
                {index > 0 ? <ArrowRight className="h-3 w-3 text-muted" /> : null}
                <span className="rounded-full border border-border bg-bg-subtle px-2 py-0.5">{node}</span>
              </span>
            ))}
          </div>
        ) : null}

        {episode.steps.length ? (
          <ol className="space-y-2 border-l border-border pl-4">
            {episode.steps.map((step, index) => (
              <li className="relative" key={`${step.title}-${index}`}>
                <span
                  className={`absolute -left-[21px] top-1.5 h-2 w-2 rounded-full ${stepDotClass(step.severity)}`}
                  aria-hidden
                />
                <p className="text-xs text-text-body">
                  <span className="font-medium text-text">{formatDateTime(step.occurred_at)}</span> — {step.title}
                </p>
              </li>
            ))}
          </ol>
        ) : null}

        {episode.why_it_matters ? (
          <p className="rounded-xl border border-border bg-bg-subtle px-3 py-2 text-xs leading-5 text-text-body">
            <span className="font-semibold text-text">Conclusão: </span>
            {episode.why_it_matters}
          </p>
        ) : null}

        {episode.next_action ? (
          <p className="text-xs font-medium text-brand-700">Ação: {episode.next_action}</p>
        ) : null}
      </CardContent>
    </Card>
  );
}

export function IntelligentTimeline({ episodes, loading }: Props) {
  return (
    <section className="space-y-3">
      <div className="flex items-center gap-2">
        <GitBranch className="h-4 w-4 text-brand-600" />
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-brand-600">Linha do tempo inteligente</p>
          <h3 className="mt-1 text-lg font-semibold text-text">Eventos correlacionados e suas consequências</h3>
        </div>
      </div>

      {loading ? (
        <div className="grid gap-3 md:grid-cols-2">
          {Array.from({ length: 2 }).map((_, index) => (
            <Skeleton className="h-48 w-full rounded-2xl" key={index} />
          ))}
        </div>
      ) : episodes.length === 0 ? (
        <EmptyState
          title="Sem correlações recentes"
          description="Nenhuma sequência de eventos correlacionada na janela recente."
        />
      ) : (
        <div className="grid gap-3 md:grid-cols-2">
          {episodes.map((episode, index) => (
            <EpisodeCard episode={episode} key={`${episode.episode_key}-${index}`} />
          ))}
        </div>
      )}
    </section>
  );
}
