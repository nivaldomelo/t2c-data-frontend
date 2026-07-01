import { Link } from "@/lib/next-shims";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { TimelineEpisodeFeed } from "@/features/timeline/components/timeline-episode-feed";
import { TimelineFeed } from "@/features/timeline/components/timeline-feed";
import type { TimelineEpisode, TimelineEvent } from "@/features/timeline/types";
import { resolveExplorerHistoryState } from "../history-state.js";

export function ExplorerHistoryTabContent({
  episodes,
  events,
  loading,
  error,
  selectedTableId,
  onRetry,
}: {
  episodes: TimelineEpisode[];
  events: TimelineEvent[];
  loading: boolean;
  error: string;
  selectedTableId: number | null;
  onRetry?: () => void;
}) {
  const state = resolveExplorerHistoryState({ loading, error, episodes, events });
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-3xl border border-border/80 bg-gradient-to-br from-white to-slate-50 px-5 py-4">
        <div>
          <p className="text-sm font-semibold text-text">Linha do tempo do ativo</p>
          <p className="mt-1 text-sm text-text-body">
            Acompanhe mudanças de governança, execução e evidências operacionais deste ativo em um único fluxo curado.
          </p>
        </div>
        {selectedTableId ? (
          <Button asChild size="sm" variant="outline">
            <Link href={`/governance/timeline?table_id=${selectedTableId}`}>Abrir timeline global</Link>
          </Button>
        ) : null}
      </div>

      {state === "error" ? (
        <Card className="border-danger-200 bg-danger-50/70">
          <CardContent className="space-y-3 p-4">
            <p className="text-sm font-semibold text-danger-700">Não foi possível carregar a linha do tempo deste ativo.</p>
            <p className="text-sm leading-6 text-danger-700">{error}</p>
            <div className="flex flex-wrap gap-2">
              {onRetry ? (
                <Button size="sm" onClick={onRetry} variant="outline" type="button">
                  Tentar novamente
                </Button>
              ) : null}
              {selectedTableId ? (
                <Button asChild size="sm" variant="outline">
                  <Link href={`/governance/timeline?table_id=${selectedTableId}`}>Abrir timeline global</Link>
                </Button>
              ) : null}
            </div>
          </CardContent>
        </Card>
      ) : null}

      {state === "episodes" ? (
        <TimelineEpisodeFeed
          compact
          emptyDescription="Nenhum episódio consolidado foi encontrado para este ativo."
          emptyTitle="Sem episódios na timeline"
          episodes={episodes}
          loading={loading}
          tableTimelineHref={selectedTableId ? `/governance/timeline?table_id=${selectedTableId}` : null}
        />
      ) : state === "events" ? (
        <TimelineFeed
          compact
          emptyDescription="Nenhum evento curado foi encontrado para este ativo."
          emptyTitle="Sem eventos na timeline"
          events={events}
          loading={loading}
          tableTimelineHref={selectedTableId ? `/governance/timeline?table_id=${selectedTableId}` : null}
        />
      ) : state === "empty" ? (
        <Card className="border-border bg-bg-subtle/80">
          <CardContent className="space-y-3 p-4">
            <p className="text-sm font-semibold text-text">Sem eventos curados para este ativo</p>
            <p className="text-sm leading-6 text-text-body">
              Não encontramos sinais curados na linha do tempo deste ativo no período atual.
            </p>
            <div className="flex flex-wrap gap-2">
              {selectedTableId ? (
                <Button asChild size="sm" variant="outline">
                  <Link href={`/governance/timeline?table_id=${selectedTableId}`}>Abrir timeline global</Link>
                </Button>
              ) : null}
              {selectedTableId ? (
                <Button asChild size="sm" variant="outline">
                  <Link href={`/data-quality?tableId=${selectedTableId}`}>Abrir Data Quality</Link>
                </Button>
              ) : null}
              {selectedTableId ? (
                <Button asChild size="sm" variant="outline">
                  <Link href={`/explorer?tableId=${selectedTableId}&tab=summary`}>Abrir Explorer</Link>
                </Button>
              ) : null}
            </div>
          </CardContent>
        </Card>
      ) : null}
    </div>
  );
}
