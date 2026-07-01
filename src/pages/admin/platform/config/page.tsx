import { useEffect, useState } from "react";
import { Server, Database, BarChart3, SlidersHorizontal, ShieldCheck, Loader2, CheckCircle2, XCircle } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { EmptyState } from "@/components/ui/empty-state";
import { useAuth } from "@/lib/auth";
import { apiRequest } from "@/lib/client-api";

type Effective = {
  spark_master_url?: string | null;
  spark_results_dir?: string | null;
  spark_jobs_dir?: string | null;
  spark_driver_host?: string | null;
  metabase_enabled: boolean;
  metabase_base_url?: string | null;
  control_db_host?: string | null;
  control_db_name?: string | null;
  control_db_schema?: string | null;
  dq_execution_engine?: string | null;
};

type PlatformSettings = {
  [key: string]: unknown;
  metabase_auth_secret_set: boolean;
  control_db_password_set: boolean;
  effective: Effective;
  updated_at?: string | null;
  updated_by_user_id?: number | null;
};

type TestResult = { ok: boolean; target: string; detail: string; latency_ms?: number | null };

type FieldKind = "text" | "number" | "secret" | "tribool";
type FieldDef = { key: string; label: string; hint?: string; kind: FieldKind; placeholder?: string };

type TabKey = "spark" | "metabase" | "db" | "advanced";

const TABS: Array<{ key: TabKey; label: string; icon: React.ComponentType<{ className?: string }> }> = [
  { key: "spark", label: "Spark", icon: Server },
  { key: "metabase", label: "Metabase", icon: BarChart3 },
  { key: "db", label: "Banco de controle", icon: Database },
  { key: "advanced", label: "Avançado", icon: SlidersHorizontal },
];

const SPARK_FIELDS: FieldDef[] = [
  { key: "spark_master_url", label: "Master URL", hint: "Ex.: spark://spark-master:7077", kind: "text" },
  { key: "spark_results_dir", label: "Diretório de resultados", hint: "Local (ex.: /data/spark-results) ou S3 (s3a://bucket/prefixo).", kind: "text" },
  { key: "spark_jobs_dir", label: "Diretório de jobs", hint: "Onde ficam os jobs PySpark no driver.", kind: "text" },
  { key: "spark_local_jars_dir", label: "Diretório de JARs", hint: "Drivers JDBC locais (--jars).", kind: "text" },
  { key: "spark_driver_host", label: "Driver host", hint: "Host do driver alcançável pelos executores.", kind: "text" },
  { key: "spark_driver_memory", label: "Memória do driver", hint: "Ex.: 1g, 2g.", kind: "text" },
  { key: "spark_executor_memory", label: "Memória do executor", hint: "Ex.: 1g, 2g.", kind: "text" },
  { key: "spark_submit_timeout_seconds", label: "Timeout do submit (s)", hint: "Tempo máximo do spark-submit.", kind: "number" },
  { key: "spark_packages_enabled", label: "Usar --packages", hint: "Baixar pacotes via Maven em vez de JARs locais.", kind: "tribool" },
  { key: "spark_packages", label: "Packages", hint: "Coordenadas Maven (quando --packages ativo).", kind: "text" },
];

const METABASE_FIELDS: FieldDef[] = [
  { key: "metabase_enabled", label: "Integração habilitada", kind: "tribool" },
  { key: "metabase_base_url", label: "Base URL", hint: "Ex.: https://metabase.turn2c.com", kind: "text" },
  { key: "metabase_auth_type", label: "Tipo de auth", hint: "Ex.: session, api_key.", kind: "text" },
  { key: "metabase_auth_username", label: "Usuário", kind: "text" },
  { key: "metabase_auth_secret", label: "Segredo / senha", hint: "Senha ou API key do Metabase.", kind: "secret" },
  { key: "metabase_timeout_seconds", label: "Timeout (s)", kind: "number" },
  { key: "metabase_sync_dashboards", label: "Sincronizar dashboards", kind: "tribool" },
  { key: "metabase_sync_questions", label: "Sincronizar questions", kind: "tribool" },
  { key: "metabase_sync_collections", label: "Sincronizar collections", kind: "tribool" },
];

