import { Prisma } from "@prisma/client";
import { prisma } from "../../db/prisma.js";

export type AdminAuditActorType = "ENV_ADMIN" | "ADMIN_ACCOUNT";

type WriteAdminAuditInput = {
  actorType: AdminAuditActorType;
  actorAdminId?: string | null;
  action: string;
  targetType?: string | null;
  targetId?: string | null;
  metadata?: Record<string, unknown>;
  ipAddress?: string | null;
  userAgent?: string | null;
};

function sanitizeValue(value: unknown): unknown {
  if (Array.isArray(value)) return value.map((item) => sanitizeValue(item));

  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value).map(([key, nestedValue]) => {
        const normalizedKey = key.toLowerCase();
        if (
          normalizedKey.includes("password") ||
          normalizedKey.includes("token") ||
          normalizedKey.includes("secret") ||
          normalizedKey.includes("authorization")
        ) {
          return [key, "[redacted]"];
        }

        return [key, sanitizeValue(nestedValue)];
      })
    );
  }

  return value;
}

export async function writeAdminAuditLog(input: WriteAdminAuditInput) {
  try {
    await prisma.adminAuditLog.create({
      data: {
        actorType: input.actorType,
        actorAdminId: input.actorAdminId || null,
        action: input.action,
        targetType: input.targetType || null,
        targetId: input.targetId || null,
        metadata: input.metadata ? sanitizeValue(input.metadata) as Prisma.InputJsonValue : undefined,
        ipAddress: input.ipAddress || null,
        userAgent: input.userAgent || null
      }
    });
  } catch (error) {
    console.warn(`[admin-audit] failed to write ${input.action}: ${error instanceof Error ? error.message : "unknown"}`);
  }
}
