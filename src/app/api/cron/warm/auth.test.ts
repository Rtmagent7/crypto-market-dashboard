import { describe, expect, it } from "vitest";

import { authorizeCron, parseScope } from "./auth";

const SECRET = "s".repeat(64);

describe("authorizeCron — Bearer CRON_SECRET, constant-time (spec §11)", () => {
  it("accepts the exact bearer token", () => {
    expect(authorizeCron(`Bearer ${SECRET}`, SECRET)).toBe(true);
  });

  it("rejects a missing, malformed, wrong or shorter token", () => {
    expect(authorizeCron(null, SECRET)).toBe(false);
    expect(authorizeCron(SECRET, SECRET)).toBe(false);
    expect(authorizeCron(`Bearer ${"t".repeat(64)}`, SECRET)).toBe(false);
    expect(authorizeCron(`Bearer ${SECRET.slice(1)}`, SECRET)).toBe(false);
  });

  it("is closed when no secret is configured", () => {
    expect(authorizeCron("Bearer ", undefined)).toBe(false);
    expect(authorizeCron(`Bearer ${SECRET}`, undefined)).toBe(false);
  });
});

describe("parseScope", () => {
  it("accepts the four warm scopes only", () => {
    expect(parseScope("market")).toBe("market");
    expect(parseScope("ai")).toBe("ai");
    expect(parseScope("everything")).toBeNull();
    expect(parseScope(null)).toBeNull();
  });
});
