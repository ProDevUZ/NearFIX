import assert from "node:assert/strict";
import type { AddressInfo } from "node:net";
import { OtpPurpose } from "@prisma/client";
import { prisma } from "../src/db/prisma.js";
import { createApp } from "../src/http/app.js";
import { hashOtpCode } from "../src/modules/auth/otp.service.js";

const phone = "+998991119911";
const unknownPhone = "+998991119912";
const aliasPhone = "+998991119913";
const registerCode = "4312";
const aliasRegisterCode = "9824";
const resetCode = "7654";
const oldPassword = "ApiPassword-123";
const aliasPassword = "AliasPassword-123";
const newPassword = "ApiPassword-456";

async function cleanup() {
  const users = await prisma.user.findMany({
    where: {
      phone: {
        in: [phone, unknownPhone, aliasPhone]
      }
    },
    select: { id: true }
  });

  await prisma.session.deleteMany({
    where: {
      userId: {
        in: users.map((user) => user.id)
      }
    }
  });
  await prisma.otpChallenge.deleteMany({
    where: {
      phone: {
        in: [phone, unknownPhone, aliasPhone]
      }
    }
  });
  await prisma.user.deleteMany({
    where: {
      phone: {
        in: [phone, unknownPhone, aliasPhone]
      }
    }
  });
}

async function main() {
  await cleanup();
  const server = createApp().listen(0, "127.0.0.1");
  await new Promise<void>((resolve) => server.once("listening", resolve));
  const address = server.address() as AddressInfo;
  const baseUrl = `http://127.0.0.1:${address.port}`;

  async function post(path: string, body: Record<string, string>) {
    const response = await fetch(`${baseUrl}${path}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify(body)
    });
    const payload = await response.json().catch(() => ({}));
    return { response, payload };
  }

  try {
    const aliasRegisterRequest = await post("/auth/otp/request", { phone: aliasPhone });
    assert.equal(aliasRegisterRequest.response.status, 202);

    await prisma.otpChallenge.updateMany({
      where: {
        phone: aliasPhone,
        purpose: OtpPurpose.REGISTER,
        consumedAt: null
      },
      data: {
        codeHash: hashOtpCode(aliasPhone, aliasRegisterCode)
      }
    });

    const aliasRegisterVerify = await post("/auth/otp/verify", {
      phone: aliasPhone,
      code: aliasRegisterCode,
      password: aliasPassword
    });
    assert.equal(aliasRegisterVerify.response.status, 201);
    assert.ok(aliasRegisterVerify.payload.accessToken);
    assert.ok(aliasRegisterVerify.payload.refreshToken);

    const registerRequest = await post("/auth/register/otp/request", { phone });
    assert.equal(registerRequest.response.status, 202);

    await prisma.otpChallenge.updateMany({
      where: {
        phone,
        purpose: OtpPurpose.REGISTER,
        consumedAt: null
      },
      data: {
        codeHash: hashOtpCode(phone, registerCode)
      }
    });

    const registerVerify = await post("/auth/register/otp/verify", {
      phone,
      code: registerCode,
      password: oldPassword
    });
    assert.equal(registerVerify.response.status, 201);
    assert.ok(registerVerify.payload.accessToken);
    assert.ok(registerVerify.payload.refreshToken);

    const login = await post("/auth/login", {
      phone,
      password: oldPassword
    });
    assert.equal(login.response.status, 200);
    assert.ok(login.payload.accessToken);

    const wrongPassword = await post("/auth/login", {
      phone,
      password: "WrongPassword-123"
    });
    assert.equal(wrongPassword.response.status, 401);
    assert.equal(wrongPassword.payload.code, "INVALID_CREDENTIALS");

    const shortWrongPassword = await post("/auth/login", {
      phone,
      password: "wrong"
    });
    assert.equal(shortWrongPassword.response.status, 401);
    assert.equal(shortWrongPassword.payload.code, "INVALID_CREDENTIALS");

    const unknownForgot = await post("/auth/password/forgot/request", {
      phone: unknownPhone
    });
    assert.equal(unknownForgot.response.status, 202);
    assert.equal(unknownForgot.payload.ok, true);

    const forgotRequest = await post("/auth/password/forgot/request", { phone });
    assert.equal(forgotRequest.response.status, 202);
    assert.equal(forgotRequest.payload.ok, true);
    assert.deepEqual(forgotRequest.payload, unknownForgot.payload);

    await prisma.otpChallenge.updateMany({
      where: {
        phone,
        purpose: OtpPurpose.PASSWORD_RESET,
        consumedAt: null
      },
      data: {
        codeHash: hashOtpCode(phone, resetCode)
      }
    });

    const forgotVerify = await post("/auth/password/forgot/verify", {
      phone,
      code: resetCode,
      newPassword
    });
    assert.equal(forgotVerify.response.status, 200);
    assert.equal(forgotVerify.payload.passwordUpdated, true);

    const oldPasswordLogin = await post("/auth/login", {
      phone,
      password: oldPassword
    });
    assert.equal(oldPasswordLogin.response.status, 401);
    assert.equal(oldPasswordLogin.payload.code, "INVALID_CREDENTIALS");

    const newPasswordLogin = await post("/auth/login", {
      phone,
      password: newPassword
    });
    assert.equal(newPasswordLogin.response.status, 200);
    assert.ok(newPasswordLogin.payload.accessToken);

    const removedLegacyPhoneLogin = await post("/auth/phone", {
      phone,
      code: resetCode
    });
    assert.equal(removedLegacyPhoneLogin.response.status, 404);
  } finally {
    await new Promise<void>((resolve, reject) => {
      server.close((error) => (error ? reject(error) : resolve()));
    });
    await cleanup();
    await prisma.$disconnect();
  }

  console.log("Auth API tests passed");
}

main().catch(async (error) => {
  await prisma.$disconnect();
  console.error(error);
  process.exit(1);
});
