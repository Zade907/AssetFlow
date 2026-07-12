import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Search, ShieldCheck, Users } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { EmptyState, ErrorState, PageSkeleton } from "../../../components/shared/Feedback";
import { Badge } from "../../../components/ui/Badge";
import { Button } from "../../../components/ui/Button";
import { getErrorMessage, initials } from "../../../lib/utils";
import { useAuthStore } from "../../../stores/authStore";
import { roles, type Role } from "../../auth/types";
import { RoleChangeDialog } from "../components/RoleChangeDialog";
import { TableCell, TableHead, TableShell } from "../components/TableShell";
import { orgApi, orgQueryKeys, type Employee, type EntityStatus } from "../api";

const roleLabels: Record<Role, string> = { EMPLOYEE: "Employee", DEPARTMENT_HEAD: "Department Head", ASSET_MANAGER: "Asset Manager", ADMIN: "Admin" };

export function EmployeesPage() {
  const queryClient = useQueryClient();
  const currentUser = useAuthStore((state) => state.user);
  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState<Role | "ALL">("ALL");
  const [statusFilter, setStatusFilter] = useState<EntityStatus | "ALL">("ALL");
  const [departmentFilter, setDepartmentFilter] = useState("ALL");
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [roleChangeEmployee, setRoleChangeEmployee] = useState<Employee | null>(null);
  const [roleError, setRoleError] = useState<string | null>(null);
  const [statusError, setStatusError] = useState<string | null>(null);

  useEffect(() => {
    const timeout = window.setTimeout(() => setSearch(searchInput.trim()), 250);
    return () => window.clearTimeout(timeout);
  }, [searchInput]);

  const filters = {
    ...(search ? { search } : {}),
    ...(roleFilter !== "ALL" ? { role: roleFilter } : {}),
    ...(statusFilter !== "ALL" ? { status: statusFilter } : {}),
    ...(departmentFilter !== "ALL" ? { departmentId: departmentFilter } : {}),
  };
  const query = useQuery({ queryKey: [...orgQueryKeys.employees, filters], queryFn: () => orgApi.listEmployees(filters) });
  const departmentsQuery = useQuery({ queryKey: orgQueryKeys.departments, queryFn: orgApi.listDepartments });
  const roleMutation = useMutation({
    mutationFn: ({ id, role }: { id: string; role: Role }) => orgApi.promoteEmployee(id, role),
    onMutate: ({ id }) => { setPendingId(id); setRoleError(null); },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: orgQueryKeys.employees });
      toast.success("Employee role updated and logged");
      setRoleChangeEmployee(null);
    },
    onError: (error) => setRoleError(getErrorMessage(error, "Employee role could not be updated.")),
    onSettled: () => setPendingId(null),
  });
  const statusMutation = useMutation({
    mutationFn: ({ id, status }: { id: string; status: EntityStatus }) => orgApi.setEmployeeStatus(id, status),
    onMutate: ({ id }) => { setPendingId(id); setStatusError(null); },
    onSuccess: async (_, values) => { await queryClient.invalidateQueries({ queryKey: orgQueryKeys.employees }); toast.success(values.status === "ACTIVE" ? "Employee activated" : "Employee deactivated"); },
    onError: (error) => setStatusError(getErrorMessage(error, "Employee status could not be updated.")),
    onSettled: () => setPendingId(null),
  });

  if (query.isLoading || departmentsQuery.isLoading) return <PageSkeleton />;
  if (query.isError) return <ErrorState message={getErrorMessage(query.error)} onRetry={() => void query.refetch()} />;
  if (departmentsQuery.isError) return <ErrorState message={getErrorMessage(departmentsQuery.error)} onRetry={() => void departmentsQuery.refetch()} />;
  const employees = query.data ?? [];
  const hasFilters = Boolean(search || roleFilter !== "ALL" || statusFilter !== "ALL" || departmentFilter !== "ALL");
  const isCurrentUser = (employee: Employee) => employee.id === currentUser?.employeeId || employee.id === currentUser?.id;
  const clearFilters = () => { setSearchInput(""); setSearch(""); setRoleFilter("ALL"); setStatusFilter("ALL"); setDepartmentFilter("ALL"); };

  return (
    <section aria-labelledby="employees-heading" className="space-y-5">
      <div className="flex flex-wrap items-start justify-between gap-3"><div><h2 id="employees-heading" className="text-xl font-semibold text-[var(--ink)]">Employee Directory</h2><p className="mt-1 text-sm leading-6 text-[var(--muted)]">Search employees, control sign-in status, and assign roles through an audited confirmation.</p></div><span className="inline-flex min-h-10 items-center gap-2 rounded-lg bg-[var(--primary-soft)] px-3 text-sm font-medium text-[var(--primary)]"><ShieldCheck aria-hidden="true" className="size-4" />Role changes are audited</span></div>
      <div className="grid gap-3 rounded-xl border border-[var(--border)] bg-[var(--surface)] p-4 md:grid-cols-2 xl:grid-cols-[minmax(260px,1fr)_180px_180px_180px]">
        <label className="relative block"><span className="sr-only">Search employees</span><Search aria-hidden="true" className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-[var(--muted)]" strokeWidth={1.75} /><input value={searchInput} onChange={(event) => setSearchInput(event.target.value)} placeholder="Search name or email" className="min-h-11 w-full rounded-lg border border-[var(--border)] bg-white pl-10 pr-3 text-base placeholder:text-[var(--muted)] md:text-sm" /></label>
        <label><span className="sr-only">Filter by department</span><select value={departmentFilter} onChange={(event) => setDepartmentFilter(event.target.value)} className="min-h-11 w-full rounded-lg border border-[var(--border)] bg-white px-3 text-sm"><option value="ALL">All departments</option>{(departmentsQuery.data ?? []).map((department) => <option value={department.id} key={department.id}>{department.name}</option>)}</select></label>
        <label><span className="sr-only">Filter by role</span><select value={roleFilter} onChange={(event) => setRoleFilter(event.target.value as Role | "ALL")} className="min-h-11 w-full rounded-lg border border-[var(--border)] bg-white px-3 text-sm"><option value="ALL">All roles</option>{roles.map((role) => <option key={role} value={role}>{roleLabels[role]}</option>)}</select></label>
        <label><span className="sr-only">Filter by status</span><select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value as EntityStatus | "ALL")} className="min-h-11 w-full rounded-lg border border-[var(--border)] bg-white px-3 text-sm"><option value="ALL">All statuses</option><option value="ACTIVE">Active</option><option value="INACTIVE">Inactive</option></select></label>
      </div>
      {statusError ? <div role="alert" className="flex items-center justify-between gap-4 rounded-lg bg-[var(--danger-soft)] px-4 py-3 text-sm text-[var(--danger)]"><span>{statusError}</span><button type="button" className="font-medium underline underline-offset-4" onClick={() => setStatusError(null)}>Dismiss</button></div> : null}
      {employees.length === 0 ? <div className="rounded-xl border border-[var(--border)]"><EmptyState icon={hasFilters ? Search : Users} title={hasFilters ? "No matching employees" : "No employees yet"} description={hasFilters ? "Change the search term or filters to see more of the directory." : "Employees appear here after creating an account. Signup always grants Employee access."} action={hasFilters ? <Button variant="secondary" onClick={clearFilters}>Clear filters</Button> : undefined} /></div> : (
        <TableShell label="Employee directory">
          <thead><tr><TableHead>Employee</TableHead><TableHead>Department</TableHead><TableHead>Role</TableHead><TableHead>Status</TableHead><TableHead><span className="sr-only">Actions</span></TableHead></tr></thead>
          <tbody>{employees.map((employee) => {
            const ownAccount = isCurrentUser(employee);
            const disabled = pendingId === employee.id || ownAccount;
            return <tr key={employee.id} className="hover:bg-[var(--surface)]">
              <TableCell><div className="flex items-center gap-3"><span className="grid size-9 shrink-0 place-items-center rounded-full bg-[var(--surface-strong)] text-xs font-semibold">{initials(employee.name)}</span><span className="min-w-0"><span className="block font-medium">{employee.name}{ownAccount ? <span className="ml-2 text-xs font-normal text-[var(--muted)]">You</span> : null}</span><span className="block text-xs text-[var(--muted)]">{employee.email}</span></span></div></TableCell>
              <TableCell>{employee.department?.name ?? <span className="text-[var(--muted)]">Unassigned</span>}</TableCell>
              <TableCell><Badge tone={employee.role === "ADMIN" ? "danger" : employee.role === "EMPLOYEE" ? "neutral" : "info"}>{roleLabels[employee.role]}</Badge></TableCell>
              <TableCell><Badge tone={employee.status === "ACTIVE" ? "success" : "neutral"}>{employee.status === "ACTIVE" ? "Active" : "Inactive"}</Badge></TableCell>
              <TableCell className="text-right"><div className="flex flex-wrap justify-end gap-2"><Button variant="secondary" disabled={disabled} title={ownAccount ? "Another admin must change your role" : undefined} onClick={() => { setRoleError(null); setRoleChangeEmployee(employee); }}>Change role</Button><Button variant="ghost" className="min-w-[92px]" disabled={disabled} title={ownAccount ? "Another admin must change your status" : undefined} loading={pendingId === employee.id && statusMutation.isPending} onClick={() => statusMutation.mutate({ id: employee.id, status: employee.status === "ACTIVE" ? "INACTIVE" : "ACTIVE" })}>{employee.status === "ACTIVE" ? "Deactivate" : "Activate"}</Button></div></TableCell>
            </tr>;
          })}</tbody>
        </TableShell>
      )}
      <p className="text-xs leading-5 text-[var(--muted)]">Signup never grants elevated access. The server blocks self-role and self-status changes even if a request bypasses this screen.</p>
      <RoleChangeDialog employee={roleChangeEmployee} loading={roleMutation.isPending} error={roleError} onClose={() => { if (!roleMutation.isPending) { setRoleChangeEmployee(null); setRoleError(null); } }} onConfirm={(role) => roleChangeEmployee && roleMutation.mutate({ id: roleChangeEmployee.id, role })} />
    </section>
  );
}
