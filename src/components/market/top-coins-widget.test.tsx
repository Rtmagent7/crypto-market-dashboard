import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { fireEvent, render, screen, within } from "@testing-library/react";
import type { ReactNode } from "react";
import { describe, expect, it, vi } from "vitest";

import { TooltipProvider } from "@/components/ui/tooltip";
import type { CryptoAsset, DataEnvelope } from "@/modules/shared/domain";

import { fixtureCoins } from "../../../tests/factories/market";

import { CoinTableSkeleton } from "./coin-table-skeleton";
import { TopCoinsWidget } from "./top-coins-widget";

vi.mock("next/image", () => ({
  // eslint-disable-next-line @next/next/no-img-element -- test double for next/image
  default: ({ alt, src }: { alt: string; src: string }): ReactNode => <img alt={alt} src={src} />,
}));

const coins: CryptoAsset[] = fixtureCoins();
const inAnHour = new Date(Date.now() + 3_600_000).toISOString();
const envelope = (status: DataEnvelope<CryptoAsset[]>["status"]): DataEnvelope<CryptoAsset[]> => ({
  data: status === "unavailable" ? null : coins,
  status,
  source: "coingecko",
  fetchedAt: new Date(Date.now() - 5 * 60_000).toISOString(),
  nextRefreshAt: inAnHour,
});

const renderWidget = (env: DataEnvelope<CryptoAsset[]>): ReturnType<typeof render> =>
  render(
    <QueryClientProvider client={new QueryClient()}>
      <TooltipProvider>
        <TopCoinsWidget initial={env} />
      </TooltipProvider>
    </QueryClientProvider>,
  );

describe("TopCoinsWidget — the four widget states (spec §9)", () => {
  it("loading: skeleton keeps a real table header and fixed rows", () => {
    render(<CoinTableSkeleton />);
    expect(screen.getAllByRole("columnheader")).toHaveLength(6);
    expect(screen.getByText(/loading/i)).toBeInTheDocument();
  });

  it("fresh: 50 rows, relative time and the source name", () => {
    renderWidget(envelope("fresh"));
    expect(within(screen.getByRole("table")).getAllByRole("row")).toHaveLength(51);
    expect(screen.getByText(/Updated 5 min ago/)).toBeInTheDocument();
    expect(screen.getByText("CoinGecko")).toBeInTheDocument();
    expect(screen.getByTestId("freshness-rail")).toHaveAttribute("data-status", "fresh");
  });

  it("stale: the data stays, an amber 'Data as of … WITA' badge replaces the relative time", () => {
    renderWidget(envelope("stale"));
    expect(screen.getByText(/Data as of \d{2}:\d{2} WITA/)).toBeInTheDocument();
    expect(screen.getByTestId("freshness-rail")).toHaveAttribute("data-status", "stale");
    expect(within(screen.getByRole("table")).getAllByRole("row")).toHaveLength(51);
  });

  it("unavailable: one sentence and a link to provider status, no table", () => {
    renderWidget(envelope("unavailable"));
    expect(screen.queryByRole("table")).not.toBeInTheDocument();
    expect(screen.getByRole("status")).toHaveTextContent("Prices are temporarily unavailable.");
    expect(screen.getByRole("link", { name: "Check provider status" })).toHaveAttribute(
      "href",
      "/status",
    );
  });
});

describe("CoinTable behavior", () => {
  it("never conveys direction by color alone: ▲/▼ and a sign", () => {
    renderWidget(envelope("fresh"));
    const table = screen.getByRole("table");
    expect(
      within(table).getAllByText("▲").length + within(table).getAllByText("▼").length,
    ).toBeGreaterThan(0);
    expect(within(table).getAllByText(/^[+−]\d/).length).toBeGreaterThan(0);
  });

  it("sorts by a column and announces it with aria-sort", () => {
    renderWidget(envelope("fresh"));
    const priceHeader = screen.getByRole("columnheader", { name: /price/i });
    fireEvent.click(within(priceHeader).getByRole("button"));
    expect(priceHeader).toHaveAttribute("aria-sort", "descending");
    const firstRow = within(screen.getByRole("table")).getAllByRole("row")[1]!;
    const top = [...coins].sort((a, b) => b.priceUsd - a.priceUsd)[0]!;
    expect(within(firstRow).getByRole("rowheader")).toHaveTextContent(top.symbol);
  });

  it("moves focus between rows with the arrow keys (one delegated listener)", () => {
    renderWidget(envelope("fresh"));
    const rows = within(screen.getByRole("table")).getAllByRole("row").slice(1);
    rows[0]!.focus();
    fireEvent.keyDown(rows[0]!, { key: "ArrowDown" });
    expect(rows[1]).toHaveFocus();
    fireEvent.keyDown(rows[1]!, { key: "End" });
    expect(rows[49]).toHaveFocus();
    expect(rows[49]).toHaveAttribute("tabindex", "0");
    expect(rows[0]).toHaveAttribute("tabindex", "-1");
  });

  it("renders a 7-day sparkline with an accessible trend label", () => {
    renderWidget(envelope("fresh"));
    expect(screen.getAllByRole("img", { name: /7-day trend: (up|down|flat)/ }).length).toBe(50);
  });
});
