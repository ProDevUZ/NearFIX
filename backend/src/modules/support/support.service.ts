import { prisma } from "../../db/prisma.js";
import type { AuthUser } from "../auth/auth-context.js";
import { getOrderForUser } from "../orders/order.service.js";

type CreateSupportTicketInput = {
  orderId?: string;
  reason: string;
  message?: string;
};

export async function createSupportTicket(user: AuthUser, input: CreateSupportTicketInput) {
  if (input.orderId) {
    await getOrderForUser(user, input.orderId);
  }

  return prisma.supportTicket.create({
    data: {
      userId: user.id,
      orderId: input.orderId,
      reason: input.reason,
      message: input.message
    }
  });
}

export async function listSupportTickets(user: AuthUser) {
  return prisma.supportTicket.findMany({
    where: { userId: user.id },
    orderBy: { createdAt: "desc" }
  });
}
