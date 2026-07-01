export type StatusTone = "neutral" | "accent" | "success" | "warning" | "danger" | "info";

export const STATUS_TOKENS: Record<
  StatusTone,
  {
    border: string;
    background: string;
    text: string;
    icon: string;
  }
> = {
  neutral: {
    border: "border-border",
    background: "bg-bg-subtle/90",
    text: "text-text-body",
    icon: "text-muted",
  },
  accent: {
    border: "border-brand-200",
    background: "bg-brand-50",
    text: "text-brand-700",
    icon: "text-brand-600",
  },
  success: {
    border: "border-success-200",
    background: "bg-success-50",
    text: "text-success-700",
    icon: "text-success-600",
  },
  warning: {
    border: "border-warning-200",
    background: "bg-warning-50",
    text: "text-warning-700",
    icon: "text-warning-700",
  },
  danger: {
    border: "border-danger-200",
    background: "bg-danger-50",
    text: "text-danger-700",
    icon: "text-danger-700",
  },
  info: {
    border: "border-info-200",
    background: "bg-info-50",
    text: "text-info-700",
    icon: "text-info-700",
  },
};
