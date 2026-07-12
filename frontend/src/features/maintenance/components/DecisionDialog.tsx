import { AlertOctagon, CheckCircle2, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";

import { Button } from "../../../components/ui/Button";
import { Badge } from "../../../components/ui/Badge";
import type { MaintenanceRequest } from "../api";
import { priorityLabel, priorityTone } from "../utils";

type Mode = "approve" | "reject" | "resolve";

type Props = {
  open: boolean;
  mode: Mode;
  request: MaintenanceRequest | null;
  submitting: boolean;
  onClose: () => void;
  onConfirm: (payload: { notes?: string; reason?: string; resolutionNotes?: string }) => void;
};

const modeCopy: Record<
  Mode,
  {
    title: string;
    description: string;
    banner: { icon: typeof CheckCircle2; className: string; text: string };
    inputLabel: string;
    inputRequired: boolean;
    confirmLabel: string;
    confirmVariant: "primary" | "danger";
  }
> = {
  approve: {
    title: "Approve maintenance request",
    description:
      "Approving flips the asset status to Under Maintenance and removes it from allocation options.",
    banner: {
      icon: CheckCircle2,
      className: "border-[var(--info)] bg-[var(--info-soft)] text-[var(--info)]",
      text: "Asset will move to Under Maintenance.",
    },
    inputLabel: "Notes for the technician (optional)",
    inputRequired: false,
    confirmLabel: "Approve request",
    confirmVariant: "primary",
  },
  reject: {
    title: "Reject maintenance request",
    description: "Rejecting closes the request without any asset status change.",
    banner: {
      icon: AlertOctagon,
      className: "border-[var(--danger)] bg-[var(--danger-soft)] text-[var(--danger)]",
      text: "The requester will be notified with your reason.",
    },
    inputLabel: "Reason for rejection",
    inputRequired: true,
    confirmLabel: "Reject request",
    confirmVariant: "danger",
  },
  resolve: {
    title: "Resolve maintenance request",
    description:
      "Resolving marks the request done. The asset returns to Available (or Allocated if a holder is on record).",
    banner: {
      icon: CheckCircle2,
      className:
        "border-[color-mix(in_oklch,var(--success)_60%,var(--border))] bg-[var(--success-soft)] text-[color-mix(in_oklch,var(--success)_60%,black)]",
      text: "Asset status will restore automatically.",
    },
    inputLabel: "Resolution notes",
    inputRequired: true,
    confirmLabel: "Mark resolved",
    confirmVariant: "primary",
  },
};

export function DecisionDialog({ open, mode, request, submitting, onClose, onConfirm }: Props) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const [value, setValue] = useState("");
  const [error, setError] = useState<string | null>(null);

  const copy = modeCopy[mode];

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (open) {
      setValue("");
      setError(null);
      if (!dialog.open) dialog.showModal();
    } else if (dialog.open) {
      dialog.close();
    }
  }, [open, mode]);

  const submit = () => {
    if (copy.inputRequired && value.trim().length < 3) {
      setError("Add at least a short note before continuing.");
      return;
    }
    if (mode === "approve") onConfirm({ notes: value.trim() || undefined });
    else if (mode === "reject") onConfirm({ reason: value.trim() });
    else onConfirm({ resolutionNotes: value.trim() });
  };

  const BannerIcon = copy.banner.icon;

  return (
    <dialog
      ref={dialogRef}
      onCancel={onClose}
      onClose={onClose}
      className="m-auto w-[calc(100%-40px)] max-w-lg rounded-xl border border-[var(--border)] bg-white p-0 text-[var(--ink)] shadow-[0_8px_24px_color-mix(in_oklch,var(--ink)_12%,transparent)] backdrop:bg-[color-mix(in_oklch,var(--ink)_36%,transparent)]"
    >
      <div className="flex flex-col gap-5 p-6">
        <header className="flex items-start justify-between gap-4">
          <div>
            <h2 className="text-xl font-semibold">{copy.title}</h2>
            <p className="mt-1 text-sm text-[var(--muted)]">{copy.description}</p>
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

        {request ? (
          <section className="rounded-lg border border-[var(--border)] bg-[var(--surface)] p-4">
            <div className="flex items-center justify-between gap-3">
              <p className="text-xs font-mono text-[var(--muted)]">{request.asset.assetTag}</p>
              <Badge tone={priorityTone[request.priority]}>{priorityLabel[request.priority]}</Badge>
            </div>
            <p className="mt-1 text-sm font-semibold text-[var(--ink)]">{request.asset.name}</p>
            <p className="mt-2 text-sm text-[var(--ink)]">{request.description}</p>
            <p className="mt-2 text-xs text-[var(--muted)]">
              Raised by {request.raisedBy.name}
              {request.raisedBy.department ? ` · ${request.raisedBy.department.name}` : ""}
            </p>
          </section>
        ) : null}

        <div className={`flex gap-3 rounded-lg border p-3 text-sm ${copy.banner.className}`}>
          <BannerIcon aria-hidden="true" className="mt-0.5 size-5 shrink-0" strokeWidth={1.75} />
          <p>{copy.banner.text}</p>
        </div>

        <div className="grid gap-2">
          <label className="text-sm font-medium" htmlFor="decision-notes">
            {copy.inputLabel}
          </label>
          <textarea
            id="decision-notes"
            rows={4}
            value={value}
            onChange={(event) => {
              setValue(event.target.value);
              if (error) setError(null);
            }}
            className="min-h-24 w-full rounded-lg border border-[var(--border)] bg-white px-3 py-2 text-sm text-[var(--ink)] focus-visible:border-[var(--primary)]"
            placeholder={mode === "reject" ? "Not enough justification, similar issue was resolved last week…" : "Battery pack replaced with OEM unit; ran diagnostics for 30 min."}
          />
          {error ? (
            <p role="alert" className="text-sm text-[var(--danger)]">
              {error}
            </p>
          ) : null}
        </div>

        <footer className="flex justify-end gap-2 border-t border-[var(--border)] pt-4">
          <Button type="button" variant="secondary" onClick={onClose} disabled={submitting}>
            Cancel
          </Button>
          <Button variant={copy.confirmVariant} onClick={submit} loading={submitting}>
            {copy.confirmLabel}
          </Button>
        </footer>
      </div>
    </dialog>
  );
}
