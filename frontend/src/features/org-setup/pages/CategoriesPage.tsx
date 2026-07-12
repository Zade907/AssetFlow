import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Braces, Plus, Trash2, Pencil } from "lucide-react";
import { useState } from "react";
import { useFieldArray, useForm } from "react-hook-form";
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
import { orgApi, orgQueryKeys, type AssetCategory, type CustomFieldDefinition, type CustomFieldType, type EntityStatus } from "../api";

const customFieldSchema = z.object({
  key: z.string().trim().min(1, "Enter a field key.").max(50).regex(/^[a-z][a-zA-Z0-9_]*$/, "Use camelCase, starting with a lowercase letter."),
  label: z.string().trim().min(1, "Enter a field label.").max(80),
  type: z.enum(["text", "number", "date", "boolean"]),
  required: z.boolean(),
});
const schema = z.object({
  name: z.string().trim().min(2, "Enter a category name.").max(120),
  description: z.string().trim().max(1_000, "Use 1,000 characters or fewer.").optional(),
  status: z.enum(["ACTIVE", "INACTIVE"]),
  customFields: z.array(customFieldSchema).max(20, "A category can define at most 20 custom fields."),
}).superRefine((values, context) => {
  const seen = new Set<string>();
  values.customFields.forEach((field, index) => {
    if (seen.has(field.key)) context.addIssue({ code: "custom", path: ["customFields", index, "key"], message: "Field keys must be unique." });
    seen.add(field.key);
  });
});
type FormValues = z.infer<typeof schema>;

function toCustomFields(fields: FormValues["customFields"]): Record<string, CustomFieldDefinition> | null {
  if (fields.length === 0) return null;
  return Object.fromEntries(fields.map(({ key, label, type, required }) => [key, { label, type, required }]));
}

function fromCustomFields(fields: AssetCategory["customFields"]): FormValues["customFields"] {
  return Object.entries(fields ?? {}).map(([key, definition]) => ({ key, ...definition }));
}

