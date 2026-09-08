import cors from "cors";
import express from "express";
import { randomUUID } from "node:crypto";
import { config } from "./config.js";
import { readPayload } from "./db/database.js";
import { MockGenerator } from "./generation/mock.js";
import { AppError } from "./http/errors.js";
import { parsePersonalizationRequest } from "./http/validation.js";
import { WeightedPhraseIntentDetector } from "./personalization/intent.js";
import { PersonalizationPipeline } from "./personalization/pipeline.js";
import { gatherContext } from "./upstream/client.js";

export function createApp() {
  const app = express();
  const pipeline = new PersonalizationPipeline(new WeightedPhraseIntentDetector());
  const generator = new MockGenerator();
  app.use(cors({ origin: config.webOrigin }));
  app.use(express.json({ limit: "16kb" }));
  app.use((req, res, next) => {
    const started = performance.now();
    const requestId = req.header("x-request-id") ?? randomUUID();
    res.locals.requestId = requestId;
    res.setHeader("x-request-id", requestId);
    res.on("finish", () => console.info(JSON.stringify({ requestId, route: req.path, status: res.statusCode, durationMs: Math.round(performance.now() - started) })));
    next();
  });

  const mockRoute = (path: string, table: Parameters<typeof readPayload>[0], keyColumn: string, fixedKey?: number) =>
    app.get(path, (req, res) => {
      const parameter = req.params.userId;
      const key = fixedKey ?? (Array.isArray(parameter) ? parameter[0] : parameter);
      const value = readPayload(table, keyColumn, key);
      if (!value) return res.status(404).json({ error: { code: "NOT_FOUND", message: "Resource not found.", requestId: res.locals.requestId } });
      return res.json(value);
    });
  mockRoute("/api/mock/users/:userId", "users", "id");
  mockRoute("/api/mock/kundli/:userId", "kundli", "user_id");
  mockRoute("/api/mock/horoscope/:userId", "horoscope", "user_id");
  mockRoute("/api/mock/panchang", "panchang", "id", 1);

  const decide = async (body: unknown) => {
    const input = parsePersonalizationRequest(body);
    const data = await gatherContext(input.userId);
    return pipeline.run(input.question, data);
  };
  app.post("/api/debug/personalization", async (req, res, next) => {
    try { const result = await decide(req.body); res.json({ ...result.decision, requestId: res.locals.requestId }); } catch (error) { next(error); }
  });
  app.post("/api/personalize", async (req, res, next) => {
    try {
      const result = await decide(req.body);
      const answer = await generator.generate(result);
      res.json({ answer, confidence: result.decision.confidence, sourcesUsed: result.context.map((item) => item.label), mode: generator.mode, requestId: res.locals.requestId });
    } catch (error) { next(error); }
  });
  app.use((error: unknown, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
    const known = error instanceof AppError ? error : new AppError(503, "SERVICE_UNAVAILABLE", "Personalization is temporarily unavailable. Please try again.");
    res.status(known.status).json({ error: { code: known.code, message: known.message, requestId: res.locals.requestId } });
  });
  return app;
}
