import { Loader2, Trash2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { useModalDismiss } from "@/lib/use-modal-dismiss";

type DeleteDatasourceDialogProps = {
  open: boolean;
  datasourceName: string | null;
  isDeleting: boolean;
  onClose: () => void;
  onConfirm: () => void;
};

export function DeleteDatasourceDialog({
  open,
  datasourceName,
  isDeleting,
  onClose,
  onConfirm,
}: DeleteDatasourceDialogProps) {
  useModalDismiss({ open, onClose });
  if (!open || !datasourceName) return null;

  return (
    <div
      aria-modal="true"
      className="fixed inset-0 z-[70] bg-black/40 p-3"
      role="dialog"
    >
      <div className="mx-auto mt-20 w-full max-w-lg rounded-xl bg-surface shadow-xl">
        <div className="border-b border-border px-5 py-4">
          <h3 className="text-lg font-semibold">Excluir fonte de dados</h3>
        </div>
        <div className="space-y-3 px-5 py-4 text-sm text-text-body">
          <p>
            Excluir a fonte de dados <span className="font-semibold">"{datasourceName}"</span>?
            Isso removerá também todos os dados relacionados e não pode ser desfeito.
          </p>
        </div>
        <div className="flex items-center justify-end gap-2 border-t border-border px-5 py-4">
          <Button onClick={onClose} type="button" variant="ghost">
            Cancelar
          </Button>
          <Button disabled={isDeleting} onClick={onConfirm} type="button">
            {isDeleting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Trash2 className="mr-2 h-4 w-4" />}
            Excluir
          </Button>
        </div>
      </div>
    </div>
  );
}
