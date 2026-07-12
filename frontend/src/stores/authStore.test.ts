import { afterEach, describe, expect, it } from "vitest";
import type { AuthUser } from "../features/auth/types";
import { useAuthStore } from "./authStore";

const user: AuthUser = { id: "user-1", employeeId: "employee-1", name: "Ada Admin", email: "ada@example.com", role: "ADMIN" };

afterEach(() => {
  useAuthStore.setState({ token: null, user: null, hasHydrated: true });
  useAuthStore.persist.clearStorage();
});

describe("auth store", () => {
  it("sets and clears a session", () => {
    useAuthStore.getState().setSession("jwt-token", user);
    expect(useAuthStore.getState()).toMatchObject({ token: "jwt-token", user });
    useAuthStore.getState().clearSession();
    expect(useAuthStore.getState()).toMatchObject({ token: null, user: null });
  });

  it("persists only token and user", () => {
    useAuthStore.getState().setHasHydrated(true);
    useAuthStore.getState().setSession("jwt-token", user);
    const persisted = JSON.parse(localStorage.getItem("assetflow-auth") ?? "{}") as { state?: Record<string, unknown> };
    expect(persisted.state).toMatchObject({ token: "jwt-token", user });
    expect(persisted.state).not.toHaveProperty("hasHydrated");
    expect(persisted.state).not.toHaveProperty("setSession");
  });
});
