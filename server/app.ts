import cors from "cors";
import express from "express";
import { randomUUID } from "node:crypto";
import { resolve } from "node:path";
import { config } from "./config.js";
import { readPayload } from "./db/database.js";
import { createGenerator } from "./generation/index.js";
import { buildGenerationPrompt, generationSystemPrompt } from "./generation/prompt.js";
import { AppError } from "./http/errors.js";
import { parsePersonalizationRequest } from "./http/validation.js";
import { WeightedPhraseIntentDetector } from "./personalization/intent.js";
import { PersonalizationPipeline } from "./personalization/pipeline.js";
import { gatherContext } from "./upstream/client.js";

export function createApp() {
  const app = express();
  const pipeline = new PersonalizationPipeline(new WeightedPhraseIntentDetector());
  const generator = createGenerator();
  app.use(cors({ origin: config.webOrigin }));
  app.use((req, res, next) => {
    const started = performance.now();
    const requestId = req.header("x-request-id") ?? randomUUID();
    res.locals.requestId = requestId;
    res.setHeader("x-request-id", requestId);
    res.on("finish", () => console.info(JSON.stringify({ requestId, route: req.path, status: res.statusCode, durationMs: Math.round(performance.now() - started) })));
    next();
  });
  app.use(express.json({ limit: "16kb" }));

  const mockRoute = (path: string[], table: Parameters<typeof readPayload>[0], keyColumn: string, fixedKey?: number) =>
    app.get(path, (req, res) => {
      const parameter = req.params.userId;
      const key = fixedKey ?? (Array.isArray(parameter) ? parameter[0] : parameter);
      const value = readPayload(table, keyColumn, key);
      if (!value) return res.status(404).json({ error: { code: "NOT_FOUND", message: "Resource not found.", requestId: res.locals.requestId } });
      return res.json(value);
    });
  mockRoute(["/users/:userId", "/api/mock/users/:userId"], "users", "id");
  mockRoute(["/kundli/:userId", "/api/mock/kundli/:userId"], "kundli", "user_id");
  mockRoute(["/horoscope/:userId", "/api/mock/horoscope/:userId"], "horoscope", "user_id");
  mockRoute(["/panchang", "/api/mock/panchang"], "panchang", "id", 1);
  app.get("/health", (_req, res) => res.json({ status: "ok", generationMode: generator.mode }));

  const decide = async (body: unknown, requestId: string) => {
    const input = parsePersonalizationRequest(body);
    const data = await gatherContext(input.userId, requestId);
    const result = pipeline.run(input.question, data);
    if (result.context.length === 0) throw new AppError(503, "CONTEXT_UNAVAILABLE", "Relevant astrological context is temporarily unavailable. Please try again.");
    console.info(JSON.stringify({ event: "decision", requestId, selectedContextCount: result.context.length, unavailableSources: result.decision.unavailableSources.map((item) => item.source), contextCharacters: result.decision.contextCharacters }));
    return result;
  };
  app.post(["/debug/personalization", "/api/debug/personalization"], async (req, res, next) => {
    try { const result = await decide(req.body, res.locals.requestId); res.json({ ...result.decision, requestId: res.locals.requestId }); } catch (error) { next(error); }
  });
  app.post(["/personalize", "/api/personalize"], async (req, res, next) => {
    try {
      const result = await decide(req.body, res.locals.requestId);
      const generationStarted = performance.now();
      const promptCharacters = generationSystemPrompt.length + buildGenerationPrompt(result).length;
      try {
        const generated = await generator.generate(result);
        console.info(JSON.stringify({ event: "generation", requestId: res.locals.requestId, mode: generator.mode, outcome: "success", latencyMs: Math.round(performance.now() - generationStarted), promptCharacters: generated.promptCharacters, promptTokens: generated.usage?.inputTokens ?? generated.promptTokenEstimate, promptTokensMeasured: generated.usage?.inputTokens !== undefined, outputTokens: generated.usage?.outputTokens, totalTokens: generated.usage?.totalTokens }));
        res.json({ answer: generated.text, confidence: result.decision.confidence, sourcesUsed: result.context.map((item) => item.label), mode: generator.mode, requestId: res.locals.requestId });
      } catch (error) {
        console.warn(JSON.stringify({ event: "generation", requestId: res.locals.requestId, mode: generator.mode, outcome: "failure", latencyMs: Math.round(performance.now() - generationStarted), promptCharacters, promptTokens: Math.ceil(promptCharacters / 4), promptTokensMeasured: false }));
        throw error;
      }
    } catch (error) { next(error); }
  });
  if (process.env.NODE_ENV === "production") {
    app.use(express.static(resolve("dist")));
    app.get("/{*splat}", (req, res, next) => req.path.startsWith("/api/") ? next() : res.sendFile(resolve("dist/index.html")));
  }
  app.use((_req, res) => res.status(404).json({ error: { code: "NOT_FOUND", message: "Route not found.", requestId: res.locals.requestId } }));
  app.use((error: unknown, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
    const status = typeof error === "object" && error && "status" in error && typeof error.status === "number" ? error.status : undefined;
    const known = error instanceof AppError
      ? error
      : status === 400
        ? new AppError(400, "INVALID_JSON", "Request body must be valid JSON.")
        : status === 413
          ? new AppError(413, "PAYLOAD_TOO_LARGE", "Request body exceeds the 16 KB limit.")
          : new AppError(503, "SERVICE_UNAVAILABLE", "Personalization is temporarily unavailable. Please try again.");
    res.status(known.status).json({ error: { code: known.code, message: known.message, requestId: res.locals.requestId } });
  });
  return app;
}
