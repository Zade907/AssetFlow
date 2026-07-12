import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeAll, describe, expect, it, vi } from "vitest";
import type { Employee } from "../api";
import { RoleChangeDialog } from "./RoleChangeDialog";

const employee: Employee = {
  id: "employee-1",
  name: "Maya Patel",
  email: "maya@example.com",
  role: "EMPLOYEE",
  status: "ACTIVE",
  departmentId: null,
  department: null,
};

beforeAll(() => {
  HTMLDialogElement.prototype.showModal = function showModal() {
    this.open = true;
  };
  HTMLDialogElement.prototype.close = function close() {
    this.open = false;
  };
});

describe("RoleChangeDialog", () => {
  it("requires the employee email before granting admin access", async () => {
    const user = userEvent.setup();
    const onConfirm = vi.fn();

    render(
      <RoleChangeDialog
        employee={employee}
        loading={false}
        error={null}
        onClose={vi.fn()}
        onConfirm={onConfirm}
      />,
    );

    await user.selectOptions(screen.getByLabelText("New employee role"), "ADMIN");
    const confirmButton = screen.getByRole("button", { name: "Grant admin access" });
    expect(confirmButton).toBeDisabled();

    await user.type(screen.getByLabelText("Employee email"), " MAYA@EXAMPLE.COM ");
    expect(confirmButton).toBeEnabled();
    await user.click(confirmButton);

    expect(onConfirm).toHaveBeenCalledWith("ADMIN");
  });

  it("does not submit an unchanged role", () => {
    render(
      <RoleChangeDialog
        employee={employee}
        loading={false}
        error={null}
        onClose={vi.fn()}
        onConfirm={vi.fn()}
      />,
    );

    expect(screen.getByRole("button", { name: "Change role" })).toBeDisabled();
  });
});
