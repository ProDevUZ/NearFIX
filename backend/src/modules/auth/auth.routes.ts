import { Router } from "express";
import { phoneLoginSchema, refreshTokenSchema, updateCurrentUserSchema } from "./auth.contracts.js";
import { authenticate } from "./middleware/auth.middleware.js";
import { loginOrRegisterWithPhone, refreshAccessToken, revokeSession, updateCurrentUserProfile } from "./auth.service.js";

export const authRouter = Router();

authRouter.post("/phone", async (request, response, next) => {
  try {
    const input = phoneLoginSchema.parse(request.body);
    const result = await loginOrRegisterWithPhone(input);

    response.status(201).json({
      ok: true,
      accessToken: result.accessToken,
      refreshToken: result.refreshToken,
      token: result.token,
      user: result.user
    });
  } catch (error) {
    next(error);
  }
});

authRouter.get("/me", authenticate, (request, response) => {
  const user = request.user!;

  response.json({
    ok: true,
    user: {
      id: user.id,
      phone: user.phone,
      name: user.name,
      role: user.role,
      sessionVersion: user.sessionVersion
    }
  });
});

authRouter.patch("/me", authenticate, async (request, response, next) => {
  try {
    const input = updateCurrentUserSchema.parse(request.body);
    const user = await updateCurrentUserProfile(request.user!.id, input);

    response.json({
      ok: true,
      user
    });
  } catch (error) {
    next(error);
  }
});

authRouter.post("/refresh", async (request, response, next) => {
  try {
    const input = refreshTokenSchema.parse(request.body);
    const result = await refreshAccessToken(input.refreshToken);

    response.json({
      ok: true,
      accessToken: result.accessToken,
      token: result.token,
      user: result.user
    });
  } catch (error) {
    next(error);
  }
});

authRouter.post("/logout", authenticate, async (request, response, next) => {
  try {
    await revokeSession(request.accessToken || "");

    response.json({
      ok: true
    });
  } catch (error) {
    next(error);
  }
});
