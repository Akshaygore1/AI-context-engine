import { z } from "zod";
import { config } from "../config.js";
import type { GatheredContext, Horoscope, Kundli, Panchang, SourceName, UpstreamOutcome, UserProfile } from "../types.js";
import { SuccessCache } from "./cache.js";

const cache = new SuccessCache(config.cacheMaxEntries);
const profileSchema = z.object({ id: z.string(), name: z.string(), preferredLanguage: z.string(), preferredTone: z.string(), subscription: z.string() });
const kundliSchema = z.object({ userId: z.string(), moonSign: z.string(), currentDasha: z.string(), houses: z.record(z.string(), z.string()) });
const horoscopeSchema = z.object({ userId: z.string(), career: z.string(), relationship: z.string(), health: z.string(), finance: z.string() });
const panchangSchema = z.object({ tithi: z.string(), nakshatra: z.string(), yoga: z.string(), guidance: z.string() });

type ReadResult<T> = { value?: T; outcome: UpstreamOutcome };
const wait = (milliseconds: number) => new Promise((resolve) => setTimeout(resolve, milliseconds));
const shouldRetry = (status?: number) => status === undefined || status === 408 || status === 429 || status >= 500;

async function resilientRead<T>(source: SourceName, key: string, url: string, schema: z.ZodType<T>): Promise<ReadResult<T>> {
  const started = performance.now();
  const cached = cache.get<T>(key);
  if (cached) {
    const outcome = { available: true, attempts: 0, latencyMs: Math.round(performance.now() - started), cache: "hit" as const };
    console.info(JSON.stringify({ event: "upstream", source, ...outcome }));
    return { value: cached, outcome };
  }
  let lastReason = "Upstream service did not respond.";
  let attempts = 0;
  for (let attempt = 1; attempt <= config.upstreamMaxAttempts; attempt += 1) {
    attempts = attempt;
    try {
      const response = await fetch(url, { signal: AbortSignal.timeout(config.upstreamTimeoutMs) });
      if (!response.ok) {
        lastReason = response.status === 404 ? "Resource was not found." : `Upstream returned ${response.status}.`;
        if (!shouldRetry(response.status)) break;
      } else {
        const parsed = schema.safeParse(await response.json());
        if (!parsed.success) { lastReason = "Upstream returned an invalid payload."; break; }
        cache.set(key, parsed.data, config.cacheTtlMs);
        const outcome = { available: true, attempts, latencyMs: Math.round(performance.now() - started), cache: "miss" as const };
        console.info(JSON.stringify({ event: "upstream", source, ...outcome }));
        return { value: parsed.data, outcome };
      }
    } catch (error) {
      lastReason = error instanceof DOMException && error.name === "TimeoutError" ? "Upstream request timed out." : "Upstream network request failed.";
    }
    if (attempt < config.upstreamMaxAttempts) await wait(config.upstreamRetryBackoffMs * attempt);
  }
  const outcome = { available: false, attempts, latencyMs: Math.round(performance.now() - started), cache: "miss" as const, reason: lastReason };
  console.warn(JSON.stringify({ event: "upstream", source, ...outcome }));
  return { outcome };
}

const endpoint = (source: SourceName, fallbackPath: string) => config.serviceUrls[source] || `${config.upstreamBaseUrl}${fallbackPath}`;

export async function gatherContext(userId: string): Promise<GatheredContext> {
  const encodedUser = encodeURIComponent(userId);
  const [profile, kundli, horoscope, panchang] = await Promise.all([
    resilientRead("profile", `profile:${userId}`, endpoint("profile", `/users/${encodedUser}`), profileSchema),
    resilientRead("kundli", `kundli:${userId}`, endpoint("kundli", `/kundli/${encodedUser}`), kundliSchema),
    resilientRead("horoscope", `horoscope:${userId}`, endpoint("horoscope", `/horoscope/${encodedUser}`), horoscopeSchema),
    resilientRead("panchang", "panchang:global", endpoint("panchang", "/panchang"), panchangSchema),
  ]);
  return {
    profile: profile.value as UserProfile | undefined,
    kundli: kundli.value as Kundli | undefined,
    horoscope: horoscope.value as Horoscope | undefined,
    panchang: panchang.value as Panchang | undefined,
    outcomes: { profile: profile.outcome, kundli: kundli.outcome, horoscope: horoscope.outcome, panchang: panchang.outcome },
  };
}
