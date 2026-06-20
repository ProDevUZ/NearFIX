import { create } from "zustand";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { createJSONStorage, persist } from "zustand/middleware";
import {
  deleteCurrentUserApi,
  verifyOtp as verifyOtpApi,
  logoutApi,
  getCurrentUserApi,
  refreshAccessTokenApi,
  updateCurrentUserApi
} from "../services/auth";

const PUSH_TOKEN_STORAGE_KEY = "nearfix-push-token";

function toSession(apiResult, user = apiResult.user) {
  return {
    token: apiResult.accessToken || apiResult.token,
    refreshToken: apiResult.refreshToken,
    userId: user.id,
    phone: user.phone,
    name: user.name,
    role: user.role,
    sessionVersion: user.sessionVersion
  };
}

export const useAuthStore = create(
  persist(
    (set, get) => ({
  session: null,
  invalidation: null,
  hasHydrated: false,
  setHasHydrated: (value) => set({ hasHydrated: value }),
  verifyOtp: async (phone, code, name) => {
    const apiResult = await verifyOtpApi(phone || "+998", code);
    if (!apiResult.ok) return apiResult;

    let user = apiResult.user;
    const accessToken = apiResult.accessToken || apiResult.token;

    if (name && name !== user.name) {
      const profileResult = await updateCurrentUserApi(accessToken, { name });
      if (profileResult.ok) {
        user = profileResult.user;
      }
    }

    set({
      session: toSession(apiResult, user),
      invalidation: null
    });

    return { ok: true, role: user.role, source: "api" };
  },
  updateProfile: async (profile) => {
    const current = get().session;
    if (!current?.token) return { ok: false, message: "No API session token" };

    const result = await updateCurrentUserApi(current.token, profile);
    if (!result.ok) return result;

    set({
      session: {
        ...current,
        name: result.user.name,
        phone: result.user.phone,
        role: result.user.role,
        sessionVersion: result.user.sessionVersion
      }
    });

    return { ok: true, user: result.user };
  },
  refreshSession: async () => {
    const current = get().session;
    if (!current?.token) return { ok: false };

    if (current.refreshToken) {
      const refreshResult = await refreshAccessTokenApi(current.refreshToken);

      if (refreshResult.ok) {
        set({
          session: {
            ...current,
            token: refreshResult.token,
            userId: refreshResult.user.id,
            phone: refreshResult.user.phone,
            name: refreshResult.user.name,
            role: refreshResult.user.role,
            sessionVersion: refreshResult.user.sessionVersion
          }
        });
        return { ok: true, token: refreshResult.token };
      }

      if (refreshResult.code === "REFRESH_SESSION_INVALID") {
        set({
          session: null,
          invalidation: {
            reason: "session_expired",
            previousRole: current.role,
            message: "Sessiya muddati tugagan. Qayta kiring."
          }
        });
      }

      return refreshResult;
    }

    const result = await getCurrentUserApi(current.token);
    if (result.ok) {
      set({
        session: {
          ...current,
          userId: result.user.id,
          phone: result.user.phone,
          name: result.user.name,
          role: result.user.role,
          sessionVersion: result.user.sessionVersion
        }
      });
      return { ok: true };
    }

    if (result.code === "SESSION_VERSION_MISMATCH" || result.code === "SESSION_INVALID") {
      set({
        session: null,
        invalidation: {
          reason: "role_changed",
          previousRole: current.role,
          message: "Profilingiz yangilandi. Xavfsizlik sababli qayta kirish talab qilinadi."
        }
      });
    }

    return result;
  },
  logout: async () => {
    const current = get().session;
    if (current?.token) {
      const pushToken = await AsyncStorage.getItem(PUSH_TOKEN_STORAGE_KEY);
      await logoutApi(current.token, pushToken);
      if (pushToken) await AsyncStorage.removeItem(PUSH_TOKEN_STORAGE_KEY);
    }

    set({
      session: null
    });
  },
  deleteAccount: async () => {
    const current = get().session;
    if (!current?.token) return { ok: false, message: "No API session token" };

    const result = await deleteCurrentUserApi(current.token);
    if (!result.ok) return result;

    await AsyncStorage.removeItem(PUSH_TOKEN_STORAGE_KEY);
    set({
      session: null,
      invalidation: null
    });

    return result;
  },
  invalidateSessionForRoleChange: (nextRole) => {
    const current = get().session;
    set({
      session: null,
      invalidation: {
        reason: "role_changed",
        nextRole,
        previousRole: current?.role,
        message: "Profilingiz yangilandi. Xavfsizlik sababli qayta kirish talab qilinadi."
      }
    });
  },
  acknowledgeInvalidation: () => set({ invalidation: null })
    }),
    {
      name: "nearfix-auth-session",
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (state) => ({
        session: state.session,
        invalidation: state.invalidation
      }),
      onRehydrateStorage: () => (state) => {
        state?.setHasHydrated(true);
      }
    }
  )
);
