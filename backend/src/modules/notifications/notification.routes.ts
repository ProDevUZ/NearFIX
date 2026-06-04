import { Router } from "express";
import { authenticate } from "../auth/middleware/auth.middleware.js";
import { pushTokenSchema } from "./notification.contracts.js";
import { listNotifications, markNotificationRead, savePushToken } from "./notification.service.js";

export const notificationRouter = Router();

notificationRouter.use(authenticate);

notificationRouter.get("/", async (request, response, next) => {
  try {
    const notifications = await listNotifications(request.user!.id);
    response.json({ ok: true, notifications });
  } catch (error) {
    next(error);
  }
});

notificationRouter.patch("/:id/read", async (request, response, next) => {
  try {
    const notification = await markNotificationRead(request.user!.id, request.params.id);
    response.json({ ok: true, notification });
  } catch (error) {
    next(error);
  }
});

notificationRouter.post("/push-token", async (request, response, next) => {
  try {
    const input = pushTokenSchema.parse(request.body);
    const token = await savePushToken(request.user!.id, input.token, input.platform);
    response.json({ ok: true, token });
  } catch (error) {
    next(error);
  }
});
