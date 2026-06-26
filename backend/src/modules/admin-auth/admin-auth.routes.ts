import { Router } from "express";
import { adminLoginRateLimit } from "./admin-login-rate-limit.js";
import { writeAdminAuditLog } from "./admin-audit.service.js";
import { adminLoginSchema } from "./admin-auth.contracts.js";
import { authenticateEnvAdmin } from "./admin-auth.middleware.js";
import { loginAdmin, resolveAdminLoginAuditActor } from "./admin-auth.service.js";

export const adminAuthRouter = Router();

adminAuthRouter.post("/login", adminLoginRateLimit, async (request, response, next) => {
  let username = "";

  try {
    const input = adminLoginSchema.parse(request.body);
    username = input.username;
    const result = await loginAdmin(input);
    await writeAdminAuditLog({
      actorType: result.user.actorType,
      actorAdminId: result.user.actorType === "ADMIN_ACCOUNT" ? result.user.id : null,
      action: "admin.login_success",
      metadata: { username: result.user.username, tokenType: result.user.tokenType },
      ipAddress: request.ip,
      userAgent: request.get("user-agent") || null
    });

    response.json({
      ok: true,
      token: result.token,
      expiresIn: result.expiresIn,
      user: result.user
    });
  } catch (error) {
    const actor = await resolveAdminLoginAuditActor(username);
    await writeAdminAuditLog({
      actorType: actor.actorType,
      actorAdminId: actor.actorAdminId,
      action: "admin.login_failed",
      metadata: {
        username,
        code: typeof error === "object" && error && "code" in error ? String(error.code) : "ADMIN_LOGIN_FAILED"
      },
      ipAddress: request.ip,
      userAgent: request.get("user-agent") || null
    });
    next(error);
  }
});

adminAuthRouter.get("/me", authenticateEnvAdmin, (request, response) => {
  response.json({
    ok: true,
    user: request.user
  });
});
