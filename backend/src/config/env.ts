import "dotenv/config";
import { z } from "zod";

const envSchema = z
  .object({
    NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
    PORT: z.coerce.number().int().positive().default(4000),
    DATABASE_URL: z.string().min(1),
    ACCESS_TOKEN_SECRET: z
      .string({ required_error: "ACCESS_TOKEN_SECRET is required" })
      .min(1, "ACCESS_TOKEN_SECRET is required"),
    SESSION_SECRET: z.string({ required_error: "SESSION_SECRET is required" }).min(1, "SESSION_SECRET is required"),
    SESSION_TTL_DAYS: z.coerce.number().int().positive().default(30),
    CORS_ORIGINS: z.string().default("")
  })
  .superRefine((value, context) => {
    if (value.NODE_ENV === "production" && !value.CORS_ORIGINS.trim()) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["CORS_ORIGINS"],
        message: "CORS_ORIGINS is required in production"
      });
    }
  });

export const env = envSchema.parse({
  NODE_ENV: process.env.NODE_ENV,
  PORT: process.env.PORT,
  DATABASE_URL: process.env.DATABASE_URL,
  ACCESS_TOKEN_SECRET: process.env.ACCESS_TOKEN_SECRET,
  SESSION_SECRET: process.env.SESSION_SECRET,
  SESSION_TTL_DAYS: process.env.SESSION_TTL_DAYS,
  CORS_ORIGINS: process.env.CORS_ORIGINS
});
