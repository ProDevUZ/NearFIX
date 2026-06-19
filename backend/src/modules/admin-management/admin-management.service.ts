import { UserRole, UserStatus } from "@prisma/client";
import { prisma } from "../../db/prisma.js";
import { normalizePhone } from "../../utils/phone.js";
import { grantAdminPermission, revokeAdminPermission } from "../auth/admin-permission.service.js";
import type { AdminPermission } from "../auth/permissions.js";

type CreateAdminInput = {
  phone: string;
  name?: string;
  permissions?: AdminPermission[];
};

function toAdminUser(user: {
  id: string;
  phone: string;
  name: string | null;
  role: UserRole;
  status: UserStatus;
  createdAt: Date;
  updatedAt: Date;
  adminPermissions: { permission: string }[];
}) {
  return {
    id: user.id,
    phone: user.phone,
    name: user.name,
    role: user.role.toLowerCase(),
    status: user.status.toLowerCase(),
    isActive: user.status === UserStatus.ACTIVE,
    permissions: user.adminPermissions.map((item) => item.permission).sort(),
    createdAt: user.createdAt,
    updatedAt: user.updatedAt
  };
}

async function getManageableAdmin(userId: string) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: { adminPermissions: true }
  });

  if (!user || user.role !== UserRole.ADMIN) {
    throw Object.assign(new Error("Admin user not found"), {
      status: 404,
      code: "ADMIN_NOT_FOUND"
    });
  }

  return user;
}

async function revokeActiveSessions(userId: string) {
  await prisma.session.updateMany({
    where: { userId, revoked: false },
    data: { revoked: true }
  });
}

export async function listAdmins() {
  const admins = await prisma.user.findMany({
    where: {
      role: {
        in: [UserRole.ADMIN, UserRole.SUPER_ADMIN]
      }
    },
    include: {
      adminPermissions: true
    },
    orderBy: [
      { role: "desc" },
      { createdAt: "desc" }
    ]
  });

  return admins.map(toAdminUser);
}

export async function createAdmin(input: CreateAdminInput) {
  const phone = normalizePhone(input.phone);

  const user = await prisma.$transaction(async (tx) => {
    const existing = await tx.user.findUnique({ where: { phone } });

    if (existing?.role === UserRole.SUPER_ADMIN) {
      throw Object.assign(new Error("Super admin cannot be recreated"), {
        status: 409,
        code: "SUPER_ADMIN_EXISTS"
      });
    }

    const admin = await tx.user.upsert({
      where: { phone },
      update: {
        name: input.name?.trim() || existing?.name,
        role: UserRole.ADMIN,
        status: UserStatus.ACTIVE,
        sessionVersion: { increment: 1 }
      },
      create: {
        phone,
        name: input.name?.trim(),
        role: UserRole.ADMIN,
        status: UserStatus.ACTIVE
      }
    });

    await tx.session.updateMany({
      where: { userId: admin.id, revoked: false },
      data: { revoked: true }
    });

    return admin;
  });

  for (const permission of input.permissions || []) {
    await grantAdminPermission(user.id, permission);
  }

  const created = await prisma.user.findUniqueOrThrow({
    where: { id: user.id },
    include: { adminPermissions: true }
  });

  return toAdminUser(created);
}

export async function disableAdmin(userId: string, actorId: string) {
  if (userId === actorId) {
    throw Object.assign(new Error("Admins cannot disable their own account"), {
      status: 400,
      code: "SELF_DISABLE_FORBIDDEN"
    });
  }

  await getManageableAdmin(userId);

  const admin = await prisma.user.update({
    where: { id: userId },
    data: {
      status: UserStatus.BLOCKED,
      sessionVersion: { increment: 1 }
    },
    include: { adminPermissions: true }
  });

  await revokeActiveSessions(userId);
  return toAdminUser(admin);
}

export async function enableAdmin(userId: string) {
  await getManageableAdmin(userId);

  const admin = await prisma.user.update({
    where: { id: userId },
    data: {
      status: UserStatus.ACTIVE,
      sessionVersion: { increment: 1 }
    },
    include: { adminPermissions: true }
  });

  await revokeActiveSessions(userId);
  return toAdminUser(admin);
}

export async function grantPermissionToAdmin(userId: string, permission: AdminPermission) {
  await getManageableAdmin(userId);
  await grantAdminPermission(userId, permission);

  const admin = await prisma.user.findUniqueOrThrow({
    where: { id: userId },
    include: { adminPermissions: true }
  });

  return toAdminUser(admin);
}

export async function revokePermissionFromAdmin(userId: string, permission: AdminPermission) {
  await getManageableAdmin(userId);
  await revokeAdminPermission(userId, permission);

  const admin = await prisma.user.findUniqueOrThrow({
    where: { id: userId },
    include: { adminPermissions: true }
  });

  return toAdminUser(admin);
}
