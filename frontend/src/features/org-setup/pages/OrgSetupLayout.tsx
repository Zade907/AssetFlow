import { NavLink, Outlet } from "react-router";
import { PageHeader } from "../../../components/shared/PageHeader";
import { cn } from "../../../lib/utils";

const tabs = [
  { label: "Departments", href: "/org-setup/departments" },
  { label: "Categories", href: "/org-setup/categories" },
  { label: "Employees", href: "/org-setup/employees" },
];

export function OrgSetupLayout() {
  return (
    <div className="space-y-6">
      <PageHeader title="Organization setup" description="Manage the structure, asset types, and employee access for your organization." />
      <nav aria-label="Organization setup sections" className="-mx-1 overflow-x-auto border-b border-[var(--border)] px-1">
        <ul className="flex min-w-max gap-5">
          {tabs.map((tab) => (
            <li key={tab.href}>
              <NavLink to={tab.href} className={({ isActive }) => cn("block min-h-11 border-b-2 border-transparent px-1 py-3 text-sm font-medium text-[var(--muted)] transition-colors hover:text-[var(--ink)]", isActive && "border-[var(--primary)] text-[var(--primary)]")}>{tab.label}</NavLink>
            </li>
          ))}
        </ul>
      </nav>
      <Outlet />
    </div>
  );
}
