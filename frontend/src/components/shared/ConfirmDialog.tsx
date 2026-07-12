import { useEffect, useRef } from "react";
import { Button } from "../ui/Button";

export function ConfirmDialog({ open, title, description, confirmLabel = "Delete", loading, onConfirm, onClose }: {
  open: boolean;
  title: string;
  description: string;
  confirmLabel?: string;
  loading?: boolean;
  onConfirm: () => void;
  onClose: () => void;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    if (open && !dialog.open) dialog.showModal();
    if (!open && dialog.open) dialog.close();
  }, [open]);

  return (
    <dialog ref={ref} onCancel={onClose} onClose={onClose} className="m-auto w-[calc(100%-40px)] max-w-md rounded-xl border border-[var(--border)] bg-white p-0 text-[var(--ink)] shadow-[0_6px_8px_color-mix(in_oklch,var(--ink)_10%,transparent)] backdrop:bg-[color-mix(in_oklch,var(--ink)_36%,transparent)]">
      <div className="p-6">
        <h2 className="text-xl font-semibold">{title}</h2>
        <p className="mt-2 text-sm leading-6 text-[var(--muted)]">{description}</p>
        <div className="mt-6 flex justify-end gap-2">
          <Button variant="secondary" onClick={onClose} disabled={loading}>Cancel</Button>
          <Button variant="danger" onClick={onConfirm} loading={loading}>{confirmLabel}</Button>
        </div>
      </div>
    </dialog>
  );
}
