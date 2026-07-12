import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { CalendarClock, CalendarPlus, MapPin, RefreshCcw, X } from "lucide-react";
import { useMemo, useState } from "react";
import { toast } from "sonner";

import { ConfirmDialog } from "../../../components/shared/ConfirmDialog";
import { EmptyState, ErrorState, PageSkeleton } from "../../../components/shared/Feedback";
import { PageHeader } from "../../../components/shared/PageHeader";
import { Badge } from "../../../components/ui/Badge";
import { Button } from "../../../components/ui/Button";
import { cn, getErrorMessage } from "../../../lib/utils";
import { useAuthStore } from "../../../stores/authStore";
import {
  bookingsApi,
  bookingsQueryKeys,
  type Booking,
  type BookingConflictDetails,
  type BookingStatus,
} from "../api";
import { NewBookingDialog } from "../components/NewBookingDialog";
import { RescheduleDialog } from "../components/RescheduleDialog";
import { bookingStatusLabel, bookingStatusTone, formatDateTime, formatTimeRange } from "../utils";

type StatusFilter = "ALL" | BookingStatus;

const STATUS_FILTERS: Array<{ value: StatusFilter; label: string }> = [
  { value: "ALL", label: "All" },
  { value: "UPCOMING", label: "Upcoming" },
  { value: "ONGOING", label: "Ongoing" },
  { value: "COMPLETED", label: "Completed" },
  { value: "CANCELLED", label: "Cancelled" },
];

function extractConflict(error: unknown): BookingConflictDetails["conflictingBooking"] | null {
  const details = (error as { response?: { data?: { error?: { details?: unknown } } } })
    ?.response?.data?.error?.details as { conflictingBooking?: BookingConflictDetails["conflictingBooking"] } | undefined;
  return details?.conflictingBooking ?? null;
}

function isManagerRole(role?: string) {
  return role === "ADMIN" || role === "ASSET_MANAGER" || role === "DEPARTMENT_HEAD";
}

