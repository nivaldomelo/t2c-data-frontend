import { Link } from "@/lib/next-shims";
import { useEffect, useMemo, useState } from "react";
import { Activity, AlertTriangle, ArrowRight, CheckCircle2, Database, FileCheck2, Network, Plus, ShieldCheck, Trash2, Users } from "lucide-react";

import { ContextualJourneyCard } from "@/components/navigation/contextual-journey-card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";

import {
  addSemanticProductLink,
  deleteSemanticProduct,
  deleteSemanticProductLink,
  getSemanticDomain,
  getSemanticProduct,
  getSemanticProductSummary,
  listSemanticDomains,
  updateSemanticProduct,
} from "../sdk";
import type { SemanticAsset, SemanticDomain, SemanticDomainDetail, SemanticLink, SemanticProductDetail, SemanticProductSummary } from "../types";

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

function summaryNumber(value: unknown, fallback = 0) {
  return typeof value === "number" ? value : fallback;
}

function summaryList(value: unknown) {
  return Array.isArray(value) ? value : [];
}

function certificationReadiness(payload: SemanticProductDetail, assets: SemanticAsset[]) {
  const checks = [
    { label: "Domínio vinculado", passed: Boolean(payload.domain_slug) },
    { label: "Owner definido", passed: Boolean(payload.owner) },
    { label: "Steward definido", passed: Boolean(payload.steward) },
    { label: "Consumidores informados", passed: payload.consumers.length > 0 },
    { label: "SLA definido", passed: Boolean(payload.sla_text) },
    { label: "Contrato associado", passed: Boolean(payload.contract_text || payload.contracts_count > 0) },
    { label: "Ativos associados", passed: assets.length > 0 },
    { label: "Qualidade monitorada", passed: (payload.quality_score ?? 0) >= 85 || payload.rules_count > 0 },
    { label: "Sem incidente crítico", passed: assets.every((asset) => asset.critical_open_incidents === 0) },
    { label: "Governança mínima", passed: (payload.governance_score ?? 0) >= 80 },
  ];
  const passed = checks.filter((item) => item.passed).length;
  const percent = Math.round((passed / checks.length) * 100);
  const status = percent >= 90 ? "Candidato" : percent >= 70 ? "Em validação" : assets.some((asset) => asset.critical_open_incidents > 0) ? "Bloqueado" : "Não avaliado";
  const tone = percent >= 90 ? "success" : percent >= 70 ? "accent" : assets.some((asset) => asset.critical_open_incidents > 0) ? "danger" : "warning";
  return { checks, percent, status, tone: tone as "success" | "accent" | "danger" | "warning" };
}

function productRecommendations(payload: SemanticProductDetail, assets: SemanticAsset[], links: SemanticLink[]) {
  const recommendations: Array<{ title: string; description: string; priority: "Alta" | "Média" | "Baixa"; action: string; href?: string }> = [];
  const hasCriticalIncident = assets.some((asset) => asset.critical_open_incidents > 0);
  if (!payload.domain_slug) {
    recommendations.push({ title: "Associar domínio", description: "Este produto ainda não está conectado a um domínio de negócio, o que dificulta ownership e governança.", priority: "Alta", action: "Editar produto" });
  }
  if (!assets.length) {
    recommendations.push({ title: "Associar ativos técnicos", description: "Sem tabelas ou views vinculadas, não é possível consolidar qualidade, incidentes, linhagem ou impacto.", priority: "Alta", action: "Adicionar ativos" });
  }
  if (!payload.consumers.length) {
    recommendations.push({ title: "Informar consumidores", description: "Consumidores ajudam a medir impacto, priorizar incidentes e justificar certificação.", priority: "Média", action: "Editar consumidores" });
  }
  if (!payload.sla_text) {
    recommendations.push({ title: "Definir SLA", description: "O SLA formaliza expectativa de atualização, disponibilidade e resposta para quem consome o produto.", priority: "Média", action: "Definir SLA" });
  }
  if (!payload.contract_text && payload.contracts_count === 0) {
    recommendations.push({ title: "Criar contrato de dados", description: "O contrato formaliza campos obrigatórios, regras críticas, qualidade mínima e expectativas de uso.", priority: "Alta", action: "Criar ou associar contrato" });
  }
  if (payload.rules_count === 0) {
    recommendations.push({ title: "Configurar regras de qualidade", description: "Sem regras DQ, problemas de completude, validade, freshness ou duplicidade podem passar despercebidos.", priority: "Alta", action: "Abrir Data Quality", href: "/data-quality" });
  }
  if (payload.incidents_count > 0 || hasCriticalIncident) {
    recommendations.push({ title: "Resolver incidentes antes de certificar", description: "Incidentes abertos podem afetar consumidores, SLA e confiança da entrega.", priority: hasCriticalIncident ? "Alta" : "Média", action: "Ver incidentes", href: "/incidents/tickets" });
  }
  if ((payload.quality_score ?? 0) < 85) {
    recommendations.push({ title: "Investigar qualidade", description: "O score de qualidade ainda não indica uma entrega plenamente confiável para consumo crítico.", priority: "Média", action: "Abrir Data Quality", href: "/data-quality" });
  }
  if ((payload.governance_score ?? 0) < 80) {
    recommendations.push({ title: "Completar governança", description: "Reforce owner, steward, descrição, contrato, documentação e vínculos antes da certificação.", priority: "Média", action: "Editar produto" });
  }
  if (!links.some((link) => link.entity_kind === "dashboard")) {
    recommendations.push({ title: "Associar dashboards ou consumidores", description: "Dashboards ajudam a medir impacto e priorizar problemas que afetam áreas usuárias.", priority: "Baixa", action: "Adicionar dashboard" });
  }
  if (!recommendations.length) {
    recommendations.push({ title: "Avaliar certificação", description: "O produto possui bons sinais de qualidade e governança. Considere iniciar validação formal de certificação.", priority: "Baixa", action: "Revisar checklist" });
  }
  return recommendations.slice(0, 6);
}

