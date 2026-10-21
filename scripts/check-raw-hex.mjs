// Fails when a component uses a raw hex color instead of a design token (spec Section 9A).
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";

const ROOT = "src/components";
const HEX = /#[0-9a-fA-F]{3,8}\b/g;

const walk = (dir) =>
  readdirSync(dir).flatMap((name) => {
    const path = join(dir, name);
    return statSync(path).isDirectory() ? walk(path) : [path];
  });

const offenders = walk(ROOT)
  .filter((file) => /\.(tsx?|css)$/.test(file))
  .flatMap((file) =>
    readFileSync(file, "utf8")
      .split("\n")
      .flatMap((line, i) => (line.match(HEX) ? [`${file}:${i + 1}: ${line.trim()}`] : [])),
  );

if (offenders.length > 0) {
  console.error("Raw hex colors found in components (use tokens from globals.css):");
  console.error(offenders.join("\n"));
  process.exit(1);
}
console.log(`check:tokens ok — no raw hex in ${ROOT}`);
