import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

const COOKIE_NAME = "site-access";

export function middleware(request: NextRequest) {
  const sitePassword = process.env.SITE_PASSWORD;

  // If no password is set, allow all traffic (dev / no protection needed)
  if (!sitePassword) {
    return NextResponse.next();
  }

  // Allow the password page itself and its API route
  if (
    request.nextUrl.pathname === "/password" ||
    request.nextUrl.pathname === "/api/password"
  ) {
    return NextResponse.next();
  }

  // Check for valid access cookie
  const accessCookie = request.cookies.get(COOKIE_NAME);
  if (accessCookie?.value === sitePassword) {
    return NextResponse.next();
  }

  // Redirect to password page
  const url = request.nextUrl.clone();
  url.pathname = "/password";
  return NextResponse.redirect(url);
}

export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - _next/static (static files)
     * - _next/image (image optimization)
     * - favicon.ico, icons, images
     */
    "/((?!_next/static|_next/image|favicon.ico|icon|apple-icon|opengraph|sitemap|robots).*)",
  ],
};
