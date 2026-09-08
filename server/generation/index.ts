import { config } from "../config.js";
import type { Generator } from "../types.js";
import { MockGenerator } from "./mock.js";
import { RealGenerator } from "./real.js";

export function createGenerator(): Generator {
  return config.generationMode === "real" ? new RealGenerator() : new MockGenerator();
}
