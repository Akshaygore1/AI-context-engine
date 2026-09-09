import { createAnthropic } from "@ai-sdk/anthropic";
import { createGoogleGenerativeAI } from "@ai-sdk/google";
import { createOpenAI } from "@ai-sdk/openai";
import type { ProviderV3, ProviderV4 } from "@ai-sdk/provider";
import { createProviderRegistry } from "ai";
import { config } from "../config.js";
import { AppError } from "../http/errors.js";
import type {
  GenerationOptions,
  GenerationSelection,
  Generator,
} from "../types.js";
import { MockGenerator } from "./mock.js";
import { RealGenerator } from "./real.js";

const MOCK_SELECTION = { provider: "mock", model: "deterministic" } as const;
const providerLabels: Record<string, string> = {
  mock: "Mock",
  openai: "OpenAI",
  anthropic: "Anthropic",
  google: "Google",
};
const modelLabels: Record<string, string> = {
  "gpt-5-nano": "GPT-5 Nano · lowest cost",
  "gpt-5.6-luna": "GPT-5.6 Luna · fast",
  "gpt-5-mini": "GPT-5 Mini · balanced",
};

type RegistryProvider = ProviderV3 | ProviderV4;
type ProviderConfig = {
  id: string;
  models: string[];
  provider?: RegistryProvider;
};

export class GenerationCatalog {
  private readonly registry;
  readonly options: GenerationOptions;

  constructor() {
    const configurations: ProviderConfig[] = [
      {
        id: "openai",
        models: config.openAiModels,
        provider: config.openAiApiKey
          ? createOpenAI({
              apiKey: config.openAiApiKey,
              ...(config.openAiBaseUrl
                ? { baseURL: config.openAiBaseUrl }
                : {}),
            })
          : undefined,
      },
      {
        id: "anthropic",
        models: config.anthropicModels,
        provider: config.anthropicApiKey
          ? createAnthropic({ apiKey: config.anthropicApiKey })
          : undefined,
      },
      {
        id: "google",
        models: config.googleModels,
        provider: config.googleApiKey
          ? createGoogleGenerativeAI({ apiKey: config.googleApiKey })
          : undefined,
      },
    ];
    const available = configurations.filter(
      (item) => item.provider && item.models.length > 0,
    );
    this.registry = createProviderRegistry(
      Object.fromEntries(
        available.map((item) => [item.id, item.provider!]),
      ) as Record<string, RegistryProvider>,
    );
    const providers = [
      {
        id: MOCK_SELECTION.provider,
        label: providerLabels.mock,
        models: [{ id: MOCK_SELECTION.model, label: "Deterministic" }],
      },
      ...available.map((item) => ({
        id: item.id,
        label: providerLabels[item.id],
        models: item.models.map((model) => ({
          id: model,
          label: modelLabels[model] ?? model,
        })),
      })),
    ];
    const configured = { provider: config.aiProvider, model: config.aiModel };
    const configuredAvailable = available.some(
      (item) =>
        item.id === configured.provider &&
        item.models.includes(configured.model),
    );
    this.options = {
      defaultSelection:
        config.generationMode === "real" && configuredAvailable
          ? configured
          : MOCK_SELECTION,
      providers,
    };
  }

  resolve(selection?: GenerationSelection): {
    selection: GenerationSelection;
    generator: Generator;
  } {
    const chosen = selection ?? this.options.defaultSelection;
    const provider = this.options.providers.find(
      (item) => item.id === chosen.provider,
    );
    if (!provider?.models.some((model) => model.id === chosen.model)) {
      throw new AppError(
        400,
        "INVALID_GENERATION_SELECTION",
        "Choose an available provider and model.",
      );
    }
    if (chosen.provider === MOCK_SELECTION.provider)
      return { selection: chosen, generator: new MockGenerator() };
    return {
      selection: chosen,
      generator: new RealGenerator(
        this.registry.languageModel(`${chosen.provider}:${chosen.model}`),
      ),
    };
  }
}
