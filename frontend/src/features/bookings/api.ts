import { apiClient } from "../../lib/apiClient";
import { unwrapList } from "../../lib/utils";

export type BookingStatus = "UPCOMING" | "ONGOING" | "COMPLETED" | "CANCELLED";
export type AssetStatus =
  | "AVAILABLE"
  | "ALLOCATED"
  | "RESERVED"
  | "UNDER_MAINTENANCE"
  | "LOST"
  | "RETIRED"
  | "DISPOSED";

export type BookableResource = {
  id: string;
  assetTag: string;
  name: string;
  location: string;
  status: AssetStatus;
  category: { id: string; name: string } | null;
};

export type Booking = {
  id: string;
  assetId: string;
  employeeId: string;
  startTime: string;
  endTime: string;
  purpose: string;
  status: BookingStatus;
  createdAt: string;
  updatedAt: string;
  asset: {
    id: string;
    assetTag: string;
    name: string;
    location: string;
    status: AssetStatus;
    category: { id: string; name: string } | null;
  };
  employee: {
    id: string;
    name: string;
    email: string;
    role: string;
    department: { id: string; name: string; code: string } | null;
  };
};

export type BookingConflictDetails = {
  conflictingBooking: {
    id: string;
    startTime: string;
    endTime: string;
    purpose: string;
    status: BookingStatus;
    asset: Booking["asset"];
    employee: Booking["employee"];
  };
};

export type BookingListFilters = {
  assetId?: string;
  status?: BookingStatus;
  scope?: "mine" | "all";
  from?: string;
  to?: string;
};

export type CreateBookingPayload = {
  assetId: string;
  startTime: string;
  endTime: string;
  purpose: string;
};

export type ReschedulePayload = {
  startTime: string;
  endTime: string;
  purpose?: string;
};

export const bookingsApi = {
  async listBookings(filters: BookingListFilters = {}) {
    const { data } = await apiClient.get("/bookings", { params: filters });
    return unwrapList<Booking>(data, ["bookings"]);
  },
  async listResources() {
    const { data } = await apiClient.get("/bookings/resources");
    return unwrapList<BookableResource>(data, ["resources", "assets"]);
  },
  createBooking(payload: CreateBookingPayload) {
    return apiClient.post("/bookings", payload);
  },
  cancelBooking(id: string) {
    return apiClient.patch(`/bookings/${id}/cancel`);
  },
  rescheduleBooking(id: string, payload: ReschedulePayload) {
    return apiClient.patch(`/bookings/${id}/reschedule`, payload);
  },
};

export const bookingsQueryKeys = {
  all: ["bookings"] as const,
  list: (filters: BookingListFilters) => ["bookings", "list", filters] as const,
  resources: ["bookings", "resources"] as const,
};
