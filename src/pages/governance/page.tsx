import { Link } from "@/lib/next-shims";
import { AlertTriangle, ArrowRight, BookOpen, ChartNoAxesCombined, Clock3, GitBranch, Layers3, ShieldAlert, ShieldCheck, Tags, Users, Workflow } from "lucide-react";

import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

const responsibilityAreas = [
  {
    title: "Domínios de dados",
    description: "Estruture a organização semântica da plataforma em torno de domínios, owners, steward e maturidade.",
    href: "/governance/domains",
    icon: Layers3,
  },
  {
    title: "Produtos de dados",
    description: "Modele as entregas lógicas por domínio com consumidores, contratos, SLAs e ativos associados.",
    href: "/governance/data-products",
    icon: Layers3,
  },
  {
    title: "Responsáveis",
    description: "Veja owners definidos, lacunas de accountability e pendências de revisão formal.",
    href: "/data-owners",
    icon: Users,
  },
  {
    title: "Fluxo de stewardship e aprovações",
    description: "Organize solicitações de descrição, owner e termos com histórico, aprovação e trilha de decisão.",
    href: "/governance/stewardship",
    icon: Workflow,
  },
  {
    title: "Glossário",
    description: "Gerencie termos, definições e associações semânticas que dão contexto de negócio ao catálogo.",
    href: "/glossary",
    icon: BookOpen,
  },
  {
    title: "Dicionário de dados",
    description: "Administre a planilha oficial do dicionário com resumo executivo, curadoria de colunas e round-trip em Excel.",
    href: "/governance/dictionary",
    icon: BookOpen,
  },
  {
    title: "Tags e classificações",
    description: "Padronize classificação operacional, taxonomias estratégicas e cobertura semântica dos ativos.",
    href: "/tags",
    icon: Tags,
  },
];

const operationAreas = [
  {
    title: "Pendências de governança",
    description: "Priorize o que falta por ativo, owner, fonte e origem da lacuna com fila de risco e recomendações automáticas.",
    href: "/governance/pending-center",
    icon: AlertTriangle,
  },
  {
    title: "Colaboração distribuída",
    description: "Distribua tarefas, comentários e decisões entre áreas com timeline e notificações internas.",
    href: "/governance/collaboration",
    icon: Workflow,
  },
  {
    title: "Mudanças e SLA",
    description: "Acompanhe solicitações de mudança, SLAs por ativo e a fila formal de revisão/aprovação.",
    href: "/governance/change-management",
    icon: Workflow,
  },
  {
    title: "Timeline de ativo e governança",
    description: "Veja a história curada dos ativos com eventos de governança, qualidade e operação em uma única linha do tempo.",
    href: "/governance/timeline",
    icon: Clock3,
  },
];

const complianceAreas = [
  {
    title: "Certificação",
    description: "Acompanhe elegibilidade, revisão, SLA e revalidação dos ativos certificados.",
    href: "/certification",
    icon: ShieldAlert,
  },
  {
    title: "Privacidade e acesso",
    description: "Revise sensibilidade, base legal, masking e políticas de acesso com contexto regulatório.",
    href: "/privacy-access",
    icon: ShieldCheck,
  },
  {
    title: "Revisão de classificação",
    description: "Consolida sinais, sugestões automáticas, lacunas e conflitos para revisar classificação com menos troca de tela.",
    href: "/governance/classification-review",
    icon: ShieldCheck,
  },
  {
    title: "Auditoria e histórico",
    description: "Consulte mudanças críticas com autoria, before/after e contexto do ativo impactado.",
    href: "/audit",
    icon: ShieldCheck,
  },
];

const explorationAreas = [
  {
    title: "Inteligência e control plane",
    description: "Reúne sinais, pendências, jobs, mudanças e assistente em uma superfície única de decisão.",
    href: "/governance/intelligence",
    icon: ChartNoAxesCombined,
  },
  {
    title: "Linhagem",
    description: "Entenda dependências e impacto de mudança para apoiar governança e análise operacional.",
    href: "/lineage",
    icon: GitBranch,
  },
];

const sections = [
  { title: "Responsabilidade & contexto", areas: responsibilityAreas },
  { title: "Operação contínua", areas: operationAreas },
  { title: "Conformidade & risco", areas: complianceAreas },
  { title: "Visão & exploração", areas: explorationAreas },
];

export default function GovernanceHubPage() {
  return (
    <div className="space-y-6 pb-6">
      <Card className="border-border bg-[linear-gradient(135deg,#ffffff_0%,#f8fafc_55%,#eef6ff_100%)] shadow-[0_18px_48px_rgba(15,23,42,0.06)]">
        <CardContent className="space-y-3 p-6">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-brand-600">Governança funcional</p>
          <h2 className="text-3xl font-semibold tracking-tight text-text">Central de governança</h2>
          <p className="max-w-4xl text-sm leading-7 text-text-body">
            Reunimos aqui as frentes que sustentam responsabilidade, classificação, contexto de negócio e rastreabilidade.
            Use esta área como ponto de entrada para revisão contínua e saneamento de metadados governados.
          </p>
        </CardContent>
      </Card>

      {sections.map((section) => (
        <section className="space-y-4" key={section.title}>
          <h2 className="text-sm font-semibold uppercase tracking-[0.16em] text-muted">{section.title}</h2>
          <div className="grid gap-4 lg:grid-cols-2 xl:grid-cols-3">
            {section.areas.map((area) => {
              const Icon = area.icon;
              return (
                <Card className="border-border bg-surface shadow-[0_12px_36px_rgba(15,23,42,0.05)]" key={area.href}>
                  <CardContent className="space-y-4 p-5">
                    <div className="flex items-center gap-3">
                      <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-bg-subtle text-text-body">
                        <Icon className="h-5 w-5" />
                      </div>
                      <div>
                        <p className="text-lg font-semibold text-text">{area.title}</p>
                      </div>
                    </div>
                    <p className="text-sm leading-6 text-text-body">{area.description}</p>
                    <Button asChild size="sm" variant="outline">
                      <Link href={area.href}>
                        Abrir área
                        <ArrowRight className="ml-2 h-4 w-4" />
                      </Link>
                    </Button>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </section>
      ))}
    </div>
  );
}
