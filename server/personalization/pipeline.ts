import { config } from "../config.js";
import type { ContextItem, GatheredContext, PersonalizationResult } from "../types.js";
import type { IntentDetector } from "./intent.js";
import { contextRules } from "./rules.js";

const catalog = (data: GatheredContext): Record<string, Omit<ContextItem, "priority">> => ({
  "horoscope.career": { id: "horoscope.career", label: "Career Horoscope", source: "horoscope", value: data.horoscope.career },
  "kundli.house10": { id: "kundli.house10", label: "10th House", source: "kundli", value: data.kundli.houses["10"] },
  "kundli.currentDasha": { id: "kundli.currentDasha", label: "Current Dasha", source: "kundli", value: data.kundli.currentDasha },
  "panchang.guidance": { id: "panchang.guidance", label: "Panchang", source: "panchang", value: `${data.panchang.tithi}; ${data.panchang.nakshatra}; ${data.panchang.guidance}` },
  "profile.name": { id: "profile.name", label: "Name", source: "profile", value: data.profile.name },
  "profile.subscription": { id: "profile.subscription", label: "Subscription", source: "profile", value: data.profile.subscription },
  "kundli.moonSign": { id: "kundli.moonSign", label: "Moon Sign", source: "kundli", value: data.kundli.moonSign },
});

export class PersonalizationPipeline {
  constructor(private readonly detector: IntentDetector) {}

  run(question: string, data: GatheredContext): PersonalizationResult {
    const detected = this.detector.detect(question);
    const entries = catalog(data);
    const rule = contextRules[detected.primary];
    const context = [
      ...rule.primary.map((id) => ({ ...entries[id], priority: "primary" as const })),
      ...rule.secondary.map((id) => ({ ...entries[id], priority: "secondary" as const })),
    ];
    const selectedIds = new Set(context.map((item) => item.id));
    return {
      question,
      context,
      decision: {
        intent: detected.primary,
        intents: detected.intents,
        selectedContext: context.map(({ id, label, source, priority }) => ({ id, label, source, priority })),
        excludedContext: Object.values(entries).filter((item) => !selectedIds.has(item.id)).map(({ id, label }) => ({ id, label, reason: "Not relevant to the detected career intent." })),
        language: data.profile.preferredLanguage,
        tone: data.profile.preferredTone,
        maxWords: config.responseMaxWords,
        reasons: ["Career intent uses career and 10th-house context first, then dasha and Panchang context."],
        confidence: "HIGH",
      },
    };
  }
}
