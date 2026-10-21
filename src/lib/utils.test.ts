import { describe, expect, it } from "vitest";

import { cn } from "./utils";

describe("cn", () => {
  it("keeps a Tidewater font size next to a token color", () => {
    expect(cn("text-meta text-muted")).toBe("text-meta text-muted");
    expect(cn("text-cell", "text-accent")).toBe("text-cell text-accent");
  });

  it("still lets a later size win over an earlier one", () => {
    expect(cn("text-meta", "text-cell")).toBe("text-cell");
  });
});
