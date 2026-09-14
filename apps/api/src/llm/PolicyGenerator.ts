import type { LlmProvider } from "./LlmProvider.js";
import { generatorSystemPrompt, generatorUserPrompt } from "../prompts/generatorPrompt.js";

export class PolicyGenerator {
  constructor(private llm: LlmProvider) {}

  generate(schema: string, requirement: string): Promise<string> {
    return this.llm.complete({
      system: generatorSystemPrompt,
      user: generatorUserPrompt(schema, requirement)
    });
  }
}