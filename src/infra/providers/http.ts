import "server-only";

import type { z } from "zod";

import { ContractError, ProviderHttpError } from "@/infra/outbound/errors";

/** Provider clients only talk HTTPS (spec Section 11); checked once, at factory time. */
export const assertHttps = (baseUrl: string): string => {
  if (new URL(baseUrl).protocol !== "https:") {
    throw new Error(`Provider base URL must use HTTPS: ${baseUrl}`);
  }
  return baseUrl.replace(/\/$/, "");
};

const parseRetryAfter = (value: string | null): number | null => {
  if (!value) return null;
  const seconds = Number(value);
  if (Number.isFinite(seconds)) return Math.max(0, seconds);
  const date = Date.parse(value);
  return Number.isNaN(date) ? null : Math.max(0, Math.ceil((date - Date.now()) / 1000));
};

export interface GetJsonOptions {
  signal: AbortSignal;
  headers?: Record<string, string>;
}

/** GET + Zod validation. Non-2xx → ProviderHttpError; schema mismatch → ContractError. */
export const getJson = async <S extends z.ZodType>(
  url: string,
  schema: S,
  { signal, headers }: GetJsonOptions,
): Promise<z.infer<S>> => {
  const res = await fetch(url, { signal, headers: { accept: "application/json", ...headers } });
  if (!res.ok) {
    throw new ProviderHttpError(res.status, parseRetryAfter(res.headers.get("retry-after")));
  }
  const parsed = schema.safeParse(await res.json());
  if (!parsed.success) throw new ContractError(parsed.error.issues);
  return parsed.data;
};
