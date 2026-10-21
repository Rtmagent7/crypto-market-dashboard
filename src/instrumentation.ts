/**
 * Runs once per server instance, before any request (Next.js instrumentation hook).
 * - Validates env with Zod: a misconfigured deploy fails at boot, not on first request.
 * - MOCK_PROVIDERS=1 starts MSW in the server process so dev and E2E use zero real quota.
 */
export async function register(): Promise<void> {
  if (process.env.NEXT_RUNTIME !== "nodejs") return;
  const { registerNode } = await import("./instrumentation.node");
  await registerNode();
}
