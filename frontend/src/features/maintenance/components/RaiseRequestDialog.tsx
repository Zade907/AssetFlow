import { zodResolver } from "@hookform/resolvers/zod";
import { X } from "lucide-react";
import { useEffect, useRef } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";

import { Button } from "../../../components/ui/Button";
import { Field, SelectField } from "../../../components/ui/Field";
import type { BookableResource } from "../../bookings/api";
import type { MaintenancePriority } from "../api";

const schema = z.object({
  assetId: z.string().min(1, "Pick the asset that needs attention."),
  description: z.string().trim().min(5, "Describe the issue in at least 5 characters."),
  priority: z.enum(["LOW", "MEDIUM", "HIGH", "CRITICAL"]),
  photoUrl: z.union([z.string().url("Provide a valid URL."), z.literal("")]).optional(),
});

type FormValues = z.infer<typeof schema>;

const priorityOptions: Array<{ value: MaintenancePriority; label: string; hint: string }> = [
  { value: "LOW", label: "Low", hint: "No production impact." },
  { value: "MEDIUM", label: "Medium", hint: "Some disruption, can wait." },
  { value: "HIGH", label: "High", hint: "Blocks the current user." },
  { value: "CRITICAL", label: "Critical", hint: "Safety or organization-wide risk." },
];

type Props = {
  open: boolean;
  onClose: () => void;
  assets: BookableResource[];
  submitting: boolean;
  onSubmit: (values: {
    assetId: string;
    description: string;
    priority: MaintenancePriority;
    photoUrl?: string;
  }) => void | Promise<unknown>;
};

export function RaiseRequestDialog({ open, onClose, assets, submitting, onSubmit }: Props) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { assetId: "", description: "", priority: "MEDIUM", photoUrl: "" },
  });

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (open) {
      reset({ assetId: "", description: "", priority: "MEDIUM", photoUrl: "" });
      if (!dialog.open) dialog.showModal();
    } else if (dialog.open) {
      dialog.close();
    }
  }, [open, reset]);

  const submit = handleSubmit(async (values) => {
    await onSubmit({
      assetId: values.assetId,
      description: values.description,
      priority: values.priority,
      photoUrl: values.photoUrl ? values.photoUrl : undefined,
    });
  });

  return (
    <dialog
      ref={dialogRef}
      onCancel={onClose}
      onClose={onClose}
      className="m-auto w-[calc(100%-40px)] max-w-xl rounded-xl border border-[var(--border)] bg-white p-0 text-[var(--ink)] shadow-[0_8px_24px_color-mix(in_oklch,var(--ink)_12%,transparent)] backdrop:bg-[color-mix(in_oklch,var(--ink)_36%,transparent)]"
    >
      <form onSubmit={submit} className="flex flex-col gap-5 p-6" noValidate>
        <header className="flex items-start justify-between gap-4">
          <div>
            <h2 className="text-xl font-semibold">Raise a maintenance request</h2>
            <p className="mt-1 text-sm text-[var(--muted)]">
              An asset manager reviews every request before the asset changes state.
            </p>
          </div>
          <button
            type="button"
            aria-label="Close"
            onClick={onClose}
            className="grid size-9 place-items-center rounded-lg text-[var(--muted)] hover:bg-[var(--surface-strong)]"
          >
            <X aria-hidden="true" className="size-5" strokeWidth={1.75} />
          </button>
        </header>

        <div className="grid gap-4">
          <SelectField label="Asset" error={errors.assetId?.message} {...register("assetId")}>
            <option value="">Choose an asset</option>
            {assets.map((asset) => (
              <option key={asset.id} value={asset.id}>
                {asset.assetTag} · {asset.name} — {asset.location}
              </option>
            ))}
          </SelectField>

          <div className="grid gap-2">
            <label className="text-sm font-medium" htmlFor="issue-description">
              Describe the issue
            </label>
            <textarea
              id="issue-description"
              rows={4}
              placeholder="What's wrong? How is it interfering with normal use?"
              className="min-h-24 w-full rounded-lg border border-[var(--border)] bg-white px-3 py-2 text-sm text-[var(--ink)] focus-visible:border-[var(--primary)]"
              {...register("description")}
            />
            {errors.description ? (
              <p role="alert" className="text-sm text-[var(--danger)]">
                {errors.description.message}
              </p>
            ) : null}
          </div>

          <fieldset className="grid gap-2">
            <legend className="text-sm font-medium text-[var(--ink)]">Priority</legend>
            <div className="grid gap-2 sm:grid-cols-2">
              {priorityOptions.map((option) => (
                <label
                  key={option.value}
                  className="flex cursor-pointer items-start gap-3 rounded-lg border border-[var(--border)] bg-white p-3 has-[input:checked]:border-[var(--primary)] has-[input:checked]:bg-[var(--primary-soft)]"
                >
                  <input
                    type="radio"
                    value={option.value}
                    className="mt-1 accent-[var(--primary)]"
                    {...register("priority")}
                  />
                  <span className="min-w-0">
                    <span className="block text-sm font-medium text-[var(--ink)]">{option.label}</span>
                    <span className="block text-xs text-[var(--muted)]">{option.hint}</span>
                  </span>
                </label>
              ))}
            </div>
          </fieldset>

          <Field
            label="Photo URL (optional)"
            type="url"
            placeholder="https://…"
            hint="Paste a link to a photo of the issue. File upload is coming in Phase 4."
            error={errors.photoUrl?.message}
            {...register("photoUrl")}
          />
        </div>

        <footer className="flex justify-end gap-2 border-t border-[var(--border)] pt-4">
          <Button type="button" variant="secondary" onClick={onClose} disabled={submitting}>
            Cancel
          </Button>
          <Button type="submit" loading={submitting}>
            Submit request
          </Button>
        </footer>
      </form>
    </dialog>
  );
}
