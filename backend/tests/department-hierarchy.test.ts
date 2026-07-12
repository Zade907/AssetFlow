import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  departmentFindUnique: vi.fn(),
  departmentCreate: vi.fn(),
  departmentUpdate: vi.fn(),
  employeeFindUnique: vi.fn(),
}));

vi.mock("../src/config/prisma", () => ({
  prisma: {
    department: {
      findUnique: mocks.departmentFindUnique,
      create: mocks.departmentCreate,
      update: mocks.departmentUpdate,
    },
    employee: { findUnique: mocks.employeeFindUnique },
  },
}));

import { createDepartment, updateDepartment } from "../src/modules/departments/departments.service";

const departmentId = "11111111-1111-4111-8111-111111111111";
const childId = "22222222-2222-4222-8222-222222222222";
const grandchildId = "33333333-3333-4333-8333-333333333333";

describe("department hierarchy validation", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("rejects a missing parent when creating a department", async () => {
    mocks.departmentFindUnique.mockResolvedValue(null);

    await expect(createDepartment({
      name: "Research",
      code: "RND",
      parentDepartmentId: childId,
      status: "ACTIVE",
    })).rejects.toMatchObject({
      code: "INVALID_PARENT_DEPARTMENT",
      statusCode: 400,
    });
    expect(mocks.departmentCreate).not.toHaveBeenCalled();
  });

  it("creates a department after validating its parent", async () => {
    mocks.departmentFindUnique.mockResolvedValue({ id: childId });
    mocks.departmentCreate.mockResolvedValue({
      id: departmentId,
      name: "Research",
      code: "RND",
      parentDepartmentId: childId,
      status: "ACTIVE",
    });

    await expect(createDepartment({
      name: "Research",
      code: "RND",
      parentDepartmentId: childId,
      status: "ACTIVE",
    })).resolves.toMatchObject({
      id: departmentId,
      code: "RND",
      parentDepartmentId: childId,
    });
    expect(mocks.departmentCreate).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({ code: "RND", parentDepartmentId: childId }),
    }));
  });

  it("rejects moving a department below any descendant", async () => {
    mocks.departmentFindUnique
      .mockResolvedValueOnce({ id: departmentId })
      .mockResolvedValueOnce({ parentDepartmentId: childId })
      .mockResolvedValueOnce({ parentDepartmentId: departmentId });

    await expect(updateDepartment(departmentId, {
      parentDepartmentId: grandchildId,
    })).rejects.toMatchObject({
      code: "DEPARTMENT_HIERARCHY_CYCLE",
      statusCode: 400,
    });
    expect(mocks.departmentUpdate).not.toHaveBeenCalled();
  });

  it("allows moving a department below an unrelated branch", async () => {
    mocks.departmentFindUnique
      .mockResolvedValueOnce({ id: departmentId })
      .mockResolvedValueOnce({ parentDepartmentId: null });
    mocks.departmentUpdate.mockResolvedValue({
      id: departmentId,
      parentDepartmentId: childId,
    });

    await expect(updateDepartment(departmentId, {
      parentDepartmentId: childId,
    })).resolves.toMatchObject({
      id: departmentId,
      parentDepartmentId: childId,
    });
    expect(mocks.departmentUpdate).toHaveBeenCalledWith(expect.objectContaining({
      where: { id: departmentId },
      data: { parentDepartmentId: childId },
    }));
  });
});
