import { apiClient } from "../../lib/apiClient";
import { unwrapList } from "../../lib/utils";
import type { AssetStatus, BookableResource } from "../bookings/api";

export type MaintenanceStatus =
  | "PENDING"
  | "APPROVED"
  | "REJECTED"
  | "TECHNICIAN_ASSIGNED"
  | "IN_PROGRESS"
  | "RESOLVED";

export type MaintenancePriority = "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";

export type MaintenanceRequest = {
  id: string;
  assetId: string;
  raisedById: string;
  description: string;
  priority: MaintenancePriority;
  photoUrl: string | null;
  status: MaintenanceStatus;
  assignedTechnicianId: string | null;
  approvedById: string | null;
  resolvedAt: string | null;
  resolutionNotes: string | null;
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
  raisedBy: {
    id: string;
    name: string;
    email: string;
    department: { id: string; name: string; code: string } | null;
  };
  assignedTechnician: { id: string; name: string; email: string } | null;
  approvedBy: { id: string; name: string; email: string; role: string } | null;
};

export type MaintenanceListFilters = {
  status?: MaintenanceStatus;
  priority?: MaintenancePriority;
  assetId?: string;
  scope?: "mine" | "all";
};

export const maintenanceApi = {
  async listRequests(filters: MaintenanceListFilters = {}) {
    const { data } = await apiClient.get("/maintenance", { params: filters });
    return unwrapList<MaintenanceRequest>(data, ["requests", "maintenance"]);
  },
  createRequest(payload: {
    assetId: string;
    description: string;
    priority: MaintenancePriority;
    photoUrl?: string;
  }) {
    return apiClient.post("/maintenance", payload);
  },
  approveRequest(id: string, payload: { assignedTechnicianId?: string; notes?: string } = {}) {
    return apiClient.post(`/maintenance/${id}/approve`, payload);
  },
  rejectRequest(id: string, reason: string) {
    return apiClient.post(`/maintenance/${id}/reject`, { reason });
  },
  startWork(id: string) {
    return apiClient.post(`/maintenance/${id}/start`);
  },
  resolveRequest(id: string, resolutionNotes: string) {
    return apiClient.post(`/maintenance/${id}/resolve`, { resolutionNotes });
  },
  // Uses the bookings resources endpoint's asset list only for maintainable items.
  // Full asset registry endpoint arrives with P2's Assets module.
  async listMaintainableAssets(): Promise<BookableResource[]> {
    const { data } = await apiClient.get("/bookings/resources");
    return unwrapList<BookableResource>(data, ["resources", "assets"]);
  },
};

export const maintenanceQueryKeys = {
  all: ["maintenance"] as const,
  list: (filters: MaintenanceListFilters) => ["maintenance", "list", filters] as const,
  assets: ["maintenance", "assets"] as const,
};
