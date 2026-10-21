import { beforeEach, describe, expect, it, vi } from "vitest";

import { createSafeStorage, nextTheme, useUiStore } from "./ui.store";

describe("nextTheme", () => {
  it("cycles system → light → dark → system", () => {
    expect(nextTheme("system")).toBe("light");
    expect(nextTheme("light")).toBe("dark");
    expect(nextTheme("dark")).toBe("system");
  });
});

describe("createSafeStorage", () => {
  it("swallows storage errors instead of crashing the app", () => {
    const throwing = {
      getItem: vi.fn(() => {
        throw new Error("SecurityError");
      }),
      setItem: vi.fn(() => {
        throw new Error("QuotaExceededError");
      }),
      removeItem: vi.fn(() => {
        throw new Error("SecurityError");
      }),
    };
    const storage = createSafeStorage(() => throwing);

    expect(storage.getItem("k")).toBeNull();
    expect(() => storage.setItem("k", "v")).not.toThrow();
    expect(() => storage.removeItem("k")).not.toThrow();
  });

  it("works when no storage exists (server, private mode)", () => {
    const storage = createSafeStorage(() => undefined);
    expect(storage.getItem("k")).toBeNull();
  });
});

describe("useUiStore", () => {
  beforeEach(() => {
    useUiStore.setState({ theme: "system", density: "compact", currency: "USD", watchlist: [] });
  });

  it("toggles density between compact and comfortable", () => {
    useUiStore.getState().toggleDensity();
    expect(useUiStore.getState().density).toBe("comfortable");
    useUiStore.getState().toggleDensity();
    expect(useUiStore.getState().density).toBe("compact");
  });

  it("adds and removes a coin from the watchlist without duplicates", () => {
    const { toggleWatch } = useUiStore.getState();
    toggleWatch("bitcoin");
    toggleWatch("ethereum");
    toggleWatch("bitcoin");
    expect(useUiStore.getState().watchlist).toEqual(["ethereum"]);
  });

  it("persists theme choice", () => {
    useUiStore.getState().setTheme("dark");
    expect(useUiStore.getState().theme).toBe("dark");
  });
});
