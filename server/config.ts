const numberFromEnv = (name: string, fallback: number) => {
  const parsed = Number(process.env[name]);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
};

export const config = {
  port: numberFromEnv("PORT", 3001),
  webOrigin: process.env.WEB_ORIGIN ?? "http://localhost:5173",
  upstreamBaseUrl: process.env.UPSTREAM_BASE_URL ?? "http://localhost:3001/api/mock",
  serviceUrls: {
    profile: process.env.USER_SERVICE_URL,
    kundli: process.env.KUNDLI_SERVICE_URL,
    horoscope: process.env.HOROSCOPE_SERVICE_URL,
    panchang: process.env.PANCHANG_SERVICE_URL,
  },
  responseMaxWords: numberFromEnv("RESPONSE_MAX_WORDS", 180),
  contextMaxChars: numberFromEnv("CONTEXT_MAX_CHARS", 2400),
  upstreamTimeoutMs: numberFromEnv("UPSTREAM_TIMEOUT_MS", 1200),
  upstreamMaxAttempts: numberFromEnv("UPSTREAM_MAX_ATTEMPTS", 2),
  upstreamRetryBackoffMs: numberFromEnv("UPSTREAM_RETRY_BACKOFF_MS", 100),
  cacheTtlMs: numberFromEnv("CACHE_TTL_MS", 30_000),
  cacheMaxEntries: numberFromEnv("CACHE_MAX_ENTRIES", 100),
  databasePath: process.env.DATABASE_PATH ?? "data/context-engine.db",
};
