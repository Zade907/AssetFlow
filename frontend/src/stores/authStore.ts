import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import type { AuthUser } from "../features/auth/types";

type AuthState = {
  token: string | null;
  user: AuthUser | null;
  hasHydrated: boolean;
  setSession: (token: string, user: AuthUser) => void;
  updateUser: (user: AuthUser) => void;
  clearSession: () => void;
  setHasHydrated: (hasHydrated: boolean) => void;
};

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      token: null,
      user: null,
      hasHydrated: false,
      setSession: (token, user) => set({ token, user }),
      updateUser: (user) => set({ user }),
      clearSession: () => set({ token: null, user: null }),
      setHasHydrated: (hasHydrated) => set({ hasHydrated }),
    }),
    {
      name: "assetflow-auth",
      storage: createJSONStorage(() => localStorage),
      version: 1,
      partialize: (state) => ({ token: state.token, user: state.user }),
      onRehydrateStorage: () => (state) => state?.setHasHydrated(true),
    },
  ),
);
