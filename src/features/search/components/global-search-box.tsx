import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "@/lib/next-shims";
import { Link } from "@/lib/next-shims";
import { AlertTriangle, ArrowUpRight, CornerDownLeft, Loader2, Search, Sparkles, Star } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { TagBadgeList } from "@/components/tags/tag-badges";
import { apiRequest } from "@/lib/client-api";
import { cn } from "@/lib/cn";
import type { SearchCollectionResponse, SearchResultItem, SearchSuggestionsResponse } from "@/features/search/types";

type Props = {
  value: string;
  onValueChange: (value: string) => void;
  onSearch: (value: string) => void;
  className?: string;
  placeholder?: string;
  enableShortcuts?: boolean;
  compact?: boolean;
  autoFocus?: boolean;
};

function normalize(text: string) {
  return text
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
}

function highlightText(text: string | null | undefined, query: string): React.ReactNode {
  if (!text) return null;
  const safeQuery = query.trim();
  if (safeQuery.length < 2) return text;
  const normalizedText = normalize(text);
  const normalizedQuery = normalize(safeQuery);
  const index = normalizedText.indexOf(normalizedQuery);
  if (index < 0) return text;
  const end = index + safeQuery.length;
  return (
    <>
      {text.slice(0, index)}
      <mark className="rounded bg-brand-100 px-0.5 text-brand-950">{text.slice(index, end)}</mark>
      {text.slice(end)}
    </>
  );
}

function badgeTone(tone: string): "neutral" | "accent" | "success" | "warning" {
  if (tone === "success") return "success";
  if (tone === "accent") return "accent";
  if (tone === "warning" || tone === "danger") return "warning";
  return "neutral";
}

function flatten(groups: SearchSuggestionsResponse["groups"]) {
  const items: Array<{ groupLabel: string; item: SearchResultItem }> = [];
  for (const group of groups) {
    for (const item of group.items) {
      items.push({ groupLabel: group.label, item });
    }
  }
  return items;
}

