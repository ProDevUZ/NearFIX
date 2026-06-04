import cors from "cors";
import express from "express";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { addressRouter } from "../modules/addresses/address.routes.js";
import { adminRouter } from "../modules/admin/admin.routes.js";
import { authRouter } from "../modules/auth/auth.routes.js";
import { chatRouter } from "../modules/chats/chat.routes.js";
import { favoriteRouter } from "../modules/favorites/favorite.routes.js";
import { healthRouter } from "../modules/health/health.routes.js";
import { mediaRouter } from "../modules/media/media.routes.js";
import { notificationRouter } from "../modules/notifications/notification.routes.js";
import { orderRouter } from "../modules/orders/order.routes.js";
import { supportRouter } from "../modules/support/support.routes.js";
import { workerRouter } from "../modules/workers/worker.routes.js";
import { errorHandler } from "./error-handler.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const uploadDir = path.resolve(__dirname, "../../uploads");

export function createApp() {
  const app = express();

  app.use(cors());
  app.use(express.json({ limit: "1mb" }));
  app.use("/uploads", express.static(uploadDir));

  app.use("/health", healthRouter);
  app.use("/auth", authRouter);
  app.use("/admin", adminRouter);
  app.use("/addresses", addressRouter);
  app.use("/favorites", favoriteRouter);
  app.use("/workers", workerRouter);
  app.use("/orders", orderRouter);
  app.use("/chats", chatRouter);
  app.use("/media", mediaRouter);
  app.use("/notifications", notificationRouter);
  app.use("/support", supportRouter);

  app.use(errorHandler);

  return app;
}
