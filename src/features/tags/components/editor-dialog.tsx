import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useModalDismiss } from "@/lib/use-modal-dismiss";

type TagFormState = {
  external_id: string;
  slug: string;
  name: string;
  description: string;
  group_name: string;
  subgroup_name: string;
  example_of_use: string;
  tag_type: string;
  suggested_scope: string;
  status: string;
  synonyms: string;
  notes: string;
};

type TagsEditorDialogProps = {
  open: boolean;
  mode: "create" | "edit";
  form: TagFormState;
  saving: boolean;
  statusOptions: Array<{ value: string; label: string }>;
  onClose: () => void;
  onSubmit: (event: React.FormEvent<HTMLFormElement>) => void;
  onFormChange: (patch: Partial<TagFormState>) => void;
};

export function TagsEditorDialog({
  open,
  mode,
  form,
  saving,
  statusOptions,
  onClose,
  onSubmit,
  onFormChange,
}: TagsEditorDialogProps) {
  useModalDismiss({ open, onClose });
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/35 p-3">
      <div
        aria-modal="true"
        className="flex max-h-[92dvh] w-full max-w-3xl flex-col overflow-hidden rounded-2xl border border-border bg-surface shadow-2xl"
        role="dialog"
      >
        <div className="flex items-center justify-between border-b border-border px-6 py-4">
          <div>
            <h3 className="text-lg font-semibold text-text">{mode === "create" ? "Nova tag" : "Editar tag"}</h3>
            <p className="text-xs text-muted">Taxonomia operacional para classificação e Data Quality.</p>
          </div>
          <Button onClick={onClose} variant="ghost">
            Fechar
          </Button>
        </div>
        <form className="flex-1 space-y-5 overflow-y-auto p-6" onSubmit={onSubmit}>
          <div className="grid gap-4 md:grid-cols-3">
            <div>
              <label className="mb-1 block text-sm font-medium text-text-body">ID externo</label>
              <Input onChange={(event) => onFormChange({ external_id: event.target.value })} value={form.external_id} />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-text-body">Slug</label>
              <Input onChange={(event) => onFormChange({ slug: event.target.value })} value={form.slug} />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-text-body">Status</label>
              <Select onChange={(event) => onFormChange({ status: event.target.value })} value={form.status}>
                {statusOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </Select>
            </div>
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <label className="mb-1 block text-sm font-medium text-text-body">Tag</label>
              <Input onChange={(event) => onFormChange({ name: event.target.value })} required value={form.name} />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-text-body">Tipo da tag</label>
              <Input onChange={(event) => onFormChange({ tag_type: event.target.value })} value={form.tag_type} />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-text-body">Grupo</label>
              <Input onChange={(event) => onFormChange({ group_name: event.target.value })} value={form.group_name} />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-text-body">Subgrupo</label>
              <Input onChange={(event) => onFormChange({ subgroup_name: event.target.value })} value={form.subgroup_name} />
            </div>
            <div className="md:col-span-2">
              <label className="mb-1 block text-sm font-medium text-text-body">Escopo sugerido</label>
              <Input onChange={(event) => onFormChange({ suggested_scope: event.target.value })} value={form.suggested_scope} />
            </div>
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-text-body">Descrição</label>
            <Textarea onChange={(event) => onFormChange({ description: event.target.value })} value={form.description} />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-text-body">Exemplo de uso</label>
            <Textarea onChange={(event) => onFormChange({ example_of_use: event.target.value })} value={form.example_of_use} />
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <label className="mb-1 block text-sm font-medium text-text-body">Sinônimos</label>
              <Textarea onChange={(event) => onFormChange({ synonyms: event.target.value })} value={form.synonyms} />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-text-body">Observações</label>
              <Textarea onChange={(event) => onFormChange({ notes: event.target.value })} value={form.notes} />
            </div>
          </div>
          <div className="flex justify-end gap-2 border-t border-border pt-4">
            <Button onClick={onClose} type="button" variant="outline">
              Cancelar
            </Button>
            <Button disabled={saving} type="submit">
              {saving ? "Salvando..." : mode === "create" ? "Criar tag" : "Salvar alterações"}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
