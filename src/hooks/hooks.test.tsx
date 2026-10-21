import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { act, renderHook, waitFor } from "@testing-library/react";
import { http, HttpResponse } from "msw";
import { setupServer } from "msw/node";
import type { ReactNode } from "react";
import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from "vitest";

import type { CryptoAsset, DataEnvelope } from "@/modules/shared/domain";

import { useMarket } from "./use-market";
import { pollDelayMs, usePollingInterval } from "./use-polling-interval";
import { useRelativeTime } from "./use-relative-time";

const T = Date.parse("2026-10-21T10:00:00Z");

describe("pollDelayMs", () => {
  it("waits until nextRefreshAt, never less than 15 s", () => {
    expect(pollDelayMs(new Date(T + 600_000).toISOString(), T)).toBe(600_000);
    expect(pollDelayMs(new Date(T - 5_000).toISOString(), T)).toBe(15_000);
  });
});

describe("usePollingInterval", () => {
  it("returns the delay for a given envelope time", () => {
    vi.useFakeTimers({ now: T });
    const { result } = renderHook(() => usePollingInterval(new Date(T + 60_000).toISOString()));
    expect(result.current).toBe(60_000);
    vi.useRealTimers();
  });
});

describe("useRelativeTime", () => {
  it("re-renders as time passes", () => {
    vi.useFakeTimers({ now: T });
    const { result } = renderHook(() => useRelativeTime(new Date(T - 60_000).toISOString()));
    expect(result.current).toBe("1 min ago");
    act(() => {
      vi.advanceTimersByTime(120_000);
    });
    expect(result.current).toBe("3 min ago");
    vi.useRealTimers();
  });
});

describe("useMarket", () => {
  const initial: DataEnvelope<CryptoAsset[]> = {
    data: [],
    status: "stale",
    source: "coingecko",
    fetchedAt: new Date(T).toISOString(),
    nextRefreshAt: new Date(Date.now() - 1_000).toISOString(),
  };
  const fresh: DataEnvelope<CryptoAsset[]> = { ...initial, status: "fresh" };
  const server = setupServer(http.get("*/api/market", () => HttpResponse.json(fresh)));
  beforeAll(() => server.listen({ onUnhandledFrame: "error" }));
  afterEach(() => server.resetHandlers());
  afterAll(() => server.close());

  const wrapper = ({ children }: { children: ReactNode }): ReactNode => (
    <QueryClientProvider
      client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}
    >
      {children}
    </QueryClientProvider>
  );

  it("hydrates from the server envelope, then refetches the internal API once it is due", async () => {
    const { result } = renderHook(() => useMarket(initial), { wrapper });
    expect(result.current.status).toBe("stale");
    await waitFor(() => expect(result.current.status).toBe("fresh"));
  });

  it("keeps the 503 envelope (unavailable) instead of throwing", async () => {
    server.use(
      http.get("*/api/market", () =>
        HttpResponse.json({ ...initial, data: null, status: "unavailable" }, { status: 503 }),
      ),
    );
    const { result } = renderHook(() => useMarket(initial), { wrapper });
    await waitFor(() => expect(result.current.status).toBe("unavailable"));
  });
});
