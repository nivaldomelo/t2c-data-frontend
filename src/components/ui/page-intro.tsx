import { Info, ListChecks, MousePointerClick, Eye } from "lucide-react";

import { cn } from "@/lib/cn";
import { PAGE_INTROS, type PageIntroContent } from "@/config/page-intros";

type PageIntroProps = {
  /** Key into the central PAGE_INTROS registry. */
  id?: string;
  /** Inline content (overrides the registry when provided). */
  content?: PageIntroContent;
  /**
   * Deprecated/no-op: the help block is always expanded. Kept for backwards
   * compatibility with existing call sites that still pass it.
   */
  defaultOpen?: boolean;
  className?: string;
};

function Section({
  icon,
  title,
  items,
}: {
  icon: React.ReactNode;
  title: string;
  items: string[];
}) {
  if (!items?.length) return null;
  return (
    <div className="min-w-0 flex-1">
      <div className="mb-1 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-brand-600">
        {icon}
        <span>{title}</span>
      </div>
      <ul className="space-y-1 text-sm text-text-body">
        {items.map((item, index) => (
          <li key={index} className="flex gap-1.5">
            <span aria-hidden className="mt-2 h-1 w-1 shrink-0 rounded-full bg-border-strong" />
            <span className="min-w-0">{item}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

/**
 * Always-open help block for the top of a screen. It explains, in plain language:
 * what the screen is for, how to use it, what to watch, and the main actions available.
 * Content is centralized in `config/page-intros.ts` and referenced by `id`.
 */
export function PageIntro({ id, content, className }: PageIntroProps) {
  const resolved = content ?? (id ? PAGE_INTROS[id] : undefined);

  if (!resolved) return null;

  const hasDetails =
    Boolean(resolved.howTo?.length) ||
    Boolean(resolved.watch?.length) ||
    Boolean(resolved.actions?.length);

  return (
    <section
      aria-label="Sobre esta tela"
      className={cn(
        "rounded-2xl border border-border bg-bg-subtle/70 px-4 py-3 text-text-body",
        className,
      )}
    >
      <div className="flex items-start gap-3">
        <span className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-accent-200 bg-surface text-accent-600">
          <Info className="h-4 w-4" />
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-sm leading-relaxed text-text-body">
            {resolved.title ? (
              <span className="font-semibold text-text">{resolved.title}. </span>
            ) : null}
            {resolved.description}
          </p>
        </div>
      </div>

      {hasDetails ? (
        <div className="mt-3 flex flex-col gap-4 border-t border-border pt-3 sm:flex-row">
          <Section
            icon={<ListChecks className="h-3.5 w-3.5" />}
            title="Como usar"
            items={resolved.howTo ?? []}
          />
          <Section
            icon={<Eye className="h-3.5 w-3.5" />}
            title="O que observar"
            items={resolved.watch ?? []}
          />
          <Section
            icon={<MousePointerClick className="h-3.5 w-3.5" />}
            title="Ações disponíveis"
            items={resolved.actions ?? []}
          />
        </div>
      ) : null}
    </section>
  );
}

export default PageIntro;
