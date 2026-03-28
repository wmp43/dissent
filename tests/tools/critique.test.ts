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

import { handleCritique } from "../../src/tools/critique.js";
import { ValidationError } from "../../src/types/errors.js";
import { minimalEnv } from "../helpers/fixtures.js";

describe("handleCritique", () => {
  beforeEach(() => {
    mockCreate.mockReset();
  });

  it("throws ValidationError when args fail Zod validation", async () => {
    await expect(handleCritique({ statement: "short" }, minimalEnv())).rejects.toThrow(ValidationError);
    expect(mockCreate).not.toHaveBeenCalled();
  });

  it("returns parsed CritiqueResult when the model returns JSON", async () => {
    mockCreate.mockResolvedValue({
      choices: [
        {
          message: {
            content: JSON.stringify({
              critique: "Too vague.",
              revisedVersion: "Precise statement here.",
              keyChanges: ["Added specificity"],
            }),
          },
        },
      ],
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
    mockCreate.mockResolvedValue({
      choices: [{ message: { content: "plain prose only" } }],
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
