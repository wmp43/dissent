import OpenAI from "openai";
import type { LlmClient } from "./types.js";
import { ProviderError } from "../types/errors.js";

export type OpenAIClientOptions = {
  /** e.g. `http://localhost:11434/v1` (Ollama), LM Studio, vLLM — OpenAI SDK chat completions shape */
  baseURL?: string;
  /** Override `provider` metadata (e.g. `google-gemini` for Gemini’s OpenAI-compatible API) */
  providerLabel?: string;
};

export class OpenAIClient implements LlmClient {
  readonly provider: string;
  readonly model: string;
  private client: OpenAI;

  /**
   * @param apiKey - OpenAI API key, or a placeholder like `ollama` when using a local `baseURL`
   */
  constructor(apiKey: string, model: string, options?: OpenAIClientOptions) {
    this.model = model;
    const baseURL = options?.baseURL?.trim();
    const label = options?.providerLabel?.trim();
    if (label) {
      this.provider = label;
    } else {
      this.provider = baseURL ? "openai-compatible" : "openai";
    }

    const trimmed = apiKey.trim();
    const key = trimmed !== "" ? trimmed : baseURL ? "ollama" : trimmed;

    this.client = new OpenAI({
      apiKey: key,
      ...(baseURL ? { baseURL } : {}),
    });
  }

  async complete(systemPrompt: string, userMessage: string): Promise<string> {
    try {
      const response = await this.client.chat.completions.create({
        model: this.model,
        max_tokens: 1024,
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userMessage },
        ],
      });
      return response.choices[0]?.message?.content ?? "";
    } catch (err) {
      throw new ProviderError(this.provider, err);
    }
  }
}
