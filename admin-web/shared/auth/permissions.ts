export const ADMIN_PERMISSIONS = [
  "analytics.read",
  "users.read",
  "users.manage",
  "workers.read",
  "workers.manage",
  "orders.read",
  "orders.manage",
  "reviews.read",
  "reviews.manage",
  "reports.read",
  "reports.manage",
  "support.read",
  "support.manage",
  "content.read",
  "content.manage",
  "notifications.read",
  "notifications.manage",
  "admins.read",
  "admins.manage",
  "super_admin.manage"
] as const;

export type AdminPermission = typeof ADMIN_PERMISSIONS[number];

export type AdminSessionLike = {
  role: string;
  permissions: string[];
};

export function isSuperAdmin(session?: AdminSessionLike | null) {
  return session?.role === "super_admin";
}

export function hasPermission(session: AdminSessionLike | null | undefined, permission: AdminPermission) {
  if (!session) return false;
  if (isSuperAdmin(session)) return true;
  return session.permissions.includes(permission);
}
