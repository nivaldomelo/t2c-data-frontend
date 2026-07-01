import { Link } from "@/lib/next-shims";
import { useEffect, useMemo, useState } from "react";
import { ArrowRight, Plus, RefreshCw, Trash2 } from "lucide-react";

import { ContextualJourneyCard } from "@/components/navigation/contextual-journey-card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";

import {
  addSemanticDomainLink,
  deleteSemanticDomain,
  deleteSemanticDomainLink,
  getSemanticDomain,
  updateSemanticDomain,
} from "../sdk";
import type { SemanticDomainDetail, SemanticLink } from "../types";

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

function FieldHelp({ children }: { children: React.ReactNode }) {
  return <p className="text-xs leading-5 text-muted">{children}</p>;
}

function assetButtons(item: { entity_id: number; href: string }) {
  return (
    <>
      <Button asChild size="sm" variant="outline">
        <Link href={item.href}>Explorer</Link>
      </Button>
      <Button asChild size="sm" variant="outline">
        <Link href={`/data-quality?tableId=${item.entity_id}`}>DQ</Link>
      </Button>
      <Button asChild size="sm" variant="outline">
        <Link href={`/incidents/tickets?tableId=${item.entity_id}`}>Incidentes</Link>
      </Button>
      <Button asChild size="sm" variant="outline">
        <Link href={`/lineage?tableId=${item.entity_id}`}>Linhagem</Link>
      </Button>
    </>
  );
}

function LinkRow({ link, onRemove }: { link: SemanticLink; onRemove: (linkId: number) => void }) {
  return (
    <div className="rounded-2xl border border-border/80 bg-surface p-4 shadow-sm">
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <Badge tone="neutral">{link.relation_kind}</Badge>
            <Badge tone="accent">{link.entity_kind}</Badge>
            {link.is_primary ? <Badge tone="success">Principal</Badge> : null}
          </div>
          <h4 className="mt-3 text-sm font-semibold text-text">{link.entity_label}</h4>
          {link.entity_href ? (
            <Link className="mt-1 inline-flex text-sm text-brand-700 hover:underline" href={link.entity_href}>
              Abrir vínculo
            </Link>
          ) : null}
          {link.notes ? <p className="mt-2 text-sm text-text-body">{link.notes}</p> : null}
        </div>
        <Button size="sm" variant="outline" onClick={() => onRemove(link.id)}>
          <Trash2 className="mr-2 h-4 w-4" />
          Remover
        </Button>
      </div>
    </div>
  );
}