export function BookingsPage() {
  const queryClient = useQueryClient();
  const user = useAuthStore((state) => state.user);
  const canSeeAll = isManagerRole(user?.role);

  const [statusFilter, setStatusFilter] = useState<StatusFilter>("ALL");
  const [resourceFilter, setResourceFilter] = useState<string>("ALL");
  const [scope, setScope] = useState<"mine" | "all">(canSeeAll ? "all" : "mine");
  const [createOpen, setCreateOpen] = useState(false);
  const [rescheduleTarget, setRescheduleTarget] = useState<Booking | null>(null);
  const [cancelTarget, setCancelTarget] = useState<Booking | null>(null);
  const [conflict, setConflict] = useState<BookingConflictDetails["conflictingBooking"] | null>(null);

  const filters = useMemo(
    () => ({
      status: statusFilter === "ALL" ? undefined : statusFilter,
      assetId: resourceFilter === "ALL" ? undefined : resourceFilter,
      scope,
    }),
    [statusFilter, resourceFilter, scope],
  );

  const bookingsQuery = useQuery({
    queryKey: bookingsQueryKeys.list(filters),
    queryFn: () => bookingsApi.listBookings(filters),
  });

  const resourcesQuery = useQuery({
    queryKey: bookingsQueryKeys.resources,
    queryFn: bookingsApi.listResources,
    staleTime: 60_000,
  });

  const invalidate = () => queryClient.invalidateQueries({ queryKey: bookingsQueryKeys.all });

  const createMutation = useMutation({
    mutationFn: bookingsApi.createBooking,
    onSuccess: async () => {
      await invalidate();
      toast.success("Booking confirmed");
      setCreateOpen(false);
      setConflict(null);
    },
    onError: (error) => {
      const conflictBooking = extractConflict(error);
      if (conflictBooking) {
        setConflict(conflictBooking);
        toast.error("Slot overlaps with an existing booking", {
          description: `${conflictBooking.asset.name} is booked ${formatTimeRange(conflictBooking.startTime, conflictBooking.endTime)}`,
        });
        return;
      }
      toast.error(getErrorMessage(error, "Booking could not be saved."));
    },
  });

  const cancelMutation = useMutation({
    mutationFn: bookingsApi.cancelBooking,
    onSuccess: async () => {
      await invalidate();
      toast.success("Booking cancelled");
      setCancelTarget(null);
    },
    onError: (error) => toast.error(getErrorMessage(error, "Booking could not be cancelled.")),
  });

  const rescheduleMutation = useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: { startTime: string; endTime: string; purpose?: string } }) =>
      bookingsApi.rescheduleBooking(id, payload),
    onSuccess: async () => {
      await invalidate();
      toast.success("Booking rescheduled");
      setRescheduleTarget(null);
      setConflict(null);
    },
    onError: (error) => {
      const conflictBooking = extractConflict(error);
      if (conflictBooking) {
        setConflict(conflictBooking);
        toast.error("Slot overlaps with an existing booking", {
          description: `${conflictBooking.asset.name} is booked ${formatTimeRange(conflictBooking.startTime, conflictBooking.endTime)}`,
        });
        return;
      }
      toast.error(getErrorMessage(error, "Booking could not be rescheduled."));
    },
  });

  const resources = resourcesQuery.data ?? [];
  const bookings = bookingsQuery.data ?? [];

  const grouped = useMemo(() => {
    const upcoming: Booking[] = [];
    const ongoing: Booking[] = [];
    const past: Booking[] = [];
    for (const booking of bookings) {
      if (booking.status === "ONGOING") ongoing.push(booking);
      else if (booking.status === "UPCOMING") upcoming.push(booking);
      else past.push(booking);
    }
    return { upcoming, ongoing, past };
  }, [bookings]);

  const canManage = (booking: Booking) =>
    canSeeAll || booking.employeeId === user?.employeeId;
  const canEdit = (booking: Booking) =>
    canManage(booking) && (booking.status === "UPCOMING" || booking.status === "ONGOING");

  const openNewBooking = (defaultResourceId?: string) => {
    setConflict(null);
    setCreateOpen(true);
    if (defaultResourceId && resourceFilter !== "ALL") {
      setResourceFilter(defaultResourceId);
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Bookings"
        description="Reserve rooms, vehicles, and shared equipment. The system blocks overlapping requests automatically."
        actions={
          <>
            <Button variant="secondary" onClick={() => void bookingsQuery.refetch()}>
              <RefreshCcw aria-hidden="true" className="size-4" strokeWidth={1.75} />
              Refresh
            </Button>
            <Button onClick={() => openNewBooking()}>
              <CalendarPlus aria-hidden="true" className="size-4" strokeWidth={1.75} />
              New booking
            </Button>
          </>
        }
      />

      <section
        aria-label="Booking filters"
        className="flex flex-col gap-4 rounded-xl border border-[var(--border)] bg-[var(--surface)] p-4 sm:flex-row sm:flex-wrap sm:items-end"
      >
        <div className="flex-1 min-w-[220px]">
          <label className="text-xs font-medium uppercase tracking-wide text-[var(--muted)]" htmlFor="resource-filter">
            Resource
          </label>
          <select
            id="resource-filter"
            value={resourceFilter}
            onChange={(event) => setResourceFilter(event.target.value)}
            className="mt-1 h-11 w-full rounded-lg border border-[var(--border)] bg-white px-3 text-sm text-[var(--ink)]"
          >
            <option value="ALL">All bookable resources</option>
            {resources.map((resource) => (
              <option key={resource.id} value={resource.id}>
                {resource.assetTag} · {resource.name}
              </option>
            ))}
          </select>
        </div>

        <div className="flex flex-1 flex-col gap-1 min-w-[240px]">
          <span className="text-xs font-medium uppercase tracking-wide text-[var(--muted)]">Status</span>
          <div className="flex flex-wrap gap-1.5">
            {STATUS_FILTERS.map((option) => (
              <button
                key={option.value}
                type="button"
                onClick={() => setStatusFilter(option.value)}
                className={cn(
                  "rounded-full border px-3 py-1.5 text-xs font-medium transition-colors",
                  statusFilter === option.value
                    ? "border-[var(--primary)] bg-[var(--primary-soft)] text-[var(--primary)]"
                    : "border-[var(--border)] bg-white text-[var(--muted)] hover:text-[var(--ink)]",
                )}
              >
                {option.label}
              </button>
            ))}
          </div>
        </div>

        {canSeeAll ? (
          <div className="flex flex-col gap-1">
            <span className="text-xs font-medium uppercase tracking-wide text-[var(--muted)]">Scope</span>
            <div className="flex overflow-hidden rounded-lg border border-[var(--border)] bg-white text-xs font-medium">
              <button
                type="button"
                onClick={() => setScope("all")}
                className={cn("px-3 py-2", scope === "all" ? "bg-[var(--primary-soft)] text-[var(--primary)]" : "text-[var(--muted)]")}
              >
                Everyone
              </button>
              <button
                type="button"
                onClick={() => setScope("mine")}
                className={cn("border-l border-[var(--border)] px-3 py-2", scope === "mine" ? "bg-[var(--primary-soft)] text-[var(--primary)]" : "text-[var(--muted)]")}
              >
                Just me
              </button>
            </div>
          </div>
        ) : null}
      </section>

      {bookingsQuery.isLoading ? (
        <PageSkeleton />
      ) : bookingsQuery.isError ? (
        <ErrorState
          message={getErrorMessage(bookingsQuery.error, "Bookings could not be loaded.")}
          onRetry={() => void bookingsQuery.refetch()}
        />
      ) : bookings.length === 0 ? (
        <div className="rounded-xl border border-[var(--border)]">
          <EmptyState
            title="No bookings match these filters"
            description="Create a booking or widen the filter to see reservations."
            icon={CalendarClock}
            action={<Button onClick={() => openNewBooking()}>New booking</Button>}
          />
        </div>
      ) : (
        <div className="space-y-8">
          {grouped.ongoing.length > 0 ? (
            <BookingSection
              title="Happening now"
              description="These bookings are currently ongoing."
              bookings={grouped.ongoing}
              canEdit={canEdit}
              canManage={canManage}
              onReschedule={setRescheduleTarget}
              onCancel={setCancelTarget}
            />
          ) : null}
          {grouped.upcoming.length > 0 ? (
            <BookingSection
              title="Upcoming"
              description="Reservations scheduled for later."
              bookings={grouped.upcoming}
              canEdit={canEdit}
              canManage={canManage}
              onReschedule={setRescheduleTarget}
              onCancel={setCancelTarget}
            />
          ) : null}
          {grouped.past.length > 0 ? (
            <BookingSection
              title="History"
              description="Completed and cancelled bookings."
              bookings={grouped.past}
              canEdit={() => false}
              canManage={canManage}
              onReschedule={setRescheduleTarget}
              onCancel={setCancelTarget}
            />
          ) : null}
        </div>
      )}

      <NewBookingDialog
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        resources={resources}
        defaultResourceId={resourceFilter === "ALL" ? undefined : resourceFilter}
        submitting={createMutation.isPending}
        conflict={conflict}
        onSubmit={(values) => createMutation.mutateAsync(values)}
        onClearConflict={() => setConflict(null)}
      />

      <RescheduleDialog
        open={Boolean(rescheduleTarget)}
        booking={rescheduleTarget}
        onClose={() => {
          setRescheduleTarget(null);
          setConflict(null);
        }}
        submitting={rescheduleMutation.isPending}
        conflict={conflict}
        onClearConflict={() => setConflict(null)}
        onSubmit={(values) =>
          rescheduleTarget
            ? rescheduleMutation.mutateAsync({
                id: rescheduleTarget.id,
                payload: values,
              })
            : Promise.resolve()
        }
      />

      <ConfirmDialog
        open={Boolean(cancelTarget)}
        title="Cancel this booking?"
        description={
          cancelTarget
            ? `${cancelTarget.asset.assetTag} · ${cancelTarget.asset.name} at ${formatDateTime(
                cancelTarget.startTime,
              )}. The slot becomes available for others.`
            : ""
        }
        confirmLabel="Cancel booking"
        loading={cancelMutation.isPending}
        onClose={() => setCancelTarget(null)}
        onConfirm={() => cancelTarget && cancelMutation.mutate(cancelTarget.id)}
      />
    </div>
  );
}

