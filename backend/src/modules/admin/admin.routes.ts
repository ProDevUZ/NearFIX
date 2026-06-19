import { Router } from "express";
import { OrderStatus, type Prisma } from "@prisma/client";
import { prisma } from "../../db/prisma.js";
import { authenticate } from "../auth/middleware/auth.middleware.js";
import { requirePermission } from "../auth/middleware/permission.guard.js";
import { requireRole } from "../auth/middleware/role.guard.js";
import { approveWorkerSchema, promoteProviderSchema, workerModerationSchema } from "./admin.contracts.js";
import {
  approveWorkerProfile,
  rejectWorkerProfile,
  suspendWorkerProfile,
  unsuspendWorkerProfile
} from "../workers/worker.service.js";
import { promoteUserToProvider } from "../users/user-role.service.js";

export const adminRouter = Router();

adminRouter.use(authenticate, requireRole("ADMIN"));

const maxAdminOrdersLimit = 100;

function readQueryValue(value: unknown) {
  const raw = Array.isArray(value) ? value[0] : value;
  return typeof raw === "string" && raw.trim() ? raw.trim() : undefined;
}

function readPositiveInteger(value: unknown, fallback: number, max?: number) {
  const parsed = Number.parseInt(readQueryValue(value) || "", 10);
  if (!Number.isFinite(parsed) || parsed < 1) return fallback;
  return max ? Math.min(parsed, max) : parsed;
}

function parseDate(value: unknown, endOfDay = false) {
  const raw = readQueryValue(value);
  if (!raw) return undefined;

  const date = new Date(raw);
  if (Number.isNaN(date.getTime())) return undefined;
  if (endOfDay) date.setHours(23, 59, 59, 999);
  return date;
}

function mapOrderStatusFilter(status?: string): Prisma.EnumOrderStatusFilter | undefined {
  if (!status) return undefined;

  const normalized = status.toUpperCase();
  if (status.toLowerCase() === "waiting") {
    return { in: [OrderStatus.CREATED, OrderStatus.WAITING_RESPONSE] };
  }
  if (status.toLowerCase() === "active") {
    return { in: [OrderStatus.ACCEPTED, OrderStatus.ON_THE_WAY, OrderStatus.IN_PROGRESS] };
  }
  if (status.toLowerCase() === "completed") return { equals: OrderStatus.COMPLETED };
  if (status.toLowerCase() === "cancelled") return { equals: OrderStatus.CANCELLED };

  if (Object.values(OrderStatus).includes(normalized as OrderStatus)) {
    return { equals: normalized as OrderStatus };
  }

  return undefined;
}

function buildAdminOrdersWhere(query: Record<string, unknown>): Prisma.OrderWhereInput {
  const status = mapOrderStatusFilter(readQueryValue(query.status));
  const cityId = readQueryValue(query.cityId);
  const workerId = readQueryValue(query.workerId);
  const search = readQueryValue(query.search);
  const fromDate = parseDate(query.fromDate);
  const toDate = parseDate(query.toDate, true);

  return {
    ...(status ? { status } : {}),
    ...(cityId ? { cityId } : {}),
    ...(workerId ? { workerId } : {}),
    ...(fromDate || toDate ? { createdAt: { ...(fromDate ? { gte: fromDate } : {}), ...(toDate ? { lte: toDate } : {}) } } : {}),
    ...(search
      ? {
          OR: [
            { id: { contains: search, mode: "insensitive" } },
            { publicCode: { contains: search, mode: "insensitive" } },
            { serviceType: { contains: search, mode: "insensitive" } },
            { problemTitle: { contains: search, mode: "insensitive" } },
            { problemDescription: { contains: search, mode: "insensitive" } },
            { client: { name: { contains: search, mode: "insensitive" } } },
            { client: { phone: { contains: search, mode: "insensitive" } } },
            { worker: { profession: { contains: search, mode: "insensitive" } } },
            { worker: { user: { name: { contains: search, mode: "insensitive" } } } },
            { worker: { user: { phone: { contains: search, mode: "insensitive" } } } }
          ]
        }
      : {})
  };
}

