import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Camera, PlusCircle, RefreshCcw, Wrench } from "lucide-react";
import { useMemo, useState } from "react";
import { toast } from "sonner";

import { EmptyState, ErrorState, PageSkeleton } from "../../../components/shared/Feedback";
import { PageHeader } from "../../../components/shared/PageHeader";
import { Badge } from "../../../components/ui/Badge";
import { Button } from "../../../components/ui/Button";
import { cn, getErrorMessage } from "../../../lib/utils";
import { useAuthStore } from "../../../stores/authStore";
import { bookingsQueryKeys } from "../../bookings/api";
import {
  maintenanceApi,
  maintenanceQueryKeys,
  type MaintenancePriority,
  type MaintenanceRequest,
} from "../api";
import { DecisionDialog } from "../components/DecisionDialog";
import { RaiseRequestDialog } from "../components/RaiseRequestDialog";
import {
  columnDefinitions,
  priorityBorderClass,
  priorityLabel,
  priorityTone,
  relativeFromNow,
  statusLabel,
  type KanbanColumnKey,
} from "../utils";

type PriorityFilter = "ALL" | MaintenancePriority;

const PRIORITY_FILTERS: Array<{ value: PriorityFilter; label: string }> = [
  { value: "ALL", label: "All priorities" },
  { value: "CRITICAL", label: "Critical" },
  { value: "HIGH", label: "High" },
  { value: "MEDIUM", label: "Medium" },
  { value: "LOW", label: "Low" },
];

function isManager(role?: string) {
  return role === "ADMIN" || role === "ASSET_MANAGER";
}

