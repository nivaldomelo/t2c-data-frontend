import { Link } from "@/lib/next-shims";
import { useEffect, useState } from "react";
import { ArrowRight, BookOpen, Database, Network, Plus, RefreshCw, ShieldCheck, Sparkles, Tags, Users } from "lucide-react";

import { ContextualJourneyCard } from "@/components/navigation/contextual-journey-card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { slugifyText } from "@/lib/slugify";

import { createSemanticDomain, listSemanticDomainSuggestions, listSemanticDomains } from "../sdk";
import type { SemanticDomain, SemanticDomainSuggestion } from "../types";

const PAGE_SIZE = 25;

const FIELD_HELP = {
  name: "Nome de negócio do domínio. Ex.: Clientes, Vendas, Financeiro ou Operações.",
  slug: "Identificador técnico usado em URLs e integrações. Use letras minúsculas, sem espaços.",
  description: "Explique quais dados, processos, áreas ou decisões de negócio este domínio representa.",
  owner: "Pessoa ou time responsável por decisões, prioridades, uso e evolução do domínio.",
  steward: "Pessoa ou time responsável por documentação, qualidade, classificação e governança.",
  criticality: "Indica o impacto do domínio no negócio caso seus dados estejam incorretos, atrasados ou indisponíveis.",
  maturity: "Mostra o estágio de evolução do domínio em governança, qualidade, documentação e operação.",
  quality: "Opcional. Deixe em branco para usar o score derivado automaticamente dos sinais de Data Quality dos ativos. Preencha apenas para sobrescrever manualmente.",
  governance: "Opcional. Deixe em branco para usar o score derivado (cobertura de owner, steward, documentação, tags, classificação, regras e certificação). Preencha apenas para sobrescrever.",
  notes: "Registre contexto operacional, decisões, pendências ou combinados relevantes para este domínio.",
};

const HOW_TO_USE_DOMAIN = [
  {
    icon: Database,
    title: "Organize ativos por negócio",
    description: "Agrupe tabelas, colunas e pipelines em torno de assuntos como Clientes, Vendas ou Financeiro.",
  },
  {
    icon: Users,
    title: "Defina responsáveis",
    description: "Associe owner e steward para deixar claro quem decide, prioriza e governa os dados do domínio.",
  },
  {
    icon: ShieldCheck,
    title: "Acompanhe qualidade",
    description: "Use scores, regras, falhas e incidentes para entender se os ativos do domínio são confiáveis.",
  },
  {
    icon: Tags,
    title: "Priorize governança",
    description: "Identifique domínios com baixa documentação, poucas regras ou muitos ativos sem classificação.",
  },
  {
    icon: Network,
    title: "Conecte produtos de dados",
    description: "Relacione produtos, métricas e dashboards ao domínio correto para melhorar reuso e descoberta.",
  },
];

function scoreTone(score: number) {
  if (score >= 85) return "success";
  if (score >= 70) return "accent";
  if (score >= 50) return "warning";
  return "danger";
}

function maturityTone(label: string) {
  if (label === "Otimizado" || label === "Gerenciado") return "success";
  if (label === "Definido") return "accent";
  return "warning";
}

