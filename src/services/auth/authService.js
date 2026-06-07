import { apiRequest, httpRequest } from "../api/client";

export async function requestSmsCode(phone, role) {
  return apiRequest(async () => ({
    ok: true,
    message: "Auth integration is planned for the next stage.",
    phone,
    role
  }));
}

export async function loginWithPhoneApi(phone, name, code) {
  return apiRequest(async () => {
    const payload = await httpRequest("/auth/phone", {
      method: "POST",
      body: {
        phone,
        ...(name ? { name } : {}),
        ...(code ? { code } : {})
      }
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

export async function verifySmsCode(phone, code) {
  return apiRequest(async () => ({
    ok: code.length >= 4,
    phone,
    sessionToken: null
  }));
}

export async function getCurrentUser() {
  return apiRequest(async () => ({
    ok: false,
    user: null
  }));
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
