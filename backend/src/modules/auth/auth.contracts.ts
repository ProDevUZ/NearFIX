import { z } from "zod";

export const phoneLoginSchema = z.object({
  phone: z.string().min(7).max(32),
  name: z.string().min(2).max(80).optional(),
  code: z.string().min(4).max(8).optional()
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
