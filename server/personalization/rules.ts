import type { Intent } from "../types.js";
import type { ContextId } from "./catalog.js";

interface ContextRule {
  primary: readonly ContextId[];
  secondary: readonly ContextId[];
}

export const contextRules = {
  career: {
    primary: ["horoscope.career", "kundli.house10"],
    secondary: ["kundli.currentDasha", "panchang.guidance"],
  },
  relationship: {
    primary: ["horoscope.relationship", "kundli.house7"],
    secondary: ["kundli.moonSign", "kundli.currentDasha"],
  },
  health: {
    primary: ["horoscope.health", "kundli.house6"],
    secondary: ["kundli.moonSign", "panchang.guidance"],
  },
  finance: {
    primary: ["horoscope.finance"],
    secondary: [],
  },
  general: {
    primary: [
      "horoscope.career",
      "horoscope.relationship",
      "horoscope.health",
      "horoscope.finance",
    ],
    secondary: ["kundli.summary", "panchang.guidance"],
  },
} as const satisfies Record<Intent, ContextRule>;
