import { Router } from "express";
import {
  otpRequestSchema,
  otpVerifySchema,
  phoneLoginSchema,
  refreshTokenSchema,
  updateCurrentUserSchema
} from "./auth.contracts.js";
import { authenticate } from "./middleware/auth.middleware.js";
import { otpRequestIpRateLimit } from "./middleware/otp-ip-rate-limit.js";
import {
  loginOrRegisterWithPhone,
  refreshAccessToken,
  requestOtp,
  revokeSession,
  updateCurrentUserProfile,
  verifyOtpAndCreateSession
} from "./auth.service.js";

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

authRouter.post("/otp/request", otpRequestIpRateLimit, async (request, response, next) => {
  try {
    const input = otpRequestSchema.parse(request.body);
    const result = await requestOtp(input);

    response.status(201).json(result);
  } catch (error) {
    next(error);
  }
});

authRouter.post("/otp/verify", async (request, response, next) => {
  try {
    const input = otpVerifySchema.parse(request.body);
    const result = await verifyOtpAndCreateSession(input);

    response.status(201).json({
      success: true,
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
      permissions: user.permissions,
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
