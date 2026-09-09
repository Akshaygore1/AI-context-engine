import { z } from "zod";
import { AppError } from "./errors.js";

const requestSchema = z.object({
  userId: z.string().trim().min(1).max(80),
  question: z.string().trim().min(1).max(2000),
}).strict();

const personalizeRequestSchema = z.object({
  userId: z.string().trim().min(1).max(80),
  question: z.string().trim().min(1).max(2000),
  generation: z.object({
    provider: z.string().trim().min(1).max(80),
    model: z.string().trim().min(1).max(160),
  }).strict().optional(),
}).strict();

export function parsePersonalizationRequest(body: unknown) {
  const result = requestSchema.safeParse(body);
  if (!result.success) throw new AppError(400, "INVALID_REQUEST", "Provide a nonempty userId and question within the allowed limits.");
  return result.data;
}

export function parseAnswerRequest(body: unknown) {
  const result = personalizeRequestSchema.safeParse(body);
  if (!result.success) throw new AppError(400, "INVALID_REQUEST", "Provide a nonempty userId and question within the allowed limits, with an optional valid generation selection.");
  return result.data;
}
