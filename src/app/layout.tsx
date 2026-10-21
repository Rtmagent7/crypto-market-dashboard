import type { Metadata, Viewport } from "next";
import { IBM_Plex_Sans, IBM_Plex_Sans_Condensed } from "next/font/google";
import Script from "next/script";
import type { ReactNode } from "react";

import { BottomTabBar } from "@/components/layout/bottom-tab-bar";
import { NavRail } from "@/components/layout/nav-rail";
import { SiteFooter } from "@/components/layout/site-footer";
import { SkipLink } from "@/components/layout/skip-link";
import { TopBar } from "@/components/layout/top-bar";
import { UI_STORE_KEY } from "@/stores/ui.store";

import { Providers } from "./providers";
import "./globals.css";

const plexSans = IBM_Plex_Sans({
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  display: "swap",
  variable: "--font-plex",
});

const plexCondensed = IBM_Plex_Sans_Condensed({
  subsets: ["latin"],
  weight: ["500", "600"],
  display: "swap",
  variable: "--font-plex-condensed",
});

export const metadata: Metadata = {
  title: { default: "Tidewater — crypto & market dashboard", template: "%s · Tidewater" },
  description:
    "Crypto markets, US stocks and FX rates in near-real-time, cache-first and quota-guarded.",
};

export const viewport: Viewport = {
  themeColor: [
    // Browser chrome color can't read CSS variables; mirrors --bg in globals.css.
    { media: "(prefers-color-scheme: dark)", color: "#0f1a1e" }, // tokens-allow
    { media: "(prefers-color-scheme: light)", color: "#f4f6f5" }, // tokens-allow
  ],
};

// Applies a saved theme before first paint so a user's choice never flashes the other theme.
// Kept as a string child (not dangerouslySetInnerHTML); Phase 4 adds its hash to the CSP.
const THEME_BOOTSTRAP = `try{var s=JSON.parse(localStorage.getItem(${JSON.stringify(
  UI_STORE_KEY,
)})||"{}").state;if(s&&(s.theme==="light"||s.theme==="dark"))document.documentElement.dataset.theme=s.theme}catch(e){}`;

export default function RootLayout({ children }: { children: ReactNode }): ReactNode {
  return (
    <html
      lang="en"
      className={`${plexSans.variable} ${plexCondensed.variable} antialiased`}
      suppressHydrationWarning
    >
      <body className="min-h-dvh">
        <Script id="theme-bootstrap" strategy="beforeInteractive">
          {THEME_BOOTSTRAP}
        </Script>
        <SkipLink />
        <Providers>
          <div className="flex min-h-dvh flex-col desktop:pl-rail">
            <NavRail />
            <TopBar />
            <main
              id="main"
              tabIndex={-1}
              className="w-full flex-1 px-4 py-4 outline-none desktop:px-6 desktop:py-6"
            >
              {children}
            </main>
            <SiteFooter />
            <BottomTabBar />
          </div>
        </Providers>
      </body>
    </html>
  );
}
