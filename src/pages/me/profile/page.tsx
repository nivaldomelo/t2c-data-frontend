import { Link } from "@/lib/next-shims";
import { FormEvent, useEffect, useMemo, useState } from "react";
import { QRCodeSVG } from "qrcode.react";
import { Badge } from "@/components/ui/badge";
import { Banner } from "@/components/ui/banner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { useTranslation } from "react-i18next";
import { apiRequest } from "@/lib/client-api";
import { LOCALE_OPTIONS, useAppLocale } from "@/lib/i18n-provider";
import { THEMES, type ThemeId, isThemeId, setTheme } from "@/lib/theme";
import {
  Bell,
  BookOpen,
  CircleAlert,
  Copy,
  ExternalLink,
  KeyRound,
  Mail,
  RefreshCw,
  Save,
  ShieldCheck,
  ShieldQuestion,
  UserRound,
} from "lucide-react";

type ChangePasswordResponse = {
  ok: boolean;
  message: string;
};

type MeResponse = {
  id: number;
  name: string | null;
  email: string;
  roles: string[];
  permissions: string[];
  is_admin: boolean;
  unread_notifications: number;
  password_changed_at?: string | null;
  password_expires_at?: string | null;
  password_days_remaining?: number | null;
  ui_theme?: string | null;
};

type NotificationPreferenceResponse = {
  in_app_enabled: boolean;
  email_enabled: boolean;
  governance_enabled: boolean;
  stewardship_enabled: boolean;
  operational_enabled: boolean;
  only_assigned_items: boolean;
  daily_digest_enabled: boolean;
  last_daily_digest_at?: string | null;
  next_daily_digest_at?: string | null;
  last_daily_digest_status?: string | null;
  updated_at?: string | null;
};

type MfaStatusResponse = {
  enabled: boolean;
  setup_pending: boolean;
  issuer: string;
  account_name: string;
  manual_secret?: string | null;
  otpauth_uri?: string | null;
  updated_at?: string | null;
};

type MfaActionResponse = MfaStatusResponse & {
  message: string;
};

type MessageState = { tone: "success" | "danger"; text: string } | null;

type PreferenceKey =
  | "in_app_enabled"
  | "email_enabled"
  | "governance_enabled"
  | "stewardship_enabled"
  | "operational_enabled"
  | "only_assigned_items"
  | "daily_digest_enabled";

function formatDateTime(value?: string | null) {
  if (!value) return "Não disponível";
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return "Não disponível";
  return parsed.toLocaleString("pt-BR");
}

function formatPermissionLabel(permission: string) {
  if (permission === "*") return "Acesso administrativo completo";
  const normalized = permission.toLowerCase();
  const [scopeRaw, actionRaw] = normalized.split(/[.:/]/, 2);
  const scopeLabels: Record<string, string> = {
    catalog: "Catálogo",
    explorer: "Explorer",
    governance: "Governança",
    data_quality: "Data Quality",
    incidents: "Incidentes",
    integrations: "Integrações",
    platform: "Plataforma",
    tags: "Tags",
    glossary: "Glossário",
    certification: "Certificação",
    lineage: "Linhagem",
    privacy: "Privacidade",
    users: "Usuários e perfis",
    me: "Conta pessoal",
    profile: "Conta pessoal",
    admin: "Administração",
    auth: "Autenticação",
  };
  const actionLabels: Record<string, string> = {
    read: "leitura",
    write: "edição",
    create: "criação",
    update: "edição",
    delete: "exclusão",
    manage: "gestão",
    approve: "aprovação",
  };
  const scope = scopeLabels[scopeRaw] ?? scopeRaw.replace(/_/g, " ");
  const action = actionRaw ? actionLabels[actionRaw] ?? actionRaw.replace(/_/g, " ") : "";
  return action ? `${scope} · ${action}` : scope;
}

function groupPermissions(permissions: string[]) {
  const groups = new Map<string, string[]>();
  for (const permission of permissions) {
    if (permission === "*") continue;
    const scope = permission.toLowerCase().split(/[.:/]/, 1)[0] || "outros";
    const label = formatPermissionLabel(permission);
    const current = groups.get(scope) ?? [];
    current.push(label);
    groups.set(scope, current);
  }

  const order = [
    "catalog",
    "explorer",
    "governance",
    "data_quality",
    "incidents",
    "integrations",
    "platform",
    "tags",
    "glossary",
    "certification",
    "lineage",
    "privacy",
    "users",
    "me",
    "admin",
    "auth",
  ];

  return Array.from(groups.entries())
    .sort((left, right) => {
      const leftIndex = order.indexOf(left[0]);
      const rightIndex = order.indexOf(right[0]);
      if (leftIndex !== rightIndex) return (leftIndex === -1 ? 999 : leftIndex) - (rightIndex === -1 ? 999 : rightIndex);
      return left[0].localeCompare(right[0], "pt-BR");
    })
    .map(([key, items]) => ({ key, items }));
}

function digestStatusLabel(value?: string | null) {
  if (!value) return "Ainda não executado";
  if (value === "sent") return "Enviado";
  if (value === "failed") return "Falhou";
  if (value === "empty") return "Sem itens";
  if (value === "skipped") return "Ignorado";
  return value;
}

function digestStatusTone(value?: string | null): "success" | "danger" | "neutral" {
  if (!value) return "neutral";
  if (value === "sent") return "success";
  if (value === "failed") return "danger";
  return "neutral";
}

