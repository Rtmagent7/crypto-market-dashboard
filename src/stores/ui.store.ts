import { create } from "zustand";
import { createJSONStorage, persist, type StateStorage } from "zustand/middleware";

export type ThemePreference = "system" | "light" | "dark";
export type Density = "compact" | "comfortable";
export type DisplayCurrency = "USD" | "IDR";

/** localStorage key; also read by the pre-hydration theme script in app/layout.tsx. */
export const UI_STORE_KEY = "cmd-ui";

interface UiState {
  theme: ThemePreference;
  density: Density;
  currency: DisplayCurrency;
  watchlist: readonly string[];
  setTheme: (theme: ThemePreference) => void;
  toggleDensity: () => void;
  setCurrency: (currency: DisplayCurrency) => void;
  toggleWatch: (coinId: string) => void;
}

const THEME_CYCLE = {
  system: "light",
  light: "dark",
  dark: "system",
} as const satisfies Record<ThemePreference, ThemePreference>;

export const nextTheme = (theme: ThemePreference): ThemePreference => THEME_CYCLE[theme];

type StorageLike = Pick<Storage, "getItem" | "setItem" | "removeItem">;

/** localStorage can be missing (SSR) or throw (private mode, quota, blocked site data). */
export const createSafeStorage = (getStorage: () => StorageLike | undefined): StateStorage => ({
  getItem: (name) => {
    try {
      return getStorage()?.getItem(name) ?? null;
    } catch {
      return null;
    }
  },
  setItem: (name, value) => {
    try {
      getStorage()?.setItem(name, value);
    } catch {
      // Preference is kept in memory for this session only.
    }
  },
  removeItem: (name) => {
    try {
      getStorage()?.removeItem(name);
    } catch {
      // Nothing to clean up.
    }
  },
});

export const useUiStore = create<UiState>()(
  persist(
    (set) => ({
      theme: "system",
      density: "compact",
      currency: "USD",
      watchlist: [],
      setTheme: (theme) => set({ theme }),
      toggleDensity: () =>
        set((s) => ({ density: s.density === "compact" ? "comfortable" : "compact" })),
      setCurrency: (currency) => set({ currency }),
      toggleWatch: (coinId) =>
        set((s) => ({
          watchlist: s.watchlist.includes(coinId)
            ? s.watchlist.filter((id) => id !== coinId)
            : [...s.watchlist, coinId],
        })),
    }),
    {
      name: UI_STORE_KEY,
      version: 1,
      storage: createJSONStorage(() =>
        createSafeStorage(() => (typeof window === "undefined" ? undefined : window.localStorage)),
      ),
      partialize: ({ theme, density, currency, watchlist }) => ({
        theme,
        density,
        currency,
        watchlist,
      }),
    },
  ),
);
