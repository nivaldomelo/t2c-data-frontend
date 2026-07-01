import { cn } from "@/lib/cn";
import { STATUS_TOKENS } from "@/config/status-tokens";

type BadgeProps = React.HTMLAttributes<HTMLSpanElement> & {
  tone?: "neutral" | "accent" | "success" | "warning" | "danger";
};

export function Badge({ className, tone = "accent", ...props }: BadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full border px-2.5 py-1 text-[11px] font-semibold tracking-[0.01em] shadow-[inset_0_1px_0_rgba(255,255,255,0.7)]",
        tone === "accent" && `${STATUS_TOKENS.accent.border} ${STATUS_TOKENS.accent.background} ${STATUS_TOKENS.accent.text}`,
        tone === "neutral" && `${STATUS_TOKENS.neutral.border} ${STATUS_TOKENS.neutral.background} ${STATUS_TOKENS.neutral.text}`,
        tone === "success" && `${STATUS_TOKENS.success.border} ${STATUS_TOKENS.success.background} ${STATUS_TOKENS.success.text}`,
        tone === "warning" && `${STATUS_TOKENS.warning.border} ${STATUS_TOKENS.warning.background} ${STATUS_TOKENS.warning.text}`,
        tone === "danger" && `${STATUS_TOKENS.danger.border} ${STATUS_TOKENS.danger.background} ${STATUS_TOKENS.danger.text}`,
        className,
      )}
      {...props}
    />
  );
}
