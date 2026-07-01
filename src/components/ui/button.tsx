import * as React from "react";

import { cn } from "@/lib/cn";

type ButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "default" | "outline" | "ghost" | "danger";
  size?: "sm" | "md";
  asChild?: boolean;
};

export function Button({ className, variant = "default", size = "md", asChild = false, ...props }: ButtonProps) {
  if (asChild) {
    const { children, ...rest } = props as ButtonProps & { children?: React.ReactNode };
    if (React.isValidElement(children)) {
      return React.cloneElement(children as React.ReactElement, {
        ...rest,
        className: cn(
          "inline-flex items-center justify-center rounded-xl border border-transparent font-medium tracking-[-0.01em] transition-all duration-200 ease-out focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500/30 focus-visible:ring-offset-2 focus-visible:ring-offset-[rgb(var(--surface))] disabled:cursor-not-allowed disabled:opacity-60",
          variant === "default" && "bg-gradient-to-r from-brand-600 via-brand-500 to-accent-600 text-white shadow-[0_14px_34px_rgba(30,64,175,0.18)] hover:-translate-y-0.5 hover:shadow-[0_18px_38px_rgba(30,64,175,0.22)]",
          variant === "outline" && "border-border bg-surface/90 text-text-body shadow-sm hover:border-border-strong hover:bg-bg-subtle",
          variant === "ghost" && "text-text-body hover:bg-bg-subtle hover:text-text",
          variant === "danger" && "bg-gradient-to-r from-danger-600 to-danger-500 text-white shadow-[0_14px_30px_rgba(220,38,38,0.16)] hover:-translate-y-0.5 hover:shadow-[0_18px_38px_rgba(220,38,38,0.20)]",
          size === "sm" ? "h-8 px-3 text-xs" : "h-10 px-4 text-sm",
          // preserve child className if present
          (children.props as { className?: string }).className,
          className,
        ),
      });
    }
    return null;
  }
  return (
    <button
      className={cn(
        "inline-flex items-center justify-center rounded-xl border border-transparent font-medium tracking-[-0.01em] transition-all duration-200 ease-out focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500/30 focus-visible:ring-offset-2 focus-visible:ring-offset-[rgb(var(--surface))] disabled:cursor-not-allowed disabled:opacity-60",
        variant === "default" && "bg-gradient-to-r from-brand-600 via-brand-500 to-accent-600 text-white shadow-[0_14px_34px_rgba(30,64,175,0.18)] hover:-translate-y-0.5 hover:shadow-[0_18px_38px_rgba(30,64,175,0.22)]",
        variant === "outline" && "border-border bg-surface/90 text-text-body shadow-sm hover:border-border-strong hover:bg-bg-subtle",
        variant === "ghost" && "text-text-body hover:bg-bg-subtle/80 hover:text-text",
        variant === "danger" && "bg-gradient-to-r from-danger-600 to-danger-500 text-white shadow-[0_14px_30px_rgba(220,38,38,0.16)] hover:-translate-y-0.5 hover:shadow-[0_18px_38px_rgba(220,38,38,0.20)]",
        size === "sm" ? "h-8 px-3 text-xs" : "h-10 px-4 text-sm",
        className,
      )}
      {...props}
    />
  );
}
