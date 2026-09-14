import OpenAI from "openai";
import type { LlmProvider } from "./LlmProvider.js";

export class OpenAIProvider implements LlmProvider {
  private client: OpenAI;

  constructor(apiKey: string) {
    this.client = new OpenAI({ apiKey });
  }

  async complete(input: { system: string; user: string }): Promise<string> {
    const response = await this.client.responses.create({
      model: process.env.OPENAI_MODEL || "gpt-5",
      instructions: input.system,
      input: input.user
    });
    return response.output_text;
  }
}