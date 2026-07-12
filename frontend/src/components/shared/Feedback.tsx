import { AlertCircle, Inbox, type LucideIcon } from "lucide-react";
import type { ReactNode } from "react";
import { Button } from "../ui/Button";

export function PageSkeleton() {
  return (
    <div role="status" aria-label="Loading content" className="animate-pulse space-y-6">
      <div className="space-y-3 border-b border-[var(--border)] pb-6">
        <div className="h-8 w-52 rounded-lg bg-[var(--surface-strong)]" />
        <div className="h-4 w-full max-w-lg rounded bg-[var(--surface)]" />
      </div>
      <div className="overflow-hidden rounded-xl border border-[var(--border)]">
        <div className="h-12 bg-[var(--surface)]" />
        {[1, 2, 3, 4].map((row) => <div key={row} className="h-16 border-t border-[var(--border)] bg-white" />)}
      </div>
    </div>
  );
}

export function EmptyState({ title, description, action, icon: Icon = Inbox }: { title: string; description: string; action?: ReactNode; icon?: LucideIcon }) {
  return (
    <div className="flex min-h-64 flex-col items-center justify-center px-6 py-12 text-center">
      <div className="mb-4 grid size-11 place-items-center rounded-full bg-[var(--surface-strong)] text-[var(--muted)]">
        <Icon aria-hidden="true" className="size-5" strokeWidth={1.75} />
      </div>
      <h2 className="text-base font-semibold text-[var(--ink)]">{title}</h2>
      <p className="mt-1 max-w-md text-sm leading-6 text-[var(--muted)]">{description}</p>
      {action ? <div className="mt-5">{action}</div> : null}
    </div>
  );
}

export function ErrorState({ message, onRetry }: { message: string; onRetry?: () => void }) {
  return (
    <div role="alert" className="flex min-h-64 flex-col items-center justify-center px-6 py-12 text-center">
      <div className="mb-4 grid size-11 place-items-center rounded-full bg-[var(--danger-soft)] text-[var(--danger)]">
        <AlertCircle aria-hidden="true" className="size-5" strokeWidth={1.75} />
      </div>
      <h2 className="text-base font-semibold text-[var(--ink)]">We could not load this information</h2>
      <p className="mt-1 max-w-md text-sm leading-6 text-[var(--muted)]">{message}</p>
      {onRetry ? <Button className="mt-5" variant="secondary" onClick={onRetry}>Try again</Button> : null}
    </div>
  );
}
