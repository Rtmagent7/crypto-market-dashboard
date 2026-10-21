/** Structured JSON logging: one line per event, never raw visitor IPs (Section 10.4). */
export type LogLevel = "info" | "warn" | "error";

export interface Logger {
  log(level: LogLevel, event: string, fields: Record<string, unknown>): void;
}

export const createConsoleLogger = (): Logger => ({
  log(level, event, fields) {
    const line = JSON.stringify({ level, event, ts: new Date().toISOString(), ...fields });
    if (level === "error") console.error(line);
    else if (level === "warn") console.warn(line);
    else console.log(line);
  },
});

export const silentLogger: Logger = { log: () => undefined };