function relationLabel(kind: string) {
  const labels: Record<string, string> = {
    table: "Tabela",
    dashboard: "Dashboard",
    contract: "Contrato",
    incident: "Incidente",
    pipeline: "Pipeline",
    dq_rule: "Regra DQ",
  };
  return labels[kind] || kind;
}

function assetButtons(item: { entity_id: number; href: string; entity_kind: string }) {
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

export function SemanticProductDetailPage({ slug }: { slug: string }) {
  const [payload, setPayload] = useState<SemanticProductDetail | null>(null);
  const [summary, setSummary] = useState<SemanticProductSummary | null>(null);
  const [domains, setDomains] = useState<SemanticDomain[]>([]);
  const [domainDetail, setDomainDetail] = useState<SemanticDomainDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const [linking, setLinking] = useState(false);
  const [reloadKey, setReloadKey] = useState(0);
  const [form, setForm] = useState({
    domain_slug: "",
    slug: "",
    name: "",
    description: "",
    owner: "",
    steward: "",
    consumers: "",
    sla_text: "",
    contract_text: "",
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
  const [assetPickerOpen, setAssetPickerOpen] = useState(false);

  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    setError("");
    void (async () => {
      try {
        const [productData, domainData, summaryResult] = await Promise.all([
          getSemanticProduct(slug),
          listSemanticDomains("", 1, 100),
          getSemanticProductSummary(slug).catch(() => null),
        ]);
        const productDomainDetail = productData.domain_slug ? await getSemanticDomain(productData.domain_slug) : null;
        if (controller.signal.aborted) return;
        setPayload(productData);
        setSummary(summaryResult);
        setDomains(domainData.items || []);
        setDomainDetail(productDomainDetail);
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
      domain_slug: payload.domain_slug || "",
      slug: payload.slug,
      name: payload.name,
      description: payload.description || "",
      owner: payload.owner || "",
      steward: payload.steward || "",
      consumers: payload.consumers.join(", "),
      sla_text: payload.sla_text || "",
      contract_text: payload.contract_text || "",
      maturity_status: payload.maturity_status || "emerging",
      quality_score: payload.quality_score !== undefined && payload.quality_score !== null ? String(payload.quality_score) : "",
      governance_score: payload.governance_score !== undefined && payload.governance_score !== null ? String(payload.governance_score) : "",
      notes: payload.notes || "",
      is_active: payload.is_active,
    });
  }, [payload]);

  const activeLinks = useMemo(() => payload?.links || [], [payload]);
  const assets = useMemo(() => payload?.assets || [], [payload]);
  const tableLinks = useMemo(() => activeLinks.filter((link) => link.entity_kind === "table"), [activeLinks]);
  const dashboardLinks = useMemo(() => activeLinks.filter((link) => link.entity_kind === "dashboard"), [activeLinks]);
  const contractLinks = useMemo(() => activeLinks.filter((link) => link.entity_kind === "contract"), [activeLinks]);
  const incidentLinks = useMemo(() => activeLinks.filter((link) => link.entity_kind === "incident"), [activeLinks]);
  const dqRuleLinks = useMemo(() => activeLinks.filter((link) => link.entity_kind === "dq_rule"), [activeLinks]);
  const pipelineLinks = useMemo(() => activeLinks.filter((link) => link.entity_kind === "pipeline"), [activeLinks]);
  const assetCandidates = useMemo(() => {
    const linkedIds = new Set(assets.map((asset) => asset.entity_id));
    return (domainDetail?.assets || []).filter((asset) => !linkedIds.has(asset.entity_id));
  }, [assets, domainDetail]);
  const averageAssetQuality = useMemo(() => {
    const summaryScore = summary?.quality?.score;
    if (typeof summaryScore === "number") return summaryScore;
    const scores = assets.map((asset) => asset.dq_score).filter((score): score is number => typeof score === "number");
    if (!scores.length) return payload?.quality_score ?? 0;
    return Math.round(scores.reduce((sum, score) => sum + score, 0) / scores.length);
  }, [assets, payload?.quality_score, summary]);
  const readiness = useMemo(() => (payload ? certificationReadiness(payload, assets) : null), [assets, payload]);
  const backendReadiness = summary?.certification_readiness;
  const readinessStatus = backendReadiness?.status || readiness?.status || "Não avaliado";
  const readinessPercent = backendReadiness?.score ?? readiness?.percent ?? 0;
  const readinessTone =
    readinessStatus === "ready" || readinessStatus === "Candidato"
      ? "success"
      : readinessStatus === "candidate" || readinessStatus === "Em validação"
        ? "accent"
        : readinessStatus === "blocked" || readinessStatus === "Bloqueado"
          ? "danger"
          : "warning";
  const readinessChecklist = backendReadiness?.checklist || readiness?.checks || [];
  const recommendations = useMemo(() => {
    if (summary?.recommendations?.length) {
      return summary.recommendations.map((item) => ({
        title: item.title,
        description: item.description,
        priority: item.severity === "high" ? "Alta" as const : item.severity === "medium" ? "Média" as const : "Baixa" as const,
        action: item.action_label,
        href: item.action_target.startsWith("/") ? item.action_target : undefined,
      }));
    }
    return payload ? productRecommendations(payload, assets, activeLinks) : [];
  }, [activeLinks, assets, payload, summary]);
  const linkedRuleCount = (payload?.rules_count ?? 0) + dqRuleLinks.length;
  const qualityRulesTotal = summaryNumber(summary?.quality?.rules_total, linkedRuleCount);
  const qualityRulesActive = summaryNumber(summary?.quality?.rules_active, qualityRulesTotal);
  const qualityRulesFailed = summaryNumber(summary?.quality?.rules_failed);
  const qualityAssetsWithoutRules = summaryNumber(summary?.quality?.assets_without_rules, linkedRuleCount ? 0 : assets.length);
  const openIncidents = summary?.incidents?.open ?? payload?.incidents_count ?? 0;
  const criticalIncidents = summary?.incidents?.critical ?? assets.reduce((sum, asset) => sum + asset.critical_open_incidents, 0);
  const affectedAssets = summary?.assets?.with_incidents ?? assets.filter((asset) => asset.open_incidents > 0).length;
  const dashboardTotal = summary?.dashboards?.total ?? dashboardLinks.length;
  const lineageUpstreamTotal = summaryList(summary?.lineage?.upstreams).length || assets.length;
  const lineagePipelineTotal = summaryList(summary?.lineage?.pipelines).length || ((payload?.pipelines_count ?? 0) + pipelineLinks.length);
  const lineageConsumerTotal = payload?.consumers.length ?? 0;
  const hasLineageSummary = lineageUpstreamTotal > 0 || lineagePipelineTotal > 0 || summaryList(summary?.lineage?.downstreams).length > 0;

  async function handleSave(event: React.FormEvent) {
    event.preventDefault();
    setSaving(true);
    try {
      await updateSemanticProduct(slug, {
        domain_slug: form.domain_slug.trim(),
        slug: form.slug.trim(),
        name: form.name.trim(),
        description: form.description.trim() || null,
        owner: form.owner.trim() || null,
        steward: form.steward.trim() || null,
        consumers: form.consumers
          .split(",")
          .map((item) => item.trim())
          .filter(Boolean),
        sla_text: form.sla_text.trim() || null,
        contract_text: form.contract_text.trim() || null,
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
      await addSemanticProductLink(slug, {
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

  async function handleAddAsset(asset: SemanticAsset) {
    setLinking(true);
    try {
      await addSemanticProductLink(slug, {
        relation_kind: "asset",
        entity_kind: "table",
        entity_id: asset.entity_id,
        entity_label: asset.label,
        entity_href: asset.href,
        notes: `Ativo candidato sugerido pelo domínio ${payload?.domain_name || "do produto"}.`,
        is_primary: assets.length === 0,
      });
      setReloadKey((current) => current + 1);
    } finally {
      setLinking(false);
    }
  }

  async function handleRemoveAsset(assetId: number) {
    const link = tableLinks.find((item) => item.entity_id === assetId);
    if (!link) return;
    await handleRemoveLink(link.id);
  }

  async function handleRemoveLink(linkId: number) {
    if (!window.confirm("Remover este vínculo semântico?")) return;
    await deleteSemanticProductLink(slug, linkId);
    setReloadKey((current) => current + 1);
  }

  async function handleDelete() {
    if (!window.confirm("Excluir este produto de dados?")) return;
    await deleteSemanticProduct(slug);
    window.location.assign("/governance/data-products");
  }

  if (loading && !payload) {
    return <div className="rounded-3xl border border-border/80 bg-surface p-6 shadow-card"><div className="h-64 animate-pulse rounded-3xl bg-bg-subtle" /></div>;
  }

  if (error && !payload) {
    return <EmptyState title="Produto indisponível" description={error} />;
  }

  if (!payload) {
    return <EmptyState title="Sem dados" description="O produto solicitado não pôde ser carregado." />;
  }

  return (
    <div className="space-y-6 pb-6">
      <Card className="border-border bg-[linear-gradient(135deg,#ffffff_0%,#f8fafc_55%,#eef6ff_100%)] shadow-[0_18px_48px_rgba(15,23,42,0.06)]">
        <CardContent className="space-y-4 p-6">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div className="space-y-2">
              <div className="inline-flex items-center gap-2 rounded-full border border-brand-200 bg-surface px-3 py-1 text-xs font-medium text-brand-700">
                Camada semântica · Produto de dados
              </div>
              <h2 className="text-3xl font-semibold tracking-tight text-text">{payload.name}</h2>
              <p className="max-w-4xl text-sm leading-7 text-text-body">
                {payload.description || "Este produto de dados organiza uma entrega consumível para áreas, sistemas ou dashboards. Use esta visão para acompanhar se os ativos associados possuem qualidade, contrato, SLA e governança suficientes para consumo confiável."}
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <Badge tone={maturityTone(payload.maturity_label)}>{payload.maturity_label}</Badge>
              <Badge tone={scoreTone(payload.maturity_score)}>Score {payload.maturity_score}</Badge>
              <Badge tone={readinessTone}>{readinessStatus}</Badge>
            </div>
          </div>
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
            <div className="rounded-2xl border border-border/80 bg-surface p-4 shadow-sm">
              <p className="text-xs font-semibold uppercase tracking-[0.14em] text-muted">Domínio</p>
              <p className="mt-2 text-sm font-semibold text-text">{payload.domain_name || "Não definido"}</p>
              <p className="mt-1 text-xs leading-5 text-muted">Contexto de negócio que sustenta a entrega.</p>
            </div>
            <div className="rounded-2xl border border-border/80 bg-surface p-4 shadow-sm">
              <p className="text-xs font-semibold uppercase tracking-[0.14em] text-muted">Owner</p>
              <p className="mt-2 text-sm font-semibold text-text">{payload.owner || "Não definido"}</p>
              <p className="mt-1 text-xs leading-5 text-muted">Responsável por prioridade e evolução.</p>
            </div>
            <div className="rounded-2xl border border-border/80 bg-surface p-4 shadow-sm">
              <p className="text-xs font-semibold uppercase tracking-[0.14em] text-muted">Consumers</p>
              <p className="mt-2 text-sm font-semibold text-text">{payload.consumers.length ? payload.consumers.join(", ") : "Não definido"}</p>
              <p className="mt-1 text-xs leading-5 text-muted">Áreas, sistemas ou dashboards que usam o produto.</p>
            </div>
            <div className="rounded-2xl border border-border/80 bg-surface p-4 shadow-sm">
              <p className="text-xs font-semibold uppercase tracking-[0.14em] text-muted">Governança</p>
              <p className="mt-2 text-sm font-semibold text-text">{payload.governance_score ?? 0}</p>
              <p className="mt-1 text-xs leading-5 text-muted">Cobertura de owner, steward, contrato, documentação e vínculos.</p>
            </div>
          </div>
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
            {[
              { label: "Ativos associados", value: assets.length, hint: "Tabelas, views ou ativos técnicos vinculados.", icon: Database },
              { label: "Regras DQ", value: payload.rules_count + dqRuleLinks.length, hint: "Validações relacionadas aos ativos ou ao produto.", icon: ShieldCheck },
              { label: "Incidentes abertos", value: payload.incidents_count, hint: "Problemas ativos que podem afetar consumidores ou SLA.", icon: AlertTriangle },
              { label: "Dashboards", value: payload.dashboards_count + dashboardLinks.length, hint: "Painéis ou relatórios associados ao produto.", icon: Activity },
              { label: "Score de qualidade", value: averageAssetQuality, hint: "Média ou referência dos sinais dos ativos associados.", icon: CheckCircle2 },
              { label: "Score de governança", value: payload.governance_score ?? 0, hint: "Cobertura de elementos mínimos para uso confiável.", icon: FileCheck2 },
              { label: "Contratos", value: payload.contracts_count + contractLinks.length + (payload.contract_text ? 1 : 0), hint: "Expectativas formais de uso, SLA e qualidade.", icon: FileCheck2 },
              { label: "Prontidão", value: `${readinessPercent}%`, hint: "Checklist visual para avaliação de certificação.", icon: ShieldCheck },
            ].map((card) => {
              const Icon = card.icon;
              return (
                <div className="rounded-2xl border border-brand-100 bg-brand-50/60 p-4" key={card.label}>
                  <Icon className="h-5 w-5 text-brand-700" />
                  <p className="mt-3 text-xs font-semibold uppercase tracking-[0.14em] text-brand-700">{card.label}</p>
                  <p className="mt-2 text-2xl font-semibold text-brand-950">{card.value}</p>
                  <p className="mt-1 text-xs leading-5 text-brand-800">{card.hint}</p>
                </div>
              );
            })}
          </div>
          <div className="flex flex-wrap gap-2">
            <Button size="sm" onClick={() => setAssetPickerOpen(true)}>
              <Plus className="mr-2 h-4 w-4" />
              Associar ativos
            </Button>
            {payload.domain_slug ? (
              <Button asChild size="sm" variant="outline">
                <Link href={`/governance/domains/${payload.domain_slug}`}>Ir ao domínio</Link>
              </Button>
            ) : null}
            <Button asChild size="sm" variant="outline">
              <Link href="/data-quality">Abrir Data Quality</Link>
            </Button>
            <Button asChild size="sm" variant="outline">
              <Link href="/incidents/tickets">Ver incidentes</Link>
            </Button>
            <Button asChild size="sm" variant="outline">
              <Link href="/lineage">Ver linhagem</Link>
            </Button>
            <Button asChild size="sm" variant="outline">
              <Link href={`/search?owner=${encodeURIComponent(payload.owner || "")}`}>Buscar por owner</Link>
            </Button>
            <Button asChild size="sm" variant="outline" onClick={() => void setReloadKey((current) => current + 1)}>
              <ArrowRight className="mr-2 h-4 w-4 rotate-[-45deg]" />
              Recarregar
            </Button>
            <Button size="sm" variant="danger" onClick={() => void handleDelete()}>
              Excluir
            </Button>
          </div>
        </CardContent>
      </Card>

      <ContextualJourneyCard
        title="Navegação semântica"
        description="O produto organiza consumidores, contratos, impacto e operação em torno de uma entrega lógica."
        links={[
          ...(payload.domain_slug
            ? [{ description: "Abrir o domínio que sustenta este produto.", href: `/governance/domains/${payload.domain_slug}`, label: "Domínio", tone: "accent" as const }]
            : []),
          { description: "Explorar os ativos que compõem o produto.", href: "/explorer", label: "Explorer", tone: "neutral" },
          { description: "Revisar qualidade, contratos e cobertura.", href: "/data-quality", label: "Data Quality", tone: "success" },
          { description: "Abrir incidentes vinculados ao produto.", href: "/incidents/tickets", label: "Incidentes", tone: "warning" },
          { description: "Ver dependências, dashboards e impacto.", href: "/lineage", label: "Linhagem", tone: "accent" },
          { description: "Conferir leitura executiva do domínio.", href: "/dashboard", label: "Dashboard executivo", tone: "neutral" },
        ]}
      />

      <div className="grid gap-6 xl:grid-cols-[0.95fr_1.05fr]">
        <Card className="border-border/80 bg-surface shadow-card">
          <CardContent className="space-y-4 p-5">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-muted">Certificação</p>
                <h3 className="mt-2 text-lg font-semibold text-text">Prontidão para certificação</h3>
                <p className="mt-1 text-sm leading-6 text-text-body">
                  Indica se o produto possui os elementos mínimos para ser avaliado como entrega confiável.
                </p>
              </div>
              <Badge tone={readinessTone}>{readinessStatus} · {readinessPercent}%</Badge>
            </div>
            <div className="grid gap-2 sm:grid-cols-2">
              {readinessChecklist.map((check) => (
                <div className="flex items-center gap-2 rounded-2xl border border-border/80 bg-bg-subtle p-3 text-sm" key={check.label}>
                  {check.passed ? <CheckCircle2 className="h-4 w-4 text-success-700" /> : <AlertTriangle className="h-4 w-4 text-warning-700" />}
                  <span className={check.passed ? "text-text-body" : "text-text-body"}>{check.label}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card className="border-border/80 bg-surface shadow-card">
          <CardContent className="space-y-4 p-5">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-muted">Recomendações</p>
              <h3 className="mt-2 text-lg font-semibold text-text">Próximas ações do produto</h3>
              <p className="mt-1 text-sm leading-6 text-text-body">
                Recomendações calculadas a partir de domínio, ativos, consumidores, SLA, contrato, qualidade, incidentes e vínculos existentes.
              </p>
            </div>
            <div className="grid gap-3 md:grid-cols-2">
              {recommendations.map((item) => (
                <div className="rounded-2xl border border-border/80 bg-bg-subtle p-4" key={item.title}>
                  <div className="flex items-start justify-between gap-3">
                    <p className="text-sm font-semibold text-text">{item.title}</p>
                    <Badge tone={item.priority === "Alta" ? "danger" : item.priority === "Média" ? "warning" : "neutral"}>{item.priority}</Badge>
                  </div>
                  <p className="mt-2 text-sm leading-6 text-text-body">{item.description}</p>
                  {item.href ? (
                    <Button asChild className="mt-3" size="sm" variant="outline">
                      <Link href={item.href}>{item.action}</Link>
                    </Button>
                  ) : (
                    <p className="mt-3 text-xs font-semibold uppercase tracking-[0.14em] text-brand-700">{item.action}</p>
                  )}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {assetPickerOpen ? (
        <Card className="border-brand-200 bg-brand-50/70 shadow-card">
          <CardContent className="space-y-4 p-5">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-brand-700">Adicionar ativos</p>
                <h3 className="mt-2 text-lg font-semibold text-brand-950">Ativos candidatos do domínio</h3>
                <p className="mt-1 max-w-4xl text-sm leading-6 text-brand-900">
                  Sugestões baseadas nos ativos já relacionados ao domínio do produto. Associe os ativos técnicos que sustentam a entrega para consolidar qualidade, incidentes, linhagem e impacto.
                </p>
              </div>
              <Button size="sm" variant="outline" onClick={() => setAssetPickerOpen(false)}>Fechar</Button>
            </div>
            {assetCandidates.length ? (
              <div className="grid gap-3 lg:grid-cols-2">
                {assetCandidates.map((asset) => (
                  <div className="rounded-2xl border border-brand-200 bg-surface p-4" key={asset.entity_id}>
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div>
                        <p className="text-sm font-semibold text-text">{asset.label}</p>
                        <p className="mt-1 text-xs text-muted">{asset.datasource_name} · {asset.database_name} · {asset.schema_name}</p>
                        <p className="mt-1 text-xs text-muted">
                          DQ {asset.dq_score ?? "N/D"} · Owner {asset.owner_name || "não definido"} · {asset.open_incidents} incidente(s)
                        </p>
                        <p className="mt-2 text-xs leading-5 text-brand-700">
                          Motivo: ativo do mesmo domínio do produto, candidato a compor a entrega.
                        </p>
                      </div>
                      <Button disabled={linking} size="sm" onClick={() => void handleAddAsset(asset)}>
                        Adicionar
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <EmptyState
                title="Nenhum ativo candidato encontrado"
                description="Não há ativos do domínio disponíveis para associação automática. Use o formulário de vínculos para informar uma tabela por ID ou adicione ativos ao domínio primeiro."
              />
            )}
          </CardContent>
        </Card>
      ) : null}

      <div className="grid gap-6 xl:grid-cols-[1fr_0.95fr]">
        <Card className="border-border/80 bg-surface shadow-card">
          <CardContent className="space-y-4 p-5">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-muted">Editar</p>
                <h3 className="mt-2 text-lg font-semibold text-text">Dados do produto</h3>
              </div>
              <Button size="sm" variant="outline" onClick={() => void setReloadKey((current) => current + 1)}>
                Recarregar
              </Button>
            </div>
            <form className="grid gap-3 md:grid-cols-2" onSubmit={(event) => void handleSave(event)}>
              <label className="space-y-1 text-sm text-text-body md:col-span-2">
                <span className="text-xs font-semibold uppercase tracking-[0.16em] text-muted">Domínio</span>
                <Select value={form.domain_slug} onChange={(event) => setForm({ ...form, domain_slug: event.target.value })}>
                  <option value="">Selecione um domínio</option>
                  {domains.map((domain) => (
                    <option key={domain.id} value={domain.slug}>
                      {domain.name}
                    </option>
                  ))}
                </Select>
              </label>
              <label className="space-y-1 text-sm text-text-body">
                <span className="text-xs font-semibold uppercase tracking-[0.16em] text-muted">Nome</span>
                <Input value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} />
              </label>
              <label className="space-y-1 text-sm text-text-body">
                <span className="text-xs font-semibold uppercase tracking-[0.16em] text-muted">Slug</span>
                <Input value={form.slug} onChange={(event) => setForm({ ...form, slug: event.target.value })} />
              </label>
              <label className="space-y-1 text-sm text-text-body md:col-span-2">
                <span className="text-xs font-semibold uppercase tracking-[0.16em] text-muted">Descrição</span>
                <Textarea rows={3} value={form.description} onChange={(event) => setForm({ ...form, description: event.target.value })} />
              </label>
              <label className="space-y-1 text-sm text-text-body">
                <span className="text-xs font-semibold uppercase tracking-[0.16em] text-muted">Owner</span>
                <Input value={form.owner} onChange={(event) => setForm({ ...form, owner: event.target.value })} />
              </label>
              <label className="space-y-1 text-sm text-text-body">
                <span className="text-xs font-semibold uppercase tracking-[0.16em] text-muted">Steward</span>
                <Input value={form.steward} onChange={(event) => setForm({ ...form, steward: event.target.value })} />
              </label>
              <label className="space-y-1 text-sm text-text-body md:col-span-2">
                <span className="text-xs font-semibold uppercase tracking-[0.16em] text-muted">Consumers</span>
                <Input value={form.consumers} onChange={(event) => setForm({ ...form, consumers: event.target.value })} placeholder="BI, Produto, Comercial" />
              </label>
              <label className="space-y-1 text-sm text-text-body">
                <span className="text-xs font-semibold uppercase tracking-[0.16em] text-muted">SLA</span>
                <Input value={form.sla_text} onChange={(event) => setForm({ ...form, sla_text: event.target.value })} />
              </label>
              <label className="space-y-1 text-sm text-text-body">
                <span className="text-xs font-semibold uppercase tracking-[0.16em] text-muted">Contrato</span>
                <Input value={form.contract_text} onChange={(event) => setForm({ ...form, contract_text: event.target.value })} />
              </label>
              <label className="space-y-1 text-sm text-text-body">
                <span className="text-xs font-semibold uppercase tracking-[0.16em] text-muted">Maturidade</span>
                <Select value={form.maturity_status} onChange={(event) => setForm({ ...form, maturity_status: event.target.value })}>
                  <option value="emerging">Em evolução</option>
                  <option value="defined">Definido</option>
                  <option value="managed">Gerenciado</option>
                  <option value="optimized">Otimizado</option>
                </Select>
              </label>
              <label className="space-y-1 text-sm text-text-body">
                <span className="text-xs font-semibold uppercase tracking-[0.16em] text-muted">Score de qualidade</span>
                <Input type="number" min="0" max="100" value={form.quality_score} onChange={(event) => setForm({ ...form, quality_score: event.target.value })} />
              </label>
              <label className="space-y-1 text-sm text-text-body">
                <span className="text-xs font-semibold uppercase tracking-[0.16em] text-muted">Score de governança</span>
                <Input type="number" min="0" max="100" value={form.governance_score} onChange={(event) => setForm({ ...form, governance_score: event.target.value })} />
              </label>
              <label className="space-y-1 text-sm text-text-body md:col-span-2">
                <span className="text-xs font-semibold uppercase tracking-[0.16em] text-muted">Notas</span>
                <Textarea rows={3} value={form.notes} onChange={(event) => setForm({ ...form, notes: event.target.value })} />
              </label>
              <div className="md:col-span-2 flex items-center justify-between gap-3">
                <p className="text-sm text-text-body">Mantenha contratos e consumidores alinhados ao domínio semântico do produto.</p>
                <Button disabled={saving} type="submit">
                  {saving ? "Salvando..." : "Salvar produto"}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>

        <Card className="border-border/80 bg-surface shadow-card">
          <CardContent className="space-y-4 p-5">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-muted">Vínculos</p>
              <h3 className="mt-2 text-lg font-semibold text-text">Adicionar e revisar relações</h3>
            </div>
            <form className="grid gap-3 md:grid-cols-2" onSubmit={(event) => void handleAddLink(event)}>
              <label className="space-y-1 text-sm text-text-body">
                <span className="text-xs font-semibold uppercase tracking-[0.16em] text-muted">Relação</span>
                <Select value={linkForm.relation_kind} onChange={(event) => setLinkForm({ ...linkForm, relation_kind: event.target.value })}>
                  <option value="asset">Asset</option>
                  <option value="consumer">Consumer</option>
                  <option value="pipeline">Pipeline</option>
                  <option value="dashboard">Dashboard</option>
                  <option value="contract">Contract</option>
                  <option value="incident">Incident</option>
                </Select>
              </label>
              <label className="space-y-1 text-sm text-text-body">
                <span className="text-xs font-semibold uppercase tracking-[0.16em] text-muted">Entidade</span>
                <Select value={linkForm.entity_kind} onChange={(event) => setLinkForm({ ...linkForm, entity_kind: event.target.value })}>
                  <option value="table">Table</option>
                  <option value="pipeline">Pipeline</option>
                  <option value="dashboard">Dashboard</option>
                  <option value="incident">Incident</option>
                  <option value="contract">Contract</option>
                </Select>
              </label>
              <label className="space-y-1 text-sm text-text-body">
                <span className="text-xs font-semibold uppercase tracking-[0.16em] text-muted">Entity ID</span>
                <Input value={linkForm.entity_id} onChange={(event) => setLinkForm({ ...linkForm, entity_id: event.target.value })} />
              </label>
              <label className="space-y-1 text-sm text-text-body">
                <span className="text-xs font-semibold uppercase tracking-[0.16em] text-muted">Principal</span>
                <Select value={linkForm.is_primary ? "yes" : "no"} onChange={(event) => setLinkForm({ ...linkForm, is_primary: event.target.value === "yes" })}>
                  <option value="no">Não</option>
                  <option value="yes">Sim</option>
                </Select>
              </label>
              <label className="space-y-1 text-sm text-text-body md:col-span-2">
                <span className="text-xs font-semibold uppercase tracking-[0.16em] text-muted">Label</span>
                <Input value={linkForm.entity_label} onChange={(event) => setLinkForm({ ...linkForm, entity_label: event.target.value })} />
              </label>
              <label className="space-y-1 text-sm text-text-body md:col-span-2">
                <span className="text-xs font-semibold uppercase tracking-[0.16em] text-muted">Href</span>
                <Input value={linkForm.entity_href} onChange={(event) => setLinkForm({ ...linkForm, entity_href: event.target.value })} />
              </label>
              <label className="space-y-1 text-sm text-text-body md:col-span-2">
                <span className="text-xs font-semibold uppercase tracking-[0.16em] text-muted">Notas</span>
                <Textarea rows={3} value={linkForm.notes} onChange={(event) => setLinkForm({ ...linkForm, notes: event.target.value })} />
              </label>
              <div className="md:col-span-2 flex items-center justify-between gap-3">
                <p className="text-sm text-text-body">{linking ? "Salvando vínculo..." : "Vínculos ajudam a transformar o produto em unidade lógica."}</p>
                <Button disabled={linking} type="submit">
                  Adicionar vínculo
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 xl:grid-cols-[1fr_0.95fr]">
        <Card className="border-border/80 bg-surface shadow-card">
          <CardContent className="space-y-4 p-5">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-muted">Ativos</p>
                <h3 className="mt-2 text-lg font-semibold text-text">Ativos associados</h3>
                <p className="mt-1 text-sm leading-6 text-text-body">
                  Tabelas, views e ativos técnicos que sustentam este produto. Essa conexão permite acompanhar qualidade, incidentes, linhagem, contratos e impacto.
                </p>
              </div>
              <Badge tone="neutral">{assets.length}</Badge>
            </div>
            <div className="space-y-3">
              {assets.length ? (
                assets.map((item) => (
                  <div className="rounded-2xl border border-border/80 bg-bg-subtle/80 p-4" key={item.entity_id}>
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div>
                        <p className="font-medium text-text">{item.label}</p>
                        <p className="mt-1 text-xs text-muted">{item.datasource_name} · {item.database_name} · {item.schema_name}</p>
                        <p className="mt-1 text-xs text-muted">{item.table_fqn}</p>
                        {item.domain_name ? <p className="mt-1 text-xs text-muted">Domínio: {item.domain_name}</p> : null}
                        <div className="mt-2 flex flex-wrap gap-2">
                          <Badge tone={scoreTone(Math.round(item.dq_score ?? 0))}>DQ {item.dq_score ?? "N/D"}</Badge>
                          <Badge tone="neutral">Owner {item.owner_name || "não definido"}</Badge>
                          <Badge tone={item.open_incidents ? "warning" : "success"}>{item.open_incidents} incidente(s)</Badge>
                        </div>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        {assetButtons(item)}
                        <Button size="sm" variant="outline" onClick={() => void handleRemoveAsset(item.entity_id)}>
                          Remover vínculo
                        </Button>
                      </div>
                    </div>
                  </div>
                ))
              ) : (
                <EmptyState title="Nenhum ativo associado" description="Este produto ainda não possui tabelas ou views vinculadas. Associe ativos técnicos para consolidar qualidade, incidentes, linhagem e impacto." />
              )}
            </div>
            <Button className="w-full" onClick={() => setAssetPickerOpen(true)}>
              <Plus className="mr-2 h-4 w-4" />
              Adicionar ativos
            </Button>
          </CardContent>
        </Card>

        <Card className="border-border/80 bg-surface shadow-card">
          <CardContent className="space-y-4 p-5">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-muted">Relações</p>
                <h3 className="mt-2 text-lg font-semibold text-text">Vínculos do produto</h3>
                <p className="mt-1 text-sm leading-6 text-text-body">
                  Relações conectam o produto a dashboards, contratos, pipelines, incidentes, regras DQ e outros recursos operacionais.
                </p>
              </div>
              <Badge tone="accent">{activeLinks.length}</Badge>
            </div>
            <div className="space-y-3">
              {activeLinks.length ? activeLinks.map((link) => <LinkRow key={link.id} link={link} onRemove={(linkId) => void handleRemoveLink(linkId)} />) : (
                <EmptyState title="Sem vínculos" description="Adicione relações para ligar o produto a dashboards, pipelines, incidentes ou consumidores." />
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 xl:grid-cols-2">
        <Card className="border-border/80 bg-surface shadow-card">
          <CardContent className="space-y-4 p-5">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-muted">Contrato</p>
              <h3 className="mt-2 text-lg font-semibold text-text">Contrato do produto</h3>
              <p className="mt-1 text-sm leading-6 text-text-body">
                O contrato define campos, regras, SLA, qualidade mínima e responsabilidades esperadas para uso confiável.
              </p>
            </div>
            {payload.contract_text || contractLinks.length ? (
              <div className="space-y-3">
                {payload.contract_text ? (
                  <div className="rounded-2xl border border-success-200 bg-success-50 p-4">
                    <Badge tone="success">Contrato informado</Badge>
                    <p className="mt-3 text-sm leading-6 text-success-900">{payload.contract_text}</p>
                    <p className="mt-2 text-xs text-success-800">SLA: {payload.sla_text || "não definido"} · Consumers: {payload.consumers.length || 0}</p>
                  </div>
                ) : null}
                {contractLinks.map((link) => <LinkRow key={link.id} link={link} onRemove={(linkId) => void handleRemoveLink(linkId)} />)}
              </div>
            ) : (
              <EmptyState title="Nenhum contrato associado" description="Este produto ainda não possui contrato de dados. Defina um contrato para formalizar campos obrigatórios, regras de qualidade, SLA e expectativas de consumo." />
            )}
          </CardContent>
        </Card>

        <Card className="border-border/80 bg-surface shadow-card">
          <CardContent className="space-y-4 p-5">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-muted">Data Quality</p>
              <h3 className="mt-2 text-lg font-semibold text-text">Qualidade do produto</h3>
              <p className="mt-1 text-sm leading-6 text-text-body">
                A qualidade do produto é consolidada a partir dos ativos vinculados e ajuda a entender se a entrega está confiável para consumo.
              </p>
            </div>
            {assets.length || qualityRulesTotal || qualityRulesActive ? (
              <div className="space-y-3">
                <div className="grid gap-3 sm:grid-cols-3">
                  <div className="rounded-2xl border border-border/80 bg-bg-subtle p-4">
                    <p className="text-xs font-semibold uppercase tracking-[0.14em] text-muted">Score médio</p>
                    <p className="mt-2 text-2xl font-semibold text-text">{averageAssetQuality}</p>
                  </div>
                  <div className="rounded-2xl border border-border/80 bg-bg-subtle p-4">
                    <p className="text-xs font-semibold uppercase tracking-[0.14em] text-muted">Regras ativas</p>
                    <p className="mt-2 text-2xl font-semibold text-text">{qualityRulesActive}</p>
                    <p className="mt-1 text-xs text-muted">{qualityRulesFailed} falha(s) na última leitura</p>
                  </div>
                  <div className="rounded-2xl border border-border/80 bg-bg-subtle p-4">
                    <p className="text-xs font-semibold uppercase tracking-[0.14em] text-muted">Sem regras</p>
                    <p className="mt-2 text-2xl font-semibold text-text">{qualityAssetsWithoutRules}</p>
                  </div>
                </div>
                {assets.length ? (
                  <div className="space-y-2">
                    {assets.slice(0, 5).map((asset) => (
                      <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-border/80 bg-bg-subtle p-3" key={asset.entity_id}>
                        <div>
                          <p className="text-sm font-medium text-text">{asset.label}</p>
                          <p className="text-xs text-muted">DQ {asset.dq_score ?? "N/D"} · {asset.open_incidents} incidente(s)</p>
                        </div>
                        <Button asChild size="sm" variant="outline">
                          <Link href={`/data-quality?tableId=${asset.entity_id}`}>Abrir DQ</Link>
                        </Button>
                      </div>
                    ))}
                  </div>
                ) : null}
              </div>
            ) : (
              <EmptyState title="Qualidade ainda não monitorada" description="Associe ativos ao produto e configure regras de qualidade para acompanhar confiança, freshness, completude e validade." />
            )}
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 xl:grid-cols-2">
        <Card className="border-border/80 bg-surface shadow-card">
          <CardContent className="space-y-4 p-5">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-muted">Incidentes</p>
              <h3 className="mt-2 text-lg font-semibold text-text">Incidentes do produto</h3>
              <p className="mt-1 text-sm leading-6 text-text-body">
                Consolida problemas relacionados ao produto e aos ativos associados para priorizar correções que impactam consumidores e SLA.
              </p>
            </div>
            {openIncidents || criticalIncidents || incidentLinks.length || assets.some((asset) => asset.open_incidents > 0) ? (
              <div className="space-y-3">
                <div className="grid gap-3 sm:grid-cols-3">
                  <div className="rounded-2xl border border-warning-200 bg-warning-50 p-4">
                    <p className="text-xs font-semibold uppercase tracking-[0.14em] text-warning-800">Abertos</p>
                    <p className="mt-2 text-2xl font-semibold text-warning-950">{openIncidents}</p>
                  </div>
                  <div className="rounded-2xl border border-danger-200 bg-danger-50 p-4">
                    <p className="text-xs font-semibold uppercase tracking-[0.14em] text-danger-800">Críticos</p>
                    <p className="mt-2 text-2xl font-semibold text-danger-950">{criticalIncidents}</p>
                  </div>
                  <div className="rounded-2xl border border-border/80 bg-bg-subtle p-4">
                    <p className="text-xs font-semibold uppercase tracking-[0.14em] text-muted">Ativos afetados</p>
                    <p className="mt-2 text-2xl font-semibold text-text">{affectedAssets}</p>
                  </div>
                </div>
                {incidentLinks.map((link) => <LinkRow key={link.id} link={link} onRemove={(linkId) => void handleRemoveLink(linkId)} />)}
              </div>
            ) : (
              <EmptyState title="Nenhum incidente aberto" description="Não há incidentes ativos relacionados a este produto ou aos ativos associados." />
            )}
          </CardContent>
        </Card>

        <Card className="border-border/80 bg-surface shadow-card">
          <CardContent className="space-y-4 p-5">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-muted">Consumo</p>
              <h3 className="mt-2 text-lg font-semibold text-text">Dashboards e consumidores</h3>
              <p className="mt-1 text-sm leading-6 text-text-body">
                Relacione dashboards, relatórios, times e sistemas para medir impacto, priorizar incidentes e justificar certificação.
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              {payload.consumers.length ? payload.consumers.map((consumer) => <Badge key={consumer} tone="accent">{consumer}</Badge>) : <Badge tone="warning">Sem consumidores</Badge>}
            </div>
            {dashboardTotal ? (
              <div className="space-y-3">
                {dashboardLinks.map((link) => <LinkRow key={link.id} link={link} onRemove={(linkId) => void handleRemoveLink(linkId)} />)}
              </div>
            ) : (
              <EmptyState title="Nenhum dashboard associado" description="Associe dashboards ou consumidores para medir impacto e priorizar incidentes que afetem este produto." />
            )}
          </CardContent>
        </Card>
      </div>

      <Card className="border-border/80 bg-surface shadow-card">
        <CardContent className="space-y-4 p-5">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-muted">Linhagem</p>
            <h3 className="mt-2 text-lg font-semibold text-text">Linhagem do produto</h3>
            <p className="mt-1 max-w-4xl text-sm leading-6 text-text-body">
              A linhagem mostra de onde vêm os dados, quais ativos sustentam o produto e quais consumidores podem ser impactados por mudanças.
            </p>
          </div>
          {assets.length || hasLineageSummary || pipelineLinks.length || dashboardLinks.length ? (
            <div className="grid gap-3 md:grid-cols-3">
              <div className="rounded-2xl border border-border/80 bg-bg-subtle p-4">
                <Network className="h-5 w-5 text-brand-700" />
                <p className="mt-3 text-sm font-semibold text-text">Ativos upstream</p>
                <p className="mt-1 text-2xl font-semibold text-text">{lineageUpstreamTotal || assets.length}</p>
                <p className="mt-1 text-xs leading-5 text-text-body">Tabelas e fontes vinculadas ao produto.</p>
              </div>
              <div className="rounded-2xl border border-border/80 bg-bg-subtle p-4">
                <Activity className="h-5 w-5 text-brand-700" />
                <p className="mt-3 text-sm font-semibold text-text">Pipelines</p>
                <p className="mt-1 text-2xl font-semibold text-text">{lineagePipelineTotal}</p>
                <p className="mt-1 text-xs leading-5 text-text-body">Transformações ou rotinas associadas.</p>
              </div>
              <div className="rounded-2xl border border-border/80 bg-bg-subtle p-4">
                <Users className="h-5 w-5 text-brand-700" />
                <p className="mt-3 text-sm font-semibold text-text">Consumidores downstream</p>
                <p className="mt-1 text-2xl font-semibold text-text">{lineageConsumerTotal + dashboardTotal}</p>
                <p className="mt-1 text-xs leading-5 text-text-body">Times, dashboards e relatórios impactados.</p>
              </div>
            </div>
          ) : (
            <EmptyState title="Linhagem ainda não consolidada para este produto" description="Associe ativos e dashboards ao produto para permitir a construção da linhagem de impacto." />
          )}
        </CardContent>
      </Card>
    </div>
  );
}
