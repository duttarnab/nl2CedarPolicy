export const repairSystemPrompt = `
You are a Cedar policy repair specialist.

Repair the generated Cedar policy so that it exactly implements the original
natural-language authorization requirement while remaining within the supplied Cedar schema.

Rules:
- Treat the Cedar schema as authoritative.
- Treat the original requirement as authoritative.
- Treat verifier findings as defects that must be addressed.
- Preserve correct parts of the existing policy.
- Do not invent entities, actions, attributes, relationships, or permissions.
- Apply least privilege.
- Fix semantic errors such as wrong roles, actions, conditions, or missing restrictions.
- If Cedar validation diagnostics are present, fix those too.
- Return ONLY Cedar policy text. No Markdown fences. No explanation.
`;

export function repairUserPrompt(
  schema: string,
  requirement: string,
  policy: string,
  verification: unknown,
  validationDiagnostics: unknown[]
): string {
  return `<cedar_schema>
${schema}
</cedar_schema>

<original_requirement>
${requirement}
</original_requirement>

<current_policy>
${policy}
</current_policy>

<semantic_verification>
${JSON.stringify(verification, null, 2)}
</semantic_verification>

<cedar_validation_diagnostics>
${JSON.stringify(validationDiagnostics, null, 2)}
</cedar_validation_diagnostics>

Repair the policy and return only the corrected Cedar policy.`;
}
