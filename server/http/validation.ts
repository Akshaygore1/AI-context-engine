import { z } from "zod";
import { AppError } from "./errors.js";

const requestSchema = z.object({
  userId: z.string().trim().min(1).max(80),
  question: z.string().trim().min(1).max(2000),
}).strict();

export function parsePersonalizationRequest(body: unknown) {
  const result = requestSchema.safeParse(body);
  if (!result.success) throw new AppError(400, "INVALID_REQUEST", "Provide a nonempty userId and question within the allowed limits.");
  return result.data;
}
