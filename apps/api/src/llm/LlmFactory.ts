import type { LlmProvider } from "./LlmProvider.js";
import { AnthropicProvider } from "./AnthropicProvider.js";
import { MockLlmProvider } from "./MockLlmProvider.js";
import { OpenAIProvider } from "./OpenAIProvider.js";

export type LlmProviderName = "openai" | "anthropic" | "mock";

/**
 * Each pipeline stage is configured independently, so a strong model can
 * generate while a different (often cheaper or second-opinion) model verifies.
 */
export type LlmRole = "generator" | "verifier" | "repair";

export const LLM_ROLES: LlmRole[] = ["generator", "verifier", "repair"];

const PROVIDER_NAMES: LlmProviderName[] = ["openai", "anthropic", "mock"];

export interface ProviderInfo {
  id: LlmProviderName;
  label: string;
  model: string;
  configured: boolean;
}

export interface RoleSelection {
  provider: LlmProviderName;
  model: string;
}

export type RoleSelections = Record<LlmRole, RoleSelection>;

const ROLE_ENV_PREFIX: Record<LlmRole, string> = {
  generator: "LLM_GENERATOR",
  verifier: "LLM_VERIFIER",
  repair: "LLM_REPAIR"
};

export const DEFAULT_MODELS: Record<LlmProviderName, string> = {
  openai: "gpt-5.6-luna",
  anthropic: "claude-sonnet-5",
  mock: "local-demo"
};

function isProviderName(value: string | undefined): value is LlmProviderName {
  return Boolean(value) && PROVIDER_NAMES.includes(value as LlmProviderName);
}

function providerDefaultModel(provider: LlmProviderName): string {
  if (provider === "openai") return process.env.OPENAI_MODEL || DEFAULT_MODELS.openai;
  if (provider === "anthropic") return process.env.ANTHROPIC_MODEL || DEFAULT_MODELS.anthropic;
  return DEFAULT_MODELS.mock;
}

export function getProviderInfos(): ProviderInfo[] {
  return [
    {
      id: "openai",
      label: "OpenAI",
      model: providerDefaultModel("openai"),
      configured: Boolean(process.env.OPENAI_API_KEY)
    },
    {
      id: "anthropic",
      label: "Claude (Anthropic)",
      model: providerDefaultModel("anthropic"),
      configured: Boolean(process.env.ANTHROPIC_API_KEY)
    },
    {
      id: "mock",
      label: "Mock",
      model: DEFAULT_MODELS.mock,
      configured: true
    }
  ];
}

/** Fallback provider used when no role-specific provider is configured. */
export function getDefaultProvider(): LlmProviderName {
  const configured = process.env.LLM_PROVIDER?.trim().toLowerCase();
  if (isProviderName(configured)) {
    return configured;
  }

  if (process.env.OPENAI_API_KEY) return "openai";
  if (process.env.ANTHROPIC_API_KEY) return "anthropic";
  return "mock";
}

/**
 * Resolution order for a role, most specific first:
 *   1. the request override
 *   2. `LLM_<ROLE>_PROVIDER`
 *   3. `LLM_PROVIDER` / first configured provider
 * The repair role additionally inherits the generator role, since repair is a
 * generation task.
 */
export function resolveRoleProvider(
  role: LlmRole,
  override?: LlmProviderName
): LlmProviderName {
  if (isProviderName(override)) return override;

  const fromEnv = process.env[`${ROLE_ENV_PREFIX[role]}_PROVIDER`]?.trim().toLowerCase();
  if (isProviderName(fromEnv)) return fromEnv;

  if (role === "repair") {
    const generator = process.env[`${ROLE_ENV_PREFIX.generator}_PROVIDER`]?.trim().toLowerCase();
    if (isProviderName(generator)) return generator;
  }

  return getDefaultProvider();
}

export function resolveRoleModel(
  role: LlmRole,
  provider: LlmProviderName,
  override?: string
): string {
  if (override?.trim()) return override.trim();

  const fromEnv = process.env[`${ROLE_ENV_PREFIX[role]}_MODEL`]?.trim();
  if (fromEnv) return fromEnv;

  if (role === "repair") {
    const generator = process.env[`${ROLE_ENV_PREFIX.generator}_MODEL`]?.trim();
    if (generator) return generator;
  }

  return providerDefaultModel(provider);
}

export function resolveRoleSelection(
  role: LlmRole,
  override?: { provider?: LlmProviderName; model?: string }
): RoleSelection {
  const provider = resolveRoleProvider(role, override?.provider);
  return { provider, model: resolveRoleModel(role, provider, override?.model) };
}

export function getRoleSelections(): RoleSelections {
  return {
    generator: resolveRoleSelection("generator"),
    verifier: resolveRoleSelection("verifier"),
    repair: resolveRoleSelection("repair")
  };
}

export function createLlmProvider(
  provider: LlmProviderName,
  model?: string
): LlmProvider {
  switch (provider) {
    case "openai":
      if (!process.env.OPENAI_API_KEY) {
        throw new Error("OpenAI is not configured. Set OPENAI_API_KEY.");
      }
      return new OpenAIProvider(process.env.OPENAI_API_KEY, model);
    case "anthropic":
      if (!process.env.ANTHROPIC_API_KEY) {
        throw new Error("Claude is not configured. Set ANTHROPIC_API_KEY.");
      }
      return new AnthropicProvider(process.env.ANTHROPIC_API_KEY, model);
    case "mock":
      return new MockLlmProvider();
  }
}

export function createLlmProviderForRole(selection: RoleSelection): LlmProvider {
  return createLlmProvider(selection.provider, selection.model);
}
