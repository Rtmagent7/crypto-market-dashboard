// Prints one line per Lighthouse run (scores, Core Web Vitals, LCP element) for the CI log.
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";

const dir = process.argv[2] ?? ".lighthouseci";
for (const file of readdirSync(dir).filter((f) => f.startsWith("lhr-") && f.endsWith(".json"))) {
  const r = JSON.parse(readFileSync(join(dir, file), "utf8"));
  const a = r.audits;
  const pct = (k) => Math.round((r.categories[k]?.score ?? 0) * 100);
  const lcpEl =
    a["largest-contentful-paint-element"]?.details?.items?.[0]?.items?.[0]?.node?.snippet ?? "?";
  console.log(
    [
      new URL(r.finalDisplayedUrl).pathname,
      `perf ${pct("performance")}`,
      `a11y ${pct("accessibility")}`,
      `bp ${pct("best-practices")}`,
      `FCP ${a["first-contentful-paint"].displayValue}`,
      `LCP ${a["largest-contentful-paint"].displayValue}`,
      `TBT ${a["total-blocking-time"].displayValue}`,
      `CLS ${a["cumulative-layout-shift"].displayValue}`,
      `LCP element ${lcpEl.slice(0, 90)}`,
    ].join(" | "),
  );
}
