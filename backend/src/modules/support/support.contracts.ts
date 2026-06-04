import { z } from "zod";

export const createSupportTicketSchema = z.object({
  orderId: z.string().min(1).optional(),
  reason: z.string().min(3).max(120),
  message: z.string().max(1000).optional()
});
