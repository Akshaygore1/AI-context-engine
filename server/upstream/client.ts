import { config } from "../config.js";
import type { GatheredContext, Horoscope, Kundli, Panchang, UserProfile } from "../types.js";

async function readJson<T>(path: string): Promise<T> {
  const response = await fetch(`${config.upstreamBaseUrl}${path}`);
  if (!response.ok) throw new Error(`Upstream request failed with ${response.status}`);
  return response.json() as Promise<T>;
}

export async function gatherContext(userId: string): Promise<GatheredContext> {
  const [profile, kundli, horoscope, panchang] = await Promise.all([
    readJson<UserProfile>(`/users/${encodeURIComponent(userId)}`),
    readJson<Kundli>(`/kundli/${encodeURIComponent(userId)}`),
    readJson<Horoscope>(`/horoscope/${encodeURIComponent(userId)}`),
    readJson<Panchang>("/panchang"),
  ]);
  return { profile, kundli, horoscope, panchang };
}
