import { apiRequest, httpRequest } from "../api/client";

export async function requestOtp(phone) {
  return apiRequest(async () => {
    const payload = await httpRequest("/auth/otp/request", {
      method: "POST",
      body: { phone }
    });

    return {
      ok: true,
      expiresIn: payload.expiresIn,
      resendIn: payload.resendIn
    };
  });
}

export async function verifyOtp(phone, code) {
  return apiRequest(async () => {
    const payload = await httpRequest("/auth/otp/verify", {
      method: "POST",
      body: { phone, code }
    });

    return {
      ok: true,
      token: payload.token,
      accessToken: payload.accessToken,
      refreshToken: payload.refreshToken,
      user: payload.user
    };
  });
}

export async function updateCurrentUserApi(token, profile) {
  return apiRequest(async () => {
    const payload = await httpRequest("/auth/me", {
      method: "PATCH",
      token,
      body: profile
    });

    return {
      ok: true,
      user: payload.user
    };
  });
}

export async function getCurrentUserApi(token) {
  return apiRequest(async () => {
    const payload = await httpRequest("/auth/me", { token });

    return {
      ok: true,
      user: payload.user
    };
  });
}

export async function refreshAccessTokenApi(refreshToken) {
  return apiRequest(async () => {
    const payload = await httpRequest("/auth/refresh", {
      method: "POST",
      body: { refreshToken }
    });

    return {
      ok: true,
      token: payload.token,
      accessToken: payload.accessToken,
      user: payload.user
    };
  });
}

export async function logoutApi(token, pushToken) {
  return apiRequest(async () => {
    if (pushToken) {
      await httpRequest("/notifications/push-token", {
        method: "DELETE",
        token,
        body: { token: pushToken }
      }).catch(() => null);
    }

    await httpRequest("/auth/logout", {
      method: "POST",
      token
    });

    return { ok: true };
  });
}

export async function deleteCurrentUserApi(token) {
  return apiRequest(async () => {
    const payload = await httpRequest("/auth/me", {
      method: "DELETE",
      token
    });

    return {
      ok: true,
      deleted: payload.deleted,
      deletedAt: payload.deletedAt
    };
  });
}
