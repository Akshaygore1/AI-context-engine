export type Confidence = "HIGH" | "MEDIUM" | "LOW";
export type Intent = "career" | "relationship" | "health" | "finance" | "general";
export type SourceName = "profile" | "kundli" | "horoscope" | "panchang";

export interface UserProfile {
  id: string;
  name: string;
  preferredLanguage: string;
  preferredTone: string;
  subscription: string;
}

export interface Kundli {
  userId: string;
  moonSign: string;
  currentDasha: string;
  houses: Record<string, string>;
}

export interface Horoscope {
  userId: string;
  career: string;
  relationship: string;
  health: string;
  finance: string;
}

export interface Panchang {
  tithi: string;
  nakshatra: string;
  yoga: string;
  guidance: string;
}

export interface GatheredContext {
  profile?: UserProfile;
  kundli?: Kundli;
  horoscope?: Horoscope;
  panchang?: Panchang;
  outcomes: Record<SourceName, UpstreamOutcome>;
}

export interface UpstreamOutcome {
  available: boolean;
  attempts: number;
  latencyMs: number;
  cache: "hit" | "miss";
  reason?: string;
}

export interface ContextItem {
  id: string;
  label: string;
  source: SourceName;
  value: string;
  priority: "primary" | "secondary";
}

export interface Decision {
  intent: Intent;
  intents: Intent[];
  selectedContext: Array<{ id: string; label: string; source: SourceName; priority: string }>;
  excludedContext: Array<{ id: string; label: string; reason: string }>;
  budgetOmissions: Array<{ id: string; label: string; reason: string }>;
  missingContext: Array<{ id: string; label: string; reason: string }>;
  language: string;
  tone: string;
  maxWords: number;
  reasons: string[];
  confidence: Confidence;
  contextCharacters: number;
  unavailableSources: Array<{ source: SourceName; reason: string }>;
}

export interface PersonalizationResult {
  decision: Decision;
  context: ContextItem[];
  question: string;
}

export interface Generator {
  readonly mode: "mock" | "real";
  generate(input: PersonalizationResult): Promise<string>;
}
