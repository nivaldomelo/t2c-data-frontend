import type { Dispatch, FormEvent, SetStateAction } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useModalDismiss } from "@/lib/use-modal-dismiss";

type TermFormState = {
  external_id: string;
  slug: string;
  name: string;
  definition: string;
  category: string;
  subcategory: string;
  example_of_use: string;
  synonyms: string;
  suggested_priority: string;
  status: string;
  tag_labels: string;
  notes: string;
};

type GlossaryEditorDialogProps = {
  open: boolean;
  mode: "create" | "edit";
  form: TermFormState;
  saving: boolean;
  priorityOptions: string[];
  statusOptions: string[];
  priorityLabel: (value: string | null) => string;
  statusLabel: (value: string) => string;
  setForm: Dispatch<SetStateAction<TermFormState>>;
  onClose: () => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
};

export function GlossaryEditorDialog({
  open,
  mode,
  form,
  saving,
  priorityOptions,
  statusOptions,
  priorityLabel,
  statusLabel,
  setForm,
  onClose,
  onSubmit,
}: GlossaryEditorDialogProps) {
  useModalDismiss({ open, onClose });
  if (!open) return null;

  return (
    <div aria-modal="true" className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 p-3" role="dialog">
      <div className="flex max-h-[92dvh] w-full max-w-3xl flex-col overflow-hidden rounded-2xl border border-border bg-surface shadow-2xl">
        <div className="flex items-center justify-between border-b border-border px-6 py-4">
          <div>
            <h3 className="text-lg font-semibold text-text">{mode === "create" ? "Novo termo" : "Editar termo"}</h3>
            <p className="text-xs text-muted">Preencha os campos para manter o glossário consistente com o catálogo.</p>
          </div>
          <Button onClick={onClose} variant="ghost">
            Fechar
          </Button>
        </div>
        <form className="flex-1 space-y-5 overflow-y-auto p-6" onSubmit={onSubmit}>
          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <label className="mb-1 block text-sm font-medium text-text-body">ID externo</label>
              <Input onChange={(event) => setForm((current) => ({ ...current, external_id: event.target.value }))} value={form.external_id} />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-text-body">Slug</label>
              <Input onChange={(event) => setForm((current) => ({ ...current, slug: event.target.value }))} required value={form.slug} />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-text-body">Termo</label>
              <Input onChange={(event) => setForm((current) => ({ ...current, name: event.target.value }))} required value={form.name} />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-text-body">Status</label>
              <Select onChange={(event) => setForm((current) => ({ ...current, status: event.target.value }))} value={form.status}>
                {statusOptions.map((value) => (
                  <option key={value} value={value}>
                    {statusLabel(value)}
                  </option>
                ))}
              </Select>
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-text-body">Prioridade sugerida</label>
              <Select onChange={(event) => setForm((current) => ({ ...current, suggested_priority: event.target.value }))} value={form.suggested_priority}>
                {priorityOptions.map((value) => (
                  <option key={value} value={value}>
                    {priorityLabel(value)}
                  </option>
                ))}
              </Select>
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-text-body">Categoria</label>
              <Input onChange={(event) => setForm((current) => ({ ...current, category: event.target.value }))} value={form.category} />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-text-body">Subcategoria</label>
              <Input onChange={(event) => setForm((current) => ({ ...current, subcategory: event.target.value }))} value={form.subcategory} />
            </div>
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-text-body">Definição</label>
            <Textarea onChange={(event) => setForm((current) => ({ ...current, definition: event.target.value }))} required value={form.definition} />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-text-body">Exemplo de uso</label>
            <Textarea onChange={(event) => setForm((current) => ({ ...current, example_of_use: event.target.value }))} value={form.example_of_use} />
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <label className="mb-1 block text-sm font-medium text-text-body">Sinônimos</label>
              <Textarea onChange={(event) => setForm((current) => ({ ...current, synonyms: event.target.value }))} value={form.synonyms} />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-text-body">Tags</label>
              <Textarea onChange={(event) => setForm((current) => ({ ...current, tag_labels: event.target.value }))} placeholder="qualidade;fundamentos" value={form.tag_labels} />
            </div>
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-text-body">Observações</label>
            <Textarea onChange={(event) => setForm((current) => ({ ...current, notes: event.target.value }))} value={form.notes} />
          </div>
          <div className="flex justify-end gap-2 border-t border-border pt-4">
            <Button onClick={onClose} type="button" variant="outline">
              Cancelar
            </Button>
            <Button disabled={saving} type="submit">
              {saving ? "Salvando..." : mode === "create" ? "Criar termo" : "Salvar alterações"}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