function DomainCard({ item }: { item: SemanticDomain }) {
  return (
    <Card className="border-border/80 bg-surface shadow-card transition-colors hover:border-border-strong">
      <CardContent className="space-y-4 p-5">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-muted">Domínio</p>
            <h3 className="mt-2 text-lg font-semibold text-text">{item.name}</h3>
            <p className="mt-1 text-sm leading-6 text-text-body">
              {item.description || "Sem descrição cadastrada. Adicione contexto para orientar usuários sobre escopo, processos e ativos do domínio."}
            </p>
          </div>
          <Badge tone={maturityTone(item.maturity_label)}>{item.maturity_label}</Badge>
        </div>
        <div className="grid gap-2 text-sm text-text-body sm:grid-cols-2">
          <p><span className="font-medium text-text-body">Owner:</span> {item.owner || "Não definido"}</p>
          <p><span className="font-medium text-text-body">Steward:</span> {item.steward || "Não definido"}</p>
          <p><span className="font-medium text-text-body">Ativos:</span> {item.assets_count}</p>
          <p><span className="font-medium text-text-body">Produtos:</span> {item.products_count}</p>
          <p><span className="font-medium text-text-body">Score DQ:</span> {item.quality_score ?? "N/D"}</p>
          <p><span className="font-medium text-text-body">Governança:</span> {item.governance_score ?? "N/D"}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Badge tone={scoreTone(item.maturity_score)}>Score {item.maturity_score}</Badge>
          <Badge tone="neutral">{item.pipelines_count} pipeline(s)</Badge>
          <Badge tone="neutral">{item.rules_count} regra(s) DQ</Badge>
          <Badge tone="neutral">{item.incidents_count} incidente(s)</Badge>
          <Badge tone="neutral">{item.contracts_count} contrato(s)</Badge>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button asChild size="sm">
            <Link href={`/governance/domains/${item.slug}`}>
              Abrir domínio
              <ArrowRight className="ml-2 h-4 w-4" />
            </Link>
          </Button>
          <Button asChild size="sm" variant="outline">
            <Link href={`/search?domain=${encodeURIComponent(item.name)}`}>Ver ativos</Link>
          </Button>
          <Button asChild size="sm" variant="outline">
            <Link href={`/data-quality?domain=${encodeURIComponent(item.slug)}`}>Ver qualidade</Link>
          </Button>
          <Button asChild size="sm" variant="outline">
            <Link href={`/incidents/tickets?domain=${encodeURIComponent(item.slug)}`}>Ver incidentes</Link>
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

function SuggestionCard({ item, onUse }: { item: SemanticDomainSuggestion; onUse: (item: SemanticDomainSuggestion) => void }) {
  return (
    <div className="w-full rounded-3xl border border-brand-200 bg-brand-50/60 p-4 text-left transition-colors hover:border-brand-300 hover:bg-brand-50">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-sm font-semibold text-brand-900">{item.name}</p>
          <p className="mt-1 text-xs text-brand-700">
            {item.assets_count} ativo(s) detectado(s) · {item.open_incidents} incidente(s) aberto(s)
          </p>
        </div>
        <Badge tone={item.maturity_status === "Otimizado" ? "success" : item.maturity_status === "Gerenciado" ? "accent" : "warning"}>
          {item.maturity_status}
        </Badge>
      </div>
      <p className="mt-3 text-xs leading-5 text-brand-700">
        Sugestão gerada a partir dos ativos catalogados. Use como ponto de partida e depois revise owner, steward, criticidade e maturidade.
      </p>
      <div className="mt-3 flex flex-wrap gap-2">
        <Button size="sm" type="button" onClick={() => onUse(item)}>
          Usar sugestão
        </Button>
        <Button asChild size="sm" variant="outline">
          <Link href={`/search?domain=${encodeURIComponent(item.name)}`}>Ver ativos relacionados</Link>
        </Button>
      </div>
    </div>
  );
}

function FieldHelp({ children }: { children: React.ReactNode }) {
  return <p className="text-xs leading-5 text-muted">{children}</p>;
}

export function SemanticDomainsPage() {
  const [items, setItems] = useState<SemanticDomain[]>([]);
  const [suggestions, setSuggestions] = useState<SemanticDomainSuggestion[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [reloadKey, setReloadKey] = useState(0);
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState("");
  const [form, setForm] = useState({
    slug: "",
    name: "",
    description: "",
    owner: "",
    steward: "",
    criticality: "",
    maturity_status: "emerging",
    quality_score: "",
    governance_score: "",
    notes: "",
    is_active: true,
  });

  const hasItems = items.length > 0;

  useEffect(() => {
    void loadData();
  }, [reloadKey]);

  async function loadData(nextQuery = "") {
    setLoading(true);
    setError("");
    try {
      const [domains, domainSuggestions] = await Promise.all([
        listSemanticDomains(nextQuery, 1, PAGE_SIZE),
        listSemanticDomainSuggestions(),
      ]);
      setItems(domains.items || []);
      setSuggestions(domainSuggestions || []);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  }

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setCreating(true);
    setCreateError("");
    try {
      const payload = {
        slug: form.slug.trim() || slugifyText(form.name),
        name: form.name.trim(),
        description: form.description.trim() || null,
        owner: form.owner.trim() || null,
        steward: form.steward.trim() || null,
        criticality: form.criticality.trim() || null,
        maturity_status: form.maturity_status.trim() || "emerging",
        quality_score: form.quality_score ? Number(form.quality_score) : null,
        governance_score: form.governance_score ? Number(form.governance_score) : null,
        notes: form.notes.trim() || null,
        is_active: form.is_active,
      };
      const created = await createSemanticDomain(payload);
      window.location.assign(`/governance/domains/${created.slug}`);
    } catch (err) {
      setCreateError((err as Error).message);
    } finally {
      setCreating(false);
    }
  }

  function useSuggestion(item: SemanticDomainSuggestion) {
    setForm((current) => ({
      ...current,
      slug: item.slug,
      name: item.name,
      quality_score: String(item.quality_score),
      governance_score: String(item.governance_score),
    }));
  }

  if (loading && !hasItems) {
    return <div className="rounded-3xl border border-border/80 bg-surface p-6 shadow-card"><div className="h-64 animate-pulse rounded-3xl bg-bg-subtle" /></div>;
  }

  if (error && !hasItems) {
    return <EmptyState title="Domínios indisponíveis" description={error} />;
  }

  return (
    <div className="space-y-6 pb-6">
      <Card className="border-border bg-[linear-gradient(135deg,#ffffff_0%,#f8fafc_55%,#eef6ff_100%)] shadow-[0_18px_48px_rgba(15,23,42,0.06)]">
        <CardContent className="space-y-4 p-6">
          <div className="inline-flex items-center gap-2 rounded-full border border-brand-200 bg-surface px-3 py-1 text-xs font-medium text-brand-700">
            <Sparkles className="h-3.5 w-3.5" />
            Camada semântica
          </div>
          <h2 className="text-3xl font-semibold tracking-tight text-text">Domínios de dados</h2>
          <p className="max-w-4xl text-sm leading-7 text-text-body">
            Organize ativos, pipelines, regras, incidentes e produtos de dados em torno de domínios de negócio. Esta visão ajuda
            governança, engenharia, analytics e áreas de negócio a acompanharem responsabilidade, qualidade, maturidade e riscos por contexto.
          </p>
        </CardContent>
      </Card>

      <Card className="border-brand-200 bg-brand-50/70 shadow-sm">
        <CardContent className="grid gap-5 p-5 lg:grid-cols-[1.1fr_0.9fr]">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 rounded-full border border-brand-200 bg-surface px-3 py-1 text-xs font-semibold text-brand-700">
              <BookOpen className="h-3.5 w-3.5" />
              Conceito de negócio
            </div>
            <h3 className="text-xl font-semibold text-brand-950">O que é um domínio de dados?</h3>
            <p className="text-sm leading-7 text-brand-900">
              Um domínio organiza ativos por contexto de negócio, como Clientes, Vendas, Financeiro ou Operações. Ele ajuda a definir
              responsáveis, acompanhar qualidade, priorizar incidentes, medir maturidade e conectar tabelas, produtos de dados e regras
              em uma visão semântica.
            </p>
          </div>
          <div className="rounded-3xl border border-brand-200 bg-surface p-4 text-sm leading-6 text-text-body">
            <p className="font-semibold text-text">Domínio não é o mesmo que schema.</p>
            <p className="mt-2">
              Schema é uma organização técnica no banco de dados. Domínio é uma organização de negócio, que pode reunir tabelas de
              diferentes schemas, bancos e fontes quando elas representam o mesmo assunto ou processo.
            </p>
          </div>
        </CardContent>
      </Card>

      <ContextualJourneyCard
        title="Jornadas principais do domínio"
        description="Use os atalhos para navegar do domínio para ativos técnicos, produtos de dados, qualidade, incidentes, linhagem e indicadores executivos. O domínio funciona como ponto de entrada de negócio para investigar tudo que pertence ao mesmo contexto."
        links={[
          { description: "Abrir produtos de dados associados ao domínio.", href: "/governance/data-products", label: "Produtos de dados", tone: "accent" },
          { description: "Investigar ativos, colunas e contexto técnico.", href: "/explorer", label: "Explorer", tone: "neutral" },
          { description: "Revisar score, regras e cobertura de qualidade.", href: "/data-quality", label: "Data Quality", tone: "success" },
          { description: "Abrir incidentes e filas ligadas ao domínio.", href: "/incidents/tickets", label: "Incidentes", tone: "warning" },
          { description: "Entender dependências e impacto de mudança.", href: "/lineage", label: "Linhagem", tone: "accent" },
          { description: "Observar maturidade e valor por domínio.", href: "/dashboard", label: "Dashboard executivo", tone: "neutral" },
        ]}
      />

      <Card className="border-border/80 bg-surface shadow-card">
        <CardContent className="space-y-4 p-5">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-muted">Operação</p>
            <h3 className="mt-2 text-lg font-semibold text-text">Como usar domínios na operação</h3>
            <p className="mt-1 max-w-4xl text-sm leading-6 text-text-body">
              Use domínios para transformar o catálogo técnico em uma leitura por responsabilidade, risco e prioridade de negócio.
            </p>
          </div>
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-5">
            {HOW_TO_USE_DOMAIN.map((item) => {
              const Icon = item.icon;
              return (
                <div className="rounded-2xl border border-border/80 bg-bg-subtle p-4" key={item.title}>
                  <Icon className="h-5 w-5 text-brand-700" />
                  <p className="mt-3 text-sm font-semibold text-text">{item.title}</p>
                  <p className="mt-2 text-xs leading-5 text-text-body">{item.description}</p>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
        <Card className="border-border/80 bg-surface shadow-card">
          <CardContent className="space-y-4 p-5">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-muted">Cadastro</p>
                <h3 className="mt-2 text-lg font-semibold text-text">Novo domínio</h3>
                <p className="mt-1 max-w-2xl text-sm leading-6 text-text-body">
                  Preencha o domínio como uma área de negócio. Depois de criado, associe ativos, regras, incidentes e produtos no detalhe do domínio.
                </p>
              </div>
              <Button size="sm" variant="outline" onClick={() => void loadData()}>
                <RefreshCw className="mr-2 h-4 w-4" />
                Recarregar
              </Button>
            </div>
            <form className="grid gap-3 md:grid-cols-2" onSubmit={(event) => void handleSubmit(event)}>
              <label className="space-y-1 text-sm text-text-body">
                <span className="text-xs font-semibold uppercase tracking-[0.16em] text-muted">Nome</span>
                <Input value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} placeholder="Ex.: Financeiro" />
                <FieldHelp>{FIELD_HELP.name}</FieldHelp>
              </label>
              <label className="space-y-1 text-sm text-text-body">
                <span className="text-xs font-semibold uppercase tracking-[0.16em] text-muted">Slug</span>
                <Input value={form.slug} onChange={(event) => setForm({ ...form, slug: event.target.value })} placeholder="financeiro" />
                <FieldHelp>{FIELD_HELP.slug}</FieldHelp>
              </label>
              <label className="space-y-1 text-sm text-text-body md:col-span-2">
                <span className="text-xs font-semibold uppercase tracking-[0.16em] text-muted">Descrição</span>
                <Textarea rows={3} value={form.description} onChange={(event) => setForm({ ...form, description: event.target.value })} />
                <FieldHelp>{FIELD_HELP.description}</FieldHelp>
              </label>
              <label className="space-y-1 text-sm text-text-body">
                <span className="text-xs font-semibold uppercase tracking-[0.16em] text-muted">Owner</span>
                <Input value={form.owner} onChange={(event) => setForm({ ...form, owner: event.target.value })} placeholder="Time ou pessoa responsável" />
                <FieldHelp>{FIELD_HELP.owner}</FieldHelp>
              </label>
              <label className="space-y-1 text-sm text-text-body">
                <span className="text-xs font-semibold uppercase tracking-[0.16em] text-muted">Steward</span>
                <Input value={form.steward} onChange={(event) => setForm({ ...form, steward: event.target.value })} placeholder="Steward do domínio" />
                <FieldHelp>{FIELD_HELP.steward}</FieldHelp>
              </label>
              <label className="space-y-1 text-sm text-text-body">
                <span className="text-xs font-semibold uppercase tracking-[0.16em] text-muted">Criticidade</span>
                <Select value={form.criticality} onChange={(event) => setForm({ ...form, criticality: event.target.value })}>
                  <option value="">Não definida</option>
                  <option value="low">Baixa</option>
                  <option value="medium">Média</option>
                  <option value="high">Alta</option>
                  <option value="critical">Crítica</option>
                </Select>
                <FieldHelp>{FIELD_HELP.criticality}</FieldHelp>
              </label>
              <label className="space-y-1 text-sm text-text-body">
                <span className="text-xs font-semibold uppercase tracking-[0.16em] text-muted">Maturidade</span>
                <Select value={form.maturity_status} onChange={(event) => setForm({ ...form, maturity_status: event.target.value })}>
                  <option value="emerging">Em evolução</option>
                  <option value="defined">Definido</option>
                  <option value="managed">Gerenciado</option>
                  <option value="optimized">Otimizado</option>
                </Select>
                <FieldHelp>{FIELD_HELP.maturity}</FieldHelp>
              </label>
              <label className="space-y-1 text-sm text-text-body">
                <span className="text-xs font-semibold uppercase tracking-[0.16em] text-muted">Score de qualidade</span>
                <Input type="number" min="0" max="100" value={form.quality_score} onChange={(event) => setForm({ ...form, quality_score: event.target.value })} />
                <FieldHelp>{FIELD_HELP.quality}</FieldHelp>
              </label>
              <label className="space-y-1 text-sm text-text-body">
                <span className="text-xs font-semibold uppercase tracking-[0.16em] text-muted">Score de governança</span>
                <Input type="number" min="0" max="100" value={form.governance_score} onChange={(event) => setForm({ ...form, governance_score: event.target.value })} />
                <FieldHelp>{FIELD_HELP.governance}</FieldHelp>
              </label>
              <label className="space-y-1 text-sm text-text-body md:col-span-2">
                <span className="text-xs font-semibold uppercase tracking-[0.16em] text-muted">Notas</span>
                <Textarea rows={3} value={form.notes} onChange={(event) => setForm({ ...form, notes: event.target.value })} />
                <FieldHelp>{FIELD_HELP.notes}</FieldHelp>
              </label>
              <div className="md:col-span-2 flex items-center justify-between gap-3">
                <p className="text-sm text-text-body">{createError ? <span className="text-danger-700">{createError}</span> : "Os scores podem ser refinados depois."}</p>
                <Button disabled={creating} type="submit">
                  <Plus className="mr-2 h-4 w-4" />
                  {creating ? "Criando..." : "Criar domínio"}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>

        <Card className="border-border/80 bg-surface shadow-card">
          <CardContent className="space-y-4 p-5">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-muted">Sugestões</p>
                <h3 className="mt-2 text-lg font-semibold text-text">Sugestões detectadas no catálogo</h3>
                <p className="mt-1 max-w-2xl text-sm leading-6 text-text-body">
                  A plataforma identificou possíveis domínios com base nos ativos catalogados. Use uma sugestão para acelerar o cadastro e revise os responsáveis antes de salvar.
                </p>
              </div>
              <Badge tone="accent">{suggestions.length}</Badge>
            </div>
            <div className="space-y-3">
              {suggestions.length ? suggestions.map((item) => <SuggestionCard item={item} key={item.slug} onUse={useSuggestion} />) : (
                <EmptyState title="Sem sugestões detectadas" description="Os ativos ainda não possuem domínio explícito suficiente para sugerir agrupamentos de negócio." />
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-muted">Domínios</p>
          <h3 className="text-xl font-semibold text-text">Domínios cadastrados</h3>
          <p className="mt-1 max-w-3xl text-sm leading-6 text-text-body">
            Acompanhe responsáveis, maturidade, ativos, produtos, regras, incidentes e scores para priorizar governança por contexto de negócio.
          </p>
        </div>
        <Badge tone="neutral">{items.length} registrado(s)</Badge>
      </div>

      {hasItems ? (
        <div className="grid gap-4 lg:grid-cols-2 xl:grid-cols-3">
          {items.map((item) => <DomainCard item={item} key={item.id} />)}
        </div>
      ) : (
        <EmptyState
          title="Nenhum domínio cadastrado"
          description="Crie o primeiro domínio para organizar ativos, produtos, regras e incidentes por contexto de negócio. Depois, associe tabelas e acompanhe qualidade, governança e maturidade por domínio."
        />
      )}
    </div>
  );
}
