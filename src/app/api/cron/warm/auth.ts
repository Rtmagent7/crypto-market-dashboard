import { createHash, timingSafeEqual } from "node:crypto";

import { z } from "zod";

export const WARM_SCOPES = ["market", "stocks", "fx", "ai"] as const;
export type WarmScope = (typeof WARM_SCOPES)[number];

const Scope = z.enum(WARM_SCOPES);

/** Hash first so both sides have equal length: timingSafeEqual never leaks length or content. */
const digest = (value: string): Buffer => createHash("sha256").update(value).digest();

export const authorizeCron = (header: string | null, secret: string | undefined): boolean => {
  if (!secret || !header?.startsWith("Bearer ")) return false;
  return timingSafeEqual(digest(header.slice("Bearer ".length)), digest(secret));
};

export const parseScope = (value: string | null): WarmScope | null => {
  const parsed = Scope.safeParse(value);
  return parsed.success ? parsed.data : null;
};
