import Anthropic from "@anthropic-ai/sdk";
import type { LlmClient } from "./types.js";

export class AnthropicClient implements LlmClient {
  readonly provider = "anthropic";
  readonly model!: string;
  private client!: Anthropic;

  constructor(_apiKey: string, _model: string) {
    // TODO: Store the model string on this.model.
    // TODO: Instantiate `new Anthropic({ apiKey })` and store on this.client.
    // Hint: Import Anthropic from "@anthropic-ai/sdk". The constructor takes { apiKey }.
    throw new Error("Not implemented");
  }

  async complete(_systemPrompt: string, _userMessage: string): Promise<string> {
    // TODO: Call this.client.messages.create() with:
    //   - model: this.model
    //   - max_tokens: 1024
    //   - system: systemPrompt
    //   - messages: [{ role: "user", content: userMessage }]
    //
    // TODO: Extract the text from the response. The response shape is:
    //   response.content[0].type === "text" → response.content[0].text
    //
    // TODO: Wrap the call in try/catch. On failure, throw new ProviderError("anthropic", error).
    //
    // Hint: The Anthropic SDK docs are at https://docs.anthropic.com/en/api/messages
    // Hint: response.content is an array of ContentBlock. Filter for type === "text".
    throw new Error("Not implemented");
  }
}
