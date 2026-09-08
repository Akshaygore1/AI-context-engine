import type { Intent } from "../types.js";

export interface IntentDetector { detect(question: string): { primary: Intent; intents: Intent[] } }

export class CareerIntentDetector implements IntentDetector {
  detect(): { primary: Intent; intents: Intent[] } { return { primary: "career", intents: ["career"] }; }
}
