import { describe, it, expect, vi, beforeEach } from "vitest";

const { mockCreate, OpenAIConstructor } = vi.hoisted(() => {
  const mockCreate = vi.fn();
  const OpenAIConstructor = vi.fn(function MockOpenAI() {
    return {
      chat: {
        completions: {
          create: mockCreate,
        },
      },
    };
  });
  return { mockCreate, OpenAIConstructor };
});

vi.mock("openai", () => ({
  default: OpenAIConstructor,
}));

import { OpenAIClient } from "../../src/clients/openai.js";
import { ProviderError } from "../../src/types/errors.js";

describe("OpenAIClient", () => {
  beforeEach(() => {
    mockCreate.mockReset();
    OpenAIConstructor.mockClear();
  });

  it("complete() returns message content from chat.completions.create", async () => {
    mockCreate.mockResolvedValue({
      choices: [{ message: { content: "reply text" } }],
    });

    const client = new OpenAIClient("sk", "gpt-test");
    const out = await client.complete("sys", "user");

    expect(out).toBe("reply text");
    expect(mockCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        model: "gpt-test",
        max_tokens: 1024,
        messages: [
          { role: "system", content: "sys" },
          { role: "user", content: "user" },
        ],
      })
    );
    expect(OpenAIConstructor).toHaveBeenCalledWith({ apiKey: "sk" });
  });

  it("uses providerLabel when provided (e.g. Gemini)", async () => {
    mockCreate.mockResolvedValue({
      choices: [{ message: { content: "ok" } }],
    });

    const client = new OpenAIClient("gemini-key", "gemini-2.5-flash", {
      baseURL: "https://generativelanguage.googleapis.com/v1beta/openai/",
      providerLabel: "google-gemini",
    });
    await client.complete("s", "u");

    expect(client.provider).toBe("google-gemini");
  });

  it("passes baseURL for OpenAI-compatible (third-party) endpoints", async () => {
    mockCreate.mockResolvedValue({
      choices: [{ message: { content: "ok" } }],
    });

    const client = new OpenAIClient("", "llama", {
      baseURL: "http://localhost:11434/v1",
    });
    await client.complete("s", "u");

    expect(OpenAIConstructor).toHaveBeenCalledWith({
      apiKey: "ollama",
      baseURL: "http://localhost:11434/v1",
    });
    expect(client.provider).toBe("openai-compatible");
  });

  it("throws ProviderError when the API fails", async () => {
    mockCreate.mockRejectedValue(new Error("timeout"));
    const client = new OpenAIClient("sk", "gpt-test");
    await expect(client.complete("s", "u")).rejects.toThrow(ProviderError);
  });
});
