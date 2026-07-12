import { zodResolver } from "@hookform/resolvers/zod";
import { AlertOctagon, X } from "lucide-react";
import { useEffect, useRef } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";

import { Button } from "../../../components/ui/Button";
import { Field } from "../../../components/ui/Field";
import type { Booking, BookingConflictDetails } from "../api";
import {
  datetimeLocalValueToIso,
  formatTimeRange,
  toDatetimeLocalValue,
} from "../utils";

const schema = z
  .object({
    startTime: z.string().min(1, "Choose a start time."),
    endTime: z.string().min(1, "Choose an end time."),
    purpose: z.string().trim().min(3, "Say what this booking is for."),
  })
  .refine((input) => new Date(input.endTime).getTime() > new Date(input.startTime).getTime(), {
    message: "End time must be after start time.",
    path: ["endTime"],
  });

type FormValues = z.infer<typeof schema>;

type Props = {
  open: boolean;
  booking: Booking | null;
  onClose: () => void;
  onSubmit: (values: { startTime: string; endTime: string; purpose: string }) => void | Promise<unknown>;
  submitting: boolean;
  conflict: BookingConflictDetails["conflictingBooking"] | null;
  onClearConflict: () => void;
};

export function RescheduleDialog({
  open,
  booking,
  onClose,
  onSubmit,
  submitting,
  conflict,
  onClearConflict,
}: Props) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { startTime: "", endTime: "", purpose: "" },
  });

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (open && booking) {
      reset({
        startTime: toDatetimeLocalValue(new Date(booking.startTime)),
        endTime: toDatetimeLocalValue(new Date(booking.endTime)),
        purpose: booking.purpose,
      });
      onClearConflict();
      if (!dialog.open) dialog.showModal();
    } else if (!open && dialog.open) {
      dialog.close();
    }
  }, [open, booking, reset, onClearConflict]);

  const submit = handleSubmit(async (values) => {
    await onSubmit({
      startTime: datetimeLocalValueToIso(values.startTime),
      endTime: datetimeLocalValueToIso(values.endTime),
      purpose: values.purpose,
    });
  });

  return (
    <dialog
      ref={dialogRef}
      onCancel={onClose}
      onClose={onClose}
      className="m-auto w-[calc(100%-40px)] max-w-lg rounded-xl border border-[var(--border)] bg-white p-0 text-[var(--ink)] shadow-[0_8px_24px_color-mix(in_oklch,var(--ink)_12%,transparent)] backdrop:bg-[color-mix(in_oklch,var(--ink)_36%,transparent)]"
    >
      <form onSubmit={submit} className="flex flex-col gap-5 p-6" noValidate>
        <header className="flex items-start justify-between gap-4">
          <div>
            <h2 className="text-xl font-semibold">Reschedule booking</h2>
            <p className="mt-1 text-sm text-[var(--muted)]">
              {booking ? `${booking.asset.assetTag} · ${booking.asset.name}` : ""}
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
            className="flex gap-3 rounded-lg border border-[var(--danger)] bg-[var(--danger-soft)] p-4 text-sm"
          >
            <AlertOctagon aria-hidden="true" className="mt-0.5 size-5 shrink-0 text-[var(--danger)]" strokeWidth={1.75} />
            <div>
              <p className="font-semibold text-[var(--danger)]">Time slot conflict</p>
              <p className="mt-1">
                Overlaps with {conflict.employee.name}'s booking{" "}
                <span className="font-medium">{formatTimeRange(conflict.startTime, conflict.endTime)}</span>.
              </p>
            </div>
          </div>
        ) : null}

        <div className="grid gap-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Starts" type="datetime-local" error={errors.startTime?.message} {...register("startTime")} />
            <Field label="Ends" type="datetime-local" error={errors.endTime?.message} {...register("endTime")} />
          </div>
          <Field label="Purpose" error={errors.purpose?.message} {...register("purpose")} />
        </div>

        <footer className="flex justify-end gap-2 border-t border-[var(--border)] pt-4">
          <Button type="button" variant="secondary" onClick={onClose} disabled={submitting}>
            Cancel
          </Button>
          <Button type="submit" loading={submitting}>
            Save changes
          </Button>
        </footer>
      </form>
    </dialog>
  );
}
