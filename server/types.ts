export type Confidence = "HIGH" | "MEDIUM" | "LOW";
export type Intent = "career";
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
  profile: UserProfile;
  kundli: Kundli;
  horoscope: Horoscope;
  panchang: Panchang;
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
  language: string;
  tone: string;
  maxWords: number;
  reasons: string[];
  confidence: Confidence;
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
