import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

/**
 * Obvious malformed URLs → real HTTP 400 + branded page at /400.
 * Everything else falls through; unknown app routes use app/not-found.tsx.
 */
export function middleware(request: NextRequest) {
  const path = request.nextUrl.pathname;
  let decoded = path;
  try {
    decoded = decodeURIComponent(path);
  } catch {
    return NextResponse.rewrite(new URL("/400", request.url), {
      status: 400,
    });
  }

  if (
    decoded.includes("\0") ||
    /\/\/+/.test(decoded) ||
    decoded.includes("..")
  ) {
    return NextResponse.rewrite(new URL("/400", request.url), {
      status: 400,
    });
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    /*
     * Match all paths except static files and api that need raw behavior.
     */
    "/((?!_next/static|_next/image|favicon.ico|opengraph-image|twitter-image|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)",
  ],
};
