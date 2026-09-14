export type LlmProviderName = "openai" | "anthropic" | "mock";

export interface GeneratePolicyRequest {
  schema: string;
  requirement: string;
  provider?: LlmProviderName;
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
  provider: LlmProviderName;
  repair: {
    enabled: boolean;
    attempts: number;
    maxAttempts: number;
    repaired: boolean;
    history: RepairAttempt[];
  };
}
