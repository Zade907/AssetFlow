import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  transaction: vi.fn(),
  employeeFindUnique: vi.fn(),
  employeeUpdate: vi.fn(),
  activityLogCreate: vi.fn(),
  directEmployeeFindUnique: vi.fn(),
  directEmployeeUpdate: vi.fn(),
}));

vi.mock("../src/config/prisma", () => ({
  prisma: {
    $transaction: mocks.transaction,
    employee: { findUnique: mocks.directEmployeeFindUnique, update: mocks.directEmployeeUpdate },
  },
}));

import { promoteEmployee, updateEmployeeStatus } from "../src/modules/employees/employees.service";

const actor = { employeeId: "11111111-1111-4111-8111-111111111111", ipAddress: "127.0.0.1" };
const targetId = "22222222-2222-4222-8222-222222222222";

describe("employee role security", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.transaction.mockImplementation(async (callback) => callback({
      employee: { findUnique: mocks.employeeFindUnique, update: mocks.employeeUpdate },
      activityLog: { create: mocks.activityLogCreate },
    }));
  });

  it("blocks an administrator from changing their own role before opening a transaction", async () => {
    await expect(promoteEmployee(actor.employeeId, "EMPLOYEE", actor)).rejects.toMatchObject({ code: "SELF_ROLE_CHANGE_FORBIDDEN", statusCode: 403 });
    expect(mocks.transaction).not.toHaveBeenCalled();
  });

  it("updates the role and writes the activity log atomically", async () => {
    mocks.employeeFindUnique.mockResolvedValue({ id: targetId, name: "Maya Patel", email: "maya@artemis.com", role: "EMPLOYEE" });
    mocks.employeeUpdate.mockResolvedValue({ id: targetId, role: "ASSET_MANAGER" });
    mocks.activityLogCreate.mockResolvedValue({ id: "log-id" });

    await expect(promoteEmployee(targetId, "ASSET_MANAGER", actor)).resolves.toMatchObject({ role: "ASSET_MANAGER" });
    expect(mocks.employeeUpdate).toHaveBeenCalledWith(expect.objectContaining({ where: { id: targetId }, data: { role: "ASSET_MANAGER" } }));
    expect(mocks.activityLogCreate).toHaveBeenCalledWith({ data: expect.objectContaining({
      employeeId: actor.employeeId,
      action: "EMPLOYEE_ROLE_CHANGED",
      entityType: "Employee",
      entityId: targetId,
      details: expect.objectContaining({ previousRole: "EMPLOYEE", newRole: "ASSET_MANAGER" }),
    }) });
  });

  it("does not create noise when the requested role is unchanged", async () => {
    mocks.employeeFindUnique.mockResolvedValue({ id: targetId, name: "Maya Patel", email: "maya@artemis.com", role: "EMPLOYEE" });
    await expect(promoteEmployee(targetId, "EMPLOYEE", actor)).rejects.toMatchObject({ code: "ROLE_UNCHANGED", statusCode: 409 });
    expect(mocks.employeeUpdate).not.toHaveBeenCalled();
    expect(mocks.activityLogCreate).not.toHaveBeenCalled();
  });

  it("blocks self-deactivation server-side", async () => {
    await expect(updateEmployeeStatus(actor.employeeId, "INACTIVE", actor.employeeId)).rejects.toMatchObject({ code: "SELF_STATUS_CHANGE_FORBIDDEN", statusCode: 403 });
    expect(mocks.directEmployeeUpdate).not.toHaveBeenCalled();
  });
});
