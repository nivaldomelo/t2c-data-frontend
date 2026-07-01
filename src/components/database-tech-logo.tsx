import { Database } from "lucide-react";

import { cn } from "@/lib/cn";
import { dbEngineMeta } from "@/lib/database-engine";

const VARIANT_CLASSNAMES = {
  default: "h-10 w-10 rounded-2xl border border-border/80 bg-surface/90 p-2 shadow-sm",
  compact: "h-8 w-8 rounded-xl border border-border/80 bg-surface/90 p-1.5",
  card: "h-12 w-12 rounded-2xl border border-border/80 bg-gradient-to-br from-brand-50 via-white to-accent-50 p-2.5 shadow-sm",
} as const;

const IMAGE_CLASSNAMES = {
  default: "h-full w-full object-contain",
  compact: "h-full w-full object-contain",
  card: "h-full w-full object-contain",
} as const;

type DatabaseTechLogoProps = {
  engine: string | null | undefined;
  size?: number;
  variant?: keyof typeof VARIANT_CLASSNAMES;
  showLabel?: boolean;
  className?: string;
  labelClassName?: string;
};

export function DatabaseTechLogo({
  engine,
  size,
  variant = "default",
  showLabel = false,
  className,
  labelClassName,
}: DatabaseTechLogoProps) {
  const meta = dbEngineMeta(engine);
  const containerStyle = size ? { width: size, height: size } : undefined;

  const logo = (
    <span
      aria-hidden={showLabel ? true : undefined}
      className={cn(
        "inline-flex shrink-0 items-center justify-center overflow-hidden",
        VARIANT_CLASSNAMES[variant],
        className,
      )}
      style={containerStyle}
      >
        {meta.logoSrc ? (
          <img alt={meta.iconAlt} className={IMAGE_CLASSNAMES[variant]} loading="lazy" src={meta.logoSrc} />
        ) : (
          <Database className="h-[70%] w-[70%] text-muted" />
        )}
      </span>
  );

  if (!showLabel) {
    return logo;
  }

  return (
    <span className="inline-flex items-center gap-3">
      {logo}
      <span className={cn("text-sm font-medium tracking-[-0.01em] text-text", labelClassName)}>{meta.label}</span>
    </span>
  );
}
