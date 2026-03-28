/** Vendor-agnostic interface both clients must implement */
export interface LlmClient {
  /** Human-readable provider name (for metadata, not for prompts) */
  readonly provider: string;
  /** Model identifier string */
  readonly model: string;

  /**
   * Send a single completion request and return the text response.
   * @param systemPrompt - The system prompt setting the analyst's role
   * @param userMessage - The user-facing message / debate context
   * @returns The model's text response
   * @throws ProviderError on API failure
   */
  complete(systemPrompt: string, userMessage: string): Promise<string>;
}
