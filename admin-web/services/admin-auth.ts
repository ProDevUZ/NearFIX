import { apiClient } from "./api-client";

export type AdminLoginResponse = {
  ok: boolean;
  token: string;
  user: {
    id: string;
    phone: string;
    name: string | null;
    role: string;
    sessionVersion: number;
  };
};

export async function loginAdmin(phone: string) {
  return apiClient<AdminLoginResponse>("/auth/phone", {
    method: "POST",
    body: JSON.stringify({ phone, code: "3243" })
  });
}

export async function fetchAdminMe(token: string) {
  return apiClient<{ ok: boolean; user: AdminLoginResponse["user"] }>("/auth/me", {
    token
  });
}
