import Anthropic from "@anthropic-ai/sdk";
import type { LlmClient } from "./types.js";
import { ProviderError } from "../types/errors.js";

export class AnthropicClient implements LlmClient {
  readonly provider = "anthropic";
  readonly model: string;
  private client: Anthropic;

  constructor(apiKey: string, model: string) {
    this.model = model;
    this.client = new Anthropic({ apiKey });
  }

  async complete(systemPrompt: string, userMessage: string): Promise<string> {
    try {
      const response = await this.client.messages.create({
        model: this.model,
        max_tokens: 1024,
        system: systemPrompt,
        messages: [{ role: "user", content: userMessage }],
      });

      const text = response.content
        .filter((b): b is Anthropic.Messages.TextBlock => b.type === "text")
        .map((b) => b.text)
        .join("");
      return text;
    } catch (err) {
      throw new ProviderError("anthropic", err);
    }
  }
}
