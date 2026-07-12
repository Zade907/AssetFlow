import { ArrowRight, Boxes, CalendarClock, Settings2 } from "lucide-react";
import { Link } from "react-router";
import { PageHeader } from "../../../components/shared/PageHeader";
import { Badge } from "../../../components/ui/Badge";
import { useAuthStore } from "../../../stores/authStore";

const quickLinks = [
  { title: "Browse assets", description: "Find equipment and see current availability.", href: "/assets", icon: Boxes },
  { title: "View bookings", description: "Review shared resources and upcoming reservations.", href: "/bookings", icon: CalendarClock },
];

export function DashboardPage() {
  const user = useAuthStore((state) => state.user);
  const roleLabel = user?.role.replaceAll("_", " ").toLowerCase().replace(/\b\w/g, (letter) => letter.toUpperCase());
  return (
    <div className="space-y-8">
      <PageHeader title={`Good to see you, ${user?.name.split(" ")[0] ?? "there"}`} description="Your starting point for current assets, reservations, and organization work." />
      <section aria-labelledby="account-context-heading">
        <h2 id="account-context-heading" className="text-xl font-semibold text-[var(--ink)]">Account context</h2>
        <div className="mt-4 flex flex-wrap items-center gap-x-8 gap-y-4 rounded-xl border border-[var(--border)] bg-[var(--surface)] px-5 py-4">
          <div><p className="text-xs text-[var(--muted)]">Access level</p><div className="mt-1"><Badge tone={user?.role === "ADMIN" ? "danger" : "neutral"}>{roleLabel}</Badge></div></div>
          <div><p className="text-xs text-[var(--muted)]">Department</p><p className="mt-1 text-sm font-medium text-[var(--ink)]">{user?.department?.name ?? "Not assigned"}</p></div>
          <div><p className="text-xs text-[var(--muted)]">Signed in as</p><p className="mt-1 text-sm font-medium text-[var(--ink)]">{user?.email}</p></div>
        </div>
      </section>
      <section aria-labelledby="quick-actions-heading">
        <h2 id="quick-actions-heading" className="text-xl font-semibold text-[var(--ink)]">Start here</h2>
        <div className="mt-4 divide-y divide-[var(--border)] rounded-xl border border-[var(--border)]">
          {[...quickLinks, ...(user?.role === "ADMIN" ? [{ title: "Set up your organization", description: "Manage departments, categories, employees, and roles.", href: "/org-setup", icon: Settings2 }] : [])].map(({ title, description, href, icon: Icon }) => (
            <Link key={href} to={href} className="group flex min-h-20 items-center gap-4 px-5 py-4 transition-colors duration-200 hover:bg-[var(--surface)] first:rounded-t-xl last:rounded-b-xl">
              <span className="grid size-10 shrink-0 place-items-center rounded-lg bg-[var(--primary-soft)] text-[var(--primary)]"><Icon aria-hidden="true" className="size-5" strokeWidth={1.75} /></span>
              <span className="min-w-0 flex-1"><span className="block text-sm font-semibold text-[var(--ink)]">{title}</span><span className="mt-0.5 block text-sm text-[var(--muted)]">{description}</span></span>
              <ArrowRight aria-hidden="true" className="size-[18px] shrink-0 text-[var(--muted)] transition-transform duration-200 group-hover:translate-x-0.5" strokeWidth={1.75} />
            </Link>
          ))}
        </div>
      </section>
    </div>
  );
}
