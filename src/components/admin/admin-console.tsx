import { Link } from "@/lib/next-shims";
import { FormEvent, useEffect, useMemo, useState } from "react";
import { KeyRound, Pencil, Plus, ShieldCheck, Trash2 } from "lucide-react";
import { useTranslation } from "react-i18next";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { DataScopeGrantEditor } from "@/components/admin/data-scope-grant-editor";
import { useAuth } from "@/lib/auth";
import { apiRequest } from "@/lib/client-api";
import { normalizePageItems, type PageResponse } from "@/lib/pagination";
import { AccessGroupSummary, AccessTargetOptions, DataScopeGrantDraft } from "@/features/admin/access-control-types";

type Permission = {
  id: number;
  name: string;
  description: string | null;
};

type Role = {
  id: number;
  name: string;
  description: string | null;
  permissions: Permission[];
};

type UserRow = {
  id: number;
  name: string | null;
  full_name: string | null;
  email: string;
  is_active: boolean;
  mfa_enabled?: boolean;
  mfa_locked?: boolean;
  password_expired?: boolean;
  created_at: string;
  roles: Role[];
  access_group_ids?: number[];
  data_scope_grants?: DataScopeGrantDraft[];
  access_groups?: { id: number; name: string; description: string | null; is_active: boolean }[];
};

type Me = { id: number };

const emptyUserForm = {
  name: "",
  email: "",
  password: "",
  is_active: true,
  role_ids: [] as number[],
  access_group_ids: [] as number[],
  data_scope_grants: [] as DataScopeGrantDraft[],
};
const emptyRoleForm = { name: "", description: "", permission_ids: [] as number[] };
const emptyPermissionForm = { name: "", description: "" };

export function AdminOverview() {
  const { t } = useTranslation();
  return (
    <div className="grid gap-4 md:grid-cols-4">
      <Link className="rounded-2xl border border-border/80 bg-surface p-5 shadow-card transition hover:-translate-y-0.5 hover:border-border-strong hover:shadow-lg" href="/admin/users">
        <h3 className="font-semibold">{t("nav.adminUsers")}</h3>
        <p className="mt-1 text-sm text-text-body">Gerencie usuários, senha e roles.</p>
      </Link>
      <Link className="rounded-2xl border border-border/80 bg-surface p-5 shadow-card transition hover:-translate-y-0.5 hover:border-border-strong hover:shadow-lg" href="/admin/roles">
        <h3 className="font-semibold">{t("nav.adminRoles")}</h3>
        <p className="mt-1 text-sm text-text-body">Crie e mantenha perfis de acesso.</p>
      </Link>
      <Link className="rounded-2xl border border-border/80 bg-surface p-5 shadow-card transition hover:-translate-y-0.5 hover:border-border-strong hover:shadow-lg" href="/admin/permissions">
        <h3 className="font-semibold">{t("nav.adminPermissions")}</h3>
        <p className="mt-1 text-sm text-text-body">Mantenha permissões do RBAC.</p>
      </Link>
      <Link className="rounded-2xl border border-border/80 bg-surface p-5 shadow-card transition hover:-translate-y-0.5 hover:border-border-strong hover:shadow-lg" href="/admin/access">
        <h3 className="font-semibold">Escopos de dados</h3>
        <p className="mt-1 text-sm text-text-body">Grupos e concessões por fonte, schema e objeto.</p>
      </Link>
      <Link className="rounded-2xl border border-border/80 bg-surface p-5 shadow-card transition hover:-translate-y-0.5 hover:border-border-strong hover:shadow-lg" href="/admin/audit">
        <h3 className="font-semibold">Auditoria de usuários</h3>
        <p className="mt-1 text-sm text-text-body">Sessões, navegação, alterações e eventos sensíveis.</p>
      </Link>
    </div>
  );
}

