import { Prisma, UserRole, UserStatus } from "@prisma/client";
import { env } from "../../config/env.js";
import { prisma } from "../../db/prisma.js";
import { normalizePhone } from "../../utils/phone.js";
import { otpService, type OtpService } from "./otp.service.js";
import type { AuthProvider } from "./providers/auth-provider.interface.js";
import { createAuthProvider } from "./providers/provider.factory.js";
import { ADMIN_PERMISSIONS, type AdminPermission, isAdminRole, isSuperAdminRole } from "./permissions.js";
import {
  addDays,
  createAccessToken,
  createRefreshToken,
  hashRefreshToken,
  verifyAccessToken
} from "./session.js";

type LoginInput = {
  phone: string;
  name?: string;
  code?: string;
};

const defaultAuthProvider = createAuthProvider();

function isTestOtpAllowed() {
  return env.NODE_ENV !== "production";
}

type UserWithPermissions = {
  id: string;
  phone: string;
  name: string | null;
  role: UserRole;
  status: UserStatus;
  sessionVersion: number;
  adminPermissions?: { permission: string }[];
};

function permissionsForUser(user: UserWithPermissions): AdminPermission[] {
  if (isSuperAdminRole(user.role)) return [...ADMIN_PERMISSIONS];
  if (!isAdminRole(user.role)) return [];
  return (user.adminPermissions || [])
    .map((item) => item.permission)
    .filter((permission): permission is AdminPermission => (ADMIN_PERMISSIONS as readonly string[]).includes(permission));
}

function toAuthUser(user: UserWithPermissions) {
  return {
    id: user.id,
    phone: user.phone,
    name: user.name,
    role: user.role.toLowerCase(),
    permissions: permissionsForUser(user),
    sessionVersion: user.sessionVersion
  };
}

async function createSessionForPhone(input: { phone: string; name?: string }) {
  const phone = normalizePhone(input.phone);

  const user = await prisma.user.upsert({
    where: { phone },
    update: input.name ? { name: input.name } : {},
    create: {
      phone,
      name: input.name,
      role: UserRole.CLIENT
    },
    include: {
      adminPermissions: true
    }
  });

  if (user.status !== UserStatus.ACTIVE) {
    throw Object.assign(new Error("User account is blocked"), {
      status: 403,
      code: "USER_BLOCKED"
    });
  }

  const refreshToken = createRefreshToken();
  const refreshTokenHash = hashRefreshToken(refreshToken);
  const expiresAt = addDays(new Date(), env.SESSION_TTL_DAYS);

  const session = await prisma.session.create({
    data: {
      userId: user.id,
      refreshToken: refreshTokenHash,
      expiresAt
    }
  });

  const accessToken = createAccessToken({
    userId: user.id,
    sessionId: session.id,
    sessionVersion: user.sessionVersion
  });

  return {
    accessToken,
    refreshToken,
    token: accessToken,
    user: toAuthUser(user)
  };
}

export async function loginOrRegisterWithPhone(input: LoginInput, authProvider: AuthProvider = defaultAuthProvider) {
  const phone = normalizePhone(input.phone);
  const otpCode = input.code || "";

  if (authProvider === defaultAuthProvider && !isTestOtpAllowed()) {
    throw Object.assign(new Error("Invalid OTP code"), {
      status: 401,
      code: "INVALID_OTP"
    });
  }

  await authProvider.sendOtp(phone);

  const isOtpValid = await authProvider.verifyOtp(phone, otpCode);

  if (!isOtpValid) {
    throw Object.assign(new Error("Invalid OTP code"), {
      status: 401,
      code: "INVALID_OTP"
    });
  }

  return createSessionForPhone({ phone, name: input.name });
}

