import { useEffect, useRef, useState } from "react";
import { Search, X } from "lucide-react";

import { cn } from "@/lib/cn";
import { apiRequest } from "@/lib/client-api";

export type AssetSuggestion = {
  id: number;
  name: string;
  table_fqn: string;
  datasource_name: string;
  database_name: string;
  schema_name: string;
  table_type: string;
};

type AssetSearchInputProps = {
  /** Currently selected asset (controlled), or null. */
  selected: AssetSuggestion | null;
  onSelect: (asset: AssetSuggestion | null) => void;
  placeholder?: string;
  disabled?: boolean;
  className?: string;
};

/**
 * Reusable asset (table) autocomplete. Replaces hand-typed numeric IDs / FQNs across
 * governance screens by searching the catalog (/v1/catalog/tables/search) with debounce,
 * and returns the full selected suggestion (id, fqn, schema...) via onSelect.
 */
export function AssetSearchInput({
  selected,
  onSelect,
  placeholder = "Buscar ativo por nome, schema ou fonte…",
  disabled = false,
  className,
}: AssetSearchInputProps) {
  const [query, setQuery] = useState("");
  const [suggestions, setSuggestions] = useState<AssetSuggestion[]>([]);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const normalized = query.trim();
    if (disabled || normalized.length < 2) {
      setSuggestions([]);
      setLoading(false);
      return;
    }
    let active = true;
    const timeoutId = window.setTimeout(() => {
      void (async () => {
        setLoading(true);
        try {
          const data = await apiRequest<AssetSuggestion[]>(
            `/v1/catalog/tables/search?q=${encodeURIComponent(normalized)}&limit=8`,
          );
          if (active) {
            setSuggestions(data);
            setOpen(true);
          }
        } catch {
          if (active) setSuggestions([]);
        } finally {
          if (active) setLoading(false);
        }
      })();
    }, 250);
    return () => {
      active = false;
      window.clearTimeout(timeoutId);
    };
  }, [query, disabled]);

  useEffect(() => {
    function onClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", onClickOutside);
    return () => document.removeEventListener("mousedown", onClickOutside);
  }, []);

  if (selected) {
    return (
      <div
        className={cn(
          "flex items-center justify-between gap-2 rounded-xl border border-border bg-bg-subtle px-3 py-2",
          className,
        )}
      >
        <div className="min-w-0">
          <p className="truncate text-sm font-medium text-text">{selected.name}</p>
          <p className="truncate text-xs text-muted">{selected.table_fqn}</p>
        </div>
        {!disabled ? (
          <button
            type="button"
            onClick={() => {
              onSelect(null);
              setQuery("");
            }}
            className="shrink-0 rounded-lg border border-border bg-surface p-1 text-muted transition hover:bg-bg-subtle"
            aria-label="Trocar ativo"
          >
            <X className="h-4 w-4" />
          </button>
        ) : null}
      </div>
    );
  }

  return (
    <div ref={containerRef} className={cn("relative", className)}>
      <div className="flex items-center gap-2 rounded-xl border border-border bg-surface px-3 py-2">
        <Search className="h-4 w-4 shrink-0 text-muted" />
        <input
          type="text"
          value={query}
          disabled={disabled}
          onChange={(event) => setQuery(event.target.value)}
          onFocus={() => suggestions.length && setOpen(true)}
          placeholder={placeholder}
          className="min-w-0 flex-1 bg-transparent text-sm text-text outline-none placeholder:text-muted"
        />
      </div>
      {open && (loading || suggestions.length > 0) ? (
        <ul className="absolute z-50 mt-1 max-h-72 w-full overflow-auto rounded-xl border border-border bg-surface py-1 shadow-lg">
          {loading ? (
            <li className="px-3 py-2 text-xs text-muted">Buscando…</li>
          ) : (
            suggestions.map((item) => (
              <li key={item.id}>
                <button
                  type="button"
                  onClick={() => {
                    onSelect(item);
                    setQuery("");
                    setOpen(false);
                  }}
                  className="flex w-full flex-col items-start px-3 py-2 text-left transition hover:bg-bg-subtle"
                >
                  <span className="text-sm font-medium text-text">{item.name}</span>
                  <span className="text-xs text-muted">{item.table_fqn}</span>
                </button>
              </li>
            ))
          )}
        </ul>
      ) : null}
    </div>
  );
}

export default AssetSearchInput;