adminRouter.get("/dashboard", requirePermission("analytics.read"), async (request, response, next) => {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const [activeOrders, waitingResponse, busyWorkers, completedToday, cancelledToday] = await Promise.all([
      prisma.order.count({ where: { status: { in: ["ACCEPTED", "ON_THE_WAY", "IN_PROGRESS"] } } }),
      prisma.order.count({ where: { status: "WAITING_RESPONSE" } }),
      prisma.workerAvailability.count({ where: { status: "BUSY" } }),
      prisma.order.count({ where: { status: "COMPLETED", updatedAt: { gte: today } } }),
      prisma.order.count({ where: { status: "CANCELLED", updatedAt: { gte: today } } })
    ]);

    response.json({
      ok: true,
      summary: {
        activeOrders,
        waitingResponse,
        busyWorkers,
        completedToday,
        cancelledToday,
        cityOverview: []
      }
    });
  } catch (error) {
    next(error);
  }
});

adminRouter.get("/users", requirePermission("users.read"), async (request, response, next) => {
  try {
    const users = await prisma.user.findMany({ orderBy: { createdAt: "desc" } });
    response.json({ ok: true, users });
  } catch (error) {
    next(error);
  }
});

adminRouter.get("/workers", requirePermission("workers.read"), async (request, response, next) => {
  try {
    const workers = await prisma.workerProfile.findMany({
      include: { user: true, availability: true },
      orderBy: { createdAt: "desc" }
    });
    response.json({ ok: true, workers });
  } catch (error) {
    next(error);
  }
});

adminRouter.get("/orders", requirePermission("orders.read"), async (request, response, next) => {
  try {
    const page = readPositiveInteger(request.query.page, 1);
    const limit = readPositiveInteger(request.query.limit, 20, maxAdminOrdersLimit);
    const where = buildAdminOrdersWhere(request.query);
    const [items, total] = await Promise.all([
      prisma.order.findMany({
        where,
        include: {
          client: true,
          worker: { include: { user: true } }
        },
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * limit,
        take: limit
      }),
      prisma.order.count({ where })
    ]);

    response.json({
      ok: true,
      items,
      total,
      page,
      limit,
      totalPages: Math.max(1, Math.ceil(total / limit))
    });
  } catch (error) {
    next(error);
  }
});

adminRouter.get("/reviews", requirePermission("reviews.read"), async (request, response, next) => {
  try {
    const reviews = await prisma.review.findMany({
      include: {
        client: true,
        worker: { include: { user: true } }
      },
      orderBy: { createdAt: "desc" }
    });
    response.json({ ok: true, reviews });
  } catch (error) {
    next(error);
  }
});

adminRouter.post("/users/:userId/promote-provider", requirePermission("users.manage"), async (request, response, next) => {
  try {
    const input = promoteProviderSchema.parse(request.body);
    const user = await promoteUserToProvider(String(request.params.userId), input);

    response.json({
      ok: true,
      actorId: request.user?.id,
      user: {
        id: user.id,
        phone: user.phone,
        role: user.role.toLowerCase(),
        sessionVersion: user.sessionVersion
      }
    });
  } catch (error) {
    next(error);
  }
});

adminRouter.post("/workers/:workerId/approve", requirePermission("workers.manage"), async (request, response, next) => {
  try {
    const input = approveWorkerSchema.parse(request.body);
    const worker = await approveWorkerProfile(String(request.params.workerId), input);

    response.json({
      ok: true,
      actorId: request.user?.id,
      worker
    });
  } catch (error) {
    next(error);
  }
});

adminRouter.post("/workers/:workerId/reject", requirePermission("workers.manage"), async (request, response, next) => {
  try {
    const input = workerModerationSchema.parse(request.body);
    const worker = await rejectWorkerProfile(String(request.params.workerId), input.reason);

    response.json({
      ok: true,
      actorId: request.user?.id,
      worker
    });
  } catch (error) {
    next(error);
  }
});

adminRouter.post("/workers/:workerId/suspend", requirePermission("workers.manage"), async (request, response, next) => {
  try {
    const input = workerModerationSchema.parse(request.body);
    const worker = await suspendWorkerProfile(String(request.params.workerId), input.reason);

    response.json({
      ok: true,
      actorId: request.user?.id,
      worker
    });
  } catch (error) {
    next(error);
  }
});

adminRouter.post("/workers/:workerId/unsuspend", requirePermission("workers.manage"), async (request, response, next) => {
  try {
    const input = workerModerationSchema.parse(request.body);
    const worker = await unsuspendWorkerProfile(String(request.params.workerId), input.reason);

    response.json({
      ok: true,
      actorId: request.user?.id,
      worker
    });
  } catch (error) {
    next(error);
  }
});
