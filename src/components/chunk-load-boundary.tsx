import { Component, type ReactNode, useEffect, useMemo } from "react";

import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";

const CHUNK_ERROR_PATTERNS = [
  "ChunkLoadError",
  "Loading chunk",
  "CSS chunk load failed",
  "dynamically imported module",
  "Failed to fetch dynamically imported module",
  "Failed to load chunk",
];

function isChunkLoadError(error: unknown): boolean {
  if (!error || typeof error !== "object") return false;
  const candidate = error as { name?: unknown; message?: unknown; stack?: unknown };
  const haystack = [candidate.name, candidate.message, candidate.stack]
    .filter((value): value is string => typeof value === "string" && value.trim().length > 0)
    .join(" \n ");
  return CHUNK_ERROR_PATTERNS.some((pattern) => haystack.includes(pattern));
}

function storageKey(scope: string, path: string) {
  return `t2c-data:chunk-reload:${scope}:${path}`;
}

function ChunkReloadFallback({
  scope,
  path,
  error,
  title,
  description,
  buttonLabel,
}: {
  scope: string;
  path: string;
  error: Error;
  title: string;
  description: string;
  buttonLabel: string;
}) {
  const key = useMemo(() => storageKey(scope, path), [path, scope]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (!isChunkLoadError(error)) return;
    if (window.sessionStorage.getItem(key) === "1") return;
    window.sessionStorage.setItem(key, "1");
    const timer = window.setTimeout(() => {
      window.location.reload();
    }, 250);
    return () => window.clearTimeout(timer);
  }, [error, key]);

  return (
    <EmptyState
      title={title}
      description={description}
      action={
        <Button
          onClick={() => {
            if (typeof window === "undefined") return;
            window.sessionStorage.setItem(key, "1");
            window.location.reload();
          }}
        >
          {buttonLabel}
        </Button>
      }
    />
  );
}

class ChunkLoadBoundaryImpl extends Component<
  {
    children: ReactNode;
    scope: string;
    path: string;
    title: string;
    description: string;
    buttonLabel: string;
  },
  {
    error: Error | null;
  }
> {
  state = { error: null as Error | null };

  static getDerivedStateFromError(error: Error) {
    return { error };
  }

  render() {
    const { children, path, scope, title, description, buttonLabel } = this.props;
    const { error } = this.state;
    if (error) {
      return (
        <ChunkReloadFallback
          error={error}
          path={path}
          scope={scope}
          title={title}
          description={description}
          buttonLabel={buttonLabel}
        />
      );
    }
    return children;
  }
}

export function ChunkLoadBoundary({
  children,
  path,
  scope,
  title = "Conteúdo temporariamente indisponível",
  description = "O navegador tentou carregar um chunk desatualizado enquanto o ambiente recompilava. A página vai recarregar uma vez automaticamente; se persistir, use o botão abaixo.",
  buttonLabel = "Recarregar agora",
}: {
  children: ReactNode;
  path: string;
  scope: string;
  title?: string;
  description?: string;
  buttonLabel?: string;
}) {
  return (
    <ChunkLoadBoundaryImpl key={`${scope}:${path}`} path={path} scope={scope} title={title} description={description} buttonLabel={buttonLabel}>
      {children}
    </ChunkLoadBoundaryImpl>
  );
}
