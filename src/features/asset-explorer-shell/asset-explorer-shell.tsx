import type { ReactNode } from "react";

import { cn } from "@/lib/cn";

export type AssetExplorerShellProps = {
  top?: ReactNode;
  sidebar: ReactNode;
  detail: ReactNode;
  emptyDetail?: ReactNode;
  sidebarCollapsed?: boolean;
  sidebarExpandedClassName?: string;
  sidebarCollapsedClassName?: string;
  className?: string;
  detailClassName?: string;
  railClassName?: string;
};

export function AssetExplorerShell({
  top,
  sidebar,
  detail,
  emptyDetail,
  sidebarCollapsed = false,
  sidebarExpandedClassName = "xl:w-[360px]",
  sidebarCollapsedClassName = "xl:w-[104px]",
  className,
  detailClassName,
  railClassName,
}: AssetExplorerShellProps) {
  return (
    <div className={cn("w-full min-w-0 space-y-4 pb-6", className)}>
      {top ? <div className="w-full min-w-0">{top}</div> : null}

      <div className="flex w-full min-w-0 flex-col gap-4 xl:flex-row">
        <aside
          className={cn(
            "w-full min-w-0 shrink-0 transition-[width] duration-300 ease-[cubic-bezier(0.22,1,0.36,1)]",
            sidebarCollapsed ? sidebarCollapsedClassName : sidebarExpandedClassName,
            railClassName,
          )}
        >
          {sidebar}
        </aside>

        <section className={cn("min-w-0 flex-1 self-stretch", detailClassName)}>{detail ?? emptyDetail}</section>
      </div>
    </div>
  );
}
