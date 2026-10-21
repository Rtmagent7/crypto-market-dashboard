import { z } from "zod";

// Built from tests/fixtures/exchangerate-latest-open.json (open-access endpoint, no key).
// The keyed v6 endpoint names its field `conversion_rates`; add it with a real fixture.
export const ErOpenLatest = z.object({
  result: z.literal("success"),
  base_code: z.string().length(3),
  time_last_update_unix: z.number().int(),
  time_next_update_unix: z.number().int(),
  rates: z.record(z.string().length(3), z.number()),
});

export type ErOpenLatest = z.infer<typeof ErOpenLatest>;
