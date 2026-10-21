import { readFileSync } from "node:fs";

import { describe, expect, it } from "vitest";

// WCAG 2.2 AA contrast for the Tidewater tokens, read straight from globals.css (spec 9A table).
const css = readFileSync("src/app/globals.css", "utf8");

const block = (selector: string): Record<string, string> => {
  const start = css.indexOf(selector);
  const body = css.slice(css.indexOf("{", start) + 1, css.indexOf("}", start));
  return Object.fromEntries(
    [...body.matchAll(/--([\w-]+):\s*(#[0-9a-f]{6})/gi)].map((m) => [m[1]!, m[2]!]),
  );
};

const light = block(":root {");
const dark = { ...light, ...block(':root[data-theme="dark"]') };

const luminance = (hex: string): number => {
  const [r, g, b] = [1, 3, 5].map((i) => {
    const c = parseInt(hex.slice(i, i + 2), 16) / 255;
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * r! + 0.7152 * g! + 0.0722 * b!;
};
const ratio = (a: string, b: string): number => {
  const [l1, l2] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (l1! + 0.05) / (l2! + 0.05);
};

const TEXT_ON_SURFACES: [string, string][] = [
  ["text", "bg"],
  ["text", "surface"],
  ["text", "surface-raised"],
  ["text-muted", "surface"],
  ["text-muted", "surface-raised"],
  ["text-muted", "bg"],
  ["up", "surface"],
  ["down", "surface"],
  ["stale", "surface"],
  ["accent", "surface"],
  ["up", "up-tint"],
  ["down", "down-tint"],
  ["stale", "stale-tint"],
  ["on-accent", "accent"],
];

describe.each([
  ["light", light],
  ["dark", dark],
])("Tidewater %s theme meets WCAG AA", (_name, tokens) => {
  it.each(TEXT_ON_SURFACES)("%s on %s ≥ 4.5:1 (text)", (fg, bg) => {
    expect(ratio(tokens[fg]!, tokens[bg]!)).toBeGreaterThanOrEqual(4.5);
  });

  it("control borders ≥ 3:1 against panels (non-text, 1.4.11)", () => {
    expect(ratio(tokens["control-border"]!, tokens.surface!)).toBeGreaterThanOrEqual(3);
  });
});
