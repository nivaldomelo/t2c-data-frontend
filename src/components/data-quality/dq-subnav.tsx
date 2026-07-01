import { Link } from "@/lib/next-shims";
import { usePathname } from "@/lib/next-shims";

import { cn } from "@/lib/cn";

const items = [
  { href: "/data-quality", label: "Visão geral" },
  { href: "/data-quality/observability", label: "Observabilidade" },
  { href: "/data-quality/rules", label: "Regras" },
  { href: "/data-quality/profiling-executions", label: "Execuções de Profiling" },
  { href: "/incidents/tickets", label: "Incidentes" },
];

export function DQSubnav() {
  const pathname = usePathname();

  return (
    <div className="inline-flex rounded-lg border border-border bg-surface p-1">
      {items.map((item) => {
        const active = item.href === "/data-quality"
          ? pathname === "/data-quality"
          : pathname.startsWith(item.href);
        return (
          <Link
            className={cn(
              "rounded-md px-3 py-1.5 text-sm font-medium transition",
              active ? "bg-slate-900 text-white" : "text-text-body hover:bg-bg-subtle",
            )}
            href={item.href}
            key={item.href}
          >
            {item.label}
          </Link>
        );
      })}
    </div>
  );
}
