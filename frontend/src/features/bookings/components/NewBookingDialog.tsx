import { zodResolver } from "@hookform/resolvers/zod";
import { AlertOctagon, X } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";

import { Badge } from "../../../components/ui/Badge";
import { Button } from "../../../components/ui/Button";
import { Field, SelectField } from "../../../components/ui/Field";
import type { BookableResource, BookingConflictDetails } from "../api";
import {
  addHours,
  datetimeLocalValueToIso,
  formatTimeRange,
  nextHour,
  toDatetimeLocalValue,
} from "../utils";

const schema = z
  .object({
    assetId: z.string().min(1, "Choose a resource to book."),
    purpose: z.string().trim().min(3, "Say what this booking is for."),
    startTime: z.string().min(1, "Choose a start time."),
    endTime: z.string().min(1, "Choose an end time."),
  })
  .refine((input) => new Date(input.endTime).getTime() > new Date(input.startTime).getTime(), {
    message: "End time must be after start time.",
    path: ["endTime"],
  });

type FormValues = z.infer<typeof schema>;

type Props = {
  open: boolean;
  onClose: () => void;
  resources: BookableResource[];
  defaultResourceId?: string;
  submitting: boolean;
  conflict: BookingConflictDetails["conflictingBooking"] | null;
  onSubmit: (values: {
    assetId: string;
    purpose: string;
    startTime: string;
    endTime: string;
  }) => void | Promise<unknown>;
  onClearConflict: () => void;
};

export function NewBookingDialog({
  open,
  onClose,
  resources,
  defaultResourceId,
  submitting,
  conflict,
  onSubmit,
  onClearConflict,
}: Props) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const defaults = useMemo(() => {
    const start = nextHour();
    const end = addHours(start, 1);
    return {
      assetId: defaultResourceId ?? "",
      purpose: "",
      startTime: toDatetimeLocalValue(start),
      endTime: toDatetimeLocalValue(end),
    } satisfies FormValues;
  }, [defaultResourceId]);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: defaults,
  });

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (open && !dialog.open) {
      reset(defaults);
      onClearConflict();
      dialog.showModal();
    }
    if (!open && dialog.open) dialog.close();
  }, [open, reset, defaults, onClearConflict]);

  useEffect(() => {
    if (!open) return;
    reset(defaults);
  }, [defaultResourceId, open, defaults, reset]);

  const submit = handleSubmit(async (values) => {
    await onSubmit({
      assetId: values.assetId,
      purpose: values.purpose,
      startTime: datetimeLocalValueToIso(values.startTime),
      endTime: datetimeLocalValueToIso(values.endTime),
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
            <h2 className="text-xl font-semibold">Book a resource</h2>
            <p className="mt-1 text-sm text-[var(--muted)]">
              Two people can't book the same resource at overlapping times.
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

        {conflict ? (
          <div
            role="alert"
            className="flex gap-3 rounded-lg border border-[var(--danger)] bg-[var(--danger-soft)] p-4"
          >
            <AlertOctagon
              aria-hidden="true"
              className="mt-0.5 size-5 shrink-0 text-[var(--danger)]"
              strokeWidth={1.75}
            />
            <div className="min-w-0 text-sm text-[var(--ink)]">
              <p className="font-semibold text-[var(--danger)]">Time slot conflict</p>
              <p className="mt-1">
                {conflict.asset.name} is already booked
                {" "}
                <span className="font-medium">
                  {formatTimeRange(conflict.startTime, conflict.endTime)}
                </span>
                {" "}by {conflict.employee.name}.
              </p>
              <p className="mt-1 text-[var(--muted)]">
                Purpose: {conflict.purpose}. Pick a different time or start after
                {" "}
                {new Date(conflict.endTime).toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" })}
                .
              </p>
            </div>
          </div>
        ) : null}

        <div className="grid gap-4">
          <SelectField
            label="Resource"
            error={errors.assetId?.message}
            {...register("assetId")}
          >
            <option value="">Select a bookable resource</option>
            {resources.map((resource) => (
              <option key={resource.id} value={resource.id}>
                {resource.assetTag} · {resource.name} — {resource.location}
              </option>
            ))}
          </SelectField>

          <div className="grid gap-4 sm:grid-cols-2">
            <Field
              label="Starts"
              type="datetime-local"
              error={errors.startTime?.message}
              {...register("startTime")}
            />
            <Field
              label="Ends"
              type="datetime-local"
              error={errors.endTime?.message}
              {...register("endTime")}
            />
          </div>

          <Field
            label="Purpose"
            placeholder="Sprint planning · Team Kestrel"
            error={errors.purpose?.message}
            {...register("purpose")}
          />
        </div>

        <footer className="flex items-center justify-between gap-3 border-t border-[var(--border)] pt-4">
          <p className="text-xs text-[var(--muted)]">
            <Badge tone="info">Overlap validated</Badge>{" "}
            <span className="ml-2 align-middle">Exact abutting slots are allowed.</span>
          </p>
          <div className="flex gap-2">
            <Button type="button" variant="secondary" onClick={onClose} disabled={submitting}>
              Cancel
            </Button>
            <Button type="submit" loading={submitting}>
              Book resource
            </Button>
          </div>
        </footer>
      </form>
    </dialog>
  );
}
