import type { ReactNode } from "react";

export function SiteFooter(): ReactNode {
  return (
    <footer className="px-4 pt-2 pb-24 text-meta text-muted tablet:pb-6 desktop:px-6">
      <p>
        Crypto data by{" "}
        <a
          href="https://www.coingecko.com/"
          className="text-accent underline underline-offset-2 hover:decoration-2"
          rel="noopener noreferrer"
          target="_blank"
        >
          CoinGecko
        </a>
        . Stocks by Twelve Data, FX by Frankfurter, macro indicators by the{" "}
        <a
          href="https://data.worldbank.org/"
          className="text-accent underline underline-offset-2 hover:decoration-2"
          rel="noopener noreferrer"
          target="_blank"
        >
          World Bank
        </a>{" "}
        (CC BY 4.0). Prices are cached to protect free API quotas and may be minutes old.
      </p>
      <p className="mt-1">Educational information only, not financial advice.</p>
    </footer>
  );
}
