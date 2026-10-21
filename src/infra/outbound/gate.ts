import "server-only";

import { after } from "next/server";

import { createAlertingLogger, createAlertSink } from "@/infra/alerts";
import { getEnv } from "@/infra/env";
import { createConsoleLogger, type Logger } from "@/infra/logger";
import { getStore } from "@/infra/redis";

import { createCallWithBudget, type CallWithBudget } from "./call-with-budget";

let gate: CallWithBudget | undefined;

/** Process-wide outbound gate wired from env: Redis store, cap ratio, environment namespace. */
export const getCallWithBudget = (): CallWithBudget => {
  if (gate) return gate;
  const env = getEnv();
  const store = getStore(env);
  const base = createConsoleLogger();
  const logger: Logger = env.ALERT_WEBHOOK_URL
    ? createAlertingLogger(base, createAlertSink({ url: env.ALERT_WEBHOOK_URL, store }), (task) => {
        try {
          after(task); // finish sending after the response, inside the request's lifetime
        } catch {
          void task; // outside a request (scripts): just let it run
        }
      })
    : base;
  gate = createCallWithBudget({
    store,
    logger,
    capRatio: env.BUDGET_CAP_RATIO,
    namespace: env.VERCEL_ENV ?? env.NODE_ENV,
  });
  return gate;
};
