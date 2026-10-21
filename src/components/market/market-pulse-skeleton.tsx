import type { ReactNode } from "react";

import { PulseFigure, PulseStrip } from "./market-pulse";

const FIGURES = ["Global market cap", "BTC dominance", "24h volume", "USD/IDR"] as const;

/** Loading state of the Market Pulse strip; same shell and figure heights as the live one. */
export function MarketPulseSkeleton(): ReactNode {
  return (
    <PulseStrip>
      {FIGURES.map((label) => (
        <PulseFigure key={label} label={label} value={null} loading />
      ))}
    </PulseStrip>
  );
}
