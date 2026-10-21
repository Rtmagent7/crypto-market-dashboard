import type { GroqCompletion } from "@/infra/providers/groq.schema";
import type { MarketBrief } from "@/modules/shared/domain";

/**
 * Model output → plain text (spec §11: AI output is never rendered as HTML or markdown). Links
 * are dropped, markdown marks stripped, and the text is cut at the last whole sentence that fits.
 */
export const cleanBrief = (raw: string, maxWords: number): string => {
  const plain = raw
    .replace(/\[([^\]]*)\]\([^)]*\)/g, "$1") // [label](url) → label
    .replace(/https?:\/\/\S+/g, "")
    .replace(/^\s{0,3}#{1,6}\s+/gm, "")
    .replace(/^\s*[-*+]\s+/gm, "")
    .replace(/[*_`~]+/g, "")
    .replace(/\s+/g, " ")
    .replace(/\s+([.,;:!?])/g, "$1")
    .replace(/(\d)\s+%/g, "$1%") // "1.36 %" → "1.36%"
    .trim();
  if (plain === "") return "";

  // A sentence ends at . ! ? followed by whitespace and a new sentence — never inside "1.36".
  const sentences = plain.split(/(?<=[.!?])\s+(?=[A-Z0-9"“(])/);
  let out = "";
  for (const sentence of sentences) {
    const next = `${out}${sentence}`.trim();
    if (next.split(/\s+/).length > maxWords) break;
    out = `${next} `;
  }
  return out.trim() || plain.split(/\s+/).slice(0, maxWords).join(" ");
};

export const fromGroqCompletion = (
  c: GroqCompletion,
  promptVersion: string,
  maxWords = 120,
): MarketBrief | null => {
  const text = cleanBrief(c.choices[0]?.message.content ?? "", maxWords);
  return text ? { text, model: c.model, promptVersion } : null;
};
