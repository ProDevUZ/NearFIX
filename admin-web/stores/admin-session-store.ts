"use client";

import { create } from "zustand";
import { fetchAdminMe, loginAdmin } from "@/services/admin-auth";

type AdminSession = {
  id: string;
  username: string;
  name: string | null;
  role: string;
  permissions: string[];
  token: string;
};

type AdminSessionState = {
  session: AdminSession | null;
  isSessionReady: boolean;
  setSession: (session: AdminSession | null) => void;
  hydrateSession: () => Promise<void>;
  login: (username: string, password: string) => Promise<{ ok: boolean; message?: string }>;
  logout: () => void;
};

export const useAdminSessionStore = create<AdminSessionState>((set, get) => ({
  session: null,
  isSessionReady: false,
  setSession: (session) => set({ session, isSessionReady: true }),
  hydrateSession: async () => {
    const token = window.localStorage.getItem("nearfix-admin-token");
    if (!token) {
      set({ session: null, isSessionReady: true });
      return;
    }

    try {
      const result = await fetchAdminMe(token);
      if (!["admin", "super_admin"].includes(result.user.role)) {
        window.localStorage.removeItem("nearfix-admin-token");
        set({ session: null, isSessionReady: true });
        return;
      }

      set({
        session: {
          id: result.user.id,
          username: result.user.username,
          name: result.user.name,
          role: result.user.role,
          permissions: result.user.permissions || [],
          token
        },
        isSessionReady: true
      });
    } catch {
      window.localStorage.removeItem("nearfix-admin-token");
      set({ session: null, isSessionReady: true });
    }
  },
  login: async (username, password) => {
    try {
      const result = await loginAdmin(username, password);
      if (!["admin", "super_admin"].includes(result.user.role)) {
        return { ok: false, message: "Admin role required" };
      }

      window.localStorage.setItem("nearfix-admin-token", result.token);
      set({
        session: {
          id: result.user.id,
          username: result.user.username,
          name: result.user.name,
          role: result.user.role,
          permissions: result.user.permissions || [],
          token: result.token
        },
        isSessionReady: true
      });
      return { ok: true };
    } catch (error) {
      const message = error instanceof Error ? error.message : "Login failed";
      return { ok: false, message };
    }
  },
  logout: () => {
    window.localStorage.removeItem("nearfix-admin-token");
    get().setSession(null);
  }
}));
