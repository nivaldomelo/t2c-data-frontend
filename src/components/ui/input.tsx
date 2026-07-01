import { cn } from "@/lib/cn";

type InputProps = React.InputHTMLAttributes<HTMLInputElement>;

export function Input({ className, ...props }: InputProps) {
  return (
    <input
      className={cn(
        "h-10 w-full rounded-xl border border-border bg-surface/90 px-3.5 text-sm text-text-body shadow-[0_8px_24px_rgba(15,23,42,0.04)] transition-all duration-200 ease-out placeholder:text-muted focus:border-brand-300 focus:outline-none focus:ring-4 focus:ring-brand-500/10",
        className,
      )}
      {...props}
    />
  );
}
