import crypto from "node:crypto";
import { env } from "../../config/env.js";
import { ADMIN_PERMISSIONS } from "../auth/permissions.js";

const ADMIN_TOKEN_TTL_SECONDS = 12 * 60 * 60;
const ADMIN_TOKEN_TYPE = "env_admin";

type AdminTokenPayload = {
  tokenType: typeof ADMIN_TOKEN_TYPE;
  username: string;
  credentialVersion: string;
  role: "super_admin";
  iat: number;
  exp: number;
};

function base64UrlJson(value: unknown) {
  return Buffer.from(JSON.stringify(value)).toString("base64url");
}

function sign(data: string) {
  return crypto.createHmac("sha256", env.ACCESS_TOKEN_SECRET).update(data).digest("base64url");
}

function secureEqual(left: string, right: string) {
  const leftDigest = crypto.createHash("sha256").update(left).digest();
  const rightDigest = crypto.createHash("sha256").update(right).digest();
  return crypto.timingSafeEqual(leftDigest, rightDigest);
}

function currentCredentialVersion() {
  return crypto
    .createHmac("sha256", env.ACCESS_TOKEN_SECRET)
    .update(`${env.ADMIN_USERNAME}\0${env.ADMIN_PASSWORD}`)
    .digest("base64url");
}

function unauthorized(message = "Invalid admin credentials") {
  return Object.assign(new Error(message), {
    status: 401,
    code: "ADMIN_UNAUTHORIZED"
  });
}

function createAdminToken(username: string) {
  const now = Math.floor(Date.now() / 1000);
  const header = base64UrlJson({ alg: "HS256", typ: "JWT" });
  const payload = base64UrlJson({
    tokenType: ADMIN_TOKEN_TYPE,
    username,
    credentialVersion: currentCredentialVersion(),
    role: "super_admin",
    iat: now,
    exp: now + ADMIN_TOKEN_TTL_SECONDS
  } satisfies AdminTokenPayload);
  const data = `${header}.${payload}`;

  return `${data}.${sign(data)}`;
}

function decodePayload(token: string): AdminTokenPayload | null {
  const parts = token.split(".");
  if (parts.length !== 3) return null;

  try {
    const payload = JSON.parse(Buffer.from(parts[1], "base64url").toString("utf8")) as Partial<AdminTokenPayload>;
    return payload.tokenType === ADMIN_TOKEN_TYPE ? payload as AdminTokenPayload : null;
  } catch {
    return null;
  }
}

export function loginEnvAdmin(input: { username: string; password: string }) {
  const usernameMatches = secureEqual(input.username, env.ADMIN_USERNAME);
  const passwordMatches = secureEqual(input.password, env.ADMIN_PASSWORD);

  if (!usernameMatches || !passwordMatches) {
    throw unauthorized();
  }

  const token = createAdminToken(env.ADMIN_USERNAME);

  return {
    token,
    expiresIn: ADMIN_TOKEN_TTL_SECONDS,
    user: createEnvAdminUser(env.ADMIN_USERNAME)
  };
}

export function verifyEnvAdminToken(token: string) {
  const payload = decodePayload(token);
  if (!payload) return null;

  const parts = token.split(".");
  const data = `${parts[0]}.${parts[1]}`;
  const actualSignature = Buffer.from(parts[2]);
  const expectedSignature = Buffer.from(sign(data));

  if (
    actualSignature.length !== expectedSignature.length ||
    !crypto.timingSafeEqual(actualSignature, expectedSignature)
  ) {
    throw unauthorized("Invalid admin token");
  }

  if (
    payload.username !== env.ADMIN_USERNAME ||
    !secureEqual(payload.credentialVersion || "", currentCredentialVersion()) ||
    payload.role !== "super_admin" ||
    !Number.isInteger(payload.exp) ||
    payload.exp <= Math.floor(Date.now() / 1000)
  ) {
    throw unauthorized("Admin token expired or invalid");
  }

  return createEnvAdminUser(payload.username);
}

export function createEnvAdminUser(username: string) {
  return {
    id: "env-admin",
    sessionId: "env-admin",
    phone: "",
    username,
    name: username,
    role: "super_admin",
    permissions: [...ADMIN_PERMISSIONS],
    sessionVersion: 1
  };
}
