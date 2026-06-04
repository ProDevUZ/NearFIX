import type { AuthUser } from "../modules/auth/auth-context.js";

declare global {
  namespace Express {
    interface Request {
      accessToken?: string;
      user?: AuthUser;
    }
  }
}

export {};
