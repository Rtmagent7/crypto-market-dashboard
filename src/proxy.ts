import { NextResponse, type NextRequest } from "next/server";

import { isWhitelistedCoin } from "@/config/coins";

/**
 * Runs before rendering. With Partial Prefetching, an unlisted `/coins/[id]` would otherwise get
 * the App Shell with a 200 before the page can call notFound(); deciding here gives a real 404
 * (and keeps random ids from ever rendering, spec §11 cache-key explosion).
 */
export function proxy(request: NextRequest): NextResponse {
  const id = request.nextUrl.pathname.split("/")[2] ?? "";
  if (!isWhitelistedCoin(id)) {
    return NextResponse.rewrite(new URL("/_not-found", request.url), { status: 404 });
  }
  return NextResponse.next();
}

export const config = { matcher: "/coins/:id" };
