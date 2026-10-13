// proxy.ts  (Next 16)  |  middleware.ts + `export function middleware` (Next 15 or older)
import { NextRequest, NextResponse } from "next/server";
import { verifyToken } from "./app/lib/auth";

// Pages that need any logged-in user
const PROTECTED = ["/profile", "/dashboard", "/user", "/apply"];

// Admin-only sections
const ADMIN_ROUTES = ["/jobs"];

// Pages under /jobs that normal users may open (adjust to your real routes)
const USER_ALLOWED_UNDER_ADMIN = [
  /^\/jobs\/apply(\/|$)/, // /jobs/apply/...
  /^\/jobs\/[^/]+\/apply(\/|$)/, // /jobs/<uuid>/apply/confirm
];

const AUTH_PAGES = ["/login", "/register"];

function getRole(token?: string): string | null {
  if (!token) return null;
  try {
    return verifyToken(token).role ?? "USER";
  } catch {
    return null; // invalid or expired
  }
}

export function proxy(req: NextRequest) {
  const { pathname, search } = req.nextUrl;
  const token = req.cookies.get("token")?.value;
  const role = getRole(token); // null = logged out, or invalid/expired token

  const startsWithPath = (p: string) =>
    pathname === p || pathname.startsWith(p + "/");

  const isAdminRoute =
    ADMIN_ROUTES.some(startsWithPath) &&
    !USER_ALLOWED_UNDER_ADMIN.some((re) => re.test(pathname));
  
    const isUserRoute = PROTECTED.some(startsWithPath)

  const isProtected = PROTECTED.some(startsWithPath) || ADMIN_ROUTES.some(startsWithPath);

  // 1. Logged-in users don't need login/register
  if (AUTH_PAGES.includes(pathname) && role) {
    return NextResponse.redirect(
      new URL(role === "ADMIN" ? "/jobs" : "/user/dashboard", req.url),
    );
  }

  // 2. Not logged in (or bad token) on a protected page
  if (isProtected && !role) {
    const loginUrl = new URL("/login", req.url);
    loginUrl.searchParams.set("redirect", pathname + search); // return here after login
    const res = NextResponse.redirect(loginUrl);
    if (token) res.cookies.delete("token"); // clear invalid/expired cookie
    return res;
  }

  // 3. Logged in but not an admin on an admin page
  if (isAdminRoute && role !== "ADMIN") {
    return NextResponse.redirect(new URL("/user/dashboard", req.url));
  }
  if (isUserRoute && role !== "USER") {
    return NextResponse.redirect(new URL("/jobs", req.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/profile/:path*",
    "/dashboard/:path*",
    "/apply/:path*",
    "/jobs/:path*",
    "/login",
    "/register",
    "/user/:path*",
  ],
};