export function SemanticDomainDetailPage({ slug }: { slug: string }) {
  const [payload, setPayload] = useState<SemanticDomainDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const [linking, setLinking] = useState(false);
  const [reloadKey, setReloadKey] = useState(0);
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
  const [linkForm, setLinkForm] = useState({
    relation_kind: "asset",
    entity_kind: "table",
    entity_id: "",
    entity_label: "",
    entity_href: "",
    notes: "",
    is_primary: false,
  });

  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    setError("");
    void (async () => {
      try {
        const data = await getSemanticDomain(slug);
        if (!controller.signal.aborted) setPayload(data);
      } catch (err) {
        if (!controller.signal.aborted) setError((err as Error).message);
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    })();
    return () => controller.abort();
  }, [slug, reloadKey]);

  useEffect(() => {
    if (!payload) return;
    setForm({
      slug: payload.slug,
      name: payload.name,
      description: payload.description || "",
      owner: payload.owner || "",
      steward: payload.steward || "",
      criticality: payload.criticality || "",
      maturity_status: payload.maturity_status || "emerging",
      quality_score: payload.quality_score !== undefined && payload.quality_score !== null ? String(payload.quality_score) : "",
      governance_score: payload.governance_score !== undefined && payload.governance_score !== null ? String(payload.governance_score) : "",
      notes: payload.notes || "",
      is_active: payload.is_active,
    });
  }, [payload]);

  const activeLinks = useMemo(() => payload?.links || [], [payload]);
  const assets = useMemo(() => payload?.assets || [], [payload]);
  const products = useMemo(() => payload?.products || [], [payload]);

  async function handleSave(event: React.FormEvent) {
    event.preventDefault();
    setSaving(true);
    try {
      await updateSemanticDomain(slug, {
        slug: form.slug.trim(),
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
      });
      setReloadKey((current) => current + 1);
    } finally {
      setSaving(false);
    }
  }

  async function handleAddLink(event: React.FormEvent) {
    event.preventDefault();
    setLinking(true);
    try {
      await addSemanticDomainLink(slug, {
        relation_kind: linkForm.relation_kind.trim(),
        entity_kind: linkForm.entity_kind.trim(),
        entity_id: linkForm.entity_id ? Number(linkForm.entity_id) : null,
        entity_label: linkForm.entity_label.trim(),
        entity_href: linkForm.entity_href.trim() || null,
        notes: linkForm.notes.trim() || null,
        is_primary: linkForm.is_primary,
      });
      setLinkForm({
        relation_kind: "asset",
        entity_kind: "table",
        entity_id: "",
        entity_label: "",
        entity_href: "",
        notes: "",
        is_primary: false,
      });
      setReloadKey((current) => current + 1);
    } finally {
      setLinking(false);
    }
  }

  async function handleRemoveLink(linkId: number) {
    if (!window.confirm("Remover este vínculo semântico?")) return;
    await deleteSemanticDomainLink(slug, linkId);
    setReloadKey((current) => current + 1);
  }

  async function handleDelete() {
    if (!window.confirm("Excluir este domínio?")) return;
    await deleteSemanticDomain(slug);
    window.location.assign("/governance/domains");
  }

  if (loading && !payload) {
    return <div className="rounded-3xl border border-border/80 bg-surface p-6 shadow-card"><div className="h-64 animate-pulse rounded-3xl bg-bg-subtle" /></div>;
  }

  if (error && !payload) {
    return <EmptyState title="Domínio indisponível" description={error} />;
  }

  if (!payload) {
    return <EmptyState title="Sem dados" description="O domínio solicitado não pôde ser carregado." />;
  }

  return (
    <div className="space-y-6 pb-6">
      <Card className="border-border bg-[linear-gradient(135deg,#ffffff_0%,#f8fafc_55%,#eef6ff_100%)] shadow-[0_18px_48px_rgba(15,23,42,0.06)]">
        <CardContent className="space-y-4 p-6">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div className="space-y-2">
              <div className="inline-flex items-center gap-2 rounded-full border border-brand-200 bg-surface px-3 py-1 text-xs font-medium text-brand-700">
                Camada semântica · Domínio
              </div>
              <h2 className="text-3xl font-semibold tracking-tight text-text">{payload.name}</h2>
              <p className="max-w-4xl text-sm leading-7 text-text-body">
                {payload.description || "Sem descrição cadastrada. Use esta página para documentar o escopo de negócio, conectar ativos e acompanhar maturidade, qualidade e governança do domínio."}
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <Badge tone={maturityTone(payload.maturity_label)}>{payload.maturity_label}</Badge>
              <Badge tone={scoreTone(payload.maturity_score)}>Score {payload.maturity_score}</Badge>
            </div>
          </div>
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
            <div className="rounded-2xl border border-border/80 bg-surface p-4 shadow-sm">
              <p className="text-xs font-semibold uppercase tracking-[0.14em] text-muted">Owner</p>
              <p className="mt-2 text-sm font-semibold text-text">{payload.owner || "Não definido"}</p>
              <p className="mt-1 text-xs leading-5 text-muted">Responsável por decisões, prioridades e uso do domínio.</p>
            </div>
            <div className="rounded-2xl border border-border/80 bg-surface p-4 shadow-sm">
              <p className="text-xs font-semibold uppercase tracking-[0.14em] text-muted">Steward</p>
              <p className="mt-2 text-sm font-semibold text-text">{payload.steward || "Não definido"}</p>
              <p className="mt-1 text-xs leading-5 text-muted">Responsável por documentação, qualidade e governança.</p>
            </div>
            <div className="rounded-2xl border border-border/80 bg-surface p-4 shadow-sm">
              <p className="text-xs font-semibold uppercase tracking-[0.14em] text-muted">Qualidade</p>
              <p className="mt-2 text-sm font-semibold text-text">{payload.quality_score ?? 0}</p>
              <p className="mt-1 text-xs leading-5 text-muted">Leitura dos sinais de Data Quality dos ativos vinculados.</p>
            </div>
            <div className="rounded-2xl border border-border/80 bg-surface p-4 shadow-sm">
              <p className="text-xs font-semibold uppercase tracking-[0.14em] text-muted">Governança</p>
              <p className="mt-2 text-sm font-semibold text-text">{payload.governance_score ?? 0}</p>
              <p className="mt-1 text-xs leading-5 text-muted">Cobertura de responsáveis, documentação, tags, classificação e vínculos.</p>
            </div>
          </div>
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
            <div className="rounded-2xl border border-brand-100 bg-brand-50/60 p-4">
              <p className="text-xs font-semibold uppercase tracking-[0.14em] text-brand-700">Ativos associados</p>
              <p className="mt-2 text-2xl font-semibold text-brand-950">{payload.assets_count}</p>
              <p className="mt-1 text-xs leading-5 text-brand-800">Tabelas e ativos técnicos conectados ao contexto de negócio.</p>
            </div>
            <div className="rounded-2xl border border-brand-100 bg-brand-50/60 p-4">
              <p className="text-xs font-semibold uppercase tracking-[0.14em] text-brand-700">Produtos</p>
              <p className="mt-2 text-2xl font-semibold text-brand-950">{payload.products_count}</p>
              <p className="mt-1 text-xs leading-5 text-brand-800">Entregas semânticas, métricas ou conjuntos prontos para consumo.</p>
            </div>
            <div className="rounded-2xl border border-brand-100 bg-brand-50/60 p-4">
              <p className="text-xs font-semibold uppercase tracking-[0.14em] text-brand-700">Regras DQ</p>
              <p className="mt-2 text-2xl font-semibold text-brand-950">{payload.rules_count}</p>
              <p className="mt-1 text-xs leading-5 text-brand-800">Validações de qualidade associadas aos ativos do domínio.</p>
            </div>
            <div className="rounded-2xl border border-brand-100 bg-brand-50/60 p-4">
              <p className="text-xs font-semibold uppercase tracking-[0.14em] text-brand-700">Incidentes</p>
              <p className="mt-2 text-2xl font-semibold text-brand-950">{payload.incidents_count}</p>
              <p className="mt-1 text-xs leading-5 text-brand-800">Problemas operacionais ou de qualidade ligados ao domínio.</p>
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button asChild size="sm" variant="outline">
              <Link href={`/search?domain=${encodeURIComponent(payload.name)}`}>Buscar ativos</Link>
            </Button>
            <Button asChild size="sm" variant="outline">
              <Link href="/governance/data-products">Ver produtos</Link>
            </Button>
            <Button asChild size="sm" variant="outline" onClick={() => void setReloadKey((current) => current + 1)}>
              <RefreshCw className="mr-2 h-4 w-4" />
              Recarregar
            </Button>
            <Button size="sm" variant="danger" onClick={() => void handleDelete()}>
              Excluir
            </Button>
          </div>
        </CardContent>
      </Card>

      <ContextualJourneyCard
        title="Jornadas principais do domínio"
        description="Use o domínio como ponto de entrada de negócio para navegar entre ativos técnicos, produtos de dados, Data Quality, incidentes, linhagem e indicadores executivos."
        links={[
          { description: "Abrir os produtos associados a este domínio.", href: "/governance/data-products", label: "Produtos de dados", tone: "accent" },
          { description: "Abrir a visão técnica do ativo e suas abas.", href: "/explorer", label: "Explorer", tone: "neutral" },
          { description: "Revisar qualidade e contratos do domínio.", href: "/data-quality", label: "Data Quality", tone: "success" },
          { description: "Abrir incidentes do domínio.", href: "/incidents/tickets", label: "Incidentes", tone: "warning" },
          { description: "Ver dependências e impacto de mudança.", href: "/lineage", label: "Linhagem", tone: "accent" },
          { description: "Abrir a leitura executiva de maturidade.", href: "/dashboard", label: "Dashboard executivo", tone: "neutral" },
        ]}
      />

      <div className="grid gap-6 xl:grid-cols-[1fr_0.95fr]">
        <Card className="border-border/80 bg-surface shadow-card">
          <CardContent className="space-y-4 p-5">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-muted">Editar</p>
                <h3 className="mt-2 text-lg font-semibold text-text">Dados do domínio</h3>
                <p className="mt-1 max-w-2xl text-sm leading-6 text-text-body">
                  Mantenha a identidade de negócio do domínio clara para que usuários saibam escopo, responsáveis e nível de maturidade.
                </p>
              </div>
              <Button size="sm" variant="outline" onClick={() => void setReloadKey((current) => current + 1)}>
                <RefreshCw className="mr-2 h-4 w-4" />
                Atualizar
              </Button>
            </div>
            <form className="grid gap-3 md:grid-cols-2" onSubmit={(event) => void handleSave(event)}>
              <label className="space-y-1 text-sm text-text-body">
                <span className="text-xs font-semibold uppercase tracking-[0.16em] text-muted">Nome</span>
                <Input value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} />
                <FieldHelp>Nome de negócio usado por áreas consumidoras, governança e times técnicos.</FieldHelp>
              </label>
              <label className="space-y-1 text-sm text-text-body">
                <span className="text-xs font-semibold uppercase tracking-[0.16em] text-muted">Slug</span>
                <Input value={form.slug} onChange={(event) => setForm({ ...form, slug: event.target.value })} />
                <FieldHelp>Identificador técnico usado em URLs, integrações e vínculos internos.</FieldHelp>
              </label>
              <label className="space-y-1 text-sm text-text-body md:col-span-2">
                <span className="text-xs font-semibold uppercase tracking-[0.16em] text-muted">Descrição</span>
                <Textarea rows={3} value={form.description} onChange={(event) => setForm({ ...form, description: event.target.value })} />
                <FieldHelp>Explique quais processos, dados e decisões pertencem ao domínio.</FieldHelp>
              </label>
              <label className="space-y-1 text-sm text-text-body">
                <span className="text-xs font-semibold uppercase tracking-[0.16em] text-muted">Owner</span>
                <Input value={form.owner} onChange={(event) => setForm({ ...form, owner: event.target.value })} />
                <FieldHelp>Responsável por decisões, prioridades e uso dos dados do domínio.</FieldHelp>
              </label>
              <label className="space-y-1 text-sm text-text-body">
                <span className="text-xs font-semibold uppercase tracking-[0.16em] text-muted">Steward</span>
                <Input value={form.steward} onChange={(event) => setForm({ ...form, steward: event.target.value })} />
                <FieldHelp>Responsável por documentação, qualidade, classificação e governança.</FieldHelp>
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
                <FieldHelp>Use criticidade para priorizar incidentes, regras e documentação.</FieldHelp>
              </label>
              <label className="space-y-1 text-sm text-text-body">
                <span className="text-xs font-semibold uppercase tracking-[0.16em] text-muted">Maturidade</span>
                <Select value={form.maturity_status} onChange={(event) => setForm({ ...form, maturity_status: event.target.value })}>
                  <option value="emerging">Em evolução</option>
                  <option value="defined">Definido</option>
                  <option value="managed">Gerenciado</option>
                  <option value="optimized">Otimizado</option>
                </Select>
                <FieldHelp>Indica o estágio de evolução do domínio em governança e operação.</FieldHelp>
              </label>
              <label className="space-y-1 text-sm text-text-body">
                <span className="text-xs font-semibold uppercase tracking-[0.16em] text-muted">Qualidade</span>
                <Input type="number" min="0" max="100" value={form.quality_score} onChange={(event) => setForm({ ...form, quality_score: event.target.value })} />
                <FieldHelp>Score usado como referência dos sinais de qualidade do domínio.</FieldHelp>
              </label>
              <label className="space-y-1 text-sm text-text-body">
                <span className="text-xs font-semibold uppercase tracking-[0.16em] text-muted">Governança</span>
                <Input type="number" min="0" max="100" value={form.governance_score} onChange={(event) => setForm({ ...form, governance_score: event.target.value })} />
                <FieldHelp>Score usado como referência de documentação, ownership, classificação e vínculos.</FieldHelp>
              </label>
              <label className="space-y-1 text-sm text-text-body md:col-span-2">
                <span className="text-xs font-semibold uppercase tracking-[0.16em] text-muted">Notas</span>
                <Textarea rows={3} value={form.notes} onChange={(event) => setForm({ ...form, notes: event.target.value })} />
                <FieldHelp>Inclua decisões, pendências, observações de operação ou regras de uso do domínio.</FieldHelp>
              </label>
              <div className="md:col-span-2 flex items-center justify-between gap-3">
                <p className="text-sm text-text-body">O score consolidado é calculado a partir dos ativos vinculados e do catálogo existente.</p>
                <Button disabled={saving} type="submit">
                  {saving ? "Salvando..." : "Salvar alterações"}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>

        <Card className="border-border/80 bg-surface shadow-card">
          <CardContent className="space-y-4 p-5">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-muted">Vínculos</p>
                <h3 className="mt-2 text-lg font-semibold text-text">Adicionar relação semântica</h3>
                <p className="mt-1 max-w-2xl text-sm leading-6 text-text-body">
                  Associe tabelas, pipelines, regras, incidentes, dashboards ou contratos para transformar o domínio em uma visão operacional completa.
                </p>
              </div>
              <Badge tone="accent">{activeLinks.length}</Badge>
            </div>
            <form className="grid gap-3 md:grid-cols-2" onSubmit={(event) => void handleAddLink(event)}>
              <label className="space-y-1 text-sm text-text-body">
                <span className="text-xs font-semibold uppercase tracking-[0.16em] text-muted">Tipo</span>
                <Select value={linkForm.relation_kind} onChange={(event) => setLinkForm({ ...linkForm, relation_kind: event.target.value })}>
                  <option value="asset">Ativo</option>
                  <option value="pipeline">Pipeline</option>
                  <option value="dq_rule">Regra DQ</option>
                  <option value="incident">Incidente</option>
                  <option value="dashboard">Dashboard</option>
                  <option value="contract">Contrato</option>
                  <option value="integration">Integração</option>
                </Select>
              </label>
              <label className="space-y-1 text-sm text-text-body">
                <span className="text-xs font-semibold uppercase tracking-[0.16em] text-muted">Entidade</span>
                <Select value={linkForm.entity_kind} onChange={(event) => setLinkForm({ ...linkForm, entity_kind: event.target.value })}>
                  <option value="table">Tabela</option>
                  <option value="pipeline">Pipeline</option>
                  <option value="dq_rule">Regra DQ</option>
                  <option value="incident">Incidente</option>
                  <option value="dashboard">Dashboard</option>
                  <option value="contract">Contrato</option>
                  <option value="integration">Integração</option>
                </Select>
              </label>
              <label className="space-y-1 text-sm text-text-body">
                <span className="text-xs font-semibold uppercase tracking-[0.16em] text-muted">Entity ID</span>
                <Input value={linkForm.entity_id} onChange={(event) => setLinkForm({ ...linkForm, entity_id: event.target.value })} placeholder="Opcional" />
                <FieldHelp>Use quando houver identificador interno conhecido, como o ID da tabela no catálogo.</FieldHelp>
              </label>
              <label className="space-y-1 text-sm text-text-body">
                <span className="text-xs font-semibold uppercase tracking-[0.16em] text-muted">Principal</span>
                <Select value={linkForm.is_primary ? "true" : "false"} onChange={(event) => setLinkForm({ ...linkForm, is_primary: event.target.value === "true" })}>
                  <option value="false">Não</option>
                  <option value="true">Sim</option>
                </Select>
              </label>
              <label className="space-y-1 text-sm text-text-body md:col-span-2">
                <span className="text-xs font-semibold uppercase tracking-[0.16em] text-muted">Label</span>
                <Input value={linkForm.entity_label} onChange={(event) => setLinkForm({ ...linkForm, entity_label: event.target.value })} placeholder="Nome legível da entidade" />
                <FieldHelp>Nome que ajudará usuários a reconhecerem o ativo, regra, dashboard ou incidente.</FieldHelp>
              </label>
              <label className="space-y-1 text-sm text-text-body md:col-span-2">
                <span className="text-xs font-semibold uppercase tracking-[0.16em] text-muted">Link</span>
                <Input value={linkForm.entity_href} onChange={(event) => setLinkForm({ ...linkForm, entity_href: event.target.value })} placeholder="/explorer?tableId=1" />
                <FieldHelp>Opcional. Informe uma rota interna para abrir o recurso relacionado.</FieldHelp>
              </label>
              <label className="space-y-1 text-sm text-text-body md:col-span-2">
                <span className="text-xs font-semibold uppercase tracking-[0.16em] text-muted">Observação</span>
                <Textarea rows={3} value={linkForm.notes} onChange={(event) => setLinkForm({ ...linkForm, notes: event.target.value })} />
                <FieldHelp>Explique por que a entidade pertence ao domínio ou qual decisão depende dela.</FieldHelp>
              </label>
              <div className="md:col-span-2 flex items-center justify-between gap-3">
                <p className="text-sm text-text-body">Linke ativos, DAGs, regras, incidentes ou dashboards ao domínio.</p>
                <Button disabled={linking} type="submit">
                  <Plus className="mr-2 h-4 w-4" />
                  {linking ? "Adicionando..." : "Adicionar vínculo"}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 xl:grid-cols-[1fr_0.95fr]">
        <Card className="border-border/80 bg-surface shadow-card">
          <CardContent className="space-y-4 p-5">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-muted">Ativos vinculados</p>
              <h3 className="mt-2 text-lg font-semibold text-text">Explorar os ativos do domínio</h3>
              <p className="mt-1 text-sm leading-6 text-text-body">
                Ativos associados mostram como o domínio se materializa no catálogo técnico. Use os atalhos para investigar documentação, qualidade, incidentes e linhagem.
              </p>
            </div>
            <div className="grid gap-3">
              {assets.length ? assets.map((item) => (
                <div className="rounded-2xl border border-border/80 bg-bg-subtle p-4" key={item.entity_id}>
                  <div className="flex flex-wrap items-start justify-between gap-4">
                    <div>
                      <p className="text-sm font-semibold text-text">{item.label}</p>
                      <p className="mt-1 text-sm text-text-body">{item.datasource_name} · {item.database_name} · {item.schema_name}</p>
                      <p className="mt-1 text-xs text-muted">DQ {item.dq_score ?? 0} · Governança {item.trust_score ?? 0} · Prontidão {item.readiness_score ?? 0}</p>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {assetButtons(item)}
                    </div>
                  </div>
                </div>
              )) : (
                <EmptyState title="Sem ativos vinculados" description="Adicione tabelas ao domínio para acompanhar qualidade, governança, incidentes e linhagem por contexto de negócio." />
              )}
            </div>
          </CardContent>
        </Card>

        <Card className="border-border/80 bg-surface shadow-card">
          <CardContent className="space-y-4 p-5">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-muted">Vínculos semânticos</p>
              <h3 className="mt-2 text-lg font-semibold text-text">Domínio em contexto</h3>
              <p className="mt-1 text-sm leading-6 text-text-body">
                Vínculos conectam o domínio a regras, incidentes, dashboards, contratos e integrações que ajudam a explicar risco, uso e maturidade.
              </p>
            </div>
            <div className="grid gap-3">
              {activeLinks.length ? activeLinks.map((link) => <LinkRow key={link.id} link={link} onRemove={(linkId) => void handleRemoveLink(linkId)} />) : (
                <EmptyState title="Sem vínculos semânticos" description="Use o formulário para conectar pipelines, incidentes, dashboards, regras e contratos ao domínio." />
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      <Card className="border-border/80 bg-surface shadow-card">
        <CardContent className="space-y-4 p-5">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-muted">Produtos de dados</p>
            <h3 className="mt-2 text-lg font-semibold text-text">Produtos associados a este domínio</h3>
            <p className="mt-1 max-w-3xl text-sm leading-6 text-text-body">
              Produtos de dados representam entregas consumíveis do domínio, como conjuntos certificados, métricas, dashboards ou contratos de uso.
            </p>
          </div>
          {products.length ? (
            <div className="grid gap-4 lg:grid-cols-2 xl:grid-cols-3">
              {products.map((product) => (
                <Card className="border-border/80 bg-bg-subtle shadow-sm" key={product.id}>
                  <CardContent className="space-y-3 p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="text-sm font-semibold text-text">{product.name}</p>
                        <p className="mt-1 text-xs text-muted">{product.maturity_label} · Score {product.maturity_score}</p>
                      </div>
                      <Badge tone={scoreTone(product.maturity_score)}>{product.maturity_score}</Badge>
                    </div>
                    <p className="text-sm text-text-body">{product.description || "Sem descrição"}</p>
                    <Button asChild size="sm" variant="outline">
                      <Link href={`/governance/data-products/${product.slug}`}>
                        Abrir produto
                        <ArrowRight className="ml-2 h-4 w-4" />
                      </Link>
                    </Button>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <EmptyState title="Sem produtos associados" description="Crie produtos de dados para representar entregas lógicas, métricas ou conjuntos confiáveis deste domínio." />
          )}
        </CardContent>
      </Card>
    </div>
  );
}
