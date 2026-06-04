import { Router, type Request } from "express";
import { authenticate } from "../auth/middleware/auth.middleware.js";
import { requireRole } from "../auth/middleware/role.guard.js";
import { cancelOrderSchema, createOrderSchema, transitionOrderSchema } from "./order.contracts.js";
import {
  acceptOrder,
  autoCancelExpiredWaitingOrders,
  cancelOrder,
  createOrder,
  getOrderForUser,
  listIncomingOrdersForProvider,
  listOrdersForUser,
  rejectOrder,
  transitionOrder
} from "./order.service.js";

export const orderRouter = Router();

function getOrderId(request: Request) {
  return String(request.params.orderId);
}

orderRouter.post("/system/expire-waiting", authenticate, requireRole("ADMIN"), async (_request, response, next) => {
  try {
    const result = await autoCancelExpiredWaitingOrders();

    response.json({
      ok: true,
      result
    });
  } catch (error) {
    next(error);
  }
});

orderRouter.post("/", authenticate, async (request, response, next) => {
  try {
    const input = createOrderSchema.parse(request.body);
    const order = await createOrder(request.user!, input);

    response.status(201).json({
      ok: true,
      order
    });
  } catch (error) {
    next(error);
  }
});

orderRouter.get("/", authenticate, async (request, response, next) => {
  try {
    const orders = await listOrdersForUser(request.user!);

    response.json({
      ok: true,
      orders
    });
  } catch (error) {
    next(error);
  }
});

orderRouter.get("/worker/incoming", authenticate, requireRole("PROVIDER"), async (request, response, next) => {
  try {
    const orders = await listIncomingOrdersForProvider(request.user!);

    response.json({
      ok: true,
      orders
    });
  } catch (error) {
    next(error);
  }
});

orderRouter.get("/:orderId", authenticate, async (request, response, next) => {
  try {
    const order = await getOrderForUser(request.user!, getOrderId(request));

    response.json({
      ok: true,
      order
    });
  } catch (error) {
    next(error);
  }
});

orderRouter.post("/:orderId/accept", authenticate, async (request, response, next) => {
  try {
    const order = await acceptOrder(request.user!, getOrderId(request));

    response.json({
      ok: true,
      order
    });
  } catch (error) {
    next(error);
  }
});

orderRouter.post("/:orderId/reject", authenticate, requireRole("PROVIDER"), async (request, response, next) => {
  try {
    const order = await rejectOrder(request.user!, getOrderId(request));

    response.json({
      ok: true,
      order
    });
  } catch (error) {
    next(error);
  }
});

orderRouter.post("/:orderId/status", authenticate, async (request, response, next) => {
  try {
    const input = transitionOrderSchema.parse(request.body);
    const order = await transitionOrder(request.user!, getOrderId(request), input.status);

    response.json({
      ok: true,
      order
    });
  } catch (error) {
    next(error);
  }
});

orderRouter.post("/:orderId/cancel", authenticate, async (request, response, next) => {
  try {
    const input = cancelOrderSchema.parse(request.body);
    const order = await cancelOrder(request.user!, getOrderId(request), input.reason);

    response.json({
      ok: true,
      order
    });
  } catch (error) {
    next(error);
  }
});
