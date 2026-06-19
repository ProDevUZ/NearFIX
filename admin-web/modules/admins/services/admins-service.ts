import { apiClient, getAdminToken } from "@/services/api-client";
import type { AdminPermission } from "@/shared/auth/permissions";
import type { CreateAdminInput, ManagedAdmin } from "../types/admin";

function requireToken() {
  const token = getAdminToken();
  if (!token) throw new Error("Admin token is missing");
  return token;
}

export async function getAdmins(): Promise<ManagedAdmin[]> {
  const payload = await apiClient<{ ok: boolean; admins: ManagedAdmin[] }>("/admin/admins", {
    token: requireToken()
  });
  return payload.admins;
}

export async function createAdmin(input: CreateAdminInput): Promise<ManagedAdmin> {
  const payload = await apiClient<{ ok: boolean; admin: ManagedAdmin }>("/admin/admins", {
    method: "POST",
    token: requireToken(),
    body: JSON.stringify(input)
  });
  return payload.admin;
}

export async function setAdminEnabled(adminId: string, enabled: boolean): Promise<ManagedAdmin> {
  const payload = await apiClient<{ ok: boolean; admin: ManagedAdmin }>(
    `/admin/admins/${adminId}/${enabled ? "enable" : "disable"}`,
    {
      method: "PATCH",
      token: requireToken()
    }
  );
  return payload.admin;
}

export async function grantAdminPermission(adminId: string, permission: AdminPermission): Promise<ManagedAdmin> {
  const payload = await apiClient<{ ok: boolean; admin: ManagedAdmin }>(`/admin/admins/${adminId}/permissions`, {
    method: "POST",
    token: requireToken(),
    body: JSON.stringify({ permission })
  });
  return payload.admin;
}

export async function revokeAdminPermission(adminId: string, permission: AdminPermission): Promise<ManagedAdmin> {
  const payload = await apiClient<{ ok: boolean; admin: ManagedAdmin }>(
    `/admin/admins/${adminId}/permissions/${encodeURIComponent(permission)}`,
    {
      method: "DELETE",
      token: requireToken()
    }
  );
  return payload.admin;
}
