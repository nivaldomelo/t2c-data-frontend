import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/cn";

type Props = {
  label: string;
  value: string;
  hint?: string;
  className?: string;
};

export function IntegrationMetricCard({ label, value, hint, className }: Props) {
  return (
    <Card className={cn("border-border/80 bg-surface shadow-card", className)}>
      <CardContent className="space-y-2 p-5">
        <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-brand-600">{label}</p>
        <p className="text-3xl font-semibold tracking-tight text-text">{value}</p>
        {hint ? <p className="text-sm leading-6 text-text-body">{hint}</p> : null}
      </CardContent>
    </Card>
  );
}

