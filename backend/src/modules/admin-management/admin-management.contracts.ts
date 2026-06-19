import { z } from "zod";
import { ADMIN_PERMISSIONS } from "../auth/permissions.js";

export const createAdminSchema = z.object({
  phone: z.string().min(7).max(32),
  name: z.string().min(2).max(120).optional(),
  permissions: z.array(z.enum(ADMIN_PERMISSIONS)).optional()
});

export const adminPermissionSchema = z.object({
  permission: z.enum(ADMIN_PERMISSIONS)
});
