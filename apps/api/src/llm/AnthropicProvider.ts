import Anthropic from "@anthropic-ai/sdk";
import type { LlmProvider } from "./LlmProvider.js";

export class AnthropicProvider implements LlmProvider {
  private readonly client: Anthropic;
  private readonly model: string;

  constructor(apiKey: string, model?: string) {
    this.client = new Anthropic({ apiKey });
    this.model = model || process.env.ANTHROPIC_MODEL || "claude-sonnet-5";
  }

  async complete(input: { system: string; user: string }): Promise<string> {
    const response = await this.client.messages.create({
      model: this.model,
      max_tokens: 4096,
      system: input.system,
      messages: [{ role: "user", content: input.user }]
    });

    return response.content
      .filter(block => block.type === "text")
      .map(block => block.text)
      .join("\n");
  }
}
