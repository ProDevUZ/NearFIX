import assert from "node:assert/strict";
import { OtpPurpose } from "@prisma/client";
import { prisma } from "../src/db/prisma.js";
import {
  loginWithPassword,
  registerWithOtp,
  requestForgotPasswordOtp,
  requestRegistrationOtp,
  resetPasswordWithOtp
} from "../src/modules/auth/auth.service.js";
import type { AuthProvider } from "../src/modules/auth/providers/auth-provider.interface.js";

const registeredPhone = "+998991119901";
const unknownPhone = "+998991119902";
const oldPassword = "OldPassword-123";
const newPassword = "NewPassword-456";

class CapturingOtpProvider implements AuthProvider {
  readonly codes = new Map<string, string>();

  async sendOtp(phone: string, code?: string) {
    assert.ok(code, "OTP delivery must receive a generated code");
    this.codes.set(phone, code);
    return { providerMessageId: `test-${phone}` };
  }
}

function errorCode(error: unknown) {
  return typeof error === "object" && error && "code" in error ? String(error.code) : undefined;
}

async function cleanup() {
  const users = await prisma.user.findMany({
    where: {
      phone: {
        in: [registeredPhone, unknownPhone]
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
        in: [registeredPhone, unknownPhone]
      }
    }
  });
  await prisma.user.deleteMany({
    where: {
      phone: {
        in: [registeredPhone, unknownPhone]
      }
    }
  });
}

async function assertRejectedCode(promise: Promise<unknown>, expectedCode: string) {
  await assert.rejects(promise, (error) => errorCode(error) === expectedCode);
}

async function main() {
  const provider = new CapturingOtpProvider();
  await cleanup();

  try {
    const requestResult = await requestRegistrationOtp({ phone: registeredPhone }, provider);
    assert.equal(requestResult.ok, true);
    const registerCode = provider.codes.get(registeredPhone);
    assert.ok(registerCode);

    const registered = await registerWithOtp({
      phone: registeredPhone,
      code: registerCode,
      password: oldPassword
    });
    assert.ok(registered.accessToken);
    assert.ok(registered.refreshToken);

    const user = await prisma.user.findUniqueOrThrow({
      where: { phone: registeredPhone }
    });
    assert.ok(user.passwordHash);
    assert.notEqual(user.passwordHash, oldPassword);
    assert.ok(user.passwordSetAt);

    const login = await loginWithPassword({
      phone: registeredPhone,
      password: oldPassword
    });
    assert.ok(login.accessToken);

    await assertRejectedCode(
      loginWithPassword({ phone: registeredPhone, password: "WrongPassword-123" }),
      "INVALID_CREDENTIALS"
    );

    const unknownRequest = await requestForgotPasswordOtp({ phone: unknownPhone }, provider);
    assert.equal(unknownRequest.ok, true);
    assert.equal(provider.codes.has(unknownPhone), false);

    const forgotRequest = await requestForgotPasswordOtp({ phone: registeredPhone }, provider);
    assert.equal(forgotRequest.ok, true);
    const resetCode = provider.codes.get(registeredPhone);
    assert.ok(resetCode);

    await resetPasswordWithOtp({
      phone: registeredPhone,
      code: resetCode,
      newPassword
    });

    const activeOldSessions = await prisma.session.count({
      where: {
        userId: user.id,
        revoked: false
      }
    });
    assert.equal(activeOldSessions, 0);

    await assertRejectedCode(
      loginWithPassword({ phone: registeredPhone, password: oldPassword }),
      "INVALID_CREDENTIALS"
    );

    const newLogin = await loginWithPassword({
      phone: registeredPhone,
      password: newPassword
    });
    assert.ok(newLogin.accessToken);

    const registrationChallenges = await prisma.otpChallenge.count({
      where: {
        phone: registeredPhone,
        purpose: OtpPurpose.REGISTER
      }
    });
    const resetChallenges = await prisma.otpChallenge.count({
      where: {
        phone: registeredPhone,
        purpose: OtpPurpose.PASSWORD_RESET
      }
    });
    assert.equal(registrationChallenges, 1);
    assert.equal(resetChallenges, 1);

    await assertRejectedCode(
      requestRegistrationOtp({ phone: registeredPhone }, provider),
      "PHONE_ALREADY_REGISTERED"
    );
  } finally {
    await cleanup();
    await prisma.$disconnect();
  }

  console.log("Password authentication tests passed");
}

main().catch(async (error) => {
  await prisma.$disconnect();
  console.error(error);
  process.exit(1);
});
