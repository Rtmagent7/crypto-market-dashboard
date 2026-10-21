import type { z } from "zod";

/** Non-2xx provider response. 429 carries the provider's Retry-After when it sent one. */
export class ProviderHttpError extends Error {
  readonly kind = "http";
  constructor(
    readonly status: number,
    readonly retryAfterSeconds: number | null = null,
  ) {
    super(`Provider responded ${status}`);
    this.name = "ProviderHttpError";
  }
}

export class ProviderTimeoutError extends Error {
  readonly kind = "timeout";
  constructor(readonly timeoutMs: number) {
    super(`Provider call timed out after ${timeoutMs} ms`);
    this.name = "ProviderTimeoutError";
  }
}

/** The response did not match its Zod schema: the provider changed its format. */
export class ContractError extends Error {
  readonly kind = "contract";
  constructor(readonly issues: readonly z.core.$ZodIssue[]) {
    super(`Provider response failed validation (${issues.length} issue(s))`);
    this.name = "ContractError";
  }
}

export type ProviderError = ProviderHttpError | ProviderTimeoutError | ContractError;

/** 5xx and timeouts are retried; 429, other 4xx and contract errors are not (Section 10.3). */
export const isRetryable = (err: unknown): boolean =>
  err instanceof ProviderTimeoutError || (err instanceof ProviderHttpError && err.status >= 500);