function StatCard({
  title,
  value,
  description,
  icon,
}: {
  title: string;
  value: string | number;
  description: string;
  icon: React.ReactNode;
}) {
  return (
    <Card className="border-border bg-surface shadow-[0_10px_28px_rgba(15,23,42,0.04)]">
      <CardHeader className="space-y-3 pb-3">
        <div className="flex items-center justify-between gap-3">
          <p className="text-xs uppercase tracking-[0.18em] text-brand-600">{title}</p>
          <div className="rounded-full border border-border bg-bg-subtle p-2 text-text-body">{icon}</div>
        </div>
        <p className="text-2xl font-semibold text-text">{value}</p>
      </CardHeader>
      <CardContent>
        <p className="text-sm leading-6 text-text-body">{description}</p>
      </CardContent>
    </Card>
  );
}

function SectionCard({
  title,
  description,
  children,
  action,
}: {
  title: string;
  description: string;
  children: React.ReactNode;
  action?: React.ReactNode;
}) {
  return (
    <Card className="border-border bg-surface shadow-[0_10px_28px_rgba(15,23,42,0.04)]">
      <CardHeader className="space-y-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 className="text-lg font-semibold text-text">{title}</h2>
            <p className="text-sm text-text-body">{description}</p>
          </div>
          {action}
        </div>
      </CardHeader>
      <CardContent>{children}</CardContent>
    </Card>
  );
}

function ToggleRow({
  label,
  description,
  checked,
  onChange,
  accent = false,
}: {
  label: string;
  description: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
  accent?: boolean;
}) {
  return (
    <label
      className={`flex cursor-pointer items-start gap-3 rounded-2xl border px-4 py-3 transition-colors ${
        accent ? "border-border-strong bg-bg-subtle" : "border-border bg-surface hover:bg-bg-subtle"
      }`}
    >
      <input
        checked={checked}
        className="mt-1 h-4 w-4 rounded border-border-strong"
        onChange={(event) => onChange(event.target.checked)}
        type="checkbox"
      />
      <span className="space-y-1">
        <span className="block text-sm font-medium text-text-body">{label}</span>
        <span className="block text-xs leading-5 text-muted">{description}</span>
      </span>
    </label>
  );
}

function SmallPill({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-border bg-bg-subtle px-4 py-3">
      <p className="text-xs uppercase tracking-[0.16em] text-muted">{label}</p>
      <p className="mt-1 text-sm font-medium text-text">{value}</p>
    </div>
  );
}

function SectionTitle({ label, title, description }: { label: string; title: string; description: string }) {
  return (
    <div className="space-y-2">
      <p className="text-xs uppercase tracking-[0.2em] text-muted">{label}</p>
      <h2 className="text-lg font-semibold text-text">{title}</h2>
      <p className="max-w-3xl text-sm leading-6 text-text-body">{description}</p>
    </div>
  );
}

