import { useEffect, useState, type ReactNode } from "react";
import { ChevronDown, Filter, X } from "lucide-react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/cn";

type CompactFilterBarProps = {
  actions?: ReactNode;
  chips?: ReactNode;
  className?: string;
  description?: string;
  icon?: ReactNode;
  meta?: ReactNode;
  primary: ReactNode;
  secondary?: ReactNode;
  title: string;
  moreFiltersLabel?: string;
  defaultExpanded?: boolean;
};

type CompactFilterToggleProps = {
  active?: boolean;
  children: ReactNode;
  className?: string;
  onClick: () => void;
};

type CompactFilterChipProps = {
  children: ReactNode;
  className?: string;
  onRemove: () => void;
};

type CompactFilterResetProps = {
  children?: ReactNode;
  onClick: () => void;
};

export function CompactFilterBar({
  actions,
  chips,
  className,
  description,
  icon,
  meta,
  primary,
  secondary,
  title,
  moreFiltersLabel = "Mais filtros",
  defaultExpanded,
}: CompactFilterBarProps) {
  const hasAdvancedFilters = Boolean(secondary || chips);
  const [expanded, setExpanded] = useState(defaultExpanded ?? true);

  useEffect(() => {
    if (defaultExpanded !== undefined) {
      setExpanded(defaultExpanded);
      return;
    }

    if (typeof window === "undefined") return;
    const mediaQuery = window.matchMedia("(min-width: 1024px)");
    const sync = () => setExpanded(mediaQuery.matches);
    sync();

    if (typeof mediaQuery.addEventListener === "function") {
      mediaQuery.addEventListener("change", sync);
      return () => mediaQuery.removeEventListener("change", sync);
    }

    mediaQuery.addListener(sync);
    return () => mediaQuery.removeListener(sync);
  }, [defaultExpanded]);

  return (
    <div className={cn("space-y-3", className)}>
      <div className="flex min-w-0 flex-wrap items-center justify-between gap-3">
        <div className="flex min-w-0 items-center gap-2">
          {icon ? (
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-2xl border border-border bg-surface shadow-sm">
              {icon}
            </div>
          ) : null}
          <div className="min-w-0">
            <h2 className="truncate text-base font-semibold text-text">{title}</h2>
            {description ? <p className="truncate text-sm text-text-body">{description}</p> : null}
          </div>
        </div>
        {meta ? <div className="shrink-0 text-xs text-muted">{meta}</div> : null}
      </div>

      <div className="grid min-w-0 gap-2 xl:grid-cols-[minmax(0,1fr)_auto] xl:items-center">
        <div className="min-w-0">{primary}</div>
        <div className="flex min-w-0 flex-wrap items-center gap-2 xl:justify-end">
          {actions}
          {hasAdvancedFilters ? (
            <Button className="h-8 shrink-0 px-3 text-xs" onClick={() => setExpanded((current) => !current)} size="sm" variant="ghost">
              <Filter className="h-3.5 w-3.5" />
              {expanded ? "Menos filtros" : moreFiltersLabel}
              <ChevronDown className={cn("h-3.5 w-3.5 transition-transform", expanded ? "rotate-180" : "")} />
            </Button>
          ) : null}
        </div>
      </div>

      {hasAdvancedFilters ? (
        <div
          className={cn(
            "overflow-hidden rounded-2xl border border-border bg-bg-subtle/70 transition-all duration-200",
            expanded ? "max-h-[28rem] opacity-100" : "max-h-0 border-transparent opacity-0",
          )}
        >
          <div className="space-y-3 p-3">
            {secondary ? <div className="flex min-w-0 flex-wrap items-center gap-2">{secondary}</div> : null}
            {chips ? <div className="flex min-w-0 flex-wrap items-center gap-2 border-t border-border pt-2">{chips}</div> : null}
          </div>
        </div>
      ) : null}
    </div>
  );
}

export function CompactFilterToggle({ active, children, className, onClick }: CompactFilterToggleProps) {
  return (
    <button
      className={cn(
        "inline-flex h-8 shrink-0 items-center gap-2 rounded-xl border border-border bg-surface/90 px-3 text-xs font-medium text-text-body shadow-[0_8px_24px_rgba(15,23,42,0.04)] transition hover:border-border-strong hover:bg-bg-subtle",
        active && "border-info-200 bg-info-50 text-info-700",
        className,
      )}
      onClick={onClick}
      type="button"
    >
      {children}
    </button>
  );
}

export function CompactFilterChip({ children, className, onRemove }: CompactFilterChipProps) {
  return (
    <button
      className={cn(
        "inline-flex h-7 max-w-full shrink-0 items-center gap-1.5 rounded-full border border-border bg-bg-subtle px-2.5 text-xs font-medium text-text-body transition hover:border-border-strong hover:bg-surface",
        className,
      )}
      onClick={onRemove}
      type="button"
    >
      <span className="min-w-0 truncate">{children}</span>
      <X className="h-3 w-3 shrink-0" />
    </button>
  );
}

export function CompactFilterReset({ children = "Limpar filtros", onClick }: CompactFilterResetProps) {
  return (
    <Button className="h-7 shrink-0 rounded-full px-2.5 text-xs" onClick={onClick} size="sm" variant="ghost">
      {children}
    </Button>
  );
}

export const FilterToolbar = CompactFilterBar;
export const FilterToggle = CompactFilterToggle;
export const ActiveFilterChip = CompactFilterChip;
export const ResetFiltersButton = CompactFilterReset;
