import { Construction, type LucideIcon } from "lucide-react";
import { PageHeader } from "../../../components/shared/PageHeader";
import { EmptyState } from "../../../components/shared/Feedback";

export function ModulePlaceholderPage({ title, description, emptyTitle, emptyDescription, icon }: { title: string; description: string; emptyTitle: string; emptyDescription: string; icon?: LucideIcon }) {
  return (
    <div className="space-y-6">
      <PageHeader title={title} description={description} />
      <div className="rounded-xl border border-[var(--border)]">
        <EmptyState title={emptyTitle} description={emptyDescription} icon={icon ?? Construction} />
      </div>
    </div>
  );
}
