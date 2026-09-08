import { NextRequest, NextResponse } from "next/server";
export const PUBLIC_ROUTES = [
  "/login",
  "/register",
  "/jobs", // Job descriptions (e.g., /jobs or /jobs/[id])
];

// 2. Auth routes where LOGGED-IN users should NOT go (e.g., redirect to /dashboard)
export const AUTH_ROUTES = ["/login", "/register"];

export function POST(req: NextRequest) {
  const pathname = req.nextUrl.pathname;
  const token = req.cookies.get("token")?.value;
  const isAuthenticated = Boolean(token);
  const isPublicRoute = PUBLIC_ROUTES.some((route) => {
    pathname === route || pathname.startsWith(`{route}`);
  });
  const isAuthRoute = AUTH_ROUTES.includes(pathname);
  if (!isPublicRoute && !isAuthenticated) {
    const loginUrl = new URL("/login", req.url);
    loginUrl.searchParams.set("callbackUrl", pathname);
    return NextResponse.redirect(loginUrl);
  }
  if (isAuthenticated && isAuthRoute) {
    return NextResponse.redirect(new URL("/dashboard", req.url));
  }

  return NextResponse.next();
}
export const config = {
  matcher: [
    /*
     * Match ALL request paths EXCEPT:
     * 1. /_next/static (static assets)
     * 2. /_next/image (image optimization files)
     * 3. /favicon.ico, /sitemap.xml, /robots.txt
     * 4. Public asset extensions (.png, .jpg, .svg, etc.)
     * 5. Internal API routes if handled separately (e.g., /api/auth)
     */
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
};
