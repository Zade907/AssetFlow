import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Search, Users } from "lucide-react";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { EmptyState, ErrorState, PageSkeleton } from "../../../components/shared/Feedback";
import { Badge } from "../../../components/ui/Badge";
import { Button } from "../../../components/ui/Button";
import { getErrorMessage, initials } from "../../../lib/utils";
import { useAuthStore } from "../../../stores/authStore";
import { roles, type Role } from "../../auth/types";
import { TableCell, TableHead, TableShell } from "../components/TableShell";
import { orgApi, orgQueryKeys, type Employee, type EntityStatus } from "../api";

const roleLabels: Record<Role, string> = {
  EMPLOYEE: "Employee",
  DEPARTMENT_HEAD: "Department Head",
  ASSET_MANAGER: "Asset Manager",
  ADMIN: "Admin",
};

export function EmployeesPage() {
  const queryClient = useQueryClient();
  const currentUser = useAuthStore((state) => state.user);
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState<Role | "ALL">("ALL");
  const [statusFilter, setStatusFilter] = useState<EntityStatus | "ALL">("ALL");
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const query = useQuery({ queryKey: orgQueryKeys.employees, queryFn: orgApi.listEmployees });
  const roleMutation = useMutation({
    mutationFn: ({ id, role }: { id: string; role: Role }) => orgApi.promoteEmployee(id, role),
    onMutate: ({ id }) => { setPendingId(id); setActionError(null); },
    onSuccess: async () => { await queryClient.invalidateQueries({ queryKey: orgQueryKeys.employees }); toast.success("Employee role updated"); },
    onError: (error) => setActionError(getErrorMessage(error, "Employee role could not be updated.")),
    onSettled: () => setPendingId(null),
  });
  const statusMutation = useMutation({
    mutationFn: ({ id, status }: { id: string; status: EntityStatus }) => orgApi.setEmployeeStatus(id, status),
    onMutate: ({ id }) => { setPendingId(id); setActionError(null); },
    onSuccess: async (_, values) => { await queryClient.invalidateQueries({ queryKey: orgQueryKeys.employees }); toast.success(values.status === "ACTIVE" ? "Employee activated" : "Employee deactivated"); },
    onError: (error) => setActionError(getErrorMessage(error, "Employee status could not be updated.")),
    onSettled: () => setPendingId(null),
  });

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    return (query.data ?? []).filter((employee) => {
      const matchesSearch = !term || `${employee.name} ${employee.email} ${employee.department?.name ?? ""}`.toLowerCase().includes(term);
      return matchesSearch && (roleFilter === "ALL" || employee.role === roleFilter) && (statusFilter === "ALL" || employee.status === statusFilter);
    });
  }, [query.data, roleFilter, search, statusFilter]);

  if (query.isLoading) return <PageSkeleton />;
  if (query.isError) return <ErrorState message={getErrorMessage(query.error)} onRetry={() => void query.refetch()} />;
  const isCurrentUser = (employee: Employee) => employee.id === currentUser?.employeeId || employee.id === currentUser?.id;

  return (
    <section aria-labelledby="employees-heading" className="space-y-5">
      <div><h2 id="employees-heading" className="text-xl font-semibold text-[var(--ink)]">Employees</h2><p className="mt-1 text-sm leading-6 text-[var(--muted)]">Review directory access, assign responsibilities, and deactivate accounts that should no longer sign in.</p></div>
      <div className="grid gap-3 rounded-xl border border-[var(--border)] bg-[var(--surface)] p-4 md:grid-cols-[minmax(260px,1fr)_200px_180px]">
        <label className="relative block"><span className="sr-only">Search employees</span><Search aria-hidden="true" className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-[var(--muted)]" strokeWidth={1.75} /><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search name, email, or department" className="min-h-11 w-full rounded-lg border border-[var(--border)] bg-white pl-10 pr-3 text-base placeholder:text-[var(--muted)] md:text-sm" /></label>
        <label><span className="sr-only">Filter by role</span><select value={roleFilter} onChange={(event) => setRoleFilter(event.target.value as Role | "ALL")} className="min-h-11 w-full rounded-lg border border-[var(--border)] bg-white px-3 text-sm"><option value="ALL">All roles</option>{roles.map((role) => <option key={role} value={role}>{roleLabels[role]}</option>)}</select></label>
        <label><span className="sr-only">Filter by status</span><select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value as EntityStatus | "ALL")} className="min-h-11 w-full rounded-lg border border-[var(--border)] bg-white px-3 text-sm"><option value="ALL">All statuses</option><option value="ACTIVE">Active</option><option value="INACTIVE">Inactive</option></select></label>
      </div>
      {actionError ? <div role="alert" className="flex items-center justify-between gap-4 rounded-lg bg-[var(--danger-soft)] px-4 py-3 text-sm text-[var(--danger)]"><span>{actionError}</span><button type="button" className="font-medium underline underline-offset-4" onClick={() => setActionError(null)}>Dismiss</button></div> : null}
      {(query.data ?? []).length === 0 ? <div className="rounded-xl border border-[var(--border)]"><EmptyState icon={Users} title="No employees yet" description="Employees appear here after they create an account. Signup always grants Employee access only." /></div> : filtered.length === 0 ? <div className="rounded-xl border border-[var(--border)]"><EmptyState icon={Search} title="No matching employees" description="Change the search term or filters to see more of the directory." action={<Button variant="secondary" onClick={() => { setSearch(""); setRoleFilter("ALL"); setStatusFilter("ALL"); }}>Clear filters</Button>} /></div> : (
        <TableShell label="Employee directory">
          <thead><tr><TableHead>Employee</TableHead><TableHead>Department</TableHead><TableHead>Role</TableHead><TableHead>Status</TableHead><TableHead><span className="sr-only">Status action</span></TableHead></tr></thead>
          <tbody>{filtered.map((employee) => {
            const ownAccount = isCurrentUser(employee);
            const disabled = pendingId === employee.id || ownAccount;
            return <tr key={employee.id} className="hover:bg-[var(--surface)]">
              <TableCell><div className="flex items-center gap-3"><span className="grid size-9 shrink-0 place-items-center rounded-full bg-[var(--surface-strong)] text-xs font-semibold">{initials(employee.name)}</span><span className="min-w-0"><span className="block font-medium">{employee.name}{ownAccount ? <span className="ml-2 text-xs font-normal text-[var(--muted)]">You</span> : null}</span><span className="block text-xs text-[var(--muted)]">{employee.email}</span></span></div></TableCell>
              <TableCell>{employee.department?.name ?? <span className="text-[var(--muted)]">Unassigned</span>}</TableCell>
              <TableCell><label><span className="sr-only">Role for {employee.name}</span><select value={employee.role} onChange={(event) => roleMutation.mutate({ id: employee.id, role: event.target.value as Role })} disabled={disabled} title={ownAccount ? "Another admin must change your role" : undefined} className="min-h-10 rounded-lg border border-[var(--border)] bg-white px-3 text-sm disabled:bg-[var(--surface)] disabled:text-[var(--muted)]">{roles.map((role) => <option key={role} value={role}>{roleLabels[role]}</option>)}</select></label></TableCell>
              <TableCell><Badge tone={employee.status === "ACTIVE" ? "success" : "neutral"}>{employee.status === "ACTIVE" ? "Active" : "Inactive"}</Badge></TableCell>
              <TableCell className="text-right"><Button variant="secondary" className="min-w-[92px]" disabled={disabled} title={ownAccount ? "Another admin must change your status" : undefined} loading={pendingId === employee.id} onClick={() => statusMutation.mutate({ id: employee.id, status: employee.status === "ACTIVE" ? "INACTIVE" : "ACTIVE" })}>{employee.status === "ACTIVE" ? "Deactivate" : "Activate"}</Button></TableCell>
            </tr>;
          })}</tbody>
        </TableShell>
      )}
      <p className="text-xs leading-5 text-[var(--muted)]">Signup never grants elevated access. Only admins can change roles from this directory. For safety, another admin must change your own role or status.</p>
    </section>
  );
}
