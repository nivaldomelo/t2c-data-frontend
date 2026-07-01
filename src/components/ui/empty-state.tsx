import type { ReactNode } from "react";
import { Inbox } from "lucide-react";

import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/cn";

export function EmptyState({
  title,
  description,
  icon,
  action,
  className,
}: {
  title: string;
  description: string;
  icon?: ReactNode;
  action?: ReactNode;
  className?: string;
}) {
  return (
    <Card className={cn("border-border/80 bg-surface/90 shadow-card", className)}>
      <CardContent className="py-12 text-center">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl border border-border/80 bg-gradient-to-br from-brand-50 via-white to-accent-50 text-brand-600 shadow-sm">
          {icon ?? <Inbox className="h-5 w-5" />}
        </div>
        <h3 className="mt-4 text-base font-semibold text-text">{title}</h3>
        <p className="mx-auto mt-2 max-w-xl text-sm leading-6 text-text-body">{description}</p>
        {action ? <div className="mt-4 flex justify-center">{action}</div> : null}
      </CardContent>
    </Card>
  );
}
