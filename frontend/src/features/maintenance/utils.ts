import type { MaintenancePriority, MaintenanceStatus } from "./api";

export const priorityTone: Record<
  MaintenancePriority,
  "neutral" | "info" | "warning" | "danger"
> = {
  LOW: "neutral",
  MEDIUM: "info",
  HIGH: "warning",
  CRITICAL: "danger",
};

export const priorityLabel: Record<MaintenancePriority, string> = {
  LOW: "Low",
  MEDIUM: "Medium",
  HIGH: "High",
  CRITICAL: "Critical",
};

export const priorityBorderClass: Record<MaintenancePriority, string> = {
  LOW: "border-l-[var(--border)]",
  MEDIUM: "border-l-[var(--info)]",
  HIGH: "border-l-[var(--warning)]",
  CRITICAL: "border-l-[var(--danger)]",
};

export const statusLabel: Record<MaintenanceStatus, string> = {
  PENDING: "Pending",
  APPROVED: "Approved",
  REJECTED: "Rejected",
  TECHNICIAN_ASSIGNED: "Technician assigned",
  IN_PROGRESS: "In progress",
  RESOLVED: "Resolved",
};

export type KanbanColumnKey = "PENDING" | "APPROVED" | "IN_PROGRESS" | "DONE";

export const columnDefinitions: Array<{
  key: KanbanColumnKey;
  title: string;
  description: string;
  statuses: MaintenanceStatus[];
  accent: string;
}> = [
  {
    key: "PENDING",
    title: "Pending",
    description: "Waiting for asset-manager review.",
    statuses: ["PENDING"],
    accent: "bg-[var(--warning-soft)] text-[color-mix(in_oklch,var(--warning)_68%,black)]",
  },
  {
    key: "APPROVED",
    title: "Approved",
    description: "Ready to be worked on.",
    statuses: ["APPROVED", "TECHNICIAN_ASSIGNED"],
    accent: "bg-[var(--info-soft)] text-[var(--info)]",
  },
  {
    key: "IN_PROGRESS",
    title: "In progress",
    description: "Under active repair.",
    statuses: ["IN_PROGRESS"],
    accent: "bg-[var(--primary-soft)] text-[var(--primary)]",
  },
  {
    key: "DONE",
    title: "Done",
    description: "Resolved or rejected.",
    statuses: ["RESOLVED", "REJECTED"],
    accent: "bg-[var(--success-soft)] text-[color-mix(in_oklch,var(--success)_82%,black)]",
  },
];

const RELATIVE = new Intl.RelativeTimeFormat(undefined, { numeric: "auto" });

export function relativeFromNow(iso: string) {
  const delta = Date.now() - new Date(iso).getTime();
  const seconds = Math.round(delta / 1000);
  if (Math.abs(seconds) < 60) return RELATIVE.format(-seconds, "second");
  const minutes = Math.round(seconds / 60);
  if (Math.abs(minutes) < 60) return RELATIVE.format(-minutes, "minute");
  const hours = Math.round(minutes / 60);
  if (Math.abs(hours) < 24) return RELATIVE.format(-hours, "hour");
  const days = Math.round(hours / 24);
  return RELATIVE.format(-days, "day");
}
