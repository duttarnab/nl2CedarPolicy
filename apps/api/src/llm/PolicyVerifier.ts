import { z } from "zod";
import type { LlmProvider } from "./LlmProvider.js";
import type { VerificationResult } from "../types.js";
import { verifierSystemPrompt, verifierUserPrompt } from "../prompts/verifierPrompt.js";

const verificationSchema = z.object({
  valid: z.boolean(),
  confidence: z.number().min(0).max(1),
  summary: z.string(),
  issues: z.array(z.object({
    severity: z.enum(["low", "medium", "high", "critical"]),
    type: z.enum(["under_permission", "over_permission", "wrong_action", "wrong_condition", "schema_mismatch", "other"]),
    description: z.string()
  }))
});

export class PolicyVerifier {
  constructor(private llm: LlmProvider) {}

  async verify(schema: string, requirement: string, policy: string): Promise<VerificationResult> {
    const raw = await this.llm.complete({
      system: verifierSystemPrompt,
      user: verifierUserPrompt(schema, requirement, policy)
    });

    const parsed = JSON.parse(raw);
    return verificationSchema.parse(parsed);
  }
}