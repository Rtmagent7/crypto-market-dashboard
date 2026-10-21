"use client";

import { useEffect, useState } from "react";

/** Current time, re-rendering every `intervalMs` (one shared clock per component). */
export const useNow = (intervalMs: number): number => {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), intervalMs);
    return () => clearInterval(id);
  }, [intervalMs]);
  return now;
};
