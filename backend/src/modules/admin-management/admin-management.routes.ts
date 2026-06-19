import { Router } from "express";
import { authenticate } from "../auth/middleware/auth.middleware.js";
import { requireSuperAdmin } from "../auth/middleware/permission.guard.js";
import { adminPermissionSchema, createAdminSchema } from "./admin-management.contracts.js";
import {
  createAdmin,
  disableAdmin,
  enableAdmin,
  grantPermissionToAdmin,
  listAdmins,
  revokePermissionFromAdmin
} from "./admin-management.service.js";

export const adminManagementRouter = Router();

adminManagementRouter.use(authenticate, requireSuperAdmin());

adminManagementRouter.get("/", async (_request, response, next) => {
  try {
    const admins = await listAdmins();
    response.json({ ok: true, admins });
  } catch (error) {
    next(error);
  }
});

adminManagementRouter.post("/", async (request, response, next) => {
  try {
    const input = createAdminSchema.parse(request.body);
    const admin = await createAdmin(input);
    response.status(201).json({ ok: true, admin });
  } catch (error) {
    next(error);
  }
});

adminManagementRouter.patch("/:userId/disable", async (request, response, next) => {
  try {
    const admin = await disableAdmin(String(request.params.userId), request.user!.id);
    response.json({ ok: true, admin });
  } catch (error) {
    next(error);
  }
});

adminManagementRouter.patch("/:userId/enable", async (request, response, next) => {
  try {
    const admin = await enableAdmin(String(request.params.userId));
    response.json({ ok: true, admin });
  } catch (error) {
    next(error);
  }
});

adminManagementRouter.post("/:userId/permissions", async (request, response, next) => {
  try {
    const input = adminPermissionSchema.parse(request.body);
    const admin = await grantPermissionToAdmin(String(request.params.userId), input.permission);
    response.json({ ok: true, admin });
  } catch (error) {
    next(error);
  }
});

adminManagementRouter.delete("/:userId/permissions/:permission", async (request, response, next) => {
  try {
    const input = adminPermissionSchema.parse({ permission: request.params.permission });
    const admin = await revokePermissionFromAdmin(String(request.params.userId), input.permission);
    response.json({ ok: true, admin });
  } catch (error) {
    next(error);
  }
});
