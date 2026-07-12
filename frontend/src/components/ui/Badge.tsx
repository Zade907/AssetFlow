import type { ReactNode } from "react";
import { cn } from "../../lib/utils";

export function Badge({ children, tone = "neutral" }: { children: ReactNode; tone?: "neutral" | "success" | "warning" | "danger" | "info" }) {
  const tones = {
    neutral: "bg-[var(--surface-strong)] text-[var(--ink)]",
    success: "bg-[var(--success-soft)] text-[color-mix(in_oklch,var(--success)_82%,black)]",
    warning: "bg-[var(--warning-soft)] text-[color-mix(in_oklch,var(--warning)_68%,black)]",
    danger: "bg-[var(--danger-soft)] text-[var(--danger)]",
    info: "bg-[var(--info-soft)] text-[var(--info)]",
  };
  return <span className={cn("inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium", tones[tone])}>{children}</span>;
}
