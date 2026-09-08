import { z } from "zod";
import { config } from "../config.js";
import type { GatheredContext, Horoscope, Kundli, Panchang, SourceName, UpstreamOutcome, UserProfile } from "../types.js";
import { SuccessCache } from "./cache.js";

const cache = new SuccessCache(config.cacheMaxEntries);
const profileSchema = z.object({ id: z.string(), name: z.string(), preferredLanguage: z.string(), preferredTone: z.string(), subscription: z.string(), birthDetails: z.object({ date: z.string(), time: z.string(), place: z.string() }) });
const kundliSchema = z.object({ userId: z.string(), moonSign: z.string(), currentDasha: z.string(), houses: z.record(z.string(), z.string()), ascendant: z.string(), planets: z.record(z.string(), z.string()) });
const horoscopeSchema = z.object({ userId: z.string(), career: z.string(), relationship: z.string(), health: z.string(), finance: z.string() });
const panchangSchema = z.object({ tithi: z.string(), nakshatra: z.string(), yoga: z.string(), guidance: z.string() });

type ReadResult<T> = { value?: T; outcome: UpstreamOutcome };
const wait = (milliseconds: number) => new Promise((resolve) => setTimeout(resolve, milliseconds));
const shouldRetry = (status?: number) => status === undefined || status === 408 || status === 429 || status >= 500;

async function resilientRead<T>(source: SourceName, key: string, url: string, schema: z.ZodType<T>, requestId: string): Promise<ReadResult<T>> {
  const started = performance.now();
  const cached = cache.get<T>(key);
  if (cached) {
    const outcome = { available: true, attempts: 0, latencyMs: Math.round(performance.now() - started), cache: "hit" as const };
    console.info(JSON.stringify({ event: "upstream", requestId, source, ...outcome }));
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
        let payload: unknown;
        try { payload = JSON.parse(await response.text()); }
        catch { lastReason = "Upstream returned malformed JSON."; break; }
        const parsed = schema.safeParse(payload);
        if (!parsed.success) { lastReason = "Upstream returned an invalid payload."; break; }
        cache.set(key, parsed.data, config.cacheTtlMs);
        const outcome = { available: true, attempts, latencyMs: Math.round(performance.now() - started), cache: "miss" as const };
        console.info(JSON.stringify({ event: "upstream", requestId, source, ...outcome }));
        return { value: parsed.data, outcome };
      }
    } catch (error) {
      lastReason = error instanceof DOMException && error.name === "TimeoutError" ? "Upstream request timed out." : "Upstream network request failed.";
    }
    if (attempt < config.upstreamMaxAttempts) await wait(config.upstreamRetryBackoffMs * attempt);
  }
  const outcome = { available: false, attempts, latencyMs: Math.round(performance.now() - started), cache: "miss" as const, reason: lastReason };
  console.warn(JSON.stringify({ event: "upstream", requestId, source, ...outcome }));
  return { outcome };
}

const endpoint = (source: SourceName, fallbackPath: string, encodedUser?: string) => {
  const override = config.serviceUrls[source];
  if (!override) return `${config.upstreamBaseUrl}${fallbackPath}`;
  if (encodedUser && override.includes("{userId}")) return override.replaceAll("{userId}", encodedUser);
  if (encodedUser && override.endsWith("/")) return `${override}${encodedUser}`;
  return override;
};

export async function gatherContext(userId: string, requestId: string): Promise<GatheredContext> {
  const encodedUser = encodeURIComponent(userId);
  const requestedProfileSchema = profileSchema.refine((profile) => profile.id === userId, { message: "Profile belongs to a different user." });
  const requestedKundliSchema = kundliSchema.refine((kundli) => kundli.userId === userId, { message: "Kundli belongs to a different user." });
  const requestedHoroscopeSchema = horoscopeSchema.refine((horoscope) => horoscope.userId === userId, { message: "Horoscope belongs to a different user." });
  const [profile, kundli, horoscope, panchang] = await Promise.all([
    resilientRead("profile", `profile:${userId}`, endpoint("profile", `/users/${encodedUser}`, encodedUser), requestedProfileSchema, requestId),
    resilientRead("kundli", `kundli:${userId}`, endpoint("kundli", `/kundli/${encodedUser}`, encodedUser), requestedKundliSchema, requestId),
    resilientRead("horoscope", `horoscope:${userId}`, endpoint("horoscope", `/horoscope/${encodedUser}`, encodedUser), requestedHoroscopeSchema, requestId),
    resilientRead("panchang", "panchang:global", endpoint("panchang", "/panchang"), panchangSchema, requestId),
  ]);
  return {
    profile: profile.value as UserProfile | undefined,
    kundli: kundli.value as Kundli | undefined,
    horoscope: horoscope.value as Horoscope | undefined,
    panchang: panchang.value as Panchang | undefined,
    outcomes: { profile: profile.outcome, kundli: kundli.outcome, horoscope: horoscope.outcome, panchang: panchang.outcome },
  };
}