const DB_FIELDS: FieldDef[] = [
  { key: "control_db_host", label: "Host", hint: "Endpoint do banco de controle (read-model/operacional).", kind: "text" },
  { key: "control_db_port", label: "Porta", placeholder: "5432", kind: "number" },
  { key: "control_db_name", label: "Database", kind: "text" },
  { key: "control_db_user", label: "Usuário", kind: "text" },
  { key: "control_db_password", label: "Senha", kind: "secret" },
  { key: "control_db_schema", label: "Schema", hint: "Ex.: controle.", kind: "text" },
  { key: "control_db_sslmode", label: "SSL mode", hint: "Ex.: require, disable.", kind: "text" },
];

const ADVANCED_FIELDS: FieldDef[] = [
  { key: "dq_execution_engine", label: "Motor de execução DQ", hint: "Ex.: spark.", kind: "text" },
];

const SECRET_KEYS = ["metabase_auth_secret", "control_db_password"];

const ALL_FIELDS = SPARK_FIELDS.concat(METABASE_FIELDS, DB_FIELDS, ADVANCED_FIELDS);

// Pre-fill each field with the value in force today: the stored override if any, else the
// effective value resolved from the environment. Empty inputs still mean "inherit".
function initialForm(data: PlatformSettings): Record<string, string> {
  const eff = (data.effective ?? {}) as Record<string, unknown>;
  const form: Record<string, string> = {};
  for (const f of ALL_FIELDS) {
    if (f.kind === "secret") {
      form[f.key] = "";
      continue;
    }
    const stored = data[f.key];
    const value = stored === null || stored === undefined || stored === "" ? eff[f.key] : stored;
    if (f.kind === "tribool") {
      form[f.key] = value === true ? "true" : value === false ? "false" : "inherit";
    } else {
      form[f.key] = value === null || value === undefined ? "" : String(value);
    }
  }
  return form;
}

// Which fields currently have an explicit stored override (vs. inherited from the environment).
function computeOverridden(data: PlatformSettings): Record<string, boolean> {
  const map: Record<string, boolean> = {};
  for (const f of ALL_FIELDS) {
    if (f.kind === "secret") continue;
    const stored = data[f.key];
    map[f.key] = stored !== null && stored !== undefined && stored !== "";
  }
  return map;
}