export async function requestOtp(input: { phone: string }, authProvider: AuthProvider = defaultAuthProvider, service: OtpService = otpService) {
  const phone = normalizePhone(input.phone);
  const { challenge, code } = await service.createChallenge(phone);
  const deliveryResult = await authProvider.sendOtp(phone, code);

  await service.setProviderMessageId(challenge.id, deliveryResult?.providerMessageId);

  return {
    success: true,
    expiresIn: service.ttlSeconds,
    resendIn: service.resendCooldownSeconds
  };
}

export async function verifyOtpAndCreateSession(input: { phone: string; code: string }, service: OtpService = otpService) {
  const phone = normalizePhone(input.phone);
  await service.verifyChallenge(phone, input.code);

  return createSessionForPhone({ phone });
}

export async function createAuthSessionForPhone(input: { phone: string; name?: string }) {
  return createSessionForPhone(input);
}


export async function getSessionUser(rawToken: string) {
  const payload = verifyAccessToken(rawToken);

  const session = await prisma.session.findUnique({
    where: { id: payload.sessionId },
    include: { user: { include: { adminPermissions: true } } }
  });

  if (!session || session.revoked || session.expiresAt <= new Date()) {
    throw Object.assign(new Error("Session is expired or revoked"), {
      status: 401,
      code: "SESSION_INVALID"
    });
  }

  if (session.userId !== payload.userId || payload.sessionVersion !== session.user.sessionVersion) {
    throw Object.assign(new Error("Profile updated. Please login again."), {
      status: 401,
      code: "SESSION_VERSION_MISMATCH"
    });
  }

  if (session.user.status !== UserStatus.ACTIVE) {
    throw Object.assign(new Error("User account is blocked"), {
      status: 403,
      code: "USER_BLOCKED"
    });
  }

  return {
    ...toAuthUser(session.user),
    sessionId: session.id,
  };
}

export async function revokeSession(rawToken: string) {
  const payload = verifyAccessToken(rawToken);

  await prisma.session.updateMany({
    where: {
      id: payload.sessionId,
      revoked: false
    },
    data: {
      revoked: true
    }
  });
}

export async function updateCurrentUserProfile(userId: string, input: { name: string }) {
  const user = await prisma.user.update({
    where: { id: userId },
    data: {
      name: input.name.trim()
    },
    include: {
      adminPermissions: true
    }
  });

  return toAuthUser(user);
}

export async function refreshAccessToken(rawRefreshToken: string) {
  const refreshTokenHash = hashRefreshToken(rawRefreshToken);

  const session = await prisma.session.findUnique({
    where: { refreshToken: refreshTokenHash },
    include: { user: { include: { adminPermissions: true } } }
  });

  if (!session || session.revoked || session.expiresAt <= new Date()) {
    throw Object.assign(new Error("Refresh session is expired or revoked"), {
      status: 401,
      code: "REFRESH_SESSION_INVALID"
    });
  }

  if (session.user.status !== UserStatus.ACTIVE) {
    throw Object.assign(new Error("User account is blocked"), {
      status: 403,
      code: "USER_BLOCKED"
    });
  }

  const accessToken = createAccessToken({
    userId: session.userId,
    sessionId: session.id,
    sessionVersion: session.user.sessionVersion
  });

  return {
    accessToken,
    token: accessToken,
    user: toAuthUser(session.user)
  };
}

export async function promoteClientToProvider(userId: string, tx: Prisma.TransactionClient = prisma) {
  const user = await tx.user.update({
    where: { id: userId },
    data: {
      role: UserRole.PROVIDER,
      sessionVersion: {
        increment: 1
      }
    }
  });

  await tx.workerProfile.upsert({
    where: { userId },
    update: {},
    create: {
      userId,
      status: "DRAFT"
    }
  });

  const workerProfile = await tx.workerProfile.findUniqueOrThrow({
    where: { userId }
  });

  await tx.workerAvailability.upsert({
    where: { workerId: workerProfile.id },
    update: {},
    create: {
      workerId: workerProfile.id,
      status: "OFFLINE"
    }
  });

  await tx.session.updateMany({
    where: { userId, revoked: false },
    data: { revoked: true }
  });

  return user;
}
