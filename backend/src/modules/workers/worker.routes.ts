import { Router } from "express";
import { authenticate } from "../auth/middleware/auth.middleware.js";
import { requireRole } from "../auth/middleware/role.guard.js";
import { updateAvailabilitySchema, updateWorkerProfileSchema } from "./worker.contracts.js";
import {
  getCatalogWorkers,
  getOwnWorkerEarnings,
  getOwnWorkerProfile,
  getOwnWorkerTransactions,
  setWorkerAvailability,
  updateOwnWorkerProfile
} from "./worker.service.js";

export const workerRouter = Router();

workerRouter.get("/catalog", async (request, response, next) => {
  try {
    const cityId = typeof request.query.cityId === "string" ? request.query.cityId : undefined;
    const profession =
      typeof request.query.profession === "string"
        ? request.query.profession
        : typeof request.query.category === "string"
          ? request.query.category
          : undefined;
    const workers = await getCatalogWorkers(cityId, profession);

    response.json({
      ok: true,
      workers
    });
  } catch (error) {
    next(error);
  }
});

workerRouter.get("/me", authenticate, requireRole("PROVIDER"), async (request, response, next) => {
  try {
    const worker = await getOwnWorkerProfile(request.user!.id);

    response.json({
      ok: true,
      worker
    });
  } catch (error) {
    next(error);
  }
});

workerRouter.get("/me/earnings", authenticate, requireRole("PROVIDER"), async (request, response, next) => {
  try {
    const earnings = await getOwnWorkerEarnings(request.user!.id);

    response.json({
      ok: true,
      earnings
    });
  } catch (error) {
    next(error);
  }
});

workerRouter.get("/me/transactions", authenticate, requireRole("PROVIDER"), async (request, response, next) => {
  try {
    const transactions = await getOwnWorkerTransactions(request.user!.id);

    response.json({
      ok: true,
      transactions
    });
  } catch (error) {
    next(error);
  }
});

workerRouter.patch("/me/profile", authenticate, requireRole("PROVIDER"), async (request, response, next) => {
  try {
    const input = updateWorkerProfileSchema.parse(request.body);
    const worker = await updateOwnWorkerProfile(request.user!.id, input);

    response.json({
      ok: true,
      worker
    });
  } catch (error) {
    next(error);
  }
});

workerRouter.patch("/me/availability", authenticate, requireRole("PROVIDER"), async (request, response, next) => {
  try {
    const input = updateAvailabilitySchema.parse(request.body);
    const availability = await setWorkerAvailability(request.user!.id, input.status);

    response.json({
      ok: true,
      availability
    });
  } catch (error) {
    next(error);
  }
});