type BookingSectionProps = {
  title: string;
  description: string;
  bookings: Booking[];
  canEdit: (booking: Booking) => boolean;
  canManage: (booking: Booking) => boolean;
  onReschedule: (booking: Booking) => void;
  onCancel: (booking: Booking) => void;
};

function BookingSection({
  title,
  description,
  bookings,
  canEdit,
  canManage,
  onReschedule,
  onCancel,
}: BookingSectionProps) {
  return (
    <section aria-label={title} className="space-y-3">
      <header>
        <h2 className="text-lg font-semibold text-[var(--ink)]">{title}</h2>
        <p className="text-sm text-[var(--muted)]">{description}</p>
      </header>
      <ul className="grid gap-3 sm:grid-cols-2">
        {bookings.map((booking) => (
          <li
            key={booking.id}
            className="flex flex-col gap-3 rounded-xl border border-[var(--border)] bg-white p-5"
          >
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="truncate text-xs font-mono text-[var(--muted)]">
                  {booking.asset.assetTag}
                </p>
                <h3 className="mt-0.5 truncate font-semibold text-[var(--ink)]">
                  {booking.asset.name}
                </h3>
                <p className="mt-1 flex items-center gap-1 text-xs text-[var(--muted)]">
                  <MapPin aria-hidden="true" className="size-3.5" strokeWidth={1.75} />
                  {booking.asset.location}
                </p>
              </div>
              <Badge tone={bookingStatusTone[booking.status]}>
                {bookingStatusLabel[booking.status]}
              </Badge>
            </div>

            <div className="rounded-lg bg-[var(--surface)] px-3 py-2 text-sm">
              <p className="font-medium text-[var(--ink)]">
                {formatTimeRange(booking.startTime, booking.endTime)}
              </p>
              <p className="mt-1 text-[var(--muted)]">{booking.purpose}</p>
            </div>

            <footer className="flex items-center justify-between gap-2 border-t border-[var(--border)] pt-3 text-xs text-[var(--muted)]">
              <span className="truncate">
                Booked by <span className="font-medium text-[var(--ink)]">{booking.employee.name}</span>
                {booking.employee.department ? ` · ${booking.employee.department.name}` : ""}
              </span>
              {canManage(booking) ? (
                <div className="flex gap-1">
                  {canEdit(booking) ? (
                    <Button variant="ghost" className="h-9 px-3 text-xs" onClick={() => onReschedule(booking)}>
                      Reschedule
                    </Button>
                  ) : null}
                  {canEdit(booking) ? (
                    <Button
                      variant="ghost"
                      className="h-9 px-3 text-xs hover:text-[var(--danger)]"
                      onClick={() => onCancel(booking)}
                    >
                      <X aria-hidden="true" className="size-3.5" strokeWidth={1.75} />
                      Cancel
                    </Button>
                  ) : null}
                </div>
              ) : null}
            </footer>
          </li>
        ))}
      </ul>
    </section>
  );
}