export default function MyProfilePage() {
  const { t } = useTranslation();
  const { locale, setLocale } = useAppLocale();
  const [me, setMe] = useState<MeResponse | null>(null);
  const [preferences, setPreferences] = useState<NotificationPreferenceResponse | null>(null);
  const [mfaStatus, setMfaStatus] = useState<MfaStatusResponse | null>(null);
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [mfaVerificationCode, setMfaVerificationCode] = useState("");
  const [mfaDisablePassword, setMfaDisablePassword] = useState("");
  const [loadError, setLoadError] = useState("");
  const [preferencesMessage, setPreferencesMessage] = useState<MessageState>(null);
  const [passwordMessage, setPasswordMessage] = useState<MessageState>(null);
  const [mfaMessage, setMfaMessage] = useState<MessageState>(null);
  const [savingPassword, setSavingPassword] = useState(false);
  const [savingPreferences, setSavingPreferences] = useState(false);
  const [savingMfaSetup, setSavingMfaSetup] = useState(false);
  const [savingMfaVerification, setSavingMfaVerification] = useState(false);
  const [savingMfaDisable, setSavingMfaDisable] = useState(false);
  const [loading, setLoading] = useState(true);
  const [theme, setThemeState] = useState<ThemeId>("atual");
  const [themeSaving, setThemeSaving] = useState<ThemeId | null>(null);

  async function chooseTheme(next: ThemeId) {
    setThemeSaving(next);
    setThemeState(next);
    try {
      await setTheme(next);
    } finally {
      setThemeSaving(null);
    }
  }

  async function loadProfile() {
    const [meData, preferenceData, mfaData] = await Promise.all([
      apiRequest<MeResponse>("/v1/me"),
      apiRequest<NotificationPreferenceResponse>("/v1/me/notification-preferences"),
      apiRequest<MfaStatusResponse>("/v1/me/mfa"),
    ]);
    setMe(meData);
    setThemeState(isThemeId(meData.ui_theme) ? meData.ui_theme : "atual");
    setPreferences(preferenceData);
    setMfaStatus(mfaData);
  }

  useEffect(() => {
    let mounted = true;
    void (async () => {
      try {
        await loadProfile();
      } catch (error) {
        if (mounted) setLoadError((error as Error).message || "Não foi possível carregar o perfil.");
      } finally {
        if (mounted) setLoading(false);
      }
    })();
    return () => {
      mounted = false;
    };
  }, []);

  async function copyToClipboard(value: string, successMessage: string) {
    if (!value) return;
    try {
      await navigator.clipboard.writeText(value);
      setMfaMessage({ tone: "success", text: successMessage });
    } catch {
      setMfaMessage({ tone: "danger", text: "Não foi possível copiar o valor." });
    }
  }

  async function onSubmitPassword(event: FormEvent) {
    event.preventDefault();
    setPasswordMessage(null);

    if (newPassword.length < 12) {
      setPasswordMessage({ tone: "danger", text: "A nova senha precisa ter pelo menos 12 caracteres e combinar 3 de 4 tipos: maiúsculas, minúsculas, números e símbolos." });
      return;
    }
    if (newPassword !== confirmPassword) {
      setPasswordMessage({ tone: "danger", text: "As senhas não conferem." });
      return;
    }

    setSavingPassword(true);
    try {
      const result = await apiRequest<ChangePasswordResponse>("/v1/me/change-password", {
        method: "POST",
        body: JSON.stringify({ current_password: currentPassword, new_password: newPassword }),
      });
      setPasswordMessage({ tone: "success", text: result.message || "Senha atualizada com sucesso." });
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
    } catch (error) {
      setPasswordMessage({ tone: "danger", text: (error as Error).message || "Não foi possível alterar a senha." });
    } finally {
      setSavingPassword(false);
    }
  }

  async function setupMfa() {
    setMfaMessage(null);
    setSavingMfaSetup(true);
    try {
      const result = await apiRequest<MfaActionResponse>("/v1/me/mfa/setup", {
        method: "POST",
      });
      setMfaStatus(result);
      setMfaVerificationCode("");
      setMfaDisablePassword("");
      setMfaMessage({ tone: "success", text: result.message || "MFA configurada. Use o Google Authenticator para confirmar o código." });
    } catch (error) {
      setMfaMessage({ tone: "danger", text: (error as Error).message || "Não foi possível iniciar a configuração do MFA." });
    } finally {
      setSavingMfaSetup(false);
    }
  }

  async function verifyMfa() {
    if (!mfaVerificationCode.trim()) {
      setMfaMessage({ tone: "danger", text: "Informe o código de 6 dígitos do Google Authenticator." });
      return;
    }
    setMfaMessage(null);
    setSavingMfaVerification(true);
    try {
      const result = await apiRequest<MfaActionResponse>("/v1/me/mfa/verify", {
        method: "POST",
        body: JSON.stringify({ code: mfaVerificationCode.trim() }),
      });
      setMfaStatus(result);
      setMfaVerificationCode("");
      setMfaMessage({ tone: "success", text: result.message || "MFA ativada com sucesso." });
      await loadProfile();
    } catch (error) {
      setMfaMessage({ tone: "danger", text: (error as Error).message || "Não foi possível verificar o código MFA." });
    } finally {
      setSavingMfaVerification(false);
    }
  }

  async function disableMfa() {
    if (!mfaDisablePassword.trim()) {
      setMfaMessage({ tone: "danger", text: "Informe sua senha atual para desativar o MFA." });
      return;
    }
    setMfaMessage(null);
    setSavingMfaDisable(true);
    try {
      const result = await apiRequest<MfaActionResponse>("/v1/me/mfa/disable", {
        method: "POST",
        body: JSON.stringify({ current_password: mfaDisablePassword }),
      });
      setMfaStatus(result);
      setMfaDisablePassword("");
      setMfaVerificationCode("");
      setMfaMessage({ tone: "success", text: result.message || "MFA desativada com sucesso." });
      await loadProfile();
    } catch (error) {
      setMfaMessage({ tone: "danger", text: (error as Error).message || "Não foi possível desativar o MFA." });
    } finally {
      setSavingMfaDisable(false);
    }
  }

  async function savePreferences() {
    if (!preferences) return;
    setPreferencesMessage(null);
    setSavingPreferences(true);
    try {
      const updated = await apiRequest<NotificationPreferenceResponse>("/v1/me/notification-preferences", {
        method: "PUT",
        body: JSON.stringify({
          in_app_enabled: preferences.in_app_enabled,
          email_enabled: preferences.email_enabled,
          governance_enabled: preferences.governance_enabled,
          stewardship_enabled: preferences.stewardship_enabled,
          operational_enabled: preferences.operational_enabled,
          only_assigned_items: preferences.only_assigned_items,
          daily_digest_enabled: preferences.daily_digest_enabled,
        }),
      });
      setPreferences(updated);
      await loadProfile();
      setPreferencesMessage({ tone: "success", text: "Preferências de notificação atualizadas." });
    } catch (error) {
      setPreferencesMessage({ tone: "danger", text: (error as Error).message || "Não foi possível salvar as preferências." });
    } finally {
      setSavingPreferences(false);
    }
  }

  const permissionGroups = useMemo(() => groupPermissions(me?.permissions ?? []), [me]);
  const hasWildcardPermission = Boolean(me?.permissions?.includes("*"));
  const activeNotificationChannels = useMemo(() => {
    if (!preferences) return 0;
    return [preferences.in_app_enabled, preferences.email_enabled].filter(Boolean).length;
  }, [preferences]);
  const activeNotificationCategories = useMemo(() => {
    if (!preferences) return 0;
    return [preferences.governance_enabled, preferences.stewardship_enabled, preferences.operational_enabled].filter(Boolean).length;
  }, [preferences]);
  const mfaSummaryValue = loading
    ? "..."
    : mfaStatus?.enabled
      ? "MFA ativa"
      : mfaStatus?.setup_pending
        ? "Configuração em andamento"
        : "MFA desativada";
  const mfaSummaryDescription = loading
    ? "Carregando autenticação..."
    : mfaStatus?.enabled
      ? "Google Authenticator validado para a conta."
      : mfaStatus?.setup_pending
        ? "Segredo gerado e aguardando confirmação."
        : "Segundo fator ainda não configurado.";
  const digestIsActive = Boolean(preferences?.daily_digest_enabled);
  const unreadNotifications = me?.unread_notifications ?? 0;
  const summaryCards = [
    {
      title: "Usuário",
      value: loading ? "Carregando..." : me?.name || "Não informado",
      description: me?.email || "Endereço principal da conta",
      icon: <UserRound className="h-4 w-4" />,
    },
    {
      title: "Perfil",
      value: loading ? "..." : me?.is_admin ? "Administrador" : me?.roles?.join(", ") || "Não definido",
      description: me?.is_admin ? "Acesso amplo às áreas administrativas e operacionais." : "Papéis vinculados à sua conta.",
      icon: <ShieldCheck className="h-4 w-4" />,
    },
    {
      title: "Inbox",
      value: loading ? "..." : unreadNotifications,
      description: "Notificações não lidas da sua conta.",
      icon: <Bell className="h-4 w-4" />,
    },
    {
      title: "Notificações",
      value: loading || !preferences ? "..." : `${activeNotificationChannels} canais`,
        description: loading || !preferences ? "Carregando preferências..." : `${activeNotificationCategories} categorias ativas`,
        icon: <Mail className="h-4 w-4" />,
      },
    {
      title: "Autenticação",
      value: mfaSummaryValue,
      description: mfaSummaryDescription,
      icon: <KeyRound className="h-4 w-4" />,
    },
  ];

  return (
    <div className="space-y-6">
      <section className="space-y-4">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 rounded-full border border-border bg-surface px-3 py-1 text-xs font-medium uppercase tracking-[0.18em] text-brand-600">
              <UserRound className="h-3.5 w-3.5" />
              Meu perfil
            </div>
            <div className="space-y-2">
              <h1 className="text-2xl font-semibold text-text">Meu perfil</h1>
              <p className="max-w-3xl text-sm leading-6 text-text-body">
                Conta, acesso, preferências e segurança pessoal. Revise seus dados, entenda seu nível de acesso, configure como deseja receber
                notificações e mantenha sua senha atualizada.
              </p>
              <p className="max-w-3xl text-sm leading-6 text-muted">
                As preferências desta tela são pessoais e não alteram a operação interna do Inbox.
              </p>
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            <Button asChild variant="outline">
              <Link href="/inbox">Abrir Inbox</Link>
            </Button>
            <Button asChild variant="outline">
              <Link href="/audit">Ver auditoria</Link>
            </Button>
          </div>
        </div>

        {loadError ? <Banner description={loadError} tone="error" title="Não foi possível carregar o perfil" /> : null}

        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-5">
          {summaryCards.map((card) => (
            <StatCard key={card.title} {...card} />
          ))}
        </div>
      </section>

      <section className="space-y-3">
        <SectionTitle
          description="Resumo da conta e do nível de acesso com leitura mais clara para uso diário."
          label="Visão geral"
          title="Identidade e acesso"
        />
        <div className="grid gap-4 xl:grid-cols-2">
          <Card className="border-border bg-surface shadow-[0_10px_28px_rgba(15,23,42,0.04)]">
            <CardHeader className="space-y-2">
              <h3 className="text-base font-semibold text-text">Identidade</h3>
              <p className="text-sm text-text-body">Esses dados identificam sua conta dentro da plataforma.</p>
            </CardHeader>
            <CardContent>
              {loading ? (
                <p className="text-sm text-muted">Carregando identidade...</p>
              ) : me ? (
                <div className="grid gap-3 md:grid-cols-2">
                  <SmallPill label="Nome" value={me.name || "-"} />
                  <SmallPill label="E-mail" value={me.email} />
                  <SmallPill label="Perfil" value={me.is_admin ? "Administrador" : me.roles.join(", ") || "Usuário"} />
                  <SmallPill label="Último acesso" value="Não disponível" />
                </div>
              ) : null}
              {me?.is_admin ? (
                <div className="mt-4 rounded-2xl border border-warning-200 bg-warning-50/70 p-4">
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge tone="warning">Administrador</Badge>
                    <span className="text-sm font-medium text-warning-700">Acesso amplo</span>
                  </div>
                  <p className="mt-2 text-sm leading-6 text-warning-700/90">
                    Este perfil possui acesso amplo às áreas administrativas e operacionais da plataforma. Use esse nível com cuidado em ações
                    sensíveis.
                  </p>
                </div>
              ) : null}
            </CardContent>
          </Card>

          <Card className="border-border bg-surface shadow-[0_10px_28px_rgba(15,23,42,0.04)]">
            <CardHeader className="space-y-2">
              <h3 className="text-base font-semibold text-text">Permissões</h3>
              <p className="text-sm text-text-body">
                Se o backend retornar apenas “*”, isso significa acesso administrativo global e não uma lista expandida por módulo.
              </p>
            </CardHeader>
            <CardContent>
              {loading ? (
                <p className="text-sm text-muted">Carregando permissões...</p>
              ) : me?.permissions?.includes("*") ? (
                <div className="space-y-4">
                  <div className="rounded-2xl border border-warning-200 bg-warning-50/70 p-4">
                    <div className="flex flex-wrap items-center gap-2">
                      <Badge tone="warning">Wildcard “*”</Badge>
                      <span className="text-sm font-medium text-warning-700">Acesso administrativo completo</span>
                    </div>
                    <p className="mt-2 text-sm leading-6 text-warning-700/90">
                      O backend retornou permissão global. A expansão por módulo não está disponível neste payload e pode ser adicionada em fase
                      futura.
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {[
                      "Catálogo",
                      "Governança",
                      "Data Quality",
                      "Incidentes",
                      "Integrações",
                      "Usuários e perfis",
                      "Plataforma",
                      "Segurança",
                    ].map((label) => (
                      <Badge key={label} tone="accent">
                        {label}
                      </Badge>
                    ))}
                  </div>
                </div>
              ) : permissionGroups.length ? (
                <div className="space-y-4">
                  {permissionGroups.map((group) => (
                    <div className="rounded-2xl border border-border bg-bg-subtle/70 p-4" key={group.key}>
                      <p className="text-xs uppercase tracking-[0.18em] text-brand-600">{group.key}</p>
                      <div className="mt-3 flex flex-wrap gap-2">
                        {group.items.map((permission) => (
                          <Badge key={permission} tone="neutral">
                            {permission}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-muted">Sem permissões detalhadas no payload atual.</p>
              )}
            </CardContent>
          </Card>
        </div>
      </section>

      <section className="space-y-4">
        <SectionTitle
          description="Escolha como quer ser avisado e mantenha os sinais pessoais separados das regras oficiais da plataforma."
          label="Preferências"
          title="Preferências de notificação"
        />
        {preferencesMessage ? (
          <Banner
            description={preferencesMessage.text}
            tone={preferencesMessage.tone === "success" ? "success" : "error"}
            title={preferencesMessage.tone === "success" ? "Concluído" : "Erro ao salvar"}
          />
        ) : null}

        <SectionCard
          description="Escolha o tema visual do sistema. A preferência fica salva no seu perfil e acompanha você."
          title="Aparência (tema)"
        >
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            {THEMES.map((item) => {
              const active = theme === item.id;
              return (
                <button
                  key={item.id}
                  type="button"
                  disabled={themeSaving !== null}
                  onClick={() => void chooseTheme(item.id)}
                  className={`rounded-2xl border p-4 text-left transition ${
                    active
                      ? "border-brand-500 bg-brand-50 ring-2 ring-brand-500/30"
                      : "border-border bg-surface hover:border-border-strong"
                  }`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-sm font-semibold text-text">{item.label}</span>
                    <span className="flex gap-1">
                      {item.swatches.map((color) => (
                        <span key={color} className="h-4 w-4 rounded-full border border-black/10" style={{ background: color }} />
                      ))}
                    </span>
                  </div>
                  <p className="mt-2 text-xs leading-5 text-muted">{item.description}</p>
                  {active ? <p className="mt-2 text-[11px] font-semibold uppercase tracking-wide text-brand-700">Ativo</p> : null}
                </button>
              );
            })}
          </div>
          <div className="mt-4 border-t border-border pt-4">
            <p className="text-sm font-medium text-text">Idioma</p>
            <p className="mt-0.5 text-xs text-muted">Escolha o idioma da interface.</p>
            <div className="mt-2 flex flex-wrap gap-2">
              {LOCALE_OPTIONS.map((option) => {
                const active = locale === option.id;
                return (
                  <button
                    key={option.id}
                    type="button"
                    onClick={() => setLocale(option.id)}
                    className={`rounded-xl border px-3 py-1.5 text-sm transition ${
                      active
                        ? "border-brand-500 bg-brand-50 text-brand-700"
                        : "border-border bg-surface text-text-body hover:border-border-strong"
                    }`}
                  >
                    {t(option.labelKey)}
                  </button>
                );
              })}
            </div>
          </div>
        </SectionCard>

        <SectionCard
          action={
            <Button disabled={!preferences || savingPreferences} onClick={() => void savePreferences()} variant="outline">
              {savingPreferences ? <RefreshCw className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
              Salvar preferências
            </Button>
          }
          description="Essas escolhas são pessoais e controlam como você quer ser avisado. Elas não substituem os canais oficiais de time."
          title="Canal, categoria e escopo"
        >
          {preferences ? (
            <div className="space-y-4">
              <div className="rounded-2xl border border-warning-200 bg-warning-50/70 p-4 text-sm leading-6 text-warning-700">
                Canais pessoais avançados foram congelados nesta fase. Para canais oficiais de equipe, use Notificações externas.
              </div>

              <div className="grid gap-4 lg:grid-cols-3">
                <div className="space-y-3 rounded-2xl border border-border p-4">
                  <div>
                    <h3 className="text-sm font-semibold text-text">Canais</h3>
                    <p className="text-sm text-text-body">Onde você quer receber as notificações.</p>
                  </div>
                  <div className="space-y-2">
                    <ToggleRow
                      checked={preferences.in_app_enabled}
                      description="Mostra notificações dentro do produto."
                      label="Inbox no produto"
                      onChange={(checked) => setPreferences((current) => (current ? { ...current, in_app_enabled: checked } : current))}
                    />
                    <ToggleRow
                      checked={preferences.email_enabled}
                      description="Envia alertas por e-mail."
                      label="E-mail"
                      onChange={(checked) => setPreferences((current) => (current ? { ...current, email_enabled: checked } : current))}
                    />
                    <div className="rounded-2xl border border-border bg-bg-subtle/70 p-3 text-sm leading-6 text-text-body">
                      Canais pessoais avançados foram removidos nesta fase. O Inbox interno continua ativo e o e-mail permanece disponível.
                    </div>
                  </div>
                </div>

                <div className="space-y-3 rounded-2xl border border-border p-4">
                  <div>
                    <h3 className="text-sm font-semibold text-text">Categorias</h3>
                    <p className="text-sm text-text-body">Quais tipos de sinal você deseja receber.</p>
                  </div>
                  <div className="space-y-2">
                    <ToggleRow
                      checked={preferences.governance_enabled}
                      description="Mudanças de owner, classificação e governança."
                      label="Governança"
                      onChange={(checked) => setPreferences((current) => (current ? { ...current, governance_enabled: checked } : current))}
                    />
                    <ToggleRow
                      checked={preferences.stewardship_enabled}
                      description="Solicitações e aprovações de stewardship."
                      label="Stewardship"
                      onChange={(checked) => setPreferences((current) => (current ? { ...current, stewardship_enabled: checked } : current))}
                    />
                    <ToggleRow
                      checked={preferences.operational_enabled}
                      description="Sinais de operação, ingestão e qualidade."
                      label="Operação"
                      onChange={(checked) => setPreferences((current) => (current ? { ...current, operational_enabled: checked } : current))}
                    />
                  </div>
                </div>

                <div className="space-y-3 rounded-2xl border border-border p-4">
                  <div>
                    <h3 className="text-sm font-semibold text-text">Escopo</h3>
                    <p className="text-sm text-text-body">Controle fino da audiência dos alertas.</p>
                  </div>
                  <ToggleRow
                    accent
                    checked={preferences.only_assigned_items}
                    description="Receba apenas itens nos quais você é responsável, aprovador ou owner."
                    label="Somente itens atribuídos a mim"
                    onChange={(checked) => setPreferences((current) => (current ? { ...current, only_assigned_items: checked } : current))}
                  />
                  <ToggleRow
                    accent
                    checked={preferences.daily_digest_enabled}
                    description="Agrupa itens relevantes em um resumo periódico."
                    label="Digest diário"
                    onChange={(checked) => setPreferences((current) => (current ? { ...current, daily_digest_enabled: checked } : current))}
                  />
                </div>
              </div>

              <div className="grid gap-4 lg:grid-cols-2">
                <div className="space-y-3 rounded-2xl border border-border p-4">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div>
                      <h3 className="text-sm font-semibold text-text">Digest diário</h3>
                      <p className="text-sm text-text-body">Resumo periódico das notificações importantes.</p>
                    </div>
                    <Badge tone={digestIsActive ? "success" : "neutral"}>{digestIsActive ? "Ativo" : "Desativado"}</Badge>
                  </div>
                  <div className="grid gap-3 md:grid-cols-3">
                    <SmallPill label="Último digest" value={formatDateTime(preferences.last_daily_digest_at)} />
                    <SmallPill label="Próximo envio" value={formatDateTime(preferences.next_daily_digest_at)} />
                    <SmallPill label="Status operacional" value={digestStatusLabel(preferences.last_daily_digest_status)} />
                  </div>
                  <div className={`rounded-2xl border px-4 py-3 text-xs leading-5 ${digestStatusTone(preferences.last_daily_digest_status) === "danger" ? "border-red-200 bg-red-50 text-red-800" : digestStatusTone(preferences.last_daily_digest_status) === "success" ? "border-success-200 bg-success-50 text-success-700" : "border-border bg-bg-subtle text-text-body"}`}>
                    {digestIsActive
                      ? "O digest pessoal agrupa seus sinais no horário configurado e usa os canais pessoais atualmente disponíveis."
                      : "O digest está desativado. O status detalhado aparece quando houver a primeira execução."
                    }
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <p className="text-sm text-muted">Carregando preferências...</p>
          )}
        </SectionCard>
      </section>

      <section className="space-y-4">
        <SectionTitle
          description="Troca de senha local e configuração do segundo fator com mensagens claras e sem expor credenciais salvas."
          label="Segurança"
          title="Segurança da conta"
        />
        <div className="grid gap-4 lg:grid-cols-[1.4fr_0.9fr]">
          <form className="space-y-3 rounded-2xl border border-border bg-surface p-4 shadow-[0_10px_28px_rgba(15,23,42,0.04)]" onSubmit={onSubmitPassword}>
            <div className="space-y-1">
              <h3 className="text-base font-semibold text-text">Trocar senha</h3>
              <p className="text-sm text-text-body">Use uma senha forte e exclusiva para proteger sua conta. A troca é obrigatória a cada 90 dias.</p>
            </div>
            {me?.password_expires_at ? (
              <div
                className={`rounded-xl border px-3 py-2 text-sm ${
                  (me.password_days_remaining ?? 99) <= 10
                    ? "border-warning-200 bg-warning-50 text-warning-700"
                    : "border-border bg-bg-subtle text-text-body"
                }`}
              >
                Prazo final para troca de senha:{" "}
                <strong>{new Date(me.password_expires_at).toLocaleDateString("pt-BR")}</strong>
                {typeof me.password_days_remaining === "number"
                  ? me.password_days_remaining > 0
                    ? ` — faltam ${me.password_days_remaining} dia(s)`
                    : " — expirada"
                  : ""}
              </div>
            ) : null}
            <div className="grid gap-3">
              <Input
                autoComplete="current-password"
                onChange={(e) => setCurrentPassword(e.target.value)}
                placeholder="Senha atual"
                required
                type="password"
                value={currentPassword}
              />
              <Input
                autoComplete="new-password"
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="Nova senha"
                required
                type="password"
                value={newPassword}
              />
              <Input
                autoComplete="new-password"
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Confirmar nova senha"
                required
                type="password"
                value={confirmPassword}
              />
            </div>
            <p className="text-xs leading-5 text-muted">
              A nova senha precisa ter ao menos 12 caracteres e combinar 3 de 4 tipos: maiúsculas, minúsculas, números e símbolos. Após a troca, você pode precisar autenticar novamente.
            </p>
            {passwordMessage ? (
              <Banner
                description={passwordMessage.text}
                tone={passwordMessage.tone === "success" ? "success" : "error"}
                title={passwordMessage.tone === "success" ? "Senha atualizada" : "Não foi possível atualizar a senha"}
              />
            ) : null}
            <Button disabled={savingPassword || newPassword.length < 12 || newPassword !== confirmPassword} type="submit">
              {savingPassword ? <RefreshCw className="mr-2 h-4 w-4 animate-spin" /> : <KeyRound className="mr-2 h-4 w-4" />}
              Alterar senha
            </Button>
          </form>
          <div className="space-y-4">
            <Card className="border-border bg-surface shadow-[0_10px_28px_rgba(15,23,42,0.04)]">
              <CardHeader className="space-y-3">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <h3 className="text-base font-semibold text-text">Autenticação em dois fatores</h3>
                    <p className="text-sm text-text-body">
                      Compatível com Google Authenticator e outros apps TOTP. O segundo fator é configurado nesta tela.
                    </p>
                  </div>
                  <Badge tone={mfaStatus?.enabled ? "success" : mfaStatus?.setup_pending ? "warning" : "neutral"}>
                    {mfaStatus?.enabled ? "Ativa" : mfaStatus?.setup_pending ? "Configuração em andamento" : "Desativada"}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                {mfaMessage ? (
                  <Banner
                    description={mfaMessage.text}
                    tone={mfaMessage.tone === "success" ? "success" : "error"}
                    title={mfaMessage.tone === "success" ? "Concluído" : "Erro"}
                  />
                ) : null}

                <div className="rounded-2xl border border-border bg-bg-subtle/70 p-4">
                  <p className="text-sm font-medium text-text">Estado atual</p>
                  <p className="mt-1 text-sm leading-6 text-text-body">
                    {mfaStatus?.enabled
                      ? "A conta já exige um código TOTP na autenticação."
                      : mfaStatus?.setup_pending
                        ? "O segredo já foi gerado. Adicione-o ao Google Authenticator e confirme o código de 6 dígitos."
                        : "Nenhum segundo fator foi configurado ainda."}
                  </p>
                  <p className="mt-2 text-xs leading-5 text-muted">
                    O fluxo usa TOTP de 6 dígitos e funciona com Google Authenticator ou aplicativos equivalentes.
                  </p>
                </div>

                {!mfaStatus?.enabled ? (
                  <Button
                    className="w-full justify-center"
                    disabled={savingMfaSetup}
                    onClick={() => void setupMfa()}
                    type="button"
                    variant="outline"
                  >
                    {savingMfaSetup ? <RefreshCw className="mr-2 h-4 w-4 animate-spin" /> : <KeyRound className="mr-2 h-4 w-4" />}
                    {mfaStatus?.setup_pending ? "Gerar novo segredo" : "Gerar segredo"}
                  </Button>
                ) : null}

                {mfaStatus?.setup_pending ? (
                  <div className="space-y-3 rounded-2xl border border-warning-200 bg-warning-50/70 p-4">
                    <div>
                      <p className="text-sm font-medium text-amber-950">Escaneie com o app autenticador</p>
                      <p className="text-xs leading-5 text-warning-700/80">
                        Abra o Google Authenticator, Microsoft Authenticator, Authy ou app compatível e escaneie este QR Code.
                      </p>
                    </div>

                    {mfaStatus.otpauth_uri ? (
                      <div className="flex flex-col items-center justify-center rounded-2xl border border-warning-200 bg-surface p-4">
                        <div className="rounded-2xl border border-border bg-surface p-3 shadow-sm">
                          <QRCodeSVG
                            bgColor="#ffffff"
                            fgColor="#0f172a"
                            includeMargin={true}
                            level="M"
                            size={192}
                            value={mfaStatus.otpauth_uri}
                          />
                        </div>
                        <p className="mt-3 text-center text-xs leading-5 text-text-body">
                          Se não conseguir escanear, copie o secret manual abaixo.
                        </p>
                      </div>
                    ) : null}

                    <div className="grid gap-3 md:grid-cols-2">
                      <div className="rounded-2xl border border-warning-200 bg-surface p-3">
                        <p className="text-xs uppercase tracking-[0.18em] text-warning-700/70">Secret manual</p>
                        <p className="mt-2 break-all font-mono text-sm text-text">{mfaStatus.manual_secret || "-"}</p>
                        <Button
                          className="mt-3"
                          disabled={!mfaStatus.manual_secret}
                          onClick={() => void copyToClipboard(mfaStatus.manual_secret || "", "Secret copiado para a área de transferência.")}
                          size="sm"
                          type="button"
                          variant="ghost"
                        >
                          <Copy className="mr-2 h-4 w-4" />
                          Copiar secret
                        </Button>
                      </div>
                      <div className="rounded-2xl border border-warning-200 bg-surface p-3">
                        <p className="text-xs uppercase tracking-[0.18em] text-warning-700/70">URI otpauth</p>
                        <p className="mt-2 break-all font-mono text-xs leading-5 text-text-body">{mfaStatus.otpauth_uri || "-"}</p>
                        <Button
                          className="mt-3"
                          disabled={!mfaStatus.otpauth_uri}
                          onClick={() => void copyToClipboard(mfaStatus.otpauth_uri || "", "URI copiada para a área de transferência.")}
                          size="sm"
                          type="button"
                          variant="ghost"
                        >
                          <Copy className="mr-2 h-4 w-4" />
                          Copiar URI
                        </Button>
                      </div>
                    </div>
                  </div>
                ) : null}

                <div className="grid gap-3 md:grid-cols-[1fr_auto]">
                  <Input
                    autoComplete="one-time-code"
                    inputMode="numeric"
                    maxLength={6}
                    onChange={(event) => setMfaVerificationCode(event.target.value.replace(/\D/g, ""))}
                    placeholder="Código de 6 dígitos"
                    value={mfaVerificationCode}
                  />
                  <Button
                    disabled={savingMfaVerification || !mfaVerificationCode.trim()}
                    onClick={() => void verifyMfa()}
                    type="button"
                  >
                    {savingMfaVerification ? <RefreshCw className="mr-2 h-4 w-4 animate-spin" /> : <KeyRound className="mr-2 h-4 w-4" />}
                    Confirmar código
                  </Button>
                </div>

                <div className="grid gap-3 md:grid-cols-[1fr_auto]">
                  <Input
                    autoComplete="current-password"
                    onChange={(event) => setMfaDisablePassword(event.target.value)}
                    placeholder="Senha atual para desativar o MFA"
                    type="password"
                    value={mfaDisablePassword}
                  />
                  <Button
                    disabled={savingMfaDisable || !mfaDisablePassword.trim() || !mfaStatus?.enabled}
                    onClick={() => void disableMfa()}
                    type="button"
                    variant="outline"
                  >
                    {savingMfaDisable ? <RefreshCw className="mr-2 h-4 w-4 animate-spin" /> : <CircleAlert className="mr-2 h-4 w-4" />}
                    Desativar MFA
                  </Button>
                </div>
              </CardContent>
            </Card>

            <div className="space-y-3 rounded-2xl border border-border bg-bg-subtle/70 p-4">
              <div className="flex items-center gap-2">
                <CircleAlert className="h-4 w-4 text-text-body" />
                <h3 className="text-sm font-semibold text-text">Boas práticas</h3>
              </div>
              <ul className="space-y-3 text-sm leading-6 text-text-body">
                <li>• Use senha exclusiva e não compartilhe suas credenciais.</li>
                <li>• Se você é admin, revise ações sensíveis com cuidado.</li>
                <li>• O segundo fator fica nesta tela para uso pessoal e não substitui controles corporativos como SSO.</li>
              </ul>
              <div className="rounded-2xl border border-border bg-surface p-4">
                <p className="text-xs uppercase tracking-[0.18em] text-brand-600">Conta segura</p>
                <p className="mt-2 text-sm leading-6 text-text-body">
                  A tela permite manter a senha, o MFA e as preferências pessoais atualizadas. Segredos e tokens são mascarados na interface.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="space-y-4">
        <SectionTitle
          description="Atalhos para revisar acesso, notificações e integrações relacionadas à sua conta."
          label="Jornadas"
          title="Jornadas principais do perfil"
        />
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {[
            { description: "Ver alertas pessoais e abrir a fila do dia a dia.", href: "/inbox", label: "Inbox", tone: "accent" },
            { description: "Revisar perfis, papéis e acesso administrativo.", href: "/admin/users", label: "Usuários e perfis", tone: "success" },
            { description: "Gerenciar chaves externas de integração.", href: "/integrations/api", label: "API externa", tone: "warning" },
            { description: "Revisar responsáveis dos ativos do catálogo.", href: "/data-owners", label: "Owners", tone: "success" },
            { description: "Abrir trilha de auditoria e atividade.", href: "/audit", label: "Auditoria", tone: "accent" },
            { description: "Acompanhar incidentes e ações operacionais.", href: "/incidents", label: "Incidentes", tone: "warning" },
            { description: "Abrir o Explorer para revisar ativos.", href: "/explorer", label: "Explorer", tone: "accent" },
          ].map((journey) => (
            <Card className="border-border bg-surface shadow-[0_10px_28px_rgba(15,23,42,0.04)]" key={journey.label}>
              <CardHeader className="space-y-2 pb-3">
                <Badge tone={journey.tone as "success" | "accent" | "warning" | "danger" | "neutral"}>{journey.label}</Badge>
                <p className="text-sm leading-6 text-text-body">{journey.description}</p>
              </CardHeader>
              <CardContent>
                <Button asChild className="w-full justify-start" size="sm" variant="outline">
                  <Link href={journey.href}>
                    <ExternalLink className="mr-2 h-4 w-4" />
                    Abrir
                  </Link>
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      <section className="grid gap-3 rounded-2xl border border-border bg-surface p-4 shadow-[0_10px_28px_rgba(15,23,42,0.04)] md:grid-cols-2 xl:grid-cols-4">
        <div className="flex items-center gap-3 rounded-2xl border border-border bg-bg-subtle px-4 py-3">
          <ShieldQuestion className="h-4 w-4 text-text-body" />
          <div>
            <p className="text-xs uppercase tracking-[0.18em] text-brand-600">Permissões legíveis</p>
            <p className="text-sm text-text-body">{hasWildcardPermission ? "Wildcard administrativo traduzido para linguagem de produto." : "Permissões agrupadas por módulo quando disponíveis."}</p>
          </div>
        </div>
        <div className="flex items-center gap-3 rounded-2xl border border-border bg-bg-subtle px-4 py-3">
          <BookOpen className="h-4 w-4 text-text-body" />
          <div>
            <p className="text-xs uppercase tracking-[0.18em] text-brand-600">Configuração pessoal</p>
            <p className="text-sm text-text-body">Notificações e senha são geridas nesta tela; canais oficiais ficam em integrações.</p>
          </div>
        </div>
        <div className="flex items-center gap-3 rounded-2xl border border-border bg-bg-subtle px-4 py-3">
          <Mail className="h-4 w-4 text-text-body" />
          <div>
            <p className="text-xs uppercase tracking-[0.18em] text-brand-600">Digest</p>
            <p className="text-sm text-text-body">{digestIsActive ? "Ativo e monitorado no perfil." : "Desativado ou ainda sem execução registrada."}</p>
          </div>
        </div>
      </section>
    </div>
  );
}
