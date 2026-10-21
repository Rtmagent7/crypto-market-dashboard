import { describe, expect, it } from "vitest";

import { isSameOrigin, parseQuestion, sseEvent } from "./guard";

describe("isSameOrigin — POST CSRF guard (spec §11)", () => {
  const self = "https://dash.example";
  it("accepts same-origin fetches", () => {
    expect(isSameOrigin(new Headers({ origin: self, "sec-fetch-site": "same-origin" }), self)).toBe(
      true,
    );
    expect(isSameOrigin(new Headers({ "sec-fetch-site": "same-origin" }), self)).toBe(true);
    expect(isSameOrigin(new Headers({ origin: self }), self)).toBe(true);
  });

  it("rejects cross-site requests and requests with no origin information", () => {
    expect(isSameOrigin(new Headers({ origin: "https://evil.example" }), self)).toBe(false);
    expect(isSameOrigin(new Headers({ origin: self, "sec-fetch-site": "cross-site" }), self)).toBe(
      false,
    );
    expect(isSameOrigin(new Headers(), self)).toBe(false);
  });
});

describe("parseQuestion", () => {
  it("accepts 3–500 characters after trimming", () => {
    expect(parseQuestion({ question: "  How is BTC?  " })).toEqual({
      ok: true,
      question: "How is BTC?",
    });
  });

  it("rejects missing, too short, too long and non-string input", () => {
    for (const body of [
      null,
      {},
      { question: "hi" },
      { question: "x".repeat(501) },
      { question: 42 },
    ]) {
      expect(parseQuestion(body).ok).toBe(false);
    }
  });
});

describe("sseEvent", () => {
  it("encodes one server-sent event with JSON data", () => {
    expect(sseEvent("delta", { text: "Bitcoin\nrose" })).toBe(
      'event: delta\ndata: {"text":"Bitcoin\\nrose"}\n\n',
    );
  });
});
