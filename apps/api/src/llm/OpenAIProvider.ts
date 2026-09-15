import OpenAI from "openai";
import type { LlmProvider } from "./LlmProvider.js";

export class OpenAIProvider implements LlmProvider {
  private client: OpenAI;
  private readonly model: string;

  constructor(apiKey: string, model?: string) {
    this.client = new OpenAI({ apiKey });
    this.model = model || process.env.OPENAI_MODEL || "gpt-5.6-luna";
  }

  async complete(input: { system: string; user: string }): Promise<string> {
    const response = await this.client.responses.create({
      model: this.model,
      instructions: input.system,
      input: input.user
    });
    return response.output_text;
  }
}