import { useEffect, useMemo, useState } from "react";

import { apiRequest } from "@/lib/client-api";

import type { DataOwnerItem, NoticeState, OwnerForm, TableDetailInfo } from "../types";

type PageResponse<T> = {
  items?: T[];
  total?: number;
  page?: number;
  page_size?: number;
  has_more?: boolean;
};

const EMPTY_OWNER_FORM: OwnerForm = {
  id: null,
  name: "",
  email: "",
  area: "",
  description: "",
  is_active: true,
};

type UseExplorerOwnerManagementOptions = {
  selectedTableId: number | null;
  onNotice: (notice: NoticeState) => void;
};

export function useExplorerOwnerManagement({
  selectedTableId,
  onNotice,
}: UseExplorerOwnerManagementOptions) {
  const [owner, setOwner] = useState<string | null>(null);
  const [ownerEmail, setOwnerEmail] = useState<string | null>(null);
  const [ownerArea, setOwnerArea] = useState<string | null>(null);
  const [tableDataOwnerId, setTableDataOwnerId] = useState<number | null>(null);
  const [pendingOwnerId, setPendingOwnerId] = useState<number | null>(null);
  const [ownerEditorOpen, setOwnerEditorOpen] = useState(false);
  const [ownerOptions, setOwnerOptions] = useState<DataOwnerItem[]>([]);
  const [ownerSearch, setOwnerSearch] = useState("");
  const [ownerFormMode, setOwnerFormMode] = useState<"associate" | "create" | "edit">("associate");
  const [ownerForm, setOwnerForm] = useState<OwnerForm>(EMPTY_OWNER_FORM);
  const [ownerSaving, setOwnerSaving] = useState(false);

  useEffect(() => {
    void (async () => {
      try {
        const data = await apiRequest<DataOwnerItem[] | PageResponse<DataOwnerItem>>("/v1/data-owners");
        setOwnerOptions(Array.isArray(data) ? data : data.items ?? []);
      } catch {
        setOwnerOptions([]);
      }
    })();
  }, []);

  function applyTableInfo(tableInfo: TableDetailInfo) {
    setTableDataOwnerId(tableInfo.data_owner_id);
    setPendingOwnerId(tableInfo.data_owner_id);
    setOwner(tableInfo.data_owner?.name ?? tableInfo.owner ?? null);
    setOwnerEmail(tableInfo.data_owner?.email ?? tableInfo.owner_email ?? null);
    setOwnerArea(tableInfo.data_owner?.area ?? null);
  }

  function resetOwnerState() {
    setOwner(null);
    setOwnerEmail(null);
    setTableDataOwnerId(null);
    setPendingOwnerId(null);
    setOwnerArea(null);
    setOwnerSearch("");
    setOwnerFormMode("associate");
    setOwnerForm(EMPTY_OWNER_FORM);
    setOwnerEditorOpen(false);
  }

  function beginCreateOwner() {
    setOwnerFormMode("create");
    setOwnerForm(EMPTY_OWNER_FORM);
  }

  function beginEditOwner(ownerId: number | null) {
    if (ownerId === null) return;
    const current = ownerOptions.find((item) => item.id === ownerId);
    if (!current) return;
    setOwnerFormMode("edit");
    setOwnerForm({
      id: current.id,
      name: current.name,
      email: current.email,
      area: current.area || "",
      description: current.description || "",
      is_active: current.is_active,
    });
  }

  const filteredOwnerOptions = useMemo(() => {
    const q = ownerSearch.trim().toLowerCase();
    if (!q) return ownerOptions;
    return ownerOptions.filter((item) =>
      [item.name, item.email, item.area || ""].some((value) => value.toLowerCase().includes(q)),
    );
  }, [ownerOptions, ownerSearch]);

  async function saveOwnerAssociation(dataOwnerId: number | null): Promise<void> {
    if (selectedTableId === null) return;
    try {
      setOwnerSaving(true);
      // Owner-only mutation surface so the data_owner role can reassign owners
      // without the broad table-metadata permission.
      const updated = await apiRequest<TableDetailInfo>(`/v1/tables/${selectedTableId}/owner`, {
        method: "PATCH",
        body: JSON.stringify({ data_owner_id: dataOwnerId }),
      });
      applyTableInfo(updated);
      setOwnerEditorOpen(false);
      onNotice({ tone: "success", message: "Owner atualizado com sucesso." });
    } catch (error) {
      onNotice({ tone: "error", message: (error as Error).message });
    } finally {
      setOwnerSaving(false);
    }
  }

  async function saveOwnerRecord(): Promise<void> {
    try {
      setOwnerSaving(true);
      const payload = {
        name: ownerForm.name.trim(),
        email: ownerForm.email.trim(),
        area: ownerForm.area.trim() || null,
        description: ownerForm.description.trim() || null,
        is_active: ownerForm.is_active,
      };
      if (ownerFormMode === "create") {
        const created = await apiRequest<DataOwnerItem>("/v1/data-owners", {
          method: "POST",
          body: JSON.stringify(payload),
        });
        setOwnerOptions((prev) => [...prev, created].sort((a, b) => a.name.localeCompare(b.name)));
        setOwnerFormMode("associate");
        setOwnerSearch(created.name);
        await saveOwnerAssociation(created.id);
        return;
      }
      if (ownerFormMode === "edit" && ownerForm.id !== null) {
        const updatedOwner = await apiRequest<DataOwnerItem>(`/v1/data-owners/${ownerForm.id}`, {
          method: "PUT",
          body: JSON.stringify(payload),
        });
        setOwnerOptions((prev) =>
          prev
            .map((item) => (item.id === updatedOwner.id ? { ...item, ...updatedOwner } : item))
            .sort((a, b) => a.name.localeCompare(b.name)),
        );
        if (tableDataOwnerId === updatedOwner.id) {
          setOwner(updatedOwner.name);
          setOwnerEmail(updatedOwner.email);
          setOwnerArea(updatedOwner.area ?? null);
        }
        setOwnerFormMode("associate");
        onNotice({ tone: "success", message: "Cadastro do responsável atualizado com sucesso." });
      }
    } catch (error) {
      onNotice({ tone: "error", message: (error as Error).message });
    } finally {
      setOwnerSaving(false);
    }
  }

  async function deleteOwnerRecord(): Promise<void> {
    if (ownerForm.id === null) return;
    try {
      setOwnerSaving(true);
      await apiRequest(`/v1/data-owners/${ownerForm.id}`, { method: "DELETE" });
      setOwnerOptions((prev) => prev.filter((item) => item.id !== ownerForm.id));
      if (tableDataOwnerId === ownerForm.id) {
        await saveOwnerAssociation(null);
      } else {
        setOwnerFormMode("associate");
        onNotice({ tone: "success", message: "Owner removido com sucesso." });
      }
    } catch (error) {
      onNotice({ tone: "error", message: (error as Error).message });
    } finally {
      setOwnerSaving(false);
    }
  }

  return {
    applyTableInfo,
    beginCreateOwner,
    beginEditOwner,
    deleteOwnerRecord,
    filteredOwnerOptions,
    owner,
    ownerArea,
    ownerEditorOpen,
    ownerEmail,
    ownerForm,
    ownerFormMode,
    ownerOptions,
    ownerSaving,
    ownerSearch,
    pendingOwnerId,
    resetOwnerState,
    saveOwnerAssociation,
    saveOwnerRecord,
    setOwnerEditorOpen,
    setOwnerForm,
    setOwnerFormMode,
    setOwnerSearch,
    setPendingOwnerId,
    tableDataOwnerId,
  };
}
