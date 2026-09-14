import * as cedar from "@cedar-policy/cedar-wasm/nodejs";
import type { CedarValidationResult } from "../types.js";

/**
 * Cedar WASM 4.x exposes the FFI operations as externally tagged answers:
 * every result is `{ type: "success", ... } | { type: "failure", errors }`.
 *
 * Syntax parsing (checkParsePolicySet) is kept separate from schema validation
 * (validate) so the pipeline can distinguish malformed Cedar from a valid Cedar
 * policy that violates the supplied schema.
 */
export class CedarService {
  getVersion(): string {
    return cedar.getCedarVersion();
  }

  validate(policy: string, schema: string): CedarValidationResult {
    const syntax = this.parse(policy);
    if (!syntax.valid) return syntax;

    try {
      const result = cedar.validate({
        validationSettings: { mode: "strict" },
        // A Cedar-schema-format string is passed through as-is; the FFI accepts
        // either that or the JSON schema representation.
        schema,
        policies: { staticPolicies: policy }
      });

      // `failure` means the input itself could not be decoded (bad schema,
      // undecodable policy set) — distinct from a policy that parsed but does
      // not typecheck against the schema.
      if (result.type === "failure") {
        return {
          valid: false,
          diagnostics: result.errors.map(error => ({
            severity: "error" as const,
            message: detailedErrorMessage(error)
          }))
        };
      }

      if (result.validationErrors.length > 0) {
        return {
          valid: false,
          diagnostics: result.validationErrors.map(item => ({
            severity: "error" as const,
            message: validationErrorMessage(item)
          }))
        };
      }

      return {
        valid: true,
        diagnostics: [
          ...result.validationWarnings.map(item => ({
            severity: "warning" as const,
            message: validationErrorMessage(item)
          })),
          ...result.otherWarnings.map(error => ({
            severity: "warning" as const,
            message: detailedErrorMessage(error)
          }))
        ]
      };
    } catch (error) {
      return {
        valid: false,
        diagnostics: [{
          severity: "error",
          message: error instanceof Error ? error.message : String(error)
        }]
      };
    }
  }

  parse(policy: string): CedarValidationResult {
    try {
      const result = cedar.checkParsePolicySet({ staticPolicies: policy });

      if (result.type === "failure") {
        return {
          valid: false,
          diagnostics: result.errors.map(error => ({
            severity: "error" as const,
            message: detailedErrorMessage(error)
          }))
        };
      }

      return { valid: true, diagnostics: [] };
    } catch (error) {
      return {
        valid: false,
        diagnostics: [{
          severity: "error",
          message: error instanceof Error ? error.message : String(error)
        }]
      };
    }
  }
}

/** Flattens a DetailedError into one line, keeping the `help` hint when present. */
function detailedErrorMessage(error: cedar.DetailedError): string {
  return error.help ? `${error.message} (help: ${error.help})` : error.message;
}

/** Validation findings are per-policy, so the policy id is worth surfacing. */
function validationErrorMessage(item: cedar.ValidationError): string {
  return `${item.policyId}: ${detailedErrorMessage(item.error)}`;
}
