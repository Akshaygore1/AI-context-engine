import { config } from "../config.js";
import type { ContextItem, GatheredContext, PersonalizationResult } from "../types.js";
import type { IntentDetector } from "./intent.js";
import { contextRules } from "./rules.js";

interface CatalogEntry { id: string; label: string; source: "profile" | "kundli" | "horoscope" | "panchang"; value?: string }
const catalog = (data: GatheredContext): Record<string, CatalogEntry> => ({
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
});

const supportedLanguages = new Map([["english", "English"], ["hindi", "Hindi"]]);
const supportedTones = new Map([["supportive", "supportive"], ["direct", "direct"], ["gentle", "gentle"]]);
const normalize = (value: string, supported: Map<string, string>, fallback: string) => supported.get(value.trim().toLowerCase()) ?? fallback;

export class PersonalizationPipeline {
  constructor(private readonly detector: IntentDetector) {}

  run(question: string, data: GatheredContext): PersonalizationResult {
    const detected = this.detector.detect(question);
    const entries = catalog(data);
    const requested = new Map<string, "primary" | "secondary">();
    for (const intent of detected.intents) {
      for (const id of contextRules[intent].primary) requested.set(id, "primary");
      for (const id of contextRules[intent].secondary) if (!requested.has(id)) requested.set(id, "secondary");
    }
    const ordered = [...requested.entries()].sort((left, right) => left[1] === right[1] ? 0 : left[1] === "primary" ? -1 : 1);
    const context: ContextItem[] = [];
    const budgetOmissions: Array<{ id: string; label: string; reason: string }> = [];
    const missingContext: Array<{ id: string; label: string; reason: string }> = [];
    let contextCharacters = 0;
    for (const [id, priority] of ordered) {
      const item = { ...entries[id], priority };
      if (!item.value) {
        missingContext.push({ id, label: item.label, reason: data.outcomes[item.source].reason ?? "Expected context was missing." });
      } else if (contextCharacters + item.value.length > config.contextMaxChars) {
        budgetOmissions.push({ id, label: item.label, reason: `Omitted by the ${config.contextMaxChars}-character context budget.` });
      } else {
        context.push(item as ContextItem);
        contextCharacters += item.value.length;
      }
    }
    const selectedIds = new Set(context.map((item) => item.id));
    return {
      question,
      context,
      decision: {
        intent: detected.primary,
        intents: detected.intents,
        selectedContext: context.map(({ id, label, source, priority }) => ({ id, label, source, priority })),
        excludedContext: Object.values(entries).filter((item) => !selectedIds.has(item.id) && !requested.has(item.id)).map(({ id, label }) => ({ id, label, reason: `Deliberately excluded because it is not relevant to: ${detected.intents.join(", ")}.` })),
        budgetOmissions,
        missingContext,
        language: normalize(data.profile?.preferredLanguage ?? "", supportedLanguages, "English"),
        tone: normalize(data.profile?.preferredTone ?? "", supportedTones, "supportive"),
        maxWords: config.responseMaxWords,
        reasons: [`Matched ${detected.intents.join(", ")} using configured weighted phrases.`, "Combined and deduplicated all matched-intent fields, with primary context ordered first.", ...(data.profile ? [] : ["Profile unavailable; used English and supportive defaults."]), ...(missingContext.length ? ["Guidance is qualified because expected context is unavailable."] : [])],
        confidence: missingContext.length === 0 && budgetOmissions.length === 0 && data.profile ? "HIGH" : context.some((item) => item.priority === "primary") ? "MEDIUM" : "LOW",
        contextCharacters,
        unavailableSources: Object.entries(data.outcomes).filter(([, outcome]) => !outcome.available).map(([source, outcome]) => ({ source: source as keyof GatheredContext["outcomes"], reason: outcome.reason ?? "Unavailable" })),
      },
    };
  }
}
