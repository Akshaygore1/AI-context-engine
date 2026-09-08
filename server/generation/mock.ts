import type { Generator } from "../types.js";
import { buildGenerationPrompt, generationSystemPrompt } from "./prompt.js";

export class MockGenerator implements Generator {
  readonly mode = "mock" as const;
  async generate(input: Parameters<Generator["generate"]>[0]) {
    const strongest = input.context.filter((item) => item.priority === "primary").slice(0, 2).map((item) => item.value).join(" ");
    const topic = input.decision.intents.join(" and ");
    const limitation = input.decision.missingContext.length ? ` Some expected context was unavailable (${input.decision.missingContext.map((item) => item.label).join(", ")}), so keep this guidance appropriately qualified.` : "";
    const hindiOpening = input.decision.tone === "direct"
      ? "एक व्यावहारिक अगला कदम चुनें।"
      : input.decision.tone === "gentle"
        ? "धीरे और स्थिरता से आगे बढ़ना आपके लिए उपयोगी हो सकता है।"
        : `आपके ${topic} संदर्भ से संतुलित और विचारशील दृष्टिकोण का संकेत मिलता है।`;
    const text = input.decision.language === "Hindi"
      ? `${hindiOpening}${input.decision.missingContext.length ? " कुछ अपेक्षित संदर्भ उपलब्ध नहीं हैं, इसलिए इस मार्गदर्शन को सीमित मानें।" : ""} इसे निश्चित भविष्यवाणी न मानें। अपनी परिस्थितियों के अनुसार निर्णय लें और महत्वपूर्ण स्वास्थ्य या वित्तीय विषयों के लिए योग्य विशेषज्ञ से सलाह लें।`
      : `${input.decision.tone === "direct" ? "Focus on a practical next step." : input.decision.tone === "gentle" ? "A gentle, steady approach may serve you well." : `Your ${topic} context suggests a steady, reflective approach.`} ${strongest}${limitation} Use this as perspective rather than a guaranteed prediction: choose one practical next step, check it against your circumstances, and seek qualified advice for consequential health or financial decisions.`;
    const promptCharacters = generationSystemPrompt.length + buildGenerationPrompt(input).length;
    return { text, promptCharacters, promptTokenEstimate: Math.ceil(promptCharacters / 4) };
  }
}
