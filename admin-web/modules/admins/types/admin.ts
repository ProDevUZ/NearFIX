import type { AdminPermission } from "@/shared/auth/permissions";

export type ManagedAdmin = {
  id: string;
  phone: string;
  name: string | null;
  role: "admin" | "super_admin";
  status: string;
  isActive: boolean;
  permissions: AdminPermission[];
  createdAt: string;
  updatedAt: string;
};

export type CreateAdminInput = {
  phone: string;
  name?: string;
  permissions: AdminPermission[];
};