export default function PlatformConfigPage() {
  const auth = useAuth();
  const canView = auth.canAccessPath("/admin/platform/config");
  const canEdit = auth.canAction("write", "admin");

  const [data, setData] = useState<PlatformSettings | null>(null);
  const [form, setForm] = useState<Record<string, string>>({});
  const [initial, setInitial] = useState<Record<string, string>>({});
  const [overridden, setOverridden] = useState<Record<string, boolean>>({});
  const [clearSecret, setClearSecret] = useState<Record<string, boolean>>({});
  const [tab, setTab] = useState<TabKey>("spark");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ tone: "ok" | "error"; text: string } | null>(null);
  const [testing, setTesting] = useState<string | null>(null);
  const [tests, setTests] = useState<Record<string, TestResult>>({});

  useEffect(() => {
    if (!canView) {
      setLoading(false);
      return;
    }
    let active = true;
    (async () => {
      try {
        const res = await apiRequest<PlatformSettings>("/v1/admin/platform-settings");
        if (!active) return;
        const f = initialForm(res);
        setData(res);
        setForm(f);
        setInitial(f);
        setOverridden(computeOverridden(res));
      } catch (error) {
        if (active) setMessage({ tone: "error", text: (error as Error).message });
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => {
      active = false;
    };
  }, [canView]);

  const setField = (key: string, value: string) => setForm((prev) => ({ ...prev, [key]: value }));

  function buildPayload(): Record<string, unknown> {
    const payload: Record<string, unknown> = {};
    for (const f of ALL_FIELDS) {
      if (f.kind === "secret") continue;
      const raw = form[f.key] ?? "";
      // Only send fields the admin actually changed. Untouched fields are omitted so they
      // keep inheriting from the environment (no accidental override of env-specific values).
      if (raw === (initial[f.key] ?? "")) continue;
      if (f.kind === "tribool") {
        payload[f.key] = raw === "inherit" ? null : raw === "true";
      } else if (f.kind === "number") {
        payload[f.key] = raw.trim() === "" ? null : Number(raw);
      } else {
        payload[f.key] = raw.trim() === "" ? null : raw.trim();
      }
    }
    for (const key of SECRET_KEYS) {
      if (clearSecret[key]) payload[key] = "";
      else if ((form[key] ?? "").trim()) payload[key] = form[key];
      // else: omit → keep existing
    }
    return payload;
  }

  async function handleSave() {
    setSaving(true);
    setMessage(null);
    try {
      const res = await apiRequest<PlatformSettings>("/v1/admin/platform-settings", {
        method: "PUT",
        body: JSON.stringify(buildPayload()),
      });
      const f = initialForm(res);
      setData(res);
      setForm(f);
      setInitial(f);
      setOverridden(computeOverridden(res));
      setClearSecret({});
      setMessage({ tone: "ok", text: "Configuração salva. Vale a partir do próximo job/sync (sem reiniciar)." });
    } catch (error) {
      setMessage({ tone: "error", text: (error as Error).message });
    } finally {
      setSaving(false);
    }
  }

  async function runTest(kind: "spark" | "metabase" | "db") {
    setTesting(kind);
    try {
      const res = await apiRequest<TestResult>(`/v1/admin/platform-settings/test/${kind}`, { method: "POST" });
      setTests((prev) => ({ ...prev, [kind]: res }));
    } catch (error) {
      setTests((prev) => ({ ...prev, [kind]: { ok: false, target: kind, detail: (error as Error).message } }));
    } finally {
      setTesting(null);
    }
  }

  const effective = data?.effective;

  if (!canView) {
    return (
      <EmptyState
        icon={<ShieldCheck className="h-5 w-5" />}
        title="Acesso restrito"
        description="A configuração da plataforma está disponível apenas para administradores."
      />
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-text">Configuração da Plataforma</h1>
        <p className="mt-1 text-sm text-muted">
          Ajuste Spark, Metabase, o banco de controle e variáveis importantes em tempo de execução. Os campos já vêm
          preenchidos com os valores que funcionam hoje (marcados como <span className="font-medium">herdado</span>);
          altere apenas o que precisar — o que você não tocar continua herdando do ambiente. Segredos são armazenados
          criptografados e nunca exibidos.
        </p>
      </div>

      {message ? (
        <div
          className={`rounded-lg border px-4 py-3 text-sm ${
            message.tone === "ok" ? "border-emerald-300 bg-emerald-50 text-emerald-800" : "border-red-300 bg-red-50 text-red-800"
          }`}
        >
          {message.text}
        </div>
      ) : null}

      <div className="flex flex-wrap gap-2">
        {TABS.map((t) => {
          const Icon = t.icon;
          return (
            <button
              key={t.key}
              type="button"
              onClick={() => setTab(t.key)}
              className={`inline-flex items-center gap-2 rounded-lg border px-3 py-2 text-sm font-medium transition ${
                tab === t.key ? "border-brand-400 bg-brand-50 text-brand-700" : "border-border bg-surface text-text-body hover:bg-bg-subtle"
              }`}
            >
              <Icon className="h-4 w-4" />
              {t.label}
            </button>
          );
        })}
      </div>

      {loading ? (
        <div className="flex items-center gap-2 text-sm text-muted">
          <Loader2 className="h-4 w-4 animate-spin" /> Carregando…
        </div>
      ) : (
        <fieldset disabled={!canEdit} className="space-y-6">
          {tab === "spark" ? (
            <SectionCard
              title="Spark"
              testKind="spark"
              testLabel="Testar master (TCP)"
              testing={testing}
              result={tests.spark}
              onTest={() => runTest("spark")}
              effective={
                effective
                  ? [
                      ["Master efetivo", effective.spark_master_url],
                      ["Resultados efetivo", effective.spark_results_dir],
                    ]
                  : []
              }
            >
              {SPARK_FIELDS.map((f) => renderField(f, form, setField, clearSecret, setClearSecret, data, overridden))}
            </SectionCard>
          ) : null}

          {tab === "metabase" ? (
            <SectionCard
              title="Metabase"
              testKind="metabase"
              testLabel="Testar /api/health"
              testing={testing}
              result={tests.metabase}
              onTest={() => runTest("metabase")}
              effective={
                effective
                  ? [
                      ["Habilitado efetivo", String(effective.metabase_enabled)],
                      ["Base URL efetiva", effective.metabase_base_url],
                    ]
                  : []
              }
            >
              {METABASE_FIELDS.map((f) => renderField(f, form, setField, clearSecret, setClearSecret, data, overridden))}
            </SectionCard>
          ) : null}

          {tab === "db" ? (
            <SectionCard
              title="Banco de controle (schema operacional)"
              testKind="db"
              testLabel="Testar (SELECT 1)"
              testing={testing}
              result={tests.db}
              onTest={() => runTest("db")}
              effective={
                effective
                  ? [
                      ["Host efetivo", effective.control_db_host],
                      ["Database efetivo", effective.control_db_name],
                      ["Schema efetivo", effective.control_db_schema],
                    ]
                  : []
              }
            >
              <p className="text-xs leading-5 text-amber-700">
                O banco principal do catálogo (DATABASE_URL) permanece apenas em variável de ambiente e não é
                configurável aqui. Este formulário configura apenas o banco secundário de controle/operacional.
              </p>
              {DB_FIELDS.map((f) => renderField(f, form, setField, clearSecret, setClearSecret, data, overridden))}
            </SectionCard>
          ) : null}

          {tab === "advanced" ? (
            <SectionCard title="Avançado" effective={effective ? [["Motor DQ efetivo", effective.dq_execution_engine]] : []}>
              {ADVANCED_FIELDS.map((f) => renderField(f, form, setField, clearSecret, setClearSecret, data, overridden))}
            </SectionCard>
          ) : null}

          <div className="flex items-center gap-3">
            <Button type="button" onClick={handleSave} disabled={!canEdit || saving}>
              {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              Salvar configuração
            </Button>
            {data?.updated_at ? (
              <span className="text-xs text-muted">Atualizado em {new Date(data.updated_at).toLocaleString("pt-BR")}</span>
            ) : null}
          </div>
        </fieldset>
      )}
    </div>
  );
}

function SectionCard({
  title,
  children,
  effective,
  testKind,
  testLabel,
  onTest,
  testing,
  result,
}: {
  title: string;
  children: React.ReactNode;
  effective: Array<[string, string | null | undefined]>;
  testKind?: string;
  testLabel?: string;
  onTest?: () => void;
  testing?: string | null;
  result?: TestResult;
}) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <h2 className="text-base font-semibold text-text">{title}</h2>
        {onTest ? (
          <Button type="button" variant="outline" size="sm" onClick={onTest} disabled={testing === testKind}>
            {testing === testKind ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
            {testLabel}
          </Button>
        ) : null}
      </CardHeader>
      <CardContent className="space-y-5">
        {result ? (
          <div
            className={`flex items-start gap-2 rounded-lg border px-3 py-2 text-sm ${
              result.ok ? "border-emerald-300 bg-emerald-50 text-emerald-800" : "border-red-300 bg-red-50 text-red-800"
            }`}
          >
            {result.ok ? <CheckCircle2 className="mt-0.5 h-4 w-4" /> : <XCircle className="mt-0.5 h-4 w-4" />}
            <span>
              {result.detail} <span className="opacity-70">({result.target}
              {result.latency_ms != null ? `, ${result.latency_ms}ms` : ""})</span>
            </span>
          </div>
        ) : null}
        {effective.length ? (
          <div className="rounded-lg border border-border/70 bg-bg-subtle px-3 py-2 text-xs text-muted">
            <span className="font-medium text-text-body">Em vigor agora: </span>
            {effective.map(([label, value], i) => (
              <span key={label}>
                {i > 0 ? " · " : ""}
                {label}: <span className="text-text-body">{value ?? "—"}</span>
              </span>
            ))}
          </div>
        ) : null}
        <div className="grid gap-5 sm:grid-cols-2">{children}</div>
      </CardContent>
    </Card>
  );
}

function OriginBadge({ overridden }: { overridden: boolean }) {
  return (
    <span
      className={`ml-2 rounded px-1.5 py-0.5 text-[10px] font-medium ${
        overridden ? "bg-brand-50 text-brand-700" : "bg-bg-subtle text-muted"
      }`}
    >
      {overridden ? "personalizado" : "herdado"}
    </span>
  );
}

function renderField(
  f: FieldDef,
  form: Record<string, string>,
  setField: (key: string, value: string) => void,
  clearSecret: Record<string, boolean>,
  setClearSecret: React.Dispatch<React.SetStateAction<Record<string, boolean>>>,
  data: PlatformSettings | null,
  overridden: Record<string, boolean>,
) {
  const value = form[f.key] ?? "";
  if (f.kind === "tribool") {
    return (
      <label key={f.key} className="space-y-2">
        <span className="text-sm font-medium text-text-body">
          {f.label}
          <OriginBadge overridden={!!overridden[f.key]} />
        </span>
        {f.hint ? <p className="text-xs leading-5 text-muted">{f.hint}</p> : null}
        <select
          className="h-10 w-full rounded-lg border border-border bg-surface px-3 text-sm text-text-body"
          value={value}
          onChange={(e) => setField(f.key, e.target.value)}
        >
          <option value="inherit">Herdar (padrão)</option>
          <option value="true">Ativado</option>
          <option value="false">Desativado</option>
        </select>
      </label>
    );
  }
  if (f.kind === "secret") {
    const isSet = f.key === "metabase_auth_secret" ? data?.metabase_auth_secret_set : data?.control_db_password_set;
    const cleared = !!clearSecret[f.key];
    return (
      <label key={f.key} className="space-y-2">
        <span className="text-sm font-medium text-text-body">{f.label}</span>
        <p className="text-xs leading-5 text-muted">
          {f.hint ? `${f.hint} ` : ""}
          {isSet ? "Valor definido — deixe em branco para manter." : "Nenhum valor armazenado."}
        </p>
        <Input
          type="password"
          autoComplete="new-password"
          placeholder={isSet ? "••••••••" : ""}
          value={cleared ? "" : value}
          disabled={cleared}
          onChange={(e) => setField(f.key, e.target.value)}
        />
        {isSet ? (
          <label className="flex items-center gap-2 text-xs text-muted">
            <input
              type="checkbox"
              checked={cleared}
              onChange={(e) => setClearSecret((prev) => ({ ...prev, [f.key]: e.target.checked }))}
            />
            Remover valor armazenado
          </label>
        ) : null}
      </label>
    );
  }
  return (
    <label key={f.key} className="space-y-2">
      <span className="text-sm font-medium text-text-body">
        {f.label}
        <OriginBadge overridden={!!overridden[f.key]} />
      </span>
      {f.hint ? <p className="text-xs leading-5 text-muted">{f.hint}</p> : null}
      <Input
        type={f.kind === "number" ? "number" : "text"}
        placeholder={f.placeholder}
        value={value}
        onChange={(e) => setField(f.key, e.target.value)}
      />
    </label>
  );
}
