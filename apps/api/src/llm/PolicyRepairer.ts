import type { LlmProvider } from "./LlmProvider.js";
import { repairSystemPrompt, repairUserPrompt } from "../prompts/repairPrompt.js";

export class PolicyRepairer {
  constructor(private llm: LlmProvider) {}

  repair(
    schema: string,
    requirement: string,
    policy: string,
    verification: unknown,
    validationDiagnostics: unknown[] = []
  ): Promise<string> {
    return this.llm.complete({
      system: repairSystemPrompt,
      user: repairUserPrompt(schema, requirement, policy, verification, validationDiagnostics)
    });
  }
}
