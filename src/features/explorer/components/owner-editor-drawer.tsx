import type { Dispatch, SetStateAction } from "react";
import { Pencil, X } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/cn";
import { useModalDismiss } from "@/lib/use-modal-dismiss";

import type { DataOwnerItem, NoticeState, OwnerForm } from "../types";

type ExplorerOwnerEditorDrawerProps = {
  beginCreateOwner: () => void;
  beginEditOwner: (ownerId: number | null) => void;
  canEdit: boolean;
  canManageOwners: boolean;
  notice: NoticeState;
  onClose: () => void;
  onDeleteOwnerRecord: () => void;
  onSaveOwnerAssociation: () => void;
  onSaveOwnerRecord: () => void;
  open: boolean;
  ownerForm: OwnerForm;
  ownerFormMode: "associate" | "create" | "edit";
  ownerSaving: boolean;
  pendingOwnerId: number | null;
  selectedTableFullName: string;
  setOwnerForm: Dispatch<SetStateAction<OwnerForm>>;
  setOwnerFormMode: (mode: "associate" | "create" | "edit") => void;
  setOwnerSearch: (value: string) => void;
  setPendingOwnerId: (id: number | null) => void;
  tableDataOwnerId: number | null;
  filteredOwnerOptions: DataOwnerItem[];
  ownerSearch: string;
};

