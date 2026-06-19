import type { RequestHandler } from "express";
import type { AdminPermission } from "../permissions.js";
import { isAdminRole, isSuperAdminRole } from "../permissions.js";

export function requirePermission(permission: AdminPermission): RequestHandler {
  return (request, _response, next) => {
    if (!request.user) {
      next(
        Object.assign(new Error("Unauthorized"), {
          status: 401,
          code: "UNAUTHORIZED"
        })
      );
      return;
    }

    if (isSuperAdminRole(request.user.role)) {
      next();
      return;
    }

    if (!isAdminRole(request.user.role)) {
      next(
        Object.assign(new Error("Forbidden"), {
          status: 403,
          code: "FORBIDDEN"
        })
      );
      return;
    }

    if (!request.user.permissions.includes(permission)) {
      next(
        Object.assign(new Error("Permission required"), {
          status: 403,
          code: "PERMISSION_REQUIRED"
        })
      );
      return;
    }

    next();
  };
}

export function requireSuperAdmin(): RequestHandler {
  return (request, _response, next) => {
    if (!request.user) {
      next(
        Object.assign(new Error("Unauthorized"), {
          status: 401,
          code: "UNAUTHORIZED"
        })
      );
      return;
    }

    if (!isSuperAdminRole(request.user.role)) {
      next(
        Object.assign(new Error("Super admin access required"), {
          status: 403,
          code: "SUPER_ADMIN_REQUIRED"
        })
      );
      return;
    }

    next();
  };
}

export function requireAdminPermissionIfAdmin(permission: AdminPermission): RequestHandler {
  const guard = requirePermission(permission);

  return (request, response, next) => {
    if (request.user && isAdminRole(request.user.role)) {
      guard(request, response, next);
      return;
    }

    next();
  };
}
