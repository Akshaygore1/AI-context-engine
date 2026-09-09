import cors from "cors";
import express from "express";
import { randomUUID } from "node:crypto";
import { resolve } from "node:path";
import { config } from "./config.js";
import { GenerationCatalog } from "./generation/index.js";
import {
  buildGenerationPrompt,
  generationSystemPrompt,
} from "./generation/prompt.js";
import { AppError } from "./http/errors.js";
import { mockContextRouter } from "./http/mock-context.js";
import {
  parseAnswerRequest,
  parsePersonalizationRequest,
} from "./http/validation.js";
import { WeightedPhraseIntentDetector } from "./personalization/intent.js";
import { PersonalizationPipeline } from "./personalization/pipeline.js";
import { gatherContext } from "./upstream/client.js";

export function createApp() {
  const app = express();
  const pipeline = new PersonalizationPipeline(
    new WeightedPhraseIntentDetector(),
  );
  const generation = new GenerationCatalog();
  app.use(cors({ origin: config.webOrigin }));
  app.use((req, res, next) => {
    const started = performance.now();
    const requestId = req.header("x-request-id") ?? randomUUID();
    res.locals.requestId = requestId;
    res.setHeader("x-request-id", requestId);
    res.on("finish", () =>
      console.info(
        JSON.stringify({
          requestId,
          route: req.path,
          status: res.statusCode,
          durationMs: Math.round(performance.now() - started),
        }),
      ),
    );
    next();
  });
  app.use(express.json({ limit: "16kb" }));
  app.use(mockContextRouter);
  app.get("/health", (_req, res) =>
    res.json({
      status: "ok",
      generationMode: generation.resolve().generator.mode,
    }),
  );
  app.get(["/generation/options", "/api/generation/options"], (_req, res) =>
    res.json(generation.options),
  );

  const decide = async (body: unknown, requestId: string) => {
    const input = parsePersonalizationRequest(body);
    const data = await gatherContext(input.userId, requestId);
    const result = pipeline.run(input.question, data);
    if (result.context.length === 0)
      throw new AppError(
        503,
        "CONTEXT_UNAVAILABLE",
        "Relevant astrological context is temporarily unavailable. Please try again.",
      );
    console.info(
      JSON.stringify({
        event: "decision",
        requestId,
        selectedContextCount: result.context.length,
        unavailableSources: result.decision.unavailableSources.map(
          (item) => item.source,
        ),
        contextCharacters: result.decision.contextCharacters,
      }),
    );
    return result;
  };
  app.post(
    ["/debug/personalization", "/api/debug/personalization"],
    async (req, res, next) => {
      try {
        const result = await decide(req.body, res.locals.requestId);
        res.json({ ...result.decision, requestId: res.locals.requestId });
      } catch (error) {
        next(error);
      }
    },
  );
  app.post(["/personalize", "/api/personalize"], async (req, res, next) => {
    try {
      const input = parseAnswerRequest(req.body);
      const resolved = generation.resolve(input.generation);
      const result = await decide(
        { userId: input.userId, question: input.question },
        res.locals.requestId,
      );
      const generationStarted = performance.now();
      const promptCharacters =
        generationSystemPrompt.length + buildGenerationPrompt(result).length;
      try {
        const generated = await resolved.generator.generate(result);
        console.info(
          JSON.stringify({
            event: "generation",
            requestId: res.locals.requestId,
            provider: resolved.selection.provider,
            model: resolved.selection.model,
            mode: resolved.generator.mode,
            outcome: "success",
            latencyMs: Math.round(performance.now() - generationStarted),
            promptCharacters: generated.promptCharacters,
            promptTokens:
              generated.usage?.inputTokens ?? generated.promptTokenEstimate,
            promptTokensMeasured: generated.usage?.inputTokens !== undefined,
            outputTokens: generated.usage?.outputTokens,
            totalTokens: generated.usage?.totalTokens,
          }),
        );
        res.json({
          answer: generated.text,
          confidence: result.decision.confidence,
          sourcesUsed: result.context.map((item) => item.label),
          provider: resolved.selection.provider,
          model: resolved.selection.model,
          mode: resolved.generator.mode,
          requestId: res.locals.requestId,
        });
      } catch (error) {
        console.warn(
          JSON.stringify({
            event: "generation",
            requestId: res.locals.requestId,
            provider: resolved.selection.provider,
            model: resolved.selection.model,
            mode: resolved.generator.mode,
            outcome: "failure",
            latencyMs: Math.round(performance.now() - generationStarted),
            promptCharacters,
            promptTokens: Math.ceil(promptCharacters / 4),
            promptTokensMeasured: false,
          }),
        );
        throw error;
      }
    } catch (error) {
      next(error);
    }
  });
  if (process.env.NODE_ENV === "production") {
    app.use(express.static(resolve("dist")));
    app.get("/{*splat}", (req, res, next) =>
      req.path.startsWith("/api/")
        ? next()
        : res.sendFile(resolve("dist/index.html")),
    );
  }
  app.use((_req, res) =>
    res.status(404).json({
      error: {
        code: "NOT_FOUND",
        message: "Route not found.",
        requestId: res.locals.requestId,
      },
    }),
  );
  app.use(
    (
      error: unknown,
      _req: express.Request,
      res: express.Response,
      _next: express.NextFunction,
    ) => {
      const status =
        typeof error === "object" &&
        error &&
        "status" in error &&
        typeof error.status === "number"
          ? error.status
          : undefined;
      const known =
        error instanceof AppError
          ? error
          : status === 400
            ? new AppError(
                400,
                "INVALID_JSON",
                "Request body must be valid JSON.",
              )
            : status === 413
              ? new AppError(
                  413,
                  "PAYLOAD_TOO_LARGE",
                  "Request body exceeds the 16 KB limit.",
                )
              : new AppError(
                  503,
                  "SERVICE_UNAVAILABLE",
                  "Personalization is temporarily unavailable. Please try again.",
                );
      res.status(known.status).json({
        error: {
          code: known.code,
          message: known.message,
          requestId: res.locals.requestId,
        },
      });
    },
  );
  return app;
}
