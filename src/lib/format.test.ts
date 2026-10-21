import { describe, expect, it } from "vitest";

import {
  formatChange,
  formatCompactUsd,
  formatIdr,
  formatIndicator,
  formatPercent,
  formatUsd,
} from "./format";

const MINUS = "−";

describe("formatUsd (spec §9 number rules)", () => {
  it("uses 2 decimals at $1 and above", () => {
    expect(formatUsd(97_410.55)).toBe("$97,410.55");
    expect(formatUsd(1)).toBe("$1.00");
  });

  it("shows up to 6 significant decimals below $1", () => {
    expect(formatUsd(0.999388)).toBe("$0.999388");
    expect(formatUsd(0.00004213)).toBe("$0.00004213");
    expect(formatUsd(0.00000518)).toBe("$0.00000518");
  });
});

describe("formatCompactUsd", () => {
  it("uses compact notation for market caps", () => {
    expect(formatCompactUsd(1_920_000_000_000)).toBe("$1.92T");
    expect(formatCompactUsd(422_000_000_000)).toBe("$422B");
    expect(formatCompactUsd(96_000_000_000)).toBe("$96B");
  });
});

describe("formatIdr", () => {
  it("uses the id-ID locale for rupiah", () => {
    expect(formatIdr(16_240)).toBe("Rp\u00a016.240"); // id-ID puts a no-break space after Rp
  });
});

describe("formatChange — never color alone (spec §9)", () => {
  it("up: ▲ and a plus sign", () => {
    expect(formatChange(1.8432)).toEqual({ direction: "up", arrow: "▲", text: "+1.84%" });
  });

  it("down: ▼ and a true minus sign (U+2212)", () => {
    expect(formatChange(-0.62)).toEqual({ direction: "down", arrow: "▼", text: `${MINUS}0.62%` });
    expect(formatChange(-23.4).text).toBe(`${MINUS}23.40%`);
  });

  it("flat and unknown", () => {
    expect(formatChange(0)).toEqual({ direction: "flat", arrow: "", text: "0.00%" });
    expect(formatChange(null)).toEqual({ direction: "flat", arrow: "", text: "—" });
  });
});

describe("formatPercent", () => {
  it("formats a plain share without sign", () => {
    expect(formatPercent(59.638)).toBe("59.6%");
  });
});

describe("formatIndicator (macro values)", () => {
  it("percent: one decimal, true minus for negatives", () => {
    expect(formatIndicator("percent", 5.10808904438025)).toBe("5.1%");
    expect(formatIndicator("percent", -0.614730078804115)).toBe("−0.6%");
  });

  it("usd: whole dollars", () => {
    expect(formatIndicator("usd", 5059.62596411213)).toBe("$5,060");
  });
});
