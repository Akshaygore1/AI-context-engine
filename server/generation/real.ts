import { createOpenAI } from "@ai-sdk/openai";
import { generateText } from "ai";
import { config } from "../config.js";
import { AppError } from "../http/errors.js";
import type { Generator } from "../types.js";
import { buildGenerationPrompt, generationSystemPrompt } from "./prompt.js";

export class RealGenerator implements Generator {
  readonly mode = "real" as const;

  async generate(input: Parameters<Generator["generate"]>[0]) {
    if (config.aiProvider !== "openai" || !config.openAiApiKey) {
      throw new AppError(503, "GENERATION_UNAVAILABLE", "Real generation is selected but its provider configuration is unavailable.");
    }
    const prompt = buildGenerationPrompt(input);
    const promptCharacters = generationSystemPrompt.length + prompt.length;
    const provider = createOpenAI({ apiKey: config.openAiApiKey, ...(config.openAiBaseUrl ? { baseURL: config.openAiBaseUrl } : {}) });
    try {
      const result = await generateText({
        model: provider(config.aiModel),
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
    } catch (error) {
      if (error instanceof AppError) throw error;
      throw new AppError(503, "GENERATION_UNAVAILABLE", "The answer provider is temporarily unavailable. Please try again.");
    }
  }
}
