import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Pencil, Trash2 } from "lucide-react";
import { useMemo, useState } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";
import { ConfirmDialog } from "../../../components/shared/ConfirmDialog";
import { EmptyState, ErrorState, PageSkeleton } from "../../../components/shared/Feedback";
import { Badge } from "../../../components/ui/Badge";
import { Button } from "../../../components/ui/Button";
import { Field, SelectField } from "../../../components/ui/Field";
import { getErrorMessage } from "../../../lib/utils";
import { SectionHeader } from "../components/SectionHeader";
import { TableCell, TableHead, TableShell } from "../components/TableShell";
import { orgApi, orgQueryKeys, type Department, type EntityStatus } from "../api";

const schema = z.object({
  name: z.string().trim().min(2, "Enter a department name.").max(120),
  code: z.string().trim().min(2, "Use at least 2 characters.").max(20, "Use 20 characters or fewer.").regex(/^[A-Za-z0-9_-]+$/, "Use letters, numbers, hyphens, or underscores."),
  parentDepartmentId: z.string().optional(),
  headEmployeeId: z.string().optional(),
  status: z.enum(["ACTIVE", "INACTIVE"]),
});
type FormValues = z.infer<typeof schema>;

function descendantIds(departments: Department[], rootId: string) {
  const descendants = new Set<string>();
  const queue = [rootId];
  while (queue.length > 0) {
    const parentId = queue.shift();
    for (const department of departments) {
      if (department.parentDepartmentId === parentId && !descendants.has(department.id)) {
        descendants.add(department.id);
        queue.push(department.id);
      }
    }
  }
  return descendants;
}

