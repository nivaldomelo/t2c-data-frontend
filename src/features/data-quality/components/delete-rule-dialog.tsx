import { Loader2, Trash2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { useModalDismiss } from "@/lib/use-modal-dismiss";
import type { DQRule } from "@/features/data-quality/types";

type DeleteRuleDialogProps = {
  open: boolean;
  candidate: DQRule | null;
  isDeleting: boolean;
  onClose: () => void;
  onConfirm: () => void;
};

export function DeleteRuleDialog({
  open,
  candidate,
  isDeleting,
  onClose,
  onConfirm,
}: DeleteRuleDialogProps) {
  useModalDismiss({ open, onClose });
  if (!open || !candidate) return null;

  return (
    <div
      aria-modal="true"
      className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-950/55 p-4 backdrop-blur-md"
      role="dialog"
    >
      <div className="w-full max-w-md rounded-[28px] border border-border/80 bg-surface shadow-card">
        <div className="border-b border-border/70 bg-[linear-gradient(135deg,#ffffff_0%,#f8fafc_58%,#eef6ff_100%)] px-5 py-4">
          <h3 className="text-base font-semibold text-text">Excluir regra?</h3>
          <p className="mt-1 text-sm text-text-body">
            Essa ação não pode ser desfeita. Tem certeza que deseja excluir esta regra?
          </p>
          <p className="mt-2 truncate text-xs text-muted">{candidate.name}</p>
        </div>
        <div className="flex items-center justify-end gap-2 border-t border-border/70 bg-surface/95 px-5 py-4 backdrop-blur">
          <Button disabled={isDeleting} onClick={onClose} type="button" variant="outline">
            Cancelar
          </Button>
          <Button disabled={isDeleting} onClick={onConfirm} type="button" variant="danger">
            {isDeleting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Trash2 className="mr-2 h-4 w-4" />}
            Excluir
          </Button>
        </div>
      </div>
    </div>
  );
}
