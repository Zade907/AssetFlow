import { ShieldCheck, X } from "lucide-react";
import { useEffect, useId, useRef, useState } from "react";
import { Button } from "../../../components/ui/Button";
import type { Role } from "../../auth/types";
import type { Employee } from "../api";

const roleLabels: Record<Role, string> = {
  EMPLOYEE: "Employee",
  DEPARTMENT_HEAD: "Department Head",
  ASSET_MANAGER: "Asset Manager",
  ADMIN: "Admin",
};

const roleImpact: Record<Role, string> = {
  EMPLOYEE: "Can view assigned assets, book resources, and raise maintenance requests.",
  DEPARTMENT_HEAD: "Can also approve department-scoped allocation and transfer work.",
  ASSET_MANAGER: "Can register and allocate assets, approve transfers, and manage maintenance.",
  ADMIN: "Receives organization-wide setup, employee role, audit, and reporting access.",
};

export function RoleChangeDialog({ employee, loading, error, onClose, onConfirm }: {
  employee: Employee | null;
  loading: boolean;
  error: string | null;
  onClose: () => void;
  onConfirm: (role: Role) => void;
}) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const titleId = useId();
  const descriptionId = useId();
  const [selectedRole, setSelectedRole] = useState<Role>("EMPLOYEE");
  const [confirmation, setConfirmation] = useState("");

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (employee) {
      setSelectedRole(employee.role);
      setConfirmation("");
      if (!dialog.open) dialog.showModal();
    } else if (dialog.open) dialog.close();
  }, [employee]);

  const grantsAdmin = selectedRole === "ADMIN" && employee?.role !== "ADMIN";
  const unchanged = selectedRole === employee?.role;
  const confirmationMatches = !grantsAdmin || confirmation.trim().toLowerCase() === employee?.email.toLowerCase();
  const canConfirm = Boolean(employee) && !unchanged && confirmationMatches && !loading;

  return (
    <dialog ref={dialogRef} aria-labelledby={titleId} aria-describedby={descriptionId} onCancel={(event) => { if (loading) event.preventDefault(); else onClose(); }} onClose={onClose} className="m-auto w-[calc(100%-32px)] max-w-xl rounded-xl border border-[var(--border)] bg-white p-0 text-[var(--ink)] shadow-[0_6px_8px_color-mix(in_oklch,var(--ink)_10%,transparent)] backdrop:bg-[color-mix(in_oklch,var(--ink)_36%,transparent)]">
      <div className="flex items-start gap-4 border-b border-[var(--border)] p-5 sm:p-6">
        <span className="grid size-11 shrink-0 place-items-center rounded-lg bg-[var(--primary-soft)] text-[var(--primary)]"><ShieldCheck aria-hidden="true" className="size-5" strokeWidth={1.75} /></span>
        <div className="min-w-0 flex-1"><h2 id={titleId} className="text-xl font-semibold">Confirm role change</h2><p id={descriptionId} className="mt-1 text-sm leading-6 text-[var(--muted)]">Review the access change before it is applied and written to the activity log.</p></div>
        <button type="button" aria-label="Close role change dialog" className="grid size-10 place-items-center rounded-lg text-[var(--muted)] hover:bg-[var(--surface)]" onClick={onClose} disabled={loading}><X aria-hidden="true" className="size-4" /></button>
      </div>
      <div className="space-y-5 p-5 sm:p-6">
        <div><p className="text-sm font-medium">{employee?.name}</p><p className="mt-0.5 text-sm text-[var(--muted)]">{employee?.email}</p></div>
        <div className="grid gap-3 sm:grid-cols-[1fr_auto_1fr] sm:items-center">
          <div className="rounded-lg bg-[var(--surface)] p-4"><p className="text-xs text-[var(--muted)]">Current role</p><p className="mt-1 text-sm font-semibold">{employee ? roleLabels[employee.role] : "Employee"}</p></div>
          <span aria-hidden="true" className="hidden text-[var(--muted)] sm:block">→</span>
          <label className="grid gap-2"><span className="text-xs text-[var(--muted)]">New role</span><select aria-label="New employee role" value={selectedRole} onChange={(event) => { setSelectedRole(event.target.value as Role); setConfirmation(""); }} className="min-h-11 rounded-lg border border-[var(--border)] bg-white px-3 text-sm font-semibold"><option value="EMPLOYEE">Employee</option><option value="DEPARTMENT_HEAD">Department Head</option><option value="ASSET_MANAGER">Asset Manager</option><option value="ADMIN">Admin</option></select></label>
        </div>
        <div className="rounded-lg bg-[var(--surface)] px-4 py-3 text-sm leading-6"><span className="font-medium">Access after change:</span> <span className="text-[var(--muted)]">{roleImpact[selectedRole]}</span></div>
        {grantsAdmin ? <div className="rounded-lg bg-[var(--warning-soft)] p-4"><p className="text-sm font-semibold text-[var(--ink)]">Admin access affects the entire organization</p><p className="mt-1 text-sm leading-6 text-[var(--muted)]">Type <strong>{employee?.email}</strong> to confirm this elevated access.</p><label className="mt-3 grid gap-2"><span className="text-sm font-medium">Employee email</span><input value={confirmation} onChange={(event) => setConfirmation(event.target.value)} autoComplete="off" className="min-h-11 rounded-lg border border-[var(--border)] bg-white px-3 text-sm" /></label></div> : null}
        {error ? <div role="alert" className="rounded-lg bg-[var(--danger-soft)] px-4 py-3 text-sm text-[var(--danger)]">{error}</div> : null}
        <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end"><Button type="button" variant="secondary" onClick={onClose} disabled={loading}>Cancel</Button><Button type="button" variant={grantsAdmin ? "danger" : "primary"} onClick={() => onConfirm(selectedRole)} loading={loading} disabled={!canConfirm}>{grantsAdmin ? "Grant admin access" : "Change role"}</Button></div>
      </div>
    </dialog>
  );
}
