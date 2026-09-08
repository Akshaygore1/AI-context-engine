import type { Intent } from "../types.js";

export interface IntentDetector { detect(question: string): { primary: Intent; intents: Intent[] } }

const intentPhrases: Record<Exclude<Intent, "general">, Array<{ phrase: string; weight: number }>> = {
  career: [
    { phrase: "career", weight: 4 }, { phrase: "job", weight: 3 }, { phrase: "work", weight: 2 },
    { phrase: "promotion", weight: 4 }, { phrase: "profession", weight: 3 }, { phrase: "business", weight: 2 },
  ],
  relationship: [
    { phrase: "relationship", weight: 4 }, { phrase: "love", weight: 3 }, { phrase: "partner", weight: 3 },
    { phrase: "marriage", weight: 4 }, { phrase: "family", weight: 2 },
  ],
  health: [
    { phrase: "health", weight: 4 }, { phrase: "wellbeing", weight: 3 }, { phrase: "well-being", weight: 3 },
    { phrase: "energy", weight: 2 }, { phrase: "stress", weight: 2 }, { phrase: "routine", weight: 1 },
  ],
  finance: [
    { phrase: "finance", weight: 4 }, { phrase: "money", weight: 4 }, { phrase: "financial", weight: 4 },
    { phrase: "saving", weight: 3 }, { phrase: "investment", weight: 3 }, { phrase: "income", weight: 2 },
  ],
};
const intentOrder: Intent[] = ["career", "relationship", "health", "finance", "general"];

export class WeightedPhraseIntentDetector implements IntentDetector {
  detect(question: string): { primary: Intent; intents: Intent[] } {
    const normalized = question.toLocaleLowerCase("en-US");
    const scored = Object.entries(intentPhrases).map(([intent, phrases]) => ({
      intent: intent as Exclude<Intent, "general">,
      score: phrases.reduce((sum, entry) => sum + (normalized.includes(entry.phrase) ? entry.weight : 0), 0),
    })).filter(({ score }) => score > 0);
    if (scored.length === 0) return { primary: "general", intents: ["general"] };
    scored.sort((left, right) => right.score - left.score || intentOrder.indexOf(left.intent) - intentOrder.indexOf(right.intent));
    return { primary: scored[0].intent, intents: scored.map(({ intent }) => intent).sort((a, b) => intentOrder.indexOf(a) - intentOrder.indexOf(b)) };
  }
}
