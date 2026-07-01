import { Link } from "@/lib/next-shims";

import { ArrowRight } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/cn";

export type ContextualJourneyLink = {
  label: string;
  href: string;
  description: string;
  tone?: "neutral" | "accent" | "success" | "warning";
};

type Props = {
  eyebrow?: string;
  title: string;
  description: string;
  links: ContextualJourneyLink[];
  className?: string;
};

function toneClassName(tone: ContextualJourneyLink["tone"]) {
  if (tone === "success") return "border-success-200 bg-success-50 text-success-700";
  if (tone === "warning") return "border-warning-200 bg-warning-50 text-warning-700";
  if (tone === "accent") return "border-info-200 bg-info-50 text-info-700";
  return "border-border bg-bg-subtle text-text-body";
}

export function ContextualJourneyCard({ eyebrow = "Jornadas principais", title, description, links, className }: Props) {
  if (!links.length) return null;

  return (
    <Card className={cn("border-border/80 bg-surface shadow-card", className)}>
      <CardContent className="space-y-4 p-5">
        <div className="space-y-2">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-brand-600">{eyebrow}</p>
          <h3 className="text-lg font-semibold text-text">{title}</h3>
          <p className="max-w-4xl text-sm leading-7 text-text-body">{description}</p>
        </div>
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {links.map((item) => (
            <div className="rounded-2xl border border-border/80 bg-bg-subtle/80 p-4 transition hover:border-border-strong hover:bg-surface" key={`${item.label}-${item.href}`}>
              <div className="flex items-start justify-between gap-3">
                <div className="space-y-1">
                  <p className="font-semibold text-text">{item.label}</p>
                  <p className="text-sm leading-6 text-text-body">{item.description}</p>
                </div>
                <Badge tone={item.tone || "neutral"} className={cn("shrink-0", toneClassName(item.tone))}>
                  Atalho
                </Badge>
              </div>
              <Button asChild className="mt-4 w-full justify-between" size="sm" variant="outline">
                <Link href={item.href}>
                  Abrir
                  <ArrowRight className="h-4 w-4" />
                </Link>
              </Button>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
