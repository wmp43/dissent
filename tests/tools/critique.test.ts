import { describe, it, expect, vi, beforeEach } from "vitest";

const { mockResponsesCreate, OpenAIConstructor } = vi.hoisted(() => {
  const mockResponsesCreate = vi.fn();
  const OpenAIConstructor = vi.fn(function MockOpenAI() {
    return {
      responses: { create: mockResponsesCreate },
    };
  });
  return { mockResponsesCreate, OpenAIConstructor };
});

vi.mock("openai", () => ({
  default: OpenAIConstructor,
}));

import { handleCritique } from "../../src/tools/critique.js";
import { ValidationError } from "../../src/types/errors.js";
import { minimalEnv } from "../helpers/fixtures.js";

describe("handleCritique", () => {
  beforeEach(() => {
    mockResponsesCreate.mockReset();
  });

  it("throws ValidationError when args fail Zod validation", async () => {
    await expect(handleCritique({ statement: "short" }, minimalEnv())).rejects.toThrow(ValidationError);
    expect(mockResponsesCreate).not.toHaveBeenCalled();
  });

  it("returns parsed CritiqueResult when the model returns JSON", async () => {
    mockResponsesCreate.mockResolvedValue({
      output_text: JSON.stringify({
        critique: "Too vague.",
        revisedVersion: "Precise statement here.",
        keyChanges: ["Added specificity"],
      }),
    });

    const out = await handleCritique(
      {
        statement: "This statement needs at least ten characters.",
      },
      minimalEnv()
    );

    expect(out.originalStatement).toBe("This statement needs at least ten characters.");
    expect(out.critique).toBe("Too vague.");
    expect(out.revisedVersion).toBe("Precise statement here.");
    expect(out.keyChanges).toEqual(["Added specificity"]);
  });

  it("falls back when response is not valid JSON", async () => {
    mockResponsesCreate.mockResolvedValue({
      output_text: "plain prose only",
    });

    const out = await handleCritique(
      { statement: "This statement needs at least ten characters." },
      minimalEnv()
    );

    expect(out.critique).toBe("plain prose only");
    expect(out.revisedVersion).toBe("");
    expect(out.keyChanges).toEqual([]);
  });
});