export function MaintenancePage() {
  const queryClient = useQueryClient();
  const user = useAuthStore((state) => state.user);
  const managerActor = isManager(user?.role);

  const [priorityFilter, setPriorityFilter] = useState<PriorityFilter>("ALL");
  const [scope, setScope] = useState<"mine" | "all">(managerActor ? "all" : "mine");
  const [raiseOpen, setRaiseOpen] = useState(false);
  const [decision, setDecision] = useState<{
    request: MaintenanceRequest;
    mode: "approve" | "reject" | "resolve";
  } | null>(null);

  const filters = useMemo(
    () => ({
      priority: priorityFilter === "ALL" ? undefined : priorityFilter,
      scope,
    }),
    [priorityFilter, scope],
  );

  const listQuery = useQuery({
    queryKey: maintenanceQueryKeys.list(filters),
    queryFn: () => maintenanceApi.listRequests(filters),
  });

  const assetsQuery = useQuery({
    queryKey: maintenanceQueryKeys.assets,
    queryFn: maintenanceApi.listMaintainableAssets,
    staleTime: 60_000,
  });

  const invalidate = async () => {
    await queryClient.invalidateQueries({ queryKey: maintenanceQueryKeys.all });
    await queryClient.invalidateQueries({ queryKey: bookingsQueryKeys.all });
  };

  const raiseMutation = useMutation({
    mutationFn: maintenanceApi.createRequest,
    onSuccess: async () => {
      await invalidate();
      toast.success("Maintenance request submitted for approval");
      setRaiseOpen(false);
    },
    onError: (error) => toast.error(getErrorMessage(error, "Request could not be raised.")),
  });

  const approveMutation = useMutation({
    mutationFn: ({ id, notes }: { id: string; notes?: string }) =>
      maintenanceApi.approveRequest(id, { notes }),
    onSuccess: async () => {
      await invalidate();
      toast.success("Request approved · asset moved to Under Maintenance");
      setDecision(null);
    },
    onError: (error) => toast.error(getErrorMessage(error, "Request could not be approved.")),
  });

  const rejectMutation = useMutation({
    mutationFn: ({ id, reason }: { id: string; reason: string }) =>
      maintenanceApi.rejectRequest(id, reason),
    onSuccess: async () => {
      await invalidate();
      toast.success("Request rejected");
      setDecision(null);
    },
    onError: (error) => toast.error(getErrorMessage(error, "Request could not be rejected.")),
  });

  const startMutation = useMutation({
    mutationFn: (id: string) => maintenanceApi.startWork(id),
    onSuccess: async () => {
      await invalidate();
      toast.success("Work started");
    },
    onError: (error) => toast.error(getErrorMessage(error, "Work could not be started.")),
  });

  const resolveMutation = useMutation({
    mutationFn: ({ id, resolutionNotes }: { id: string; resolutionNotes: string }) =>
      maintenanceApi.resolveRequest(id, resolutionNotes),
    onSuccess: async () => {
      await invalidate();
      toast.success("Marked resolved · asset restored to Available");
      setDecision(null);
    },
    onError: (error) => toast.error(getErrorMessage(error, "Request could not be resolved.")),
  });

  const requests = listQuery.data ?? [];

  const buckets = useMemo(() => {
    const map = new Map<KanbanColumnKey, MaintenanceRequest[]>();
    columnDefinitions.forEach((column) => map.set(column.key, []));
    for (const request of requests) {
      const column = columnDefinitions.find((def) => def.statuses.includes(request.status));
      if (column) {
        map.get(column.key)!.push(request);
      }
    }
    for (const column of columnDefinitions) {
      map.get(column.key)!.sort((a, b) => {
        const priorityOrder: Record<MaintenancePriority, number> = {
          CRITICAL: 0,
          HIGH: 1,
          MEDIUM: 2,
          LOW: 3,
        };
        const priorityDelta = priorityOrder[a.priority] - priorityOrder[b.priority];
        if (priorityDelta !== 0) return priorityDelta;
        return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      });
    }
    return map;
  }, [requests]);

  const canStart = (request: MaintenanceRequest) =>
    managerActor || request.assignedTechnicianId === user?.employeeId;
  const canResolve = canStart;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Maintenance"
        description="Raise repair requests, approve them into work, and keep asset status honest."
        actions={
          <>
            <Button variant="secondary" onClick={() => void listQuery.refetch()}>
              <RefreshCcw aria-hidden="true" className="size-4" strokeWidth={1.75} />
              Refresh
            </Button>
            <Button onClick={() => setRaiseOpen(true)}>
              <PlusCircle aria-hidden="true" className="size-4" strokeWidth={1.75} />
              Raise request
            </Button>
          </>
        }
      />

      <section
        aria-label="Maintenance filters"
        className="flex flex-col gap-4 rounded-xl border border-[var(--border)] bg-[var(--surface)] p-4 sm:flex-row sm:items-center sm:justify-between"
      >
        <div className="flex flex-wrap items-center gap-1.5">
          {PRIORITY_FILTERS.map((option) => (
            <button
              key={option.value}
              type="button"
              onClick={() => setPriorityFilter(option.value)}
              className={cn(
                "rounded-full border px-3 py-1.5 text-xs font-medium transition-colors",
                priorityFilter === option.value
                  ? "border-[var(--primary)] bg-[var(--primary-soft)] text-[var(--primary)]"
                  : "border-[var(--border)] bg-white text-[var(--muted)] hover:text-[var(--ink)]",
              )}
            >
              {option.label}
            </button>
          ))}
        </div>

        {managerActor ? (
          <div className="flex overflow-hidden rounded-lg border border-[var(--border)] bg-white text-xs font-medium">
            <button
              type="button"
              onClick={() => setScope("all")}
              className={cn("px-3 py-2", scope === "all" ? "bg-[var(--primary-soft)] text-[var(--primary)]" : "text-[var(--muted)]")}
            >
              All requests
            </button>
            <button
              type="button"
              onClick={() => setScope("mine")}
              className={cn(
                "border-l border-[var(--border)] px-3 py-2",
                scope === "mine" ? "bg-[var(--primary-soft)] text-[var(--primary)]" : "text-[var(--muted)]",
              )}
            >
              Mine only
            </button>
          </div>
        ) : null}
      </section>

      {listQuery.isLoading ? (
        <PageSkeleton />
      ) : listQuery.isError ? (
        <ErrorState
          message={getErrorMessage(listQuery.error, "Maintenance requests could not be loaded.")}
          onRetry={() => void listQuery.refetch()}
        />
      ) : requests.length === 0 ? (
        <div className="rounded-xl border border-[var(--border)]">
          <EmptyState
            title="No maintenance requests"
            description="When someone raises a request, it will appear here for the asset manager to review."
            icon={Wrench}
            action={<Button onClick={() => setRaiseOpen(true)}>Raise the first request</Button>}
          />
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {columnDefinitions.map((column) => {
            const items = buckets.get(column.key) ?? [];
            return (
              <section
                key={column.key}
                aria-label={column.title}
                className="flex flex-col gap-3 rounded-xl border border-[var(--border)] bg-[var(--surface)] p-3"
              >
                <header className="flex items-start justify-between gap-3 px-1">
                  <div>
                    <div className="flex items-center gap-2">
                      <h2 className="text-sm font-semibold uppercase tracking-wide text-[var(--muted)]">
                        {column.title}
                      </h2>
                      <span
                        className={cn(
                          "inline-flex min-w-6 justify-center rounded-full px-2 py-0.5 text-xs font-medium",
                          column.accent,
                        )}
                      >
                        {items.length}
                      </span>
                    </div>
                    <p className="mt-1 text-xs text-[var(--muted)]">{column.description}</p>
                  </div>
                </header>

                <ul className="flex flex-col gap-3">
                  {items.length === 0 ? (
                    <li className="rounded-lg border border-dashed border-[var(--border)] bg-white px-3 py-6 text-center text-xs text-[var(--muted)]">
                      Nothing here yet.
                    </li>
                  ) : (
                    items.map((request) => (
                      <li
                        key={request.id}
                        className={cn(
                          "flex flex-col gap-3 rounded-lg border-l-4 border border-[var(--border)] bg-white p-4",
                          priorityBorderClass[request.priority],
                        )}
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div className="min-w-0">
                            <p className="text-xs font-mono text-[var(--muted)]">
                              {request.asset.assetTag}
                            </p>
                            <p className="truncate font-semibold text-[var(--ink)]">
                              {request.asset.name}
                            </p>
                          </div>
                          <Badge tone={priorityTone[request.priority]}>
                            {priorityLabel[request.priority]}
                          </Badge>
                        </div>

                        <p className="line-clamp-3 text-sm text-[var(--ink)]">
                          {request.description}
                        </p>

                        <div className="flex flex-wrap items-center gap-2 text-xs text-[var(--muted)]">
                          <span>
                            {request.raisedBy.name} · {relativeFromNow(request.createdAt)}
                          </span>
                          {request.photoUrl ? (
                            <a
                              href={request.photoUrl}
                              target="_blank"
                              rel="noreferrer"
                              className="inline-flex items-center gap-1 rounded-full bg-[var(--surface-strong)] px-2 py-1 text-[var(--muted)] hover:text-[var(--ink)]"
                            >
                              <Camera aria-hidden="true" className="size-3" strokeWidth={1.75} />
                              Photo
                            </a>
                          ) : null}
                        </div>

                        {request.status === "TECHNICIAN_ASSIGNED" && request.assignedTechnician ? (
                          <p className="text-xs text-[var(--muted)]">
                            Assigned to {request.assignedTechnician.name}
                          </p>
                        ) : null}

                        {(request.status === "RESOLVED" || request.status === "REJECTED") &&
                        request.resolutionNotes ? (
                          <p className="rounded-md bg-[var(--surface)] p-2 text-xs text-[var(--muted)]">
                            <span className="font-semibold text-[var(--ink)]">
                              {request.status === "REJECTED" ? "Rejection reason: " : "Resolution: "}
                            </span>
                            {request.resolutionNotes}
                          </p>
                        ) : null}

                        <footer className="flex flex-wrap items-center justify-between gap-2 border-t border-[var(--border)] pt-3">
                          <span className="text-xs text-[var(--muted)]">{statusLabel[request.status]}</span>
                          <div className="flex flex-wrap gap-1">
                            {managerActor && request.status === "PENDING" ? (
                              <>
                                <Button
                                  variant="ghost"
                                  className="h-9 px-3 text-xs hover:text-[var(--danger)]"
                                  onClick={() => setDecision({ request, mode: "reject" })}
                                >
                                  Reject
                                </Button>
                                <Button
                                  className="h-9 px-3 text-xs"
                                  onClick={() => setDecision({ request, mode: "approve" })}
                                >
                                  Approve
                                </Button>
                              </>
                            ) : null}
                            {(request.status === "APPROVED" ||
                              request.status === "TECHNICIAN_ASSIGNED") &&
                            canStart(request) ? (
                              <Button
                                className="h-9 px-3 text-xs"
                                onClick={() => startMutation.mutate(request.id)}
                                loading={
                                  startMutation.isPending && startMutation.variables === request.id
                                }
                              >
                                Start work
                              </Button>
                            ) : null}
                            {request.status === "IN_PROGRESS" && canResolve(request) ? (
                              <Button
                                className="h-9 px-3 text-xs"
                                onClick={() => setDecision({ request, mode: "resolve" })}
                              >
                                Mark resolved
                              </Button>
                            ) : null}
                          </div>
                        </footer>
                      </li>
                    ))
                  )}
                </ul>
              </section>
            );
          })}
        </div>
      )}

      <RaiseRequestDialog
        open={raiseOpen}
        onClose={() => setRaiseOpen(false)}
        assets={assetsQuery.data ?? []}
        submitting={raiseMutation.isPending}
        onSubmit={(payload) => raiseMutation.mutateAsync(payload)}
      />

      <DecisionDialog
        open={decision !== null}
        mode={decision?.mode ?? "approve"}
        request={decision?.request ?? null}
        submitting={
          approveMutation.isPending || rejectMutation.isPending || resolveMutation.isPending
        }
        onClose={() => setDecision(null)}
        onConfirm={(payload) => {
          if (!decision) return;
          if (decision.mode === "approve") {
            approveMutation.mutate({ id: decision.request.id, notes: payload.notes });
          } else if (decision.mode === "reject") {
            rejectMutation.mutate({ id: decision.request.id, reason: payload.reason ?? "" });
          } else {
            resolveMutation.mutate({
              id: decision.request.id,
              resolutionNotes: payload.resolutionNotes ?? "",
            });
          }
        }}
      />
    </div>
  );
}
