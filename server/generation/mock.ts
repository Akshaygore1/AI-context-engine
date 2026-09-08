import type { Generator } from "../types.js";

export class MockGenerator implements Generator {
  readonly mode = "mock" as const;
  async generate(input: Parameters<Generator["generate"]>[0]): Promise<string> {
    const strongest = input.context.filter((item) => item.priority === "primary").slice(0, 2).map((item) => item.value).join(" ");
    const topic = input.decision.intents.join(" and ");
    return `Your ${topic} context suggests a steady, reflective approach. ${strongest} Use this as perspective rather than a guaranteed prediction: choose one practical next step, check it against your circumstances, and seek qualified advice for consequential health or financial decisions.`;
  }
}
