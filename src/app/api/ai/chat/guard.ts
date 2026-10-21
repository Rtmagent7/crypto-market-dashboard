import { z } from "zod";

import { MAX_QUESTION_CHARS } from "@/modules/ai/prompts";

/**
 * There are no cookies, so classic CSRF has nothing to ride on; POST still requires a same-origin
 * browser request (spec §11). Requests without any origin information are refused.
 */
export const isSameOrigin = (headers: Headers, selfOrigin: string): boolean => {
  const site = headers.get("sec-fetch-site");
  const origin = headers.get("origin");
  if (site && site !== "same-origin") return false;
  if (origin && origin !== selfOrigin) return false;
  return Boolean(site || origin);
};

const Body = z.object({ question: z.string().trim().min(3).max(MAX_QUESTION_CHARS) });

export const parseQuestion = (body: unknown): { ok: true; question: string } | { ok: false } => {
  const parsed = Body.safeParse(body);
  return parsed.success ? { ok: true, question: parsed.data.question } : { ok: false };
};

export const sseEvent = (event: "delta" | "done" | "error", data: unknown): string =>
  `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;
