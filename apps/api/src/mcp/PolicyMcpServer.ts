import { McpServer } from "@modelcontextprotocol/server";
import * as z from "zod/v4";
import { CedarService } from "../cedar/CedarService.js";
import { env } from "../env.js";
import {
  createLlmProviderForRole,
  getDefaultProvider,
  getProviderInfos,
  getRoleSelections,
  resolveRoleSelection,
  type LlmProviderName
} from "../llm/LlmFactory.js";
import { PolicyGenerator } from "../llm/PolicyGenerator.js";
import { PolicyVerifier } from "../llm/PolicyVerifier.js";
import { PolicyRepairer } from "../llm/PolicyRepairer.js";
import { PolicyPipeline } from "../pipeline/PolicyPipeline.js";

const roleOverrideSchema = z.object({
  provider: z.enum(["openai", "anthropic", "mock"]).optional(),
  model: z.string().min(1).optional()
});

type RoleOverride = z.infer<typeof roleOverrideSchema>;

/** A role without its own provider falls back to the request-wide provider. */
function withFallback(
  override: RoleOverride | undefined,
  fallback: LlmProviderName | undefined
): RoleOverride {
  return { model: override?.model, provider: override?.provider ?? fallback };
}

export function createPolicyMcpServer(cedar: CedarService): McpServer {
  const server = new McpServer(
    { name: "nl2CedarPolicy", version: "1.0.0" },
    { capabilities: { tools: {} } }
  );

  server.registerTool(
    "generate_cedar_policy",
    {
      description:
        "Generate a Cedar policy from a Cedar schema and natural-language authorization requirement. The tool performs Cedar syntax validation, schema validation, semantic verification, and an optional Repair LLM loop. The generator, verifier, and repair stages can each use a different LLM.",
      inputSchema: z.object({
        schema: z.string().min(1),
        requirement: z.string().min(1),
        provider: z.enum(["openai", "anthropic", "mock"]).optional()
          .describe("Fallback provider for every stage that has no specific override."),
        generator: roleOverrideSchema.optional(),
        verifier: roleOverrideSchema.optional(),
        repair: roleOverrideSchema.optional()
      })
    },
    async ({ schema, requirement, provider, generator, verifier, repair }) => {
      const fallback = provider as LlmProviderName | undefined;
      const llms = {
        generator: resolveRoleSelection("generator", withFallback(generator, fallback)),
        verifier: resolveRoleSelection("verifier", withFallback(verifier, fallback)),
        repair: resolveRoleSelection("repair", withFallback(repair, fallback))
      };

      const pipeline = new PolicyPipeline(
        cedar,
        new PolicyGenerator(createLlmProviderForRole(llms.generator)),
        new PolicyVerifier(createLlmProviderForRole(llms.verifier)),
        new PolicyRepairer(createLlmProviderForRole(llms.repair)),
        llms
      );

      const result = await pipeline.generate(schema, requirement);
      return {
        content: [{ type: "text", text: JSON.stringify(result) }],
        structuredContent: result
      };
    }
  );

  server.registerTool(
    "get_status",
    {
      description: "Return Cedar version, configured LLM providers, and the per-stage (generator/verifier/repair) LLM configuration.",
      inputSchema: z.object({})
    },
    async () => {
      const result = {
        status: "ok",
        defaultProvider: getDefaultProvider(),
        providers: getProviderInfos(),
        roles: getRoleSelections(),
        cedarVersion: cedar.getVersion(),
        environment: {
          configuredProvider: env.llmProvider || null,
          envFile: env.envPath,
          anthropicConfigured: env.anthropicConfigured,
          openaiConfigured: env.openaiConfigured
        }
      };

      return {
        content: [{ type: "text", text: JSON.stringify(result) }],
        structuredContent: result
      };
    }
  );

  return server;
}
