import { config } from "../config.js";
import type { ContextItem, GatheredContext, PersonalizationResult } from "../types.js";
import type { IntentDetector } from "./intent.js";
import { buildContextCatalog, contextComposition, type ContextId } from "./catalog.js";
import { contextRules } from "./rules.js";

const supportedLanguages = new Map([["english", "English"], ["hindi", "Hindi"]]);
const supportedTones = new Map([["supportive", "supportive"], ["direct", "direct"], ["gentle", "gentle"]]);
const normalize = (value: string, supported: Map<string, string>, fallback: string) => supported.get(value.trim().toLowerCase()) ?? fallback;

export class PersonalizationPipeline {
  constructor(private readonly detector: IntentDetector) {}

  run(question: string, data: GatheredContext): PersonalizationResult {
    const detected = this.detector.detect(question);
    const entries = buildContextCatalog(data);
    const requested = new Map<ContextId, "primary" | "secondary">();
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
    const representedIds = new Set(selectedIds);
    for (const selectedId of selectedIds) {
      for (const representedId of contextComposition[selectedId as ContextId] ?? []) representedIds.add(representedId);
    }
    return {
      question,
      context,
      decision: {
        intent: detected.primary,
        intents: detected.intents,
        selectedContext: context.map(({ id, label, source, priority }) => ({ id, label, source, priority })),
        excludedContext: Object.values(entries).filter((item) => !representedIds.has(item.id) && !requested.has(item.id)).map(({ id, label }) => ({ id, label, reason: `Deliberately excluded because it is not relevant to: ${detected.intents.join(", ")}.` })),
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
