import { describe, it, expect, vi, beforeEach } from "vitest";

const { mockCreate } = vi.hoisted(() => ({
  mockCreate: vi.fn(),
}));

vi.mock("@anthropic-ai/sdk", () => ({
  default: vi.fn(function MockAnthropic() {
    return {
      messages: { create: mockCreate },
    };
  }),
}));

import { AnthropicClient } from "../../src/clients/anthropic.js";
import { ProviderError } from "../../src/types/errors.js";

describe("AnthropicClient", () => {
  beforeEach(() => {
    mockCreate.mockReset();
  });

  it("complete() returns concatenated text blocks", async () => {
    mockCreate.mockResolvedValue({
      content: [
        { type: "text", text: "Hello " },
        { type: "text", text: "world" },
      ],
    });

    const client = new AnthropicClient("sk-ant", "claude-test");
    const out = await client.complete("system prompt", "user message");

    expect(out).toBe("Hello world");
    expect(mockCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        model: "claude-test",
        system: "system prompt",
        messages: [{ role: "user", content: "user message" }],
        max_tokens: 1024,
      })
    );
  });

  it("throws ProviderError when the API fails", async () => {
    mockCreate.mockRejectedValue(new Error("rate limit"));
    const client = new AnthropicClient("sk-ant", "claude-test");
    await expect(client.complete("s", "u")).rejects.toThrow(ProviderError);
  });
});
