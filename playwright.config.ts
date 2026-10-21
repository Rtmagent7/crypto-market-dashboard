import { defineConfig, devices } from "@playwright/test";

const PORT = 3100;

export default defineConfig({
  fullyParallel: true,
  forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? "github" : "list",
  use: { baseURL: `http://localhost:${PORT}`, trace: "on-first-retry" },
  expect: {
    // Visual baselines (spec 9A): tolerate sub-pixel antialiasing, not layout changes.
    toHaveScreenshot: { maxDiffPixelRatio: 0.01, animations: "disabled", caret: "hide" },
  },
  projects: [
    { name: "chromium", testDir: "./tests/e2e", use: { ...devices["Desktop Chrome"] } },
    { name: "visual", testDir: "./tests/visual", use: { ...devices["Desktop Chrome"] } },
  ],
  webServer: {
    command: `npm run start -- -p ${PORT}`,
    port: PORT,
    reuseExistingServer: !process.env.CI,
    env: { MOCK_PROVIDERS: "1", CRON_SECRET: "e2e-cron-secret-0123456789abcdef0123456789" },
  },
});
