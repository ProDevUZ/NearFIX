import { Platform } from "react-native";
import * as Notifications from "expo-notifications";
import { apiRequest } from "../api/client";
import { httpAuthRequest } from "../api/authenticatedClient";

export async function fetchNotificationsApi(token) {
  return apiRequest(async () => {
    const payload = await httpAuthRequest("/notifications", { token });
    return {
      ok: true,
      notifications: payload.notifications || []
    };
  });
}

export async function markNotificationReadApi(token, notificationId) {
  return apiRequest(async () => {
    const payload = await httpAuthRequest(`/notifications/${notificationId}/read`, {
      method: "PATCH",
      token
    });

    return {
      ok: true,
      notification: payload.notification
    };
  });
}

export async function savePushTokenApi(token, pushToken) {
  return apiRequest(async () => {
    const payload = await httpAuthRequest("/notifications/push-token", {
      method: "POST",
      token,
      body: {
        token: pushToken,
        platform: Platform.OS
      }
    });

    return {
      ok: true,
      token: payload.token
    };
  });
}

export async function registerPushTokenApi(token) {
  return apiRequest(async () => {
    const permission = await Notifications.requestPermissionsAsync();
    if (!permission.granted) {
      return { ok: false, message: "Push notification permission denied" };
    }

    const result = await Notifications.getExpoPushTokenAsync();
    const pushToken = result.data;
    await savePushTokenApi(token, pushToken);

    return {
      ok: true,
      pushToken
    };
  });
}

export async function fetchUnreadNotificationCountApi(token) {
  const result = await fetchNotificationsApi(token);
  if (!result.ok) return result;

  return {
    ok: true,
    count: result.notifications.filter((notification) => !notification.readAt).length
  };
}