export function AdminConsole({ section }: { section: "users" | "roles" | "permissions" }) {
  const { t } = useTranslation();
  const auth = useAuth();
  const canAccess = auth.canAction("read", "admin");

  const [users, setUsers] = useState<UserRow[]>([]);
  const [roles, setRoles] = useState<Role[]>([]);
  const [permissions, setPermissions] = useState<Permission[]>([]);
  const [accessGroups, setAccessGroups] = useState<AccessGroupSummary[]>([]);
  const [accessTargets, setAccessTargets] = useState<AccessTargetOptions | null>(null);
  const [me, setMe] = useState<Me | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [toast, setToast] = useState("");
  const [search, setSearch] = useState("");
  const [saving, setSaving] = useState(false);

  const [userModalOpen, setUserModalOpen] = useState(false);
  const [roleModalOpen, setRoleModalOpen] = useState(false);
  const [permissionModalOpen, setPermissionModalOpen] = useState(false);

  const [userEditingId, setUserEditingId] = useState<number | null>(null);
  const [roleEditingId, setRoleEditingId] = useState<number | null>(null);
  const [permissionEditingId, setPermissionEditingId] = useState<number | null>(null);

  const [userForm, setUserForm] = useState(emptyUserForm);
  const [roleForm, setRoleForm] = useState(emptyRoleForm);
  const [permissionForm, setPermissionForm] = useState(emptyPermissionForm);

  async function loadAll() {
    if (!canAccess) return;
    setLoading(true);
    setError("");
      try {
      const meData = await apiRequest<Me>("/v1/me");
      setMe(meData);

      if (section === "users") {
        const [usersResult, rolesResult, accessGroupsResult, accessTargetsResult] = await Promise.allSettled([
          apiRequest<UserRow[] | PageResponse<UserRow>>("/v1/admin/users"),
          apiRequest<Role[] | PageResponse<Role>>("/v1/admin/roles"),
          apiRequest<AccessGroupSummary[]>("/v1/admin/access/groups"),
          apiRequest<AccessTargetOptions>("/v1/admin/access/targets"),
        ]);

        const loadErrors = [
          usersResult.status === "rejected" ? (usersResult.reason as Error).message : "",
          rolesResult.status === "rejected" ? (rolesResult.reason as Error).message : "",
          accessGroupsResult.status === "rejected" ? (accessGroupsResult.reason as Error).message : "",
          accessTargetsResult.status === "rejected" ? (accessTargetsResult.reason as Error).message : "",
        ].filter(Boolean);

        if (usersResult.status === "fulfilled") setUsers(normalizePageItems(usersResult.value));
        if (rolesResult.status === "fulfilled") setRoles(normalizePageItems(rolesResult.value));
        if (accessGroupsResult.status === "fulfilled") setAccessGroups(accessGroupsResult.value);
        if (accessTargetsResult.status === "fulfilled") setAccessTargets(accessTargetsResult.value);

        if (loadErrors.length > 0) {
          setError(loadErrors.join(" · "));
        }
      } else if (section === "roles") {
        const [rolesResult, permissionsResult, usersResult] = await Promise.allSettled([
          apiRequest<Role[] | PageResponse<Role>>("/v1/admin/roles"),
          apiRequest<Permission[] | PageResponse<Permission>>("/v1/admin/permissions"),
          apiRequest<UserRow[] | PageResponse<UserRow>>("/v1/admin/users"),
        ]);

        const loadErrors = [
          rolesResult.status === "rejected" ? (rolesResult.reason as Error).message : "",
          permissionsResult.status === "rejected" ? (permissionsResult.reason as Error).message : "",
          usersResult.status === "rejected" ? (usersResult.reason as Error).message : "",
        ].filter(Boolean);

        if (rolesResult.status === "fulfilled") setRoles(normalizePageItems(rolesResult.value));
        if (permissionsResult.status === "fulfilled") setPermissions(normalizePageItems(permissionsResult.value));
        if (usersResult.status === "fulfilled") setUsers(normalizePageItems(usersResult.value));
        if (loadErrors.length > 0) {
          setError(loadErrors.join(" · "));
        }
      } else {
        try {
          const permissionsResult = await apiRequest<Permission[] | PageResponse<Permission>>("/v1/admin/permissions");
          setPermissions(normalizePageItems(permissionsResult));
        } catch (permissionError) {
          setError((permissionError as Error).message);
        }
      }
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadAll();
  }, [canAccess, section]);

  const filteredUsers = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return users;
    return users.filter((u) => [u.name ?? "", u.full_name ?? "", u.email].join(" ").toLowerCase().includes(q));
  }, [users, search]);

  const filteredRoles = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return roles;
    return roles.filter((r) => [r.name, r.description ?? ""].join(" ").toLowerCase().includes(q));
  }, [roles, search]);

  const filteredPermissions = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return permissions;
    return permissions.filter((p) => [p.name, p.description ?? ""].join(" ").toLowerCase().includes(q));
  }, [permissions, search]);

  function toggleRole(roleId: number) {
    setUserForm((prev) => ({
      ...prev,
      role_ids: prev.role_ids.includes(roleId) ? prev.role_ids.filter((id) => id !== roleId) : [...prev.role_ids, roleId],
    }));
  }

  function togglePermission(permissionId: number) {
    setRoleForm((prev) => ({
      ...prev,
      permission_ids: prev.permission_ids.includes(permissionId)
        ? prev.permission_ids.filter((id) => id !== permissionId)
        : [...prev.permission_ids, permissionId],
    }));
  }

  function toggleAccessGroup(groupId: number) {
    setUserForm((prev) => ({
      ...prev,
      access_group_ids: prev.access_group_ids.includes(groupId)
        ? prev.access_group_ids.filter((id) => id !== groupId)
        : [...prev.access_group_ids, groupId],
    }));
  }

  function openCreateUser() {
    setUserEditingId(null);
    setUserForm(emptyUserForm);
    setUserModalOpen(true);
  }

  function openEditUser(user: UserRow) {
    setUserEditingId(user.id);
    setUserForm({
      name: user.name ?? user.full_name ?? "",
      email: user.email,
      password: "",
      is_active: user.is_active,
      role_ids: user.roles.map((r) => r.id),
      access_group_ids: user.access_group_ids ?? user.access_groups?.map((group) => group.id) ?? [],
      data_scope_grants: user.data_scope_grants ?? [],
    });
    setUserModalOpen(true);
  }

  async function saveUser(event: FormEvent) {
    event.preventDefault();
    setSaving(true);
    try {
      const payload: Record<string, unknown> = {
        name: userForm.name || null,
        email: userForm.email,
        is_active: userForm.is_active,
        role_ids: userForm.role_ids,
        access_group_ids: userForm.access_group_ids,
        data_scope_grants: userForm.data_scope_grants,
      };
      if (!userEditingId || userForm.password) payload.password = userForm.password;

      if (userEditingId) {
        await apiRequest<UserRow>(`/v1/admin/users/${userEditingId}`, { method: "PUT", body: JSON.stringify(payload) });
        setToast("Usuário atualizado.");
      } else {
        await apiRequest<UserRow>("/v1/admin/users", { method: "POST", body: JSON.stringify(payload) });
        setToast("Usuário criado.");
      }
      setUserModalOpen(false);
      await loadAll();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setSaving(false);
    }
  }

  async function deleteUser(user: UserRow) {
    if (user.id === me?.id) {
      const typed = window.prompt("Confirme digitando EXCLUIR para remover seu próprio usuário:");
      if (typed !== "EXCLUIR") return;
    } else if (!window.confirm(`Excluir usuário ${user.email}?`)) {
      return;
    }
    try {
      await apiRequest<void>(`/v1/admin/users/${user.id}`, { method: "DELETE" });
      setToast("Usuário excluído.");
      await loadAll();
    } catch (e) {
      setError((e as Error).message);
    }
  }

  async function unlockUserMfa(user: UserRow) {
    if (!window.confirm(`Desbloquear o MFA de ${user.email}? O período de carência será reiniciado.`)) return;
    try {
      await apiRequest<UserRow>(`/v1/admin/users/${user.id}/mfa/unlock`, { method: "POST" });
      setToast("Usuário desbloqueado. Carência de MFA reiniciada.");
      await loadAll();
    } catch (e) {
      setError((e as Error).message);
    }
  }

  async function unlockUserPassword(user: UserRow) {
    if (!window.confirm(`Liberar o acesso de ${user.email} por senha expirada? O prazo de 90 dias será reiniciado.`)) return;
    try {
      await apiRequest<UserRow>(`/v1/admin/users/${user.id}/password/unlock`, { method: "POST" });
      setToast("Acesso liberado. Prazo de senha reiniciado.");
      await loadAll();
    } catch (e) {
      setError((e as Error).message);
    }
  }

  function openCreateRole() {
    setRoleEditingId(null);
    setRoleForm(emptyRoleForm);
    setRoleModalOpen(true);
  }

  function openEditRole(role: Role) {
    setRoleEditingId(role.id);
    setRoleForm({
      name: role.name,
      description: role.description ?? "",
      permission_ids: role.permissions.map((p) => p.id),
    });
    setRoleModalOpen(true);
  }

  async function saveRole(event: FormEvent) {
    event.preventDefault();
    setSaving(true);
    try {
      const payload = { name: roleForm.name, description: roleForm.description || null, permission_ids: roleForm.permission_ids };
      if (roleEditingId) {
        await apiRequest<Role>(`/v1/admin/roles/${roleEditingId}`, { method: "PUT", body: JSON.stringify(payload) });
        setToast("Role atualizada.");
      } else {
        await apiRequest<Role>("/v1/admin/roles", { method: "POST", body: JSON.stringify(payload) });
        setToast("Role criada.");
      }
      setRoleModalOpen(false);
      await loadAll();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setSaving(false);
    }
  }

  async function deleteRole(role: Role) {
    if (!window.confirm(`Excluir role ${role.name}?`)) return;
    try {
      await apiRequest<void>(`/v1/admin/roles/${role.id}`, { method: "DELETE" });
      setToast("Role excluída.");
      await loadAll();
    } catch (e) {
      setError((e as Error).message);
    }
  }

  function openCreatePermission() {
    setPermissionEditingId(null);
    setPermissionForm(emptyPermissionForm);
    setPermissionModalOpen(true);
  }

  function openEditPermission(permission: Permission) {
    setPermissionEditingId(permission.id);
    setPermissionForm({ name: permission.name, description: permission.description ?? "" });
    setPermissionModalOpen(true);
  }

  async function savePermission(event: FormEvent) {
    event.preventDefault();
    setSaving(true);
    try {
      const payload = { name: permissionForm.name, description: permissionForm.description || null };
      if (permissionEditingId) {
        await apiRequest<Permission>(`/v1/admin/permissions/${permissionEditingId}`, {
          method: "PUT",
          body: JSON.stringify(payload),
        });
        setToast("Permissão atualizada.");
      } else {
        await apiRequest<Permission>("/v1/admin/permissions", { method: "POST", body: JSON.stringify(payload) });
        setToast("Permissão criada.");
      }
      setPermissionModalOpen(false);
      await loadAll();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setSaving(false);
    }
  }

  async function deletePermission(permission: Permission) {
    if (!window.confirm(`Excluir permissão ${permission.name}?`)) return;
    try {
      await apiRequest<void>(`/v1/admin/permissions/${permission.id}`, { method: "DELETE" });
      setToast("Permissão excluída.");
      await loadAll();
    } catch (e) {
      setError((e as Error).message);
    }
  }

  function userCountForRole(roleId: number): number {
    return users.filter((user) => user.roles.some((r) => r.id === roleId)).length;
  }

  if (!canAccess) return <EmptyState title="403" description="Você não possui acesso administrativo." />;

  return (
    <div className="space-y-4">
      {error ? <p className="rounded-2xl border border-danger-200 bg-danger-50 px-3 py-2 text-sm text-danger-700">{error}</p> : null}
      {toast ? <p className="rounded-2xl border border-success-200 bg-success-50 px-3 py-2 text-sm text-success-700">{toast}</p> : null}

      {section === "users" ? (
        <Card className="border-border/80 bg-surface shadow-card">
          <CardHeader className="flex flex-row items-center justify-between border-b border-border/70 bg-[linear-gradient(135deg,#ffffff_0%,#f8fafc_58%,#eef6ff_100%)] text-sm font-semibold">
            {t("nav.adminUsers")}
            <Button onClick={openCreateUser}>
              <Plus className="mr-2 h-4 w-4" />
              Criar usuário
            </Button>
          </CardHeader>
          <CardContent className="space-y-3">
            <Input onChange={(e) => setSearch(e.target.value)} placeholder="Buscar usuário..." value={search} />
            <div className="overflow-hidden rounded-2xl border border-border/80">
              <table className="min-w-full text-sm">
                <thead className="bg-bg-subtle/80 text-left text-xs uppercase tracking-wide text-muted">
                  <tr>
                    <th className="px-4 py-3">Nome</th>
                    <th className="px-4 py-3">Email</th>
                    <th className="px-4 py-3">Status</th>
                    <th className="px-4 py-3">Roles</th>
                    <th className="px-4 py-3">Criado em</th>
                    <th className="px-4 py-3">Ações</th>
                  </tr>
                </thead>
                <tbody>
                  {(loading ? [] : filteredUsers).map((user) => (
                    <tr className="border-t border-border/60 transition hover:bg-bg-subtle/70" key={user.id}>
                      <td className="px-4 py-3">{user.name ?? user.full_name ?? "-"}</td>
                      <td className="px-4 py-3">{user.email}</td>
                      <td className="px-4 py-3">
                        <div className="flex flex-wrap gap-1.5">
                          {user.is_active ? <Badge tone="success">Ativo</Badge> : <Badge tone="warning">Inativo</Badge>}
                          {user.mfa_locked ? <Badge tone="danger">Bloqueado (MFA)</Badge> : user.mfa_enabled ? <Badge tone="neutral">MFA ativo</Badge> : null}
                          {user.password_expired ? <Badge tone="danger">Senha expirada</Badge> : null}
                        </div>
                      </td>
                      <td className="px-4 py-3">{user.roles.map((r) => r.name).join(", ") || "-"}</td>
                      <td className="px-4 py-3">{new Date(user.created_at).toLocaleString()}</td>
                      <td className="px-4 py-3">
                        <div className="flex gap-2">
                          {user.mfa_locked ? (
                            <Button onClick={() => void unlockUserMfa(user)} size="sm" variant="outline" title="Desbloquear MFA">
                              <ShieldCheck className="h-4 w-4" />
                            </Button>
                          ) : null}
                          {user.password_expired ? (
                            <Button onClick={() => void unlockUserPassword(user)} size="sm" variant="outline" title="Liberar senha expirada">
                              <KeyRound className="h-4 w-4" />
                            </Button>
                          ) : null}
                          <Button onClick={() => openEditUser(user)} size="sm" variant="outline">
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button onClick={() => void deleteUser(user)} size="sm" variant="outline">
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {!loading && !error && filteredUsers.length === 0 ? <p className="p-3 text-sm text-muted">Sem usuários.</p> : null}
              {loading ? <p className="p-3 text-sm text-muted">Carregando...</p> : null}
            </div>
          </CardContent>
        </Card>
      ) : null}

      {section === "roles" ? (
        <Card className="border-border/80 bg-surface shadow-card">
          <CardHeader className="flex flex-row items-center justify-between border-b border-border/70 bg-[linear-gradient(135deg,#ffffff_0%,#f8fafc_58%,#eef6ff_100%)] text-sm font-semibold">
            {t("nav.adminRoles")}
            <Button onClick={openCreateRole}>
              <Plus className="mr-2 h-4 w-4" />
              Criar role
            </Button>
          </CardHeader>
          <CardContent className="space-y-3">
            <Input onChange={(e) => setSearch(e.target.value)} placeholder="Buscar role..." value={search} />
            <div className="overflow-hidden rounded-2xl border border-border/80">
              <table className="min-w-full text-sm">
                <thead className="bg-bg-subtle/80 text-left text-xs uppercase tracking-wide text-muted">
                  <tr>
                    <th className="px-4 py-3">Role</th>
                    <th className="px-4 py-3">Descrição</th>
                    <th className="px-4 py-3">Usuários</th>
                    <th className="px-4 py-3">Permissões</th>
                    <th className="px-4 py-3">Ações</th>
                  </tr>
                </thead>
                <tbody>
                  {(loading ? [] : filteredRoles).map((role) => (
                    <tr className="border-t border-border/60 transition hover:bg-bg-subtle/70" key={role.id}>
                      <td className="px-4 py-3">{role.name}</td>
                      <td className="px-4 py-3">{role.description ?? "-"}</td>
                      <td className="px-4 py-3">{userCountForRole(role.id)}</td>
                      <td className="px-4 py-3">{role.permissions.map((p) => p.name).join(", ") || "-"}</td>
                      <td className="px-4 py-3">
                        <div className="flex gap-2">
                          <Button onClick={() => openEditRole(role)} size="sm" variant="outline">
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button onClick={() => void deleteRole(role)} size="sm" variant="outline">
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {!loading && !error && filteredRoles.length === 0 ? <p className="p-3 text-sm text-muted">Sem roles.</p> : null}
              {loading ? <p className="p-3 text-sm text-muted">Carregando...</p> : null}
            </div>
          </CardContent>
        </Card>
      ) : null}

      {section === "permissions" ? (
        <Card className="border-border/80 bg-surface shadow-card">
          <CardHeader className="flex flex-row items-center justify-between border-b border-border/70 bg-[linear-gradient(135deg,#ffffff_0%,#f8fafc_58%,#eef6ff_100%)] text-sm font-semibold">
            {t("nav.adminPermissions")}
            <Button onClick={openCreatePermission}>
              <Plus className="mr-2 h-4 w-4" />
              Criar permissão
            </Button>
          </CardHeader>
          <CardContent className="space-y-3">
            <Input onChange={(e) => setSearch(e.target.value)} placeholder="Buscar permissão..." value={search} />
            <div className="overflow-hidden rounded-2xl border border-border/80">
              <table className="min-w-full text-sm">
                <thead className="bg-bg-subtle/80 text-left text-xs uppercase tracking-wide text-muted">
                  <tr>
                    <th className="px-4 py-3">Permissão</th>
                    <th className="px-4 py-3">Descrição</th>
                    <th className="px-4 py-3">Ações</th>
                  </tr>
                </thead>
                <tbody>
                  {(loading ? [] : filteredPermissions).map((permission) => (
                    <tr className="border-t border-border/60 transition hover:bg-bg-subtle/70" key={permission.id}>
                      <td className="px-4 py-3">{permission.name}</td>
                      <td className="px-4 py-3">{permission.description ?? "-"}</td>
                      <td className="px-4 py-3">
                        <div className="flex gap-2">
                          <Button onClick={() => openEditPermission(permission)} size="sm" variant="outline">
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button onClick={() => void deletePermission(permission)} size="sm" variant="outline">
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {!loading && !error && filteredPermissions.length === 0 ? <p className="p-3 text-sm text-muted">Sem permissões.</p> : null}
              {loading ? <p className="p-3 text-sm text-muted">Carregando...</p> : null}
            </div>
          </CardContent>
        </Card>
      ) : null}

      {userModalOpen ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/55 p-4 backdrop-blur-md">
          <div className="w-full max-w-2xl rounded-[28px] border border-border/80 bg-surface p-6 shadow-card">
            <form className="space-y-3" onSubmit={saveUser}>
              <h3 className="text-lg font-semibold">{userEditingId ? "Editar usuário" : "Criar usuário"}</h3>
              <Input
                onChange={(e) => setUserForm((prev) => ({ ...prev, name: e.target.value }))}
                placeholder="Nome"
                required
                value={userForm.name}
              />
              <Input
                onChange={(e) => setUserForm((prev) => ({ ...prev, email: e.target.value }))}
                placeholder="Email"
                required
                type="email"
                value={userForm.email}
              />
              <Input
                onChange={(e) => setUserForm((prev) => ({ ...prev, password: e.target.value }))}
                placeholder={userEditingId ? "Nova senha (opcional)" : "Senha"}
                required={!userEditingId}
                type="password"
                value={userForm.password}
              />
              <label className="flex items-center gap-2 text-sm">
                <input
                  checked={userForm.is_active}
                  onChange={(e) => setUserForm((prev) => ({ ...prev, is_active: e.target.checked }))}
                  type="checkbox"
                />
                Ativo
              </label>
              <div className="rounded-2xl border border-border/80 bg-bg-subtle/80 p-3 shadow-sm">
                <p className="mb-2 text-sm font-medium">Roles</p>
                <div className="flex flex-wrap gap-2">
                  {roles.map((role) => (
                    <label className="inline-flex items-center gap-1 text-sm" key={role.id}>
                      <input
                        checked={userForm.role_ids.includes(role.id)}
                        onChange={() => toggleRole(role.id)}
                        type="checkbox"
                      />
                      {role.name}
                    </label>
                  ))}
                </div>
              </div>
              <div className="rounded-2xl border border-border/80 bg-bg-subtle/80 p-3 shadow-sm">
                <p className="mb-2 text-sm font-medium">Grupos de acesso</p>
                <div className="max-h-44 overflow-y-auto space-y-2">
                  {accessGroups.map((group) => {
                    const active = userForm.access_group_ids.includes(group.id);
                    return (
                      <label className="flex items-center gap-2 rounded-2xl border border-border/80 bg-surface px-3 py-2 text-sm" key={group.id}>
                        <input checked={active} onChange={() => toggleAccessGroup(group.id)} type="checkbox" />
                        <span className="min-w-0">
                          <span className="block font-medium text-text">{group.name}</span>
                          <span className="block text-xs text-muted">{group.description || "Sem descrição"}</span>
                        </span>
                      </label>
                    );
                  })}
                  {accessGroups.length === 0 ? <p className="text-sm text-muted">Sem grupos cadastrados.</p> : null}
                </div>
              </div>
              <DataScopeGrantEditor
                emptyLabel="Nenhum escopo direto configurado para este usuário."
                targets={accessTargets}
                title="Escopos de dados do usuário"
                value={userForm.data_scope_grants}
                onChange={(grants) => setUserForm((prev) => ({ ...prev, data_scope_grants: grants }))}
              />
              <div className="flex justify-end gap-2 pt-2">
                <Button onClick={() => setUserModalOpen(false)} type="button" variant="outline">
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

      {roleModalOpen ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/55 p-4 backdrop-blur-md">
          <div className="w-full max-w-2xl rounded-[28px] border border-border/80 bg-surface p-6 shadow-card">
            <form className="space-y-3" onSubmit={saveRole}>
              <h3 className="text-lg font-semibold">{roleEditingId ? "Editar role" : "Criar role"}</h3>
              <Input
                onChange={(e) => setRoleForm((prev) => ({ ...prev, name: e.target.value }))}
                placeholder="Nome da role"
                required
                value={roleForm.name}
              />
              <Input
                onChange={(e) => setRoleForm((prev) => ({ ...prev, description: e.target.value }))}
                placeholder="Descrição"
                value={roleForm.description}
              />
              <div className="rounded-2xl border border-border/80 bg-bg-subtle/80 p-3 shadow-sm">
                <p className="mb-2 text-sm font-medium">Permissões</p>
                <div className="flex flex-wrap gap-2">
                  {permissions.map((permission) => (
                    <label className="inline-flex items-center gap-1 text-sm" key={permission.id}>
                      <input
                        checked={roleForm.permission_ids.includes(permission.id)}
                        onChange={() => togglePermission(permission.id)}
                        type="checkbox"
                      />
                      {permission.name}
                    </label>
                  ))}
                </div>
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <Button onClick={() => setRoleModalOpen(false)} type="button" variant="outline">
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

      {permissionModalOpen ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/55 p-4 backdrop-blur-md">
          <div className="w-full max-w-2xl rounded-[28px] border border-border/80 bg-surface p-6 shadow-card">
            <form className="space-y-3" onSubmit={savePermission}>
              <h3 className="text-lg font-semibold">{permissionEditingId ? "Editar permissão" : "Criar permissão"}</h3>
              <Input
                onChange={(e) => setPermissionForm((prev) => ({ ...prev, name: e.target.value }))}
                placeholder="permission:action"
                required
                value={permissionForm.name}
              />
              <Input
                onChange={(e) => setPermissionForm((prev) => ({ ...prev, description: e.target.value }))}
                placeholder="Descrição"
                value={permissionForm.description}
              />
              <div className="flex justify-end gap-2 pt-2">
                <Button onClick={() => setPermissionModalOpen(false)} type="button" variant="outline">
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
