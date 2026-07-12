import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Pencil, Trash2 } from "lucide-react";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";
import { EmptyState, ErrorState, PageSkeleton } from "../../../components/shared/Feedback";
import { ConfirmDialog } from "../../../components/shared/ConfirmDialog";
import { Badge } from "../../../components/ui/Badge";
import { Button } from "../../../components/ui/Button";
import { Field, SelectField } from "../../../components/ui/Field";
import { getErrorMessage } from "../../../lib/utils";
import { SectionHeader } from "../components/SectionHeader";
import { TableCell, TableHead, TableShell } from "../components/TableShell";
import { orgApi, orgQueryKeys, type Department } from "../api";

const schema = z.object({
  name: z.string().trim().min(2, "Enter a department name."),
  code: z.string().trim().min(2, "Use at least 2 characters.").max(12, "Use 12 characters or fewer.").regex(/^[A-Za-z0-9_-]+$/, "Use letters, numbers, hyphens, or underscores."),
  parentDepartmentId: z.string().optional(),
});
type FormValues = z.infer<typeof schema>;

export function DepartmentsPage() {
  const queryClient = useQueryClient();
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<Department | null>(null);
  const [deleting, setDeleting] = useState<Department | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const query = useQuery({ queryKey: orgQueryKeys.departments, queryFn: orgApi.listDepartments });
  const saveMutation = useMutation({
    mutationFn: ({ id, values }: { id?: string; values: FormValues }) => id
      ? orgApi.updateDepartment(id, { ...values, code: values.code.toUpperCase(), parentDepartmentId: values.parentDepartmentId || null })
      : orgApi.createDepartment({ ...values, code: values.code.toUpperCase(), parentDepartmentId: values.parentDepartmentId || null }),
    onSuccess: async (_, variables) => {
      await queryClient.invalidateQueries({ queryKey: orgQueryKeys.departments });
      toast.success(variables.id ? "Department updated" : "Department created");
    },
  });
  const deleteMutation = useMutation({
    mutationFn: orgApi.deleteDepartment,
    onSuccess: async () => { await queryClient.invalidateQueries({ queryKey: orgQueryKeys.departments }); toast.success("Department deleted"); setDeleting(null); },
    onError: (error) => toast.error(getErrorMessage(error, "Department could not be deleted.")),
  });
  const { register, handleSubmit, reset, formState: { errors } } = useForm<FormValues>({ resolver: zodResolver(schema), defaultValues: { name: "", code: "", parentDepartmentId: "" } });

  const openCreate = () => { setEditing(null); reset({ name: "", code: "", parentDepartmentId: "" }); setFormError(null); setFormOpen(true); };
  const openEdit = (department: Department) => { setEditing(department); reset({ name: department.name, code: department.code, parentDepartmentId: department.parentDepartmentId ?? "" }); setFormError(null); setFormOpen(true); };
  const closeForm = () => { setFormOpen(false); setEditing(null); setFormError(null); };
  const save = handleSubmit(async (values) => {
    setFormError(null);
    try { await saveMutation.mutateAsync({ id: editing?.id, values }); closeForm(); }
    catch (error) { setFormError(getErrorMessage(error, "Department could not be saved.")); }
  });

  if (query.isLoading) return <PageSkeleton />;
  if (query.isError) return <ErrorState message={getErrorMessage(query.error)} onRetry={() => void query.refetch()} />;
  const departments = query.data ?? [];

  return (
    <section aria-label="Departments" className="space-y-5">
      <SectionHeader title="Departments" description="Create the teams used for employee ownership and reporting." actionLabel="Add department" onAction={openCreate} actionExpanded={formOpen} />
      {formOpen ? (
        <form onSubmit={save} className="rounded-xl border border-[var(--border)] bg-[var(--surface)] p-5" noValidate>
          <div className="flex items-start justify-between gap-4"><div><h3 className="font-semibold text-[var(--ink)]">{editing ? "Edit department" : "New department"}</h3><p className="mt-1 text-sm text-[var(--muted)]">Codes appear in compact lists and reports.</p></div></div>
          {formError ? <div role="alert" className="mt-4 rounded-lg bg-[var(--danger-soft)] px-4 py-3 text-sm text-[var(--danger)]">{formError}</div> : null}
          <div className="mt-5 grid gap-4 md:grid-cols-3">
            <Field label="Department name" placeholder="Engineering" error={errors.name?.message} {...register("name")} />
            <Field label="Code" placeholder="ENG" error={errors.code?.message} {...register("code")} />
            <SelectField label="Parent department" error={errors.parentDepartmentId?.message} {...register("parentDepartmentId")}>
              <option value="">No parent</option>
              {departments.filter((item) => item.id !== editing?.id).map((item) => <option value={item.id} key={item.id}>{item.name}</option>)}
            </SelectField>
          </div>
          <div className="mt-5 flex justify-end gap-2"><Button type="button" variant="secondary" onClick={closeForm}>Cancel</Button><Button type="submit" loading={saveMutation.isPending}>{editing ? "Save changes" : "Create department"}</Button></div>
        </form>
      ) : null}
      {departments.length === 0 ? <div className="rounded-xl border border-[var(--border)]"><EmptyState title="No departments yet" description="Add the first department to organize employees and future asset allocation." action={<Button onClick={openCreate}>Add department</Button>} /></div> : (
        <TableShell label="Departments">
          <thead><tr><TableHead>Department</TableHead><TableHead>Code</TableHead><TableHead>Parent</TableHead><TableHead>Employees</TableHead><TableHead>Status</TableHead><TableHead><span className="sr-only">Actions</span></TableHead></tr></thead>
          <tbody>{departments.map((department) => <tr key={department.id} className="hover:bg-[var(--surface)]">
            <TableCell><span className="font-medium">{department.name}</span></TableCell><TableCell><span className="font-mono text-xs">{department.code}</span></TableCell><TableCell>{department.parent?.name ?? "None"}</TableCell><TableCell>{department.employeeCount ?? department._count?.employees ?? 0}</TableCell><TableCell><Badge tone={department.status === "INACTIVE" ? "neutral" : "success"}>{department.status === "INACTIVE" ? "Inactive" : "Active"}</Badge></TableCell>
            <TableCell className="text-right"><div className="flex justify-end gap-1"><Button variant="ghost" className="size-10 p-0" aria-label={`Edit ${department.name}`} onClick={() => openEdit(department)}><Pencil aria-hidden="true" className="size-4" /></Button><Button variant="ghost" className="size-10 p-0 hover:text-[var(--danger)]" aria-label={`Delete ${department.name}`} onClick={() => setDeleting(department)}><Trash2 aria-hidden="true" className="size-4" /></Button></div></TableCell>
          </tr>)}</tbody>
        </TableShell>
      )}
      <ConfirmDialog open={Boolean(deleting)} title="Delete department?" description={`${deleting?.name ?? "This department"} will be permanently removed. Departments with employees or child departments may need to be reassigned first.`} onClose={() => setDeleting(null)} onConfirm={() => deleting && deleteMutation.mutate(deleting.id)} loading={deleteMutation.isPending} />
    </section>
  );
}
