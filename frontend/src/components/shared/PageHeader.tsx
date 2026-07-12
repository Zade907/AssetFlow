import type { ReactNode } from "react";

export function PageHeader({ title, description, actions }: { title: string; description?: string; actions?: ReactNode }) {
  return (
    <header className="flex flex-col gap-4 border-b border-[var(--border)] pb-6 sm:flex-row sm:items-end sm:justify-between">
      <div className="min-w-0">
        <h1 className="text-balance text-[28px] font-semibold leading-9 tracking-[-0.02em] text-[var(--ink)]">{title}</h1>
        {description ? <p className="mt-1 max-w-[70ch] text-pretty text-sm leading-6 text-[var(--muted)]">{description}</p> : null}
      </div>
      {actions ? <div className="flex shrink-0 flex-wrap gap-2">{actions}</div> : null}
    </header>
  );
}
