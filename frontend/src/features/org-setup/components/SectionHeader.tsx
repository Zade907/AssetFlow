import { Plus } from "lucide-react";
import { Button } from "../../../components/ui/Button";

export function SectionHeader({ title, description, actionLabel, onAction, actionExpanded }: { title: string; description: string; actionLabel: string; onAction: () => void; actionExpanded?: boolean }) {
  return (
    <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
      <div><h2 className="text-xl font-semibold text-[var(--ink)]">{title}</h2><p className="mt-1 text-sm leading-6 text-[var(--muted)]">{description}</p></div>
      <Button onClick={onAction} aria-expanded={actionExpanded}><Plus aria-hidden="true" className="size-4" strokeWidth={1.75} />{actionLabel}</Button>
    </div>
  );
}
