import type { Generator } from "../types.js";

export class MockGenerator implements Generator {
  readonly mode = "mock" as const;
  async generate(input: Parameters<Generator["generate"]>[0]): Promise<string> {
    const career = input.context.find((item) => item.id === "horoscope.career")?.value;
    const house = input.context.find((item) => item.id === "kundli.house10")?.value;
    return `Your context points toward steady, deliberate career growth. ${career} ${house} Treat this as reflective guidance: choose one skill to deepen, ask a trusted mentor for specific feedback, and make your next commitment only after checking it against your longer-term priorities.`;
  }
}
