import type { FormEvent } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useModalDismiss } from "@/lib/use-modal-dismiss";

type CertificationGoalForm = {
  name: string;
  period_start: string;
  period_end: string;
  target_certified_assets: string;
  target_eligible_assets: string;
  target_reviewed_assets: string;
  target_revalidated_assets: string;
  scope_type: string;
  scope_value: string;
  owner: string;
  notes: string;
};

type CertificationGoalDialogProps = {
  open: boolean;
  saving: boolean;
  form: CertificationGoalForm;
  onClose: () => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
  onFormChange: (patch: Partial<CertificationGoalForm>) => void;
};

const SCOPE_OPTIONS = [
  { value: "global", label: "Global" },
  { value: "datasource", label: "Fonte" },
  { value: "database", label: "Banco" },
  { value: "schema", label: "Schema" },
  { value: "owner", label: "Owner" },
  { value: "criticality", label: "Criticidade" },
];

export function CertificationGoalDialog({
  open,
  saving,
  form,
  onClose,
  onSubmit,
  onFormChange,
}: CertificationGoalDialogProps) {
  useModalDismiss({ open, onClose });
  if (!open) return null;

  return (
    <div
      aria-modal="true"
      className="fixed inset-0 z-50 overflow-y-auto bg-slate-950/35 p-4"
      onClick={onClose}
      role="dialog"
    >
      <div className="flex min-h-full items-center justify-center">
        <div
          className="w-full max-w-3xl rounded-[28px] border border-border bg-surface shadow-[0_30px_90px_-28px_rgba(15,23,42,0.45)]"
          onClick={(event) => event.stopPropagation()}
        >
          <div className="border-b border-border px-6 py-5">
            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-brand-600">Meta de certificação</p>
            <h3 className="mt-2 text-xl font-semibold text-text">Nova meta</h3>
            <p className="mt-1 text-sm text-text-body">
              Defina um objetivo real de certificação, elegibilidade e revisão para transformar a fila em plano operacional.
            </p>
          </div>
          <form className="space-y-5 px-6 py-6" onSubmit={onSubmit}>
            <div className="grid gap-4 md:grid-cols-2">
              <div className="md:col-span-2">
                <label className="mb-1 block text-xs font-medium text-text-body">Nome da meta</label>
                <Input
                  placeholder="Certificação Maio 2026 - Domínio Dados"
                  value={form.name}
                  onChange={(event) => onFormChange({ name: event.target.value })}
                />
                <p className="mt-1 text-xs text-muted">
                  Use um nome claro para identificar período, escopo e objetivo principal.
                </p>
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-text-body">Período inicial</label>
                <Input type="date" value={form.period_start} onChange={(event) => onFormChange({ period_start: event.target.value })} />
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-text-body">Período final</label>
                <Input type="date" value={form.period_end} onChange={(event) => onFormChange({ period_end: event.target.value })} />
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-text-body">Meta de certificados</label>
                <Input
                  type="number"
                  min="0"
                  value={form.target_certified_assets}
                  onChange={(event) => onFormChange({ target_certified_assets: event.target.value })}
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-text-body">Meta de elegíveis</label>
                <Input
                  type="number"
                  min="0"
                  value={form.target_eligible_assets}
                  onChange={(event) => onFormChange({ target_eligible_assets: event.target.value })}
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-text-body">Meta de revisados</label>
                <Input
                  type="number"
                  min="0"
                  value={form.target_reviewed_assets}
                  onChange={(event) => onFormChange({ target_reviewed_assets: event.target.value })}
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-text-body">Meta de revalidados</label>
                <Input
                  type="number"
                  min="0"
                  value={form.target_revalidated_assets}
                  onChange={(event) => onFormChange({ target_revalidated_assets: event.target.value })}
                />
              </div>
            </div>

            <div className="grid gap-4 md:grid-cols-3">
              <div>
                <label className="mb-1 block text-xs font-medium text-text-body">Escopo</label>
                <select
                  className="h-10 w-full rounded-xl border border-border bg-surface px-3 text-sm"
                  value={form.scope_type}
                  onChange={(event) => onFormChange({ scope_type: event.target.value })}
                >
                  {SCOPE_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </div>
              <div className="md:col-span-2">
                <label className="mb-1 block text-xs font-medium text-text-body">Valor do escopo</label>
                <Input
                  placeholder={form.scope_type === "owner" ? "ID do owner" : "Ex.: andromeda, bronze, critical"}
                  value={form.scope_value}
                  onChange={(event) => onFormChange({ scope_value: event.target.value })}
                />
                <p className="mt-1 text-xs text-muted">
                  Use este campo quando a meta não for global. Para owner, informe o identificador numérico do owner.
                </p>
              </div>
              <div className="md:col-span-3">
                <label className="mb-1 block text-xs font-medium text-text-body">Responsável</label>
                <Input
                  placeholder="Time de Governança de Dados"
                  value={form.owner}
                  onChange={(event) => onFormChange({ owner: event.target.value })}
                />
              </div>
            </div>

            <div>
              <label className="mb-1 block text-xs font-medium text-text-body">Observações</label>
              <Textarea
                className="min-h-[120px]"
                placeholder="Explique o contexto da meta, dependências, prioridade e como o time pretende avançar."
                value={form.notes}
                onChange={(event) => onFormChange({ notes: event.target.value })}
              />
            </div>

            <div className="flex items-center justify-end gap-3 border-t border-border pt-5">
              <Button onClick={onClose} type="button" variant="ghost">
                Cancelar
              </Button>
              <Button disabled={saving} type="submit">
                {saving ? "Salvando..." : "Criar meta"}
              </Button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
