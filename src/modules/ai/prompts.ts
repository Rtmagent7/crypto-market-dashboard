import type { CryptoAsset, GlobalMarket, UsdIdr } from "@/modules/shared/domain";

/** Bump when the template changes; the brief's meta shows it, snapshot tests pin it. */
export const PROMPT_VERSION = "2026-10-22.1";

const r = (n: number, digits: number): number => Math.round(n * 10 ** digits) / 10 ** digits;

interface CoinLine {
  symbol: string;
  rank: number;
  priceUsd: number;
  change24hPct: number;
}

export interface MarketContext {
  global: {
    marketCapUsdT: number;
    change24hPct: number;
    btcDominancePct: number | null;
    volume24hUsdB: number | null;
  } | null;
  usdIdr: { rate: number; change1dPct: number | null } | null;
  top10: CoinLine[];
  gainers: CoinLine[];
  losers: CoinLine[];
}

const line = (c: CryptoAsset): CoinLine => ({
  symbol: c.symbol,
  rank: c.rank,
  priceUsd: c.priceUsd >= 1 ? r(c.priceUsd, 2) : Number(c.priceUsd.toPrecision(4)),
  change24hPct: r(c.change24hPct ?? 0, 2),
});

/**
 * Structured context built on the server from cached data only — never from user input — so
 * there is nothing for a prompt injection to ride on (spec §11).
 */
export const buildMarketContext = ({
  coins,
  global,
  usdIdr,
}: {
  coins: readonly CryptoAsset[] | null;
  global: GlobalMarket | null;
  usdIdr: UsdIdr | null;
}): MarketContext => {
  const ranked = [...(coins ?? [])].sort((a, b) => a.rank - b.rank);
  const moving = ranked.filter((c) => c.change24hPct !== null);
  const byChange = [...moving].sort((a, b) => (b.change24hPct ?? 0) - (a.change24hPct ?? 0));
  return {
    global: global
      ? {
          marketCapUsdT: r(global.totalMarketCapUsd / 1e12, 2),
          change24hPct: r(global.marketCapChange24hPct, 2),
          btcDominancePct: global.btcDominancePct === null ? null : r(global.btcDominancePct, 1),
          volume24hUsdB: global.volume24hUsd === null ? null : r(global.volume24hUsd / 1e9, 1),
        }
      : null,
    usdIdr: usdIdr
      ? {
          rate: Math.round(usdIdr.rate),
          change1dPct: usdIdr.change1dPct === null ? null : r(usdIdr.change1dPct, 2),
        }
      : null,
    top10: ranked.slice(0, 10).map(line),
    gainers: byChange.slice(0, 3).map(line),
    losers: byChange.slice(-3).reverse().map(line),
  };
};

const SYSTEM = [
  "You write a short market brief for a public crypto and markets dashboard.",
  "Use only the market data provided by the user message, which is JSON. Do not use outside knowledge, news or predictions.",
  "Write at most 120 words in plain text: no markdown, no lists, no headings, no emoji, no links.",
  "Cover the overall crypto market, Bitcoin's dominance, the biggest movers, and the USD/IDR rate if present.",
  "State facts and figures neutrally. This is educational information, not financial or investment advice: never recommend buying, selling or holding anything.",
].join(" ");

export interface ChatMessage {
  role: "system" | "user";
  content: string;
}

/** Deterministic template: same context in, byte-identical messages out. */
export const buildMessages = (context: MarketContext): ChatMessage[] => [
  { role: "system", content: SYSTEM },
  { role: "user", content: JSON.stringify(context) },
];
