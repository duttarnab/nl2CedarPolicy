import dotenv from "dotenv";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

// Always resolve the monorepo root .env from this source file instead of relying
// on process.cwd(). This makes both `pnpm dev` and `pnpm --filter ... dev`
// behave consistently.
const apiSrcDir = dirname(fileURLToPath(import.meta.url));
const rootEnvPath = resolve(apiSrcDir, "../../../.env");
const result = dotenv.config({ path: rootEnvPath });

if (result.error && result.error.code !== "ENOENT") {
  throw result.error;
}

export const env = {
  llmProvider: process.env.LLM_PROVIDER?.trim().toLowerCase() || "",
  anthropicConfigured: Boolean(process.env.ANTHROPIC_API_KEY),
  openaiConfigured: Boolean(process.env.OPENAI_API_KEY),
  envPath: rootEnvPath
};
