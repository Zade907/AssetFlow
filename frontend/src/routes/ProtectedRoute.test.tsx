import { render, screen } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { AuthUser } from "../features/auth/types";
import { useAuthStore } from "../stores/authStore";
import { ProtectedRoute } from "./ProtectedRoute";

const { me } = vi.hoisted(() => ({ me: vi.fn() }));
vi.mock("../features/auth/api", () => ({ authApi: { me } }));

const user: AuthUser = { id: "user-1", name: "Ada Admin", email: "ada@example.com", role: "ADMIN" };

function renderRoute(initialEntry = "/private") {
  render(
    <MemoryRouter initialEntries={[initialEntry]}>
      <Routes>
        <Route path="/login" element={<p>Login page</p>} />
        <Route path="/private" element={<ProtectedRoute><p>Private content</p></ProtectedRoute>} />
      </Routes>
    </MemoryRouter>,
  );
}

beforeEach(() => {
  me.mockReset();
  useAuthStore.setState({ token: null, user: null, hasHydrated: true });
});

describe("ProtectedRoute", () => {
  it("redirects a signed-out visitor", async () => {
    renderRoute();
    expect(await screen.findByText("Login page")).toBeInTheDocument();
  });

  it("verifies and renders a restored session", async () => {
    me.mockResolvedValue(user);
    useAuthStore.setState({ token: "jwt-token", user, hasHydrated: true });
    renderRoute();
    expect(await screen.findByText("Private content")).toBeInTheDocument();
    expect(me).toHaveBeenCalledOnce();
  });

  it("clears and redirects an invalid restored session", async () => {
    me.mockRejectedValue(new Error("Unauthorized"));
    useAuthStore.setState({ token: "expired-token", user, hasHydrated: true });
    renderRoute();
    expect(await screen.findByText("Login page")).toBeInTheDocument();
    expect(useAuthStore.getState().token).toBeNull();
  });
});
