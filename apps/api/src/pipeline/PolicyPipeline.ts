import { CedarService } from "../cedar/CedarService.js";
import { PolicyGenerator } from "../llm/PolicyGenerator.js";
import { PolicyRepairer } from "../llm/PolicyRepairer.js";
import { PolicyVerifier } from "../llm/PolicyVerifier.js";
import type { GeneratePolicyResponse, RepairAttempt, VerificationResult, LlmProviderName } from "../types.js";

export class PolicyPipeline {
  constructor(
    private cedar: CedarService,
    private generator: PolicyGenerator,
    private verifier: PolicyVerifier,
    private repairer: PolicyRepairer,
    private provider: LlmProviderName,
    private maxRepairAttempts = Number(process.env.REPAIR_MAX_ATTEMPTS || 2)
  ) {}

  async generate(schema: string, requirement: string): Promise<GeneratePolicyResponse> {
    let policy = await this.generator.generate(schema, requirement);
    let validation = this.cedar.validate(policy, schema);
    let verification: VerificationResult = validation.valid
      ? await this.verifier.verify(schema, requirement, policy)
      : this.validationFailure(validation);

    const history: RepairAttempt[] = [];

    for (let attempt = 1; attempt <= this.maxRepairAttempts && (!validation.valid || !verification.valid); attempt++) {
      policy = await this.repairer.repair(
        schema,
        requirement,
        policy,
        verification,
        validation.diagnostics
      );

      validation = this.cedar.validate(policy, schema);
      verification = validation.valid
        ? await this.verifier.verify(schema, requirement, policy)
        : this.validationFailure(validation);

      history.push({ attempt, policy, validation, verification });
    }

    return {
      policy,
      validation,
      verification,
      provider: this.provider,
      repair: {
        enabled: this.maxRepairAttempts > 0,
        attempts: history.length,
        maxAttempts: this.maxRepairAttempts,
        repaired: history.length > 0 && validation.valid && verification.valid,
        history
      }
    };
  }

  private validationFailure(validation: ReturnType<CedarService["validate"]>): VerificationResult {
    return {
      valid: false,
      confidence: 1,
      summary: "The policy failed Cedar syntax/schema validation.",
      issues: validation.diagnostics.map(d => ({
        severity: "high" as const,
        type: "schema_mismatch" as const,
        description: d.message
      }))
    };
  }
}
