import { describe, expect, it } from "vitest";

import summary from "../../../tests/fixtures/workers-ai-summary.json";

import { WaiCompletion } from "./workers-ai.schema";

describe("Workers AI schema matches the real fixture", () => {
  it("an OpenAI-style completion wrapped in Cloudflare's { result, success } envelope", () => {
    const parsed = WaiCompletion.parse(summary);
    expect(parsed.success).toBe(true);
    expect(parsed.result.choices[0]!.message.content).toMatch(/Bitcoin/);
    expect(parsed.result.usage.neurons).toBeGreaterThan(0);
  });

  it("an error envelope does not pass as data", () => {
    const error = { result: null, success: false, errors: [{ code: 10000 }], messages: [] };
    expect(WaiCompletion.safeParse(error).success).toBe(false);
  });
});
