"use client";

import { create } from "zustand";
import { fetchAdminMe, loginAdmin } from "@/services/admin-auth";

type AdminSession = {
  id: string;
  phone: string;
  name: string | null;
  role: string;
  token: string;
};

type AdminSessionState = {
  session: AdminSession | null;
  isSessionReady: boolean;
  setSession: (session: AdminSession | null) => void;
  hydrateSession: () => Promise<void>;
  loginWithPhone: (phone: string) => Promise<{ ok: boolean; message?: string }>;
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
      if (result.user.role !== "admin") {
        window.localStorage.removeItem("nearfix-admin-token");
        set({ session: null, isSessionReady: true });
        return;
      }

      set({
        session: {
          id: result.user.id,
          phone: result.user.phone,
          name: result.user.name,
          role: result.user.role,
          token
        },
        isSessionReady: true
      });
    } catch {
      window.localStorage.removeItem("nearfix-admin-token");
      set({ session: null, isSessionReady: true });
    }
  },
  loginWithPhone: async (phone) => {
    const result = await loginAdmin(phone);
    if (result.user.role !== "admin") {
      return { ok: false, message: "Admin role required" };
    }

    window.localStorage.setItem("nearfix-admin-token", result.token);
    set({
      session: {
        id: result.user.id,
        phone: result.user.phone,
        name: result.user.name,
        role: result.user.role,
        token: result.token
      },
      isSessionReady: true
    });
    return { ok: true };
  },
  logout: () => {
    window.localStorage.removeItem("nearfix-admin-token");
    get().setSession(null);
  }
}));
