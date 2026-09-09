import { generateText, type LanguageModel } from "ai";
import { config } from "../config.js";
import { AppError } from "../http/errors.js";
import type { Generator } from "../types.js";
import { buildGenerationPrompt, generationSystemPrompt } from "./prompt.js";

export class RealGenerator implements Generator {
  readonly mode = "real" as const;

  constructor(private readonly model: LanguageModel) {}

  async generate(input: Parameters<Generator["generate"]>[0]) {
    const prompt = buildGenerationPrompt(input);
    console.log("Prompt", prompt);
    const promptCharacters = generationSystemPrompt.length + prompt.length;
    try {
      const result = await generateText({
        model: this.model,
        system: generationSystemPrompt,
        prompt,
        maxOutputTokens: config.generationMaxOutputTokens,
        abortSignal: AbortSignal.timeout(config.generationTimeoutMs),
      });
      return {
        text: result.text,
        promptCharacters,
        promptTokenEstimate: Math.ceil(promptCharacters / 4),
        usage: {
          inputTokens: result.usage.inputTokens,
          outputTokens: result.usage.outputTokens,
          totalTokens: result.usage.totalTokens,
        },
      };
    } catch {
      throw new AppError(
        503,
        "GENERATION_UNAVAILABLE",
        "The answer provider is temporarily unavailable. Please try again.",
      );
    }
  }
}
