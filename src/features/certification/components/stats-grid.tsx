import { AlertTriangle, ClipboardCheck, Crown, Layers3, ShieldAlert, Sparkles } from "lucide-react";

import { Card, CardContent } from "@/components/ui/card";

type CertificationStatsGridProps = {
  counters: {
    displayed: number;
    total: number;
    eligible: number;
    certified: number;
    revalidationPending: number;
    notEligible: number;
  };
};

export function CertificationStatsGrid({ counters }: CertificationStatsGridProps) {
  const cards = [
    {
      label: "Ativos exibidos",
      value: counters.displayed,
      description: "Quantidade carregada nesta página da fila. A paginação mantém leitura e performance.",
      icon: Sparkles,
      frame: "border-border bg-gradient-to-br from-white via-slate-50 to-slate-100",
      iconClassName: "bg-bg-subtle text-text-body",
    },
    {
      label: "Total em certificação",
      value: counters.total,
      description: "Universo de ativos avaliados pelo processo de certificação no filtro atual.",
      icon: Layers3,
      frame: "border-border bg-gradient-to-br from-white via-slate-50 to-accent-50",
      iconClassName: "bg-info-100 text-info-700",
    },
    {
      label: "Elegíveis",
      value: counters.eligible,
      description: "Ativos com prontidão suficiente para revisão de certificação.",
      icon: ClipboardCheck,
      frame: "border-info-200/80 bg-gradient-to-br from-accent-50 via-white to-white",
      iconClassName: "bg-info-100 text-info-700",
    },
    {
      label: "Certificadas",
      value: counters.certified,
      description: "Ativos aprovados para consumo confiável após atender critérios mínimos.",
      icon: Crown,
      frame: "border-warning-200/80 bg-gradient-to-br from-amber-50 via-white to-white",
      iconClassName: "bg-warning-100 text-warning-700",
    },
    {
      label: "Pendente de revalidação",
      value: counters.revalidationPending,
      description: "Ativos que precisam nova revisão por prazo, mudança, incidente ou queda de qualidade.",
      icon: ShieldAlert,
      frame: "border-blue-200/80 bg-gradient-to-br from-blue-50 via-white to-white",
      iconClassName: "bg-blue-100 text-blue-700",
    },
    {
      label: "Não elegíveis",
      value: counters.notEligible,
      description: "Ativos com bloqueios de governança, documentação, qualidade ou revisão.",
      icon: AlertTriangle,
      frame: "border-danger-200/80 bg-gradient-to-br from-rose-50 via-white to-white",
      iconClassName: "bg-danger-100 text-danger-700",
    },
  ];

  return (
    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-6">
      {cards.map((card) => {
        const Icon = card.icon;
        return (
          <Card className={card.frame} key={card.label}>
            <CardContent className="flex h-full flex-col gap-4 py-5">
              <div className="flex items-center gap-4">
                <div className={`rounded-2xl p-3 ${card.iconClassName}`}>
                  <Icon className="h-5 w-5" />
                </div>
                <div>
                  <p className="text-sm text-muted">{card.label}</p>
                  <p className="text-2xl font-semibold text-text">{card.value}</p>
                </div>
              </div>
              <p className="text-xs leading-5 text-text-body">{card.description}</p>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
