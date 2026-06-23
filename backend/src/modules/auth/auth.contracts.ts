import { z } from "zod";
import { isPasswordWithinBcryptLimit, PASSWORD_MIN_LENGTH } from "./password.js";

const phoneSchema = z.string().min(7).max(32);

const passwordSchema = z
  .string()
  .min(PASSWORD_MIN_LENGTH)
  .refine(isPasswordWithinBcryptLimit, "Password must not exceed 72 UTF-8 bytes");

const loginPasswordSchema = z
  .string()
  .min(1)
  .refine(isPasswordWithinBcryptLimit, "Password must not exceed 72 UTF-8 bytes");

const otpCodeSchema = z.string().regex(/^\d{4,12}$/);

export const registerOtpRequestSchema = z.object({
  phone: phoneSchema
});

export const registerOtpVerifySchema = z.object({
  phone: phoneSchema,
  code: otpCodeSchema,
  password: passwordSchema
});

export const passwordLoginSchema = z.object({
  phone: phoneSchema,
  password: loginPasswordSchema
});

export const forgotPasswordOtpRequestSchema = z.object({
  phone: phoneSchema
});

export const forgotPasswordOtpVerifySchema = z.object({
  phone: phoneSchema,
  code: otpCodeSchema,
  newPassword: passwordSchema
});

export const updateCurrentUserSchema = z.object({
  name: z.string().min(2).max(80)
});

export const bearerTokenSchema = z
  .string()
  .startsWith("Bearer ")
  .transform((value) => value.slice("Bearer ".length).trim());

export const refreshTokenSchema = z.object({
  refreshToken: z.string().min(32)
});
