"use client";

import {
  ColorType,
  createChart,
  LineSeries,
  type IChartApi,
  type ISeriesApi,
  type Time,
} from "lightweight-charts";
import { useEffect, useRef, type ReactNode } from "react";

import type { PricePoint } from "@/modules/shared/domain";

import { toChartTime } from "./chart-summary";

export interface PriceChartProps {
  points: readonly PricePoint[];
  /** Formats the crosshair value, e.g. USD or IDR. */
  format: (value: number) => string;
}

/** Colors come from the Tidewater tokens at render time, so a theme switch recolors the chart. */
const readTokens = (): Record<"text" | "muted" | "line" | "accent" | "surface", string> => {
  const css = getComputedStyle(document.documentElement);
  const v = (name: string): string => css.getPropertyValue(name).trim();
  return {
    text: v("--text"),
    muted: v("--text-muted"),
    line: v("--line"),
    accent: v("--accent"),
    surface: v("--surface"),
  };
};

/**
 * Canvas price chart (lightweight-charts, Apache-2.0; its TradingView attribution logo stays
 * on as the license requires). Loaded only through next/dynamic, never in the initial bundle.
 * DOM work — mount, resize, unmount — is confined to this one component.
 */
/** Sized by its container (240 px on phones, 360 px on desktop — set by the parent, spec 9A). */
export default function PriceChart({ points, format }: PriceChartProps): ReactNode {
  const container = useRef<HTMLDivElement>(null);
  const chart = useRef<IChartApi | null>(null);
  const series = useRef<ISeriesApi<"Line"> | null>(null);

  useEffect(() => {
    const el = container.current;
    if (!el) return;
    const t = readTokens();
    const api = createChart(el, {
      height: el.clientHeight,
      width: el.clientWidth,
      layout: {
        background: { type: ColorType.Solid, color: "transparent" },
        textColor: t.muted,
        fontFamily: getComputedStyle(document.body).fontFamily,
        attributionLogo: true,
      },
      grid: { vertLines: { visible: false }, horzLines: { color: t.line } },
      rightPriceScale: { borderVisible: false },
      timeScale: { borderVisible: false },
      localization: { priceFormatter: format },
      crosshair: {
        horzLine: { labelBackgroundColor: t.accent },
        vertLine: { labelBackgroundColor: t.accent },
      },
    });
    series.current = api.addSeries(LineSeries, {
      color: t.accent,
      lineWidth: 2,
      priceLineVisible: false,
    });
    chart.current = api;

    const resize = new ResizeObserver(([entry]) => {
      if (entry) {
        api.applyOptions({
          width: Math.floor(entry.contentRect.width),
          height: Math.floor(entry.contentRect.height),
        });
      }
    });
    resize.observe(el);

    // Recolor when the theme changes (data-theme toggle or OS preference).
    const recolor = (): void => {
      const c = readTokens();
      api.applyOptions({
        layout: { textColor: c.muted },
        grid: { horzLines: { color: c.line } },
        crosshair: {
          horzLine: { labelBackgroundColor: c.accent },
          vertLine: { labelBackgroundColor: c.accent },
        },
      });
      series.current?.applyOptions({ color: c.accent });
    };
    const themeObserver = new MutationObserver(recolor);
    themeObserver.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["data-theme"],
    });
    const media = window.matchMedia("(prefers-color-scheme: dark)");
    media.addEventListener("change", recolor);

    return () => {
      resize.disconnect();
      themeObserver.disconnect();
      media.removeEventListener("change", recolor);
      api.remove();
      chart.current = null;
      series.current = null;
    };
  }, [format]);

  useEffect(() => {
    series.current?.setData(points.map((p) => ({ time: toChartTime(p.t) as Time, value: p.v })));
    chart.current?.timeScale().fitContent();
  }, [points]);

  return <div ref={container} aria-hidden className="h-full w-full" />;
}
