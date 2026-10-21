import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { Sparkline } from "./sparkline";

describe("Sparkline accessible name", () => {
  it("defaults to the coin table's 7-day period", () => {
    render(<Sparkline values={[100, 110]} />);
    expect(screen.getByRole("img", { name: "7-day trend: up 10.0%" })).toBeInTheDocument();
  });

  it("names the period it actually draws", () => {
    render(<Sparkline values={[100, 90]} period="30-day" />);
    expect(screen.getByRole("img", { name: "30-day trend: down 10.0%" })).toBeInTheDocument();
  });

  it("takes a full label when a percent change would mislead (rates, not prices)", () => {
    render(<Sparkline values={[5, 2]} label="Inflation 2010–2025: from 5.1% to 1.9%" />);
    expect(
      screen.getByRole("img", { name: "Inflation 2010–2025: from 5.1% to 1.9%" }),
    ).toBeInTheDocument();
  });

  it("an empty series keeps its box and says what is missing", () => {
    render(<Sparkline values={[]} period="30-day" />);
    expect(screen.getByText("No 30-day data yet")).toBeInTheDocument();
  });
});
