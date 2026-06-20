import { PrismaClient, UserRole, UserStatus, WorkerAvailabilityStatus, WorkerProfileStatus } from "@prisma/client";
import { parseEnv } from "../src/config/env.js";

const prisma = new PrismaClient();
const env = parseEnv(process.env);

function maskPhone(phone: string) {
  return `${phone.slice(0, 4)}***${phone.slice(-3)}`;
}

async function main() {
  if (!env.APP_REVIEW_OTP_ENABLED) {
    throw new Error("APP_REVIEW_OTP_ENABLED must be true before preparing review accounts");
  }

  const phones = env.APP_REVIEW_PHONE_NUMBERS.split(",")
    .map((phone) => phone.trim())
    .filter(Boolean);

  if (phones.length < 2) {
    throw new Error("Configure at least two allowlisted numbers: demo client first, demo worker second");
  }

  const [clientPhone, workerPhone] = phones;

  const client = await prisma.user.upsert({
    where: { phone: clientPhone },
    update: {
      name: "App Review Client",
      role: UserRole.CLIENT,
      status: UserStatus.ACTIVE,
      deletedAt: null
    },
    create: {
      phone: clientPhone,
      name: "App Review Client",
      role: UserRole.CLIENT,
      status: UserStatus.ACTIVE,
      cityId: "tashkent"
    }
  });

  const workerUser = await prisma.user.upsert({
    where: { phone: workerPhone },
    update: {
      name: "App Review Worker",
      role: UserRole.PROVIDER,
      status: UserStatus.ACTIVE,
      deletedAt: null,
      cityId: "tashkent"
    },
    create: {
      phone: workerPhone,
      name: "App Review Worker",
      role: UserRole.PROVIDER,
      status: UserStatus.ACTIVE,
      cityId: "tashkent"
    }
  });

  const worker = await prisma.workerProfile.upsert({
    where: { userId: workerUser.id },
    update: {
      status: WorkerProfileStatus.APPROVED,
      profession: "Usta",
      professions: ["Usta"],
      experienceYears: 5,
      bio: "App Review uchun tasdiqlangan demo usta.",
      basePrice: 100000,
      submittedAt: new Date(),
      verifiedAt: new Date(),
      moderationReason: null
    },
    create: {
      userId: workerUser.id,
      status: WorkerProfileStatus.APPROVED,
      profession: "Usta",
      professions: ["Usta"],
      experienceYears: 5,
      bio: "App Review uchun tasdiqlangan demo usta.",
      basePrice: 100000,
      submittedAt: new Date(),
      verifiedAt: new Date()
    }
  });

  await prisma.workerAvailability.upsert({
    where: { workerId: worker.id },
    update: {
      status: WorkerAvailabilityStatus.AVAILABLE,
      activeOrderId: null,
      lockedUntil: null
    },
    create: {
      workerId: worker.id,
      status: WorkerAvailabilityStatus.AVAILABLE
    }
  });

  console.log(
    JSON.stringify(
      {
        prepared: true,
        client: maskPhone(client.phone),
        worker: maskPhone(workerUser.phone),
        otpCodePrinted: false
      },
      null,
      2
    )
  );
}

main()
  .catch((error) => {
    console.error(error instanceof Error ? error.message : "Failed to prepare App Review accounts");
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
