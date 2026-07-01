import { useEffect, useMemo, useState } from "react";
import { useRouter } from "@/lib/next-shims";
import { AlertTriangle, KeyRound, RefreshCw, ShieldCheck } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import { formatDateTime } from "@/features/dashboard/components/shared";
import { platformSdk } from "@/features/platform/sdk";
import type {
  ExternalApiKey,
  ExternalApiKeyCreateInput,
  ExternalApiKeyUpdateInput,
  ExternalApiPermissionSummary,
  ExternalApiScope,
  ExternalApiScopeAction,
} from "@/features/platform/types";

type ApiKeyFormState = {
  name: string;
  description: string;
  status: string;
  environment: string;
  allowed_ips: string;
  expires_at: string;
  expires_in_days: string;
};

type PermissionAction = "read" | "create" | "update" | "delete";

const EMPTY_FORM: ApiKeyFormState = {
  name: "",
  description: "",
  status: "active",
  environment: "shared",
  allowed_ips: "",
  expires_at: "",
  expires_in_days: "",
};

const STATUS_LABELS: Record<string, string> = {
  active: "Ativa",
  inactive: "Inativa",
  revoked: "Revogada",
  expired: "Expirada",
};

const STATUS_TONES: Record<string, "accent" | "neutral" | "warning" | "danger" | "success"> = {
  active: "success",
  inactive: "neutral",
  revoked: "danger",
  expired: "warning",
};

const ACTION_LABELS: Record<PermissionAction, string> = {
  read: "Ler",
  create: "Criar",
  update: "Editar",
  delete: "Excluir",
};

const ACTION_GROUPS: Record<PermissionAction, string> = {
  read: "Leitura",
  create: "Escrita segura",
  update: "Escrita segura",
  delete: "Escrita destrutiva",
};

const ACTION_TONES: Record<PermissionAction, "accent" | "neutral" | "warning" | "danger" | "success"> = {
  read: "neutral",
  create: "accent",
  update: "accent",
  delete: "danger",
};

const RISK_TONES: Record<ExternalApiPermissionSummary["risk_level"], "success" | "warning" | "danger"> = {
  low: "success",
  medium: "warning",
  high: "danger",
};

const ENVIRONMENT_LABELS: Record<string, string> = {
  shared: "Compartilhado",
  development: "Desenvolvimento",
  staging: "Homologação",
  production: "Produção",
};

type PermissionPreset = {
  key: string;
  label: string;
  description: string;
  scopes: string[];
};

type ApiKeyFilter = "all" | "active" | "expired" | "revoked" | "inactive" | "expiring" | "write" | "delete" | "no-allowlist" | "high-risk";

function sectionCardClassName() {
  return "border-border/80 bg-surface shadow-card";
}

function normalizeScopes(scopes: string[]) {
  return Array.from(new Set(scopes.map((scope) => scope.toLowerCase()).filter(Boolean)));
}

function buildForm(key: ExternalApiKey): ApiKeyFormState {
  return {
    name: key.name ?? "",
    description: key.description ?? "",
    status: key.status ?? "active",
    environment: key.environment || "shared",
    allowed_ips: (key.allowed_ips || []).join("\n"),
    expires_at: key.expires_at ? key.expires_at.slice(0, 19) : "",
    expires_in_days: "",
  };
}

function parseExpiresAt(value: string): string | null {
  const trimmed = value.trim();
  if (!trimmed) return null;
  const parsed = new Date(trimmed);
  if (Number.isNaN(parsed.getTime())) return null;
  return parsed.toISOString();
}

