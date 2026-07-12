import type { ReactNode } from "react";

export function TableShell({ children, label }: { children: ReactNode; label: string }) {
  return <div className="overflow-x-auto rounded-xl border border-[var(--border)]"><table aria-label={label} className="w-full min-w-[720px] border-collapse text-left text-sm">{children}</table></div>;
}

export function TableHead({ children }: { children: ReactNode }) {
  return <th scope="col" className="bg-[var(--surface)] px-4 py-3 text-xs font-semibold text-[var(--muted)]">{children}</th>;
}

export function TableCell({ children, className = "" }: { children: ReactNode; className?: string }) {
  return <td className={`border-t border-[var(--border)] px-4 py-3 align-middle text-[var(--ink)] ${className}`}>{children}</td>;
}
