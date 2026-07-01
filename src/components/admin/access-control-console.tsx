import { FormEvent, useEffect, useMemo, useState } from "react";
import { Pencil, Plus, Trash2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { Input } from "@/components/ui/input";
import { DataScopeGrantEditor } from "@/components/admin/data-scope-grant-editor";
import { apiRequest } from "@/lib/client-api";
import { normalizePageItems, type PageResponse } from "@/lib/pagination";
import {
  AccessGroupSummary,
  AccessTargetOptions,
  DataScopeGrantDraft,
} from "@/features/admin/access-control-types";

type UserRef = {
  id: number;
  email: string;
  name: string | null;
  full_name: string | null;
  is_active: boolean;
};

type AccessGrantOut = DataScopeGrantDraft & {
  id: number;
  scope_kind: string;
  datasource_name: string | null;
  schema_name: string | null;
  table_name: string | null;
  datasource_fqn: string | null;
  table_fqn: string | null;
  created_at: string;
  updated_at: string;
};

type AccessGroupOut = AccessGroupSummary & {
  members: UserRef[];
  grants: AccessGrantOut[];
  created_at: string;
  updated_at: string;
};

type AccessGroupForm = {
  name: string;
  description: string;
  is_active: boolean;
  member_user_ids: number[];
  grants: DataScopeGrantDraft[];
};

const emptyGroupForm: AccessGroupForm = {
  name: "",
  description: "",
  is_active: true,
  member_user_ids: [],
  grants: [],
};

export function AccessControlConsole() {
  const [groups, setGroups] = useState<AccessGroupOut[]>([]);
  const [users, setUsers] = useState<UserRef[]>([]);
  const [targets, setTargets] = useState<AccessTargetOptions | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [toast, setToast] = useState("");
  const [search, setSearch] = useState("");
  const [saving, setSaving] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [form, setForm] = useState<AccessGroupForm>(emptyGroupForm);
  const [memberSearch, setMemberSearch] = useState("");

  async function loadAll() {
    setLoading(true);
    setError("");
    try {
      const [groupsResult, usersResult, targetsResult] = await Promise.allSettled([
        apiRequest<AccessGroupOut[]>("/v1/admin/access/groups"),
        apiRequest<UserRef[] | PageResponse<UserRef>>("/v1/admin/users"),
        apiRequest<AccessTargetOptions>("/v1/admin/access/targets"),
      ]);

      const loadErrors = [
        groupsResult.status === "rejected" ? (groupsResult.reason as Error).message : "",
        usersResult.status === "rejected" ? (usersResult.reason as Error).message : "",
        targetsResult.status === "rejected" ? (targetsResult.reason as Error).message : "",
      ].filter(Boolean);

      if (groupsResult.status === "fulfilled") setGroups(groupsResult.value);
      if (usersResult.status === "fulfilled") setUsers(normalizePageItems(usersResult.value));
      if (targetsResult.status === "fulfilled") setTargets(targetsResult.value);
      if (loadErrors.length > 0) {
        setError(loadErrors.join(" · "));
      }
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadAll();
  }, []);

  const filteredGroups = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return groups;
    return groups.filter((group) => [group.name, group.description ?? ""].join(" ").toLowerCase().includes(q));
  }, [groups, search]);

  function openCreate() {
    setEditingId(null);
    setForm(emptyGroupForm);
    setMemberSearch("");
    setModalOpen(true);
  }

  function openEdit(group: AccessGroupOut) {
    setEditingId(group.id);
    setForm({
      name: group.name,
      description: group.description ?? "",
      is_active: group.is_active,
      member_user_ids: group.members.map((member) => member.id),
      grants: group.grants.map((grant) => ({
        effect: grant.effect,
        datasource_id: grant.datasource_id,
        schema_id: grant.schema_id,
        table_id: grant.table_id,
        note: grant.note,
      })),
    });
    setMemberSearch("");
    setModalOpen(true);
  }

  function toggleMember(userId: number) {
    setForm((current) => ({
      ...current,
      member_user_ids: current.member_user_ids.includes(userId)
        ? current.member_user_ids.filter((item) => item !== userId)
        : [...current.member_user_ids, userId],
    }));
  }

  async function saveGroup(event: FormEvent) {
    event.preventDefault();
    setSaving(true);
    try {
      const payload = {
        name: form.name,
        description: form.description || null,
        is_active: form.is_active,
        member_user_ids: form.member_user_ids,
        grants: form.grants,
      };
      if (editingId) {
        await apiRequest<AccessGroupOut>(`/v1/admin/access/groups/${editingId}`, { method: "PUT", body: JSON.stringify(payload) });
        setToast("Grupo atualizado.");
      } else {
        await apiRequest<AccessGroupOut>("/v1/admin/access/groups", { method: "POST", body: JSON.stringify(payload) });
        setToast("Grupo criado.");
      }
      setModalOpen(false);
      await loadAll();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setSaving(false);
    }
  }

  async function deleteGroup(group: AccessGroupOut) {
    if (!window.confirm(`Excluir grupo ${group.name}?`)) return;
    try {
      await apiRequest<void>(`/v1/admin/access/groups/${group.id}`, { method: "DELETE" });
      setToast("Grupo excluído.");
      await loadAll();
    } catch (e) {
      setError((e as Error).message);
    }
  }

  const visibleMembers = useMemo(() => {
    const q = memberSearch.trim().toLowerCase();
    if (!q) return users;
    return users.filter((user) => [user.email, user.name ?? "", user.full_name ?? ""].join(" ").toLowerCase().includes(q));
  }, [memberSearch, users]);

  if (error && !groups.length && !loading) {
    return <EmptyState title="Falha ao carregar" description={error} />;
  }

  return (
    <div className="space-y-4">
      {error ? <p className="rounded-md border border-danger-200 bg-danger-50 px-3 py-2 text-sm text-danger-700">{error}</p> : null}
      {toast ? <p className="rounded-md border border-success-200 bg-success-50 px-3 py-2 text-sm text-success-700">{toast}</p> : null}

      <Card>
        <CardHeader className="flex flex-row items-center justify-between text-sm font-semibold">
          Escopos de acesso
          <Button onClick={openCreate}>
            <Plus className="mr-2 h-4 w-4" />
            Novo grupo
          </Button>
        </CardHeader>
        <CardContent className="space-y-3">
          <Input onChange={(event) => setSearch(event.target.value)} placeholder="Buscar grupo..." value={search} />
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead className="bg-bg-subtle text-left text-xs uppercase tracking-wide text-muted">
                <tr>
                  <th className="px-3 py-2">Grupo</th>
                  <th className="px-3 py-2">Descrição</th>
                  <th className="px-3 py-2">Usuários</th>
                  <th className="px-3 py-2">Escopos</th>
                  <th className="px-3 py-2">Status</th>
                  <th className="px-3 py-2">Ações</th>
                </tr>
              </thead>
              <tbody>
                {(loading ? [] : filteredGroups).map((group) => (
                  <tr className="border-t border-border" key={group.id}>
                    <td className="px-3 py-2">{group.name}</td>
                    <td className="px-3 py-2">{group.description || "-"}</td>
                    <td className="px-3 py-2">{group.members.length}</td>
                    <td className="px-3 py-2">{group.grants.length}</td>
                    <td className="px-3 py-2">{group.is_active ? "Ativo" : "Inativo"}</td>
                    <td className="px-3 py-2">
                      <div className="flex gap-2">
                        <Button onClick={() => openEdit(group)} size="sm" variant="outline">
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button onClick={() => void deleteGroup(group)} size="sm" variant="outline">
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {!loading && !error && filteredGroups.length === 0 ? <p className="p-3 text-sm text-muted">Sem grupos.</p> : null}
            {loading ? <p className="p-3 text-sm text-muted">Carregando...</p> : null}
          </div>
        </CardContent>
      </Card>

      {modalOpen ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/55 p-4 backdrop-blur-md">
          <div className="max-h-[90vh] w-full max-w-4xl overflow-hidden rounded-[28px] border border-border/80 bg-surface shadow-card">
            <form className="flex max-h-[90vh] flex-col" onSubmit={saveGroup}>
              <div className="border-b border-border/60 px-6 py-4">
                <h3 className="text-lg font-semibold">{editingId ? "Editar grupo" : "Novo grupo"}</h3>
                <p className="text-sm text-muted">Defina membros, escopos e exceções do grupo.</p>
              </div>
              <div className="grid gap-4 overflow-y-auto px-6 py-5 lg:grid-cols-[1.1fr_0.9fr]">
                <div className="space-y-3">
                  <Input onChange={(event) => setForm((current) => ({ ...current, name: event.target.value }))} placeholder="Nome do grupo" required value={form.name} />
                  <Input onChange={(event) => setForm((current) => ({ ...current, description: event.target.value }))} placeholder="Descrição" value={form.description} />
                  <label className="flex items-center gap-2 text-sm">
                    <input
                      checked={form.is_active}
                      onChange={(event) => setForm((current) => ({ ...current, is_active: event.target.checked }))}
                      type="checkbox"
                    />
                    Ativo
                  </label>
                  <div className="rounded-2xl border border-border/80 bg-bg-subtle/80 p-4 shadow-sm">
                    <p className="mb-3 text-sm font-semibold text-text">Membros do grupo</p>
                    <Input onChange={(event) => setMemberSearch(event.target.value)} placeholder="Buscar usuário..." value={memberSearch} />
                    <div className="mt-3 max-h-72 overflow-y-auto space-y-2">
                      {visibleMembers.map((user) => {
                        const active = form.member_user_ids.includes(user.id);
                        return (
                          <label className="flex items-center gap-2 rounded-2xl border border-border/80 bg-surface px-3 py-2 text-sm shadow-sm" key={user.id}>
                            <input checked={active} onChange={() => toggleMember(user.id)} type="checkbox" />
                            <span className="min-w-0">
                              <span className="block font-medium text-text">{user.name || user.full_name || user.email}</span>
                              <span className="block text-xs text-muted">{user.email}</span>
                            </span>
                          </label>
                        );
                      })}
                      {visibleMembers.length === 0 ? <p className="text-sm text-muted">Nenhum usuário encontrado.</p> : null}
                    </div>
                  </div>
                </div>
                <div className="space-y-3">
                  <DataScopeGrantEditor
                    disabled={false}
                    targets={targets}
                    value={form.grants}
                    onChange={(grants) => setForm((current) => ({ ...current, grants }))}
                  />
                </div>
              </div>
              <div className="flex justify-end gap-2 border-t border-border/60 px-6 py-4">
                <Button onClick={() => setModalOpen(false)} type="button" variant="outline">
                  Cancelar
                </Button>
                <Button disabled={saving} type="submit">
                  {saving ? "Salvando..." : "Salvar"}
                </Button>
              </div>
            </form>
          </div>
        </div>
      ) : null}
    </div>
  );
}
