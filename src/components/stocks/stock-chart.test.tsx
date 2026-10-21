import { fireEvent, render, screen } from "@testing-library/react";
import type { ReactNode } from "react";
import { describe, expect, it, vi } from "vitest";

import { StockChart } from "./stock-chart";

vi.mock("next/dynamic", () => ({ default: () => (): ReactNode => <div data-testid="canvas" /> }));

const series = (base: number): { t: string; v: number }[] => [
  { t: "2026-10-20", v: base },
  { t: "2026-10-21", v: base * 1.1 },
];

describe("StockChart", () => {
  it("switches ticker and range from the server-provided series", () => {
    render(
      <StockChart
        tickers={["AAPL", "NVDA"]}
        hourly={{ AAPL: series(100), NVDA: series(200) }}
        daily={{ AAPL: series(300), NVDA: series(400) }}
      />,
    );
    expect(screen.getByText(/AAPL, 1 year: up 10%/)).toBeInTheDocument();
    fireEvent.change(screen.getByLabelText("Ticker"), { target: { value: "NVDA" } });
    expect(screen.getByText(/NVDA, 1 year:/)).toBeInTheDocument();
    fireEvent.mouseDown(screen.getByRole("tab", { name: "24 trading hours" }));
    expect(screen.getByText(/NVDA, 24 trading hours:/)).toBeInTheDocument();
  });
});
