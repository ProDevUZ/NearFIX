import { Prisma, UserRole } from "@prisma/client";
import { env } from "../../config/env.js";
import { prisma } from "../../db/prisma.js";
import { normalizePhone } from "../../utils/phone.js";
import { FakeAuthProvider } from "./providers/fake.provider.js";
import type { AuthProvider } from "./providers/auth-provider.interface.js";
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

const defaultAuthProvider = new FakeAuthProvider();

function isTestOtpAllowed() {
  return env.NODE_ENV !== "production";
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

  const user = await prisma.user.upsert({
    where: { phone },
    update: input.name ? { name: input.name } : {},
    create: {
      phone,
      name: input.name,
      role: UserRole.CLIENT
    }
  });

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

  const responseUser = {
    id: user.id,
    phone: user.phone,
    name: user.name,
    role: user.role.toLowerCase(),
    sessionVersion: user.sessionVersion
  };

  return {
    accessToken,
    refreshToken,
    token: accessToken,
    user: responseUser
  };
}

export async function getSessionUser(rawToken: string) {
  const payload = verifyAccessToken(rawToken);

  const session = await prisma.session.findUnique({
    where: { id: payload.sessionId },
    include: { user: true }
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

  return {
    id: session.user.id,
    sessionId: session.id,
    phone: session.user.phone,
    name: session.user.name,
    role: session.user.role.toLowerCase(),
    sessionVersion: session.user.sessionVersion
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
    }
  });

  return {
    id: user.id,
    phone: user.phone,
    name: user.name,
    role: user.role.toLowerCase(),
    sessionVersion: user.sessionVersion
  };
}

export async function refreshAccessToken(rawRefreshToken: string) {
  const refreshTokenHash = hashRefreshToken(rawRefreshToken);

  const session = await prisma.session.findUnique({
    where: { refreshToken: refreshTokenHash },
    include: { user: true }
  });

  if (!session || session.revoked || session.expiresAt <= new Date()) {
    throw Object.assign(new Error("Refresh session is expired or revoked"), {
      status: 401,
      code: "REFRESH_SESSION_INVALID"
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
    user: {
      id: session.user.id,
      phone: session.user.phone,
      name: session.user.name,
      role: session.user.role.toLowerCase(),
      sessionVersion: session.user.sessionVersion
    }
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
