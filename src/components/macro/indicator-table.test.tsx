import { render, screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { fixtureIndicators } from "../../../tests/factories/macro";

import { IndicatorTable } from "./indicator-table";

describe("IndicatorTable", () => {
  it("is a real table: caption, column headers and one row header per indicator", () => {
    render(<IndicatorTable indicators={fixtureIndicators()} />);
    const table = screen.getByRole("table", { name: /indonesia macro indicators/i });
    expect(
      within(table)
        .getAllByRole("columnheader")
        .map((h) => h.textContent),
    ).toEqual(["Indicator", "Latest", "Year before", "Since 2010"]);
    expect(within(table).getAllByRole("rowheader")).toHaveLength(5);
  });

  it("shows the latest published year next to each value", () => {
    render(<IndicatorTable indicators={fixtureIndicators()} />);
    const row = screen.getByRole("row", { name: /GDP per capita/ });
    expect(within(row).getByText("$5,060")).toBeInTheDocument();
    expect(within(row).getAllByText("2025").length).toBeGreaterThan(0);
    expect(within(row).getByText("$4,925")).toBeInTheDocument();
  });

  it("describes each trend in words instead of a misleading percent change", () => {
    render(<IndicatorTable indicators={fixtureIndicators()} />);
    expect(
      screen.getByRole("img", { name: /^Inflation, 2010–2025: from \d+\.\d% to 1\.9%$/ }),
    ).toBeInTheDocument();
  });

  it("an indicator with nothing published yet shows dashes, not zeros", () => {
    const indicators = fixtureIndicators().map((i) =>
      i.id === "SL.UEM.TOTL.ZS" ? { ...i, history: [] } : i,
    );
    render(<IndicatorTable indicators={indicators} />);
    const row = screen.getByRole("row", { name: /Unemployment/ });
    expect(within(row).getAllByText("—").length).toBeGreaterThanOrEqual(2);
  });
});