export function GlobalSearchBox({
  value,
  onValueChange,
  onSearch,
  className,
  placeholder = "Buscar ativos, colunas, termos, tags e owners",
  enableShortcuts = false,
  compact = false,
  autoFocus = false,
}: Props) {
  const router = useRouter();
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [payload, setPayload] = useState<SearchSuggestionsResponse | null>(null);
  const [favoritePayload, setFavoritePayload] = useState<SearchCollectionResponse | null>(null);
  const [criticalPayload, setCriticalPayload] = useState<SearchCollectionResponse | null>(null);
  const [recentAssetPayload, setRecentAssetPayload] = useState<SearchCollectionResponse | null>(null);
  const [recentPayload, setRecentPayload] = useState<SearchCollectionResponse | null>(null);
  const [popularPayload, setPopularPayload] = useState<SearchCollectionResponse | null>(null);
  const [error, setError] = useState("");
  const [activeIndex, setActiveIndex] = useState(-1);

  const flatItems = useMemo(() => flatten(payload?.groups ?? []), [payload]);
  const query = value.trim();

  useEffect(() => {
    if (!enableShortcuts) return;
    const handler = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null;
      const isEditable =
        target instanceof HTMLInputElement ||
        target instanceof HTMLTextAreaElement ||
        target?.isContentEditable;

      if (event.key === "/" && !isEditable) {
        event.preventDefault();
        containerRef.current?.querySelector("input")?.focus();
        setOpen(true);
      }
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        containerRef.current?.querySelector("input")?.focus();
        setOpen(true);
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [enableShortcuts]);

  useEffect(() => {
    const onClick = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setOpen(false);
        setActiveIndex(-1);
      }
    };
    window.addEventListener("mousedown", onClick);
    return () => window.removeEventListener("mousedown", onClick);
  }, []);

  useEffect(() => {
    if (!open || query.length >= 2) return;
    let cancelled = false;
    void (async () => {
      try {
        const [favorites, critical, recentAssets, recent, popular] = await Promise.all([
          apiRequest<SearchCollectionResponse>("/v1/search/favorites"),
          apiRequest<SearchCollectionResponse>("/v1/search/critical"),
          apiRequest<SearchCollectionResponse>("/v1/search/recent-assets"),
          apiRequest<SearchCollectionResponse>("/v1/search/recent"),
          apiRequest<SearchCollectionResponse>("/v1/search/popular"),
        ]);
        if (!cancelled) {
          setFavoritePayload(favorites);
          setCriticalPayload(critical);
          setRecentAssetPayload(recentAssets);
          setRecentPayload(recent);
          setPopularPayload(popular);
        }
      } catch {
        if (!cancelled) {
          setFavoritePayload({ enabled: true, items: [] });
          setCriticalPayload({ enabled: true, items: [] });
          setRecentAssetPayload({ enabled: true, items: [] });
          setRecentPayload({ enabled: true, items: [] });
          setPopularPayload({ enabled: true, items: [] });
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [open, query.length]);

  useEffect(() => {
    if (query.length < 2) {
      setPayload(null);
      setLoading(false);
      setError("");
      setActiveIndex(-1);
      return;
    }

    let cancelled = false;
    setLoading(true);
    setError("");
    const timeout = window.setTimeout(() => {
      void (async () => {
        try {
          const data = await apiRequest<SearchSuggestionsResponse>(`/v1/search/suggestions?q=${encodeURIComponent(query)}`);
          if (!cancelled) {
            setPayload(data);
            setOpen(true);
            setActiveIndex(-1);
          }
        } catch (err) {
          if (!cancelled) {
            setError((err as Error).message);
            setPayload(null);
            setOpen(true);
          }
        } finally {
          if (!cancelled) setLoading(false);
        }
      })();
    }, 220);

    return () => {
      cancelled = true;
      window.clearTimeout(timeout);
    };
  }, [query]);

  function submitSearch(nextValue?: string) {
    const target = (nextValue ?? value).trim();
    onSearch(target);
    setOpen(false);
  }

  function navigateToItem(item: SearchResultItem) {
    void apiRequest("/v1/search/track-click", {
      method: "POST",
      body: JSON.stringify({
        entity_type: item.entity_type,
        entity_id: item.entity_id,
        query,
        target_url: item.target_url,
      }),
    }).catch(() => undefined);
    router.push(item.target_url);
    setOpen(false);
  }

  function navigateToCollectionItem(item: NonNullable<SearchCollectionResponse["items"]>[number]) {
    if (item.entity_type && item.entity_id) {
      void apiRequest("/v1/search/track-click", {
        method: "POST",
        body: JSON.stringify({
          entity_type: item.entity_type,
          entity_id: item.entity_id,
          query,
          target_url: item.target_url,
        }),
      }).catch(() => undefined);
    }
    router.push(item.target_url || "/search");
    setOpen(false);
  }

  function onKeyDown(event: React.KeyboardEvent<HTMLInputElement>) {
    if (!open || !flatItems.length) {
      if (event.key === "Enter") {
        event.preventDefault();
        submitSearch();
      }
      return;
    }

    if (event.key === "ArrowDown") {
      event.preventDefault();
      setActiveIndex((current) => (current + 1) % flatItems.length);
      return;
    }
    if (event.key === "ArrowUp") {
      event.preventDefault();
      setActiveIndex((current) => (current <= 0 ? flatItems.length - 1 : current - 1));
      return;
    }
    if (event.key === "Escape") {
      setOpen(false);
      setActiveIndex(-1);
      return;
    }
    if (event.key === "Enter") {
      event.preventDefault();
      if (activeIndex >= 0 && flatItems[activeIndex]) {
        navigateToItem(flatItems[activeIndex].item);
        return;
      }
      submitSearch();
    }
  }

  return (
    <div className={cn("relative", className)} ref={containerRef}>
      <div className="flex items-center gap-2">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
          <Input
            autoFocus={autoFocus}
            className={cn(
              "pl-9 pr-24",
              compact ? "h-10 rounded-xl" : "h-12 rounded-2xl border-border/80 bg-surface/95 shadow-card",
            )}
            onChange={(event) => {
              onValueChange(event.target.value);
              setOpen(true);
            }}
            onFocus={() => setOpen(true)}
            onKeyDown={onKeyDown}
            placeholder={placeholder}
            value={value}
          />
          <div className="pointer-events-none absolute right-3 top-1/2 hidden -translate-y-1/2 items-center gap-1 text-[11px] text-muted md:flex">
            {enableShortcuts ? (
              <>
                <kbd className="rounded border border-border bg-surface px-1.5 py-0.5">/</kbd>
                <span>ou</span>
                <kbd className="rounded border border-border bg-surface px-1.5 py-0.5">Ctrl K</kbd>
              </>
            ) : (
              <kbd className="rounded border border-border bg-surface px-1.5 py-0.5">Enter</kbd>
            )}
          </div>
        </div>
        <Button className={compact ? "h-10" : "h-12 rounded-2xl px-4"} onClick={() => submitSearch()} type="button" variant="outline">
          Buscar
        </Button>
      </div>

      {open ? (
        <div className="absolute left-0 right-0 top-[calc(100%+12px)] z-40 overflow-hidden rounded-3xl border border-border/80 bg-surface shadow-card">
          <div className="border-b border-border/60 bg-[linear-gradient(180deg,#ffffff_0%,#f8fafc_100%)] px-4 py-3">
            <div className="flex items-center justify-between gap-3 text-xs text-muted">
              <div className="flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-brand-600" />
                <span>Busca global inteligente</span>
              </div>
              {loading ? (
                <span className="inline-flex items-center gap-1"><Loader2 className="h-3.5 w-3.5 animate-spin" />Buscando…</span>
              ) : query.length < 2 ? (
                <span>Digite ao menos 2 caracteres</span>
              ) : payload ? (
                <span>{payload.groups.reduce((acc, group) => acc + group.total, 0)} resultado(s)</span>
              ) : null}
            </div>
          </div>

          <div className="max-h-[70vh] overflow-y-auto p-3">
            {query.length < 2 ? (
              <div className="space-y-4">
                <div className="rounded-2xl border border-dashed border-border bg-bg-subtle/80 p-4 text-sm text-text-body">
                  Busque por nome técnico, termo de negócio, descrição, sinônimo, owner, classificação ou contexto relacionado.
                </div>
                <div className="space-y-2">
                  <div className="px-2">
                    <p className="text-sm font-semibold text-text">Atalhos da suíte</p>
                    <p className="text-xs text-muted">Entre direto nos módulos mais usados enquanto a consulta ainda está vazia.</p>
                  </div>
                  <div className="grid gap-2 sm:grid-cols-2">
                    <Button asChild className="justify-between" size="sm" variant="outline">
                      <Link href="/explorer">Explorer</Link>
                    </Button>
                    <Button asChild className="justify-between" size="sm" variant="outline">
                      <Link href="/dashboard">Dashboard executivo</Link>
                    </Button>
                    <Button asChild className="justify-between" size="sm" variant="outline">
                      <Link href="/data-quality">Data Quality</Link>
                    </Button>
                    <Button asChild className="justify-between" size="sm" variant="outline">
                      <Link href="/incidents">Incidentes</Link>
                    </Button>
                    <Button asChild className="justify-between" size="sm" variant="outline">
                      <Link href="/ops/ingestion">Operações</Link>
                    </Button>
                    <Button asChild className="justify-between" size="sm" variant="outline">
                      <Link href="/integrations/airflow">Airflow</Link>
                    </Button>
                  </div>
                </div>
                {favoritePayload?.enabled && favoritePayload.items.length ? (
                  <div className="space-y-2">
                    <div className="px-2">
                      <p className="text-sm font-semibold text-text">Favoritos</p>
                      <p className="text-xs text-muted">Ativos fixados para acesso rápido</p>
                    </div>
                    <div className="space-y-2">
                      {favoritePayload.items.map((item) => (
                        <button
                          className="w-full rounded-2xl border border-border/80 bg-surface p-4 text-left transition-all duration-200 ease-out hover:border-border-strong hover:bg-bg-subtle/70"
                          key={`favorite-${item.entity_type}-${item.entity_id}`}
                          onClick={() => navigateToCollectionItem(item)}
                          type="button"
                        >
                          <div className="flex items-start justify-between gap-3">
                            <div className="min-w-0 flex-1">
                              <div className="flex flex-wrap items-center gap-2">
                                <p className="truncate font-medium text-text">{item.label}</p>
                                {item.category ? <Badge tone="neutral">{item.category}</Badge> : null}
                              </div>
                              {item.subtitle ? <p className="mt-1 text-sm text-text-body">{item.subtitle}</p> : null}
                              {item.context_path ? <p className="mt-2 text-xs text-muted">{item.context_path}</p> : null}
                            </div>
                            <Badge tone="warning">
                              <Star className="h-3 w-3 fill-current" />
                              Favorito
                            </Badge>
                          </div>
                        </button>
                      ))}
                    </div>
                  </div>
                ) : null}
                {criticalPayload?.enabled && criticalPayload.items.length ? (
                  <div className="space-y-2">
                    <div className="px-2">
                      <p className="text-sm font-semibold text-text">Tabelas críticas</p>
                      <p className="text-xs text-muted">Ativos classificados com criticidade alta ou crítica</p>
                    </div>
                    <div className="space-y-2">
                      {criticalPayload.items.map((item) => (
                        <button
                          className="w-full rounded-2xl border border-border/80 bg-surface p-4 text-left transition-all duration-200 ease-out hover:border-border-strong hover:bg-bg-subtle/70"
                          key={`critical-${item.entity_type}-${item.entity_id}`}
                          onClick={() => navigateToCollectionItem(item)}
                          type="button"
                        >
                          <div className="flex items-start justify-between gap-3">
                            <div className="min-w-0 flex-1">
                              <div className="flex flex-wrap items-center gap-2">
                                <p className="truncate font-medium text-text">{item.label}</p>
                                {item.category ? <Badge tone="neutral">{item.category}</Badge> : null}
                              </div>
                              {item.subtitle ? <p className="mt-1 text-sm text-text-body">{item.subtitle}</p> : null}
                              {item.context_path ? <p className="mt-2 text-xs text-muted">{item.context_path}</p> : null}
                            </div>
                            <Badge tone="danger">
                              <AlertTriangle className="h-3 w-3" />
                              Crítica
                            </Badge>
                          </div>
                        </button>
                      ))}
                    </div>
                  </div>
                ) : null}
                {recentAssetPayload?.enabled && recentAssetPayload.items.length ? (
                  <div className="space-y-2">
                    <div className="px-2">
                      <p className="text-sm font-semibold text-text">Ativos vistos recentemente</p>
                      <p className="text-xs text-muted">Tabelas abertas por você no Explorer</p>
                    </div>
                    <div className="space-y-2">
                      {recentAssetPayload.items.map((item) => (
                        <button
                          className="w-full rounded-2xl border border-border/80 bg-surface p-4 text-left transition-all duration-200 ease-out hover:border-border-strong hover:bg-bg-subtle/70"
                          key={`recent-asset-${item.entity_type}-${item.entity_id}`}
                          onClick={() => navigateToCollectionItem(item)}
                          type="button"
                        >
                          <div className="flex items-start justify-between gap-3">
                            <div className="min-w-0 flex-1">
                              <div className="flex flex-wrap items-center gap-2">
                                <p className="truncate font-medium text-text">{item.label}</p>
                                {item.category ? <Badge tone="neutral">{item.category}</Badge> : null}
                              </div>
                              {item.subtitle ? <p className="mt-1 text-sm text-text-body">{item.subtitle}</p> : null}
                              {item.context_path ? <p className="mt-2 text-xs text-muted">{item.context_path}</p> : null}
                            </div>
                            <Badge tone="accent">Recente</Badge>
                          </div>
                        </button>
                      ))}
                    </div>
                  </div>
                ) : null}
                {recentPayload?.enabled && recentPayload.items.length ? (
                  <div className="space-y-2">
                    <div className="px-2">
                      <p className="text-sm font-semibold text-text">Buscas recentes</p>
                      <p className="text-xs text-muted">Últimas buscas da sua conta</p>
                    </div>
                    <div className="space-y-2">
                      {recentPayload.items.map((item) => (
                        <button
                          className="w-full rounded-2xl border border-border/80 bg-surface p-4 text-left transition-all duration-200 ease-out hover:border-border-strong hover:bg-bg-subtle/70"
                          key={`recent-${item.label}-${item.context_path || ""}`}
                          onClick={() => navigateToCollectionItem(item)}
                          type="button"
                        >
                          <div className="flex items-start justify-between gap-3">
                            <div>
                              <p className="font-medium text-text">{item.label}</p>
                              {item.subtitle ? <p className="mt-1 text-sm text-text-body">{item.subtitle}</p> : null}
                            </div>
                            <Badge tone="neutral">Recente</Badge>
                          </div>
                        </button>
                      ))}
                    </div>
                  </div>
                ) : null}
                {popularPayload?.enabled && popularPayload.items.length ? (
                  <div className="space-y-2">
                    <div className="px-2">
                      <p className="text-sm font-semibold text-text">Mais acessados</p>
                      <p className="text-xs text-muted">Resultados populares com base em uso real</p>
                    </div>
                    <div className="space-y-2">
                      {popularPayload.items.map((item) => (
                        <button
                          className="w-full rounded-2xl border border-border/80 bg-surface p-4 text-left transition-all duration-200 ease-out hover:border-border-strong hover:bg-bg-subtle/70"
                          key={`popular-${item.entity_type}-${item.entity_id}`}
                          onClick={() => navigateToCollectionItem(item)}
                          type="button"
                        >
                          <div className="flex items-start justify-between gap-3">
                            <div className="min-w-0 flex-1">
                              <div className="flex flex-wrap items-center gap-2">
                                <p className="truncate font-medium text-text">{item.label}</p>
                                {item.category ? <Badge tone="neutral">{item.category}</Badge> : null}
                              </div>
                              {item.subtitle ? <p className="mt-1 text-sm text-text-body">{item.subtitle}</p> : null}
                              {item.context_path ? <p className="mt-2 text-xs text-muted">{item.context_path}</p> : null}
                            </div>
                            {item.count ? <Badge tone="accent">{item.count} acessos</Badge> : null}
                          </div>
                        </button>
                      ))}
                    </div>
                  </div>
                ) : null}
              </div>
            ) : null}

            {!loading && error ? <div className="rounded-2xl border border-danger-200 bg-danger-50 p-4 text-sm text-danger-700">{error}</div> : null}

            {!loading && !error && query.length >= 2 && payload && payload.groups.length === 0 ? (
              <div className="rounded-2xl border border-border/80 bg-bg-subtle/80 p-4 text-sm text-text-body">
                Nenhum resultado encontrado para sua busca. Tente um termo mais amplo ou abra a página completa para usar filtros.
              </div>
            ) : null}

            {!loading && !error && payload?.groups.length ? (
              <div className="space-y-4">
                {payload.groups.map((group) => (
                  <div className="space-y-2" key={group.key}>
                    <div className="flex items-center justify-between px-2">
                      <div>
                        <p className="text-sm font-semibold text-text">{group.label}</p>
                        <p className="text-xs text-muted">{group.total} resultado(s)</p>
                      </div>
                      <Button onClick={() => submitSearch()} size="sm" type="button" variant="ghost">Ver todos</Button>
                    </div>
                    <div className="space-y-2">
                      {group.items.map((item) => {
                        const flatIndex = flatItems.findIndex((candidate) => candidate.item.entity_type === item.entity_type && candidate.item.entity_id === item.entity_id);
                        return (
                          <button
                            className={cn(
                              "w-full rounded-2xl border p-4 text-left transition-all duration-200 ease-out",
                              activeIndex === flatIndex
                                ? "border-brand-300 bg-brand-50/70 shadow-sm"
                                : "border-border/80 bg-surface hover:border-border-strong hover:bg-bg-subtle/70",
                            )}
                            key={`${item.entity_type}-${item.entity_id}`}
                            onClick={() => navigateToItem(item)}
                            type="button"
                          >
                            <div className="flex items-start justify-between gap-3">
                              <div className="min-w-0 flex-1">
                                <div className="flex flex-wrap items-center gap-2">
                                  <p className="truncate font-semibold text-text">{highlightText(item.title, query)}</p>
                                  <Badge tone="neutral">{item.category}</Badge>
                                </div>
                                {item.subtitle ? <p className="mt-1 text-sm text-text-body">{highlightText(item.subtitle, query)}</p> : null}
                                {item.description ? <p className="mt-2 line-clamp-2 text-sm text-text-body">{highlightText(item.description, query)}</p> : null}
                                <div className="mt-2 flex flex-wrap gap-2">
                                  <Badge tone="accent">{item.match_reason}</Badge>
                                  {item.badges.slice(0, 2).map((badge) => (
                                    <Badge key={`${item.entity_type}-${item.entity_id}-${badge.label}`} tone={badgeTone(badge.tone)}>{badge.label}</Badge>
                                  ))}
                                </div>
                                {item.metadata.tags?.length ? <TagBadgeList className="mt-2" maxVisible={2} tags={item.metadata.tags} /> : null}
                                {item.context_path ? <p className="mt-2 text-xs text-muted">{highlightText(item.context_path, query)}</p> : null}
                              </div>
                              <ArrowUpRight className="mt-1 h-4 w-4 shrink-0 text-muted" />
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                ))}
                <button
                  className="flex w-full items-center justify-center gap-2 rounded-2xl border border-border/80 bg-bg-subtle/80 px-4 py-3 text-sm font-medium text-text-body transition-all duration-200 ease-out hover:border-border-strong hover:bg-surface"
                  onClick={() => submitSearch()}
                  type="button"
                >
                  Ver página completa de resultados
                  <CornerDownLeft className="h-4 w-4" />
                </button>
              </div>
            ) : null}
          </div>
        </div>
      ) : null}
    </div>
  );
}
