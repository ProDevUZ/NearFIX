import "dotenv/config";
import { z } from "zod";

const optionalNonEmptyString = z.preprocess(
  (value) => (typeof value === "string" && !value.trim() ? undefined : value),
  z.string().trim().min(1).optional()
);

const optionalPositiveInteger = z.preprocess(
  (value) => (typeof value === "string" && !value.trim() ? undefined : value),
  z.coerce.number().int().positive().optional()
);

const optionalUrl = z.preprocess(
  (value) => (typeof value === "string" && !value.trim() ? undefined : value),
  z.string().trim().url().optional()
);

const envSchema = z
  .object({
    NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
    PORT: z.coerce.number().int().positive().default(4000),
    DATABASE_URL: z.string().min(1),
    ACCESS_TOKEN_SECRET: z
      .string({ required_error: "ACCESS_TOKEN_SECRET is required" })
      .min(1, "ACCESS_TOKEN_SECRET is required"),
    ADMIN_USERNAME: z.string({ required_error: "ADMIN_USERNAME is required" }).trim().min(1),
    ADMIN_PASSWORD: z.string({ required_error: "ADMIN_PASSWORD is required" }).min(1),
    SESSION_SECRET: z.string({ required_error: "SESSION_SECRET is required" }).min(1, "SESSION_SECRET is required"),
    SESSION_TTL_DAYS: z.coerce.number().int().positive().default(30),
    CORS_ORIGINS: z.string().default(""),
    OTP_PROVIDER: z.enum(["fake", "eskiz"]).default("fake"),
    ESKIZ_EMAIL: optionalNonEmptyString,
    ESKIZ_PASSWORD: optionalNonEmptyString,
    ESKIZ_BASE_URL: optionalNonEmptyString,
    ESKIZ_TIMEOUT_MS: optionalPositiveInteger,
    R2_ACCOUNT_ID: optionalNonEmptyString,
    R2_ACCESS_KEY_ID: optionalNonEmptyString,
    R2_SECRET_ACCESS_KEY: optionalNonEmptyString,
    R2_BUCKET_NAME: optionalNonEmptyString,
    R2_PUBLIC_URL: optionalUrl,
    TRUST_PROXY: z
      .string()
      .optional()
      .transform((value) => value === "true" || value === "1")
  })
  .superRefine((value, context) => {
    if (value.NODE_ENV === "production" && !value.CORS_ORIGINS.trim()) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["CORS_ORIGINS"],
        message: "CORS_ORIGINS is required in production"
      });
    }

    if (value.NODE_ENV === "production" && value.OTP_PROVIDER === "fake") {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["OTP_PROVIDER"],
        message: "OTP_PROVIDER=fake is not allowed in production"
      });
    }

    if (value.OTP_PROVIDER === "eskiz") {
      const requiredEskizFields = [
        ["ESKIZ_EMAIL", value.ESKIZ_EMAIL],
        ["ESKIZ_PASSWORD", value.ESKIZ_PASSWORD],
        ["ESKIZ_BASE_URL", value.ESKIZ_BASE_URL],
        ["ESKIZ_TIMEOUT_MS", value.ESKIZ_TIMEOUT_MS]
      ] as const;

      for (const [field, fieldValue] of requiredEskizFields) {
        if (fieldValue === undefined) {
          context.addIssue({
            code: z.ZodIssueCode.custom,
            path: [field],
            message: `${field} is required when OTP_PROVIDER=eskiz`
          });
        }
      }
    }

    if (value.NODE_ENV === "production") {
      const requiredR2Fields = [
        ["R2_ACCOUNT_ID", value.R2_ACCOUNT_ID],
        ["R2_ACCESS_KEY_ID", value.R2_ACCESS_KEY_ID],
        ["R2_SECRET_ACCESS_KEY", value.R2_SECRET_ACCESS_KEY],
        ["R2_BUCKET_NAME", value.R2_BUCKET_NAME],
        ["R2_PUBLIC_URL", value.R2_PUBLIC_URL]
      ] as const;

      for (const [field, fieldValue] of requiredR2Fields) {
        if (fieldValue === undefined) {
          context.addIssue({
            code: z.ZodIssueCode.custom,
            path: [field],
            message: `${field} is required in production`
          });
        }
      }
    }
  });

export function parseEnv(source: NodeJS.ProcessEnv) {
  return envSchema.parse({
    NODE_ENV: source.NODE_ENV,
    PORT: source.PORT,
    DATABASE_URL: source.DATABASE_URL,
    ACCESS_TOKEN_SECRET: source.ACCESS_TOKEN_SECRET,
    ADMIN_USERNAME: source.ADMIN_USERNAME,
    ADMIN_PASSWORD: source.ADMIN_PASSWORD,
    SESSION_SECRET: source.SESSION_SECRET,
    SESSION_TTL_DAYS: source.SESSION_TTL_DAYS,
    CORS_ORIGINS: source.CORS_ORIGINS,
    OTP_PROVIDER: source.OTP_PROVIDER,
    ESKIZ_EMAIL: source.ESKIZ_EMAIL,
    ESKIZ_PASSWORD: source.ESKIZ_PASSWORD,
    ESKIZ_BASE_URL: source.ESKIZ_BASE_URL,
    ESKIZ_TIMEOUT_MS: source.ESKIZ_TIMEOUT_MS,
    R2_ACCOUNT_ID: source.R2_ACCOUNT_ID,
    R2_ACCESS_KEY_ID: source.R2_ACCESS_KEY_ID,
    R2_SECRET_ACCESS_KEY: source.R2_SECRET_ACCESS_KEY,
    R2_BUCKET_NAME: source.R2_BUCKET_NAME,
    R2_PUBLIC_URL: source.R2_PUBLIC_URL,
    TRUST_PROXY: source.TRUST_PROXY
  });
}

export const env = parseEnv(process.env);
