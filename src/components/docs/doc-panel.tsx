import { Link } from "@/lib/next-shims";
import { useEffect, useMemo, useRef, useState } from "react";
import { BookText, ChevronLeft, ChevronRight } from "lucide-react";

import { Button } from "@/components/ui/button";
import { STATUS_TOKENS } from "@/config/status-tokens";
import { cn } from "@/lib/cn";
import { useAuth } from "@/lib/auth";
import { useDoc } from "@/lib/doc-context";

export function DocPanel() {
  const { isOpen, toggle, docContent, scrollTarget } = useDoc();
  const auth = useAuth();
  const scrollRef = useRef<HTMLDivElement | null>(null);
  const [highlighted, setHighlighted] = useState<string>("");
  const showFallback = docContent.id === "default" || docContent.sections.length === 0;
  const canAccessCurrentDoc = !docContent.routePath || auth.canAccessPath(docContent.routePath);

  useEffect(() => {
    if (!scrollTarget) return;
    const element = document.getElementById(`doc-section-${scrollTarget.anchorId}`);
    if (!element) return;

    element.scrollIntoView({ behavior: "smooth", block: "start" });
    setHighlighted(scrollTarget.anchorId);
    const timeoutId = window.setTimeout(() => setHighlighted(""), 1400);
    return () => window.clearTimeout(timeoutId);
  }, [scrollTarget]);

  const panelClasses = useMemo(
    () =>
      cn(
        "rounded-xl border border-border bg-surface shadow-sm transition-all",
        isOpen ? "w-[360px]" : "w-[44px]",
      ),
    [isOpen],
  );

  return (
    <aside className={panelClasses} data-testid="doc-panel">
      <div className="flex items-center justify-between border-b border-border px-2 py-2">
        {isOpen ? (
          <div className="flex items-center gap-2 px-1">
            <BookText className="h-4 w-4 text-orange-600" />
            <p className="text-sm font-semibold text-text-body">Ajuda</p>
          </div>
        ) : null}
        <Button
          aria-label={isOpen ? "Recolher documentação" : "Expandir documentação"}
          onClick={toggle}
          size="sm"
          title={isOpen ? "Recolher documentação" : "Expandir documentação"}
          variant="ghost"
        >
          {isOpen ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
        </Button>
      </div>

      {isOpen ? (
        <div className="max-h-[calc(100vh-220px)] overflow-y-auto p-3" ref={scrollRef}>
          {!canAccessCurrentDoc ? (
            <div className={cn("rounded-md border px-3 py-3", STATUS_TOKENS.warning.border, STATUS_TOKENS.warning.background)}>
              <h3 className={cn("text-sm font-semibold", STATUS_TOKENS.warning.text)}>Ajuda desta tela</h3>
              <p className={cn("mt-1 text-sm", STATUS_TOKENS.warning.text)}>Você não tem acesso a esta página com o perfil atual.</p>
            </div>
          ) : showFallback ? (
            <div className="rounded-md border border-border px-3 py-3">
              <h3 className="text-sm font-semibold text-text">Ajuda</h3>
              <p className="mt-1 text-sm text-text-body">Selecione um item para ver a documentação desta tela</p>
            </div>
          ) : (
            <>
              <h3 className="text-sm font-semibold text-text">{docContent.title}</h3>
              {docContent.intro ? <p className="mt-1 text-xs leading-relaxed text-text-body">{docContent.intro}</p> : null}

              <div className="mt-3 space-y-2">
                {docContent.sections.map((section) => (
                  <details
                  className={cn(
                    "rounded-md border border-border px-3 py-2 transition",
                    section.variant === "tip" && "border-success-200 bg-success-50/40",
                    section.variant === "warning" && `${STATUS_TOKENS.warning.border} ${STATUS_TOKENS.warning.background}`,
                    highlighted === section.id && "doc-panel-highlight border-orange-300 bg-orange-50",
                  )}
                    open={section.defaultOpen ?? false}
                    id={`doc-section-${section.id}`}
                    key={section.id}
                  >
                    <summary className="cursor-pointer list-none pr-2 text-xs font-semibold uppercase tracking-wide text-text-body marker:hidden">
                      <span className="inline-flex items-center gap-2">
                        <span>{section.title}</span>
                      </span>
                    </summary>
                    <div className="mt-2 space-y-2">
                      {section.body ? <p className="text-sm leading-relaxed text-text-body">{section.body}</p> : null}

                      {section.bullets?.length ? (
                        <ul className="list-disc space-y-1 pl-4 text-sm leading-relaxed text-text-body">
                          {section.bullets.map((item, idx) => (
                            <li key={`${section.id}-bullet-${idx}`}>{item}</li>
                          ))}
                        </ul>
                      ) : null}

                      {section.fields?.length ? (
                        <div className="space-y-1">
                          {section.fields.map((field) => (
                            <div
                              className="rounded border border-border bg-surface/70 px-2 py-1.5 text-xs leading-relaxed"
                              key={`${section.id}-field-${field.name}`}
                            >
                              <p className="font-semibold text-text-body">{field.name}</p>
                              <p className="text-text-body">{field.description}</p>
                            </div>
                          ))}
                        </div>
                      ) : null}

                      {section.tips?.length ? (
                        <div className={cn("rounded border px-2 py-2", STATUS_TOKENS.warning.border, STATUS_TOKENS.warning.background)}>
                          <p className={cn("text-[11px] font-semibold uppercase tracking-wide", STATUS_TOKENS.warning.text)}>Dicas</p>
                          <ul className={cn("mt-1 list-disc space-y-1 pl-4 text-sm", STATUS_TOKENS.warning.text)}>
                            {section.tips.map((tip, idx) => (
                              <li key={`${section.id}-tip-${idx}`}>{tip}</li>
                            ))}
                          </ul>
                        </div>
                      ) : null}

                      {section.links?.length ? (
                        <div className="flex flex-wrap gap-2">
                          {section.links.map((link) => (
                            <Link
                              className="rounded border border-border bg-surface px-2 py-1 text-xs font-medium text-text-body hover:border-orange-300 hover:text-orange-700"
                              href={link.href}
                              key={`${section.id}-link-${link.href}`}
                            >
                              {link.label}
                            </Link>
                          ))}
                        </div>
                      ) : null}
                    </div>
                  </details>
                ))}
              </div>
            </>
          )}
        </div>
      ) : null}
    </aside>
  );
}
