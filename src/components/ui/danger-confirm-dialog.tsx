import { useEffect, useState } from "react";
import { AlertTriangle, X } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/cn";

type DangerConfirmDialogProps = {
  open: boolean;
  title: string;
  description: string;
  confirmLabel: string;
  cancelLabel?: string;
  confirmToken?: string;
  confirmTokenLabel?: string;
  busy?: boolean;
  onCancel: () => void;
  onConfirm: () => void;
};

export function DangerConfirmDialog({
  open,
  title,
  description,
  confirmLabel,
  cancelLabel = "Cancelar",
  confirmToken,
  confirmTokenLabel,
  busy = false,
  onCancel,
  onConfirm,
}: DangerConfirmDialogProps) {
  const [typed, setTyped] = useState("");

  useEffect(() => {
    if (open) {
      setTyped("");
    }
  }, [open]);

  useEffect(() => {
    if (!open) return;
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        onCancel();
      }
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [open, onCancel]);

  if (!open) return null;

  const tokenSatisfied = confirmToken ? typed.trim().toUpperCase() === confirmToken.toUpperCase() : true;

  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center bg-slate-950/60 p-4 backdrop-blur-md">
      <button aria-label="Fechar confirmação" className="absolute inset-0 cursor-default" onClick={onCancel} type="button" />
      <div
        aria-labelledby="danger-confirm-title"
        aria-modal="true"
        className="relative w-full max-w-lg overflow-hidden rounded-3xl border border-border/80 bg-surface shadow-card"
        role="dialog"
      >
        <div className="border-b border-border/70 bg-[linear-gradient(135deg,#fff7f7_0%,#ffffff_48%,#f8fafc_100%)] px-6 py-5">
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <div className="flex h-10 w-10 items-center justify-center rounded-2xl border border-danger-200 bg-surface text-danger-700 shadow-sm">
                  <AlertTriangle className="h-5 w-5" />
                </div>
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-danger-700">Ação destrutiva</p>
                  <h3 className="mt-1 text-xl font-semibold text-text" id="danger-confirm-title">
                    {title}
                  </h3>
                </div>
              </div>
            </div>
            <Button aria-label="Fechar confirmação" className="h-10 w-10 shrink-0 px-0" onClick={onCancel} variant="ghost">
              <X className="h-4 w-4" />
            </Button>
          </div>
        </div>

        <div className="space-y-4 px-6 py-5">
          <p className="text-sm leading-6 text-text-body">{description}</p>

          {confirmToken ? (
            <div className="space-y-2">
              <label className="block text-sm font-medium text-text-body">
                {confirmTokenLabel || `Digite ${confirmToken} para confirmar`}
              </label>
              <Input autoComplete="off" autoFocus onChange={(event) => setTyped(event.target.value)} value={typed} />
            </div>
          ) : null}
        </div>

        <div className="border-t border-border/70 bg-bg-subtle/80 px-6 py-4">
          <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <Button onClick={onCancel} variant="outline">
              {cancelLabel}
            </Button>
            <Button
              className={cn("bg-danger-600 text-white hover:bg-danger-700", busy && "opacity-80")}
              disabled={busy || !tokenSatisfied}
              onClick={onConfirm}
            >
              {busy ? "Processando..." : confirmLabel}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
