import { apiRequest, httpRequest } from "../api/client";

function authSessionResult(payload) {
  return {
    ok: true,
    token: payload.token,
    accessToken: payload.accessToken,
    refreshToken: payload.refreshToken,
    user: payload.user
  };
}

function otpRequestResult(payload) {
  return {
    ok: true,
    expiresIn: payload.expiresIn,
    resendIn: payload.resendIn
  };
}

export async function loginWithPassword(phone, password) {
  return apiRequest(async () => {
    const payload = await httpRequest("/auth/login", {
      method: "POST",
      body: { phone, password }
    });

    return authSessionResult(payload);
  });
}

export async function requestRegisterOtp(phone) {
  return apiRequest(async () => {
    const payload = await httpRequest("/auth/register/otp/request", {
      method: "POST",
      body: { phone }
    });

    return otpRequestResult(payload);
  });
}

export async function verifyRegisterOtp(phone, code, password) {
  return apiRequest(async () => {
    const payload = await httpRequest("/auth/register/otp/verify", {
      method: "POST",
      body: { phone, code, password }
    });

    return authSessionResult(payload);
  });
}

export async function requestForgotPasswordOtp(phone) {
  return apiRequest(async () => {
    const payload = await httpRequest("/auth/password/forgot/request", {
      method: "POST",
      body: { phone }
    });

    return otpRequestResult(payload);
  });
}

export async function verifyForgotPasswordOtp(phone, code, newPassword) {
  return apiRequest(async () => {
    const payload = await httpRequest("/auth/password/forgot/verify", {
      method: "POST",
      body: { phone, code, newPassword }
    });

    return {
      ok: true,
      passwordUpdated: payload.passwordUpdated
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
