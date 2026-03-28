// Provide these fully — they're short and teach class extension

export class DissentError extends Error {
  constructor(message: string, public readonly code: string) {
    super(message);
    this.name = "DissentError";
  }
}

export class ApiKeyMissingError extends DissentError {
  constructor(provider: "anthropic" | "openai") {
    super(
      `Missing API key: ${provider === "anthropic" ? "ANTHROPIC_API_KEY" : "OPENAI_API_KEY"}`,
      "API_KEY_MISSING"
    );
  }
}

export class ProviderError extends DissentError {
  constructor(provider: string, cause: unknown) {
    const msg = cause instanceof Error ? cause.message : String(cause);
    super(`${provider} API error: ${msg}`, "PROVIDER_ERROR");
  }
}

export class ValidationError extends DissentError {
  constructor(detail: string) {
    super(`Invalid input: ${detail}`, "VALIDATION_ERROR");
  }
}
