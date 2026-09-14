import type { LlmProvider } from "./LlmProvider.js";
import { AnthropicProvider } from "./AnthropicProvider.js";
import { MockLlmProvider } from "./MockLlmProvider.js";
import { OpenAIProvider } from "./OpenAIProvider.js";

export type LlmProviderName = "openai" | "anthropic" | "mock";

export interface ProviderInfo {
  id: LlmProviderName;
  label: string;
  model: string;
  configured: boolean;
}

export function getProviderInfos(): ProviderInfo[] {
  return [
    {
      id: "openai",
      label: "OpenAI",
      model: process.env.OPENAI_MODEL || "gpt-5.6-luna",
      configured: Boolean(process.env.OPENAI_API_KEY)
    },
    {
      id: "anthropic",
      label: "Claude (Anthropic)",
      model: process.env.ANTHROPIC_MODEL || "claude-sonnet-5",
      configured: Boolean(process.env.ANTHROPIC_API_KEY)
    },
    {
      id: "mock",
      label: "Mock",
      model: "local-demo",
      configured: true
    }
  ];
}

export function getDefaultProvider(): LlmProviderName {
  const configured = process.env.LLM_PROVIDER as LlmProviderName | undefined;
  if (configured && ["openai", "anthropic", "mock"].includes(configured)) {
    return configured;
  }

  if (process.env.OPENAI_API_KEY) return "openai";
  if (process.env.ANTHROPIC_API_KEY) return "anthropic";
  return "mock";
}

export function createLlmProvider(provider: LlmProviderName): LlmProvider {
  switch (provider) {
    case "openai":
      if (!process.env.OPENAI_API_KEY) {
        throw new Error("OpenAI is not configured. Set OPENAI_API_KEY.");
      }
      return new OpenAIProvider(process.env.OPENAI_API_KEY);
    case "anthropic":
      if (!process.env.ANTHROPIC_API_KEY) {
        throw new Error("Claude is not configured. Set ANTHROPIC_API_KEY.");
      }
      return new AnthropicProvider(process.env.ANTHROPIC_API_KEY);
    case "mock":
      return new MockLlmProvider();
  }
}
