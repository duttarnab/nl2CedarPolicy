import { McpServer } from "@modelcontextprotocol/server";
import * as z from "zod/v4";
import { CedarService } from "../cedar/CedarService.js";
import { env } from "../env.js";
import { createLlmProvider, getDefaultProvider, getProviderInfos, type LlmProviderName } from "../llm/LlmFactory.js";
import { PolicyGenerator } from "../llm/PolicyGenerator.js";
import { PolicyVerifier } from "../llm/PolicyVerifier.js";
import { PolicyRepairer } from "../llm/PolicyRepairer.js";
import { PolicyPipeline } from "../pipeline/PolicyPipeline.js";

export function createPolicyMcpServer(cedar: CedarService): McpServer {
  const server = new McpServer(
    { name: "nl2CedarPolicy", version: "1.0.0" },
    { capabilities: { tools: {} } }
  );

  server.registerTool(
    "generate_cedar_policy",
    {
      description:
        "Generate a Cedar policy from a Cedar schema and natural-language authorization requirement. The tool performs Cedar syntax validation, schema validation, semantic verification, and an optional Repair LLM loop.",
      inputSchema: z.object({
        schema: z.string().min(1),
        requirement: z.string().min(1),
        provider: z.enum(["openai", "anthropic", "mock"]).optional()
      })
    },
    async ({ schema, requirement, provider }) => {
      const selectedProvider = (provider || getDefaultProvider()) as LlmProviderName;
      const llm = createLlmProvider(selectedProvider);
      const pipeline = new PolicyPipeline(
        cedar,
        new PolicyGenerator(llm),
        new PolicyVerifier(llm),
        new PolicyRepairer(llm),
        selectedProvider
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
      description: "Return Cedar version and configured LLM providers.",
      inputSchema: z.object({})
    },
    async () => {
      const result = {
        status: "ok",
        defaultProvider: getDefaultProvider(),
        providers: getProviderInfos(),
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
