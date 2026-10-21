import { getEnv } from "@/infra/env";
import { createConsoleLogger } from "@/infra/logger";

export const registerNode = async (): Promise<void> => {
  const env = getEnv();
  if (env.MOCK_PROVIDERS !== "1") return;

  const [{ setupServer }, { createProviderHandlers }] = await Promise.all([
    import("msw/node"),
    import("../tests/msw/handlers"),
  ]);
  // Unmocked hosts (fonts, images) pass through; every provider host is mocked.
  setupServer(...createProviderHandlers()).listen({ onUnhandledFrame: "bypass" });
  createConsoleLogger().log("info", "mock_providers_enabled", { source: "tests/fixtures" });
};