function parseDateOrNull(value?: string | null): Date | null {
  if (!value) return null;
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function daysUntil(value?: string | null): number | null {
  const parsed = parseDateOrNull(value);
  if (!parsed) return null;
  return (parsed.getTime() - Date.now()) / 86400000;
}

function hasWriteAccess(scopes: string[]) {
  return scopes.some((scope) => scope.endsWith(".create") || scope.endsWith(".update") || scope.endsWith(".delete"));
}

function hasDeleteAccess(scopes: string[]) {
  return scopes.some((scope) => scope.endsWith(".delete"));
}

function riskLevelLabel(level: ExternalApiPermissionSummary["risk_level"]) {
  return level === "low" ? "baixo" : level === "medium" ? "médio" : "alto";
}

function statusLabel(status: string) {
  return STATUS_LABELS[status] ?? status;
}

function keyRiskFactors(key: ExternalApiKey) {
  const factors: string[] = [];
  if (key.permission_summary.delete > 0) {
    factors.push("Exclusão habilitada");
  } else if (key.permission_summary.create > 0 || key.permission_summary.update > 0) {
    factors.push("Escrita habilitada");
  } else {
    factors.push("Somente leitura");
  }
  if (!key.allowed_ips.length) {
    factors.push("Sem allowlist");
  } else {
    factors.push(`${key.allowed_ips.length} regra(s) de IP`);
  }
  if (key.effective_status === "expired") {
    factors.push("Expirada");
  } else if (daysUntil(key.expires_at) !== null && (daysUntil(key.expires_at) ?? 999) <= 7) {
    factors.push("Perto de expirar");
  }
  if (key.environment === "shared") {
    factors.push("Ambiente compartilhado");
  }
  return factors;
}

function keyStatusDetail(key: ExternalApiKey) {
  if (key.effective_status === "expired" && key.expires_at) {
    return `Esta chave expirou em ${formatDateTime(key.expires_at)} e não deve mais autenticar chamadas externas.`;
  }
  if (key.effective_status === "revoked") {
    return "Esta chave foi revogada e não deve ser reutilizada.";
  }
  if (key.effective_status === "inactive") {
    return "Esta chave está inativa e não recebe uso operacional.";
  }
  const remaining = daysUntil(key.expires_at);
  if (remaining !== null && remaining > 0 && remaining <= 7) {
    return "Esta chave está próxima do vencimento. Considere rotacionar ou renovar com antecedência.";
  }
  return "Esta chave está disponível para chamadas externas dentro do escopo autorizado.";
}

function keyRiskTone(level: ExternalApiPermissionSummary["risk_level"], key: ExternalApiKey) {
  if (key.effective_status === "expired" || key.effective_status === "revoked") return "danger" as const;
  if (!key.allowed_ips.length && level === "low") return "warning" as const;
  if (key.permission_summary.delete > 0) return "danger" as const;
  if (key.permission_summary.create > 0 || key.permission_summary.update > 0) return "warning" as const;
  return "success" as const;
}

function summarizeScopes(scopes: string[], catalog: ExternalApiScope[]) {
  const selected = new Set(scopes);
  const counts = { read: 0, create: 0, update: 0, delete: 0 };
  const selectedDomains = new Set<string>();
  for (const domain of catalog) {
    let hasDomainPermission = false;
    for (const action of domain.actions) {
      if (!action.available || !selected.has(action.key)) continue;
      counts[action.action] += 1;
      hasDomainPermission = true;
    }
    if (hasDomainPermission) selectedDomains.add(domain.key);
  }
  const risk_level: ExternalApiPermissionSummary["risk_level"] =
    counts.delete > 0 ? "high" : counts.create > 0 || counts.update > 0 ? "medium" : "low";
  return {
    read: counts.read,
    create: counts.create,
    update: counts.update,
    delete: counts.delete,
    total: selectedDomains.size,
    risk_level,
  };
}

function buildAvailableEndpoints(scopes: string[], catalog: ExternalApiScope[]) {
  const selected = new Set(scopes);
  const seen = new Set<string>();
  const items: Array<{ key: string; method: string; endpoint: string; label: string }> = [];
  for (const domain of catalog) {
    for (const action of domain.actions) {
      if (!action.available || !selected.has(action.key)) continue;
      for (const endpoint of action.endpoints.length ? action.endpoints : [`/${domain.key}`]) {
        const key = `${action.key}:${endpoint}`;
        if (seen.has(key)) continue;
        seen.add(key);
        items.push({
          key,
          method: action.methods.length ? action.methods.join(" / ") : action.action.toUpperCase(),
          endpoint,
          label: `${domain.label} · ${ACTION_LABELS[action.action]}`,
        });
      }
    }
  }
  return items;
}

function summarizeActions(scopes: string[], catalog: ExternalApiScope[]) {
  const selected = new Set(scopes);
  return catalog.flatMap((domain) =>
    domain.actions
      .filter((action) => action.available && selected.has(action.key))
      .map((action) => ({ ...action, domainKey: domain.key, domainLabel: domain.label })),
  );
}

function parseAllowedIps(value: string) {
  return value
    .split(/[\n,]/)
    .map((item) => item.trim())
    .filter(Boolean);
}

function buildPresetScopes(catalog: ExternalApiScope[], presetKey: string) {
  const available = new Map(
    catalog.flatMap((domain) =>
      domain.actions.filter((action) => action.available).map((action) => [action.key, action]),
    ),
  );
  const keysFor = (domains: string[], actions: PermissionAction[]) =>
    domains.flatMap((domain) => actions.map((action) => `${domain}.${action}`)).filter((key) => available.has(key));

  switch (presetKey) {
    case "read-only":
      return Array.from(available.keys()).filter((key) => key.endsWith(".read"));
    case "taxonomy-editor":
      return keysFor(["tags", "glossary"], ["read", "create", "update"]);
    case "taxonomy-admin":
      return keysFor(["tags", "glossary"], ["read", "create", "update", "delete"]);
    case "governance-reader":
      return keysFor(["governance", "platform"], ["read"]);
    default:
      return [];
  }
}

function toggleScope(current: string[], action: ExternalApiScopeAction, domainKey: string) {
  const next = new Set(current);
  const scopeKey = action.key;
  const readKey = `${domainKey}.read`;
  const hasSelected = next.has(scopeKey);

  if (hasSelected) {
    next.delete(scopeKey);
    if (action.action === "read") {
      for (const verb of ["create", "update", "delete"] as PermissionAction[]) {
        next.delete(`${domainKey}.${verb}`);
      }
    }
  } else {
    next.add(scopeKey);
    if (action.action !== "read") {
      next.add(readKey);
    }
  }

  const hasWrite = (["create", "update", "delete"] as PermissionAction[]).some((verb) => next.has(`${domainKey}.${verb}`));
  if (hasWrite) {
    next.add(readKey);
  }

  return Array.from(next);
}

export function PlatformApiKeysAdmin() {
  const router = useRouter();
  const [keys, setKeys] = useState<ExternalApiKey[]>([]);
  const [scopes, setScopes] = useState<ExternalApiScope[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");
  const [actionError, setActionError] = useState("");
  const [formError, setFormError] = useState("");
  const [search, setSearch] = useState("");
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [mode, setMode] = useState<"existing" | "new">("existing");
  const [acting, setActing] = useState<string | null>(null);
  const [form, setForm] = useState<ApiKeyFormState>(EMPTY_FORM);
  const [selectedScopes, setSelectedScopes] = useState<string[]>([]);
  const [tokenReveal, setTokenReveal] = useState<string | null>(null);
  const [selectedFilter, setSelectedFilter] = useState<ApiKeyFilter>("all");
  const [showUnavailableActions, setShowUnavailableActions] = useState(false);

  const keyMap = useMemo(() => new Map(keys.map((item) => [item.id, item])), [keys]);
  const selectedKey = mode === "existing" && selectedId !== null ? keyMap.get(selectedId) || null : null;
  const selectedSummary = useMemo(() => summarizeScopes(selectedScopes, scopes), [selectedScopes, scopes]);
  const selectedActions = useMemo(() => summarizeActions(selectedScopes, scopes), [selectedScopes, scopes]);
  const permittedEndpoints = useMemo(() => buildAvailableEndpoints(selectedScopes, scopes), [selectedScopes, scopes]);
  const permissionPresets = useMemo<PermissionPreset[]>(
    () => [
      {
        key: "read-only",
        label: "Somente leitura",
        description: "Ativa apenas os endpoints de leitura expostos no backend.",
        scopes: buildPresetScopes(scopes, "read-only"),
      },
      {
        key: "taxonomy-editor",
        label: "Editor de taxonomia",
        description: "Tags e glossário com escrita segura.",
        scopes: buildPresetScopes(scopes, "taxonomy-editor"),
      },
      {
        key: "taxonomy-admin",
        label: "Admin de taxonomia",
        description: "Tags e glossário com exclusão habilitada.",
        scopes: buildPresetScopes(scopes, "taxonomy-admin"),
      },
      {
        key: "governance-reader",
        label: "Leitor de governança",
        description: "Consulta governança e eventos de plataforma.",
        scopes: buildPresetScopes(scopes, "governance-reader"),
      },
    ],
    [scopes],
  );

  const filteredKeys = useMemo(() => {
    const q = search.trim().toLowerCase();
    return keys.filter((item) => {
      const haystack = [item.name, item.description, item.public_id, item.token_prefix, item.environment, item.status]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();
      if (q && !haystack.includes(q)) return false;
      const isExpiringSoon = item.effective_status === "active" && (daysUntil(item.expires_at) ?? Infinity) <= 7 && (daysUntil(item.expires_at) ?? Infinity) > 0;
      const matchesSelectedFilter =
        selectedFilter === "all"
          ? true
          : selectedFilter === "active"
            ? item.effective_status === "active"
            : selectedFilter === "expired"
              ? item.effective_status === "expired"
              : selectedFilter === "revoked"
                ? item.effective_status === "revoked"
                : selectedFilter === "inactive"
                  ? item.effective_status === "inactive"
                  : selectedFilter === "expiring"
                    ? isExpiringSoon
                    : selectedFilter === "write"
                      ? item.permission_summary.create > 0 || item.permission_summary.update > 0 || item.permission_summary.delete > 0
                      : selectedFilter === "delete"
                        ? item.permission_summary.delete > 0
                        : selectedFilter === "no-allowlist"
                          ? item.allowed_ips.length === 0
                          : selectedFilter === "high-risk"
                            ? item.permission_summary.risk_level === "high" || !item.allowed_ips.length || isExpiringSoon
                            : true;
      return matchesSelectedFilter;
    });
  }, [search, keys, selectedFilter]);

  const selectedKeyHealth = useMemo(() => {
    if (!selectedKey) return null;
    const remaining = daysUntil(selectedKey.expires_at);
    const riskTone = keyRiskTone(selectedKey.permission_summary.risk_level, selectedKey);
    const status = statusLabel(selectedKey.effective_status);
    const details = keyStatusDetail(selectedKey);
    const expiringSoon = remaining !== null && remaining > 0 && remaining <= 7;
    return {
      status,
      details,
      riskTone,
      remaining,
      expiringSoon,
      riskFactors: keyRiskFactors(selectedKey),
    };
  }, [selectedKey]);

  async function loadData(options?: { silent?: boolean }) {
    const silent = Boolean(options?.silent);
    if (silent) setRefreshing(true);
    else setLoading(true);
    setError("");
    let nextError = "";
    const [keysResult, scopesResult] = await Promise.allSettled([
      platformSdk.listExternalApiKeys(),
      platformSdk.listExternalApiScopes(),
    ]);

    if (keysResult.status === "fulfilled") {
      setKeys(keysResult.value);
    } else {
      nextError = keysResult.reason instanceof Error ? keysResult.reason.message : "Não foi possível carregar as API keys.";
    }

    if (scopesResult.status === "fulfilled") {
      setScopes(scopesResult.value);
    } else if (!nextError) {
      nextError = scopesResult.reason instanceof Error ? scopesResult.reason.message : "Não foi possível carregar as permissões.";
    }
    setError(nextError);
    if (silent) setRefreshing(false);
    else setLoading(false);
  }

  useEffect(() => {
    void loadData();
  }, []);

  useEffect(() => {
    if (mode !== "existing") return;
    if (!keys.length) {
      setSelectedId(null);
      return;
    }
    if (selectedId === null || !keyMap.has(selectedId)) {
      setSelectedId(keys[0].id);
    }
  }, [keyMap, keys, mode, selectedId]);

  useEffect(() => {
    if (!selectedKey || mode !== "existing") return;
    setForm(buildForm(selectedKey));
    setSelectedScopes(normalizeScopes(selectedKey.scopes || []));
  }, [mode, selectedKey]);

  function handleStartNew() {
    setMode("new");
    setSelectedId(null);
    setForm(EMPTY_FORM);
    setSelectedScopes([]);
    setFormError("");
    setActionError("");
    setTokenReveal(null);
  }

  function handleScrollToUsage() {
    const element = document.getElementById("api-key-usage");
    element?.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  function handleApplyPreset(preset: PermissionPreset) {
    if (!preset.scopes.length) return;
    const presetSummary = summarizeScopes(preset.scopes, scopes);
    if (presetSummary.delete > 0 || presetSummary.create > 0 || presetSummary.update > 0) {
      const confirmMessage = presetSummary.delete > 0
        ? "Este preset habilita escrita destrutiva em ao menos um domínio. Deseja aplicar mesmo assim?"
        : "Este preset habilita escrita segura em ao menos um domínio. Deseja aplicar mesmo assim?";
      if (!window.confirm(confirmMessage)) {
        return;
      }
    }
    setSelectedScopes(normalizeScopes(preset.scopes));
    setFormError("");
    setActionError("");
  }

  function handleSelectExisting(id: number) {
    setMode("existing");
    setSelectedId(id);
    setFormError("");
    setActionError("");
    setTokenReveal(null);
  }

  function buildPayload(): ExternalApiKeyCreateInput | ExternalApiKeyUpdateInput {
    const expiresInDays = form.expires_in_days ? Number(form.expires_in_days) : null;
    return {
      name: form.name.trim(),
      description: form.description.trim() || null,
      scopes: selectedScopes,
      environment: form.environment.trim() || "shared",
      allowed_ips: parseAllowedIps(form.allowed_ips),
      status: form.status,
      expires_at: parseExpiresAt(form.expires_at),
      expires_in_days: Number.isFinite(expiresInDays) ? expiresInDays : null,
    };
  }

  async function handleSave() {
    setFormError("");
    setActionError("");
    if (!form.name.trim()) {
      setFormError("Informe o nome da integração.");
      return;
    }
    if (!selectedScopes.length) {
      setFormError("Selecione ao menos uma permissão.");
      return;
    }
    setActing("save");
    try {
      if (mode === "new") {
        const created = await platformSdk.createExternalApiKey(buildPayload() as ExternalApiKeyCreateInput);
        setTokenReveal(created.token);
        setKeys((prev) => [created.key, ...prev]);
        setMode("existing");
        setSelectedId(created.key.id);
        setSelectedScopes(normalizeScopes(created.key.scopes || []));
      } else if (selectedKey) {
        const updated = await platformSdk.updateExternalApiKey(selectedKey.id, buildPayload() as ExternalApiKeyUpdateInput);
        setKeys((prev) => prev.map((item) => (item.id === updated.id ? updated : item)));
        setSelectedScopes(normalizeScopes(updated.scopes || []));
      }
    } catch (err) {
      setActionError(err instanceof Error ? err.message : "Não foi possível salvar a API key.");
    } finally {
      setActing(null);
    }
  }

  async function handleRotate() {
    if (!selectedKey) return;
    if (
      !window.confirm(
        "Rotacionar gera um novo segredo e invalida o token atual. Copie o novo segredo imediatamente, pois ele não será exibido novamente. Deseja continuar?",
      )
    ) {
      return;
    }
    setActionError("");
    setActing("rotate");
    try {
      const rotated = await platformSdk.rotateExternalApiKey(selectedKey.id);
      setTokenReveal(rotated.token);
      setKeys((prev) => prev.map((item) => (item.id === rotated.key.id ? rotated.key : item)));
      setSelectedScopes(normalizeScopes(rotated.key.scopes || []));
    } catch (err) {
      setActionError(err instanceof Error ? err.message : "Não foi possível rotacionar a chave.");
    } finally {
      setActing(null);
    }
  }

  async function handleRevoke() {
    if (!selectedKey) return;
    if (!window.confirm("Revogar impede o uso desta chave por qualquer integração externa. Deseja continuar?")) {
      return;
    }
    setActionError("");
    setActing("revoke");
    try {
      const revoked = await platformSdk.revokeExternalApiKey(selectedKey.id);
      setKeys((prev) => prev.map((item) => (item.id === revoked.id ? revoked : item)));
    } catch (err) {
      setActionError(err instanceof Error ? err.message : "Não foi possível revogar a chave.");
    } finally {
      setActing(null);
    }
  }

  async function handleCopy() {
    if (!tokenReveal) return;
    try {
      await navigator.clipboard.writeText(tokenReveal);
    } catch {
      // ignore copy errors
    }
  }

  async function handleCopyHeader() {
    const value = tokenReveal ? `X-API-Key: ${tokenReveal}` : "X-API-Key: SUA_CHAVE_AQUI";
    try {
      await navigator.clipboard.writeText(value);
    } catch {
      // ignore copy errors
    }
  }

  function handleToggleAction(domainKey: string, action: ExternalApiScopeAction) {
    if (!action.available) return;
    setSelectedScopes((current) => toggleScope(current, action, domainKey));
  }

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div className="space-y-1">
          <h2 className="text-xl font-semibold text-text">Integrações · API</h2>
          <p className="max-w-3xl text-sm text-muted">
            Chaves externas, permissões por domínio e controle de acesso. Use a menor superfície possível e trate
            rotação, allowlist e expiração como parte da configuração segura.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button onClick={() => loadData({ silent: true })} variant="ghost">
            <RefreshCw className={`mr-2 h-4 w-4 ${refreshing ? "animate-spin" : ""}`} />
            Atualizar
          </Button>
          <Button onClick={handleScrollToUsage} variant="ghost">
            Ver documentação da API
          </Button>
          <Button onClick={() => router.push("/audit")} variant="ghost">
            Ver auditoria
          </Button>
          <Button onClick={handleStartNew}>
            <KeyRound className="mr-2 h-4 w-4" />
            Nova chave
          </Button>
        </div>
      </header>

      {loading ? (
        <div className="grid gap-4 lg:grid-cols-[320px_minmax(0,1fr)]">
          <Card className={sectionCardClassName()}>
            <CardContent className="space-y-3 p-5">
              <Skeleton className="h-8 w-full" />
              <Skeleton className="h-24 w-full" />
              <Skeleton className="h-24 w-full" />
            </CardContent>
          </Card>
          <Card className={sectionCardClassName()}>
            <CardContent className="space-y-3 p-5">
              <Skeleton className="h-8 w-full" />
              <Skeleton className="h-40 w-full" />
            </CardContent>
          </Card>
        </div>
      ) : (
        <div className="grid gap-4 lg:grid-cols-[340px_minmax(0,1fr)]">
          <Card className={sectionCardClassName()}>
            <CardContent className="space-y-4 p-5">
              <div className="space-y-2">
                <Input placeholder="Buscar chaves de API" value={search} onChange={(event) => setSearch(event.target.value)} />
                {error ? <p className="text-xs text-danger-700">{error}</p> : null}
              </div>
              <div className="flex flex-wrap gap-2">
                {[
                  { key: "all", label: "Todas" },
                  { key: "active", label: "Ativas" },
                  { key: "expired", label: "Expiradas" },
                  { key: "revoked", label: "Revogadas" },
                  { key: "expiring", label: "Perto de expirar" },
                  { key: "write", label: "Com escrita" },
                  { key: "delete", label: "Com exclusão" },
                  { key: "no-allowlist", label: "Sem allowlist" },
                  { key: "high-risk", label: "Alto risco" },
                ].map((item) => (
                  <Button
                    key={item.key}
                    onClick={() => setSelectedFilter(item.key as ApiKeyFilter)}
                    size="sm"
                    variant={selectedFilter === item.key ? "outline" : "ghost"}
                  >
                    {item.label}
                  </Button>
                ))}
              </div>
              <div className="space-y-2">
                {filteredKeys.length === 0 ? (
                  <EmptyState title="Sem chaves de API" description="Crie a primeira chave para começar." />
                ) : (
                  filteredKeys.map((item) => {
                    const active = item.id === selectedId;
                    const remaining = daysUntil(item.expires_at);
                    const expiringSoon = item.effective_status === "active" && remaining !== null && remaining > 0 && remaining <= 7;
                    return (
                      <button
                        key={item.id}
                        onClick={() => handleSelectExisting(item.id)}
                        className={`w-full rounded-lg border px-3 py-3 text-left transition ${
                          active ? "border-brand-200 bg-brand-50" : "border-border/70 hover:border-border-strong"
                        }`}
                        type="button"
                      >
                        <div className="flex items-center justify-between gap-2">
                          <span className="text-sm font-semibold text-text">{item.name}</span>
                          <Badge tone={STATUS_TONES[item.effective_status] ?? "neutral"}>
                            {statusLabel(item.effective_status)}
                          </Badge>
                        </div>
                        <p className="mt-1 text-xs text-muted">{item.description || "Sem descrição"}</p>
                        <p className="mt-1 text-xs text-muted">
                          {item.effective_status === "expired" && item.expires_at
                            ? `Expirou em ${formatDateTime(item.expires_at)}`
                            : expiringSoon && item.expires_at
                              ? `Expira em ${formatDateTime(item.expires_at)}`
                              : item.last_used_at
                                ? `Último uso ${formatDateTime(item.last_used_at)}`
                                : "Nunca utilizada"}
                        </p>
                        <div className="mt-2 flex flex-wrap gap-1">
                          <Badge tone="neutral" className="bg-surface">
                            L {item.permission_summary.read}
                          </Badge>
                          <Badge tone="accent" className="bg-surface">
                            C {item.permission_summary.create}
                          </Badge>
                          <Badge tone="accent" className="bg-surface">
                            E {item.permission_summary.update}
                          </Badge>
                          <Badge tone="danger" className="bg-surface">
                            D {item.permission_summary.delete}
                          </Badge>
                          <Badge tone={RISK_TONES[item.permission_summary.risk_level]} className="bg-surface">
                            Risco {riskLevelLabel(item.permission_summary.risk_level)}
                          </Badge>
                        </div>
                        <div className="mt-2 flex flex-wrap gap-1">
                          <Badge tone="neutral" className="bg-surface">
                            {ENVIRONMENT_LABELS[item.environment] ?? item.environment}
                          </Badge>
                          <Badge tone="neutral" className="bg-surface">
                            {item.allowed_ips.length ? `${item.allowed_ips.length} IPs` : "Sem allowlist"}
                          </Badge>
                          {item.permission_summary.delete > 0 ? <Badge tone="danger" className="bg-surface">Exclusão</Badge> : null}
                        </div>
                      </button>
                    );
                  })
                )}
              </div>
            </CardContent>
          </Card>

          <Card className={sectionCardClassName()}>
            <CardContent className="space-y-6 p-6">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <h3 className="text-lg font-semibold text-text">{mode === "new" ? "Nova API key" : "Detalhe da API key"}</h3>
                  <p className="text-sm text-muted">
                    Edite identidade, validade, status e permissões por domínio e ação.
                  </p>
                </div>
              </div>

              {formError ? <p className="text-sm text-danger-700">{formError}</p> : null}
              {actionError ? <p className="text-sm text-danger-700">{actionError}</p> : null}

              {selectedKey && mode === "existing" ? (
                <div
                  className={`rounded-2xl border px-4 py-4 ${
                    selectedKeyHealth?.riskTone === "danger"
                      ? "border-danger-200 bg-danger-50 text-danger-700"
                      : selectedKeyHealth?.riskTone === "warning"
                        ? "border-warning-200 bg-warning-50 text-warning-700"
                        : "border-success-200 bg-success-50 text-success-700"
                  }`}
                >
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="space-y-2">
                      <div className="flex flex-wrap items-center gap-2">
                        <Badge tone={STATUS_TONES[selectedKey.effective_status] ?? "neutral"}>{statusLabel(selectedKey.effective_status)}</Badge>
                        <Badge tone={selectedKeyHealth?.riskTone ?? "neutral"}>Risco {riskLevelLabel(selectedKey.permission_summary.risk_level)}</Badge>
                        <Badge tone="neutral" className="bg-surface">
                          {ENVIRONMENT_LABELS[selectedKey.environment] ?? selectedKey.environment}
                        </Badge>
                        <Badge tone={selectedKey.allowed_ips.length ? "accent" : "warning"} className="bg-surface">
                          {selectedKey.allowed_ips.length ? `${selectedKey.allowed_ips.length} IPs permitidos` : "Sem allowlist"}
                        </Badge>
                      </div>
                      <p className="text-sm font-semibold">{selectedKeyHealth?.details}</p>
                      <p className="text-xs opacity-80">
                        Token prefixo {selectedKey.token_prefix}... · {selectedKey.last_used_at ? `Último uso ${formatDateTime(selectedKey.last_used_at)}` : "Nunca utilizada"} ·{" "}
                        {selectedKey.expires_at ? `Expira em ${formatDateTime(selectedKey.expires_at)}` : "Sem expiração"}
                      </p>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <Button onClick={handleRotate} disabled={acting !== null} variant="ghost">
                        Rotacionar chave
                      </Button>
                      <Button onClick={handleRevoke} disabled={acting !== null} variant="danger">
                        Revogar chave
                      </Button>
                    </div>
                  </div>
                  <div className="mt-3 flex flex-wrap gap-2 text-xs opacity-90">
                    {selectedKeyHealth?.riskFactors.map((factor) => (
                      <Badge key={factor} tone="neutral" className="bg-surface">
                        {factor}
                      </Badge>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="rounded-2xl border border-border bg-bg-subtle px-4 py-4 text-sm text-text-body">
                  <p className="font-semibold text-text">Nova chave</p>
                  <p className="mt-1">
                    O segredo completo será exibido apenas uma vez após a criação. Trate allowlist, expiração e escopo como
                    parte do desenho seguro da integração.
                  </p>
                </div>
              )}

              <div className="grid gap-4 lg:grid-cols-2">
                <div className="space-y-2">
                  <label className="text-xs font-semibold uppercase text-muted">Nome</label>
                  <Input value={form.name} onChange={(event) => setForm((prev) => ({ ...prev, name: event.target.value }))} />
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-semibold uppercase text-muted">Status</label>
                  <Input
                    value={form.status}
                    onChange={(event) => setForm((prev) => ({ ...prev, status: event.target.value }))}
                    placeholder="active | inactive"
                  />
                  <p className="text-[11px] text-muted">Ativa, inativa ou revogada. Chaves expiradas não devem ser reutilizadas.</p>
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-semibold uppercase text-muted">Ambiente</label>
                  <Input
                    value={form.environment}
                    onChange={(event) => setForm((prev) => ({ ...prev, environment: event.target.value }))}
                    placeholder="shared | development | staging | production"
                  />
                  <p className="text-[11px] text-muted">Use shared para integrações comuns; ambientes dedicados ajudam a reduzir exposição.</p>
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-semibold uppercase text-muted">IPs permitidos</label>
                  <Textarea
                    value={form.allowed_ips}
                    onChange={(event) => setForm((prev) => ({ ...prev, allowed_ips: event.target.value }))}
                    placeholder="10.0.0.10\n10.0.0.0/24"
                  />
                  <p className="text-[11px] text-muted">Cada linha ou vírgula vira uma regra de allowlist.</p>
                </div>
                <div className="space-y-2 lg:col-span-2">
                  <label className="text-xs font-semibold uppercase text-muted">Descrição</label>
                  <Textarea value={form.description} onChange={(event) => setForm((prev) => ({ ...prev, description: event.target.value }))} />
                  <p className="text-[11px] text-muted">Explique quem usa a chave, em qual sistema e para qual finalidade.</p>
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-semibold uppercase text-muted">Expira em (UTC)</label>
                  <Input
                    value={form.expires_at}
                    onChange={(event) => setForm((prev) => ({ ...prev, expires_at: event.target.value }))}
                    placeholder="2026-04-30T12:00:00"
                  />
                  <p className="text-[11px] text-muted">Formato ISO UTC. Usado quando você quer definir data/hora exata.</p>
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-semibold uppercase text-muted">Ou expira em (dias)</label>
                  <Input
                    value={form.expires_in_days}
                    onChange={(event) => setForm((prev) => ({ ...prev, expires_in_days: event.target.value }))}
                    placeholder="30"
                  />
                  <p className="text-[11px] text-muted">Para escrita ou exclusão, o backend aplica limite máximo de validade.</p>
                </div>
                <div className="lg:col-span-2 rounded-lg border border-dashed border-warning-200 bg-warning-50 px-3 py-2 text-xs text-warning-700">
                  Chaves com criação/edição expiram em até 30 dias. Chaves com exclusão expiram em até 7 dias. Se a chave tiver allowlist
                  de IP, apenas os endereços cadastrados poderão usar o token.
                </div>
              </div>

              <Card className="border-border/70 bg-bg-subtle/80 shadow-none">
                <CardContent className="space-y-4 p-4">
                  <div className="space-y-3">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <h4 className="text-sm font-semibold text-text">Presets de permissão</h4>
                      <span className="text-xs text-muted">Atalhos para acelerar a configuração inicial</span>
                    </div>
                    <div className="grid gap-2 md:grid-cols-2">
                      {permissionPresets.map((preset) => {
                        const presetSummary = summarizeScopes(preset.scopes, scopes);
                        const presetTone =
                          presetSummary.delete > 0 ? "danger" : presetSummary.create > 0 || presetSummary.update > 0 ? "warning" : "success";
                        return (
                          <button
                            key={preset.key}
                            type="button"
                            onClick={() => handleApplyPreset(preset)}
                            className="rounded-lg border border-border/70 bg-surface px-3 py-3 text-left transition hover:border-border-strong"
                          >
                            <div className="flex items-center justify-between gap-2">
                              <span className="text-sm font-semibold text-text">{preset.label}</span>
                              <Badge tone={presetTone}>{riskLevelLabel(presetSummary.risk_level)}</Badge>
                            </div>
                            <p className="mt-1 text-xs text-muted">{preset.description}</p>
                            <div className="mt-2 flex flex-wrap gap-2 text-[11px] text-muted">
                              <Badge tone="neutral" className="bg-bg-subtle">
                                {preset.scopes.length} scopes
                              </Badge>
                              <Badge tone="neutral" className="bg-bg-subtle">
                                {presetSummary.total} domínios
                              </Badge>
                              {presetSummary.delete > 0 ? <Badge tone="danger">Inclui exclusão</Badge> : null}
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <ShieldCheck className="h-4 w-4 text-muted" />
                      <h4 className="text-sm font-semibold text-text">Permissões da chave</h4>
                    </div>
                    <div className="flex flex-wrap gap-2 text-xs">
                      <Badge tone="neutral" className="bg-surface">
                        Leitura: {selectedSummary.read}
                      </Badge>
                      <Badge tone="accent" className="bg-surface">
                        Criação: {selectedSummary.create}
                      </Badge>
                      <Badge tone="accent" className="bg-surface">
                        Edição: {selectedSummary.update}
                      </Badge>
                      <Badge tone="danger" className="bg-surface">
                        Exclusão: {selectedSummary.delete}
                      </Badge>
                      <Badge tone={RISK_TONES[selectedSummary.risk_level]} className="bg-surface">
                        Risco {selectedSummary.risk_level === "low" ? "baixo" : selectedSummary.risk_level === "medium" ? "médio" : "alto"}
                      </Badge>
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <p className="text-xs text-muted">
                      A leitura permanece ativa quando você adiciona escrita. Ações indisponíveis estão ocultas para reduzir ruído.
                    </p>
                    <Button onClick={() => setShowUnavailableActions((current) => !current)} size="sm" variant="ghost">
                      {showUnavailableActions ? "Ocultar ações indisponíveis" : "Ver ações indisponíveis"}
                    </Button>
                  </div>
                  <div className="grid gap-3 xl:grid-cols-2">
                    {scopes.map((domain) => {
                      const availableActions = domain.actions.filter((action) => action.available);
                      const unavailableActions = domain.actions.filter((action) => !action.available);
                      return (
                        <div key={domain.key} className="rounded-xl border border-border/70 bg-surface p-4">
                          <div className="flex flex-wrap items-start justify-between gap-2">
                            <div>
                              <h5 className="text-sm font-semibold text-text">{domain.label}</h5>
                              <p className="mt-1 text-xs text-muted">{domain.description}</p>
                            </div>
                            <Badge tone="neutral" className="bg-bg-subtle">
                              {availableActions.length} disponível(is)
                            </Badge>
                          </div>

                          {availableActions.length ? (
                            <div className="mt-4 flex flex-wrap gap-2">
                              {availableActions.map((action) => {
                                const active = selectedScopes.includes(action.key);
                                const isReadLocked =
                                  action.action === "read" && domain.actions.some((item) => selectedScopes.includes(item.key) && item.action !== "read");
                                const clickable = action.available && !isReadLocked;
                                return (
                                  <button
                                    key={action.key}
                                    type="button"
                                    disabled={!clickable}
                                    onClick={() => handleToggleAction(domain.key, action)}
                                    className={`rounded-full border px-3 py-1.5 text-left text-xs font-medium transition ${
                                      active
                                        ? action.destructive
                                          ? "border-danger-200 bg-danger-50 text-danger-800"
                                          : "border-brand-200 bg-brand-50 text-brand-800"
                                        : "border-border/70 bg-bg-subtle text-text-body hover:border-border-strong"
                                    }`}
                                  >
                                    {ACTION_LABELS[action.action]} · {action.key}
                                  </button>
                                );
                              })}
                            </div>
                          ) : (
                            <p className="mt-3 rounded-lg border border-dashed border-border bg-bg-subtle px-3 py-2 text-xs text-muted">
                              Escrita externa ainda não exposta para este domínio.
                            </p>
                          )}

                          {unavailableActions.length ? (
                            <div className="mt-3 space-y-2">
                              <p className="text-[11px] text-muted">
                                {unavailableActions.length} ação(ões) indisponível(is) {showUnavailableActions ? "visíveis abaixo." : "ocultas."}
                              </p>
                              {showUnavailableActions ? (
                                <div className="flex flex-wrap gap-2">
                                  {unavailableActions.map((action) => (
                                    <Badge key={action.key} tone="neutral" className="bg-bg-subtle text-muted">
                                      {ACTION_LABELS[action.action]} indisponível
                                    </Badge>
                                  ))}
                                </div>
                              ) : null}
                            </div>
                          ) : null}
                        </div>
                      );
                    })}
                  </div>
                </CardContent>
              </Card>

              <div className="grid gap-4 xl:grid-cols-[minmax(0,1.2fr)_minmax(0,0.8fr)]">
                <div id="api-key-usage" className="space-y-3 rounded-lg border border-border/70 bg-bg-subtle/80 p-4 text-sm shadow-sm">
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-semibold text-text">Como usar esta chave</span>
                    <Button size="sm" variant="ghost" onClick={handleCopyHeader}>
                      Copiar header
                    </Button>
                  </div>
                  {selectedKey?.effective_status === "expired" ? (
                    <div className="rounded-md border border-danger-200 bg-danger-50 px-3 py-2 text-xs text-danger-700">
                      Esta chave está expirada. Os exemplos abaixo servem apenas como referência até que você rotacione ou
                      crie uma nova credencial.
                    </div>
                  ) : null}
                  <p className="text-sm text-text-body">
                    Use o header `X-API-Key` para autenticar chamadas externas. Os verbos liberados dependem do domínio e da
                    ação selecionados nesta credencial.
                  </p>
                  <div className="rounded-md border border-border/70 bg-surface px-3 py-2 text-xs text-text-body">
                    <span className="font-mono">X-API-Key: {tokenReveal ? tokenReveal : "SUA_CHAVE_AQUI"}</span>
                  </div>
                  <div className="space-y-2 rounded-md border border-border/70 bg-surface px-3 py-3 text-xs text-text-body">
                    {permittedEndpoints.length ? (
                      permittedEndpoints.map((item) => (
                        <div key={item.key} className="flex flex-wrap items-center gap-2">
                          <Badge tone="neutral" className="bg-bg-subtle font-mono">
                            {item.method}
                          </Badge>
                          <span className="font-mono">{item.endpoint}</span>
                          <span className="text-muted">{item.label}</span>
                        </div>
                      ))
                    ) : (
                      <p className="text-muted">Selecione permissões para visualizar os endpoints permitidos.</p>
                    )}
                  </div>
                  <div className="rounded-md border border-border/70 bg-surface px-3 py-2 text-xs text-text-body">
                    <pre className="whitespace-pre-wrap font-mono">{`curl -X GET "http://localhost:8000/api/v1/external/catalog/tables" \\\n  -H "X-API-Key: ${tokenReveal ? tokenReveal : "SUA_CHAVE_AQUI"}"`}</pre>
                  </div>
                  <ul className="space-y-1 text-xs text-muted">
                    <li>Leitura, criação, edição e exclusão seguem o menor privilégio possível.</li>
                    <li>Permissões destrutivas ficam destacadas e exigem confirmação antes de salvar.</li>
                    <li>Sem allowlist, a chave depende apenas da política global da API e merece revisão extra quando houver escrita.</li>
                    <li>O segredo completo aparece apenas na criação ou rotação.</li>
                  </ul>
                </div>

                <div className="space-y-3 rounded-lg border border-border/70 bg-bg-subtle/80 p-4 text-sm shadow-sm">
                  <div className="flex items-center gap-2">
                    <AlertTriangle className="h-4 w-4 text-warning-600" />
                    <span className="font-semibold text-text">Uso e auditoria</span>
                  </div>
                  <dl className="space-y-2 text-sm text-text-body">
                    <div className="flex items-center justify-between gap-3">
                      <dt>Token prefixo</dt>
                      <dd className="font-mono">{selectedKey?.token_prefix ? `${selectedKey.token_prefix}...` : "-"}</dd>
                    </div>
                    <div className="flex items-center justify-between gap-3">
                      <dt>Último uso</dt>
                      <dd>{selectedKey?.last_used_at ? formatDateTime(selectedKey.last_used_at) : "Nunca utilizado"}</dd>
                    </div>
                    <div className="flex items-center justify-between gap-3">
                      <dt>Último IP</dt>
                      <dd>{selectedKey?.last_used_ip || "Sem dado"}</dd>
                    </div>
                    <div className="flex items-center justify-between gap-3">
                      <dt>User agent</dt>
                      <dd className="max-w-[220px] truncate text-right">{selectedKey?.last_used_user_agent || "Sem dado"}</dd>
                    </div>
                    <div className="flex items-center justify-between gap-3">
                      <dt>Expiração</dt>
                      <dd>{selectedKey?.expires_at ? formatDateTime(selectedKey.expires_at) : "Sem expiração"}</dd>
                    </div>
                    <div className="flex items-center justify-between gap-3">
                      <dt>Uso total</dt>
                      <dd>{selectedKey?.usage_count ?? 0}</dd>
                    </div>
                    <div className="flex items-center justify-between gap-3">
                      <dt>Criada por</dt>
                      <dd>{selectedKey?.created_by_user_name || selectedKey?.created_by_user_email || "Não informado"}</dd>
                    </div>
                    <div className="flex items-start justify-between gap-3">
                      <dt>Allowlist</dt>
                      <dd className="text-right">
                        {selectedKey?.allowed_ips.length ? (
                          <div className="flex max-w-[240px] flex-wrap justify-end gap-2">
                            {selectedKey.allowed_ips.map((ip) => (
                              <Badge key={ip} tone="neutral" className="bg-bg-subtle font-mono">
                                {ip}
                              </Badge>
                            ))}
                          </div>
                        ) : (
                          "Sem allowlist"
                        )}
                      </dd>
                    </div>
                    <div className="flex items-center justify-between gap-3">
                      <dt>Risco</dt>
                      <dd>
                        <Badge tone={selectedKey ? keyRiskTone(selectedKey.permission_summary.risk_level, selectedKey) : "neutral"}>
                          {selectedKey ? riskLevelLabel(selectedKey.permission_summary.risk_level) : "-"}
                        </Badge>
                      </dd>
                    </div>
                    <div className="flex items-center justify-between gap-3">
                      <dt>Domínios ativos</dt>
                      <dd>{selectedSummary.total}</dd>
                    </div>
                  </dl>
                  <div className="rounded-md border border-border/70 bg-surface px-3 py-3 text-xs text-text-body">
                    <p className="font-semibold text-text">Permissões selecionadas</p>
                    {selectedActions.length ? (
                      <div className="mt-2 flex flex-wrap gap-2">
                        {selectedActions.map((action) => (
                          <Badge key={action.key} tone="neutral" className="bg-bg-subtle">
                            {action.domainLabel} · {ACTION_LABELS[action.action]}
                          </Badge>
                        ))}
                      </div>
                    ) : (
                      <p className="mt-2">Selecione permissões para exibir o resumo da chave.</p>
                    )}
                  </div>
                </div>
              </div>

              {tokenReveal ? (
                <div className="rounded-lg border border-success-200 bg-success-50 p-4 text-sm text-success-900 shadow-sm">
                  <div className="flex items-center justify-between">
                    <span className="font-semibold">Token gerado</span>
                    <Button size="sm" variant="ghost" onClick={handleCopy}>
                      Copiar
                    </Button>
                  </div>
                  <p className="mt-2 break-all font-mono text-xs">{tokenReveal}</p>
                  <p className="mt-2 text-xs text-success-800">Guarde este token agora. Ele não será exibido novamente.</p>
                </div>
              ) : null}

              <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border/60 pt-4">
                <div className="text-xs text-muted">
                  {mode === "new"
                    ? "A chave será exibida apenas após a criação."
                    : "Rotacione a chave quando precisar renovar o segredo."}
                </div>
                <Button onClick={handleSave} disabled={acting !== null}>
                  {mode === "new" ? "Gerar chave" : "Salvar alterações"}
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
