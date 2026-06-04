import { apiClient, getAdminToken } from "@/services/api-client";
import { users } from "@/services/mock-data";
import type { AdminUser, City, UserRole } from "@/contracts/admin";

function mapRole(role: string): UserRole {
  return role.toLowerCase() === "provider" ? "provider" : "client";
}

export async function getUsers(): Promise<AdminUser[]> {
  const token = getAdminToken();
  if (!token) return users;

  const payload = await apiClient<{ ok: boolean; users: any[] }>("/admin/users", { token });
  return payload.users.map((user) => ({
    id: user.id,
    name: user.name || user.phone,
    phone: user.phone,
    role: mapRole(String(user.role || "client")),
    city: (user.cityId || "Tashkent") as City,
    registeredAt: new Date(user.createdAt).toLocaleDateString("uz-UZ")
  }));
}
