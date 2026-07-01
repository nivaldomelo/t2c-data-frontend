import { cn } from "@/lib/cn";

export function Skeleton({ className }: { className?: string }) {
  return <div className={cn("animate-pulse rounded-md bg-gradient-to-r from-bg-subtle via-surface-strong to-bg-subtle", className)} />;
}
