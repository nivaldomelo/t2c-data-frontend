import { useEffect, useRef, useState } from "react";
import { Link } from "@/lib/next-shims";
import { Sparkles, X } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/cn";

import { AssistantSidePanel } from "./assistant-side-panel";
import type { AssistantExplainResponse } from "../types";

type AssistantDrawerProps = {
  assetLabel: string;
  assetRef: string | null;
  open: boolean;
  onClose: () => void;
  onActionCompleted?: () => void;
};

export function AssistantDrawer({ assetLabel, assetRef, open, onClose, onActionCompleted }: AssistantDrawerProps) {
  const dialogRef = useRef<HTMLDivElement | null>(null);
  const [snapshot, setSnapshot] = useState<{ payload: AssistantExplainResponse | null; loading: boolean; error: string }>({
    payload: null,
    loading: false,
    error: "",
  });
  const tableIdMatch = assetRef?.match(/^table:(\d+)$/);
  const tableId = tableIdMatch ? Number(tableIdMatch[1]) : null;
  const openTimelineHref = tableId ? `/governance/timeline?table_id=${tableId}` : null;

  useEffect(() => {
    if (!open) return;

    dialogRef.current?.focus();
    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        onClose();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = originalOverflow;
    };
  }, [onClose, open]);

  useEffect(() => {
    if (!open) {
      setSnapshot({ payload: null, loading: false, error: "" });
    }
  }, [open]);

  if (!open) return null;

  const assetIntelligence = snapshot.payload?.context?.asset_intelligence;
  const riskScore =
    assetIntelligence && typeof assetIntelligence === "object" && "risk_score" in assetIntelligence
      ? (assetIntelligence as { risk_score?: number }).risk_score
      : null;
  const badgeLabel = snapshot.loading
    ? "Carregando"
    : snapshot.error
      ? "Erro"
      : riskScore !== null && riskScore !== undefined
        ? `Risco ${riskScore}/100`
        : snapshot.payload?.problems.length
          ? `${snapshot.payload.problems.length} problema(s)`
          : snapshot.payload
            ? "Sem achados críticos"
            : "Sob demanda";
  const badgeTone: "neutral" | "danger" | "warning" | "success" = snapshot.loading
    ? "neutral"
    : snapshot.error
      ? "danger"
      : snapshot.payload?.problems.length
        ? "warning"
        : "success";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/65 p-3 backdrop-blur-md sm:p-6" onClick={onClose}>
      <div
        aria-label={`Assistente inteligente para ${assetLabel}`}
        aria-modal="true"
        className={cn(
          "flex h-[calc(100dvh-1.5rem)] w-full flex-col overflow-hidden rounded-[28px] border border-border/70 bg-surface shadow-card outline-none",
          "sm:h-[85vh] sm:max-w-5xl",
        )}
        onClick={(event) => event.stopPropagation()}
        ref={dialogRef}
        role="dialog"
        tabIndex={-1}
      >
        <div className="flex items-center justify-between gap-3 border-b border-border/70 bg-[linear-gradient(135deg,#ffffff_0%,#f8fafc_58%,#eef6ff_100%)] px-5 py-4">
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <div className="flex h-10 w-10 items-center justify-center rounded-2xl border border-brand-200 bg-brand-50 text-brand-700 shadow-sm">
                <Sparkles className="h-5 w-5" />
              </div>
              <div className="min-w-0">
                <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-brand-600">Assistente inteligente</p>
                <p className="truncate text-sm font-semibold text-text">{assetLabel}</p>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Badge tone={badgeTone}>{badgeLabel}</Badge>
            <Button aria-label="Fechar assistente" onClick={onClose} size="sm" variant="ghost">
              <X className="h-4 w-4" />
            </Button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-4 sm:p-6">
          <AssistantSidePanel
            assetLabel={assetLabel}
            assetRef={assetRef}
            className="border-0 bg-transparent shadow-none"
            onActionCompleted={onActionCompleted}
            onPayloadChange={setSnapshot}
          />
        </div>

        <div className="flex flex-col gap-3 border-t border-border/70 bg-surface/95 px-5 py-4 backdrop-blur sm:flex-row sm:items-center sm:justify-between">
          <div className="flex flex-wrap items-center gap-2 text-xs text-muted">
            <Badge tone="neutral">Modal centralizado</Badge>
            <span>O conteúdo rola internamente sem afetar o Explorer.</span>
          </div>
          <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            {openTimelineHref ? (
              <Button asChild size="sm" variant="outline">
                <Link href={openTimelineHref}>Abrir timeline</Link>
              </Button>
            ) : null}
            <Button onClick={onClose} size="sm" variant="default">
              Fechar
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
