import { z } from "zod";

// Built from tests/fixtures/worldbank-*.json (captured 2026-10-22).

const WbPage = z.object({
  page: z.number(),
  pages: z.number(),
  per_page: z.number(),
  total: z.number(),
  lastupdated: z.iso.date(),
});

const WbRow = z.object({
  indicator: z.object({ id: z.string(), value: z.string() }),
  countryiso3code: z.string().length(3),
  date: z.string().regex(/^\d{4}$/),
  /** null for years the source has not published yet. */
  value: z.number().nullable(),
});

export const WbIndicators = z.tuple([WbPage, z.array(WbRow)]);

/** Errors come back as HTTP 200 with `[{ message: [{ id, key, value }] }]`. */
export const isWbError = (body: unknown): boolean =>
  Array.isArray(body) &&
  body.length === 1 &&
  typeof body[0] === "object" &&
  body[0] !== null &&
  "message" in body[0];

export type WbIndicators = z.infer<typeof WbIndicators>;
export type WbRow = z.infer<typeof WbRow>;
