"use client";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useState, type ReactNode } from "react";

import { ThemeSync } from "@/components/layout/theme-sync";
import { TooltipProvider } from "@/components/ui/tooltip";

/** Context holds providers only — never app state (spec Section 0B). */
export function Providers({ children }: { children: ReactNode }): ReactNode {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: { refetchOnWindowFocus: false, refetchIntervalInBackground: false, retry: 1 },
        },
      }),
  );

  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider delayDuration={200}>
        <ThemeSync />
        {children}
      </TooltipProvider>
    </QueryClientProvider>
  );
}
