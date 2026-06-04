import { apiClient, getAdminToken } from "@/services/api-client";
import { dashboardSummary } from "@/services/mock-data";

export async function getDashboardSummary() {
  const token = getAdminToken();
  if (!token) return dashboardSummary;

  const payload = await apiClient<{ ok: boolean; summary: typeof dashboardSummary }>("/admin/dashboard", { token });
  return payload.summary;
}
