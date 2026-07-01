import { Link } from "@/lib/next-shims";
import { useEffect, useMemo, useState } from "react";
import { ArrowRight, BookOpen, Boxes, FileCheck2, Network, Plus, RefreshCw, Sparkles, Users } from "lucide-react";

import { ContextualJourneyCard } from "@/components/navigation/contextual-journey-card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { slugifyText } from "@/lib/slugify";

import { createSemanticProduct, listSemanticDomains, listSemanticProducts } from "../sdk";
import type { SemanticDomain, SemanticProduct } from "../types";

const PAGE_SIZE = 25;

const FIELD_HELP = {
  domain: "Selecione o domínio de negócio que sustenta este produto. Todo produto deve estar conectado a um domínio para manter contexto, ownership e governança.",
  name: "Nome claro da entrega de dados. Ex.: Receita recorrente, Clientes ativos ou Funil de vendas.",
  slug: "Identificador técnico usado em URLs e integrações. Use letras minúsculas, sem espaços.",
  description: "Explique qual problema o produto resolve, quais dados entrega e para quem ele é útil.",
  owner: "Pessoa ou time responsável pela entrega, prioridade e evolução do produto.",
  steward: "Responsável pela documentação, qualidade, contrato e governança do produto.",
  consumers: "Times, áreas ou sistemas que consomem este produto. Separe por vírgula. Ex.: BI, Vendas, Produto.",
  sla: "Expectativa de atualização ou disponibilidade. Ex.: atualização diária até 8h.",
  contract: "Versão ou referência do contrato que define campos, regras, qualidade e expectativas.",
  maturity: "Estágio atual do produto, como inicial, em evolução, governado ou certificado.",
  quality: "Opcional. Deixe em branco para usar o score derivado automaticamente da qualidade dos ativos. Preencha apenas para sobrescrever manualmente.",
  governance: "Opcional. Deixe em branco para usar o score derivado (cobertura de owner, descrição, contrato, documentação, regras e certificação). Preencha apenas para sobrescrever.",
  notes: "Observações sobre uso, limitações, dependências ou próximos passos.",
};

const PRODUCT_EXAMPLES_BY_DOMAIN = [
  { match: ["cliente", "clientes", "customer"], names: ["Cadastro de clientes", "Clientes ativos", "Jornada do cliente", "Base de clientes para BI"] },
  { match: ["venda", "vendas", "sales"], names: ["Receita recorrente", "Funil de vendas", "Propostas comerciais", "Conversão de vendas"] },
  { match: ["financeiro", "finance", "financas"], names: ["Faturamento", "Inadimplência", "Receita mensal", "Fluxo de caixa"] },
  { match: ["operacao", "operacoes", "operações", "operations"], names: ["Monitoramento operacional", "Produtividade operacional", "SLA operacional"] },
  { match: ["dados", "data"], names: ["Catálogo confiável", "Qualidade de dados", "Operação da plataforma de dados"] },
];

function FieldHelp({ children }: { children: React.ReactNode }) {
  return <p className="text-xs leading-5 text-muted">{children}</p>;
}

function scoreTone(score: number) {
  if (score >= 85) return "success";
  if (score >= 70) return "accent";
  if (score >= 50) return "warning";
  return "danger";
}

