import { ApiClientError, apiClient, getAdminToken } from "@/services/api-client";
import type {
  CreateAdminInput,
  ManagedAdmin,
  ReplaceAdminPermissionsInput,
  ResetAdminPasswordInput,
  UpdateAdminInput
} from "../types/admin";

function requireToken() {
  const token = getAdminToken();
  if (!token) throw new Error("Admin token is missing");
  return token;
}

export function getAdminErrorMessage(error: unknown, fallback: string) {
  if (!(error instanceof ApiClientError)) return error instanceof Error ? error.message : fallback;

  switch (error.code) {
    case "ADMIN_UNAUTHORIZED":
      return "Sessiya tugagan. Qayta kiring.";
    case "ADMIN_DISABLED":
      return "Bu admin akkaunt o'chirilgan.";
    case "ADMIN_ACCESS_DENIED":
    case "PERMISSION_REQUIRED":
    case "SUPER_ADMIN_REQUIRED":
      return "Bu amal uchun ruxsat yetarli emas.";
    case "ADMIN_USERNAME_EXISTS":
      return "Bu username bilan admin allaqachon mavjud.";
    case "ADMIN_PASSWORD_WEAK":
      return "Password xavfsizroq bo'lishi kerak.";
    default:
      if (error.status === 400) return "Kiritilgan ma'lumotlarni tekshiring.";
      return fallback;
  }
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

export async function updateAdmin(adminId: string, input: UpdateAdminInput): Promise<ManagedAdmin> {
  const payload = await apiClient<{ ok: boolean; admin: ManagedAdmin }>(`/admin/admins/${adminId}`, {
    method: "PATCH",
    token: requireToken(),
    body: JSON.stringify(input)
  });
  return payload.admin;
}

export async function resetAdminPassword(
  adminId: string,
  input: ResetAdminPasswordInput
): Promise<ManagedAdmin> {
  const payload = await apiClient<{ ok: boolean; admin: ManagedAdmin }>(`/admin/admins/${adminId}/password`, {
    method: "PATCH",
    token: requireToken(),
    body: JSON.stringify(input)
  });
  return payload.admin;
}

export async function replaceAdminPermissions(
  adminId: string,
  input: ReplaceAdminPermissionsInput
): Promise<ManagedAdmin> {
  const payload = await apiClient<{ ok: boolean; admin: ManagedAdmin }>(`/admin/admins/${adminId}/permissions`, {
    method: "PATCH",
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