export function CategoriesPage() {
  const queryClient = useQueryClient();
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<AssetCategory | null>(null);
  const [deleting, setDeleting] = useState<AssetCategory | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const query = useQuery({ queryKey: orgQueryKeys.categories, queryFn: orgApi.listCategories });
  const saveMutation = useMutation({
    mutationFn: ({ id, values }: { id?: string; values: FormValues }) => {
      const payload = {
        name: values.name,
        description: values.description || null,
        status: values.status as EntityStatus,
        customFields: toCustomFields(values.customFields),
      };
      return id ? orgApi.updateCategory(id, payload) : orgApi.createCategory(payload);
    },
    onSuccess: async (_, variables) => {
      await queryClient.invalidateQueries({ queryKey: orgQueryKeys.categories });
      toast.success(variables.id ? "Category updated" : "Category created");
    },
  });
  const deleteMutation = useMutation({
    mutationFn: orgApi.deleteCategory,
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: orgQueryKeys.categories });
      toast.success("Category deleted");
      setDeleting(null);
    },
    onError: (error) => toast.error(getErrorMessage(error, "Category could not be deleted.")),
  });
  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { name: "", description: "", status: "ACTIVE", customFields: [] },
  });
  const { fields, append, remove } = useFieldArray({ control: form.control, name: "customFields" });

  const openCreate = () => {
    setEditing(null);
    form.reset({ name: "", description: "", status: "ACTIVE", customFields: [] });
    setFormError(null);
    setFormOpen(true);
  };
  const openEdit = (category: AssetCategory) => {
    setEditing(category);
    form.reset({ name: category.name, description: category.description ?? "", status: category.status, customFields: fromCustomFields(category.customFields) });
    setFormError(null);
    setFormOpen(true);
  };
  const closeForm = () => { setFormOpen(false); setEditing(null); setFormError(null); };
  const save = form.handleSubmit(async (values) => {
    setFormError(null);
    try {
      await saveMutation.mutateAsync({ id: editing?.id, values });
      closeForm();
    } catch (error) {
      setFormError(getErrorMessage(error, "Category could not be saved."));
    }
  });

  if (query.isLoading) return <PageSkeleton />;
  if (query.isError) return <ErrorState message={getErrorMessage(query.error)} onRetry={() => void query.refetch()} />;
  const categories = query.data ?? [];

  return (
    <section aria-label="Asset categories" className="space-y-5">
      <SectionHeader title="Asset categories" description="Define asset types and the structured details captured for each one." actionLabel="Add category" onAction={openCreate} actionExpanded={formOpen} />
      {formOpen ? (
        <form onSubmit={save} className="rounded-xl border border-[var(--border)] bg-[var(--surface)] p-5" noValidate>
          <h3 className="font-semibold text-[var(--ink)]">{editing ? "Edit category" : "New category"}</h3>
          <p className="mt-1 text-sm text-[var(--muted)]">Custom fields become the specification template for every asset in this category.</p>
          {formError ? <div role="alert" className="mt-4 rounded-lg bg-[var(--danger-soft)] px-4 py-3 text-sm text-[var(--danger)]">{formError}</div> : null}
          <div className="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-[0.8fr_1.4fr_0.6fr]">
            <Field label="Category name" placeholder="Electronics" error={form.formState.errors.name?.message} {...form.register("name")} />
            <Field label="Description" placeholder="Laptops, monitors, and related equipment" error={form.formState.errors.description?.message} {...form.register("description")} />
            <SelectField label="Status" error={form.formState.errors.status?.message} {...form.register("status")}><option value="ACTIVE">Active</option><option value="INACTIVE">Inactive</option></SelectField>
          </div>

          <div className="mt-6 border-t border-[var(--border)] pt-5">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div><h4 className="text-sm font-semibold text-[var(--ink)]">Custom fields</h4><p className="mt-1 text-sm text-[var(--muted)]">Use stable camelCase keys so later asset data remains portable.</p></div>
              <Button type="button" variant="secondary" onClick={() => append({ key: "", label: "", type: "text", required: false }, { shouldFocus: true })}><Plus aria-hidden="true" className="size-4" />Add custom field</Button>
            </div>
            {fields.length === 0 ? (
              <div className="mt-4 flex items-center gap-3 rounded-lg border border-dashed border-[var(--border)] bg-white px-4 py-4 text-sm text-[var(--muted)]"><Braces aria-hidden="true" className="size-5" />No extra asset details are required for this category.</div>
            ) : (
              <div className="mt-4 space-y-3">
                {fields.map((field, index) => {
                  const fieldErrors = form.formState.errors.customFields?.[index];
                  return <fieldset key={field.id} className="grid gap-3 rounded-lg border border-[var(--border)] bg-white p-4 md:grid-cols-[1fr_1fr_160px_auto]">
                    <legend className="sr-only">Custom field {index + 1}</legend>
                    <Field label="Label" placeholder="Warranty months" error={fieldErrors?.label?.message} {...form.register(`customFields.${index}.label`)} />
                    <Field label="Field key" placeholder="warrantyMonths" error={fieldErrors?.key?.message} {...form.register(`customFields.${index}.key`)} />
                    <SelectField label="Data type" error={fieldErrors?.type?.message} {...form.register(`customFields.${index}.type`)}>
                      <option value="text">Text</option><option value="number">Number</option><option value="date">Date</option><option value="boolean">Yes / No</option>
                    </SelectField>
                    <div className="flex items-end justify-between gap-3 md:flex-col md:items-stretch">
                      <label className="flex min-h-11 items-center gap-2 text-sm font-medium text-[var(--ink)]"><input type="checkbox" className="size-4 accent-[var(--primary)]" {...form.register(`customFields.${index}.required`)} />Required</label>
                      <Button type="button" variant="ghost" className="size-10 p-0 hover:text-[var(--danger)]" aria-label={`Remove custom field ${index + 1}`} onClick={() => remove(index)}><Trash2 aria-hidden="true" className="size-4" /></Button>
                    </div>
                  </fieldset>;
                })}
              </div>
            )}
          </div>
          <div className="mt-6 flex justify-end gap-2"><Button type="button" variant="secondary" onClick={closeForm}>Cancel</Button><Button type="submit" loading={saveMutation.isPending}>{editing ? "Save changes" : "Create category"}</Button></div>
        </form>
      ) : null}
      {categories.length === 0 ? (
        <div className="rounded-xl border border-[var(--border)]"><EmptyState title="No categories yet" description="Add a category before assets are registered." action={<Button onClick={openCreate}>Add category</Button>} /></div>
      ) : (
        <TableShell label="Asset categories">
          <thead><tr><TableHead>Category</TableHead><TableHead>Description</TableHead><TableHead>Custom fields</TableHead><TableHead>Assets</TableHead><TableHead>Status</TableHead><TableHead><span className="sr-only">Actions</span></TableHead></tr></thead>
          <tbody>{categories.map((category) => {
            const customFieldCount = Object.keys(category.customFields ?? {}).length;
            return <tr key={category.id} className="hover:bg-[var(--surface)]"><TableCell><span className="font-medium">{category.name}</span></TableCell><TableCell className="max-w-sm text-[var(--muted)]">{category.description || "No description"}</TableCell><TableCell>{customFieldCount === 0 ? <span className="text-[var(--muted)]">None</span> : `${customFieldCount} field${customFieldCount === 1 ? "" : "s"}`}</TableCell><TableCell>{category.assetCount ?? category._count?.assets ?? 0}</TableCell><TableCell><Badge tone={category.status === "INACTIVE" ? "neutral" : "success"}>{category.status === "INACTIVE" ? "Inactive" : "Active"}</Badge></TableCell><TableCell className="text-right"><div className="flex justify-end gap-1"><Button variant="ghost" className="size-10 p-0" aria-label={`Edit ${category.name}`} onClick={() => openEdit(category)}><Pencil aria-hidden="true" className="size-4" /></Button><Button variant="ghost" className="size-10 p-0 hover:text-[var(--danger)]" aria-label={`Delete ${category.name}`} onClick={() => setDeleting(category)}><Trash2 aria-hidden="true" className="size-4" /></Button></div></TableCell></tr>;
          })}</tbody>
        </TableShell>
      )}
      <ConfirmDialog open={Boolean(deleting)} title="Delete category?" description={`${deleting?.name ?? "This category"} will be permanently removed. Categories used by assets must be reassigned first.`} onClose={() => setDeleting(null)} onConfirm={() => deleting && deleteMutation.mutate(deleting.id)} loading={deleteMutation.isPending} />
    </section>
  );
}
