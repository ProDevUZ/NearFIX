import type { RequestHandler } from "express";
import { bearerTokenSchema } from "../auth/auth.contracts.js";
import { verifyEnvAdminToken } from "./admin-auth.service.js";

export const authenticateEnvAdmin: RequestHandler = (request, _response, next) => {
  try {
    const token = bearerTokenSchema.parse(request.headers.authorization || "");
    const user = verifyEnvAdminToken(token);

    if (!user) {
      throw Object.assign(new Error("Env admin token required"), {
        status: 401,
        code: "ADMIN_UNAUTHORIZED"
      });
    }

    request.accessToken = token;
    request.user = user;
    next();
  } catch (error) {
    if (typeof error === "object" && error && "status" in error && error.status === 401) {
      next(error);
      return;
    }

    next(
      Object.assign(new Error("Unauthorized"), {
        status: 401,
        code: "ADMIN_UNAUTHORIZED"
      })
    );
  }
};
