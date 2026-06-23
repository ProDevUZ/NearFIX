import { OtpPurpose, Prisma, UserRole, UserStatus } from "@prisma/client";
import { env } from "../../config/env.js";
import { prisma } from "../../db/prisma.js";
import { normalizePhone } from "../../utils/phone.js";
import { otpService, type OtpService } from "./otp.service.js";
import { hashPassword, verifyPassword } from "./password.js";
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

const defaultAuthProvider = createAuthProvider();

function maskPhone(phone: string) {
  return `${phone.slice(0, 4)}***${phone.slice(-3)}`;
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

async function createSessionForUser(user: UserWithPermissions) {
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

function authTimingResponse(service: OtpService) {
  return {
    ok: true,
    success: true,
    expiresIn: service.ttlSeconds,
    resendIn: service.resendCooldownSeconds
  };
}

function phoneAlreadyRegisteredError() {
  return Object.assign(new Error("Phone number is already registered"), {
    status: 409,
    code: "PHONE_ALREADY_REGISTERED"
  });
}

function invalidCredentialsError() {
  return Object.assign(new Error("Invalid phone or password"), {
    status: 401,
    code: "INVALID_CREDENTIALS"
  });
}

async function deliverOtp(
  phone: string,
  purpose: OtpPurpose,
  authProvider: AuthProvider,
  service: OtpService
) {
  const { challenge, code } = await service.createChallenge(phone, purpose);

  try {
    const deliveryResult = await authProvider.sendOtp(phone, code);
    await service.setProviderMessageId(challenge.id, deliveryResult?.providerMessageId);
  } catch (error) {
    await service.consumeChallenge(challenge.id);
    throw Object.assign(new Error("SMS delivery failed"), {
      status: 502,
      code: "SMS_SEND_FAILED",
      cause: error
    });
  }
}

export async function requestRegistrationOtp(
  input: { phone: string },
  authProvider: AuthProvider = defaultAuthProvider,
  service: OtpService = otpService
) {
  const phone = normalizePhone(input.phone);
  const existingUser = await prisma.user.findUnique({
    where: { phone },
    select: { id: true }
  });

  if (existingUser) {
    throw phoneAlreadyRegisteredError();
  }

  await deliverOtp(phone, OtpPurpose.REGISTER, authProvider, service);
  return authTimingResponse(service);
}

export async function registerWithOtp(
  input: { phone: string; code: string; password: string },
  service: OtpService = otpService
) {
  const phone = normalizePhone(input.phone);
  const existingUser = await prisma.user.findUnique({
    where: { phone },
    select: { id: true }
  });

  if (existingUser) {
    throw phoneAlreadyRegisteredError();
  }

  const passwordHash = await hashPassword(input.password);
  await service.verifyChallenge(phone, OtpPurpose.REGISTER, input.code);

  let user: UserWithPermissions;
  try {
    user = await prisma.user.create({
      data: {
        phone,
        passwordHash,
        passwordSetAt: new Date(),
        role: UserRole.CLIENT
      },
      include: {
        adminPermissions: true
      }
    });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      throw phoneAlreadyRegisteredError();
    }
    throw error;
  }

  return createSessionForUser(user);
}

export async function loginWithPassword(input: { phone: string; password: string }) {
  const phone = normalizePhone(input.phone);
  const user = await prisma.user.findUnique({
    where: { phone },
    include: {
      adminPermissions: true
    }
  });

  const passwordMatches = await verifyPassword(input.password, user?.passwordHash);

  if (!user || !user.passwordHash || !passwordMatches) {
    throw invalidCredentialsError();
  }

  return createSessionForUser(user);
}

export async function requestForgotPasswordOtp(
  input: { phone: string },
  authProvider: AuthProvider = defaultAuthProvider,
  service: OtpService = otpService
) {
  const phone = normalizePhone(input.phone);
  const user = await prisma.user.findUnique({
    where: { phone },
    select: {
      status: true
    }
  });

  if (user?.status === UserStatus.ACTIVE) {
    try {
      await deliverOtp(phone, OtpPurpose.PASSWORD_RESET, authProvider, service);
    } catch (error) {
      const code = typeof error === "object" && error && "code" in error ? String(error.code) : "OTP_REQUEST_FAILED";
      console.warn(`[password-reset-otp] ${maskPhone(phone)} request not sent: ${code}`);
    }
  }

  return authTimingResponse(service);
}

export async function resetPasswordWithOtp(
  input: { phone: string; code: string; newPassword: string },
  service: OtpService = otpService
) {
  const phone = normalizePhone(input.phone);
  const passwordHash = await hashPassword(input.newPassword);

  await service.verifyChallenge(phone, OtpPurpose.PASSWORD_RESET, input.code);

  const user = await prisma.user.findUnique({
    where: { phone },
    select: {
      id: true,
      status: true
    }
  });

  if (!user || user.status !== UserStatus.ACTIVE) {
    throw Object.assign(new Error("Password reset challenge is invalid"), {
      status: 401,
      code: "OTP_INVALID"
    });
  }

  await prisma.$transaction([
    prisma.user.update({
      where: { id: user.id },
      data: {
        passwordHash,
        passwordSetAt: new Date(),
        sessionVersion: {
          increment: 1
        }
      }
    }),
    prisma.session.updateMany({
      where: {
        userId: user.id,
        revoked: false
      },
      data: {
        revoked: true
      }
    })
  ]);

  return {
    ok: true,
    passwordUpdated: true
  };
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
