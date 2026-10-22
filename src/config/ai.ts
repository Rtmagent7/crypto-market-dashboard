/**
 * Groq models (Open Decision #2, confirmed 2026-10-21 from response headers: 1,000 requests and
 * 8,000 tokens/min per model). Summary and chat use different models so their quotas are separate.
 */
export const AI = {
  summaryModel: "openai/gpt-oss-120b",
  chatModel: "openai/gpt-oss-20b",
  /**
   * Cloudflare Workers AI backup for the brief (spec 10.2), only while Groq has no fresh brief.
   * Non-reasoning, so the whole output budget goes to the answer.
   */
  workersAiModel: "@cf/meta/llama-3.3-70b-instruct-fp8-fast",
  /** Output cap (spec §4): tokens/day is the first Groq limit to run out. */
  maxTokens: 400,
  /** The brief is cut at a sentence boundary past this many words (spec 9A: ~120). */
  maxWords: 120,
} as const;
