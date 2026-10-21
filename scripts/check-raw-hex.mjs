// Fails when a component uses a raw hex color instead of a design token (spec Section 9A).
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";

const ROOT = "src";
const HEX = /#[0-9a-fA-F]{3,8}\b/g;
// `muted` is a TEXT token in Tidewater (secondary text). shadcn's habit of `bg-muted` would
// paint surfaces in a text color, so any non-text use of it is rejected too.
const MUTED_AS_SURFACE = /\b(bg|ring|border|fill|from|to|via)-muted\b/g;

const walk = (dir) =>
  readdirSync(dir).flatMap((name) => {
    const path = join(dir, name);
    return statSync(path).isDirectory() ? walk(path) : [path];
  });

const offenders = walk(ROOT)
  // globals.css is the one place raw colors are allowed to live.
  .filter((file) => /\.(tsx?)$/.test(file) && !file.endsWith(".test.tsx"))
  .flatMap((file) =>
    readFileSync(file, "utf8")
      .split("\n")
      .flatMap((line, i) =>
        // `tokens-allow` marks the rare literal a browser API needs (e.g. <meta name=theme-color>).
        !line.includes("tokens-allow") && (line.match(HEX) || line.match(MUTED_AS_SURFACE))
          ? [`${file}:${i + 1}: ${line.trim()}`]
          : [],
      ),
  );

if (offenders.length > 0) {
  console.error("Raw hex colors or `muted` used as a surface found (use tokens from globals.css):");
  console.error(offenders.join("\n"));
  process.exit(1);
}
console.log(`check:tokens ok — no raw hex or muted surfaces in ${ROOT}`);
