import { Router, type RequestHandler } from "express";
import {
  forgotPasswordOtpRequestSchema,
  forgotPasswordOtpVerifySchema,
  passwordLoginSchema,
  refreshTokenSchema,
  registerOtpRequestSchema,
  registerOtpVerifySchema,
  updateCurrentUserSchema
} from "./auth.contracts.js";
import { authenticate } from "./middleware/auth.middleware.js";
import { otpRequestIpRateLimit } from "./middleware/otp-ip-rate-limit.js";
import { deleteCurrentUserAccount } from "./account-deletion.service.js";
import {
  loginWithPassword,
  refreshAccessToken,
  registerWithOtp,
  requestForgotPasswordOtp,
  requestRegistrationOtp,
  resetPasswordWithOtp,
  revokeSession,
  updateCurrentUserProfile
} from "./auth.service.js";

export const authRouter = Router();

const requestRegistrationOtpHandler: RequestHandler = async (request, response, next) => {
  try {
    const input = registerOtpRequestSchema.parse(request.body);
    const result = await requestRegistrationOtp(input);

    response.status(202).json(result);
  } catch (error) {
    next(error);
  }
};

const verifyRegistrationOtpHandler: RequestHandler = async (request, response, next) => {
  try {
    const input = registerOtpVerifySchema.parse(request.body);
    const result = await registerWithOtp(input);

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
};

authRouter.post("/otp/request", otpRequestIpRateLimit, requestRegistrationOtpHandler);
authRouter.post("/register/otp/request", otpRequestIpRateLimit, requestRegistrationOtpHandler);
authRouter.post("/otp/verify", verifyRegistrationOtpHandler);
authRouter.post("/register/otp/verify", verifyRegistrationOtpHandler);

authRouter.post("/login", async (request, response, next) => {
  try {
    const input = passwordLoginSchema.parse(request.body);
    const result = await loginWithPassword(input);

    response.json({
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

authRouter.post("/password/forgot/request", otpRequestIpRateLimit, async (request, response, next) => {
  try {
    const input = forgotPasswordOtpRequestSchema.parse(request.body);
    const result = await requestForgotPasswordOtp(input);

    response.status(202).json(result);
  } catch (error) {
    next(error);
  }
});

authRouter.post("/password/forgot/verify", async (request, response, next) => {
  try {
    const input = forgotPasswordOtpVerifySchema.parse(request.body);
    const result = await resetPasswordWithOtp(input);

    response.json(result);
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

authRouter.delete("/me", authenticate, async (request, response, next) => {
  try {
    const result = await deleteCurrentUserAccount(request.user!.id);

    response.json({
      ok: true,
      deleted: true,
      deletedAt: result.deletedAt
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
