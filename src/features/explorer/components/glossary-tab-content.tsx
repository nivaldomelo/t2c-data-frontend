import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/cn";

import type { GlossaryTermItem } from "../types";

type ExplorerGlossaryTabContentProps = {
  canEdit: boolean;
  hasUnsavedChanges: boolean;
  onResetPendingChanges: () => void;
  onSaveChanges: () => void;
  selectedTermIds: number[];
  setTermSearch: (value: string) => void;
  termMap: Map<number, GlossaryTermItem>;
  termOptions: GlossaryTermItem[];
  termSearch: string;
  tagsSaving: boolean;
  termsLoading: boolean;
  termsSaving: boolean;
  toggleTerm: (termId: number) => void;
};

export function ExplorerGlossaryTabContent({
  canEdit,
  hasUnsavedChanges,
  onResetPendingChanges,
  onSaveChanges,
  selectedTermIds,
  setTermSearch,
  termMap,
  termOptions,
  termSearch,
  tagsSaving,
  termsLoading,
  termsSaving,
  toggleTerm,
}: ExplorerGlossaryTabContentProps) {
  return (
    <div className="space-y-3">
      <div className="rounded-2xl border border-border bg-bg-subtle/80 p-4">
        <p className="text-sm font-semibold text-text">Glossário ligado à tabela</p>
        <p className="mt-1 text-sm leading-6 text-text-body">
          Relacione termos de negócio ao ativo para deixar mais claro o significado das colunas e reforçar a linguagem do catálogo.
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
        <label className="text-xs font-medium text-text-body" htmlFor="term-search">
          Buscar termos do glossário
        </label>
        <Input
          id="term-search"
          onChange={(event) => setTermSearch(event.target.value)}
          placeholder="Digite para buscar termos..."
          value={termSearch}
        />
      </div>

      <div className="flex min-h-10 flex-wrap gap-2 rounded-lg border border-border bg-bg-subtle p-2">
        {selectedTermIds.length === 0 ? (
          <span className="text-xs text-muted">Nenhum termo selecionado ainda.</span>
        ) : (
          selectedTermIds.map((id) => (
            <span
              className="inline-flex items-center rounded-full border border-info-200 bg-info-50 px-2 py-0.5 text-xs text-info-700"
              key={id}
            >
              {termMap.get(id)?.name ?? `Termo #${id}`}
            </span>
          ))
        )}
      </div>

      <div className="h-[260px] overflow-auto rounded-lg border border-border">
        {termsLoading ? (
          <div className="space-y-2 p-3">
            {Array.from({ length: 6 }).map((_, idx) => (
              <Skeleton className="h-8 w-full" key={idx} />
            ))}
          </div>
        ) : termOptions.length === 0 ? (
          <div className="p-4 text-sm text-muted">Nenhum termo encontrado para a busca atual.</div>
        ) : (
          termOptions.map((term) => {
            const selected = selectedTermIds.includes(term.id);
            return (
              <button
                className={cn(
                  "flex w-full items-center justify-between border-b border-border px-3 py-2 text-left text-sm hover:bg-info-50",
                  selected && "bg-info-50",
                )}
                key={term.id}
                onClick={() => toggleTerm(term.id)}
                type="button"
              >
                <span>{term.name}</span>
                <input checked={selected} readOnly type="checkbox" />
              </button>
            );
          })
        )}
      </div>

      <p className="text-xs text-muted">
        {canEdit ? "Selecione um ou mais termos e use Salvar no topo para vinculá-los à tabela." : "Modo somente leitura."}
      </p>
    </div>
  );
}
