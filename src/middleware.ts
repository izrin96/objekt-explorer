import { NextResponse, NextRequest } from "next/server";
import { getAccessToken, updateAccessToken } from "./lib/server/token";
import { refresh } from "./lib/server/cosmo/auth";
import { validateExpiry } from "./lib/server/jwt";

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - api (API routes)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico, sitemap.xml, robots.txt (metadata files)
     */
    "/((?!api|_next/static|_next/image|favicon.ico|sitemap.xml|robots.txt).*)",
  ],
};

export async function middleware(_: NextRequest) {
  try {
    // not ideal, temporary
    const { accessToken, refreshToken } = await getAccessToken();
    if (!validateExpiry(accessToken)) {
      if (validateExpiry(refreshToken)) {
        const newTokens = await refresh(refreshToken);
        await updateAccessToken(newTokens);
      }
    }
  } catch (err) {
    console.error(err);
  }

  return NextResponse.next();
}
