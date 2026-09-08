import type { GatheredContext } from "../types.js";

export function buildContextCatalog(data: GatheredContext) {
  return {
    "horoscope.career": { id: "horoscope.career", label: "Career Horoscope", source: "horoscope", value: data.horoscope?.career },
    "kundli.house10": { id: "kundli.house10", label: "10th House", source: "kundli", value: data.kundli?.houses["10"] },
    "kundli.currentDasha": { id: "kundli.currentDasha", label: "Current Dasha", source: "kundli", value: data.kundli?.currentDasha },
    "kundli.house7": { id: "kundli.house7", label: "7th House", source: "kundli", value: data.kundli?.houses["7"] },
    "kundli.house6": { id: "kundli.house6", label: "6th House", source: "kundli", value: data.kundli?.houses["6"] },
    "horoscope.relationship": { id: "horoscope.relationship", label: "Relationship Horoscope", source: "horoscope", value: data.horoscope?.relationship },
    "horoscope.health": { id: "horoscope.health", label: "Health Horoscope", source: "horoscope", value: data.horoscope?.health },
    "horoscope.finance": { id: "horoscope.finance", label: "Finance Horoscope", source: "horoscope", value: data.horoscope?.finance },
    "panchang.guidance": { id: "panchang.guidance", label: "Panchang", source: "panchang", value: data.panchang ? `${data.panchang.tithi}; ${data.panchang.nakshatra}; ${data.panchang.guidance}` : undefined },
    "profile.name": { id: "profile.name", label: "Name", source: "profile", value: data.profile?.name },
    "profile.subscription": { id: "profile.subscription", label: "Subscription", source: "profile", value: data.profile?.subscription },
    "kundli.moonSign": { id: "kundli.moonSign", label: "Moon Sign", source: "kundli", value: data.kundli?.moonSign },
    "kundli.summary": { id: "kundli.summary", label: "Kundli Summary", source: "kundli", value: data.kundli ? `Moon sign: ${data.kundli.moonSign}; current dasha: ${data.kundli.currentDasha}` : undefined },
  } as const;
}

export type ContextId = keyof ReturnType<typeof buildContextCatalog>;
