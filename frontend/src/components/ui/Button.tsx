import { LoaderCircle } from "lucide-react";
import type { ButtonHTMLAttributes } from "react";
import { cn } from "../../lib/utils";

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "primary" | "secondary" | "ghost" | "danger";
  loading?: boolean;
};

export function Button({ className, variant = "primary", loading, disabled, children, ...props }: ButtonProps) {
  const variants = {
    primary: "bg-[var(--primary)] text-white hover:bg-[var(--primary-hover)]",
    secondary: "border border-[var(--border)] bg-white text-[var(--ink)] hover:bg-[var(--surface)]",
    ghost: "bg-transparent text-[var(--muted)] hover:bg-[var(--surface-strong)] hover:text-[var(--ink)]",
    danger: "bg-[var(--danger)] text-white hover:bg-[color-mix(in_oklch,var(--danger)_85%,black)]",
  };

  return (
    <button
      className={cn(
        "inline-flex min-h-10 items-center justify-center gap-2 whitespace-nowrap rounded-lg px-4 text-sm font-medium transition-colors duration-200 active:translate-y-px disabled:cursor-not-allowed disabled:opacity-55",
        variants[variant],
        className,
      )}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      {...props}
    >
      {loading ? <LoaderCircle aria-hidden="true" className="size-4 animate-spin" /> : null}
      {children}
    </button>
  );
}
