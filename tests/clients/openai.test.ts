import { describe, it, expect, vi, beforeEach } from "vitest";

const { mockChatCreate, mockResponsesCreate, OpenAIConstructor } = vi.hoisted(() => {
  const mockChatCreate = vi.fn();
  const mockResponsesCreate = vi.fn();
  const OpenAIConstructor = vi.fn(function MockOpenAI() {
    return {
      chat: {
        completions: {
          create: mockChatCreate,
        },
      },
      responses: {
        create: mockResponsesCreate,
      },
    };
  });
  return { mockChatCreate, mockResponsesCreate, OpenAIConstructor };
});

vi.mock("openai", () => ({
  default: OpenAIConstructor,
}));

import { OpenAIClient } from "../../src/clients/openai.js";
import { ProviderError } from "../../src/types/errors.js";

describe("OpenAIClient", () => {
  beforeEach(() => {
    mockChatCreate.mockReset();
    mockResponsesCreate.mockReset();
    OpenAIConstructor.mockClear();
  });

  it("complete() uses Responses API on hosted OpenAI (no baseURL)", async () => {
    mockResponsesCreate.mockResolvedValue({
      output_text: "reply text",
    });

    const client = new OpenAIClient("sk", "gpt-test");
    const out = await client.complete("sys", "user");

    expect(out).toBe("reply text");
    expect(mockResponsesCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        model: "gpt-test",
        instructions: "sys",
        input: "user",
        max_output_tokens: 1200,
        store: false,
      })
    );
    expect(mockChatCreate).not.toHaveBeenCalled();
    expect(OpenAIConstructor).toHaveBeenCalledWith({ apiKey: "sk" });
  });

  it("uses providerLabel when provided (e.g. Gemini)", async () => {
    mockChatCreate.mockResolvedValue({
      choices: [{ message: { content: "ok" } }],
    });

    const client = new OpenAIClient("gemini-key", "gemini-2.5-flash", {
      baseURL: "https://generativelanguage.googleapis.com/v1beta/openai/",
      providerLabel: "google-gemini",
    });
    await client.complete("s", "u");

    expect(client.provider).toBe("google-gemini");
    expect(mockResponsesCreate).not.toHaveBeenCalled();
  });

  it("passes baseURL for OpenAI-compatible (third-party) endpoints", async () => {
    mockChatCreate.mockResolvedValue({
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
    expect(mockChatCreate).toHaveBeenCalled();
    expect(mockResponsesCreate).not.toHaveBeenCalled();
    expect(client.provider).toBe("openai-compatible");
  });

  it("throws ProviderError when the hosted Responses API fails", async () => {
    mockResponsesCreate.mockRejectedValue(new Error("timeout"));
    const client = new OpenAIClient("sk", "gpt-test");
    await expect(client.complete("s", "u")).rejects.toThrow(ProviderError);
  });

  it("passes low-latency reasoning options for gpt-5.x hosted models", async () => {
    mockResponsesCreate.mockResolvedValue({ output_text: "ok" });
    const client = new OpenAIClient("sk", "gpt-5.4-mini");
    await client.complete("sys", "user");
    expect(mockResponsesCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        model: "gpt-5.4-mini",
        store: false,
        reasoning: { effort: "low", summary: "concise" },
      })
    );
  });
});
