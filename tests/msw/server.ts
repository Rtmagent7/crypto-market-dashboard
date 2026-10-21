import { setupServer } from "msw/node";
import { afterAll, afterEach, beforeAll } from "vitest";

import { createProviderHandlers, type HitCounter } from "./handlers";

/** Starts MSW for one test file; any unmocked outbound request fails the test. */
export const setupProviderMocks = (): {
  hits: HitCounter;
  server: ReturnType<typeof setupServer>;
} => {
  const hits: HitCounter = new Map();
  const server = setupServer(...createProviderHandlers(hits));
  beforeAll(() => server.listen({ onUnhandledFrame: "error" }));
  afterEach(() => {
    server.resetHandlers();
    hits.clear();
  });
  afterAll(() => server.close());
  return { hits, server };
};
