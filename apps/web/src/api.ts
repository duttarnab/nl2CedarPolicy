import { Client } from "@modelcontextprotocol/client";
import { StreamableHTTPClientTransport } from "@modelcontextprotocol/client";

export type ProviderId = "openai" | "anthropic" | "mock";

export interface ProviderInfo {
  id: ProviderId;
  label: string;
  model: string;
  configured: boolean;
}

export type LlmRole = "generator" | "verifier" | "repair";

export const LLM_ROLES: LlmRole[] = ["generator", "verifier", "repair"];

export const ROLE_LABELS: Record<LlmRole, string> = {
  generator: "Generator LLM",
  verifier: "Verifier LLM",
  repair: "Repair LLM"
};

export interface RoleSelection {
  provider: ProviderId;
  model: string;
}

export type RoleSelections = Record<LlmRole, RoleSelection>;

export interface HealthData {
  status: string;
  defaultProvider: ProviderId;
  providers: ProviderInfo[];
  roles: RoleSelections;
  cedarVersion: string;
}

export interface ResponseData {
  policy: string;
  provider: ProviderId;
  llms: RoleSelections;
  validation: {
    valid: boolean;
    diagnostics: { severity: string; message: string }[];
  };
  verification: {
    valid: boolean;
    confidence: number;
    summary: string;
    issues: {
      severity: string;
      type: string;
      description: string;
    }[];
  };
  repair: {
    enabled: boolean;
    attempts: number;
    maxAttempts: number;
    repaired: boolean;
    history: {
      attempt: number;
      policy: string;
      validation: { valid: boolean; diagnostics: { severity: string; message: string }[] };
      verification: { valid: boolean; confidence: number; summary: string; issues: { severity: string; type: string; description: string }[] };
    }[];
  };
}

const base = import.meta.env.VITE_MCP_URL || "http://localhost:3001/mcp";

async function withMcpClient<T>(callback: (client: Client) => Promise<T>): Promise<T> {
  const client = new Client({ name: "nl2CedarPolicy-web", version: "1.0.0" });
  const transport = new StreamableHTTPClientTransport(new URL(base));

  try {
    await client.connect(transport);
    return await callback(client);
  } finally {
    await client.close().catch(() => undefined);
  }
}

export async function getHealth(): Promise<HealthData> {
  return withMcpClient(async client => {
    const result = await client.callTool({ name: "get_status", arguments: {} });
    return extractStructured<HealthData>(result);
  });
}

export async function generatePolicy(
  schema: string,
  requirement: string,
  roles: RoleSelections
): Promise<ResponseData> {
  return withMcpClient(async client => {
    const result = await client.callTool({
      name: "generate_cedar_policy",
      arguments: {
        schema,
        requirement,
        generator: roles.generator,
        verifier: roles.verifier,
        repair: roles.repair
      }
    });
    return extractStructured<ResponseData>(result);
  });
}

function extractStructured<T>(result: unknown): T {
  const value = result as { structuredContent?: unknown; content?: { type: string; text?: string }[] };

  if (value.structuredContent !== undefined) {
    return value.structuredContent as T;
  }

  const text = value.content?.find(item => item.type === "text")?.text;
  if (!text) throw new Error("MCP tool returned no structured result.");
  return JSON.parse(text) as T;
}
