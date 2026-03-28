import OpenAI from "openai";
import type { LlmClient } from "./types.js";

export class OpenAIClient implements LlmClient {
  readonly provider = "openai";
  readonly model!: string;
  private client!: OpenAI;

  constructor(_apiKey: string, _model: string) {
    // TODO: Store model. Instantiate `new OpenAI({ apiKey })`.
    throw new Error("Not implemented");
  }

  async complete(_systemPrompt: string, _userMessage: string): Promise<string> {
    // TODO: Call this.client.chat.completions.create() with:
    //   - model: this.model
    //   - max_tokens: 1024
    //   - messages: [
    //       { role: "system", content: systemPrompt },
    //       { role: "user", content: userMessage }
    //     ]
    //
    // TODO: Extract response.choices[0].message.content. It can be null — default to "".
    //
    // TODO: Wrap in try/catch → throw new ProviderError("openai", error).
    //
    // Hint: OpenAI SDK docs: https://platform.openai.com/docs/api-reference/chat/create
    throw new Error("Not implemented");
  }
}
