import type { LlmProvider } from "./LlmProvider.js";

/**
 * Local development mode. This provides a deterministic approximation of the
 * generator/verifier so the UI can be exercised without an API key.
 */
export class MockLlmProvider implements LlmProvider {
  async complete(input: { system: string; user: string }): Promise<string> {
    if (input.system.includes("policy repair specialist")) {
      const role = extractWriteRole(input.user);
      const current = input.user.match(/<current_policy>\s*([\s\S]*?)\s*<\/current_policy>/)?.[1] ?? "";
      if (current) {
        return current.replace(/principal\.role\s*==\s*"[^"]+"/, `principal.role == "${role}"`);
      }
      return current;
    }

    if (input.system.includes("security-focused Cedar policy reviewer")) {
      const expectedRole = extractWriteRole(input.user);
      const actualRole = input.user.match(/principal\.role\s*==\s*"([^"]+)"/)?.[1];
      if (actualRole && expectedRole && actualRole !== expectedRole) {
        return JSON.stringify({
          valid: false,
          confidence: 0.99,
          summary: `The Write policy uses role "${actualRole}" but the requirement specifies "${expectedRole}".`,
          issues: [{
            severity: "critical",
            type: "wrong_condition",
            description: `Expected principal.role == "${expectedRole}" but found principal.role == "${actualRole}".`
          }]
        });
      }
      return JSON.stringify({
        valid: true,
        confidence: 0.92,
        summary: "Mock verifier: the generated policy matches the supplied requirement.",
        issues: []
      });
    }

    const role = extractWriteRole(input.user);
    const generatedRole = process.env.MOCK_INJECT_SEMANTIC_ERROR === "true" ? "manager" : role;

    return `permit (
    principal,
    action == App::Action::"Read",
    resource
)
when {
    principal.department == resource.department
};

permit (
    principal,
    action == App::Action::"Write",
    resource
)
when {
    principal.role == "${generatedRole}" &&
    principal.department == resource.department
};`;
  }
}

function extractWriteRole(input: string): string {
  const candidates = [
    "developer",
    "developers",
    "manager",
    "managers",
    "admin",
    "admins",
    "administrator",
    "administrators"
  ];

  const lower = input.toLowerCase();
  const found = candidates.find(role => lower.includes(role));
  if (!found) return "developer";

  return found.endsWith("s") ? found.slice(0, -1) : found;
}
