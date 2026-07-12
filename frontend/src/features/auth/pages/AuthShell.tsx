import { Boxes, CheckCircle2 } from "lucide-react";
import type { ReactNode } from "react";

export function Brand({ compact = false }: { compact?: boolean }) {
  return (
    <div className="flex items-center gap-3">
      <span className="grid size-9 shrink-0 place-items-center rounded-lg bg-[var(--primary)] text-white">
        <Boxes aria-hidden="true" className="size-5" strokeWidth={1.75} />
      </span>
      {!compact ? <span className="text-lg font-semibold tracking-[-0.02em] text-[var(--ink)]">AssetFlow</span> : null}
    </div>
  );
}

export function AuthShell({ title, description, children, footer }: { title: string; description: string; children: ReactNode; footer: ReactNode }) {
  return (
    <main className="grid min-h-[100dvh] bg-white lg:grid-cols-[minmax(320px,0.85fr)_minmax(520px,1.15fr)]">
      <section className="hidden border-r border-[var(--border)] bg-[var(--surface)] p-12 lg:flex lg:flex-col lg:justify-between">
        <Brand />
        <div className="max-w-md pb-10">
          <p className="text-[28px] font-semibold leading-9 tracking-[-0.025em] text-[var(--ink)]">Know where every asset is, and who has it.</p>
          <ul className="mt-8 space-y-4 text-sm text-[var(--muted)]">
            {["Clear ownership and availability", "Conflict-free resource bookings", "Role-based organization controls"].map((item) => (
              <li key={item} className="flex items-center gap-3">
                <CheckCircle2 aria-hidden="true" className="size-[18px] text-[var(--success)]" strokeWidth={1.75} />
                {item}
              </li>
            ))}
          </ul>
        </div>
        <p className="text-xs text-[var(--muted)]">Physical asset operations, kept current.</p>
      </section>

      <section className="flex min-h-[100dvh] flex-col px-5 py-6 sm:px-10 lg:px-16">
        <div className="lg:hidden"><Brand /></div>
        <div className="m-auto w-full max-w-[420px] py-10">
          <h1 className="text-[28px] font-semibold leading-9 tracking-[-0.02em] text-[var(--ink)]">{title}</h1>
          <p className="mt-2 text-sm leading-6 text-[var(--muted)]">{description}</p>
          <div className="mt-8">{children}</div>
          <div className="mt-7 text-center text-sm text-[var(--muted)]">{footer}</div>
        </div>
      </section>
    </main>
  );
}
