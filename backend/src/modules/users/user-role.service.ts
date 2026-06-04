import { prisma } from "../../db/prisma.js";
import { promoteClientToProvider } from "../auth/auth.service.js";

type PromoteProviderInput = {
  profession?: string;
  basePrice?: number;
};

export async function promoteUserToProvider(userId: string, input: PromoteProviderInput = {}) {
  return prisma.$transaction(async (tx) => {
    const user = await promoteClientToProvider(userId, tx);

    if (input.profession || input.basePrice) {
      await tx.workerProfile.update({
        where: { userId },
        data: {
          profession: input.profession,
          basePrice: input.basePrice
        }
      });
    }

    return user;
  });
}
