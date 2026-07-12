import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Pencil, Trash2 } from "lucide-react";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";
import { ConfirmDialog } from "../../../components/shared/ConfirmDialog";
import { EmptyState, ErrorState, PageSkeleton } from "../../../components/shared/Feedback";
import { Badge } from "../../../components/ui/Badge";
import { Button } from "../../../components/ui/Button";
import { Field } from "../../../components/ui/Field";
import { getErrorMessage } from "../../../lib/utils";
import { SectionHeader } from "../components/SectionHeader";
import { TableCell, TableHead, TableShell } from "../components/TableShell";
import { orgApi, orgQueryKeys, type AssetCategory } from "../api";

const schema = z.object({ name: z.string().trim().min(2, "Enter a category name."), description: z.string().trim().max(240, "Use 240 characters or fewer.").optional() });
type FormValues = z.infer<typeof schema>;

export function CategoriesPage() {
  const queryClient = useQueryClient();
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<AssetCategory | null>(null);
  const [deleting, setDeleting] = useState<AssetCategory | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const query = useQuery({ queryKey: orgQueryKeys.categories, queryFn: orgApi.listCategories });
  const saveMutation = useMutation({ mutationFn: ({ id, values }: { id?: string; values: FormValues }) => id ? orgApi.updateCategory(id, { ...values, description: values.description || null }) : orgApi.createCategory({ ...values, description: values.description || null }), onSuccess: async (_, variables) => { await queryClient.invalidateQueries({ queryKey: orgQueryKeys.categories }); toast.success(variables.id ? "Category updated" : "Category created"); } });
  const deleteMutation = useMutation({ mutationFn: orgApi.deleteCategory, onSuccess: async () => { await queryClient.invalidateQueries({ queryKey: orgQueryKeys.categories }); toast.success("Category deleted"); setDeleting(null); }, onError: (error) => toast.error(getErrorMessage(error, "Category could not be deleted.")) });
  const { register, handleSubmit, reset, formState: { errors } } = useForm<FormValues>({ resolver: zodResolver(schema), defaultValues: { name: "", description: "" } });
  const openCreate = () => { setEditing(null); reset({ name: "", description: "" }); setFormError(null); setFormOpen(true); };
  const openEdit = (item: AssetCategory) => { setEditing(item); reset({ name: item.name, description: item.description ?? "" }); setFormError(null); setFormOpen(true); };
  const closeForm = () => { setFormOpen(false); setEditing(null); setFormError(null); };
  const save = handleSubmit(async (values) => { setFormError(null); try { await saveMutation.mutateAsync({ id: editing?.id, values }); closeForm(); } catch (error) { setFormError(getErrorMessage(error, "Category could not be saved.")); } });

  if (query.isLoading) return <PageSkeleton />;
  if (query.isError) return <ErrorState message={getErrorMessage(query.error)} onRetry={() => void query.refetch()} />;
  const categories = query.data ?? [];
  return (
    <section aria-label="Asset categories" className="space-y-5">
      <SectionHeader title="Asset categories" description="Define the common types used to classify assets and reporting." actionLabel="Add category" onAction={openCreate} actionExpanded={formOpen} />
      {formOpen ? <form onSubmit={save} className="rounded-xl border border-[var(--border)] bg-[var(--surface)] p-5" noValidate>
        <h3 className="font-semibold text-[var(--ink)]">{editing ? "Edit category" : "New category"}</h3><p className="mt-1 text-sm text-[var(--muted)]">Keep names broad enough to reuse across departments.</p>
        {formError ? <div role="alert" className="mt-4 rounded-lg bg-[var(--danger-soft)] px-4 py-3 text-sm text-[var(--danger)]">{formError}</div> : null}
        <div className="mt-5 grid gap-4 md:grid-cols-[minmax(220px,0.8fr)_minmax(320px,1.2fr)]"><Field label="Category name" placeholder="Electronics" error={errors.name?.message} {...register("name")} /><Field label="Description" placeholder="Laptops, monitors, and related equipment" error={errors.description?.message} {...register("description")} /></div>
        <div className="mt-5 flex justify-end gap-2"><Button type="button" variant="secondary" onClick={closeForm}>Cancel</Button><Button type="submit" loading={saveMutation.isPending}>{editing ? "Save changes" : "Create category"}</Button></div>
      </form> : null}
      {categories.length === 0 ? <div className="rounded-xl border border-[var(--border)]"><EmptyState title="No categories yet" description="Add a category before assets are registered." action={<Button onClick={openCreate}>Add category</Button>} /></div> : <TableShell label="Asset categories">
        <thead><tr><TableHead>Category</TableHead><TableHead>Description</TableHead><TableHead>Assets</TableHead><TableHead>Status</TableHead><TableHead><span className="sr-only">Actions</span></TableHead></tr></thead>
        <tbody>{categories.map((category) => <tr key={category.id} className="hover:bg-[var(--surface)]"><TableCell><span className="font-medium">{category.name}</span></TableCell><TableCell className="max-w-sm text-[var(--muted)]">{category.description || "No description"}</TableCell><TableCell>{category.assetCount ?? category._count?.assets ?? 0}</TableCell><TableCell><Badge tone={category.status === "INACTIVE" ? "neutral" : "success"}>{category.status === "INACTIVE" ? "Inactive" : "Active"}</Badge></TableCell><TableCell className="text-right"><div className="flex justify-end gap-1"><Button variant="ghost" className="size-10 p-0" aria-label={`Edit ${category.name}`} onClick={() => openEdit(category)}><Pencil aria-hidden="true" className="size-4" /></Button><Button variant="ghost" className="size-10 p-0 hover:text-[var(--danger)]" aria-label={`Delete ${category.name}`} onClick={() => setDeleting(category)}><Trash2 aria-hidden="true" className="size-4" /></Button></div></TableCell></tr>)}</tbody>
      </TableShell>}
      <ConfirmDialog open={Boolean(deleting)} title="Delete category?" description={`${deleting?.name ?? "This category"} will be permanently removed. Categories already used by assets may need those records reassigned first.`} onClose={() => setDeleting(null)} onConfirm={() => deleting && deleteMutation.mutate(deleting.id)} loading={deleteMutation.isPending} />
    </section>
  );
}
