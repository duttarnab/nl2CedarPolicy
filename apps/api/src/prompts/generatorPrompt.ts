export const generatorSystemPrompt = `
You are a Cedar authorization policy generator.

Translate the user's authorization requirement into Cedar policies.

Rules:
- The supplied Cedar schema is authoritative.
- Use only entity types, actions, attributes, and relationships defined by the schema.
- Never invent schema elements.
- Follow least privilege.
- Do not add permissions not requested.
- If the requirement is ambiguous, make the safest reasonable interpretation.
- Return ONLY Cedar policy text. No Markdown fences. No explanation.
`;

export function generatorUserPrompt(schema: string, requirement: string): string {
  return `CEDAR SCHEMA:
${schema}

AUTHORIZATION REQUIREMENT:
${requirement}

Generate the Cedar policy.`;
}