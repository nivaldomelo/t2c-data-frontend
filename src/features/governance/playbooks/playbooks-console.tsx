import { useEffect, useMemo, useState } from "react";
import { BookOpen, RefreshCw, Sparkles } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";

import { governanceSdk } from "../sdk";
import type { GovernancePlaybook } from "../recommendations/types";

type Tone = "neutral" | "accent" | "warning" | "success" | "danger";

function toneFromSeverity(severity: string): Tone {
  if (severity === "critical") return "danger";
  if (severity === "high") return "warning";
  if (severity === "medium") return "accent";
  return "neutral";
}

function formatDateTime(value?: string | null): string {
  if (!value) return "Sem histórico";
  return new Date(value).toLocaleString("pt-BR");
}

function PlaybookCard({ playbook }: { playbook: GovernancePlaybook }) {
  return (
    <div className="rounded-3xl border border-border bg-bg-subtle/80 p-4 shadow-[0_8px_24px_rgba(15,23,42,0.04)]">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="space-y-2">
          <div className="flex flex-wrap items-center gap-2">
            <Badge tone={toneFromSeverity(playbook.severity)}>{playbook.severity.toUpperCase()}</Badge>
            <Badge tone={playbook.is_active ? "success" : "neutral"}>{playbook.is_active ? "Ativo" : "Inativo"}</Badge>
            <Badge tone="neutral">{playbook.scope}</Badge>
          </div>
          <div>
            <p className="text-base font-semibold text-text">{playbook.title}</p>
            <p className="mt-1 text-sm leading-6 text-text-body">{playbook.description || playbook.recommendation_detail}</p>
          </div>
        </div>
        <div className="rounded-2xl border border-border bg-surface px-4 py-3 text-right">
          <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-muted">Prioridade</p>
          <p className="mt-1 text-lg font-semibold text-text">{playbook.priority}</p>
        </div>
      </div>

      <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-muted">Gatilho</p>
          <p className="mt-1 text-sm text-text-body">{playbook.trigger_key}</p>
        </div>
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-muted">Ação</p>
          <p className="mt-1 text-sm text-text-body">{playbook.action_label}</p>
        </div>
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-muted">Políticas geradas</p>
          <p className="mt-1 text-sm text-text-body">{playbook.matched_recommendations.toLocaleString("pt-BR")}</p>
        </div>
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-muted">Open</p>
          <p className="mt-1 text-sm text-text-body">{playbook.open_recommendations.toLocaleString("pt-BR")}</p>
        </div>
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-2">
        <Badge tone="neutral">{playbook.recommended_actions.length} ação(ões) recomendada(s)</Badge>
        {playbook.domain_name ? <Badge tone="accent">{playbook.domain_name}</Badge> : null}
        {playbook.datasource_name ? <Badge tone="accent">{playbook.datasource_name}</Badge> : null}
        {playbook.criticality ? <Badge tone="warning">{playbook.criticality}</Badge> : null}
        {playbook.sensitivity_level ? <Badge tone="warning">{playbook.sensitivity_level}</Badge> : null}
        {playbook.requires_owner ? <Badge tone="warning">Owner</Badge> : null}
        {playbook.requires_classification ? <Badge tone="warning">Classificação</Badge> : null}
        {playbook.requires_dictionary ? <Badge tone="warning">Dicionário</Badge> : null}
        {playbook.requires_active_dq ? <Badge tone="warning">DQ ativa</Badge> : null}
        {playbook.requires_sla ? <Badge tone="warning">SLA</Badge> : null}
      </div>

      <div className="mt-4 rounded-2xl border border-border bg-surface p-4">
        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-muted">Última correspondência</p>
        <p className="mt-1 text-sm text-text-body">{formatDateTime(playbook.last_matched_at)}</p>
      </div>
    </div>
  );
}

export function GovernancePlaybooksConsole() {
  const [payload, setPayload] = useState<{ generated_at: string; total: number; items: GovernancePlaybook[] } | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [query, setQuery] = useState("");
  const [scope, setScope] = useState("");
  const [status, setStatus] = useState("active");
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    let active = true;
    setLoading(true);
    setError("");
    void (async () => {
      try {
        const response = await governanceSdk.listGovernancePlaybooks({
          include_inactive: status === "all",
        });
        if (!active) return;
        setPayload(response);
      } catch (err) {
        if (!active) return;
        setError((err as Error).message);
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => {
      active = false;
    };
  }, [reloadKey, status]);

  const filteredItems = useMemo(() => {
    const items = payload?.items || [];
    const normalizedQuery = query.trim().toLowerCase();
    const normalizedScope = scope.trim().toLowerCase();
    return items.filter((item) => {
      if (normalizedScope && item.scope.toLowerCase() !== normalizedScope) return false;
      if (!normalizedQuery) return true;
      const haystack = [
        item.key,
        item.title,
        item.description,
        item.trigger_key,
        item.action_key,
        item.action_label,
        item.domain_name,
        item.datasource_name,
        item.criticality,
        item.sensitivity_level,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();
      return haystack.includes(normalizedQuery);
    });
  }, [payload, query, scope]);

  const activeCount = filteredItems.filter((item) => item.is_active).length;
  const openCount = filteredItems.reduce((acc, item) => acc + item.open_recommendations, 0);

  return (
    <Card className="border-border bg-surface shadow-[0_12px_36px_rgba(15,23,42,0.05)]">
      <CardHeader className="space-y-4 pb-3">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="space-y-2">
            <div className="flex flex-wrap items-center gap-2">
              <Badge tone="accent">
                <Sparkles className="mr-1 h-3.5 w-3.5" />
                Playbooks
              </Badge>
              <Badge tone="neutral">{payload ? `${payload.total} playbook(s)` : "Carregando..."}</Badge>
              <Badge tone="success">{activeCount} ativo(s)</Badge>
              <Badge tone="warning">{openCount} recomendações em aberto</Badge>
            </div>
            <p className="text-sm leading-6 text-text-body">
              Playbooks derivam das políticas configuráveis e funcionam como a camada operacional da governança: gatilho,
              ação recomendada, severidade e efeito visível na fila.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button onClick={() => setReloadKey((current) => current + 1)} size="sm" variant="outline">
              <RefreshCw className="mr-2 h-4 w-4" />
              Atualizar
            </Button>
          </div>
        </div>

        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
          <div className="xl:col-span-2">
            <Input onChange={(event) => setQuery(event.target.value)} placeholder="Buscar playbook, ação ou domínio" value={query} />
          </div>
          <Select onChange={(event) => setScope(event.target.value)} value={scope}>
            <option value="">Todos os escopos</option>
            <option value="table">Tabela</option>
            <option value="any">Qualquer</option>
          </Select>
          <Select onChange={(event) => setStatus(event.target.value)} value={status}>
            <option value="active">Somente ativos</option>
            <option value="all">Ativos e inativos</option>
          </Select>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {loading ? (
          <Skeleton className="h-[320px] w-full" />
        ) : error ? (
          <EmptyState title="Não foi possível carregar playbooks" description={error} />
        ) : filteredItems.length === 0 ? (
          <EmptyState
            title="Nenhum playbook encontrado"
            description="Ajuste os filtros ou configure políticas de governança para que os playbooks apareçam aqui."
            icon={<BookOpen className="h-10 w-10 text-slate-300" />}
          />
        ) : (
          <div className="space-y-4">
            {filteredItems.map((playbook) => (
              <PlaybookCard key={playbook.key} playbook={playbook} />
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
