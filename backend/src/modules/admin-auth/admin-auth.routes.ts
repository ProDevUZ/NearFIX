import { Router } from "express";
import { adminLoginSchema } from "./admin-auth.contracts.js";
import { authenticateEnvAdmin } from "./admin-auth.middleware.js";
import { loginEnvAdmin } from "./admin-auth.service.js";

export const adminAuthRouter = Router();

adminAuthRouter.post("/login", (request, response, next) => {
  try {
    const input = adminLoginSchema.parse(request.body);
    const result = loginEnvAdmin(input);

    response.json({
      ok: true,
      token: result.token,
      expiresIn: result.expiresIn,
      user: result.user
    });
  } catch (error) {
    next(error);
  }
});

adminAuthRouter.get("/me", authenticateEnvAdmin, (request, response) => {
  response.json({
    ok: true,
    user: request.user
  });
});
