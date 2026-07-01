import { X } from "lucide-react";

import { Button } from "@/components/ui/button";
import { useModalDismiss } from "@/lib/use-modal-dismiss";
import type { DQJobRun } from "@/features/data-quality/types";

type RuleRunLogDialogProps = {
  open: boolean;
  job: DQJobRun | null;
  onClose: () => void;
};

export function RuleRunLogDialog({ open, job, onClose }: RuleRunLogDialogProps) {
  useModalDismiss({ open, onClose });
  if (!open || !job) return null;

  return (
    <div
      aria-modal="true"
      className="fixed inset-0 z-[70] flex items-center justify-center bg-slate-950/55 p-4 backdrop-blur-md"
      role="dialog"
    >
      <div className="w-full max-w-3xl rounded-[28px] border border-border/80 bg-surface shadow-card">
        <div className="flex items-center justify-between border-b border-border/70 bg-[linear-gradient(135deg,#ffffff_0%,#f8fafc_58%,#eef6ff_100%)] px-5 py-4">
          <h3 className="text-base font-semibold text-text">Logs da execução da regra</h3>
          <button aria-label="Fechar" className="rounded-full border border-border/70 p-1 hover:border-border-strong hover:bg-bg-subtle" onClick={onClose} type="button">
            <X className="h-4 w-4" />
          </button>
        </div>
        <div className="max-h-[60vh] overflow-auto px-5 py-4">
          <pre className="whitespace-pre-wrap break-words rounded-2xl border border-border/80 bg-bg-subtle/80 p-3 text-xs text-text-body">
            {job.error_message || ""}
            {job.error_message && job.log_tail ? "\n\n" : ""}
            {job.log_tail || "Sem logs disponíveis."}
          </pre>
        </div>
        <div className="flex justify-end border-t border-border/70 bg-surface/95 px-5 py-4 backdrop-blur">
          <Button onClick={onClose} type="button" variant="outline">
            Fechar
          </Button>
        </div>
      </div>
    </div>
  );
}
