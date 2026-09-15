export type LlmProviderName = "openai" | "anthropic" | "mock";

export type LlmRole = "generator" | "verifier" | "repair";

export interface LlmRoleOverride {
  provider?: LlmProviderName;
  model?: string;
}

export interface LlmRoleSelection {
  provider: LlmProviderName;
  model: string;
}

export type LlmRoleSelections = Record<LlmRole, LlmRoleSelection>;

export interface GeneratePolicyRequest {
  schema: string;
  requirement: string;
  /** Applies to every role unless a role-specific override is given. */
  provider?: LlmProviderName;
  generator?: LlmRoleOverride;
  verifier?: LlmRoleOverride;
  repair?: LlmRoleOverride;
}

export interface CedarDiagnostic {
  severity: "error" | "warning";
  message: string;
}

export interface CedarValidationResult {
  valid: boolean;
  diagnostics: CedarDiagnostic[];
}

export interface VerificationIssue {
  severity: "low" | "medium" | "high" | "critical";
  type: "under_permission" | "over_permission" | "wrong_action" | "wrong_condition" | "schema_mismatch" | "other";
  description: string;
}

export interface VerificationResult {
  valid: boolean;
  confidence: number;
  summary: string;
  issues: VerificationIssue[];
}

export interface RepairAttempt {
  attempt: number;
  policy: string;
  validation: CedarValidationResult;
  verification: VerificationResult;
}

export interface GeneratePolicyResponse {
  policy: string;
  validation: CedarValidationResult;
  verification: VerificationResult;
  /** Kept for compatibility; equals the generator provider. */
  provider: LlmProviderName;
  llms: LlmRoleSelections;
  repair: {
    enabled: boolean;
    attempts: number;
    maxAttempts: number;
    repaired: boolean;
    history: RepairAttempt[];
  };
}