export function ExplorerOwnerEditorDrawer({
  beginCreateOwner,
  beginEditOwner,
  canEdit,
  canManageOwners,
  filteredOwnerOptions,
  notice,
  onClose,
  onDeleteOwnerRecord,
  onSaveOwnerAssociation,
  onSaveOwnerRecord,
  open,
  ownerForm,
  ownerFormMode,
  ownerSaving,
  ownerSearch,
  pendingOwnerId,
  selectedTableFullName,
  setOwnerForm,
  setOwnerFormMode,
  setOwnerSearch,
  setPendingOwnerId,
  tableDataOwnerId,
}: ExplorerOwnerEditorDrawerProps) {
  useModalDismiss({ open, onClose });
  if (!open || !canEdit) return null;

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-slate-950/50 backdrop-blur-md">
      <div
        aria-label="Editor de responsável pelos dados"
        aria-modal="true"
        className="h-[100dvh] w-full border-l border-border/70 bg-surface shadow-card md:w-[720px] lg:w-[860px]"
        role="dialog"
      >
        <div className="flex h-full flex-col">
          <div className="sticky top-0 z-10 flex items-center justify-between border-b border-border/70 bg-[linear-gradient(135deg,#ffffff_0%,#f8fafc_58%,#eef6ff_100%)] px-5 py-4 backdrop-blur">
            <div>
              <p className="text-sm font-semibold tracking-[-0.01em] text-text">Responsável pelos dados</p>
              <p className="text-xs text-muted">{selectedTableFullName || "Tabela selecionada"}</p>
            </div>
            <Button aria-label="Fechar" onClick={onClose} size="sm" variant="ghost">
              <X className="h-4 w-4" />
            </Button>
          </div>

          <div className="flex-1 overflow-y-auto p-5">
            <div className={cn("grid gap-5", canManageOwners ? "lg:grid-cols-[1.1fr_0.9fr]" : "")}>
                <Card>
                  <CardHeader>
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <h4 className="text-sm font-semibold tracking-[-0.01em] text-text">Associar responsável existente</h4>
                      <p className="mt-1 text-xs text-muted">Selecione um responsável já cadastrado para vincular a esta tabela.</p>
                    </div>
                    {canManageOwners ? (
                      <Button onClick={beginCreateOwner} size="sm" variant="outline">
                        Novo responsável
                      </Button>
                    ) : null}
                  </div>
                </CardHeader>
                <CardContent className="space-y-3">
                  <Input
                    onChange={(event) => setOwnerSearch(event.target.value)}
                    placeholder="Buscar por nome, e-mail ou área"
                    value={ownerSearch}
                  />
                  <div className="max-h-[380px] space-y-2 overflow-y-auto">
                    <button
                      className={cn(
                    "w-full rounded-2xl border px-3 py-2 text-left text-sm transition-all duration-200 ease-out",
                        pendingOwnerId === null ? "border-brand-300 bg-brand-50 text-brand-800 shadow-sm" : "border-border/80 hover:border-border-strong hover:bg-bg-subtle/70",
                      )}
                      onClick={() => setPendingOwnerId(null)}
                      type="button"
                    >
                      Sem responsável associado
                    </button>
                    {filteredOwnerOptions.map((item) => {
                      const selected = pendingOwnerId === item.id;
                      return (
                        <div
                          className={cn(
                            "rounded-2xl border px-3 py-3 transition-all duration-200 ease-out",
                            selected ? "border-brand-300 bg-brand-50 shadow-sm" : "border-border/80 bg-surface hover:border-border-strong hover:bg-bg-subtle/70",
                          )}
                          key={item.id}
                        >
                          <div className="flex items-start justify-between gap-3">
                            <div className="min-w-0">
                              <p className="truncate text-sm font-semibold text-text">{item.name}</p>
                              <p className="mt-1 text-xs text-muted">{item.email}</p>
                              <p className="mt-1 text-xs text-muted">{item.area || "Área não informada"}</p>
                            </div>
                            <div className="flex items-center gap-2">
                              {item.is_active ? <Badge tone="success">Ativo</Badge> : <Badge tone="warning">Inativo</Badge>}
                              {canManageOwners ? (
                                <Button onClick={() => beginEditOwner(item.id)} size="sm" variant="ghost">
                                  <Pencil className="h-4 w-4" />
                                </Button>
                              ) : null}
                            </div>
                          </div>
                          <div className="mt-3 flex items-center justify-between gap-3">
                            <p className="text-xs text-muted">{item.tables_count ?? 0} tabelas vinculadas</p>
                            <Button
                              disabled={ownerSaving}
                              onClick={() => setPendingOwnerId(item.id)}
                              size="sm"
                              variant={selected ? "outline" : "ghost"}
                            >
                              {selected ? "Selecionado" : "Selecionar"}
                            </Button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </CardContent>
              </Card>

              {canManageOwners ? (
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <h4 className="text-sm font-semibold text-text">
                        {ownerFormMode === "create" ? "Novo responsável" : ownerFormMode === "edit" ? "Editar responsável" : "Cadastro rápido"}
                      </h4>
                      <p className="mt-1 text-xs text-muted">
                        {ownerFormMode === "associate"
                          ? "Crie um novo responsável a partir daqui ou edite o responsável selecionado."
                          : "Use o mesmo padrão visual adotado nos demais cadastros administrativos."}
                      </p>
                    </div>
                    {ownerFormMode !== "associate" ? (
                      <Button onClick={() => setOwnerFormMode("associate")} size="sm" variant="ghost">
                        Cancelar
                      </Button>
                    ) : null}
                  </div>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div>
                    <label className="mb-1 block text-sm font-medium text-text-body">Nome</label>
                    <Input
                      onChange={(event) => setOwnerForm((prev) => ({ ...prev, name: event.target.value }))}
                      placeholder="Nome do responsável"
                      value={ownerForm.name}
                    />
                  </div>
                  <div>
                    <label className="mb-1 block text-sm font-medium text-text-body">E-mail</label>
                    <Input
                      onChange={(event) => setOwnerForm((prev) => ({ ...prev, email: event.target.value }))}
                      placeholder="responsavel@empresa.com"
                      type="email"
                      value={ownerForm.email}
                    />
                  </div>
                  <div>
                    <label className="mb-1 block text-sm font-medium text-text-body">Área / setor</label>
                    <Input
                      onChange={(event) => setOwnerForm((prev) => ({ ...prev, area: event.target.value }))}
                      placeholder="Ex.: Dados, Financeiro, Comercial"
                      value={ownerForm.area}
                    />
                  </div>
                  <div>
                    <label className="mb-1 block text-sm font-medium text-text-body">Descrição / observação</label>
                    <Textarea
                      onChange={(event) => setOwnerForm((prev) => ({ ...prev, description: event.target.value }))}
                      placeholder="Contexto adicional sobre este responsável"
                      value={ownerForm.description}
                    />
                  </div>
                  <label className="flex items-center gap-2 text-sm text-text-body">
                    <input
                      checked={ownerForm.is_active}
                      onChange={(event) => setOwnerForm((prev) => ({ ...prev, is_active: event.target.checked }))}
                      type="checkbox"
                    />
                    <span>Responsável ativo</span>
                  </label>
                </CardContent>
              </Card>
              ) : null}
            </div>
          </div>

          <div className="sticky bottom-0 flex items-center justify-between border-t border-border/70 bg-surface/95 px-5 py-4 backdrop-blur">
            <div>
              {notice ? (
                  <p className={cn("text-sm", notice.tone === "success" ? "text-success-700" : "text-danger-700")}>
                    {notice.message}
                  </p>
              ) : (
                <p className="text-sm text-muted">As alterações só são persistidas quando você usa as ações deste painel.</p>
              )}
            </div>
            <div className="flex items-center gap-2">
              {canManageOwners && ownerFormMode === "edit" && ownerForm.id !== null ? (
                <Button disabled={ownerSaving} onClick={onDeleteOwnerRecord} size="sm" variant="ghost">
                  Excluir responsável
                </Button>
              ) : null}
              {ownerFormMode === "associate" ? (
                <Button
                  disabled={ownerSaving || pendingOwnerId === tableDataOwnerId}
                  onClick={onSaveOwnerAssociation}
                  size="sm"
                >
                  {ownerSaving ? "Salvando..." : "Salvar vínculo"}
                </Button>
              ) : null}
              {canManageOwners && ownerFormMode !== "associate" ? (
                <Button disabled={ownerSaving} onClick={onSaveOwnerRecord} size="sm">
                  {ownerSaving ? "Salvando..." : ownerFormMode === "create" ? "Criar e associar" : "Salvar responsável"}
                </Button>
              ) : null}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