function ProductCard({ item }: { item: SemanticProduct }) {
  return (
    <Card className="border-border/80 bg-surface shadow-card transition-colors hover:border-border-strong">
      <CardContent className="space-y-4 p-5">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-muted">Produto de dados</p>
            <h3 className="mt-2 text-lg font-semibold text-text">{item.name}</h3>
            <p className="mt-1 text-sm leading-6 text-text-body">
              {item.description || "Sem descrição cadastrada. Adicione contexto para explicar consumidores, ativos, SLA e uso esperado."}
            </p>
          </div>
          <Badge tone={scoreTone(item.maturity_score)}>{item.maturity_label}</Badge>
        </div>
        <div className="rounded-2xl border border-brand-100 bg-brand-50/50 p-3 text-xs leading-5 text-brand-800">
          Este produto conecta consumidores, contratos, ativos e regras de qualidade em uma entrega governada.
        </div>
        <div className="grid gap-2 text-sm text-text-body sm:grid-cols-2">
          <p><span className="font-medium text-text-body">Domínio:</span> {item.domain_name || "Não definido"}</p>
          <p><span className="font-medium text-text-body">Owner:</span> {item.owner || "Não definido"}</p>
          <p><span className="font-medium text-text-body">Steward:</span> {item.steward || "Não definido"}</p>
          <p><span className="font-medium text-text-body">Consumers:</span> {item.consumers.length ? item.consumers.join(", ") : "Não definido"}</p>
          <p><span className="font-medium text-text-body">SLA:</span> {item.sla_text || "Não definido"}</p>
          <p><span className="font-medium text-text-body">Contrato:</span> {item.contract_text || "Não definido"}</p>
          <p><span className="font-medium text-text-body">Ativos:</span> {item.assets_count}</p>
          <p><span className="font-medium text-text-body">Dashboards:</span> {item.dashboards_count}</p>
          <p><span className="font-medium text-text-body">Regras DQ:</span> {item.rules_count}</p>
          <p><span className="font-medium text-text-body">Incidentes:</span> {item.incidents_count}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Badge tone="neutral">Score {item.maturity_score}</Badge>
          <Badge tone="neutral">DQ {item.quality_score ?? "N/D"}</Badge>
          <Badge tone="neutral">Governança {item.governance_score ?? "N/D"}</Badge>
          <Badge tone="neutral">{item.pipelines_count} pipeline(s)</Badge>
          <Badge tone="neutral">{item.contracts_count} contrato(s)</Badge>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button asChild size="sm">
            <Link href={`/governance/data-products/${item.slug}`}>
              Abrir produto
              <ArrowRight className="ml-2 h-4 w-4" />
            </Link>
          </Button>
          {item.domain_slug ? (
            <Button asChild size="sm" variant="outline">
              <Link href={`/governance/domains/${item.domain_slug}`}>Ir ao domínio</Link>
            </Button>
          ) : null}
          <Button asChild size="sm" variant="outline">
            <Link href={`/search?product=${encodeURIComponent(item.name)}`}>Ver ativos</Link>
          </Button>
          <Button asChild size="sm" variant="outline">
            <Link href={`/data-quality?product=${encodeURIComponent(item.slug)}`}>Ver qualidade</Link>
          </Button>
          <Button asChild size="sm" variant="outline">
            <Link href={`/incidents/tickets?product=${encodeURIComponent(item.slug)}`}>Ver incidentes</Link>
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

function domainSuggestionStatus(domain: SemanticDomain, productsCount: number) {
  if (productsCount === 0) return { label: "Sem produto", tone: "warning" as const };
  if (domain.maturity_score >= 85 && productsCount > 0) return { label: "Produto governado", tone: "success" as const };
  return { label: "Produto em evolução", tone: "accent" as const };
}

function domainSuggestionConfidence(domain: SemanticDomain, productsCount: number) {
  const hasOwner = Boolean(domain.owner || domain.steward);
  const hasAssets = domain.assets_count > 0;
  const quality = domain.quality_score ?? 0;
  if (productsCount === 0 && hasOwner && hasAssets && quality >= 85) return { label: "Alta", tone: "success" as const };
  if (hasAssets || hasOwner) return { label: "Média", tone: "accent" as const };
  return { label: "Baixa", tone: "warning" as const };
}

function domainSuggestionReason(domain: SemanticDomain, productsCount: number) {
  if (productsCount === 0 && domain.assets_count > 0) {
    return "Este domínio já possui ativos relacionados, mas ainda não possui produto de dados associado.";
  }
  if (productsCount === 0) {
    return "Este domínio existe no catálogo sem uma entrega consumível formalizada.";
  }
  if (domain.incidents_count > 0) {
    return "Há incidentes no domínio; um produto pode organizar consumidores, SLA e plano de saneamento.";
  }
  return "O domínio já possui base semântica e pode ser refinado em produtos mais específicos para consumidores.";
}

function domainSuggestionPending(domain: SemanticDomain) {
  const pending = [];
  if (!domain.owner) pending.push("definir owner");
  if (!domain.steward) pending.push("definir steward");
  if (!domain.assets_count) pending.push("vincular ativos");
  if (!domain.governance_score || domain.governance_score < 80) pending.push("reforçar governança");
  if (!domain.quality_score || domain.quality_score < 85) pending.push("validar qualidade");
  return pending.length ? pending.join(", ") : "pronto para formalização inicial";
}

function suggestedProductName(domainName: string) {
  const normalized = domainName.toLowerCase();
  const pattern = PRODUCT_EXAMPLES_BY_DOMAIN.find((item) => item.match.some((term) => normalized.includes(term)));
  return pattern?.names[0] || `${domainName} confiável`;
}

function DomainProductSuggestionCard({
  domain,
  productsCount,
  onUse,
}: {
  domain: SemanticDomain;
  productsCount: number;
  onUse: (domain: SemanticDomain) => void;
}) {
  const status = domainSuggestionStatus(domain, productsCount);
  const productName = suggestedProductName(domain.name);
  const confidence = domainSuggestionConfidence(domain, productsCount);

  return (
    <div className="rounded-3xl border border-brand-200 bg-brand-50/60 p-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-sm font-semibold text-brand-950">{domain.name}</p>
          <p className="mt-1 text-xs leading-5 text-brand-700">
            Produto sugerido: {productName}
          </p>
        </div>
        <div className="flex flex-col items-end gap-2">
          <Badge tone={status.tone}>{status.label}</Badge>
          <Badge tone={confidence.tone}>Confiança {confidence.label}</Badge>
        </div>
      </div>
      <div className="mt-3 grid gap-2 text-xs text-brand-800 sm:grid-cols-2">
        <p>Slug: {domain.slug}</p>
        <p>Owner: {domain.owner || "Não definido"}</p>
        <p>Steward: {domain.steward || "Não definido"}</p>
        <p>Maturidade: {domain.maturity_label}</p>
        <p>Ativos: {domain.assets_count}</p>
        <p>Incidentes: {domain.incidents_count}</p>
        <p>Produtos: {productsCount}</p>
        <p>Governança: {domain.governance_score ?? "N/D"}</p>
      </div>
      <p className="mt-3 text-xs leading-5 text-brand-700">
        {domainSuggestionReason(domain, productsCount)}
      </p>
      <p className="mt-2 text-xs leading-5 text-brand-700">
        Pendências antes de formalizar: {domainSuggestionPending(domain)}.
      </p>
      <div className="mt-3 flex flex-wrap gap-2">
        <Button size="sm" type="button" onClick={() => onUse(domain)}>
          Criar a partir deste domínio
        </Button>
        <Button asChild size="sm" variant="outline">
          <Link href={`/governance/domains/${domain.slug}`}>Ver domínio</Link>
        </Button>
        <Button asChild size="sm" variant="outline">
          <Link href={`/search?domain=${encodeURIComponent(domain.name)}`}>Ver ativos</Link>
        </Button>
      </div>
    </div>
  );
}

export function SemanticProductsPage() {
  const [query, setQuery] = useState("");
  const [domainSlug, setDomainSlug] = useState("");
  const [items, setItems] = useState<SemanticProduct[]>([]);
  const [allProducts, setAllProducts] = useState<SemanticProduct[]>([]);
  const [domains, setDomains] = useState<SemanticDomain[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState("");
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

  async function loadData(nextQuery = query, nextDomainSlug = domainSlug) {
    setLoading(true);
    setError("");
    try {
      const [productPayload, domainPayload] = await Promise.all([
        listSemanticProducts(nextQuery, nextDomainSlug, 1, PAGE_SIZE),
        listSemanticDomains("", 1, 100),
      ]);
      const allProductPayload = nextQuery || nextDomainSlug ? await listSemanticProducts("", "", 1, 100) : productPayload;
      setItems(productPayload.items || []);
      setAllProducts(allProductPayload.items || []);
      setDomains(domainPayload.items || []);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadData();
  }, [query, domainSlug]);

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setCreating(true);
    setCreateError("");
    try {
      const payload = {
        domain_slug: form.domain_slug.trim(),
        slug: form.slug.trim() || slugifyText(form.name),
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
      };
      const created = await createSemanticProduct(payload);
      window.location.assign(`/governance/data-products/${created.slug}`);
    } catch (err) {
      setCreateError((err as Error).message);
    } finally {
      setCreating(false);
    }
  }

  const hasItems = items.length > 0;
  const productsByDomain = useMemo(() => {
    return allProducts.reduce<Record<string, number>>((acc, product) => {
      if (!product.domain_slug) return acc;
      acc[product.domain_slug] = (acc[product.domain_slug] || 0) + 1;
      return acc;
    }, {});
  }, [allProducts]);

  const domainSuggestions = useMemo(() => domains.slice(0, 6), [domains]);

  const nextSteps = useMemo(() => {
    const domainsWithoutProducts = domains.filter((domain) => !productsByDomain[domain.slug]).length;
    const productsWithoutAssets = allProducts.filter((product) => product.assets_count === 0).length;
    const productsWithoutSla = allProducts.filter((product) => !product.sla_text).length;
    const productsWithoutContract = allProducts.filter((product) => !product.contract_text).length;
    return [
      domainsWithoutProducts ? `Criar produto para ${domainsWithoutProducts} domínio(s) sem entrega associada.` : "Revisar se os produtos existentes cobrem os domínios mais críticos.",
      productsWithoutAssets ? `Vincular ativos técnicos a ${productsWithoutAssets} produto(s) sem ativos.` : "Manter os vínculos de ativos atualizados com Explorer e Linhagem.",
      productsWithoutSla ? `Definir SLA para ${productsWithoutSla} produto(s).` : "Acompanhar se os SLAs definidos continuam aderentes ao consumo real.",
      productsWithoutContract ? `Associar contrato de dados a ${productsWithoutContract} produto(s).` : "Usar contratos para validar campos, regras e expectativas dos consumidores.",
    ];
  }, [allProducts, domains, productsByDomain]);

  function useDomainSuggestion(domain: SemanticDomain) {
    const productName = suggestedProductName(domain.name);
    setForm((current) => ({
      ...current,
      domain_slug: domain.slug,
      name: productName,
      slug: slugifyText(productName),
      description: `Entrega organizada de dados do domínio ${domain.name} para consumo analítico, governança e operação, conectando ativos, responsáveis, SLA, qualidade e contratos.`,
      owner: domain.owner || current.owner,
      steward: domain.steward || current.steward,
      consumers: current.consumers || "BI, Analytics, Engenharia de Dados, Governança",
      sla_text: current.sla_text || "A definir",
      contract_text: current.contract_text || "Contrato inicial do produto",
      maturity_status: domain.maturity_status || "emerging",
      quality_score: domain.quality_score !== undefined && domain.quality_score !== null ? String(domain.quality_score) : current.quality_score,
      governance_score: domain.governance_score !== undefined && domain.governance_score !== null ? String(domain.governance_score) : current.governance_score,
    }));
  }

  if (loading && !hasItems) {
    return <div className="rounded-3xl border border-border/80 bg-surface p-6 shadow-card"><div className="h-64 animate-pulse rounded-3xl bg-bg-subtle" /></div>;
  }

  if (error && !hasItems) {
    return <EmptyState title="Produtos indisponíveis" description={error} />;
  }

  return (
    <div className="space-y-6 pb-6">
      <Card className="border-border bg-[linear-gradient(135deg,#ffffff_0%,#f8fafc_55%,#eef6ff_100%)] shadow-[0_18px_48px_rgba(15,23,42,0.06)]">
        <CardContent className="space-y-4 p-6">
          <div className="inline-flex items-center gap-2 rounded-full border border-brand-200 bg-surface px-3 py-1 text-xs font-medium text-brand-700">
            <Sparkles className="h-3.5 w-3.5" />
            Camada semântica
          </div>
          <h2 className="text-3xl font-semibold tracking-tight text-text">Produtos de dados</h2>
          <p className="max-w-4xl text-sm leading-7 text-text-body">
            Modele entregas lógicas para consumidores e conecte produto, domínio, contratos, dashboards, pipelines, qualidade,
            incidentes e ativos técnicos em uma visão governada de consumo.
          </p>
        </CardContent>
      </Card>

      <Card className="border-brand-200 bg-brand-50/70 shadow-sm">
        <CardContent className="grid gap-5 p-5 lg:grid-cols-[1.1fr_0.9fr]">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 rounded-full border border-brand-200 bg-surface px-3 py-1 text-xs font-semibold text-brand-700">
              <BookOpen className="h-3.5 w-3.5" />
              Entrega para consumo
            </div>
            <h3 className="text-xl font-semibold text-brand-950">O que é um produto de dados?</h3>
            <p className="text-sm leading-7 text-brand-900">
              Um produto de dados é uma entrega organizada para consumidores específicos, como BI, Vendas, Financeiro, Operações ou Produto.
              Ele agrupa ativos, domínio, responsáveis, SLA, contrato, qualidade e uso esperado em uma visão única de consumo confiável.
            </p>
          </div>
          <div className="rounded-3xl border border-brand-200 bg-surface p-4 text-sm leading-6 text-text-body">
            <p className="font-semibold text-text">Domínio x Produto de dados</p>
            <p className="mt-2">
              Enquanto o domínio organiza dados por contexto de negócio, o produto organiza uma entrega consumível para quem usa esses dados.
              Um domínio pode ter vários produtos, e cada produto deve estar ligado a um domínio.
            </p>
            <p className="mt-2 text-xs text-muted">
              Ex.: domínio Clientes · produto Base confiável de clientes ativos para BI.
            </p>
          </div>
        </CardContent>
      </Card>

      <ContextualJourneyCard
        title="Jornadas principais do produto"
        description="Use os atalhos para navegar do produto de dados para seu domínio, ativos técnicos, qualidade, incidentes, linhagem e indicadores executivos. O produto funciona como a visão de entrega para consumidores de dados."
        links={[
          { description: "Entenda o contexto de negócio que sustenta este produto.", href: "/governance/domains", label: "Domínios", tone: "accent" },
          { description: "Veja tabelas, colunas e ativos técnicos que fazem parte da entrega.", href: "/explorer", label: "Explorer", tone: "neutral" },
          { description: "Acompanhe regras, score, contratos e falhas que afetam a confiança.", href: "/data-quality", label: "Data Quality", tone: "success" },
          { description: "Monitore problemas que impactam consumidores, SLA ou uso do produto.", href: "/incidents/tickets", label: "Incidentes", tone: "warning" },
          { description: "Veja dependências, fontes, transformações e consumidores impactados.", href: "/lineage", label: "Linhagem", tone: "accent" },
          { description: "Acompanhe maturidade, certificação e evolução dos produtos por domínio.", href: "/dashboard", label: "Dashboard executivo", tone: "neutral" },
        ]}
      />

      <Card className="border-border/80 bg-surface shadow-card">
        <CardContent className="space-y-4 p-5">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-muted">Sugestões</p>
            <h3 className="mt-2 text-lg font-semibold text-text">Sugestões inteligentes de produtos</h3>
            <p className="mt-1 max-w-4xl text-sm leading-6 text-text-body">
              Produtos candidatos gerados a partir dos domínios, ativos, scores, incidentes e maturidade disponíveis no catálogo. Use uma sugestão para preencher
              o formulário com domínio, responsáveis, consumidores, SLA e contrato inicial. Nada é criado automaticamente.
            </p>
          </div>
          {domainSuggestions.length ? (
            <div className="grid gap-3 lg:grid-cols-2 xl:grid-cols-3">
              {domainSuggestions.map((domain) => (
                <DomainProductSuggestionCard
                  domain={domain}
                  key={domain.id}
                  onUse={useDomainSuggestion}
                  productsCount={productsByDomain[domain.slug] || 0}
                />
              ))}
            </div>
          ) : (
            <EmptyState
              title="Nenhum domínio disponível para sugerir produtos"
              description="Antes de criar produtos de dados, cadastre pelo menos um domínio de negócio. O domínio será usado para organizar produtos por contexto e responsabilidade."
            />
          )}
        </CardContent>
      </Card>

      <div className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
        <Card className="border-border/80 bg-surface shadow-card">
          <CardContent className="space-y-4 p-5">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-muted">Cadastro</p>
                <h3 className="mt-2 text-lg font-semibold text-text">Novo produto de dados</h3>
                <p className="mt-1 max-w-2xl text-sm leading-6 text-text-body">
                  Crie uma entrega consumível conectando domínio, consumidores, SLA, contrato, qualidade e ativos relacionados.
                </p>
              </div>
              <Button size="sm" variant="outline" onClick={() => void loadData()}>
                <RefreshCw className="mr-2 h-4 w-4" />
                Recarregar
              </Button>
            </div>
            <form className="grid gap-3 md:grid-cols-2" onSubmit={(event) => void handleSubmit(event)}>
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
                <FieldHelp>{FIELD_HELP.domain}</FieldHelp>
              </label>
              <label className="space-y-1 text-sm text-text-body">
                <span className="text-xs font-semibold uppercase tracking-[0.16em] text-muted">Nome</span>
                <Input value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} placeholder="Ex.: Receita recorrente" />
                <FieldHelp>{FIELD_HELP.name}</FieldHelp>
              </label>
              <label className="space-y-1 text-sm text-text-body">
                <span className="text-xs font-semibold uppercase tracking-[0.16em] text-muted">Slug</span>
                <Input value={form.slug} onChange={(event) => setForm({ ...form, slug: event.target.value })} placeholder="receita-recorrente" />
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
                <Input value={form.steward} onChange={(event) => setForm({ ...form, steward: event.target.value })} />
                <FieldHelp>{FIELD_HELP.steward}</FieldHelp>
              </label>
              <label className="space-y-1 text-sm text-text-body md:col-span-2">
                <span className="text-xs font-semibold uppercase tracking-[0.16em] text-muted">Consumers</span>
                <Input value={form.consumers} onChange={(event) => setForm({ ...form, consumers: event.target.value })} placeholder="Vendas, BI, Produto" />
                <FieldHelp>{FIELD_HELP.consumers}</FieldHelp>
              </label>
              <label className="space-y-1 text-sm text-text-body">
                <span className="text-xs font-semibold uppercase tracking-[0.16em] text-muted">SLA</span>
                <Input value={form.sla_text} onChange={(event) => setForm({ ...form, sla_text: event.target.value })} placeholder="Atualização diária até 8h" />
                <FieldHelp>{FIELD_HELP.sla}</FieldHelp>
              </label>
              <label className="space-y-1 text-sm text-text-body">
                <span className="text-xs font-semibold uppercase tracking-[0.16em] text-muted">Contrato</span>
                <Input value={form.contract_text} onChange={(event) => setForm({ ...form, contract_text: event.target.value })} placeholder="Contrato v1" />
                <FieldHelp>{FIELD_HELP.contract}</FieldHelp>
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
                <p className="text-sm text-text-body">{createError ? <span className="text-danger-700">{createError}</span> : "O produto pode ser detalhado com links depois."}</p>
                <Button disabled={creating} type="submit">
                  <Plus className="mr-2 h-4 w-4" />
                  {creating ? "Criando..." : "Criar produto"}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>

        <Card className="border-border/80 bg-surface shadow-card">
          <CardContent className="space-y-4 p-5">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-muted">Filtro</p>
              <h3 className="mt-2 text-lg font-semibold text-text">Recortar por domínio</h3>
              <p className="mt-1 text-sm leading-6 text-text-body">
                Encontre produtos por nome ou domínio para revisar entregas, consumidores, contratos e pendências de governança.
              </p>
            </div>
            <div className="space-y-3">
              <label className="space-y-1 text-sm text-text-body">
                <span className="text-xs font-semibold uppercase tracking-[0.16em] text-muted">Busca</span>
                <Input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Pesquisar produto..." />
              </label>
              <label className="space-y-1 text-sm text-text-body">
                <span className="text-xs font-semibold uppercase tracking-[0.16em] text-muted">Domínio</span>
                <Select value={domainSlug} onChange={(event) => setDomainSlug(event.target.value)}>
                  <option value="">Todos</option>
                  {domains.map((domain) => (
                    <option key={domain.id} value={domain.slug}>
                      {domain.name}
                    </option>
                  ))}
                </Select>
              </label>
              <Button className="w-full" variant="outline" onClick={() => void loadData()}>
                Atualizar lista
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-muted">Produtos</p>
          <h3 className="text-xl font-semibold text-text">Produtos cadastrados</h3>
          <p className="mt-1 max-w-3xl text-sm leading-6 text-text-body">
            Acompanhe domínio, owner, consumidores, SLA, contrato, ativos, qualidade, governança e incidentes de cada entrega.
          </p>
        </div>
        <Badge tone="neutral">{items.length} registrado(s)</Badge>
      </div>

      {hasItems ? (
        <div className="grid gap-4 lg:grid-cols-2 xl:grid-cols-3">
          {items.map((item) => <ProductCard item={item} key={item.id} />)}
        </div>
      ) : (
        <Card className="border-border/80 bg-surface shadow-card">
          <CardContent className="space-y-4 p-6">
            <EmptyState
              title="Nenhum produto de dados cadastrado"
              description={
                domains.length
                  ? "Você já possui domínios cadastrados. Comece criando um produto a partir de um desses domínios para conectar consumidores, SLA, contrato e ativos relacionados."
                  : "Antes de criar produtos de dados, cadastre pelo menos um domínio de negócio. O domínio será usado para organizar produtos por contexto e responsabilidade."
              }
            />
            <div className="flex flex-wrap justify-center gap-2">
              {domains.length ? (
                <>
                  <Button type="button" onClick={() => domains[0] ? useDomainSuggestion(domains[0]) : undefined}>
                    Criar produto a partir de domínio
                  </Button>
                  <Button asChild variant="outline">
                    <Link href="/governance/domains">Abrir domínios</Link>
                  </Button>
                  <Button asChild variant="outline">
                    <Link href="/explorer">Ver ativos no Explorer</Link>
                  </Button>
                </>
              ) : (
                <Button asChild>
                  <Link href="/governance/domains">Criar domínio</Link>
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      <Card className="border-border/80 bg-surface shadow-card">
        <CardContent className="space-y-4 p-5">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-muted">Ação</p>
            <h3 className="mt-2 text-lg font-semibold text-text">Próximos passos recomendados</h3>
            <p className="mt-1 max-w-3xl text-sm leading-6 text-text-body">
              Use estas recomendações para transformar domínios e ativos técnicos em produtos de dados consumíveis.
            </p>
          </div>
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
            {nextSteps.map((step, index) => {
              const icons = [Boxes, Network, Users, FileCheck2];
              const Icon = icons[index] || Boxes;
              return (
                <div className="rounded-2xl border border-border/80 bg-bg-subtle p-4" key={step}>
                  <Icon className="h-5 w-5 text-brand-700" />
                  <p className="mt-3 text-sm leading-6 text-text-body">{step}</p>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
