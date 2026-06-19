import { apiClient } from "./api-client";

export type AdminLoginResponse = {
  ok: boolean;
  token: string;
  expiresIn: number;
  user: {
    id: string;
    username: string;
    name: string | null;
    role: string;
    permissions: string[];
    sessionVersion: number;
  };
};

export async function loginAdmin(username: string, password: string) {
  return apiClient<AdminLoginResponse>("/admin/auth/login", {
    method: "POST",
    body: JSON.stringify({ username, password })
  });
}

export async function fetchAdminMe(token: string) {
  return apiClient<{ ok: boolean; user: AdminLoginResponse["user"] }>("/admin/auth/me", {
    token
  });
}