export function DepartmentsPage() {
  const queryClient = useQueryClient();
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<Department | null>(null);
  const [deleting, setDeleting] = useState<Department | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const departmentsQuery = useQuery({ queryKey: orgQueryKeys.departments, queryFn: orgApi.listDepartments });
  const employeesQuery = useQuery({ queryKey: orgQueryKeys.employees, queryFn: () => orgApi.listEmployees() });
  const saveMutation = useMutation({
    mutationFn: ({ id, values }: { id?: string; values: FormValues }) => {
      const common = {
        name: values.name,
        code: values.code.toUpperCase(),
        parentDepartmentId: values.parentDepartmentId || null,
        status: values.status as EntityStatus,
      };
      return id
        ? orgApi.updateDepartment(id, { ...common, headEmployeeId: values.headEmployeeId || null })
        : orgApi.createDepartment(common);
    },
    onSuccess: async (_, variables) => {
      await queryClient.invalidateQueries({ queryKey: orgQueryKeys.departments });
      toast.success(variables.id ? "Department updated" : "Department created");
    },
  });
  const deleteMutation = useMutation({
    mutationFn: orgApi.deleteDepartment,
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: orgQueryKeys.departments });
      toast.success("Department deleted");
      setDeleting(null);
    },
    onError: (error) => toast.error(getErrorMessage(error, "Department could not be deleted.")),
  });
  const { register, handleSubmit, reset, formState: { errors } } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { name: "", code: "", parentDepartmentId: "", headEmployeeId: "", status: "ACTIVE" },
  });

  const departments = departmentsQuery.data ?? [];
  const blockedParents = useMemo(() => editing ? descendantIds(departments, editing.id) : new Set<string>(), [departments, editing]);
  const eligibleHeads = (employeesQuery.data ?? []).filter((employee) =>
    Boolean(editing) && employee.departmentId === editing?.id && employee.status === "ACTIVE",
  );
  const parentOptions = departments.filter((department) => department.id !== editing?.id && !blockedParents.has(department.id));

  const openCreate = () => {
    setEditing(null);
    reset({ name: "", code: "", parentDepartmentId: "", headEmployeeId: "", status: "ACTIVE" });
    setFormError(null);
    setFormOpen(true);
  };
  const openEdit = (department: Department) => {
    setEditing(department);
    reset({
      name: department.name,
      code: department.code,
      parentDepartmentId: department.parentDepartmentId ?? "",
      headEmployeeId: department.headEmployeeId ?? "",
      status: department.status,
    });
    setFormError(null);
    setFormOpen(true);
  };
  const closeForm = () => { setFormOpen(false); setEditing(null); setFormError(null); };
  const save = handleSubmit(async (values) => {
    setFormError(null);
    try {
      await saveMutation.mutateAsync({ id: editing?.id, values });
      closeForm();
    } catch (error) {
      setFormError(getErrorMessage(error, "Department could not be saved."));
    }
  });

  if (departmentsQuery.isLoading || employeesQuery.isLoading) return <PageSkeleton />;
  if (departmentsQuery.isError) return <ErrorState message={getErrorMessage(departmentsQuery.error)} onRetry={() => void departmentsQuery.refetch()} />;
  if (employeesQuery.isError) return <ErrorState message={getErrorMessage(employeesQuery.error)} onRetry={() => void employeesQuery.refetch()} />;

  return (
    <section aria-label="Departments" className="space-y-5">
      <SectionHeader title="Departments" description="Build reporting lines, assign department heads, and control which teams are active." actionLabel="Add department" onAction={openCreate} actionExpanded={formOpen} />
      {formOpen ? (
        <form onSubmit={save} className="rounded-xl border border-[var(--border)] bg-[var(--surface)] p-5" noValidate>
          <div>
            <h3 className="font-semibold text-[var(--ink)]">{editing ? "Edit department" : "New department"}</h3>
            <p className="mt-1 text-sm text-[var(--muted)]">A parent controls hierarchy only. Employees remain assigned to their immediate department.</p>
          </div>
          {formError ? <div role="alert" className="mt-4 rounded-lg bg-[var(--danger-soft)] px-4 py-3 text-sm text-[var(--danger)]">{formError}</div> : null}
          <div className="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            <Field label="Department name" placeholder="Engineering" error={errors.name?.message} {...register("name")} />
            <Field label="Code" placeholder="ENG" error={errors.code?.message} hint="Unique, 2 to 20 characters." {...register("code")} />
            <SelectField label="Parent department" error={errors.parentDepartmentId?.message} {...register("parentDepartmentId")}>
              <option value="">No parent</option>
              {parentOptions.map((department) => <option value={department.id} key={department.id}>{department.name}</option>)}
            </SelectField>
            <SelectField label="Department head" error={errors.headEmployeeId?.message} disabled={!editing} {...register("headEmployeeId")}>
              <option value="">No department head</option>
              {eligibleHeads.map((employee) => <option value={employee.id} key={employee.id}>{employee.name}</option>)}
            </SelectField>
            <SelectField label="Status" error={errors.status?.message} {...register("status")}>
              <option value="ACTIVE">Active</option>
              <option value="INACTIVE">Inactive</option>
            </SelectField>
          </div>
          {!editing ? <p className="mt-3 text-sm text-[var(--muted)]">Create the department before assigning its head. Only active employees already in the department are eligible.</p> : eligibleHeads.length === 0 ? <p className="mt-3 text-sm text-[var(--muted)]">No active employees are assigned to this department yet.</p> : null}
          <div className="mt-5 flex justify-end gap-2">
            <Button type="button" variant="secondary" onClick={closeForm}>Cancel</Button>
            <Button type="submit" loading={saveMutation.isPending}>{editing ? "Save changes" : "Create department"}</Button>
          </div>
        </form>
      ) : null}
      {departments.length === 0 ? (
        <div className="rounded-xl border border-[var(--border)]"><EmptyState title="No departments yet" description="Add the first department to organize employees and future asset allocation." action={<Button onClick={openCreate}>Add department</Button>} /></div>
      ) : (
        <TableShell label="Departments">
          <thead><tr><TableHead>Department</TableHead><TableHead>Parent</TableHead><TableHead>Head</TableHead><TableHead>Employees</TableHead><TableHead>Status</TableHead><TableHead><span className="sr-only">Actions</span></TableHead></tr></thead>
          <tbody>{departments.map((department) => <tr key={department.id} className="hover:bg-[var(--surface)]">
            <TableCell><span className="font-medium">{department.name}</span><span className="ml-2 font-mono text-xs text-[var(--muted)]">{department.code}</span></TableCell>
            <TableCell>{department.parent?.name ?? "None"}</TableCell>
            <TableCell>{department.head?.name ?? <span className="text-[var(--muted)]">Unassigned</span>}</TableCell>
            <TableCell>{department.employeeCount ?? department._count?.employees ?? 0}</TableCell>
            <TableCell><Badge tone={department.status === "INACTIVE" ? "neutral" : "success"}>{department.status === "INACTIVE" ? "Inactive" : "Active"}</Badge></TableCell>
            <TableCell className="text-right"><div className="flex justify-end gap-1"><Button variant="ghost" className="size-10 p-0" aria-label={`Edit ${department.name}`} onClick={() => openEdit(department)}><Pencil aria-hidden="true" className="size-4" /></Button><Button variant="ghost" className="size-10 p-0 hover:text-[var(--danger)]" aria-label={`Delete ${department.name}`} onClick={() => setDeleting(department)}><Trash2 aria-hidden="true" className="size-4" /></Button></div></TableCell>
          </tr>)}</tbody>
        </TableShell>
      )}
      <ConfirmDialog open={Boolean(deleting)} title="Delete department?" description={`${deleting?.name ?? "This department"} will be permanently removed. Departments with employees or child departments must be reassigned first.`} onClose={() => setDeleting(null)} onConfirm={() => deleting && deleteMutation.mutate(deleting.id)} loading={deleteMutation.isPending} />
    </section>
  );
}
