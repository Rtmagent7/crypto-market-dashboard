import "server-only";

import { getEnv } from "@/infra/env";
import { createConsoleLogger } from "@/infra/logger";
import { getStore } from "@/infra/redis";

import { createCallWithBudget, type CallWithBudget } from "./call-with-budget";

let gate: CallWithBudget | undefined;

/** Process-wide outbound gate wired from env: Redis store, cap ratio, environment namespace. */
export const getCallWithBudget = (): CallWithBudget => {
  if (gate) return gate;
  const env = getEnv();
  gate = createCallWithBudget({
    store: getStore(env),
    logger: createConsoleLogger(),
    capRatio: env.BUDGET_CAP_RATIO,
    namespace: env.VERCEL_ENV ?? env.NODE_ENV,
  });
  return gate;
};
