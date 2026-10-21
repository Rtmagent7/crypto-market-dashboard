// Indonesia macro indicators for /macro (World Bank WDI, annual). Editable whitelist:
// the provider is only ever asked for these codes.

export interface MacroIndicatorConfig {
  /** World Bank indicator code. */
  readonly id: string;
  readonly label: string;
  readonly unit: "percent" | "usd";
  readonly description: string;
}

export const MACRO_COUNTRY = { iso3: "IDN", name: "Indonesia" } as const;

/** First year requested; the table shows the latest and the trend since then. */
export const MACRO_FROM_YEAR = 2010;

export const MACRO_INDICATORS = [
  {
    id: "NY.GDP.MKTP.KD.ZG",
    label: "GDP growth",
    unit: "percent",
    description: "Real GDP, annual change",
  },
  {
    id: "FP.CPI.TOTL.ZG",
    label: "Inflation",
    unit: "percent",
    description: "Consumer prices, annual change",
  },
  {
    id: "SL.UEM.TOTL.ZS",
    label: "Unemployment",
    unit: "percent",
    description: "Share of the labor force (ILO estimate)",
  },
  {
    id: "NY.GDP.PCAP.CD",
    label: "GDP per capita",
    unit: "usd",
    description: "Current US dollars",
  },
  {
    id: "BN.CAB.XOKA.GD.ZS",
    label: "Current account",
    unit: "percent",
    description: "Balance as a share of GDP",
  },
] as const satisfies readonly MacroIndicatorConfig[];

export type MacroIndicatorId = (typeof MACRO_INDICATORS)[number]["id"];
