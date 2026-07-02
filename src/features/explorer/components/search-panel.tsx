import { useEffect, useState } from "react";
import { safeInternalHref } from "@/lib/safe-href";
import { AlertTriangle, ArrowUpRight, Clock3, FileSearch, Flame, Star } from "lucide-react";

import { Card, CardHeader } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { CertificationStatusBadge } from "@/components/certification/certification-badge";
import { apiRequest } from "@/lib/client-api";
import { cn } from "@/lib/cn";
import type { SearchCollectionResponse } from "@/features/search/types";
import { CompactFilterBar } from "@/features/asset-explorer-shell";

import type { ExplorerSearchResult } from "../types";
import { highlightText } from "../utils";

type ExplorerSearchPanelProps = {
  onOpenSearchResult: (result: ExplorerSearchResult) => void;
  query: string;
  searchResults: ExplorerSearchResult[];
  governanceMaturity: string;
  setGovernanceMaturity: (value: string) => void;
  setQuery: (value: string) => void;
  title: string;
  collectionRefreshKey?: string | number;
};

export function ExplorerSearchPanel({
  onOpenSearchResult,
  query,
  searchResults,
  governanceMaturity,
  setGovernanceMaturity,
  setQuery,
  title,
  collectionRefreshKey,
}: ExplorerSearchPanelProps) {
  const [favorites, setFavorites] = useState<SearchCollectionResponse | null>(null);
  const [critical, setCritical] = useState<SearchCollectionResponse | null>(null);
  const [recent, setRecent] = useState<SearchCollectionResponse | null>(null);
  const [popular, setPopular] = useState<SearchCollectionResponse | null>(null);

  useEffect(() => {
    if (query.trim()) return;
    let cancelled = false;
    void (async () => {
      try {
        const [favoritePayload, criticalPayload, recentPayload, popularPayload] = await Promise.all([
          apiRequest<SearchCollectionResponse>("/v1/search/favorites"),
          apiRequest<SearchCollectionResponse>("/v1/search/critical"),
          apiRequest<SearchCollectionResponse>("/v1/search/recent-assets"),
          apiRequest<SearchCollectionResponse>("/v1/search/popular"),
        ]);
        if (!cancelled) {
          setFavorites(favoritePayload);
          setCritical(criticalPayload);
          setRecent(recentPayload);
          setPopular(popularPayload);
        }
      } catch {
        if (!cancelled) {
          setFavorites({ enabled: true, items: [] });
          setCritical({ enabled: true, items: [] });
          setRecent({ enabled: true, items: [] });
          setPopular({ enabled: true, items: [] });
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [collectionRefreshKey, query]);

  function openCollectionItem(item: SearchCollectionResponse["items"][number]) {
    if (item.entity_type && item.entity_id) {
      void apiRequest("/v1/search/track-click", {
        method: "POST",
        body: JSON.stringify({
          entity_type: item.entity_type,
          entity_id: item.entity_id,
          query: query.trim() || null,
          target_url: item.target_url,
        }),
      }).catch(() => undefined);
    }
    window.location.assign(safeInternalHref(item.target_url, "/search"));
  }

  const collectionGroups = [
    {
      key: "favorites",
      title: "Favoritos",
      description: "Ativos fixados por você",
      icon: Star,
      empty: "Nenhum favorito ainda",
      items: favorites?.items ?? [],
    },
    {
      key: "critical",
      title: "Críticas",
      description: "Tabelas com criticidade alta",
      icon: AlertTriangle,
      empty: "Sem tabelas críticas visíveis",
      items: critical?.items ?? [],
    },
    {
      key: "recent",
      title: "Vistos recentemente",
      description: "Ativos abertos por você no Explorer",
      icon: Clock3,
      empty: "Nenhum ativo visto recentemente",
      items: recent?.items ?? [],
    },
    {
      key: "popular",
      title: "Populares",
      description: "Ativos mais acessados",
      icon: Flame,
      empty: "Sem uso registrado",
      items: popular?.items ?? [],
    },
  ];

  return (
    <Card data-doc-anchor="explorer-search">
      <CardHeader>
        <CompactFilterBar
          description="Buscar schema, tabela ou coluna"
          icon={<FileSearch className="h-4 w-4 text-info-700" />}
          meta={query.trim() ? `${searchResults.length} resultado(s)` : null}
          title={title}
          primary={
            <Input
              className="h-9"
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Buscar schema, tabela ou coluna"
              value={query}
            />
          }
          actions={
            <Select className="h-8 w-full sm:w-[220px]" onChange={(event) => setGovernanceMaturity(event.target.value)} value={governanceMaturity}>
              <option value="">Todas as maturidades</option>
              <option value="Forte">Forte</option>
              <option value="Boa">Boa</option>
              <option value="Em evolução">Em evolução</option>
              <option value="Crítica">Crítica</option>
            </Select>
          }
        />
        {searchResults.length > 0 ? (
          <div className="mt-3 rounded-lg border border-border bg-bg-subtle p-2">
            {searchResults.map((result, idx) => (
              <button
                className="block w-full rounded-lg px-2 py-1.5 text-left text-sm transition hover:bg-info-50"
                key={`${result.match_type}-${result.table_id}-${idx}`}
                onClick={() => onOpenSearchResult(result)}
                type="button"
              >
                <span className="mr-2 text-xs text-muted">[{result.match_type}]</span>
                {highlightText(result.name, query)}
                {result.column_name ? (
                  <span className="ml-2 text-xs text-text-body">{highlightText(result.column_name, query)}</span>
                ) : null}
                {result.governance_score != null ? (
                  <span className="ml-2 rounded-full border border-border bg-surface px-2 py-0.5 text-[11px] font-medium text-text-body">
                    {result.governance_label} · {result.governance_score} pts
                  </span>
                ) : null}
                {result.certification_status ? (
                  <span className="ml-2 inline-flex align-middle">
                    <CertificationStatusBadge status={result.certification_status} />
                  </span>
                ) : null}
                {result.readiness_score != null ? (
                  <span className="ml-2 rounded-full border border-border bg-surface px-2 py-0.5 text-[11px] font-medium text-text-body">
                    Prontidão {result.readiness_score}%
                  </span>
                ) : null}
                {result.active_dq_violation ? (
                  <span className="ml-2 rounded-full border border-warning-200 bg-warning-50 px-2 py-0.5 text-[11px] font-medium text-warning-700">
                    DQ ativa
                  </span>
                ) : null}
              </button>
            ))}
          </div>
        ) : query.trim() ? (
          <EmptyState
            className="shadow-none"
            title="Nenhum resultado encontrado"
            description="Tente buscar por schema, tabela, coluna ou ajuste o filtro de maturidade."
          />
        ) : (
          <div className="mt-3 grid gap-2 xl:grid-cols-4">
            {collectionGroups.map((group) => {
              const Icon = group.icon;
              return (
                <div className="rounded-2xl border border-border bg-bg-subtle/70 p-3" key={group.key}>
                  <div className="mb-2 flex items-center gap-2">
                    <span className="flex h-7 w-7 items-center justify-center rounded-xl border border-border bg-surface text-text-body">
                      <Icon className="h-3.5 w-3.5" />
                    </span>
                    <div className="min-w-0">
                      <p className="text-xs font-semibold uppercase tracking-[0.16em] text-muted">{group.title}</p>
                      <p className="truncate text-xs text-muted">{group.description}</p>
                    </div>
                  </div>
                  {group.items.length ? (
                    <div className="space-y-1">
                      {group.items.slice(0, 3).map((item, idx) => (
                        <button
                          className={cn(
                            "flex w-full items-center justify-between gap-2 rounded-xl border border-transparent px-2 py-2 text-left text-sm transition",
                            "hover:border-info-200 hover:bg-surface hover:text-info-700",
                          )}
                          key={`${group.key}-${item.entity_type || "item"}-${item.entity_id || item.label}-${idx}`}
                          onClick={() => openCollectionItem(item)}
                          type="button"
                        >
                          <span className="min-w-0">
                            <span className="block truncate font-medium text-text-body">{item.label}</span>
                            <span className="block truncate text-xs text-muted">
                              {item.context_path || item.subtitle || item.category || "Ativo do catálogo"}
                            </span>
                          </span>
                          <span className="inline-flex shrink-0 items-center gap-1 rounded-full border border-border bg-surface px-2 py-0.5 text-[11px] text-text-body">
                            {item.count ? `${item.count}` : "Abrir"}
                            <ArrowUpRight className="h-3 w-3" />
                          </span>
                        </button>
                      ))}
                    </div>
                  ) : (
                    <div className="rounded-xl border border-dashed border-border bg-surface/70 px-3 py-4 text-xs text-muted">
                      {group.empty}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </CardHeader>
    </Card>
  );
}
