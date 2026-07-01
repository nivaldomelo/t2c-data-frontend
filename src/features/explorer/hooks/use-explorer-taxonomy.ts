import { useEffect, useMemo, useState } from "react";

import { apiRequest } from "@/lib/client-api";

import type {
  DetailTab,
  GlossaryTermItem,
  NoticeState,
  TagItem,
} from "../types";

type PageResponse<T> = {
  items?: T[];
  total?: number;
  page?: number;
  page_size?: number;
  has_more?: boolean;
};

function normalizeListResponse<T>(response: T[] | PageResponse<T>): T[] {
  return Array.isArray(response) ? response : response.items ?? [];
}

type UseExplorerTaxonomyOptions = {
  activeTab: DetailTab;
  selectedTableId: number | null;
  onNotice: (notice: NoticeState) => void;
};

export function useExplorerTaxonomy({
  activeTab,
  selectedTableId,
  onNotice,
}: UseExplorerTaxonomyOptions) {
  const [tableTags, setTableTags] = useState<TagItem[]>([]);
  const [tableTerms, setTableTerms] = useState<GlossaryTermItem[]>([]);
  const [selectedTagIds, setSelectedTagIds] = useState<number[]>([]);
  const [selectedTermIds, setSelectedTermIds] = useState<number[]>([]);
  const [originalTagIds, setOriginalTagIds] = useState<number[]>([]);
  const [originalTermIds, setOriginalTermIds] = useState<number[]>([]);
  const [tagOptions, setTagOptions] = useState<TagItem[]>([]);
  const [termOptions, setTermOptions] = useState<GlossaryTermItem[]>([]);
  const [tagSearch, setTagSearch] = useState("");
  const [termSearch, setTermSearch] = useState("");
  const [tagsLoading, setTagsLoading] = useState(false);
  const [termsLoading, setTermsLoading] = useState(false);
  const [tagsSaving, setTagsSaving] = useState(false);
  const [termsSaving, setTermsSaving] = useState(false);

  useEffect(() => {
    if (selectedTableId === null || activeTab !== "tags") return;
    void (async () => {
      try {
        const suffix = tagSearch.trim() ? `?query=${encodeURIComponent(tagSearch.trim())}` : "";
        const options = await apiRequest<TagItem[] | PageResponse<TagItem>>(`/v1/tags${suffix}`);
        setTagOptions(normalizeListResponse(options));
      } catch {
        setTagOptions([]);
      }
    })();
  }, [activeTab, selectedTableId, tagSearch]);

  useEffect(() => {
    if (selectedTableId === null || activeTab !== "glossary") return;
    void (async () => {
      try {
        const suffix = termSearch.trim() ? `?query=${encodeURIComponent(termSearch.trim())}` : "";
        const options = await apiRequest<GlossaryTermItem[] | PageResponse<GlossaryTermItem>>(`/v1/glossary/terms${suffix}`);
        setTermOptions(normalizeListResponse(options));
      } catch {
        setTermOptions([]);
      }
    })();
  }, [activeTab, selectedTableId, termSearch]);

  function applyLoadedTaxonomy(tags: TagItem[], terms: GlossaryTermItem[]) {
    setTableTags(tags);
    const tagIds = tags.map((tag) => tag.id).sort((a, b) => a - b);
    setSelectedTagIds(tagIds);
    setOriginalTagIds(tagIds);

    setTableTerms(terms);
    const termIds = terms.map((term) => term.id).sort((a, b) => a - b);
    setSelectedTermIds(termIds);
    setOriginalTermIds(termIds);
  }

  function resetTaxonomyState() {
    setTableTags([]);
    setTableTerms([]);
    setSelectedTagIds([]);
    setSelectedTermIds([]);
    setOriginalTagIds([]);
    setOriginalTermIds([]);
    setTagSearch("");
    setTermSearch("");
    setTagOptions([]);
    setTermOptions([]);
  }

  function toggleTag(tagId: number): void {
    setSelectedTagIds((prev) =>
      (prev.includes(tagId) ? prev.filter((id) => id !== tagId) : [...prev, tagId]).sort((a, b) => a - b),
    );
  }

  function toggleTerm(termId: number): void {
    setSelectedTermIds((prev) =>
      (prev.includes(termId) ? prev.filter((id) => id !== termId) : [...prev, termId]).sort((a, b) => a - b),
    );
  }

  async function saveTags(): Promise<void> {
    if (selectedTableId === null) return;
    const tableId = selectedTableId;
    const tagIds = [...selectedTagIds];
    try {
      setTagsSaving(true);
      await apiRequest<TagItem[]>(`/v1/tables/${tableId}/tags`, {
        method: "PUT",
        body: JSON.stringify({ tag_ids: tagIds }),
      });
      const updated = await apiRequest<TagItem[] | PageResponse<TagItem>>(`/v1/catalog/tables/${tableId}/tags`);
      const normalizedUpdated = normalizeListResponse(updated);
      setTableTags(normalizedUpdated);
      const updatedIds = normalizedUpdated.map((tag) => tag.id).sort((a, b) => a - b);
      setSelectedTagIds(updatedIds);
      setOriginalTagIds(updatedIds);
      onNotice({ tone: "success", message: "Tags atualizadas com sucesso." });
    } catch (error) {
      onNotice({ tone: "error", message: (error as Error).message });
    } finally {
      setTagsSaving(false);
    }
  }

  async function saveTerms(): Promise<void> {
    if (selectedTableId === null) return;
    const tableId = selectedTableId;
    const termIds = [...selectedTermIds];
    try {
      setTermsSaving(true);
      await apiRequest<GlossaryTermItem[]>(`/v1/tables/${tableId}/glossary-terms`, {
        method: "PUT",
        body: JSON.stringify({ term_ids: termIds }),
      });
      const updated = await apiRequest<GlossaryTermItem[] | PageResponse<GlossaryTermItem>>(
        `/v1/catalog/tables/${tableId}/glossary-terms`,
      );
      const normalizedUpdated = normalizeListResponse(updated);
      setTableTerms(normalizedUpdated);
      const updatedIds = normalizedUpdated.map((term) => term.id).sort((a, b) => a - b);
      setSelectedTermIds(updatedIds);
      setOriginalTermIds(updatedIds);
      onNotice({ tone: "success", message: "Termos do glossário atualizados com sucesso." });
    } catch (error) {
      onNotice({ tone: "error", message: (error as Error).message });
    } finally {
      setTermsSaving(false);
    }
  }

  function resetPendingChanges(): void {
    if (activeTab === "tags") {
      setSelectedTagIds(originalTagIds);
      return;
    }
    if (activeTab === "glossary") {
      setSelectedTermIds(originalTermIds);
    }
  }

  async function saveActiveTabChanges(): Promise<void> {
    if (activeTab === "tags") {
      await saveTags();
      return;
    }
    if (activeTab === "glossary") {
      await saveTerms();
    }
  }

  const tagMap = useMemo(() => {
    const merged = [...tagOptions, ...tableTags];
    return new Map(merged.map((item) => [item.id, item]));
  }, [tagOptions, tableTags]);

  const termMap = useMemo(() => {
    const merged = [...termOptions, ...tableTerms];
    return new Map(merged.map((item) => [item.id, item]));
  }, [termOptions, tableTerms]);

  const isTagsDirty =
    selectedTagIds.length !== originalTagIds.length ||
    selectedTagIds.some((id, idx) => id !== originalTagIds[idx]);
  const isTermsDirty =
    selectedTermIds.length !== originalTermIds.length ||
    selectedTermIds.some((id, idx) => id !== originalTermIds[idx]);
  const hasUnsavedChanges = activeTab === "tags" ? isTagsDirty : activeTab === "glossary" ? isTermsDirty : false;

  return {
    applyLoadedTaxonomy,
    hasUnsavedChanges,
    originalTagIds,
    originalTermIds,
    resetPendingChanges,
    resetTaxonomyState,
    saveActiveTabChanges,
    selectedTagIds,
    selectedTermIds,
    setTagsLoading,
    setTermsLoading,
    setTagSearch,
    setTermSearch,
    tableTags,
    tableTerms,
    tagMap,
    tagOptions,
    tagSearch,
    tagsLoading,
    tagsSaving,
    termMap,
    termOptions,
    termSearch,
    termsLoading,
    termsSaving,
    toggleTag,
    toggleTerm,
  };
}
