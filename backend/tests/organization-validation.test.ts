import { describe, expect, it } from "vitest";

import { createCategorySchema } from "../src/modules/categories/categories.schema";
import { createDepartmentSchema, updateDepartmentSchema } from "../src/modules/departments/departments.schema";
import { listEmployeesQuerySchema } from "../src/modules/employees/employees.schema";

describe("organization setup validation", () => {
  it("normalizes a unique-ready department code and accepts hierarchy fields", () => {
    expect(createDepartmentSchema.parse({ name: "Research", code: "r-and-d", parentDepartmentId: null, status: "ACTIVE" })).toEqual({
      name: "Research",
      code: "R-AND-D",
      parentDepartmentId: null,
      status: "ACTIVE",
    });
    expect(updateDepartmentSchema.safeParse({ parentDepartmentId: null, headEmployeeId: null, status: "INACTIVE" }).success).toBe(true);
  });

  it("validates structured category custom fields", () => {
    const result = createCategorySchema.parse({
      name: "Electronics",
      customFields: {
        warrantyMonths: { label: "Warranty months", type: "number", required: true },
        purchaseDate: { label: "Purchase date", type: "date", required: false },
      },
    });
    expect(result.customFields?.warrantyMonths).toEqual({ label: "Warranty months", type: "number", required: true });
  });

  it("rejects unsafe or unstructured custom field definitions", () => {
    expect(createCategorySchema.safeParse({ name: "Tools", customFields: { "bad-key": { label: "Bad", type: "text", required: false } } }).success).toBe(false);
    expect(createCategorySchema.safeParse({ name: "Tools", customFields: { serial: "text" } }).success).toBe(false);
  });

  it("accepts all employee directory filters and rejects unknown query keys", () => {
    expect(listEmployeesQuerySchema.safeParse({ search: "maya", departmentId: "11111111-1111-4111-8111-111111111111", role: "EMPLOYEE", status: "ACTIVE" }).success).toBe(true);
    expect(listEmployeesQuerySchema.safeParse({ team: "Engineering" }).success).toBe(false);
  });
});
