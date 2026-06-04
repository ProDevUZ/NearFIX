import { WorkerAvailabilityStatus } from "@prisma/client";
import { z } from "zod";

export const updateWorkerProfileSchema = z.object({
  name: z.string().min(2).max(120).optional(),
  cityId: z.string().min(2).max(80).optional(),
  profession: z.string().min(2).max(80).optional(),
  professions: z.array(z.string().min(2).max(80)).min(1).max(5).optional(),
  experienceYears: z.number().int().min(0).max(60).optional(),
  profileImageUrl: z.string().url().optional(),
  bio: z.string().max(1000).optional(),
  basePrice: z.number().int().positive().optional()
});

export const updateAvailabilitySchema = z.object({
  status: z.nativeEnum(WorkerAvailabilityStatus)
});
