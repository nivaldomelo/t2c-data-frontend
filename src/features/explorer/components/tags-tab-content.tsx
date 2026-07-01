import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/cn";

import type { TagItem } from "../types";

type ExplorerTagsTabContentProps = {
  canEdit: boolean;
  hasUnsavedChanges: boolean;
  onResetPendingChanges: () => void;
  onSaveChanges: () => void;
  selectedTagIds: number[];
  tagMap: Map<number, TagItem>;
  tagOptions: TagItem[];
  tagSearch: string;
  tagsLoading: boolean;
  tagsSaving: boolean;
  termsSaving: boolean;
  toggleTag: (tagId: number) => void;
  setTagSearch: (value: string) => void;
};

export function ExplorerTagsTabContent({
  canEdit,
  hasUnsavedChanges,
  onResetPendingChanges,
  onSaveChanges,
  selectedTagIds,
  setTagSearch,
  tagMap,
  tagOptions,
  tagSearch,
  tagsLoading,
  tagsSaving,
  termsSaving,
  toggleTag,
}: ExplorerTagsTabContentProps) {
  return (
    <div className="space-y-3">
      <div className="rounded-2xl border border-border bg-bg-subtle/80 p-4">
        <p className="text-sm font-semibold text-text">Tags e classificações do ativo</p>
        <p className="mt-1 text-sm leading-6 text-text-body">
          Use esta aba para classificar a tabela por domínio, uso, sensibilidade ou contexto de negócio. As tags ajudam a descobrir o ativo e a manter a organização do catálogo.
        </p>
      </div>

      {canEdit ? (
        <div className="sticky top-0 z-20 -mx-4 border-b border-border bg-surface px-4 py-3">
          <div className="flex items-center justify-between gap-3">
            <p className="text-xs text-text-body">
              {hasUnsavedChanges ? (
                <span className="rounded-full border border-warning-200 bg-warning-50 px-2 py-1 font-medium text-warning-700">
                  Alterações não salvas
                </span>
              ) : (
                "Sem alterações pendentes"
              )}
            </p>
            <div className="flex items-center gap-2">
              <button
                className="rounded-md border border-border-strong px-3 py-1.5 text-xs font-medium text-text-body hover:bg-bg-subtle disabled:opacity-60"
                disabled={!hasUnsavedChanges || tagsSaving || termsSaving}
                onClick={onResetPendingChanges}
                type="button"
              >
                Cancelar
              </button>
              <button
                className="rounded-md bg-slate-900 px-3 py-1.5 text-xs font-medium text-white shadow-sm transition hover:bg-slate-800 disabled:opacity-60"
                disabled={!hasUnsavedChanges || tagsSaving || termsSaving}
                onClick={onSaveChanges}
                type="button"
              >
                {tagsSaving || termsSaving ? "Salvando..." : "Salvar"}
              </button>
            </div>
          </div>
        </div>
      ) : null}

      <div className="space-y-1">
        <label className="text-xs font-medium text-text-body" htmlFor="tag-search">
          Buscar tags
        </label>
        <Input
          id="tag-search"
          onChange={(event) => setTagSearch(event.target.value)}
          placeholder="Digite para buscar tags..."
          value={tagSearch}
        />
      </div>

      <div className="flex min-h-10 flex-wrap gap-2 rounded-lg border border-border bg-bg-subtle p-2">
        {selectedTagIds.length === 0 ? (
          <span className="text-xs text-muted">Nenhuma tag selecionada ainda.</span>
        ) : (
          selectedTagIds.map((id) => (
            <div
              className="inline-flex items-center gap-2 rounded-full border border-info-200 bg-info-50 px-2.5 py-1 text-xs text-info-700"
              key={id}
            >
              <span className="font-medium">{tagMap.get(id)?.name ?? `Tag #${id}`}</span>
              {tagMap.get(id)?.group_name ? (
                <span className="rounded-full bg-surface/80 px-1.5 py-0.5 text-[10px] text-text-body">
                  {tagMap.get(id)?.group_name}
                </span>
              ) : null}
            </div>
          ))
        )}
      </div>

      <div className="h-[260px] overflow-auto rounded-lg border border-border">
        {tagsLoading ? (
          <div className="space-y-2 p-3">
            {Array.from({ length: 6 }).map((_, idx) => (
              <Skeleton className="h-8 w-full" key={idx} />
            ))}
          </div>
        ) : tagOptions.length === 0 ? (
          <div className="p-4 text-sm text-muted">Nenhuma tag encontrada para a busca atual.</div>
        ) : (
          tagOptions.map((tag) => {
            const selected = selectedTagIds.includes(tag.id);
            return (
              <button
                className={cn(
                  "w-full border-b border-border px-3 py-3 text-left transition hover:bg-info-50/70",
                  selected && "bg-info-50",
                )}
                key={tag.id}
                onClick={() => toggleTag(tag.id)}
                type="button"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-sm font-medium text-text">{tag.name}</span>
                      {tag.group_name ? (
                        <span className="rounded-full border border-border bg-surface px-2 py-0.5 text-[10px] font-medium text-text-body">
                          {tag.group_name}
                        </span>
                      ) : null}
                      {tag.subgroup_name ? (
                        <span className="rounded-full border border-border bg-bg-subtle px-2 py-0.5 text-[10px] font-medium text-muted">
                          {tag.subgroup_name}
                        </span>
                      ) : null}
                    </div>
                    <p className="mt-1 text-xs text-muted">{tag.slug}</p>
                    {tag.description ? (
                      <p className="mt-2 line-clamp-2 text-xs leading-5 text-text-body">{tag.description}</p>
                    ) : null}
                    <div className="mt-2 flex flex-wrap gap-2">
                      {tag.tag_type ? (
                        <span className="rounded-full bg-violet-50 px-2 py-0.5 text-[10px] font-medium text-violet-700">
                          {tag.tag_type}
                        </span>
                      ) : null}
                      {tag.suggested_scope ? (
                        <span className="rounded-full bg-info-50 px-2 py-0.5 text-[10px] font-medium text-info-700">
                          {tag.suggested_scope}
                        </span>
                      ) : null}
                    </div>
                  </div>
                  <input checked={selected} readOnly type="checkbox" />
                </div>
              </button>
            );
          })
        )}
      </div>

      <p className="text-xs text-muted">
        {canEdit
          ? "Selecione as classificações relevantes e use Salvar no topo para aplicar na tabela."
          : "Modo somente leitura."}
      </p>
    </div>
  );
}
