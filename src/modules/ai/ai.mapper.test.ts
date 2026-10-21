import { describe, expect, it } from "vitest";

import { GroqCompletion } from "@/infra/providers/groq.schema";

import summary from "../../../tests/fixtures/groq-summary.json";

import { cleanBrief, fromGroqCompletion } from "./ai.mapper";

describe("cleanBrief — plain text, bounded", () => {
  it("strips markdown and collapses whitespace", () => {
    expect(cleanBrief("## Market\n\n**Bitcoin** is `up`  today.\n- ETH too.", 120)).toBe(
      "Market Bitcoin is up today. ETH too.",
    );
  });

  it("removes links instead of rendering them", () => {
    expect(cleanBrief("See [this](https://evil.example) and https://x.y/z now.", 120)).toBe(
      "See this and now.",
    );
  });

  it("cuts at the last sentence that fits the word cap", () => {
    const text = "One two three. Four five six. Seven eight nine ten.";
    expect(cleanBrief(text, 7)).toBe("One two three. Four five six.");
  });

  it("never splits a sentence at a decimal point", () => {
    expect(cleanBrief("Cap is $2.84 trillion, down 1.36 %. Bitcoin leads.", 7)).toBe(
      "Cap is $2.84 trillion, down 1.36%.",
    );
  });

  it("returns an empty string for empty or whitespace output", () => {
    expect(cleanBrief("   ", 120)).toBe("");
  });
});

describe("fromGroqCompletion", () => {
  it("maps the real completion to a MarketBrief", () => {
    const brief = fromGroqCompletion(GroqCompletion.parse(summary), "2026-10-22.1")!;
    expect(brief.model).toBe("openai/gpt-oss-120b");
    expect(brief.promptVersion).toBe("2026-10-22.1");
    expect(brief.text.split(/\s+/).length).toBeLessThanOrEqual(120);
    expect(brief.text).toContain("Bitcoin");
  });

  it("returns null when the model produced no text (e.g. reasoning used the budget)", () => {
    const empty = GroqCompletion.parse({
      ...summary,
      choices: [{ message: { role: "assistant", content: "" }, finish_reason: "length" }],
    });
    expect(fromGroqCompletion(empty, "v")).toBeNull();
  });
});
