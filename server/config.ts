const numberFromEnv = (name: string, fallback: number) => {
  const parsed = Number(process.env[name]);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
};

export const config = {
  port: numberFromEnv("PORT", 3001),
  webOrigin: process.env.WEB_ORIGIN ?? "http://localhost:5173",
  upstreamBaseUrl: process.env.UPSTREAM_BASE_URL ?? "http://localhost:3001/api/mock",
  responseMaxWords: numberFromEnv("RESPONSE_MAX_WORDS", 180),
  contextMaxChars: numberFromEnv("CONTEXT_MAX_CHARS", 2400),
  databasePath: process.env.DATABASE_PATH ?? "data/context-engine.db",
};
