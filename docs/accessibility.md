# Accessibility audit (WCAG 2.2 AA)

Audit date: 2026-10-22. Scope: every MVP page (`/`, `/coins/[id]`, `/fx`, `/stocks`, `/status`)
at 390 / 768 / 1440 px, light and dark themes.

## Automated (runs in CI on every PR)

| Check                                           | How                                                         | Result                                                      |
| :---------------------------------------------- | :---------------------------------------------------------- | :---------------------------------------------------------- |
| axe-core (wcag2a, 2aa, 21aa, 22aa)              | `tests/e2e/app-shell.spec.ts`, 5 pages × 2 themes           | 0 serious or critical violations                            |
| Lighthouse accessibility                        | `lighthouserc.json`, 5 pages, median of 3                   | 100 (budget ≥ 95)                                           |
| Color contrast of every text/surface token pair | `tests/unit/contrast.test.ts` reads `globals.css`           | all ≥ 4.5:1 (text) and ≥ 3:1 (control borders), both themes |
| Keyboard focus visibility                       | `tests/e2e/keyboard.spec.ts`: Tab through 25 stops per page | every stop shows a visible focus indicator                  |
| Keyboard table navigation                       | `tests/e2e/coin-detail.spec.ts`, component tests            | ↑ ↓ Home End move between rows, Enter opens a top-10 coin   |
| Direction never by color alone                  | component tests                                             | ▲/▼ and +/− (U+2212) on every change                        |

## Findings fixed during the audit

1. **Table rows had no visible focus** (keyboard users could not see the active row): `outline-none`
   zeroed the outline style, so the focus ring never drew. Rows now set `outline-solid` on focus.
2. **Tab panels were focusable but invisible on focus** (shadcn `TabsContent` ships `outline-none`
   while Radix gives panels `tabindex="0"`). They now show the accent ring.
3. **Inactive tabs had 4.45:1 contrast** in light mode (`text-foreground/60`); now use the muted
   text token (6.0:1).
4. **Tab triggers referenced missing panels** (`aria-controls` to non-existent ids); every tab now
   owns a panel.
5. **Inline links relied on color** (WCAG 1.4.1); all inline links are underlined.
6. **Chart attribution link was inside an `aria-hidden` container** while still focusable; the
   container is no longer hidden and charts expose a text summary instead.

## Design decisions that carry the rest

- Landmarks (`header`, `nav` with distinct labels, `main`, `aside`, `footer`), a skip link as the
  first Tab stop, one `h1` per page, panels as labelled `section`s.
- Real `<table>` with `<caption>`, `<th scope>`, `aria-sort` on sortable headers.
- Charts: canvas is supplemented by a text summary (direction, change, period) and a hidden
  first/last/low/high table; sparklines have `role="img"` + an `aria-label` with the 7-day trend.
- Only the AI brief is a live region (`aria-live="polite"`); polled prices are not announced.
- Motion only inside `prefers-reduced-motion: no-preference`; the Freshness Rail stops animating.
- Tap targets ≥ 44 px on touch layouts; text never below 12 px except the sort arrow glyph.

## Manual screen-reader check (owner)

Automation cannot judge how a page _sounds_. Please run this once with NVDA + Firefox (Windows) or
VoiceOver + Safari (macOS) on the Overview:

- [ ] Landmarks list (NVDA `D` / VoiceOver rotor) shows banner, navigation "Main", main, contentinfo.
- [ ] Headings list starts with "Market overview", then each panel title.
- [ ] Table mode reads "Top 50 cryptocurrencies…" caption, column headers, and sort state.
- [ ] A sparkline reads as an image "7-day trend: up/down N%".
- [ ] The stale badge reads "Data as of HH:MM WITA · Provider".
- [ ] The AI brief is announced once when it appears; price updates are not announced.
- [ ] `/status`: a quota meter reads "N% of this month's cap (used of cap credits)".
